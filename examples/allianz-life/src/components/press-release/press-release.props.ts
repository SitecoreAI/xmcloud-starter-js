import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface PressReleaseDatasource {
  id?: string;
  title?: { jsonValue?: Field<string> };
  summary?: { jsonValue?: Field<string> };
  body?: { jsonValue?: Field<string> };
}

export type PressReleaseProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: PressReleaseDatasource } };
};
