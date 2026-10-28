/**
 * Private source-faithful Life Insurance adapter. Not a released calculator.
 * The arithmetic lives in exact dependency-closed source slices; see provenance.
 * UI normalization follows source pq.setInput/handleSubmit: parseFloat numeric
 * fields, retain hasPartner. No rounding is applied to intermediate results.
 */
import { SourceCoverageEngine } from './source-engine-exact.mjs';
import { formatCurrency, formatPercent } from './formatting/source-numeral-formatters.mjs';
export { formatCurrency as formatLifeCurrency, formatPercent as formatLifePercent } from './formatting/source-numeral-formatters.mjs';

export const SOURCE_BUNDLE_SHA256 = '75aa6f4d5c0dd662839844b490f99ab1534a24c8330f81b1c5cfd31a9d7371d7';
export const SOURCE_BUNDLE_VERSION = '0.7.2/v14';

const currencyFields = new Set([
  'currentAnnualIncome', 'partnerAnnualIncome', 'finalExpenses',
  'currentMortgageBalance', 'debts', 'desiredAnnualIncome', 'collegeCosts',
  'investmentAssets', 'currentLifeInsurance', 'socialSecuritySurvivorBenefit',
]);
const percentFields = new Set(['inflationRate', 'returnRate']);
export const LIFE_INSURANCE_STAGES = Object.freeze([
  Object.freeze({ title: 'About you', fields: Object.freeze(['currentAge', 'currentAnnualIncome', 'hasPartner', 'partnerAge', 'partnerAnnualIncome', 'partnerRetirementAge']) }),
  Object.freeze({ title: 'One-time costs', fields: Object.freeze(['finalExpenses', 'currentMortgageBalance', 'debts']) }),
  Object.freeze({ title: 'Long-term income needs', fields: Object.freeze(['desiredAnnualIncome', 'yearsIncomeNeeded', 'collegeCosts']) }),
  Object.freeze({ title: 'Available assets', fields: Object.freeze(['inflationRate', 'investmentAssets', 'returnRate', 'currentLifeInsurance', 'socialSecuritySurvivorBenefit']) }),
  Object.freeze({ title: 'Summary', fields: Object.freeze([]) }),
]);
export const LIFE_INSURANCE_FIELD_NAMES = Object.freeze(LIFE_INSURANCE_STAGES.flatMap(stage => stage.fields));
export const LIFE_INSURANCE_FIELD_SCHEMA = Object.freeze(Object.fromEntries(LIFE_INSURANCE_FIELD_NAMES.map(name => [name,
  Object.freeze(name === 'hasPartner'
    ? { name, type: 'yes/no', required: true, default: 'yes', uiOptions: Object.freeze(['yes', 'no']) }
    : { name, type: currencyFields.has(name) ? 'currency' : percentFields.has(name) ? 'percent' : 'number', required: true,
      minimum: percentFields.has(name) ? -12 : 0, maximum: currencyFields.has(name) ? 999999999 : percentFields.has(name) ? 12 : 100 }),
])));

const partnerFields = new Set(['partnerAge', 'partnerAnnualIncome', 'partnerRetirementAge']);
const sourceErrorLabels = Object.freeze({
  currentAge: 'Current age', currentAnnualIncome: 'Current annual income',
  partnerAge: 'Spouse or partner age income', partnerAnnualIncome: 'Spouse or partner annual income',
  partnerRetirementAge: 'Spouse or partner desired retirement age', finalExpenses: 'Final expenses',
  currentMortgageBalance: 'Current mortage balance', debts: 'Debts and obligations',
  desiredAnnualIncome: 'Desired annual income', yearsIncomeNeeded: 'Years income will be needed',
  collegeCosts: 'College costs', inflationRate: 'Inflation rate', investmentAssets: 'Investment assets',
  returnRate: 'Return rate', currentLifeInsurance: 'Life insurance',
  socialSecuritySurvivorBenefit: 'Estimated social security survivor benefit',
});
export const SOURCE_PIPELINE = Object.freeze([
  'iterateYears', 'iteratePartnerAge', 'iterateRows', 'iterateSums',
  'immediateNeeds', 'longTermNeeds', 'totalNeeds',
  'investmentAssetsAndSocialSecurity', 'existingLifeInsurance',
  'totalResources', 'shortfall',
]);

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  return value;
}

/** Exact initial shape established by source Z.inputs()/hF.getDefaultFromShape. */
export function createLifeInsuranceInputs() {
  return Object.fromEntries(LIFE_INSURANCE_FIELD_NAMES.map(name => [name, name === 'hasPartner' ? 'yes' : undefined]));
}

export function normalizeLifeInsuranceInputs(raw = {}) {
  return Object.fromEntries(LIFE_INSURANCE_FIELD_NAMES.map(name => {
    const value = Object.hasOwn(raw, name) ? raw[name] : undefined;
    if (name === 'hasPartner') return [name, value === undefined ? 'yes' : value];
    // Source numeric controls submit canonical numeric text; do not convert an
    // empty value to zero or strip currency/percent characters as a new policy.
    return [name, typeof value === 'string' || typeof value === 'number' ? Number.parseFloat(value) : Number.NaN];
  }));
}

