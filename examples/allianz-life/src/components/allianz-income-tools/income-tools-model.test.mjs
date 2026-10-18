import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Existing local TypeScript transpile pattern, without loading React, SDK, env or network.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const filename = fileURLToPath(new URL('./income-tools-model.ts', import.meta.url));
const compiled = new Module(filename);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { STRATEGIES, calculateIllustration, validateCalculation, filterSampleRates } = compiled.exports;

function input(strategyId = 'performance-1', overrides = {}) {
  return { strategyId, amount: 100, indexReturnPct: 20, allocationPct: 100,
    assumptions: { capPct: 25, bufferPct: 10, floorPct: -10, triggerPct: 10, participationPct: 100 },
    ...overrides };
}
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}

test('catalogue contains exactly the seven named sample strategies and no Dual Precision', () => {
  assert.deepEqual(STRATEGIES.map(({ id, name, termYears, rule }) => [id, name, termYears, rule]), [
    ['performance-1', 'Index Performance Strategy 1-Year Term', 1, 'buffer-cap'],
    ['performance-3', 'Index Performance Strategy 3-Year Term', 3, 'buffer-cap'],
    ['performance-6', 'Index Performance Strategy 6-Year Term', 6, 'buffer-cap'],
    ['precision', 'Index Precision Strategy', 1, 'buffer-trigger'],
    ['guard', 'Index Guard Strategy', 1, 'floor-cap'],
    ['protection-cap', 'Index Protection Strategy with cap', 1, 'protected-cap'],
    ['protection-trigger', 'Index Protection Strategy with trigger', 1, 'protected-trigger'],
  ]);
  assert.equal(new Set(STRATEGIES.map(({ id }) => id)).size, 7);
});

test('fictional defaults are frozen, valid and independent for every row', () => {
  assert.ok(Object.isFrozen(STRATEGIES));
  for (const entry of STRATEGIES) {
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.assumptions));
    assert.deepEqual(validateCalculation(input(entry.id, { assumptions: entry.assumptions })), {});
  }
  assert.equal(new Set(STRATEGIES.map(({ assumptions }) => assumptions)).size, 7);
});

test('inclusive validation endpoints and zero amount are valid', () => {
  assert.deepEqual(validateCalculation(input('performance-1', { amount: 0, indexReturnPct: -100, allocationPct: 0,
    assumptions: { capPct: 0, bufferPct: 0, floorPct: -100, triggerPct: 0, participationPct: 0 } })), {});
  assert.deepEqual(validateCalculation(input('performance-1', { amount: 10_000_000, indexReturnPct: 1000, allocationPct: 100,
    assumptions: { capPct: 100, bufferPct: 100, floorPct: 0, triggerPct: 100, participationPct: 300 } })), {});
});

test('every numeric field rejects just-outside bounds, nonfinite values and numeric strings with flat keys', () => {
  const ranges = { amount: [0, 10_000_000], indexReturnPct: [-100, 1000], allocationPct: [0, 100],
    capPct: [0, 100], bufferPct: [0, 100], floorPct: [-100, 0], triggerPct: [0, 100], participationPct: [0, 300] };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    for (const value of [min - 0.001, max + 0.001, NaN, Infinity, -Infinity, '10', null, undefined]) {
      const current = input();
      if (key in current.assumptions) current.assumptions[key] = value;
      else current[key] = value;
      assert.ok(validateCalculation(current)[key], `${key}: ${String(value)}`);
      assert.ok(!Object.keys(validateCalculation(current)).some((name) => name.startsWith('assumptions.')));
      assert.throws(() => calculateIllustration(current), RangeError);
    }
  }
});

test('unknown strategies including prototype keys fail even for zero amount or allocation', () => {
  for (const strategyId of ['unknown', '__proto__', 'constructor', 'toString', '', undefined]) {
    const current = input(strategyId, { amount: 0, allocationPct: 0 });
    // input() has a convenience default for undefined, so exercise it explicitly.
    current.strategyId = strategyId;
    assert.ok(validateCalculation(current).strategyId);
    assert.throws(() => calculateIllustration(current), RangeError);
  }
});

