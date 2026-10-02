import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

type TextValue = { jsonValue?: Field<string> };
type ImageValue = { jsonValue?: ImageField };
type LinkValue = { jsonValue?: LinkField };
type NativeField = { name?: string; jsonValue?: unknown };

export interface OfferingsPromptDatasource {
  id?: string;
  heading?: TextValue;
  body?: TextValue;
  icon?: ImageValue;
  link?: LinkValue;
  fieldCollection?: NativeField[] | null;
}
export type OfferingsPromptProps = ComponentProps & { fields?: { data?: { datasource?: OfferingsPromptDatasource } } };

/** Read only this purpose's root fields, retaining SDK metadata and intentional clears. */
export function offeringsPromptFields(item: OfferingsPromptDatasource): OfferingsPromptDatasource {
  if (!Array.isArray(item.fieldCollection)) return item;
  const result = { ...item } as Record<string, unknown>;
  const allowed = new Set(['heading', 'body', 'icon', 'link']);
  for (const field of item.fieldCollection) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const name = field.name.toLowerCase();
    if (allowed.has(name) && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
  }
  return result as OfferingsPromptDatasource;
}
