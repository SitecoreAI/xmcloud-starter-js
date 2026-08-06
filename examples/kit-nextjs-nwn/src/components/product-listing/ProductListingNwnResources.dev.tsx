'use client';

import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import type {
  Field,
  ImageField,
  LinkField,
} from '@sitecore-content-sdk/nextjs';
import { Link as SitecoreLink, Text } from '@sitecore-content-sdk/nextjs';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { isLegacyStarterDataValue } from '@/lib/nwn-content-sanitizer';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type {
  ProductItemProps,
  ProductListingProps,
} from './product-listing.props';

const resources = [
  {
    title: 'Rebates that reward efficiency',
    description:
      'Find savings on qualifying natural gas equipment for your home.',
    href: '/ways-to-save/rebates-offers',
    linkText: 'Explore rebates and offers',
    image: '/assets/nwn-images/rebates-high-efficiency-furnace-landscape.png',
  },
  {
    title: 'Cook with confidence and control',
    description:
      'Discover why home cooks value the responsiveness and versatility of natural gas.',
    href: '/get-natural-gas/cooking',
    linkText: 'Discover cooking with gas',
    image: '/assets/nwn-images/cooking-with-gas-home-chef-landscape.png',
  },
  {
    title: 'Safety comes first',
    description:
      'Learn how to recognize a gas odor, protect your family and keep projects safe.',
    href: '/safety/smell-natural-gas',
    linkText: 'Review natural gas safety',
    image:
      '/assets/nwn-images/safety-smell-gas-call-from-outside-landscape.png',
  },
] as const;

interface ResourceCard {
  key: string;
  title: string;
  titleField?: Field<string>;
  description?: string;
  descriptionField?: Field<string>;
  href?: string;
  linkText?: string;
  image?: ImageField;
}

const CLEARLY_LEGACY_PRODUCT_PATTERN =
  /ambulance|fire truck|rescue vehicle|emergency vehicle|vehicle fleet|driving range|base price/i;

