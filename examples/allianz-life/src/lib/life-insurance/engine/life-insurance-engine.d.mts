export type LifeFieldName = 'currentAge' | 'currentAnnualIncome' | 'hasPartner' | 'partnerAge' | 'partnerAnnualIncome' | 'partnerRetirementAge' | 'finalExpenses' | 'currentMortgageBalance' | 'debts' | 'desiredAnnualIncome' | 'yearsIncomeNeeded' | 'collegeCosts' | 'inflationRate' | 'investmentAssets' | 'returnRate' | 'currentLifeInsurance' | 'socialSecuritySurvivorBenefit';
export type RawLifeInputs = Partial<Record<LifeFieldName, string | number | undefined>>;
export type LifeInputValues = Record<LifeFieldName, string | number | undefined>;
export type NormalizedLifeInputs = Record<Exclude<LifeFieldName, 'hasPartner'>, number> & { hasPartner: unknown };
export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<LifeFieldName, string>>;
  inputs: NormalizedLifeInputs;
  schemaValid: boolean;
  schemaErrors: Partial<Record<LifeFieldName, string>>;
}
export interface ProjectionRow {
  year: number;
  partnerAge: number;
  partnerAnnualIncome: number;
  desiredAnnualIncome: number;
  annualShortfall: number;
  annualAvailableResources: number;
  annualInsuranceNeeded: number;
}
export interface CalculationResult extends ValidationResult {
  projections: ProjectionRow[];
  summary: Record<string, number> | null;
  sourceSummaryValid: boolean;
  warnings: string[];
  trace?: Record<string, unknown>;
}
export const SOURCE_BUNDLE_SHA256: string;
export const SOURCE_BUNDLE_VERSION: string;
export const SOURCE_PIPELINE: readonly string[];
export const LIFE_INSURANCE_FIELD_NAMES: readonly LifeFieldName[];
export const LIFE_INSURANCE_STAGES: readonly { title: string; fields: readonly LifeFieldName[] }[];
export const LIFE_INSURANCE_FIELD_SCHEMA: Readonly<Record<LifeFieldName, { name: LifeFieldName; type: string; required: true; minimum?: number; maximum?: number; default?: string; uiOptions?: readonly string[] }>>;
export function createLifeInsuranceInputs(): Record<LifeFieldName, string | undefined>;
export function normalizeLifeInsuranceInputs(raw?: RawLifeInputs): NormalizedLifeInputs;
export function updateLifeInsuranceField(raw: LifeInputValues, name: LifeFieldName, value: string | number | undefined): LifeInputValues;
export function updateLifeInsuranceField(raw: RawLifeInputs, name: LifeFieldName, value: string | number | undefined): RawLifeInputs;
export const updateSourceIncome: typeof updateLifeInsuranceField;
export function validateLifeInsuranceInputs(raw?: RawLifeInputs, options?: { stageIndex?: number }): ValidationResult;
export function runSourceLifeInsurancePipeline(inputs: NormalizedLifeInputs, options?: { includeTrace?: boolean }): Pick<CalculationResult, 'projections' | 'summary' | 'trace'>;
export function sourceSummaryIsValid(summary: Record<string, number> | null): boolean;
export function calculateLifeInsurance(raw?: RawLifeInputs, options?: { includeTrace?: boolean }): CalculationResult;
export { formatCurrency as formatLifeCurrency, formatPercent as formatLifePercent } from './formatting/source-numeral-formatters.mjs';
