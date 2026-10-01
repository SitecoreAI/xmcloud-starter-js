import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** The named root query exposes exactly the three fields used by this section. */
export interface RetirementSolutionsIntroDatasource {
  id?: string;
  heading?: { jsonValue?: Field<string> };
  body?: { jsonValue?: Field<string> };
  icon?: { jsonValue?: ImageField };
}

export type RetirementSolutionsIntroProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: RetirementSolutionsIntroDatasource } };
};
