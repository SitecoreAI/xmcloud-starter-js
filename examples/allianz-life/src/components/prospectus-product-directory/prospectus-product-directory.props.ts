import type { LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ProspectusProductLink {
  id?: string;
  productLink?: { jsonValue?: LinkField };
}

export interface ProspectusProductDirectoryDatasource {
  id?: string;
  currentProducts?: { targetItems?: ProspectusProductLink[] };
  pastProducts?: { targetItems?: ProspectusProductLink[] };
}

export type ProspectusProductDirectoryProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProspectusProductDirectoryDatasource } };
};
