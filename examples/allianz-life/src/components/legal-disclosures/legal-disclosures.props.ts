import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface LegalDisclosuresDatasource {
  id?: string;
  body?: { jsonValue?: Field<string> };
  fieldCollection?: { name?: string; jsonValue?: unknown }[] | null;
}

/** The grey variant accepts the compact native collection without replacing clears. */
export function legalDisclosuresFields(item: LegalDisclosuresDatasource): LegalDisclosuresDatasource {
  if (Object.hasOwn(item, 'body')) return item;
  const body = item.fieldCollection?.find((field) => field?.name?.toLowerCase() === 'body' && Object.hasOwn(field, 'jsonValue'));
  return body ? { ...item, body: { jsonValue: body.jsonValue as Field<string> | undefined } } : item;
}

export type LegalDisclosuresProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: LegalDisclosuresDatasource } };
};
