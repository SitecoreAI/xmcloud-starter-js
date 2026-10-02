import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ProductFootnotesDatasource {
  id?: string;
  body?: { jsonValue?: Field<string> };
}

export type ProductFootnotesProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProductFootnotesDatasource } };
};
