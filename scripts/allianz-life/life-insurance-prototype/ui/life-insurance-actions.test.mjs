import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { resolveAppRoot, resolveDependenciesRoot } from './runtime-paths.mjs';
import { formatCurrency } from '../engine/formatting/source-numeral-formatters.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const deps = resolveDependenciesRoot();
const require = createRequire(path.join(deps, 'package.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'life-actions-test-'));
const compiled = path.join(temporary, 'actions.cjs');
await require('esbuild').build({ entryPoints: [path.join(directory, 'LifeInsuranceActions.tsx')], bundle: true,
  platform: 'node', format: 'cjs', outfile: compiled, jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], nodePaths: [deps], logLevel: 'silent' });
const { Module } = require('node:module');
const bundle = new Module(compiled);
bundle.filename = compiled;
bundle.paths = [deps];
bundle._compile(fs.readFileSync(compiled, 'utf8'), compiled);
const { LifeInsuranceActions } = bundle.exports;
const source = JSON.parse(fs.readFileSync(new URL('./life-insurance-actions.source.json', import.meta.url)));
const oracle = JSON.parse(fs.readFileSync(new URL('../reference/official-browser-cases.json', import.meta.url)));
const props = overrides => ({ isSummary: false, summary: {}, copy: { buttons: { print: 'Print my report' } },
  formatSummaryValue: value => String(formatCurrency(value)), onPrint() {}, printing: false, printError: false,
  idPrefix: 'actions-one', ...overrides });
const render = value => renderToStaticMarkup(React.createElement(LifeInsuranceActions, value));
const walk = value => Array.isArray(value) ? value.flatMap(walk) : value?.props ? [value, ...walk(value.props.children)] : [];
const printButton = value => walk(LifeInsuranceActions(value)).find(element => element.type === 'button');
const attributesFrom = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

for (const item of oracle.cases.filter(item => item.officialBrowserVerified)) {
  test(`${item.id}: estimate banner preserves source structure and the three recorded amounts`, () => {
    const expected = item.expectedDisplayedTwoDecimals;
    const summary = { additionalLifeInsuranceNeeded: expected.additionalLifeInsuranceNeeded,
      immediateNeeds: expected.immediateNeeds, longTermNeeds: expected.longTermNeeds };
    const html = render(props({ summary }));
    const amounts = [expected.additionalLifeInsuranceNeeded, expected.immediateNeeds, expected.longTermNeeds]
      .map(value => String(formatCurrency(value)));
    assert.equal(html, '<div><div class="sumary-header"><p>We estimate your total life insurance need is:</p></div>' +
      '<div class="tab-panel-total"><p>Your life insurance need is</p><p class="tab-panel-summary-total">' + amounts[0] + '</p></div>' +
      '<div class="tab-panel-total"><p>Immediate needs</p><p class="tab-panel-summary-total">' + amounts[1] + '</p></div>' +
      '<div class="tab-panel-total"><p>Long-term needs</p><p class="tab-panel-summary-total">' + amounts[2] + '</p></div>' +
      '<p class="summary-footer"></p></div>');
    assert.ok(!html.includes('<button') && !html.includes('<iframe'));
  });
}

test('blank mobile banner passes source NaNs directly to the original formatter, yielding three $0.00 amounts', () => {
  const calls = [];
  const html = render(props({ summary: { additionalLifeInsuranceNeeded: NaN, immediateNeeds: NaN, longTermNeeds: NaN },
    formatSummaryValue(value, key) { calls.push([key, value]); return String(formatCurrency(value)); } }));
  assert.deepEqual(calls.map(([key]) => key), ['additionalLifeInsuranceNeeded', 'immediateNeeds', 'longTermNeeds']);
  assert.ok(calls.every(([, value]) => Number.isNaN(value)), 'The UI must not substitute zero or invent input defaults.');
  assert.equal((html.match(/\$0\.00/g) ?? []).length, 3);
});

test('estimate display reads only the three supplied numeric properties and never validates or clamps them', () => {
  const summary = { additionalLifeInsuranceNeeded: -1.005, immediateNeeds: Infinity, longTermNeeds: NaN };
  const calls = [];
  render(props({ summary, formatSummaryValue(value, key) { calls.push([key, value]); return 'source formatted'; } }));
  assert.deepEqual(calls, Object.entries(summary));
});

test('Summary action uses exact source classes and icon-before-label order, with a valid accessible name', () => {
  const summary = new Proxy({}, { get() { throw new Error('Print action must not read financial values'); } });
  const html = render(props({ isSummary: true, summary, formatSummaryValue() { throw new Error('No formatting in print branch'); } }));
  const opening = html.match(/<button\b[^>]*>/)[0];
  assert.deepEqual(attributesFrom(opening), { type: 'button', tabindex: '0',
    class: 'm-axlButton m-axlButton--secondary-panel m-axlButton-icon',
    'aria-label': 'Print my report', 'aria-busy': 'false', 'aria-disabled': 'false' });
  assert.ok(html.startsWith('<div id="actions-one-summaryTabActions"><button'));
  assert.ok(html.includes('<span class="m-axlButton__icon"><svg'));
  assert.ok(html.includes('</svg></span><span id="actions-one-print-label" class="button-label">Print my report</span></button>'));
  assert.ok(!html.includes('sumary-header') && !html.includes('aria-labelledby="Print my report"'));
});

test('CategoryArticle preserves the source wrapper, group transform and all three exact path geometries', () => {
  const html = render(props({ isSummary: true }));
  const opening = html.match(/<svg\b[^>]*>/)[0];
  assert.deepEqual(attributesFrom(opening), { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24',
    preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-labelledby': 'titleIconactions-one-CategoryArticle',
    'aria-describedby': 'descIconactions-one-CategoryArticle' });
  assert.ok(html.includes('<title id="titleIconactions-one-CategoryArticle">Icon Category Article</title>'));
  assert.ok(html.includes('<desc id="descIconactions-one-CategoryArticle">Article content</desc>'));
  assert.ok(html.includes('<g transform="translate(3 2)">'));
  const paths = [...html.matchAll(/<path d="([^"]*)"><\/path>/g)].map(match => match[1]);
  assert.equal(paths.length, 3);
  assert.deepEqual(paths, source.icon.paths);
  assert.equal(digest(JSON.stringify(paths.map(d => d.replace(/[\s,]/g, '')))),
    '6e05d019babb705584d7de1127c860ff02b30972da30322acc0c891f341c9118');
});

test('all three CategoryArticle path strings also match the existing local original widget geometry', () => {
  const evidence = source.icon.localGeometryEvidence;
  const widget = fs.readFileSync(path.join(resolveAppRoot(), evidence.asset), 'utf8');
  assert.equal(digest(widget), evidence.assetSHA256);
  const definition = widget.slice(...evidence.offsets);
  const paths = [...definition.matchAll(/\bd:\s*("(?:[^"\\]|\\.)*")/g)].map(match => JSON.parse(match[1]));
  assert.deepEqual(paths, source.icon.paths);
  assert.ok(definition.includes('translate(3 2)'));
});

test('print action supplies the actual trigger to its parent and suppresses duplicate activation while busy', () => {
  const trigger = { tagName: 'BUTTON' };
  const calls = [];
  let prevented = 0;
  const event = { currentTarget: trigger, preventDefault() { prevented++; } };
  printButton(props({ isSummary: true, onPrint(value) { calls.push(value); } })).props.onClick(event);
  assert.deepEqual(calls, [trigger]);
  assert.equal(prevented, 0);
  const busy = props({ isSummary: true, printing: true, onPrint(value) { calls.push(value); } });
  printButton(busy).props.onClick(event);
  assert.deepEqual(calls, [trigger]);
  assert.equal(prevented, 1);
  assert.ok(render(busy).includes('aria-busy="true" aria-disabled="true"'));
});

test('print errors have an associated alert, and distinct parent prefixes produce unique accessible IDs', () => {
  const first = render(props({ isSummary: true, printError: true }));
  assert.ok(first.includes('aria-describedby="actions-one-print-error"'));
  assert.ok(first.includes('<p id="actions-one-print-error" role="alert">' + source.privatePrintError + '</p>'));
  const second = render(props({ isSummary: true, idPrefix: 'actions-two', printError: true }));
  const ids = [...(first + second).matchAll(/\bid="([^"]*)"/g)].map(match => match[1]);
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => !/\s/.test(id)));
  assert.ok(!render(props({ isSummary: true })).includes('role="alert"'));
});

test('print label is safe text in the accessible name and visible label', () => {
  const html = render(props({ isSummary: true, copy: { buttons: { print: 'Print <report> & copy' } } }));
  assert.ok(html.includes('aria-label="Print &lt;report&gt; &amp; copy"'));
  assert.ok(html.includes('class="button-label">Print &lt;report&gt; &amp; copy</span>'));
  assert.ok(!html.includes('<report>'));
});

test.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
