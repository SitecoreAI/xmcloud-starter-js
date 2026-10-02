import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ProductIntroductionDatasource {
  id?: string;
  heading?: { jsonValue?: Field<string> };
  body?: { jsonValue?: Field<string> };
}

export type ProductIntroductionProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProductIntroductionDatasource } };
};
