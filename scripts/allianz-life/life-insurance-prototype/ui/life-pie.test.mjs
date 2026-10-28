import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { resolveDependenciesRoot } from './runtime-paths.mjs';
import { calculateLifeInsurance } from '../engine/life-insurance-engine.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const deps = resolveDependenciesRoot();
const require = createRequire(path.join(deps, 'package.json'));
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Module } = require('node:module');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'life-pie-test-'));
const compiled = path.join(temp, 'pie.cjs');
await esbuild.build({ stdin: { contents: "export * from './life-pie-model'; export * from './LifeInsurancePieChart';", resolveDir: directory, loader: 'ts' },
  bundle: true, platform: 'node', format: 'cjs', outfile: compiled, external: ['react', 'react/jsx-runtime'], nodePaths: [deps], jsx: 'automatic', logLevel: 'silent' });
const bundle = new Module(compiled);
bundle.filename = compiled;
bundle.paths = [deps];
bundle._compile(fs.readFileSync(compiled, 'utf8'), compiled);
const { LifeInsurancePieChart, createLifePieSeries, createLifePieGeometry, formatLifePieValue, initialLifePieInteraction,
  lifePieLegendLayout, lifePiePointOpacity, nextLifePieLegendIndex, reduceLifePieInteraction, LIFE_PIE_SOURCE } = bundle.exports;
const oracle = JSON.parse(fs.readFileSync(new URL('../reference/official-browser-cases.json', import.meta.url)));
const render = (summary, hasPartner, initialInteraction) => renderToStaticMarkup(React.createElement(LifeInsurancePieChart, { summary, hasPartner, initialInteraction }));
const baseSummary = { investmentAssetsAndSocialSecurity: 10, existingLifeInsurance: 20, additionalLifeInsuranceNeeded: 30, partnerAnnualIncomeSum: 40 };

test('source series order, labels and palette are exact and do not use negative shortfall as a slice', () => {
  const series = createLifePieSeries({ ...baseSummary, shortfall: -500 }, 'yes');
  assert.deepEqual(series, [
    { key: 'investmentAssetsAndSocialSecurity', name: 'Investment assets and Social Security', color: '#99ABD5', value: 10 },
    { key: 'existingLifeInsurance', name: 'Existing life insurance', color: '#2C3E50', value: 20 },
    { key: 'additionalLifeInsuranceNeeded', name: 'Additional life insurance needed', color: '#16A085', value: 30 },
    { key: 'partnerAnnualIncomeSum', name: "Spouse or partner's earnings", color: '#FFA801', value: 40 },
  ]);
  for (const choice of ['no', undefined, 'Yes', true]) assert.equal(createLifePieSeries(baseSummary, choice).length, 3);
});

for (const item of oracle.cases.filter((item) => item.officialBrowserVerified)) {
  test(`${item.id}: independent source amounts map to the recorded ${item.observedChartSlices} slice count`, () => {
    const result = calculateLifeInsurance(item.inputs);
    assert.equal(result.sourceSummaryValid, true);
    const snapshot = structuredClone(result.summary);
    const series = createLifePieSeries(result.summary, item.inputs.hasPartner);
    const geometry = createLifePieGeometry(series);
    assert.equal(series.length, item.observedChartSlices);
    assert.equal(geometry.points.filter((point) => point.path).length, item.observedChartSlices);
    const officialKeys = { partnerAnnualIncomeSum: 'partnerEarnings' };
    for (const point of series) {
      assert.equal(point.value, result.summary[point.key], 'chart must receive unrounded source engine value');
      const officialValue = item.expectedDisplayedTwoDecimals[officialKeys[point.key] || point.key];
      assert.equal(formatLifePieValue(point.value), formatLifePieValue(officialValue), point.key);
    }
    assert.deepEqual(result.summary, snapshot, 'chart presentation must not mutate the financial result');
    const html = render(result.summary, item.inputs.hasPartner);
    assert.equal((html.match(/class="life-pie-sector"/g) || []).length, item.observedChartSlices);
    assert.equal((html.match(/class="life-pie-symbol"/g) || []).length, item.observedChartSlices);
    for (const point of series) assert.ok(html.includes(`<title>${formatLifePieValue(point.value)}</title>`));
    assert.ok(!html.includes('<iframe') && !html.includes('calcxml'));
  });
}

test('tooltip uses source numeral rounding and preserves raw precision in the point data', () => {
  const summary = { ...baseSummary, investmentAssetsAndSocialSecurity: 1.005 };
  assert.equal(createLifePieSeries(summary, 'no')[0].value, 1.005);
  assert.equal(formatLifePieValue(1.005), '$1.01');
  assert.equal(formatLifePieValue(-1.005), '-$1.00');
  assert.ok(render(summary, 'no').includes('data-life-pie-raw-value="1.005"'));
  assert.ok(render(summary, 'no').includes('<title>$1.01</title>'));
});

