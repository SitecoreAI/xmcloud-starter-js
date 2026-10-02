import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ProductHeroDatasource {
  id?: string;
  heading?: { jsonValue?: Field<string> };
  image?: { jsonValue?: ImageField };
}

export type ProductHeroProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProductHeroDatasource } };
};
