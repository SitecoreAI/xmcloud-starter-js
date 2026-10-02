import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface BiographyDisclosuresDatasource {
  id?: string;
  body?: { jsonValue?: Field<string> };
}
export type BiographyDisclosuresProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: BiographyDisclosuresDatasource } };
};
