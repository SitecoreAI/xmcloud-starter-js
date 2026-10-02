import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** Reuse the existing introduction card's identity as this purpose's datasource. */
export interface ProductFaqIntroDatasource {
  id?: string;
  heading?: { jsonValue?: Field<string> };
  icon?: { jsonValue?: ImageField };
}

export type ProductFaqIntroProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProductFaqIntroDatasource } };
};
