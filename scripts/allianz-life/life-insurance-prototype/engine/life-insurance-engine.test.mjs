import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import {
  SOURCE_BUNDLE_SHA256, SOURCE_PIPELINE, LIFE_INSURANCE_FIELD_NAMES,
  LIFE_INSURANCE_FIELD_SCHEMA, LIFE_INSURANCE_STAGES,
  createLifeInsuranceInputs, normalizeLifeInsuranceInputs,
  updateLifeInsuranceField, validateLifeInsuranceInputs,
  calculateLifeInsurance, runSourceLifeInsurancePipeline, sourceSummaryIsValid,
} from './life-insurance-engine.mjs';
import { SourceCoverageEngine as RuntimeEngine, SourceProjectionRow as RuntimeRow } from './source-engine-exact.mjs';

const require = createRequire(import.meta.url);
const { pW: OriginalEngine, pz: OriginalRow } = require('./source-engine-exact.cjs');
const { formatCurrency } = require('./formatting/source-numeral-formatters.cjs');
const cases = JSON.parse(fs.readFileSync(new URL('../reference/official-browser-cases.json', import.meta.url)));
const baseline = Object.freeze(normalizeLifeInsuranceInputs(cases.cases[0].inputs));
const clone = value => structuredClone(value);

function oracle(inputs) {
  const engine = new OriginalEngine({ ...inputs }), trace = {};
  let projections;
  for (const method of SOURCE_PIPELINE) {
    engine[method]();
    trace[method] = clone(engine.value);
    if (method === 'iterateRows') projections = clone(engine.value);
  }
  return { projections, summary: clone(engine.value), trace };
}

test('private oracle consists only of the two byte-fenced original source declarations', () => {
  const provenance = JSON.parse(fs.readFileSync(new URL('./source-engine-provenance.json', import.meta.url)));
  assert.equal(provenance.bundleSHA256, SOURCE_BUNDLE_SHA256);
  assert.deepEqual(provenance.parts.map(part => part.name), ['pz', 'pW']);
  const lines = fs.readFileSync(new URL('./source-engine-exact.cjs', import.meta.url), 'utf8').split('\n');
  for (const part of provenance.parts) {
    const declaration = lines.find(line => line.startsWith(`var ${part.name}=`)).slice(4, -1);
    assert.equal(crypto.createHash('sha256').update(declaration).digest('hex'), part.sliceSHA256);
  }
  assert.equal(provenance.rawFullBundleStored, false);
  assert.equal(provenance.networkCodeInClosure, false);
});

test('imported browser MJS runtime retains the exact source slices and unmodified callable methods', () => {
  const provenance = JSON.parse(fs.readFileSync(new URL('./source-engine-provenance.json', import.meta.url)));
  assert.equal(provenance.bundleSHA256, SOURCE_BUNDLE_SHA256);
  const runtimeLines = fs.readFileSync(new URL('./source-engine-exact.mjs', import.meta.url), 'utf8').split('\n');
  for (const part of provenance.parts) {
    const matches = runtimeLines.filter(line => line.startsWith(`var ${part.name}=`));
    assert.equal(matches.length, 1, `${part.name}: exactly one runtime declaration`);
    const exactDeclaration = matches[0].slice(4, -1);
    assert.equal(crypto.createHash('sha256').update(exactDeclaration).digest('hex'), part.sliceSHA256, `${part.name}: MJS source slice SHA`);
  }
  // Also inspect the actual imported constructors/prototypes: a later mutation
  // outside the fenced declarations must not leave a passing provenance check.
  for (const [runtime, original] of [[RuntimeEngine, OriginalEngine], [RuntimeRow, OriginalRow]]) {
    assert.equal(runtime.toString(), original.toString());
    const actualDescriptors = Object.getOwnPropertyDescriptors(runtime.prototype);
    const originalDescriptors = Object.getOwnPropertyDescriptors(original.prototype);
    assert.deepEqual(Object.keys(actualDescriptors), Object.keys(originalDescriptors));
    for (const name of Object.keys(originalDescriptors)) {
      for (const callable of ['value', 'get', 'set']) {
        if (typeof originalDescriptors[name][callable] === 'function') {
          assert.equal(actualDescriptors[name][callable]?.toString(), originalDescriptors[name][callable].toString(), `${runtime.name}.${name}.${callable}`);
        }
      }
    }
  }
});

