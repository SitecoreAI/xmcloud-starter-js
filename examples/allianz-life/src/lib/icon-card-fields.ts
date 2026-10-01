import type { IconCardEntry } from 'components/icon-cards/icon-cards.props';

const nativeNames = new Map([
  ['title', 'title'], ['text', 'text'], ['icon', 'icon'],
]);
const sourceNames = new Map([
  ['heading', 'title'], ['body', 'text'],
]);

/** Project only this purpose's fields, retaining each complete SDK object. */
export function iconCardFields(card: IconCardEntry): IconCardEntry {
  if (!Array.isArray(card.fieldCollection) && !Object.hasOwn(card, 'heading') &&
    !Object.hasOwn(card, 'body')) return card;
  const result: Record<string, unknown> = { ...card };
  const collection = Array.isArray(card.fieldCollection) ? card.fieldCollection : [];
  const project = (names: Map<string, string>) => {
    for (const field of collection) {
      if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
      const name = names.get(field.name.toLowerCase());
      if (name && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
    }
  };
  // Canonical native names win over historical aliases, including cleared fields.
  project(nativeNames);
  for (const [source, name] of sourceNames) {
    if (!Object.hasOwn(result, name) && Object.hasOwn(card, source)) {
      result[name] = card[source as 'heading' | 'body'];
    }
  }
  // A named historical field also wins over the same field in a collection.
  project(sourceNames);
  return result as unknown as IconCardEntry;
}
