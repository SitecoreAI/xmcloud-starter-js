import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ProspectusIntroductionDatasource {
  id?: string;
  introductoryCopy?: { jsonValue?: Field<string> };
  contractNotice?: { jsonValue?: Field<string> };
}
export type ProspectusIntroductionProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProspectusIntroductionDatasource } };
};
