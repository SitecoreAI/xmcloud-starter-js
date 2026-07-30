import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import { linkIsValid } from '@/components/button-component/button-component.props';

const normalizeCopy = (value?: string): string =>
  value
    ?.normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, '') ?? '';

export const hasDistinctHeroCopy = (
  bannerText?: Field<string>,
  ...comparisonFields: Array<Field<string> | undefined>
): boolean => {
  const normalizedBannerText = normalizeCopy(bannerText?.value);

  if (!normalizedBannerText) return false;

  return !comparisonFields.some(
    (field) => normalizeCopy(field?.value) === normalizedBannerText,
  );
};

export const hasRenderableHeroCta = (bannerCta?: LinkField): boolean =>
  Boolean(
    bannerCta?.value?.text?.trim() &&
      bannerCta.value.href &&
      linkIsValid(bannerCta),
  );
