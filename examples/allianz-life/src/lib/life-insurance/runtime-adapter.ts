import { calculateLifeInsurance, validateLifeInsuranceInputs, updateLifeInsuranceField } from './engine/life-insurance-engine.mjs';
import { formatCurrency } from './engine/formatting/source-numeral-formatters.mjs';
import type { LifeSourceAdapter } from './ui/life-ui-model';

/** Stable, local-only source adapters. No endpoint, persistence or analytics adapter is installed. */
export const lifeInsuranceSource: LifeSourceAdapter = {
  calculateLifeInsurance,
  validateLifeInsuranceInputs,
  updateSourceIncome: updateLifeInsuranceField,
};

export const formatLifeInsuranceSummaryValue = (value: number): string => String(formatCurrency(value));
export { lifeUiCopy as lifeInsuranceCopy } from './ui/ui-copy';
