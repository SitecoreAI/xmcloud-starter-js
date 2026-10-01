import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** One feature, with its five authored fields on the datasource itself. */
export interface SecureFutureFeatureDatasource {
  id?: string;
  heading?: { jsonValue?: Field<string> };
  body?: { jsonValue?: Field<string> };
  image?: { jsonValue?: ImageField };
  icon?: { jsonValue?: ImageField };
  link?: { jsonValue?: LinkField };
}

export type SecureFutureFeatureProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: SecureFutureFeatureDatasource } };
};
