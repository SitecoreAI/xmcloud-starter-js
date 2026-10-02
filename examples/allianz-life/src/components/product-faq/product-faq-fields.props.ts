import type { ProductFaqEntry } from './product-faq.props';

const canonicalNames = new Map([['question', 'question'], ['answer', 'answer']]);
const historicalNames = new Map([['heading', 'question'], ['body', 'answer']]);

/** Preserve SDK objects and explicit clears; never rebuild fields from strings. */
export function productFaqFields(entry: ProductFaqEntry): ProductFaqEntry {
  const result: Record<string, unknown> = { ...entry };
  const collection = Array.isArray(entry.fieldCollection) ? entry.fieldCollection : [];
  const project = (names: Map<string, string>) => {
    for (const field of collection) {
      if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
      const name = names.get(field.name.toLowerCase());
      if (name && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
    }
  };
  project(canonicalNames);
  for (const [historical, canonical] of historicalNames) {
    if (!Object.hasOwn(result, canonical) && Object.hasOwn(entry, historical)) {
      result[canonical] = entry[historical as 'heading' | 'body'];
    }
  }
  project(historicalNames);
  return result as unknown as ProductFaqEntry;
}
