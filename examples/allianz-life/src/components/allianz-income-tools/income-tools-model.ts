/** Simplified, fictional sample math. Not product formulas, current rates or advice. */
export interface Assumptions {
  capPct: number;
  bufferPct: number;
  floorPct: number;
  triggerPct: number;
  participationPct: number;
}

export type StrategyId =
  | 'performance-1' | 'performance-3' | 'performance-6'
  | 'precision' | 'guard' | 'protection-cap' | 'protection-trigger';

export type StrategyRule =
  | 'buffer-cap' | 'buffer-trigger' | 'floor-cap' | 'protected-cap' | 'protected-trigger';

export interface StrategyDefinition {
  readonly id: StrategyId;
  readonly name: string;
  readonly termYears: number;
  readonly rule: StrategyRule;
  readonly assumptions: Readonly<Assumptions>;
}

export interface CalculationInput {
  strategyId: StrategyId;
  amount: number;
  indexReturnPct: number;
  allocationPct: number;
  assumptions: Assumptions;
}

export interface CalculationResult {
  creditedReturnPct: number;
  allocatedAmount: number;
  cashAmount: number;
  indexComparisonValue: number;
  illustratedValue: number;
  gainLoss: number;
  ruleDescription: string;
}

function sampleStrategy(
  id: StrategyId, name: string, termYears: number, rule: StrategyRule, assumptions: Assumptions
): StrategyDefinition {
  return Object.freeze({ id, name, termYears, rule, assumptions: Object.freeze({ ...assumptions }) });
}

/** Every number below is an editable fictional sample, not an issued product rate. */
export const STRATEGIES: readonly StrategyDefinition[] = Object.freeze([
  sampleStrategy('performance-1', 'Index Performance Strategy 1-Year Term', 1, 'buffer-cap',
    { capPct: 8, bufferPct: 10, floorPct: -100, triggerPct: 0, participationPct: 100 }),
  sampleStrategy('performance-3', 'Index Performance Strategy 3-Year Term', 3, 'buffer-cap',
    { capPct: 18, bufferPct: 15, floorPct: -100, triggerPct: 0, participationPct: 110 }),
  sampleStrategy('performance-6', 'Index Performance Strategy 6-Year Term', 6, 'buffer-cap',
    { capPct: 30, bufferPct: 20, floorPct: -100, triggerPct: 0, participationPct: 120 }),
  sampleStrategy('precision', 'Index Precision Strategy', 1, 'buffer-trigger',
    { capPct: 0, bufferPct: 10, floorPct: -100, triggerPct: 7, participationPct: 100 }),
  sampleStrategy('guard', 'Index Guard Strategy', 1, 'floor-cap',
    { capPct: 7, bufferPct: 0, floorPct: -10, triggerPct: 0, participationPct: 100 }),
  sampleStrategy('protection-cap', 'Index Protection Strategy with cap', 1, 'protected-cap',
    { capPct: 5, bufferPct: 0, floorPct: 0, triggerPct: 0, participationPct: 100 }),
  sampleStrategy('protection-trigger', 'Index Protection Strategy with trigger', 1, 'protected-trigger',
    { capPct: 0, bufferPct: 0, floorPct: 0, triggerPct: 4, participationPct: 100 }),
]);

const ASSUMPTION_RANGES: readonly [keyof Assumptions, number, number][] = [
  ['capPct', 0, 100], ['bufferPct', 0, 100], ['floorPct', -100, 0],
  ['triggerPct', 0, 100], ['participationPct', 0, 300],
];

function within(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** Flat keys let the UI associate errors with its individual sample input controls. */
export function validateCalculation(input: CalculationInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!STRATEGIES.some((strategy) => strategy.id === input?.strategyId)) {
    errors.strategyId = 'Choose a listed sample strategy.';
  }
  if (!within(input?.amount, 0, 10_000_000)) {
    errors.amount = 'Enter a finite sample amount from 0 to 10,000,000.';
  }
  if (!within(input?.indexReturnPct, -100, 1000)) {
    errors.indexReturnPct = 'Enter a finite total-term index return from -100% to 1,000%.';
  }
  if (!within(input?.allocationPct, 0, 100)) {
    errors.allocationPct = 'Enter a finite sample allocation from 0% to 100%.';
  }
  for (const [key, min, max] of ASSUMPTION_RANGES) {
    if (!within(input?.assumptions?.[key], min, max)) {
      errors[key] = `Enter a finite sample percentage from ${min}% to ${max}%.`;
    }
  }
  return errors;
}

