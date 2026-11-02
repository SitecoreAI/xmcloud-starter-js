import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  retirementDefaults, taxDeferralDefaults, RETIREMENT_FIELDS, TAX_DEFERRAL_FIELDS, TAX_RATES,
  validateRetirementInputs, validateTaxDeferralInputs, calculateRetirementIncome,
  calculateTaxDeferral, formatToolCurrency, UnsupportedToolExecutionError,
} from './financial-tools.mjs';
import { compute } from './source-retirement-engine.mjs';
import { taxablePortfolioFutureValue, taxDeferredPortfolioFutureValue } from './source-tax-deferral-engine.mjs';
import { sourceValidate } from './source-validation.mjs';
import { sourceNumeral } from './source-currency.mjs';
import contracts from './source-contracts.json' with { type: 'json' };
import libraries from './source-library-provenance.json' with { type: 'json' };

const digest = (value) => createHash('sha256').update(value).digest('hex');
const retirement = Object.freeze({ principal: '1000', interest: '3', payments: '20' });
const tax = Object.freeze({ principle: '10000', interestRate: '5', investmentYears: '10', marginalTaxRate: '22' });

test('runtime libraries retain their exact dependency-closed downloaded source factories', () => {
  for (const record of libraries.records) {
    const code = readFileSync(new URL(record.file, import.meta.url), 'utf8');
    const factory = code.split('const sourceFactory = ')[1].split(';\n\nconst sourceModule = ')[0];
    assert.equal(digest(factory), record.sourceVariants[0].sha256);
    assert.ok(record.sourceVariants.every((variant) => variant.sha256 === record.sourceVariants[0].sha256));
    assert.deepEqual(record.networkDependencies, []);
    assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|eval)\s*\(/.test(factory));
    assert.ok(!/new\s+Function\b/.test(factory));
  }
  assert.equal(sourceValidate.version.toString(), '0.12.0');
  assert.equal(sourceNumeral.version, '2.0.6');
});

test('defaults and fixed field/radio contracts preserve the source rather than assumed financial defaults', () => {
  assert.equal(digest(JSON.stringify(contracts)), 'a5db29924dd07db35df7ec57ea8427b5c244d3e3d5352e66e092d2a2cccd559f');
  assert.deepEqual(retirementDefaults, { principal: '', interest: '', payments: '' });
  assert.deepEqual(taxDeferralDefaults, { principle: '', interestRate: '', investmentYears: '', marginalTaxRate: '10' });
  assert.deepEqual(RETIREMENT_FIELDS.map(({ name }) => name), ['principal', 'interest', 'payments']);
  assert.deepEqual(TAX_DEFERRAL_FIELDS.map(({ name }) => name), ['principle', 'interestRate', 'investmentYears']);
  assert.deepEqual(TAX_RATES, ['10', '12', '22', '24', '32', '35', '37']);
  assert.ok(Object.isFrozen(retirementDefaults) && Object.isFrozen(taxDeferralDefaults));
});

test('retirement validation keeps its exact first-error copy and unusual length rules', () => {
  assert.deepEqual(validateRetirementInputs(retirement), {});
  assert.deepEqual(validateRetirementInputs(retirementDefaults), {
    principal: 'Please provide the valid one-time deposit amount.',
    interest: 'Please enter the annual interest rate you expect to earn from your investment.',
    payments: 'Please provide the valid number of years.',
  });
  assert.equal(validateRetirementInputs({ ...retirement, principal: '1' }).principal,
    'Please provide the valid one-time deposit amount.');
  assert.equal(validateRetirementInputs({ ...retirement, payments: '1' }).payments,
    'Please provide the valid number of years.');
  assert.deepEqual(validateRetirementInputs({ ...retirement, interest: '0', payments: '2.5' }), {});
  assert.ok(validateRetirementInputs({ ...retirement, payments: '-1' }).payments.includes('withdrawels'));
});

test('tax validation preserves source presence-only principal, numeric bounds and fractional years', () => {
  assert.deepEqual(validateTaxDeferralInputs(tax), {});
  assert.deepEqual(validateTaxDeferralInputs(taxDeferralDefaults), {
    principle: 'Please enter the amount invested.',
    interestRate: 'Please enter the expected annual rate of return.',
    investmentYears: 'Please enter the number of years the amount will be invested for.',
  });
  assert.deepEqual(validateTaxDeferralInputs({ ...tax, principle: 'not-a-number', investmentYears: '2.5' }), {});
  assert.equal(validateTaxDeferralInputs({ ...tax, interestRate: '100.01' }).interestRate,
    'You must enter a value between 0.00% and 100.00%');
  assert.equal(validateTaxDeferralInputs({ ...tax, investmentYears: '100' }).investmentYears,
    'Please provide the valid years.');
});

test('adapter validation is the same exact source library/constraint path over malformed and boundary strings', () => {
  // Contract/differential evidence only, not an independent financial output oracle.
  for (const [defaults, constraints, validate] of [
    [retirement, contracts.retirement.validationConstraints, validateRetirementInputs],
    [tax, contracts.taxDeferral.validationConstraints, validateTaxDeferralInputs],
  ]) {
    for (const name of Object.keys(defaults)) {
      for (const value of ['', ' ', '0', '-1', '1', '2.5', '100', 'Infinity', 'abc', '1,000', '12suffix']) {
        const values = Object.freeze({ ...defaults, [name]: value });
        const sourceErrors = sourceValidate(values, constraints);
        const expected = Object.fromEntries(Object.entries(sourceErrors ?? {}).map(([key, messages]) => [key, messages[0]]));
        assert.deepEqual(validate(values), expected);
      }
    }
  }
});

test('retirement adapter retains source raw-string coercion and source currency formatting', () => {
  for (const [principal, interest, payments] of [
    ['1000', '3', '20'], ['1000', '0', '20'], ['1000', '3', '2.5'],
    ['1,000', '3', '20'], ['', '3', '20'], ['1000', '3', '0'],
  ]) {
    const values = Object.freeze({ principal, interest, payments });
    assert.equal(calculateRetirementIncome(values), formatToolCurrency(compute(principal, interest, payments)));
  }
  assert.equal(formatToolCurrency(1.005), '$1.01');
  assert.equal(calculateRetirementIncome({ ...retirement, interest: '0' }), formatToolCurrency(NaN));
});

test('tax adapter retains the original parseFloat getter and both original source services', () => {
  for (const values of [tax, { ...tax, principle: '1,000' }, { ...tax, principle: 'abc' },
    { ...tax, investmentYears: '2.5' }, { ...tax, interestRate: '0' }]) {
    const args = ['principle', 'interestRate', 'investmentYears', 'marginalTaxRate'].map((name) => parseFloat(values[name]));
    assert.deepEqual(calculateTaxDeferral(values), {
      taxablePortfolioFutureValue: formatToolCurrency(taxablePortfolioFutureValue(...args)),
      taxDeferredPortfolioFutureValue: formatToolCurrency(taxDeferredPortfolioFutureValue(...args)),
    });
  }
});

test('excessive or infinite positive iteration requests are explicitly rejected without a fabricated result', () => {
  for (const payments of ['Infinity', '1000000000']) {
    assert.throws(() => calculateRetirementIncome({ ...retirement, payments }), UnsupportedToolExecutionError);
  }
  for (const investmentYears of ['Infinity', '1000000000']) {
    assert.throws(() => calculateTaxDeferral({ ...tax, investmentYears }), UnsupportedToolExecutionError);
  }
});