test('positive SVG geometry closes one turn, keeps proportions, starts at12oclock and has finite coordinates', () => {
  const geometry = createLifePieGeometry(createLifePieSeries(baseSummary, 'yes'));
  assert.equal(geometry.state, 'positive');
  assert.equal(geometry.total, 100);
  assert.equal(geometry.points[0].startAngle, -Math.PI / 2);
  assert.equal(geometry.points.at(-1).endAngle, 3 * Math.PI / 2);
  for (const point of geometry.points) {
    assert.ok(Math.abs((point.endAngle - point.startAngle) / (2 * Math.PI) - point.value / 100) < 1e-14);
    assert.ok(point.path && !/NaN|Infinity|undefined/.test(point.path));
  }
  assert.match(geometry.points[0].path, /^M 200 200 L 200 10 A 190 190 0 0 1 /);
});

test('single positive resource produces a complete circle, retaining zero-valued legend entries', () => {
  const summary = { investmentAssetsAndSocialSecurity: 100, existingLifeInsurance: 0, additionalLifeInsuranceNeeded: 0, partnerAnnualIncomeSum: 0 };
  const geometry = createLifePieGeometry(createLifePieSeries(summary, 'no'));
  assert.equal(geometry.points.length, 3);
  assert.equal(geometry.points.filter((point) => point.path).length, 1);
  assert.equal((geometry.points[0].path.match(/ A /g) || []).length, 2);
  const html = render(summary, 'no');
  assert.equal((html.match(/class="life-pie-legend-value"/g) || []).length, 3);
  assert.equal((html.match(/>\$0\.00<\/span>/g) || []).length, 2);
});

test('synthetic source-engine surplus preserves zero additional insurance in the model and legend', () => {
  // Static engine/geometry coverage only; this is not an additional official browser reference case.
  const inputs = { ...oracle.cases[0].inputs, currentLifeInsurance: '3000000' };
  const result = calculateLifeInsurance(inputs);
  assert.equal(result.sourceSummaryValid, true);
  assert.ok(Object.is(result.summary.additionalLifeInsuranceNeeded, -0), 'exact source engine preserves negative zero for surplus');
  const geometry = createLifePieGeometry(createLifePieSeries(result.summary, 'yes'));
  const additional = geometry.points.find((point) => point.key === 'additionalLifeInsuranceNeeded');
  assert.equal(geometry.points.length, 4);
  assert.ok(Object.is(additional.value, result.summary.additionalLifeInsuranceNeeded), 'chart must retain the exact signed source zero');
  assert.equal(additional.path, null);
  assert.equal(geometry.points.filter((point) => point.path).length, 3);
  const html = render(result.summary, 'yes');
  assert.equal(formatLifePieValue(additional.value), '$0.00');
  assert.ok(html.includes('Additional life insurance needed<span class="life-pie-legend-value">$0.00</span>'));
});

test('allzero data retains every visible amount with no invented sectors or substituted financial data', () => {
  const summary = Object.fromEntries(Object.keys(baseSummary).map((key) => [key, 0]));
  const geometry = createLifePieGeometry(createLifePieSeries(summary, 'yes'));
  assert.equal(geometry.state, 'zero');
  assert.deepEqual(geometry.points.map((point) => point.value), [0, 0, 0, 0]);
  assert.ok(geometry.points.every((point) => point.path === null));
  const html = render(summary, 'yes');
  assert.ok(html.includes('data-life-pie-state="zero"'));
  assert.ok(html.includes('class="life-pie-empty"') && html.includes('stroke="#cccccc"'));
  assert.equal((html.match(/>\$0\.00<\/span>/g) || []).length, 4);
  assert.ok(!html.includes('NaN') && !html.includes('Infinity'));
});

test('negative and nonfinite inputs are never abs/clamped/filtered out of the raw model or accessible amounts', () => {
  for (const [value, state] of [[-10, 'negative'], [Infinity, 'nonfinite'], [NaN, 'nonfinite']]) {
    const summary = { ...baseSummary, investmentAssetsAndSocialSecurity: value };
    const series = createLifePieSeries(summary, 'yes');
    assert.ok(Object.is(series[0].value, value));
    const geometry = createLifePieGeometry(series);
    assert.equal(geometry.state, state);
    assert.equal(geometry.points[0].path, null, 'invalid source point must not advance a sector');
    assert.equal(geometry.points.filter((point) => point.path).length, 3);
    assert.equal(geometry.total, 90, 'source library totals exclude invalid points');
    const html = render(summary, 'yes');
    assert.ok(html.includes(`data-life-pie-raw-value="${value}"`));
    assert.equal((html.match(/class="life-pie-legend-value"/g) || []).length, 4);
    if (value === -10) assert.ok(html.includes('-$10.00'));
    if (!Number.isFinite(value)) assert.ok(html.includes(`>${value}</span>`), 'unsupported value must remain apparent');
  }
});

