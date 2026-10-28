import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { resolveDependenciesRoot } from './runtime-paths.mjs';
import { calculateLifeInsurance, sourceSummaryIsValid } from '../engine/life-insurance-engine.mjs';
import { formatCurrency } from '../engine/formatting/source-numeral-formatters.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const deps = resolveDependenciesRoot();
const require = createRequire(path.join(deps, 'package.json'));
const esbuild = require('esbuild');
const React = require('react');
const G = require('react/jsx-runtime');
const { renderToStaticMarkup } = require('react-dom/server');
const { Module } = require('node:module');
const exact = createRequire(import.meta.url)('./life-report-source-render.test-fixture.cjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'life-report-test-'));
const compiled = path.join(temp, 'report.cjs');
await esbuild.build({ stdin: { contents: "export * from './LifeInsuranceReport';export {lifeUiCopy} from './ui-copy';", resolveDir: directory, loader: 'ts' },
  bundle: true, platform: 'node', format: 'cjs', outfile: compiled, external: ['react', 'react/jsx-runtime'], nodePaths: [deps], jsx: 'automatic', logLevel: 'silent',
  plugins: [{ name: 'report-chart-boundary', setup(build) {
    // Substitute only the chart boundary so report DOM can be compared with unmodified source pM.render.
    build.onResolve({ filter: /^\.\/LifeInsurancePieChart$/ }, () => ({ path: 'chart', namespace: 'report-test' }));
    build.onLoad({ filter: /.*/, namespace: 'report-test' }, () => ({ loader: 'tsx', contents: 'export function LifeInsurancePieChart({hasPartner}){return <span data-source-chart="" data-has-partner={hasPartner}/>;}' }));
  } }],
});
const bundle = new Module(compiled);
bundle.filename = compiled;
bundle.paths = [deps];
bundle._compile(fs.readFileSync(compiled, 'utf8'), compiled);
const { LifeInsuranceReport, LIFE_INSURANCE_REPORT_SOURCE, lifeUiCopy } = bundle.exports;
const oracle = JSON.parse(fs.readFileSync(new URL('../reference/official-browser-cases.json', import.meta.url)));
const PieBoundary = ({ hasPartner }) => React.createElement('span', { 'data-source-chart': '', 'data-has-partner': hasPartner });
const ExternalDisabled = () => null;
// Exact render function only, never the vendor bundle. External result elements are replaced by
// a null boundary; constructed source strings are never opened, fetched, rendered or persisted.
const sourceRender = Function('G', 'hU', 'hs', 'pb', 'oU', 'so', 'sl', 'rE', 'sc', 'i0', `return (${exact.render});`)(
  G, sourceSummaryIsValid, formatCurrency, PieBoundary, ExternalDisabled, ExternalDisabled, ExternalDisabled,
  { ArrowRight: ExternalDisabled }, ExternalDisabled, ExternalDisabled,
);
const sourceMarkup = (summary, hasPartner) => renderToStaticMarkup(sourceRender.call({ props: { computations: summary, hasPartner } }));
const reportMarkup = (summary, hasPartner, options = {}) => renderToStaticMarkup(React.createElement(LifeInsuranceReport, {
  summary, hasPartner, copy: lifeUiCopy, formatSummaryValue: formatCurrency, ...options,
}));
const withoutQaAttributes = (html) => html.replace(/ data-summary-field="[^"]*"/g, '');

test('test oracle is the exact pinned v14 pM.render source slice and contains no financial engine', () => {
  assert.equal(exact.sourceBundleSHA256, LIFE_INSURANCE_REPORT_SOURCE.bundleSha256);
  assert.equal(crypto.createHash('sha256').update(exact.render).digest('hex'), 'ce36be7b2371f2b8702f0c7e0f989c6028662f640ed98fedfb1c2b3efb44ca69');
  assert.equal(exact.renderSHA256, LIFE_INSURANCE_REPORT_SOURCE.testOracleRenderSha256);
  assert.deepEqual(exact.renderOffsets, [1627345, 1633131]);
  assert.ok(!exact.render.includes('fetch(') && !exact.render.includes('XMLHttpRequest'));
});

for (const item of oracle.cases.filter((item) => item.officialBrowserVerified)) {
  test(`${item.id}: valid report DOM matches unmodified source render at the pie/external boundaries`, () => {
    const { summary, sourceSummaryValid } = calculateLifeInsurance(item.inputs);
    assert.equal(sourceSummaryValid, true);
    const snapshot = structuredClone(summary);
    assert.equal(withoutQaAttributes(reportMarkup(summary, item.inputs.hasPartner)), sourceMarkup(summary, item.inputs.hasPartner));
    assert.deepEqual(summary, snapshot);
  });
}

test('source report has fullwidth additional need before two halfwidth needs and source introduction first', () => {
  const { summary } = calculateLifeInsurance(oracle.cases[0].inputs);
  const html = reportMarkup(summary, 'yes');
  assert.match(html, /^<div><section><div class="l-grid__row"><div class="l-grid__column-6-push-3 l-grid__column-large-12"><p>The information on this screen/);
  const primary = html.indexOf('summary-additional-life-insurance');
  const immediate = html.indexOf('summary-immediate-needs');
  const longTerm = html.indexOf('summary-long-term-needs');
  assert.ok(primary < immediate && immediate < longTerm);
  assert.equal((html.match(/class="l-grid__column-small-12 l-grid__column-large-6"/g) || []).length, 2);
  assert.equal((html.match(/class="tab-panel__summary-total u-text-weight-bold"/g) || []).length, 3);
  assert.ok(!html.includes('<h2') && !html.includes('<h3') && !html.includes('<nav') && !html.includes('Print my report'));
});

test('three tables retain source caption/header/body/footer cells and resources total remains in tbody', () => {
  const { summary } = calculateLifeInsurance(oracle.cases[0].inputs);
  const html = reportMarkup(summary, 'yes');
  const tables = html.match(/<table\b[\s\S]*?<\/table>/g);
  assert.equal(tables.length, 3);
  assert.deepEqual(tables.map((table) => (table.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1].match(/<tr>/g) || []).length), [2, 4, 1]);
  assert.deepEqual(tables.map((table) => (table.match(/<tfoot>/g) || []).length), [1, 0, 1]);
  assert.ok(tables[0].includes('<tfoot><tr><td>Total needs</td>'));
  assert.ok(tables[1].includes('<tr><td>Total resources</td>'));
  assert.ok(tables[2].includes('<tfoot><tr><td>Additional life insurance needed</td>'));
  for (const table of tables) {
    assert.match(table, /^<table class="a-table a-table__summary table-RILA"><caption class="u-sr-only">/);
    assert.ok(table.includes('<thead><tr class="a-table__summary-header t-bg-primary-brand t-primary-white"><th colSpan="2">'));
    assert.ok(!table.includes('scope="row"'));
  }
});

