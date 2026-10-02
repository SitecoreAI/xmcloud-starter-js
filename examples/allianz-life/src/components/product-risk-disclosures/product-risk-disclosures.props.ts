import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ProductRiskDisclosuresDatasource {
  id?: string;
  body?: { jsonValue?: Field<string> };
}

export type ProductRiskDisclosuresProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProductRiskDisclosuresDatasource } };
};
