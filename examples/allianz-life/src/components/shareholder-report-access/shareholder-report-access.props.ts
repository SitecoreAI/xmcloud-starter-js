import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ShareholderReportAccessDatasource {
  id?: string;
  heading?: { jsonValue?: Field<string> };
  reportsLink?: { jsonValue?: LinkField };
}
export type ShareholderReportAccessProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ShareholderReportAccessDatasource } };
};
