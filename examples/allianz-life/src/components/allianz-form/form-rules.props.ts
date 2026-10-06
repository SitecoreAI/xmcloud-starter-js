import sourceJson from './source-schemas.json';
import type { AllianzFormField } from './allianz-form.props';

export interface FormOption { value: string; label: string; group?: string; superscript?: string }
export interface FormDefinition {
  name: string;
  label: string;
  inputType: string;
  required: boolean;
  maxLength: number;
  pattern: string;
  placeholder: string;
  requiredMessage: string;
  invalidMessage: string;
  options: FormOption[];
  multiple?: boolean;
  selectionDisplay?: 'checkboxes' | 'dropdown';
  labelField?: AllianzFormField['label'];
}
export type FormValue = string | string[];
export type FormValues = Record<string, FormValue>;
export type FormErrors = Record<string, string>;
export type SchemaKey = 'death-claim' | 'new-york-contact' | 'product-contact' | 'new-york-product-contact' | 'generic';
const source = sourceJson as Record<SchemaKey, { sourceUrl: string; fields: FormDefinition[] }>;
export const MAX_POLICIES = 20;
export const REASON = 'ContactUsReason.SelectedReason';
export const RELATIONSHIP = 'StartClaimAboutYou.selectedrelationship';
export const POLICY_PREFIX = 'StartClaimAbout.policycontractnumber';

/** Code-owned source definitions. Legacy CMS input is accepted but never overrides a form. */
export function formDefinitions(key: SchemaKey, nativeFields?: AllianzFormField[]): FormDefinition[] {
  void nativeFields;
  return source[key].fields.map((definition) => ({
    ...definition,
    options: definition.options.map((option) => ({ ...option })),
    labelField: { jsonValue: { value: definition.label } },
  }));
}

/** Contact field visibility matches captured live source branches; submission stays local-only. */
export function visibleDefinitions(key: SchemaKey, definitions: FormDefinition[], values: FormValues, policies: number): FormDefinition[] {
  return definitions.filter((field) => {
    const policyIndex = field.name.match(/policycontractnumber\[(\d+)\]/)?.[1];
    if (policyIndex && Number(policyIndex) >= Math.min(MAX_POLICIES, policies)) return false;
    if (field.name === 'StartClaimAboutYou.otherRelationship') return values[RELATIONSHIP] === 'Other';
    if (key !== 'new-york-contact') return true;
    if (field.name === 'SelectFirm.SelectedFirm') return values[REASON] === 'SellProducts';
    if (field.name === '_ProductSelector.SelectedProducts') return values[REASON] === 'PurchaseProducts';
    if (field.name === 'ProductCategory.SelectedCategories') return ['QuestionContractPolicy', 'SellProducts', 'Other'].includes(String(values[REASON] || ''));
    return true;
  });
}

function calendarDate(prefix: string, values: FormValues): Date | null {
  const parts = ['Year', 'Month', 'Day'].map((part) => Number(values[prefix + part]));
  if (parts.some((part) => !part)) return null;
  const [year, month, day] = parts;
  const result = new Date(Date.UTC(year, month - 1, day));
  return result.getUTCFullYear() === year && result.getUTCMonth() === month - 1 && result.getUTCDate() === day ? result : null;
}

/** No input values are persisted, logged, transmitted, or returned to analytics. */
export function validateForm(definitions: FormDefinition[], values: FormValues, key: SchemaKey): FormErrors {
  const errors: FormErrors = {};
  for (const field of definitions) {
    const stored = values[field.name];
    if ((key === 'new-york-contact' || key === 'product-contact' || key === 'new-york-product-contact') && field.multiple) {
      const selected = Array.isArray(stored) ? stored : [];
      if (field.required && !selected.length) { errors[field.name] = field.requiredMessage; continue; }
      if ((stored !== undefined && !Array.isArray(stored)) || selected.some((value) => typeof value !== 'string' || !field.options.some((option) => option.value === value))) {
        errors[field.name] = 'Please select an available option';
      } else if (selected.some((value) => value.length > field.maxLength)) {
        errors[field.name] = `Enter no more than ${field.maxLength} characters`;
      }
      continue;
    }
    const value = typeof stored === 'string' ? stored.trim() : '';
    if (field.required && !value) { errors[field.name] = field.requiredMessage; continue; }
    if (!value) continue;
    if (value.length > field.maxLength) { errors[field.name] = `Enter no more than ${field.maxLength} characters`; continue; }
    if (field.options.length && !field.options.some((option) => option.value === value)) { errors[field.name] = 'Please select an available option'; continue; }
    if (field.pattern) {
      try { if (!new RegExp(`^(?:${field.pattern})$`).test(value)) errors[field.name] = field.invalidMessage; }
      catch { errors[field.name] = 'Please enter a valid value'; }
    } else if (field.inputType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.name] = 'Please enter a valid email address';
  }
  if (key === 'death-claim') {
    for (const prefix of ['StartClaimAbout.DateOfDeath', 'StartClaimAbout.DateOfBirth']) {
      if (['Month', 'Day', 'Year'].every((part) => values[prefix + part]) && !calendarDate(prefix, values)) errors[prefix + 'Month'] = 'Please select a valid calendar date';
    }
    const birth = calendarDate('StartClaimAbout.DateOfBirth', values);
    const death = calendarDate('StartClaimAbout.DateOfDeath', values);
    if (birth && death && birth > death) errors['StartClaimAbout.DateOfBirthMonth'] = 'Date of birth must be on or before the date of death';
    if (death && death > new Date()) errors['StartClaimAbout.DateOfDeathMonth'] = 'Date of death must not be in the future';
  }
  return errors;
}
