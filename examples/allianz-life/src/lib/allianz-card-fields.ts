import type { ContentEntry, NavigationItem } from './allianz-fields';

export interface NativeCardField {
  name?: string;
  jsonValue?: unknown;
}

export type NativeCardEntry = ContentEntry & {
  fieldCollection?: NativeCardField[] | null;
};

const CARD_FIELDS = new Map([
  'heading', 'subheading', 'body', 'image', 'icon', 'iconTheme',
  'link', 'theme', 'headingLevel', 'alphanumeral',
].map((name) => [name.toLowerCase(), name]));

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

/** Keep the SDK field object, including empty values and editing metadata. */
function queryField(value: unknown) {
  return object(value) && Object.hasOwn(value, 'jsonValue')
    ? value
    : { jsonValue: value };
}

function navigationItems(value: unknown): NavigationItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry) => {
    if (!object(entry) || typeof entry.id !== 'string') return [];
    const nativeFields = object(entry.fields) ? entry.fields : {};
    const result: Record<string, unknown> = { ...entry };
    for (const [name, field] of Object.entries(nativeFields)) {
      const canonical = name.toLowerCase();
      if (['title', 'link', 'icon'].includes(canonical) && !Object.hasOwn(result, canonical)) {
        result[canonical] = queryField(field);
      }
    }
    return [result as unknown as NavigationItem];
  });
}

/** Project native Item.fields into the same SDK wrappers as named query fields. */
export function allianzCardFields(card: NativeCardEntry): ContentEntry {
  if (!Array.isArray(card.fieldCollection)) return card;
  const result: Record<string, unknown> = { ...card };
  for (const field of card.fieldCollection) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const canonical = CARD_FIELDS.get(field.name.toLowerCase());
    if (canonical && !Object.hasOwn(result, canonical)) {
      result[canonical] = { jsonValue: field.jsonValue };
    } else if (field.name.toLowerCase() === 'links' && !Object.hasOwn(result, 'links')) {
      const targetItems = navigationItems(field.jsonValue);
      if (targetItems) result.links = { targetItems };
    }
  }
  return result as unknown as ContentEntry;
}
