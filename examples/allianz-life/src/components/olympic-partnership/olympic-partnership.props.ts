import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** A single partnership section, projected by field name rather than child items. */
export interface OlympicPartnershipDatasource {
  id?: string;
  partnershipLogo?: { jsonValue?: ImageField };
  partnershipText?: { jsonValue?: Field<string> };
  partnershipLink?: { jsonValue?: LinkField };
}

export type OlympicPartnershipProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: OlympicPartnershipDatasource } };
};
