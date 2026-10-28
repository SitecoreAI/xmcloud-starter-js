/** Private form state only. Validation, prefills and financial results are injected source adapters. */
export const STAGE_FIELDS = [
  ['currentAge', 'currentAnnualIncome', 'hasPartner', 'partnerAge', 'partnerAnnualIncome', 'partnerRetirementAge'],
  ['finalExpenses', 'currentMortgageBalance', 'debts'],
  ['desiredAnnualIncome', 'yearsIncomeNeeded', 'collegeCosts'],
  ['inflationRate', 'investmentAssets', 'returnRate', 'currentLifeInsurance', 'socialSecuritySurvivorBenefit'],
  [],
] as const;

export type LifeField = typeof STAGE_FIELDS[number][number];
export type RawLifeValues = Record<LifeField, string | number | undefined>;
export type LifeErrors = Partial<Record<LifeField, string>>;
export type LifeFocus = { kind: 'field'; field: LifeField } | { kind: 'stage' };
export type ValidationResult = { valid: boolean; errors: LifeErrors; inputs?: unknown };
export type CalculationResult = { valid: boolean; errors: LifeErrors; sourceSummaryValid: boolean; summary: Record<string, number> | null; projections: unknown[]; warnings?: string[] };
export type LifeSourceAdapter = {
  validateLifeInsuranceInputs: (values: RawLifeValues, options: { stageIndex: number }) => ValidationResult;
  calculateLifeInsurance: (values: RawLifeValues) => CalculationResult;
  /** Exact source income-change orchestration; never inferred by the UI. */
  updateSourceIncome?: (values: RawLifeValues, name: LifeField, value: string) => RawLifeValues;
};

export interface LifeUiState {
  step: number;
  values: RawLifeValues;
  touched: Partial<Record<LifeField, true>>;
  result: CalculationResult | null;
  focus: LifeFocus | null;
  focusVersion: number;
}

const PARTNER_FIELDS: readonly LifeField[] = ['partnerAge', 'partnerAnnualIncome', 'partnerRetirementAge'];

export function initialLifeValues(): RawLifeValues {
  return Object.fromEntries(STAGE_FIELDS.flat().map((name) => [name, name === 'hasPartner' ? 'yes' : undefined])) as RawLifeValues;
}

export function initialLifeUiState(): LifeUiState {
  return { step: 0, values: initialLifeValues(), touched: {}, result: null, focus: null, focusVersion: 0 };
}

export function visibleStageFields(state: Pick<LifeUiState, 'step' | 'values'>): LifeField[] {
  return [...STAGE_FIELDS[state.step as 0 | 1 | 2 | 3 | 4]].filter((name) =>
    state.values.hasPartner !== 'no' || !PARTNER_FIELDS.includes(name));
}

export function stageErrors(state: LifeUiState, source: LifeSourceAdapter): LifeErrors {
  if (state.step === 4) return {};
  const errors = source.validateLifeInsuranceInputs(state.values, { stageIndex: state.step }).errors;
  return Object.fromEntries(visibleStageFields(state).filter((name) => errors[name]).map((name) => [name, errors[name]]));
}

export type LifeAction =
  | { type: 'change'; name: LifeField; value: string }
  | { type: 'blur'; name: LifeField }
  | { type: 'next' }
  | { type: 'jump'; step: number };

export function reduceLifeUi(state: LifeUiState, action: LifeAction, source: LifeSourceAdapter): LifeUiState {
  if (action.type === 'change') {
    const values = source.updateSourceIncome
      ? source.updateSourceIncome(state.values, action.name, action.value)
      : { ...state.values, [action.name]: action.value };
    return { ...state, values, result: null, focus: null };
  }
  if (action.type === 'blur') return { ...state, touched: { ...state.touched, [action.name]: true }, focus: null };
  if (action.type === 'jump') {
    if (!Number.isInteger(action.step) || action.step < 0 || action.step > 4) return state;
    return { ...state, step: action.step, result: action.step === 4 ? source.calculateLifeInsurance(state.values) : null,
      focus: { kind: 'stage' }, focusVersion: state.focusVersion + 1 };
  }
  if (state.step === 4) return state;
  const errors = stageErrors(state, source);
  const invalid = visibleStageFields(state).find((name) => errors[name]);
  if (invalid) return {
    ...state,
    touched: { ...state.touched, ...Object.fromEntries(visibleStageFields(state).map((name) => [name, true])) },
    focus: { kind: 'field', field: invalid }, focusVersion: state.focusVersion + 1,
  };
  if (state.step === 3) {
    const result = source.calculateLifeInsurance(state.values);
    return { ...state, result, step: 4, focus: { kind: 'stage' }, focusVersion: state.focusVersion + 1 };
  }
  return { ...state, step: state.step + 1, focus: { kind: 'stage' }, focusVersion: state.focusVersion + 1 };
}
