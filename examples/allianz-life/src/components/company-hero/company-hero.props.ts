import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

type TextValue = { jsonValue?: Field<string> };
type ImageValue = { jsonValue?: ImageField };
type NativeField = { name?: string; jsonValue?: unknown };

export interface CompanyHeroDatasource {
  id?: string;
  heading?: TextValue;
  subtitle?: TextValue;
  image?: ImageValue;
  /** Existing native fields survive initial same-ID adoption; mobileImage is not rendered. */
  body?: TextValue;
  desktopImage?: ImageValue;
  mobileImage?: ImageValue;
  fieldCollection?: NativeField[] | null;
}
export type CompanyHeroProps = ComponentProps & { fields?: { data?: { datasource?: CompanyHeroDatasource } } };

/** Canonical native fields win even when deliberately cleared. Preserve SDK metadata. */
function project<T extends object>(item: T, names: readonly string[], aliases: Readonly<Record<string, string>> = {}): T {
  const result = { ...item } as Record<string, unknown>;
  const fields = (item as { fieldCollection?: NativeField[] | null }).fieldCollection;
  const allowed = new Map(names.map((name) => [name.toLowerCase(), name]));
  for (const field of fields ?? []) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const name = allowed.get(field.name.toLowerCase());
    if (name && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
  }
  for (const [oldName, name] of Object.entries(aliases)) {
    if (!Object.hasOwn(result, name) && Object.hasOwn(item, oldName)) result[name] = (item as Record<string, unknown>)[oldName];
  }
  for (const field of fields ?? []) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const oldName = field.name.toLowerCase();
    const name = Object.hasOwn(aliases, oldName) ? aliases[oldName] : undefined;
    if (name && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
  }
  return result as T;
}

export function companyHeroFields(item: CompanyHeroDatasource): CompanyHeroDatasource {
  return project(item, ['heading', 'subtitle', 'image'], { body: 'subtitle', desktopImage: 'image', desktopimage: 'image' });
}
