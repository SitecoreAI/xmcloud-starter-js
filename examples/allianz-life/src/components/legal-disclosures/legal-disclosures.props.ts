import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface LegalDisclosuresDatasource {
  id?: string;
  body?: { jsonValue?: Field<string> };
}

export type LegalDisclosuresProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: LegalDisclosuresDatasource } };
};
