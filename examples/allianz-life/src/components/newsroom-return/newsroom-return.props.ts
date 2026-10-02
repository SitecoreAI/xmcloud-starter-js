import type { LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface NewsroomReturnDatasource {
  id?: string;
  link?: { jsonValue?: LinkField };
}

export type NewsroomReturnProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: NewsroomReturnDatasource } };
};
