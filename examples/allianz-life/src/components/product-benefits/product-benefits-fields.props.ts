import type { ProductBenefitEntry } from './product-benefits.props';

const purposeFields = ['heading', 'body', 'icon'] as const;

/** Preserve the SDK jsonValue object, including native editing metadata. */
export function productBenefitFields(entry: ProductBenefitEntry): ProductBenefitEntry {
  const result: Record<string, unknown> = { ...entry };
  if (Array.isArray(entry.fieldCollection)) {
    for (const field of entry.fieldCollection) {
      if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
      const name = purposeFields.find((purpose) => purpose === field.name?.toLowerCase());
      // An explicitly cleared canonical field wins over a compact field value.
      if (name && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
    }
  }
  return result as unknown as ProductBenefitEntry;
}
