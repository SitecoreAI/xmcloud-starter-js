import contracts from './source-contracts.json' with { type: 'json' };
import { compute } from './source-retirement-engine.mjs';
import { taxablePortfolioFutureValue, taxDeferredPortfolioFutureValue } from './source-tax-deferral-engine.mjs';
import { sourceValidate } from './source-validation.mjs';
import { sourceNumeral } from './source-currency.mjs';

export const retirementDefaults = Object.freeze(Object.fromEntries(
  Object.entries(contracts.retirement.defaultInputs).map(([name, field]) => [name, field.value]),
));
export const taxDeferralDefaults = Object.freeze(Object.fromEntries(
  Object.entries(contracts.taxDeferral.defaultInputs).map(([name, field]) => [name, field.value]),
));

export const RETIREMENT_FIELDS = Object.freeze([
  { name: 'principal', label: 'Enter the amount you like to withdraw each month', placeholder: '', footnote: '1' },
  { name: 'interest', label: 'Enter the assumed average annual rate of return', placeholder: '', footnote: '2' },
  { name: 'payments', label: 'Enter the number of years you would like to make the monthly withdrawals', placeholder: '' },
]);
export const TAX_DEFERRAL_FIELDS = Object.freeze([
  { name: 'principle', label: 'Amount invested (on a pre-tax basis)', placeholder: 'Enter amount invested' },
  { name: 'interestRate', label: 'Expected annual rate of return', placeholder: 'Enter annual rate of return' },
  { name: 'investmentYears', label: 'Number of years invested', placeholder: 'Enter number of years invested' },
]);
export const TAX_RATES = Object.freeze(['10', '12', '22', '24', '32', '35', '37']);

function firstErrors(values, constraints) {
  const errors = sourceValidate(values, constraints);
  return Object.fromEntries(Object.entries(errors ?? {}).map(([name, messages]) => [name, messages[0]]));
}

/** The original Validate.js constraints/messages, including their source quirks. */
export function validateRetirementInputs(values) {
  return firstErrors(values, contracts.retirement.validationConstraints);
}

export function validateTaxDeferralInputs(values) {
  return firstErrors(values, contracts.taxDeferral.validationConstraints);
}

/** Source formatter uses Numeral 2.0.6, not Intl or a new rounding implementation. */
export function formatToolCurrency(value) {
  try {
    return sourceNumeral(value).format('$0,0.00');
  } catch {
    return String(value);
  }
}

// The source has no upper retirement horizon. This bounds work, not financial inputs.
export const MAX_SOURCE_ITERATIONS = 1_000_000;
export class UnsupportedToolExecutionError extends RangeError {
  constructor() {
    super('The requested calculation exceeds the supported execution budget.');
    this.name = 'UnsupportedToolExecutionError';
  }
}

function assertExecutionBudget(periods) {
  if (periods > MAX_SOURCE_ITERATIONS) throw new UnsupportedToolExecutionError();
}

/** Retirement's original getter forwards raw strings and lets the source coerce them. */
export function calculateRetirementIncome(values) {
  assertExecutionBudget(Number(values.payments) * 12);
  return formatToolCurrency(compute(values.principal, values.interest, values.payments));
}

/** Tax's original getter applies parseFloat to all four values before calculation. */
export function calculateTaxDeferral(values) {
  const args = ['principle', 'interestRate', 'investmentYears', 'marginalTaxRate']
    .map((name) => parseFloat(values[name]));
  assertExecutionBudget(args[2]);
  return {
    taxablePortfolioFutureValue: formatToolCurrency(taxablePortfolioFutureValue(...args)),
    taxDeferredPortfolioFutureValue: formatToolCurrency(taxDeferredPortfolioFutureValue(...args)),
  };
}
