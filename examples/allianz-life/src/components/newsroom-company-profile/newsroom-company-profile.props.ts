import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

type TextValue = { jsonValue?: Field<string> };
type ImageValue = { jsonValue?: ImageField };
type NativeField = { name?: string; jsonValue?: unknown };

export interface NewsroomCompanyProfileDatasource {
  id?: string;
  heading?: TextValue;
  facts?: TextValue;
  companyImage?: ImageValue;
  parentHeading?: TextValue;
  parentBody?: TextValue;
  parentImage?: ImageValue;
  fieldCollection?: NativeField[] | null;
}

export type NewsroomCompanyProfileProps = ComponentProps & {
  fields?: { data?: { datasource?: NewsroomCompanyProfileDatasource } };
};

/** Only the six native root fields participate; explicit clears retain priority. */
export function newsroomCompanyProfileFields(item: NewsroomCompanyProfileDatasource): NewsroomCompanyProfileDatasource {
  const result = { ...item } as Record<string, unknown>;
  const names = new Map(['heading', 'facts', 'companyImage', 'parentHeading', 'parentBody', 'parentImage']
    .map((name) => [name.toLowerCase(), name]));
  for (const field of item.fieldCollection ?? []) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const name = names.get(field.name.toLowerCase());
    if (name && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
  }
  return result as NewsroomCompanyProfileDatasource;
}