test('responsive legend uses source chart-container threshold500, square20px symbols and20px spacing', () => {
  assert.equal(lifePieLegendLayout(499.99), 'horizontal');
  assert.equal(lifePieLegendLayout(500), 'vertical');
  const html = render(baseSummary, 'yes');
  assert.ok(html.includes('container-type:inline-size'));
  assert.ok(html.includes('@container (min-width:500px)'));
  assert.ok(html.includes('flex-direction:column;flex-wrap:nowrap;align-self:center'));
  assert.ok(html.includes('width:20px;height:20px;margin-right:20px'));
  assert.ok(html.includes('margin:0 0 20px'));
  assert.ok(html.includes(LIFE_PIE_SOURCE.accessibilityDescription.replace(/'/g, '&#x27;')));
});

test('positive sectors expose keyboard selection semantics and source currency tooltip while amounts remain in the legend', () => {
  const html = render(baseSummary, 'yes');
  assert.equal((html.match(/role="button"/g) || []).length, 4);
  assert.equal((html.match(/tabindex="0"/g) || []).length, 4);
  assert.equal((html.match(/aria-pressed="false"/g) || []).length, 4);
  assert.ok(html.includes('aria-label="Investment assets and Social Security: $10.00"'));
  assert.ok(html.includes('<title>$10.00</title>'));
  assert.ok(html.includes('aria-label="Chart amounts"'));
});

test('legend visibility toggle recalculates visible sectors while retaining exact raw series and selection', () => {
  const series = createLifePieSeries(baseSummary, 'yes');
  const snapshot = structuredClone(series);
  const initial = { hiddenKeys: [], selectedKeys: ['investmentAssetsAndSocialSecurity'] };
  const hidden = reduceLifePieInteraction(initial, { type: 'toggleVisibility', key: 'investmentAssetsAndSocialSecurity' });
  assert.deepEqual(initial, { hiddenKeys: [], selectedKeys: ['investmentAssetsAndSocialSecurity'] });
  assert.deepEqual(hidden.selectedKeys, initial.selectedKeys);
  const geometry = createLifePieGeometry(series, hidden.hiddenKeys);
  assert.equal(geometry.total, 90);
  assert.equal(geometry.points[0].path, null);
  assert.equal(geometry.points[0].visible, false);
  assert.equal(geometry.points[0].value, 10);
  assert.equal(geometry.points.filter((point) => point.path).length, 3);
  for (const point of geometry.points.filter((point) => point.visible)) {
    assert.ok(Math.abs((point.endAngle - point.startAngle) / (2 * Math.PI) - point.value / 90) < 1e-14);
  }
  assert.deepEqual(series, snapshot);
  const restored = reduceLifePieInteraction(hidden, { type: 'toggleVisibility', key: 'investmentAssetsAndSocialSecurity' });
  assert.deepEqual(restored, initial);
  assert.deepEqual(createLifePieGeometry(series, restored.hiddenKeys), createLifePieGeometry(series));
});

test('hiding every point gives source empty outline and four accessible raw amounts with source hidden style', () => {
  let state = initialLifePieInteraction();
  const series = createLifePieSeries(baseSummary, 'yes');
  for (const point of series) state = reduceLifePieInteraction(state, { type: 'toggleVisibility', key: point.key });
  const geometry = createLifePieGeometry(series, state.hiddenKeys);
  assert.equal(geometry.total, 0);
  assert.equal(geometry.state, 'zero');
  assert.equal(geometry.points.filter((point) => point.path).length, 0);
  assert.deepEqual(geometry.points.map((point) => point.value), [10, 20, 30, 40]);
  const html = render(baseSummary, 'yes', state);
  assert.ok(html.includes('class="life-pie-empty"'));
  assert.equal((html.match(/class="life-pie-legend-hidden"/g) || []).length, 4);
  assert.equal((html.match(/class="life-pie-legend-toggle"/g) || []).length, 4);
  for (const point of series) {
    assert.ok(html.includes(`Show ${point.name.replace(/'/g, '&#x27;')}: ${formatLifePieValue(point.value)}`));
    assert.ok(html.includes(`>${formatLifePieValue(point.value)}</span>`));
  }
  assert.ok(html.includes('color:#666666;text-decoration:line-through'));
  assert.equal((html.match(/background-color:#666666/g) || []).length, 4);
  assert.equal((html.match(/aria-pressed="false"/g) || []).length, 4);
});

test('hiding a zero-valued source point only changes visibility and keeps its legend amount', () => {
  const summary = { ...baseSummary, existingLifeInsurance: 0 };
  const series = createLifePieSeries(summary, 'yes');
  const original = createLifePieGeometry(series);
  const hidden = createLifePieGeometry(series, ['existingLifeInsurance']);
  assert.equal(hidden.total, original.total);
  assert.deepEqual(hidden.points.map((point) => point.path), original.points.map((point) => point.path));
  assert.equal(hidden.points[1].value, 0);
  assert.equal(hidden.points[1].visible, false);
  const html = render(summary, 'yes', { hiddenKeys: ['existingLifeInsurance'], selectedKeys: [] });
  assert.ok(html.includes('Show Existing life insurance: $0.00'));
});

test('normal point click toggles selection and clears other selections exactly as source Point.select', () => {
  const a = 'investmentAssetsAndSocialSecurity';
  const b = 'existingLifeInsurance';
  let state = initialLifePieInteraction();
  state = reduceLifePieInteraction(state, { type: 'select', key: a });
  assert.deepEqual(state.selectedKeys, [a]);
  state = reduceLifePieInteraction(state, { type: 'select', key: b });
  assert.deepEqual(state.selectedKeys, [b]);
  state = reduceLifePieInteraction(state, { type: 'select', key: b });
  assert.deepEqual(state.selectedKeys, []);
});

for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey']) {
  test(`${modifier} accumulates and independently toggles point selection without changing visibility`, () => {
    const a = 'investmentAssetsAndSocialSecurity';
    const b = 'existingLifeInsurance';
    let state = { hiddenKeys: ['additionalLifeInsuranceNeeded'], selectedKeys: [a] };
    state = reduceLifePieInteraction(state, { type: 'select', key: b, modifiers: { [modifier]: true } });
    assert.deepEqual(state.selectedKeys, [a, b]);
    state = reduceLifePieInteraction(state, { type: 'select', key: a, modifiers: { [modifier]: true } });
    assert.deepEqual(state.selectedKeys, [b]);
    assert.deepEqual(state.hiddenKeys, ['additionalLifeInsuranceNeeded']);
  });
}

test('Alt does not accumulate, and unmodified deselection clears other selected points', () => {
  const a = 'investmentAssetsAndSocialSecurity';
  const b = 'existingLifeInsurance';
  const initial = { hiddenKeys: [], selectedKeys: [a, b] };
  assert.deepEqual(reduceLifePieInteraction(initial, { type: 'select', key: a }).selectedKeys, []);
  assert.deepEqual(reduceLifePieInteraction({ hiddenKeys: [], selectedKeys: [a] }, { type: 'select', key: b, modifiers: { altKey: true } }).selectedKeys, [b]);
  const html = render(baseSummary, 'yes', initial);
  assert.equal((html.match(/transform="translate\(/g) || []).length, 2);
});

test('source inactive opacity preserves selected points and clears when pointer/focus leaves', () => {
  assert.equal(lifePiePointOpacity('existingLifeInsurance', 'investmentAssetsAndSocialSecurity', []), 0.2);
  assert.equal(lifePiePointOpacity('existingLifeInsurance', 'investmentAssetsAndSocialSecurity', ['existingLifeInsurance']), 1);
  assert.equal(lifePiePointOpacity('investmentAssetsAndSocialSecurity', 'investmentAssetsAndSocialSecurity', []), 1);
  assert.equal(lifePiePointOpacity('existingLifeInsurance', null, []), 1);
});

test('native legend button arrow adaptation follows source directions and default wrapping', () => {
  assert.equal(nextLifePieLegendIndex(0, 4, 'ArrowLeft'), 3);
  assert.equal(nextLifePieLegendIndex(0, 4, 'ArrowUp'), 3);
  assert.equal(nextLifePieLegendIndex(3, 4, 'ArrowRight'), 0);
  assert.equal(nextLifePieLegendIndex(3, 4, 'ArrowDown'), 0);
  assert.equal(nextLifePieLegendIndex(1, 4, 'ArrowRight'), 2);
  assert.equal(nextLifePieLegendIndex(0, 1, 'ArrowRight'), 0);
  assert.equal(nextLifePieLegendIndex(0, 0, 'ArrowRight'), null);
  assert.equal(nextLifePieLegendIndex(0, 4, 'Enter'), null, 'Enter/Space remain native button click activation');
});

test.after(() => fs.rmSync(temp, { recursive: true, force: true }));
