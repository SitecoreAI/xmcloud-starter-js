import type { ProductOfferingEntry } from 'components/product-offerings/product-offerings.props';

const purposeFields = new Map([
  ['title', 'title'], ['text', 'text'], ['icon', 'icon'], ['link', 'link'],
]);

/** Project only native purpose names, preserving complete SDK field objects. */
export function productOfferingFields(entry: ProductOfferingEntry): ProductOfferingEntry {
  if (!Array.isArray(entry.fieldCollection)) return entry;
  const result: Record<string, unknown> = { ...entry };
  for (const field of entry.fieldCollection) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const name = purposeFields.get(field.name.toLowerCase());
    // A direct native field is authoritative even when explicitly cleared.
    if (name && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
  }
  return result as unknown as ProductOfferingEntry;
}