const getTextValue = (
  field: { jsonValue?: Field<string> } | undefined,
): string | undefined => {
  const value = field?.jsonValue?.value;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getLinkDetails = (
  field: LinkField | undefined,
): { href?: string; text?: string } => {
  const href = field?.value?.href?.trim();
  const text = field?.value?.text?.trim();

  return {
    href: href || undefined,
    text: text || undefined,
  };
};

const getProductLink = (
  product: ProductItemProps,
): { href?: string; text?: string } => {
  const linkedField = getLinkDetails(product.url?.jsonValue);
  const path = product.url?.path?.trim() || product.url?.url?.trim();

  return {
    href: linkedField.href || path || undefined,
    text: linkedField.text,
  };
};

const getProductImage = (product: ProductItemProps): ImageField | undefined => {
  const productThumbnail = product.productThumbnail?.jsonValue;
  const pageThumbnail = product.pageThumbnail?.jsonValue;

  if (productThumbnail?.value?.src) return productThumbnail;
  if (pageThumbnail?.value?.src) return pageThumbnail;
  return undefined;
};

const isClearlyLegacyProduct = (
  product: ProductItemProps,
  values: Array<string | undefined>,
): boolean => {
  const productContext = [
    ...values,
    getTextValue(product.productBasePrice),
    getTextValue(product.productDrivingRange),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    isLegacyStarterDataValue(productContext) ||
    CLEARLY_LEGACY_PRODUCT_PATTERN.test(productContext)
  );
};

const toAuthoredResource = (
  product: ProductItemProps,
  index: number,
): ResourceCard | null => {
  const productName = getTextValue(product.productName);
  const featureTitle = getTextValue(product.productFeatureTitle);
  const featureText = getTextValue(product.productFeatureText);
  const title = productName || featureTitle;
  const titleField = productName
    ? product.productName?.jsonValue
    : product.productFeatureTitle?.jsonValue;
  const description = featureText || (productName ? featureTitle : undefined);
  const descriptionField = featureText
    ? product.productFeatureText?.jsonValue
    : productName
      ? product.productFeatureTitle?.jsonValue
      : undefined;
  const image = getProductImage(product);
  const link = getProductLink(product);
  const imageSrc = image?.value?.src;
  const rawImageAlt = image?.value?.alt;
  const imageAlt = typeof rawImageAlt === 'string' ? rawImageAlt : undefined;

  if (
    !title ||
    (!description && !imageSrc && !link.href) ||
    isClearlyLegacyProduct(product, [
      title,
      description,
      imageSrc,
      imageAlt,
      link.href,
      link.text,
    ])
  ) {
    return null;
  }

  return {
    key: product.id || `${title}-${index}`,
    title,
    titleField,
    description,
    descriptionField,
    href: link.href,
    linkText: link.text || `Learn more about ${title}`,
    image,
  };
};

const asImageField = (resource: (typeof resources)[number]): ImageField => ({
  value: {
    src: resource.image,
    alt: resource.title,
    width: '900',
    height: '600',
  },
});

const fallbackResources: ResourceCard[] = resources.map((resource) => ({
  key: resource.title,
  title: resource.title,
  description: resource.description,
  href: resource.href,
  linkText: resource.linkText,
  image: asImageField(resource),
}));

export const ProductListingNwnResources: React.FC<ProductListingProps> = (
  props,
) => {
  const { fields, isPageEditing } = props;
  const datasource = fields?.data?.datasource;

  if (!fields || !datasource) {
    return <NoDataFallback componentName="ProductListing" />;
  }

  const authoredHeading = datasource.title?.jsonValue?.value;
  const heading =
    authoredHeading && !isLegacyStarterDataValue(authoredHeading)
      ? authoredHeading
      : 'More ways NW Natural can help.';
  const authoredResources = (datasource.products?.targetItems ?? [])
    .map(toAuthoredResource)
    .filter((resource): resource is ResourceCard => Boolean(resource));
  const visibleResources = (
    authoredResources.length ? authoredResources : fallbackResources
  ).slice(0, 3);
  const viewAllLink = datasource.viewAllLink?.jsonValue;
  const viewAll = getLinkDetails(viewAllLink);
  const showViewAll = Boolean(
    viewAll.href &&
      !isLegacyStarterDataValue(`${viewAll.href} ${viewAll.text ?? ''}`),
  );

  return (
    <section
      data-component="ProductListing"
      data-variant="NwnResources"
      className={cn(
        'bg-[#f4f5f7] py-16 sm:py-20 lg:py-24',
        props.params?.styles,
      )}
      aria-labelledby="nwn-product-listing-heading"
    >
      <div className="nwn-content-shell">
        <div className="max-w-3xl">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Explore more
          </p>
          {isPageEditing ? (
            <Text
              tag="h2"
              id="nwn-product-listing-heading"
              field={datasource.title?.jsonValue}
              className="mt-3 text-balance font-heading text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.03] text-slate-900"
            />
          ) : (
            <h2
              id="nwn-product-listing-heading"
              className="mt-3 text-balance font-heading text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.03] text-slate-900"
            >
              {heading}
            </h2>
          )}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {visibleResources.map((resource) => (
            <article
              key={resource.key}
              className="group overflow-hidden rounded-sm bg-white shadow-[0_7px_24px_rgba(26,55,67,0.08)] transition-transform duration-300 motion-safe:hover:-translate-y-1"
            >
              {resource.image?.value?.src ? (
                <ImageWrapper
                  image={resource.image}
                  wrapperClass="aspect-[3/2] overflow-hidden"
                  className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.035]"
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  page={props.page}
                />
              ) : (
                <div
                  className="aspect-[3/2] bg-[linear-gradient(135deg,#e4f4f7_0%,#a7dce7_100%)]"
                  aria-hidden="true"
                />
              )}
              <div className="p-7">
                {resource.titleField ? (
                  <Text
                    tag="h3"
                    field={resource.titleField}
                    className="font-heading text-3xl font-semibold leading-tight text-slate-900"
                  />
                ) : (
                  <h3 className="font-heading text-3xl font-semibold leading-tight text-slate-900">
                    {resource.title}
                  </h3>
                )}
                {resource.descriptionField ? (
                  <Text
                    tag="p"
                    field={resource.descriptionField}
                    className="mt-3 text-base leading-7 text-slate-600"
                  />
                ) : (
                  resource.description && (
                    <p className="mt-3 text-base leading-7 text-slate-600">
                      {resource.description}
                    </p>
                  )
                )}
                {resource.href && (
                  <NextLink
                    href={resource.href}
                    className="mt-6 inline-flex items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {resource.linkText}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </NextLink>
                )}
              </div>
            </article>
          ))}
        </div>

        {showViewAll && viewAllLink && (
          <div className="mt-10 flex justify-end">
            <SitecoreLink
              field={viewAllLink}
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
            >
              {viewAll.text || 'View all resources'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </SitecoreLink>
          </div>
        )}
      </div>
    </section>
  );
};
