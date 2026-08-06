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

const KNOWN_NWN_RESOURCE_IMAGES: Record<string, string> = {
  '/ways-to-save/rebates-offers':
    '/assets/nwn-images/rebates-high-efficiency-furnace-landscape.png',
  '/get-natural-gas/cooking':
    '/assets/nwn-images/cooking-with-gas-home-chef-landscape.png',
  '/safety/smell-natural-gas':
    '/assets/nwn-images/safety-smell-gas-call-from-outside-landscape.png',
};

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

const getComparableRoute = (path: string): string => {
  const trimmedPath = path.trim();

  try {
    const parsedPath = new URL(trimmedPath, 'https://www.nwnatural.com');
    return parsedPath.pathname.replace(/\/+$/, '').toLowerCase() || '/';
  } catch {
    return trimmedPath.split(/[?#]/, 1)[0].replace(/\/+$/, '').toLowerCase();
  }
};

const canonicalizeNwnRoute = (path: string | undefined): string | undefined => {
  if (!path?.trim()) return undefined;

  const comparableRoute = getComparableRoute(path);
  const canonicalRoute = Object.keys(KNOWN_NWN_RESOURCE_IMAGES).find(
    (knownRoute) =>
      comparableRoute === knownRoute || comparableRoute.endsWith(knownRoute),
  );

  return canonicalRoute || path.trim();
};

const getProductLink = (
  product: ProductItemProps,
): { href?: string; text?: string } => {
  const cardLink = getLinkDetails(product.cardLink?.jsonValue);
  const linkedField = getLinkDetails(product.url?.jsonValue);
  const path =
    cardLink.href ||
    product.route?.path ||
    linkedField.href ||
    product.url?.path ||
    product.url?.url;

  return {
    href: canonicalizeNwnRoute(path),
    text: cardLink.text || linkedField.text,
  };
};

const getProductImage = (
  product: ProductItemProps,
  href: string | undefined,
  title: string,
): ImageField | undefined => {
  const cardImage = product.cardImage?.jsonValue;
  const pageThumbnail = product.pageThumbnail?.jsonValue;
  const productThumbnail = product.productThumbnail?.jsonValue;

  if (cardImage?.value?.src) return cardImage;
  if (pageThumbnail?.value?.src) return pageThumbnail;
  if (href && KNOWN_NWN_RESOURCE_IMAGES[href]) {
    return {
      value: {
        src: KNOWN_NWN_RESOURCE_IMAGES[href],
        alt: title,
        width: '900',
        height: '600',
      },
    };
  }
  if (productThumbnail?.value?.src) return productThumbnail;
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
  const cardTitle = getTextValue(product.cardTitle);
  const cardDescription = getTextValue(product.cardDescription);
  const pageShortTitle = getTextValue(product.pageShortTitle);
  const pageTitle = getTextValue(product.pageTitle);
  const pageSummary = getTextValue(product.pageSummary);
  const pageSubtitle = getTextValue(product.pageSubtitle);
  const productName = getTextValue(product.productName);
  const featureTitle = getTextValue(product.productFeatureTitle);
  const featureText = getTextValue(product.productFeatureText);
  const title =
    cardTitle || pageShortTitle || pageTitle || productName || featureTitle;
  const titleField = cardTitle
    ? product.cardTitle?.jsonValue
    : pageShortTitle
      ? product.pageShortTitle?.jsonValue
      : pageTitle
        ? product.pageTitle?.jsonValue
        : productName
          ? product.productName?.jsonValue
          : product.productFeatureTitle?.jsonValue;
  const description =
    cardDescription ||
    pageSummary ||
    pageSubtitle ||
    featureText ||
    (productName ? featureTitle : undefined);
  const descriptionField = cardDescription
    ? product.cardDescription?.jsonValue
    : pageSummary
      ? product.pageSummary?.jsonValue
      : pageSubtitle
        ? product.pageSubtitle?.jsonValue
        : featureText
          ? product.productFeatureText?.jsonValue
          : productName
            ? product.productFeatureTitle?.jsonValue
            : undefined;
  const link = getProductLink(product);
  if (!title) return null;

  const image = getProductImage(product, link.href, title);
  const imageSrc = image?.value?.src;
  const rawImageAlt = image?.value?.alt;
  const imageAlt = typeof rawImageAlt === 'string' ? rawImageAlt : undefined;

  if (
    (!description && !imageSrc && !link.href) ||
    isClearlyLegacyProduct(product, [
      cardTitle,
      cardDescription,
      pageShortTitle,
      pageTitle,
      pageSummary,
      pageSubtitle,
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
  const visibleResources = authoredResources.slice(0, 3);
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
        'bg-[#f4f5f7] py-14 sm:py-16 lg:py-20',
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
              className="mt-3 text-balance font-heading text-[clamp(2.125rem,3.5vw,2.75rem)] font-medium leading-[1.03] text-slate-900"
            />
          ) : (
            <h2
              id="nwn-product-listing-heading"
              className="mt-3 text-balance font-heading text-[clamp(2.125rem,3.5vw,2.75rem)] font-medium leading-[1.03] text-slate-900"
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
                    className="font-heading text-[clamp(1.5rem,2vw,1.75rem)] font-semibold leading-tight text-slate-900"
                  />
                ) : (
                  <h3 className="font-heading text-[clamp(1.5rem,2vw,1.75rem)] font-semibold leading-tight text-slate-900">
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
                    className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
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
