export interface RetirementInputs {
  principal: string;
  interest: string;
  payments: string;
}
export interface TaxDeferralInputs {
  principle: string;
  interestRate: string;
  investmentYears: string;
  marginalTaxRate: string;
}
export interface ToolField {
  name: string;
  label: string;
  placeholder: string;
  footnote?: string;
}
export const retirementDefaults: Readonly<RetirementInputs>;
export const taxDeferralDefaults: Readonly<TaxDeferralInputs>;
export const RETIREMENT_FIELDS: readonly ToolField[];
export const TAX_DEFERRAL_FIELDS: readonly ToolField[];
export const TAX_RATES: readonly string[];
export function validateRetirementInputs(values: RetirementInputs): Partial<Record<keyof RetirementInputs, string>>;
export function validateTaxDeferralInputs(values: TaxDeferralInputs): Partial<Record<keyof TaxDeferralInputs, string>>;
export function calculateRetirementIncome(values: RetirementInputs): string;
export function calculateTaxDeferral(values: TaxDeferralInputs): {
  taxablePortfolioFutureValue: string;
  taxDeferredPortfolioFutureValue: string;
};
export function formatToolCurrency(value: number | string): string;
export const MAX_SOURCE_ITERATIONS: number;
export class UnsupportedToolExecutionError extends RangeError {}