/** Source-derived income onChange prefill, offsets 1598221 and 1600129. */
export function updateLifeInsuranceField(raw, name, value) {
  if (!LIFE_INSURANCE_FIELD_NAMES.includes(name)) throw new TypeError(`Unknown source input: ${name}`);
  const next = { ...raw, [name]: value };
  if (name === 'currentAnnualIncome' || name === 'partnerAnnualIncome') {
    const otherName = name === 'currentAnnualIncome' ? 'partnerAnnualIncome' : 'currentAnnualIncome';
    const suggestion = (Number.parseFloat(raw[otherName]) + Number.parseFloat(value)) * 0.75;
    if (!Number.isNaN(suggestion)) next.desiredAnnualIncome = suggestion;
  }
  return next;
}
export const updateSourceIncome = updateLifeInsuranceField;

function formatSourceBound(name, value) {
  // Preserve the exact source callbacks, including currency formatting for
  // partnerRetirementAge and ratio-percent formatting for the two rate bounds.
  if (currencyFields.has(name) || name === 'partnerRetirementAge') return formatCurrency(value);
  if (percentFields.has(name)) return formatPercent(value);
  return value;
}

function sourceSchemaErrors(inputs) {
  const errors = {};
  for (const name of LIFE_INSURANCE_FIELD_NAMES) {
    const field = LIFE_INSURANCE_FIELD_SCHEMA[name], value = inputs[name];
    if (name === 'hasPartner') {
      // Literal source Yup string schema is required/default yes, without oneOf.
      // UI radio-domain checking below remains separately identified.
      if (value === undefined || value === null || value === '') errors[name] = `${name} is a required field`;
      continue;
    }
    if (Number.isNaN(value)) errors[name] = `${name} must be a number`;
    else if (value < field.minimum) errors[name] = `${sourceErrorLabels[name]} must be greater than or equal to ${formatSourceBound(name, field.minimum)}.`;
    else if (value > field.maximum) errors[name] = `${sourceErrorLabels[name]} must be less than or equal to ${formatSourceBound(name, field.maximum)}.`;
  }
  return errors;
}

/**
 * Bounded numeric-schema adapter, not a wholesale implementation of Yup's cast
 * messages. schemaErrors preserves all 17 required fields. errors selects the
 * visible stage fields, so hidden partner requirements cannot silently vanish
 * from diagnostics. Source menu navigation itself is not gated by this helper.
 */
export function validateLifeInsuranceInputs(raw = {}, { stageIndex } = {}) {
  const inputs = normalizeLifeInsuranceInputs(raw), schemaErrors = sourceSchemaErrors(inputs);
  const selected = stageIndex === undefined ? LIFE_INSURANCE_FIELD_NAMES : LIFE_INSURANCE_STAGES[stageIndex]?.fields;
  if (!selected) throw new RangeError('Unknown source stage');
  const visible = selected.filter(name => inputs.hasPartner !== 'no' || !partnerFields.has(name));
  const errors = Object.fromEntries(visible.filter(name => schemaErrors[name]).map(name => [name, schemaErrors[name]]));
  if (visible.includes('hasPartner') && inputs.hasPartner !== 'yes' && inputs.hasPartner !== 'no') errors.hasPartner = 'Choose Yes or No';
  return { valid: Object.keys(errors).length === 0, errors, inputs, schemaValid: Object.keys(schemaErrors).length === 0, schemaErrors };
}

/** Use only normalized source-domain inputs here; exposes intermediate evidence. */
export function runSourceLifeInsurancePipeline(inputs, { includeTrace = false } = {}) {
  const engine = new SourceCoverageEngine({ ...inputs }), trace = {}, projections = [];
  for (const method of SOURCE_PIPELINE) {
    engine[method]();
    if (method === 'iterateRows' && Array.isArray(engine.value)) projections.push(...cloneValue(engine.value));
    if (includeTrace) trace[method] = cloneValue(engine.value);
  }
  return { projections, summary: cloneValue(engine.value), ...(includeTrace ? { trace } : {}) };
}

export function sourceSummaryIsValid(summary) {
  return !!summary && Object.values(summary).length > 0 && Object.values(summary).every(value => !Number.isNaN(value));
}

export function calculateLifeInsurance(raw = {}, { includeTrace = false } = {}) {
  const validation = validateLifeInsuranceInputs(raw), warnings = [];
  const horizon = validation.inputs.yearsIncomeNeeded;
  // Avoid allocating an unbounded array for values rejected by the source schema.
  // No supported-domain calculation or financial formula is changed by this guard.
  if (Number.isFinite(horizon) && (horizon < 0 || horizon > 100)) {
    return { ...validation, projections: [], summary: null, sourceSummaryValid: false, warnings: ['Projection horizon is outside the source schema; calculation was not allocated.'] };
  }
  const result = runSourceLifeInsurancePipeline(validation.inputs, { includeTrace });
  const sourceSummaryValid = sourceSummaryIsValid(result.summary);
  if (!sourceSummaryValid) warnings.push('Exact source computation produced an empty or NaN summary; do not substitute financial results.');
  return { ...validation, ...result, sourceSummaryValid, warnings };
}
