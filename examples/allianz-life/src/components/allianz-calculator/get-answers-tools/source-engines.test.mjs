import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compute } from './source-retirement-engine.mjs';
import { taxablePortfolioFutureValue, taxDeferredPortfolioFutureValue } from './source-tax-deferral-engine.mjs';

// Captured exact public service functions, not independent observed financial oracles.
const sourceRetirement = function compute(principal, interest, payments) {
  let vpv;
  let count = 0;
  let denominator = 1;
  let i = interest / 100 / 12;
  let factor = 1 + i;
  payments *= 12;
  while (count < payments) {
    denominator = denominator * factor;
    count++;
  }
  vpv = 1 - 1 / denominator;
  vpv = vpv / i;
  vpv = principal * vpv;
  return vpv;
};

const sourceTaxable = function taxablePortfolioFutureValue(principle, interestRate, investmentYears, marginalTaxRate) {
  let initialPrinciple = principle;
  let accumTotEarn = 0;
  let compPerYear = 1;
  interestRate /= 100;
  if (marginalTaxRate === '' || marginalTaxRate === 0) {
    marginalTaxRate = 0;
  } else {
    marginalTaxRate /= 100;
  }
  interestRate /= compPerYear;
  let numPeriods = investmentYears * compPerYear;
  for (let i = 1; i <= numPeriods; i++) {
    let accumAnnInt = 0;
    let intEarn = principle * interestRate;
    accumAnnInt = accumAnnInt + intEarn;
    accumTotEarn = accumTotEarn + intEarn;
    principle = principle + intEarn;
    if (i % compPerYear === 0) {
      let tax = marginalTaxRate * accumAnnInt;
      accumTotEarn = accumTotEarn - tax;
      principle = principle - tax;
      accumAnnInt = 0;
    }
  }
  return accumTotEarn + initialPrinciple;
};
const sourceDeferred = function taxDeferredPortfolioFutureValue(principle, interestRate, investmentYears, marginalTaxRate) {
  let initialPrinciple = principle;
  let accumTotEarn = 0;
  let compPerYear = 1;
  let percentTaxable = 0;
  interestRate /= 100;
  if (marginalTaxRate === '' || marginalTaxRate === 0) {
    marginalTaxRate = 0;
  } else {
    marginalTaxRate /= 100;
  }
  percentTaxable /= 100;
  interestRate /= compPerYear;
  let numPeriods = investmentYears * compPerYear;
  for (let i = 1; i <= numPeriods; i++) {
    let accumAnnInt = 0;
    let intEarn = principle * interestRate;
    accumAnnInt = accumAnnInt + intEarn;
    accumTotEarn = accumTotEarn + intEarn;
    principle = principle + intEarn;
    if (i % compPerYear === 0) {
      let taxable = accumAnnInt * percentTaxable;
      let tax = marginalTaxRate * taxable;
      accumTotEarn = accumTotEarn - tax;
      principle = principle - tax;
      accumAnnInt = 0;
    }
  }
  return accumTotEarn + initialPrinciple;
};

const digest = value => createHash('sha256').update(value).digest('hex');
const sourceBlock = file => readFileSync(new URL(file, import.meta.url), 'utf8')
  .split('/* BEGIN EXACT SOURCE FUNCTIONS */\n')[1].split('\n/* END EXACT SOURCE FUNCTIONS */')[0];
const sameNumber = (actual, expected) => assert.ok(Object.is(actual, expected), 'Source differential mismatch');

test('runtime function blocks retain pinned downloaded public source bytes', () => {
  assert.equal(digest(sourceBlock('./source-retirement-engine.mjs')), 'd721c4fd565f3fde17818bd9191465d15f3e58cdff230c8426c40608e57f4e55');
  assert.equal(digest(sourceBlock('./source-tax-deferral-engine.mjs')), '010866e398172b1f9ec88617aed18e31677f81bfc7cccb2d93eb6423366011c7');
  assert.equal(compute.toString(), sourceRetirement.toString());
  assert.equal(taxablePortfolioFutureValue.toString(), sourceTaxable.toString());
  assert.equal(taxDeferredPortfolioFutureValue.toString(), sourceDeferred.toString());
});

test('source retirement calculation matches its untouched captured service over a bounded matrix', () => {
  for (const principal of [0, 1, 1000, 1234.56, 999999999])
    for (const interest of [0, 0.1, 1, 3, 12, 100, -1])
      for (const payments of [0, 1 / 12, 0.5, 1, 2.5, 30, 99])
        sameNumber(compute(principal, interest, payments), sourceRetirement(principal, interest, payments));
});

test('retirement direct getter string coercion is retained without a new parser', () => {
  for (const values of [['1000', '3', '20'], [' 1000 ', '3.5', '2.5'], ['', '3', '20'], ['1000suffix', '3', '20'], ['1,000', '3', '20']])
    sameNumber(compute(...values), sourceRetirement(...values));
});

test('retirement source zero-interest and fractional payment behavior remains explicit', () => {
  assert.ok(Number.isNaN(compute(1000, 0, 20)));
  sameNumber(compute(1000, 3, 1 / 24), compute(1000, 3, 1 / 12));
  assert.equal(compute(1000, 3, 0), 0);
});

test('both tax results match their untouched captured services over a bounded matrix', () => {
  for (const principle of [0, 1000, 1234.56, -1])
    for (const interestRate of [0, 0.5, 3.25, 100, -1])
      for (const investmentYears of [0, 1, 2.5, 30, 99])
        for (const marginalTaxRate of [0, 10, 24, 37, 100]) {
          const values = [principle, interestRate, investmentYears, marginalTaxRate];
          sameNumber(taxablePortfolioFutureValue(...values), sourceTaxable(...values));
          sameNumber(taxDeferredPortfolioFutureValue(...values), sourceDeferred(...values));
        }
});

test('tax source fractional years, zero rates, and NaN stay separate from input validation', () => {
  for (const fn of [taxablePortfolioFutureValue, taxDeferredPortfolioFutureValue]) {
    sameNumber(fn(1000, 3, 2.5, 24), fn(1000, 3, 2, 24));
    assert.equal(fn(1000, 0, 20, 24), 1000);
    assert.ok(Number.isNaN(fn(NaN, 3, 20, 24)));
  }
});

test('the recovered service modules have no imports, network, environment, storage or dynamic evaluation', () => {
  for (const file of ['./source-retirement-engine.mjs', './source-tax-deferral-engine.mjs']) {
    const code = sourceBlock(file);
    assert.ok(!/\b(?:import|require|fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|process|window|document|eval)\b/.test(code));
    assert.ok(!/new\s+Function\b/.test(code));
  }
});