test('all 17 inputs, five stages, and exact documented bounds remain distinct', () => {
  assert.equal(LIFE_INSURANCE_FIELD_NAMES.length, 17);
  assert.equal(new Set(LIFE_INSURANCE_FIELD_NAMES).size, 17);
  assert.equal(LIFE_INSURANCE_STAGES.length, 5);
  assert.equal(LIFE_INSURANCE_FIELD_SCHEMA.currentAge.maximum, 100);
  assert.equal(LIFE_INSURANCE_FIELD_SCHEMA.currentAnnualIncome.maximum, 999999999);
  assert.equal(LIFE_INSURANCE_FIELD_SCHEMA.inflationRate.minimum, -12);
  assert.equal(LIFE_INSURANCE_FIELD_SCHEMA.returnRate.maximum, 12);
});

test('initial fields preserve source blank defaults; numeric empty values never become zero', () => {
  const raw = createLifeInsuranceInputs();
  assert.equal(raw.hasPartner, 'yes');
  assert.ok(LIFE_INSURANCE_FIELD_NAMES.filter(name => name !== 'hasPartner').every(name => raw[name] === undefined));
  assert.ok(Number.isNaN(normalizeLifeInsuranceInputs({ currentAge: '' }).currentAge));
  assert.ok(Number.isNaN(normalizeLifeInsuranceInputs({ currentAnnualIncome: '$100,000.00' }).currentAnnualIncome));
  assert.equal(normalizeLifeInsuranceInputs({ currentAge: '0' }).currentAge, 0);
  assert.equal(normalizeLifeInsuranceInputs({ currentAge: '40' }).currentAge, 40);
  assert.equal(normalizeLifeInsuranceInputs({ currentAge: '40suffix' }).currentAge, 40);
});

test('source-derived income edit prefill updates immediately, retains No branch, and does not mutate raw state', () => {
  const raw = Object.freeze({ ...baseline, hasPartner: 'no' });
  const next = updateLifeInsuranceField(raw, 'currentAnnualIncome', '100000');
  assert.equal(next.desiredAnnualIncome, 131250);
  assert.equal(raw.desiredAnnualIncome, 80000);
  assert.equal(next.partnerAnnualIncome, 75000);
  assert.equal(updateLifeInsuranceField(raw, 'partnerAnnualIncome', '0').desiredAnnualIncome, 75000);
  assert.equal(updateLifeInsuranceField({ ...raw, partnerAnnualIncome: undefined }, 'currentAnnualIncome', '100000').desiredAnnualIncome, 80000);
  assert.equal(updateLifeInsuranceField(raw, 'hasPartner', 'yes').desiredAnnualIncome, 80000);
  assert.throws(() => updateLifeInsuranceField(raw, 'inventedInput', 1), TypeError);
});

test('hidden partner requirements remain in schema diagnostics independently of source Summary guard', () => {
  const input = { ...baseline, hasPartner: 'no', partnerAge: undefined, partnerAnnualIncome: undefined, partnerRetirementAge: undefined };
  const result = calculateLifeInsurance(input);
  assert.equal(result.valid, true);
  assert.equal(result.schemaValid, false);
  assert.deepEqual(Object.keys(result.schemaErrors), ['partnerAge', 'partnerAnnualIncome', 'partnerRetirementAge']);
  assert.equal(result.sourceSummaryValid, true);
  assert.deepEqual(result.summary, calculateLifeInsurance({ ...baseline, hasPartner: 'no' }).summary);
  // Static source/oracle behavior only. Official fresh-No browser case remains unverified.
});

