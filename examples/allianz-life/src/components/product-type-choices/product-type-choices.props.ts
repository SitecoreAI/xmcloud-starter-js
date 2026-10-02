import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** Each product type has one heading, body, Image and General Link. */
export interface ProductTypeChoiceEntry {
  id: string;
  heading?: { jsonValue?: Field<string> };
  body?: { jsonValue?: Field<string> };
  image?: { jsonValue?: ImageField };
  link?: { jsonValue?: LinkField };
  fieldCollection?: { name?: string; jsonValue?: unknown }[] | null;
}

/** The collection root has no authorable content fields. */
export interface ProductTypeChoicesDatasource {
  id?: string;
  children?: {
    total?: number;
    pageInfo?: { hasNext?: boolean; endCursor?: string | null };
    results?: ProductTypeChoiceEntry[];
  };
}

export type ProductTypeChoicesProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProductTypeChoicesDatasource } };
};
