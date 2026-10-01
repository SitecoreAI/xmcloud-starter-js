import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface RetirementGoalsIntroDatasource {
  id?: string;
  heading?: { jsonValue?: Field<string> };
  body?: { jsonValue?: Field<string> };
}

export type RetirementGoalsIntroProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: RetirementGoalsIntroDatasource } };
};
