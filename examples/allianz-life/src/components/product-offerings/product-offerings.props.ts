import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** The four authored fields of one homepage product offering. */
export interface ProductOfferingEntry {
  id: string;
  title?: { jsonValue?: Field<string> };
  text?: { jsonValue?: Field<string> };
  icon?: { jsonValue?: ImageField };
  link?: { jsonValue?: LinkField };
  fieldCollection?: { name?: string; jsonValue?: unknown }[] | null;
}

/** The collection root has no authored content fields. */
export interface ProductOfferingsDatasource {
  id?: string;
  children?: {
    total?: number;
    pageInfo?: { hasNext?: boolean; endCursor?: string | null };
    results: ProductOfferingEntry[];
  };
}

export type ProductOfferingsProps = ComponentProps & {
  fields?: { data?: { datasource?: ProductOfferingsDatasource } };
};