test('no-partner report keeps the partner earnings table row, independent of chart branch', () => {
  const { summary } = calculateLifeInsurance(oracle.cases[1].inputs);
  const html = reportMarkup(summary, 'no');
  assert.ok(html.includes("Spouse or domestic partner&#x27;s earnings</td><td data-summary-field=\"partnerAnnualIncomeSum\">$0.00"));
  assert.ok(html.includes('data-has-partner="no"'));
});

test('caller copy and formatter supply all report text and unrounded amounts without changing engine data', () => {
  const { summary } = calculateLifeInsurance(oracle.cases[0].inputs);
  const copy = structuredClone(lifeUiCopy);
  copy.summary.introduction = 'Caller supplied introduction';
  copy.summary.rows.find((row) => row.key === 'additionalLifeInsuranceNeeded').label = 'Caller supplied need label';
  const received = [];
  const html = reportMarkup(summary, 'yes', { copy, formatSummaryValue: (value, key) => { received.push({ key, value }); return `${key}:${value}`; } });
  assert.ok(html.includes('<p>Caller supplied introduction</p>'));
  assert.ok(html.includes('Caller supplied need label'));
  assert.equal(received.length, 12);
  for (const item of received) assert.ok(Object.is(item.value, summary[item.key]));
});

test('optional external child occupies exact source slot before table section; default makes no external element', () => {
  const { summary } = calculateLifeInsurance(oracle.cases[0].inputs);
  const plain = reportMarkup(summary, 'yes');
  assert.ok(!plain.includes('<iframe') && !plain.includes('calcxml.com') && !plain.includes('<a '));
  const html = reportMarkup(summary, 'yes', { children: React.createElement('aside', { 'data-external-slot': '' }, 'Supplied child') });
  assert.match(html, /id="tabPanelTable"><aside data-external-slot="">Supplied child<\/aside><section class="table-summary-results">/);
});

test.after(() => fs.rmSync(temp, { recursive: true, force: true }));
