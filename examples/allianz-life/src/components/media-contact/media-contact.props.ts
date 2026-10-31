import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField } from 'lib/allianz-field-state';

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

// Exact public contact destinations captured from the source newsroom. Keep
// protocol handling local to these records instead of changing generic links.
const SOURCE_CONTACT_LINKS = new Map([
  ['7C1EF21889ED4368A3933DB958207E7A', {
    telephone: 'tel:763-765-7160', email: 'mailto:brett.weinberg@allianzlife.com',
  }],
  ['81F5FB5A42A0464E9A81AB7867104517', {
    telephone: 'tel:763-765-5106', email: 'mailto:claire.woit@allianzlife.com',
  }],
]);

/** Preserve native editing fields; reconcile only the two verified contacts. */
export function mediaContactLinkField(
  item: MediaContactRecord,
  name: 'telephone' | 'email',
  isEditing: boolean,
): LinkField {
  const field = item[name]?.jsonValue;
  if (isEditing || !field?.value?.href) return allianzLinkField(field, isEditing);
  const id = item.id ?? '';
  const validId = /^(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|\{[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\})$/i.test(id);
  const owner = validId ? id.replace(/[{}-]/g, '').toUpperCase() : '';
  const expected = SOURCE_CONTACT_LINKS.get(owner)?.[name];
  const value = field.value;
  if (!expected || value.id || value.querystring || value.anchor || value.target ||
    (value.url !== undefined && value.url !== expected) ||
    (value.linktype && value.linktype !== (name === 'telephone' ? 'external' : 'mailto'))) {
    return allianzLinkField(field, false);
  }
  if (value.href === expected) return field;
  // Sitecore's external General Link serializer prefixes http:// to this
  // canonical native tel URL. Require both exact serialized values and owner.
  if (name === 'telephone' && value.linktype === 'external' &&
    value.url === expected && value.href === `http://${expected}`) {
    return { ...field, value: { ...value, href: expected } };
  }
  return allianzLinkField(field, false);
}
