import type { ProductTypeChoiceEntry } from './product-type-choices.props';

const purposeFields = ['heading', 'body', 'image', 'link'] as const;

/** Select purpose fields without cloning or replacing their SDK jsonValue. */
export function productTypeChoiceFields(entry: ProductTypeChoiceEntry): ProductTypeChoiceEntry {
  const result: Record<string, unknown> = { ...entry };
  if (Array.isArray(entry.fieldCollection)) {
    for (const field of entry.fieldCollection) {
      if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
      const name = purposeFields.find((purpose) => purpose === field.name?.toLowerCase());
      // Explicit canonical clearing must not resurrect compact historical data.
      if (name && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
    }
  }
  return result as unknown as ProductTypeChoiceEntry;
}