function displayPct(value: number): string {
  return `${Number(value.toFixed(6))}%`;
}

function sampleReturn(rule: StrategyRule, indexReturnPct: number, assumptions: Assumptions) {
  const { capPct, bufferPct, floorPct, triggerPct, participationPct } = assumptions;
  if (indexReturnPct === 0) {
    return { creditedReturnPct: 0, math: 'a zero index return gives a zero sample credit; no trigger applies' };
  }
  if (indexReturnPct > 0) {
    if (rule === 'buffer-trigger' || rule === 'protected-trigger') {
      return { creditedReturnPct: triggerPct,
        math: `a positive index return gives the fixed sample trigger of ${displayPct(triggerPct)}` };
    }
    const creditedReturnPct = Math.min(indexReturnPct * participationPct / 100, capPct);
    return { creditedReturnPct,
      math: `min(${displayPct(indexReturnPct)} × ${Number((participationPct / 100).toFixed(8))}, ${displayPct(capPct)}) = ${displayPct(creditedReturnPct)}` };
  }
  if (rule === 'buffer-cap' || rule === 'buffer-trigger') {
    const creditedReturnPct = Math.max(Math.min(indexReturnPct + bufferPct, 0), -100);
    return { creditedReturnPct,
      math: `max(min(${displayPct(indexReturnPct)} + ${displayPct(bufferPct)}, 0%), -100%) = ${displayPct(creditedReturnPct)}` };
  }
  if (rule === 'floor-cap') {
    const creditedReturnPct = Math.max(indexReturnPct, floorPct);
    return { creditedReturnPct,
      math: `max(${displayPct(indexReturnPct)}, ${displayPct(floorPct)}) = ${displayPct(creditedReturnPct)}` };
  }
  return { creditedReturnPct: 0, math: 'a negative index return gives a zero sample credit for this protected rule' };
}

/** One total-term illustration. Term labels never annualize or compound these returns. */
export function calculateIllustration(input: CalculationInput): CalculationResult {
  const errors = validateCalculation(input);
  if (Object.keys(errors).length) {
    throw new RangeError(`Invalid sample illustration: ${Object.keys(errors).join(', ')}.`);
  }
  const strategy = STRATEGIES.find((entry) => entry.id === input.strategyId);
  if (!strategy) throw new RangeError('Choose a listed sample strategy.');
  const { creditedReturnPct, math } = sampleReturn(strategy.rule, input.indexReturnPct, input.assumptions);
  const allocatedAmount = input.amount * input.allocationPct / 100;
  const cashAmount = input.amount - allocatedAmount;
  const illustratedValue = allocatedAmount * (1 + creditedReturnPct / 100) + cashAmount;
  const indexComparisonValue = allocatedAmount * (1 + input.indexReturnPct / 100) + cashAmount;
  return {
    creditedReturnPct, allocatedAmount, cashAmount, indexComparisonValue, illustratedValue,
    gainLoss: illustratedValue - input.amount,
    ruleDescription: `Sample total-term math only: ${math}. Apply it to ${displayPct(input.allocationPct)} of the sample amount; remaining cash is unchanged. No annualization or compounding.`,
  };
}

/** Filters the seven fictional sample rows without changing the catalogue or its defaults. */
export function filterSampleRates(
  strategyId: 'all' | StrategyId, termYears: 'all' | number
): typeof STRATEGIES {
  return STRATEGIES.filter((entry) => (strategyId === 'all' || entry.id === strategyId) &&
    (termYears === 'all' || entry.termYears === termYears));
}