test('source Summary guard is not silently replaced by finite-number/schema checks', () => {
  assert.equal(sourceSummaryIsValid({}), false);
  assert.equal(sourceSummaryIsValid({ shortfall: Number.NaN }), false);
  assert.equal(sourceSummaryIsValid({ shortfall: Number.POSITIVE_INFINITY }), true);
  assert.equal(sourceSummaryIsValid({ shortfall: -0 }), true);
});

for (const reference of cases.cases) {
  test(`independent official browser numeric reference: ${reference.id}`, () => {
    assert.equal(reference.officialBrowserVerified, true);
    const result = calculateLifeInsurance(reference.inputs);
    assert.equal(result.sourceSummaryValid, true);
    for (const [name, expected] of Object.entries(reference.expectedDisplayedTwoDecimals)) {
      const sourceKey = name === 'partnerEarnings' ? 'partnerAnnualIncomeSum' : name;
      assert.equal(formatCurrency(result.summary[sourceKey]).replace(/[$,]/g, ''), expected.toFixed(2), name);
    }
  });
}

const syntheticCases = [
  { name: 'yes baseline', changes: {} },
  { name: 'no baseline', changes: { hasPartner: 'no' } },
  ...[0, 1, 100, 2.5].map(yearsIncomeNeeded => ({ name: `years ${yearsIncomeNeeded}`, changes: { yearsIncomeNeeded } })),
  ...[[0, 0], [2, 2], [-2, -2], [-12, -12], [12, 12], [-12, 12], [12, -12], [0.001, -0.001]].map(([inflationRate, returnRate]) => ({ name: `rates ${inflationRate}/${returnRate}`, changes: { inflationRate, returnRate } })),
  ...[37, 38, 39, 45, 100].map(partnerRetirementAge => ({ name: `retirement ${partnerRetirementAge}`, changes: { partnerRetirementAge } })),
  { name: 'all currencies zero', changes: Object.fromEntries(Object.entries(LIFE_INSURANCE_FIELD_SCHEMA).filter(([, field]) => field.type === 'currency').map(([name]) => [name, 0])) },
  { name: 'all currencies at source maximum', changes: Object.fromEntries(Object.entries(LIFE_INSURANCE_FIELD_SCHEMA).filter(([, field]) => field.type === 'currency').map(([name]) => [name, 999999999])) },
  { name: 'no partner stale maximums', changes: { hasPartner: 'no', partnerAge: 100, partnerAnnualIncome: 999999999, partnerRetirementAge: 0 } },
  { name: 'no partner undefined hidden fields', changes: { hasPartner: 'no', partnerAge: undefined, partnerAnnualIncome: undefined, partnerRetirementAge: undefined } },
  { name: 'age extrema', changes: { currentAge: 0, partnerAge: 100, partnerRetirementAge: 100 } },
  ...Object.entries(LIFE_INSURANCE_FIELD_SCHEMA).filter(([, field]) => field.type === 'currency').map(([name]) => ({ name: `${name} at maximum`, changes: { [name]: 999999999 } })),
];

for (const scenario of syntheticCases) {
  test(`exact extracted-source adapter equivalence at every pipeline stage: ${scenario.name}`, () => {
    const raw = Object.freeze({ ...baseline, ...scenario.changes }), before = clone(raw);
    const normalized = normalizeLifeInsuranceInputs(raw);
    const actual = runSourceLifeInsurancePipeline(normalized, { includeTrace: true });
    assert.deepEqual(actual, oracle(normalized));
    assert.deepEqual(raw, before);
  });
}

test('source zero/fractional projection horizon behavior remains explicit, without fabricated amounts', () => {
  for (const yearsIncomeNeeded of [0, 2.5]) {
    const result = calculateLifeInsurance({ ...baseline, yearsIncomeNeeded });
    assert.equal(result.schemaValid, true);
    assert.equal(result.sourceSummaryValid, false);
    assert.equal(result.projections.length, 0);
    assert.ok(Number.isNaN(result.summary.additionalLifeInsuranceNeeded));
    assert.ok(result.warnings.length > 0);
  }
});

