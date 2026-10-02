import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** A benefit has exactly three authorable content fields. */
export interface ProductBenefitEntry {
  id: string;
  heading?: { jsonValue?: Field<string> };
  body?: { jsonValue?: Field<string> };
  icon?: { jsonValue?: ImageField };
  fieldCollection?: { name?: string; jsonValue?: unknown }[] | null;
}

/** The root controls child ordering; it has no authorable content fields. */
export interface ProductBenefitsDatasource {
  id?: string;
  children?: {
    total?: number;
    pageInfo?: { hasNext?: boolean; endCursor?: string | null };
    results?: ProductBenefitEntry[];
  };
}

export type ProductBenefitsProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProductBenefitsDatasource } };
};
