import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ProductDisclosuresDatasource {
  id?: string;
  body?: { jsonValue?: Field<string> };
}

export type ProductDisclosuresProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProductDisclosuresDatasource } };
};
