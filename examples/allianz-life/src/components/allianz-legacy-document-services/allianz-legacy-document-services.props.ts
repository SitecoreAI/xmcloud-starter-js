import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import type { JsonField } from 'lib/allianz-fields';

/** Source-faithful, disabled account-form copy is code-owned; surrounding rail content is authored. */
export const DOCUMENT_LOGIN_COPY = {
  "usernameLabel": "Username*",
  "usernamePlaceholder": "Username",
  "passwordLabel": "Password*",
  "passwordPlaceholder": "Password",
  "rememberLabel": "Remember me",
  "loginLabel": "Login",
  "forgotUsernameLabel": "Forgot username?",
  "forgotPasswordLabel": "Forgot password?",
  "registerLabel": "Register"
} as const;
export const DOCUMENT_LOGIN_FIELDS = Object.fromEntries(Object.entries(DOCUMENT_LOGIN_COPY).map(([name, value]) => [name, { jsonValue: { value } }]));

export const DOCUMENT_SERVICE_TEXT_FIELDS = [
  'accountLabel', 'contactLabel', 'socialLabel', 'mobileSocialLabel', 'socialHeading',
  'socialBody', 'usernameLabel', 'usernamePlaceholder', 'passwordLabel',
  'passwordPlaceholder', 'rememberLabel', 'loginLabel', 'forgotUsernameLabel',
  'forgotPasswordLabel', 'registerLabel',
] as const;
export type DocumentServiceTextField = typeof DOCUMENT_SERVICE_TEXT_FIELDS[number];
type NativeFields = { fieldCollection?: { name?: string; jsonValue?: unknown }[] | null };
export type DocumentSocialLink = NativeFields & {
  id: string;
  heading?: JsonField<Field<string>>;
  link?: JsonField<LinkField>;
};
export type DocumentServicesDatasource = NativeFields & Partial<Record<DocumentServiceTextField, JsonField<Field<string>>>> & {
  contactLink?: JsonField<LinkField>;
  children?: { results: DocumentSocialLink[] };
};
export type DocumentServicesProps = ComponentProps & {
  fields?: { data?: { datasource?: DocumentServicesDatasource } };
};
export type DocumentServicesViewProps = DocumentServicesProps & { withLogin: boolean; isEditing: boolean };
export type DocumentRailPanel = 'account' | 'social' | null;

/** Alias named query fields and Item.fields without discarding SDK metadata or explicit clears. */
export function documentServiceFields<T extends NativeFields>(data: T, names: readonly string[]): T {
  if (!Array.isArray(data.fieldCollection)) return data;
  const canonical = new Map(names.map((name) => [name.toLowerCase(), name]));
  const result: Record<string, unknown> = { ...data };
  for (const field of data.fieldCollection) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const name = canonical.get(field.name.toLowerCase());
    if (name && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
  }
  return result as T;
}

export function toggleDocumentRailPanel(current: DocumentRailPanel, requested: Exclude<DocumentRailPanel, null>): DocumentRailPanel {
  return current === requested ? null : requested;
}

/** Visual identity follows the original authored destination before visitor link isolation. */
export function documentSocialClass(href?: string): string | undefined {
  const network = new Map([
    ['https://www.facebook.com/allianzlife', 'facebook'],
    ['https://www.twitter.com/allianzlife', 'twitter'],
    ['https://www.linkedin.com/company/allianz-life', 'linkedin'],
    ['https://www.youtube.com/allianzus', 'youtube'],
  ]).get(href?.toLowerCase().replace(/\/$/, '') || '');
  return network ? `social-follow-${network}` : undefined;
}