test('source retirement timing and first-year resource behavior are not silently repaired', () => {
  const result = calculateLifeInsurance({ ...baseline, partnerRetirementAge: 37 });
  assert.equal(result.projections[0].partnerAnnualIncome, 75000);
  assert.equal(result.projections[1].partnerAnnualIncome, 0);
  const negative = calculateLifeInsurance({ ...baseline, investmentAssets: 0, currentLifeInsurance: 0 });
  assert.equal(negative.projections[0].annualAvailableResources, -285000);
});

test('No partner math is invariant to retained hidden values, while supported input-schema status stays separate', () => {
  const a = calculateLifeInsurance({ ...baseline, hasPartner: 'no' });
  const b = calculateLifeInsurance({ ...baseline, hasPartner: 'no', partnerAge: 100, partnerAnnualIncome: 999999999, partnerRetirementAge: 0 });
  assert.deepEqual(a.projections, b.projections);
  assert.deepEqual(a.summary, b.summary);
});

test('repeated and Yes-No-Yes calculations are deterministic and cannot retain row state', () => {
  const a = calculateLifeInsurance(baseline);
  calculateLifeInsurance({ ...baseline, hasPartner: 'no', yearsIncomeNeeded: 1 });
  const b = calculateLifeInsurance(baseline);
  assert.deepEqual(a, b);
  a.projections[0].partnerAge = -1;
  assert.equal(calculateLifeInsurance(baseline).projections[0].partnerAge, 38);
});

test('all documented numeric min/max boundaries validate, and each out-of-bound value is rejected', () => {
  for (const [name, field] of Object.entries(LIFE_INSURANCE_FIELD_SCHEMA)) {
    if (name === 'hasPartner') continue;
    assert.equal(validateLifeInsuranceInputs({ ...baseline, [name]: field.minimum }).schemaErrors[name], undefined, `${name} min`);
    assert.equal(validateLifeInsuranceInputs({ ...baseline, [name]: field.maximum }).schemaErrors[name], undefined, `${name} max`);
    assert.ok(validateLifeInsuranceInputs({ ...baseline, [name]: field.minimum - 1 }).schemaErrors[name], `${name} below`);
    assert.ok(validateLifeInsuranceInputs({ ...baseline, [name]: field.maximum + 1 }).schemaErrors[name], `${name} above`);
  }
});

test('custom source min/max validation copy and source formatter quirks remain exact', () => {
  assert.equal(validateLifeInsuranceInputs({ ...baseline, currentAge: -1 }).errors.currentAge, 'Current age must be greater than or equal to 0.');
  assert.equal(validateLifeInsuranceInputs({ ...baseline, currentMortgageBalance: -1 }).errors.currentMortgageBalance, 'Current mortage balance must be greater than or equal to $0.00.');
  assert.equal(validateLifeInsuranceInputs({ ...baseline, partnerRetirementAge: 101 }).errors.partnerRetirementAge, 'Spouse or partner desired retirement age must be less than or equal to $100.00.');
  assert.equal(validateLifeInsuranceInputs({ ...baseline, inflationRate: -13 }).errors.inflationRate, 'Inflation rate must be greater than or equal to -1200.00%.');
});

test('visible-stage validation does not gate source menu navigation or discard global errors', () => {
  const raw = { ...createLifeInsuranceInputs(), currentAge: '40', currentAnnualIncome: '100000', hasPartner: 'no' };
  const result = validateLifeInsuranceInputs(raw, { stageIndex: 0 });
  assert.equal(result.valid, true);
  assert.equal(result.schemaValid, false);
  assert.ok(result.schemaErrors.finalExpenses);
  assert.equal(validateLifeInsuranceInputs({ ...baseline, hasPartner: true }).valid, false);
  assert.throws(() => validateLifeInsuranceInputs(raw, { stageIndex: 20 }), RangeError);
});

test('unsupported projection sizes are rejected before allocation and reported as a distinct adapter safety guard', () => {
  const result = calculateLifeInsurance({ ...baseline, yearsIncomeNeeded: 1000000000 });
  assert.equal(result.valid, false);
  assert.equal(result.sourceSummaryValid, false);
  assert.equal(result.summary, null);
  assert.match(result.warnings[0], /outside the source schema/);
});
