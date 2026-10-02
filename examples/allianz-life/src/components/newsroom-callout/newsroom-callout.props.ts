import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

type TextValue = { jsonValue?: Field<string> };
type LinkValue = { jsonValue?: LinkField };
type NativeField = { name?: string; jsonValue?: unknown };

export interface NewsroomCalloutDatasource {
  id?: string;
  heading?: TextValue;
  body?: TextValue;
  link?: LinkValue;
  fieldCollection?: NativeField[] | null;
}

export type NewsroomCalloutProps = ComponentProps & {
  fields?: { data?: { datasource?: NewsroomCalloutDatasource } };
};

export function newsroomCalloutFields(item: NewsroomCalloutDatasource): NewsroomCalloutDatasource {
  if (!Array.isArray(item.fieldCollection)) return item;
  const result = { ...item } as Record<string, unknown>;
  const allowed = new Set(['heading', 'body', 'link']);
  for (const field of item.fieldCollection) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const name = field.name.toLowerCase();
    if (allowed.has(name) && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
  }
  return result as NewsroomCalloutDatasource;
}
