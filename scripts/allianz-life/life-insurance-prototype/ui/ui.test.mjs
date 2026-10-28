import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { resolveDependenciesRoot } from './runtime-paths.mjs';
import * as engine from '../engine/life-insurance-engine.mjs';
import { formatCurrency } from '../engine/formatting/source-numeral-formatters.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const deps = resolveDependenciesRoot();
const require = createRequire(path.join(deps, 'package.json'));
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'life-ui-test-'));
const compiled = path.join(temp, 'compiled.cjs');
await esbuild.build({ entryPoints: [path.join(directory, 'test-exports.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: compiled,
  external: ['react', 'react/jsx-runtime'], nodePaths: [deps], jsx: 'automatic', logLevel: 'silent' });
// Resolve existing installed React without creating/changing any node_modules tree.
const { Module } = require('node:module');
const bundle = new Module(compiled);
bundle.filename = compiled;
bundle.paths = [deps];
bundle._compile(fs.readFileSync(compiled, 'utf8'), compiled);
const { initialLifeUiState, initialLifeValues, reduceLifeUi, visibleStageFields, stageErrors, STAGE_FIELDS, lifeUiCopy, LifeInsuranceCalculator } = bundle.exports;
const source = { ...engine, updateSourceIncome: engine.updateLifeInsuranceField };
const oracle = JSON.parse(fs.readFileSync(new URL('../reference/official-browser-cases.json', import.meta.url)));
const contract = JSON.parse(fs.readFileSync(new URL('./source-ui-contract.json', import.meta.url)));
const inputCase = oracle.cases[0].inputs;
const change = (state, name, value) => reduceLifeUi(state, { type: 'change', name, value }, source);
const render = (state) => renderToStaticMarkup(React.createElement(LifeInsuranceCalculator, { copy: lifeUiCopy, source, initialState: state,
  formatSummaryValue: value => String(formatCurrency(value)) }));

test('all17 source fields and5 source stages are represented without turning placeholders into initial data', () => {
  assert.equal(new Set(STAGE_FIELDS.flat()).size, 17);
  assert.deepEqual(STAGE_FIELDS.flat(), engine.LIFE_INSURANCE_FIELD_NAMES);
  assert.deepEqual(initialLifeValues(), engine.createLifeInsuranceInputs());
  assert.equal(lifeUiCopy.stages.length, 5);
  for (const field of contract.fields) {
    assert.equal(lifeUiCopy.fields[field.name].label, field.label);
    assert.equal(lifeUiCopy.fields[field.name].placeholder, field.placeholder ?? undefined);
    assert.deepEqual(lifeUiCopy.fields[field.name].help, field.help);
  }
});

test('source menu can jump to invalid Summary and show the exact warning without fabricated results', () => {
  const state = reduceLifeUi(initialLifeUiState(), { type: 'jump', step: 4 }, source);
  assert.equal(state.step, 4);
  assert.equal(state.result.sourceSummaryValid, false);
  const html = render(state);
  assert.ok(html.includes(contract.summary.invalidWarning));
  assert.ok(!html.includes('data-summary-field'));
  assert.equal((html.match(/class="axl-tab-list-button"/g) || []).length, 5);
  assert.ok(!html.includes('>Back<') && !html.includes('>Reset<'));
});

test('Continue initially disabled; invalid programmatic next exposes first-field focus and touched errors', () => {
  const initial = initialLifeUiState();
  assert.match(render(initial), /<button[^>]*type="submit"[^>]*disabled=""/);
  const state = reduceLifeUi(initial, { type: 'next' }, source);
  assert.equal(state.step, 0);
  assert.deepEqual(state.focus, { kind: 'field', field: 'currentAge' });
  assert.equal(state.touched.currentAge, true);
  assert.ok(stageErrors(state, source).currentAge);
});

test('partner controls hide without clearing retained values and reappear on Yes', () => {
  let state = initialLifeUiState();
  for (const key of STAGE_FIELDS[0]) state = change(state, key, inputCase[key]);
  state = change(state, 'hasPartner', 'no');
  assert.deepEqual(visibleStageFields(state), ['currentAge', 'currentAnnualIncome', 'hasPartner']);
  assert.equal(state.values.partnerAge, '38');
  assert.ok(!render(state).includes('name="partnerAge"'));
  state = change(state, 'hasPartner', 'yes');
  assert.equal(state.values.partnerAge, '38');
  assert.ok(render(state).includes('name="partnerAge"'));
});

test('source income suggestion is event-driven, can be manually overridden, and is not rerun by stage navigation', () => {
  let state = change(initialLifeUiState(), 'currentAnnualIncome', '100000');
  assert.equal(state.values.desiredAnnualIncome, undefined);
  state = change(state, 'partnerAnnualIncome', '75000');
  assert.equal(state.values.desiredAnnualIncome, 131250);
  state = change(state, 'desiredAnnualIncome', '80000');
  state = reduceLifeUi(state, { type: 'jump', step: 2 }, source);
  assert.equal(state.values.desiredAnnualIncome, '80000');
  state = change(state, 'hasPartner', 'no');
  state = change(state, 'currentAnnualIncome', '120000');
  assert.equal(state.values.desiredAnnualIncome, 146250);
});

for (const { name, minimum, maximum } of Object.values(engine.LIFE_INSURANCE_FIELD_SCHEMA).filter(field => field.name !== 'hasPartner')) {
  test(`source bounds drive ${name} stage validity`, () => {
    const step = STAGE_FIELDS.findIndex(fields => fields.includes(name));
    let state = { ...initialLifeUiState(), values: { ...inputCase }, step };
    assert.ok(!stageErrors(change(state, name, String(minimum)), source)[name]);
    assert.ok(!stageErrors(change(state, name, String(maximum)), source)[name]);
    assert.ok(stageErrors(change(state, name, String(minimum - 1)), source)[name]);
    assert.ok(stageErrors(change(state, name, String(maximum + 1)), source)[name]);
  });
}

for (const item of oracle.cases.filter(item => item.officialBrowserVerified)) {
  test(`${item.id}: form state advances through5stages and SSR shows every official monetary output`, () => {
    let state = initialLifeUiState();
    for (let step = 0; step < 4; step++) {
      assert.equal(state.step, step);
      for (const name of STAGE_FIELDS[step]) state = change(state, name, item.inputs[name]);
      assert.deepEqual(stageErrors(state, source), {});
      state = reduceLifeUi(state, { type: 'next' }, source);
    }
    assert.equal(state.step, 4);
    assert.equal(state.result.sourceSummaryValid, true);
    const html = render(state);
    for (const [key, expected] of Object.entries(item.expectedDisplayedTwoDecimals)) {
      const engineKey = key === 'partnerEarnings' ? 'partnerAnnualIncomeSum' : key;
      assert.equal(String(formatCurrency(state.result.summary[engineKey])), String(formatCurrency(expected)), key);
      assert.ok(html.includes(String(formatCurrency(expected))), `${key} not displayed`);
    }
    for (const table of contract.summary.tables) assert.ok(html.includes(table.caption));
    assert.ok(!html.includes('<iframe') && !html.includes('calcxml.com'));
    const retained = { ...state.values };
    state = reduceLifeUi(state, { type: 'jump', step: 0 }, source);
    assert.deepEqual(state.values, retained);
  });
}

test('SSR inputs use source Intl masks separately from exact source numeral report formatting', () => {
  const state = { ...initialLifeUiState(), step: 3, values: { ...inputCase, inflationRate: '-1.005' } };
  const html = render(state);
  assert.ok(html.includes('-1.00%'));
  assert.ok(html.includes('$150,000.00'));
  assert.ok(!html.includes('value="80000"'));
});

test.after(() => fs.rmSync(temp, { recursive: true, force: true }));
