import type { ComponentProps } from 'lib/component-props';
import type { TextValue } from 'lib/allianz-fields';

type NativeFormFields = { fieldCollection?: { name?: string; jsonValue?: unknown }[] | null };

export interface AllianzFormField extends NativeFormFields {
  id: string;
  name?: TextValue;
  label?: TextValue;
  inputType?: TextValue;
  required?: { jsonValue?: { value?: string | boolean } };
  validationMessage?: TextValue;
  options?: TextValue;
  maxLength?: TextValue;
  pattern?: TextValue;
  placeholder?: TextValue;
  sourceName?: TextValue;
  minValue?: TextValue;
  maxValue?: TextValue;
  initialValue?: TextValue;
  footnote?: TextValue;
}
export interface AllianzFormDatasource extends NativeFormFields {
  id?: string;
  heading?: TextValue;
  body?: TextValue;
  schemaKey?: TextValue;
  submitLabel?: TextValue;
  successMessage?: TextValue;
  failureMessage?: TextValue;
  reviewHeading?: TextValue;
  secondaryHeading?: TextValue;
  secondaryBody?: TextValue;
  children?: {
    total?: number;
    pageInfo?: { hasNext: boolean; endCursor?: string | null };
    results: AllianzFormField[];
  };
}
export type AllianzFormProps = ComponentProps & {
  fields?: { data?: { datasource?: AllianzFormDatasource } };
};

export const FORM_DATASOURCE_FIELDS = [
  'heading', 'body', 'schemaKey', 'secondaryHeading', 'secondaryBody',
  'reviewHeading', 'successMessage', 'failureMessage', 'submitLabel',
] as const;
export const FORM_CHILD_FIELDS = [
  'name', 'label', 'inputType', 'required', 'validationMessage', 'options',
  'maxLength', 'pattern', 'placeholder', 'sourceName', 'minValue', 'maxValue',
  'initialValue', 'footnote',
] as const;

/** Keep native SDK field values intact; explicit named fields, including clears, win. */
function namedFormFields<T extends NativeFormFields>(data: T, names: readonly string[]): T {
  if (!Array.isArray(data.fieldCollection)) return data;
  const canonical = new Map(names.map((name) => [name.toLowerCase(), name]));
  let result = data;
  for (const field of data.fieldCollection) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const name = canonical.get(field.name.toLowerCase());
    if (!name || Object.hasOwn(result, name)) continue;
    if (result === data) result = { ...data };
    (result as Record<string, unknown>)[name] = { jsonValue: field.jsonValue };
  }
  return result;
}

/** Accept both integrated GraphQL projections without changing child order or pagination. */
export function formDatasource(data: AllianzFormDatasource | undefined): AllianzFormDatasource | undefined {
  if (!data) return data;
  const result = namedFormFields(data, FORM_DATASOURCE_FIELDS);
  if (!Array.isArray(result.children?.results)) return result;
  const children = result.children;
  const results = children.results.map((child) => namedFormFields(child, FORM_CHILD_FIELDS));
  if (results.every((child, index) => child === children.results[index])) return result;
  return { ...result, children: { ...children, results } };
}