test('missing assumption objects produce five individual field errors instead of throwing', () => {
  const current = input('guard', { assumptions: undefined });
  assert.deepEqual(Object.keys(validateCalculation(current)).sort(),
    ['bufferPct', 'capPct', 'floorPct', 'participationPct', 'triggerPct']);
  assert.throws(() => calculateIllustration(current), RangeError);
});

test('positive cap and participation apply only to the allocated portion', () => {
  const current = input('performance-1', { allocationPct: 60,
    assumptions: { ...input().assumptions, participationPct: 150 } });
  const result = calculateIllustration(current);
  assert.equal(result.creditedReturnPct, 25);
  assert.equal(result.allocatedAmount, 60);
  assert.equal(result.cashAmount, 40);
  assert.equal(result.illustratedValue, 115);
  assert.equal(result.indexComparisonValue, 112);
  assert.equal(result.gainLoss, 15);
});

test('positive cap variants share the simple sample rule; zero participation gives zero credit', () => {
  for (const id of ['performance-1', 'guard', 'protection-cap']) {
    const capped = input(id, { indexReturnPct: 50, assumptions: { ...input().assumptions, capPct: 5, participationPct: 300 } });
    assert.equal(calculateIllustration(capped).creditedReturnPct, 5);
    assert.equal(calculateIllustration({ ...capped, assumptions: { ...capped.assumptions, participationPct: 0 } }).creditedReturnPct, 0);
  }
});

for (const id of ['performance-1', 'precision']) {
  test(`${id}: buffer absorbs losses up to its boundary without creating a gain`, () => {
    for (const [indexReturnPct, expected] of [[-5, 0], [-10, 0], [-15, -5], [-100, -90]]) {
      const result = calculateIllustration(input(id, { indexReturnPct }));
      assert.equal(result.creditedReturnPct, expected);
      close(result.illustratedValue, 100 + expected);
    }
    assert.equal(calculateIllustration(input(id, { indexReturnPct: -100,
      assumptions: { ...input().assumptions, bufferPct: 100 } })).creditedReturnPct, 0);
    assert.equal(calculateIllustration(input(id, { indexReturnPct: -100,
      assumptions: { ...input().assumptions, bufferPct: 0 } })).creditedReturnPct, -100);
  });
}

test('floor limits negative sample credit without applying positive participation to losses', () => {
  for (const [indexReturnPct, expected] of [[-5, -5], [-10, -10], [-20, -10], [-100, -10]]) {
    const current = input('guard', { indexReturnPct,
      assumptions: { ...input().assumptions, participationPct: 300 } });
    assert.equal(calculateIllustration(current).creditedReturnPct, expected);
  }
});

for (const id of ['precision', 'protection-trigger']) {
  test(`${id}: fixed sample trigger needs a strictly positive return; exact zero has no trigger`, () => {
    for (const indexReturnPct of [0.000001, 1, 1000]) {
      const current = input(id, { indexReturnPct, allocationPct: 60,
        assumptions: { ...input().assumptions, participationPct: 0, capPct: 0 } });
      const result = calculateIllustration(current);
      assert.equal(result.creditedReturnPct, 10);
      assert.equal(result.illustratedValue, 106);
    }
    assert.equal(calculateIllustration(input(id, { indexReturnPct: 0 })).creditedReturnPct, 0);
    assert.equal(calculateIllustration(input(id, { indexReturnPct: 2,
      assumptions: { ...input().assumptions, triggerPct: 0 } })).creditedReturnPct, 0);
  });
}

test('protected sample rules credit no loss for negative returns', () => {
  for (const id of ['protection-cap', 'protection-trigger']) {
    for (const indexReturnPct of [-0.001, -50, -100]) {
      const result = calculateIllustration(input(id, { indexReturnPct }));
      assert.equal(result.creditedReturnPct, 0);
      assert.equal(result.illustratedValue, 100);
    }
  }
});

