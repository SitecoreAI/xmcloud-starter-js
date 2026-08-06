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

interface ResourceCard {
  key: string;
  title: string;
  titleField?: Field<string>;
  description?: string;
  descriptionField?: Field<string>;
  href?: string;
  linkText?: string;
  linkField?: LinkField;
  image?: ImageField;
  editableImage?: ImageField;
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
): { href?: string; text?: string; field?: LinkField } => {
  const cardLinkField = product.cardLink?.jsonValue;
  const linkedField = product.url?.jsonValue;
  const cardLink = getLinkDetails(cardLinkField);
  const linkedLink = getLinkDetails(linkedField);
  const path =
    cardLink.href ||
    product.route?.path ||
    linkedLink.href ||
    product.url?.path ||
    product.url?.url;

  return {
    href: path?.trim() || undefined,
    text: cardLink.text || linkedLink.text,
    field: cardLinkField || linkedField,
  };
};

const getProductImage = (product: ProductItemProps): ImageField | undefined => {
  const cardImage = product.cardImage?.jsonValue;
  const pageThumbnail = product.pageThumbnail?.jsonValue;
  const productThumbnail = product.productThumbnail?.jsonValue;

  if (cardImage?.value?.src) return cardImage;
  if (pageThumbnail?.value?.src) return pageThumbnail;
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

  const image = getProductImage(product);
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
    linkText: link.text,
    linkField: link.field,
    image,
    editableImage:
      product.cardImage?.jsonValue ||
      product.pageThumbnail?.jsonValue ||
      product.productThumbnail?.jsonValue,
  };
};

export const ProductListingNwnResources: React.FC<ProductListingProps> = (
  props,
) => {
  const { fields, isPageEditing } = props;
  const datasource = fields?.data?.datasource;

  if (!fields || !datasource) {
    return isPageEditing ? (
      <NoDataFallback componentName="ProductListing" />
    ) : null;
  }

  const headingField = datasource.title?.jsonValue;
  const showHeading =
    isPageEditing ||
    Boolean(
      headingField?.value && !isLegacyStarterDataValue(headingField.value),
    );
  const authoredResources = (datasource.products?.targetItems ?? [])
    .map(toAuthoredResource)
    .filter((resource): resource is ResourceCard => Boolean(resource));
  const visibleResources = authoredResources.slice(0, 3);

  if (visibleResources.length === 0) {
    return isPageEditing ? (
      <NoDataFallback componentName="ProductListing items" />
    ) : null;
  }

  const viewAllLink = datasource.viewAllLink?.jsonValue;
  const viewAll = getLinkDetails(viewAllLink);
  const showViewAll =
    isPageEditing ||
    Boolean(
      viewAll.href &&
        viewAll.text &&
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
      aria-labelledby={showHeading ? 'nwn-product-listing-heading' : undefined}
      aria-label={showHeading ? undefined : 'Customer resources'}
    >
      <div className="nwn-content-shell">
        <div className="max-w-3xl">
          {showHeading && (
            <Text
              tag="h2"
              id="nwn-product-listing-heading"
              field={headingField}
              className="text-balance font-heading text-[clamp(2.125rem,3.5vw,2.75rem)] font-medium leading-[1.03] text-slate-900"
            />
          )}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {visibleResources.map((resource) => {
            const displayImage =
              resource.image ||
              (isPageEditing ? resource.editableImage : undefined);
            const showImage =
              isPageEditing || Boolean(displayImage?.value?.src);

            return (
              <article
                key={resource.key}
                className="group overflow-hidden rounded-sm bg-white shadow-[0_7px_24px_rgba(26,55,67,0.08)] transition-transform duration-300 motion-safe:hover:-translate-y-1"
              >
                {showImage && (
                  <ImageWrapper
                    image={displayImage}
                    wrapperClass="aspect-[3/2] overflow-hidden"
                    className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.035]"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    page={props.page}
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
                  {isPageEditing && resource.linkField ? (
                    <SitecoreLink
                      field={resource.linkField}
                      editable
                      className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
                    />
                  ) : (
                    resource.href &&
                    resource.linkText && (
                      <NextLink
                        href={resource.href}
                        className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        {resource.linkText}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </NextLink>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {showViewAll && viewAllLink && (
          <div className="mt-10 flex justify-end">
            <SitecoreLink
              field={viewAllLink}
              editable={isPageEditing}
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
            >
              {viewAll.text}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </SitecoreLink>
          </div>
        )}
      </div>
    </section>
  );
};
