import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** A question and answer are the only authored fields of each FAQ item. */
export interface ProductFaqEntry {
  id: string;
  question?: { jsonValue?: Field<string> };
  answer?: { jsonValue?: Field<string> };
  /** Transitional names on the existing native accordion children. */
  heading?: { jsonValue?: Field<string> };
  body?: { jsonValue?: Field<string> };
  fieldCollection?: { name?: string; jsonValue?: unknown }[] | null;
}

/** The collection root deliberately has no authored content fields. */
export interface ProductFaqDatasource {
  id?: string;
  children?: {
    total?: number;
    pageInfo?: { hasNext?: boolean; endCursor?: string | null };
    results: ProductFaqEntry[];
  };
}

export type ProductFaqProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProductFaqDatasource } };
};