test('every strategy gives zero credit at zero index return', () => {
  for (const { id } of STRATEGIES) {
    const result = calculateIllustration(input(id, { indexReturnPct: 0 }));
    assert.equal(result.creditedReturnPct, 0);
    assert.equal(result.illustratedValue, 100);
    assert.equal(result.indexComparisonValue, 100);
  }
});

test('zero allocation leaves both comparison totals unchanged; full allocation uses the full amount', () => {
  const cashOnly = calculateIllustration(input('performance-1', { allocationPct: 0, indexReturnPct: -100 }));
  assert.equal(cashOnly.allocatedAmount, 0);
  assert.equal(cashOnly.cashAmount, 100);
  assert.equal(cashOnly.illustratedValue, 100);
  assert.equal(cashOnly.indexComparisonValue, 100);
  const allAllocated = calculateIllustration(input('performance-1', { indexReturnPct: -15 }));
  assert.equal(allAllocated.cashAmount, 0);
  assert.equal(allAllocated.illustratedValue, 95);
  assert.equal(allAllocated.indexComparisonValue, 85);
});

test('zero sample amount is valid for every strategy and produces zero monetary values', () => {
  for (const { id } of STRATEGIES) {
    const result = calculateIllustration(input(id, { amount: 0 }));
    for (const key of ['allocatedAmount', 'cashAmount', 'illustratedValue', 'indexComparisonValue', 'gainLoss']) {
      assert.equal(result[key], 0);
    }
  }
});

test('largest permitted inputs remain finite and comparison uses the same allocation', () => {
  const result = calculateIllustration(input('performance-1', { amount: 10_000_000, indexReturnPct: 1000,
    assumptions: { ...input().assumptions, participationPct: 300, capPct: 100 } }));
  assert.equal(result.illustratedValue, 20_000_000);
  assert.equal(result.indexComparisonValue, 110_000_000);
  for (const key of ['creditedReturnPct', 'allocatedAmount', 'cashAmount', 'illustratedValue', 'indexComparisonValue', 'gainLoss']) {
    assert.ok(Number.isFinite(result[key]));
  }
});

test('one-, three- and six-year labels do not annualize or compound total-term returns', () => {
  const results = ['performance-1', 'performance-3', 'performance-6'].map((id) => calculateIllustration(input(id)));
  for (const result of results) {
    assert.equal(result.creditedReturnPct, 20);
    assert.equal(result.illustratedValue, 120);
    assert.match(result.ruleDescription, /Sample total-term math only/);
    assert.match(result.ruleDescription, /No annualization or compounding/);
  }
});

test('calculations are deterministic, accept frozen inputs and do not mutate inputs or defaults', () => {
  const current = Object.freeze({ ...input('guard'), assumptions: Object.freeze({ ...input().assumptions }) });
  const before = JSON.stringify(current), defaultsBefore = JSON.stringify(STRATEGIES);
  const first = calculateIllustration(current), second = calculateIllustration(current);
  assert.deepEqual(first, second);
  assert.notStrictEqual(first, second);
  assert.equal(JSON.stringify(current), before);
  assert.equal(JSON.stringify(STRATEGIES), defaultsBefore);
});

test('sample rate filtering returns the seven rows in order and respects both filters without mutation', () => {
  const before = JSON.stringify(STRATEGIES);
  assert.deepEqual(filterSampleRates('all', 'all'), STRATEGIES);
  assert.notStrictEqual(filterSampleRates('all', 'all'), STRATEGIES);
  assert.equal(filterSampleRates('all', 1).length, 5);
  assert.deepEqual(filterSampleRates('all', 3).map(({ id }) => id), ['performance-3']);
  assert.deepEqual(filterSampleRates('all', 6).map(({ id }) => id), ['performance-6']);
  assert.deepEqual(filterSampleRates('all', 2), []);
  for (const entry of STRATEGIES) {
    assert.deepEqual(filterSampleRates(entry.id, entry.termYears), [entry]);
  }
  assert.deepEqual(filterSampleRates('performance-3', 1), []);
  assert.deepEqual(filterSampleRates('__proto__', 'all'), []);
  assert.equal(JSON.stringify(STRATEGIES), before);
});
