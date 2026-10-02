import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';

type TextValue = { jsonValue?: Field<string> };
type LinkValue = { jsonValue?: LinkField };
type NativeField = { name?: string; jsonValue?: unknown };

/** A referenced content record, not a separately authorable rendering. */
export interface MediaContactRecord {
  id?: string;
  name?: TextValue;
  role?: TextValue;
  telephone?: LinkValue;
  email?: LinkValue;
  fieldCollection?: NativeField[] | null;
}

export interface MediaContactProps {
  contact: MediaContactRecord;
  isEditing: boolean;
}

/** Keep the SDK field object intact, including metadata and deliberate clears. */
export function mediaContactFields(item: MediaContactRecord): MediaContactRecord {
  if (!Array.isArray(item.fieldCollection)) return item;
  const result = { ...item } as Record<string, unknown>;
  const allowed = new Set(['name', 'role', 'telephone', 'email']);
  for (const field of item.fieldCollection) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const name = field.name.toLowerCase();
    if (allowed.has(name) && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
  }
  return result as MediaContactRecord;
}
