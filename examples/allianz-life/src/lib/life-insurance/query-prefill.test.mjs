import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../../../../..');
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const esbuild = require('esbuild');
const engine = await import(pathToFileURL(path.join(directory, 'engine/life-insurance-engine.mjs')));
const reference = JSON.parse(fs.readFileSync(path.join(repository,
  'scripts/allianz-life/life-insurance-prototype/reference/official-browser-cases.json'), 'utf8'));
const evidence = JSON.parse(fs.readFileSync(path.join(directory, 'ui/query-defaults.source.json'), 'utf8'));
const build = await esbuild.build({
  stdin: { contents: `export { lifeInsuranceQueryDefaults } from './ui/life-query-defaults';
    export { reduceLifeUi, visibleStageFields, stageErrors } from './ui/life-ui-model';
    export { LifeInsuranceRuntime } from './LifeInsuranceRuntime';`, resolveDir: directory, loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  outfile: path.join(directory, 'query-test.cjs'), external: ['react', 'react/jsx-runtime'], logLevel: 'silent',
});
const compiled = build.outputFiles.find(({ path: file }) => file.endsWith('.cjs')).text;
const deniedCalls = [];
function load(react = React, window = {}) {
  const module = { exports: {} };
  const deny = name => () => { deniedCalls.push(name); throw new Error(`Unexpected outbound operation: ${name}`); };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, URLSearchParams,
    require(name) { return name === 'react' ? react : require(name); },
    window, fetch: deny('fetch'), XMLHttpRequest: deny('XMLHttpRequest'), WebSocket: deny('WebSocket'),
    EventSource: deny('EventSource'), navigator: { sendBeacon: deny('sendBeacon') },
    console: { log: deny('console.log'), warn: deny('console.warn'), error: deny('console.error') },
  });
  return module.exports;
}
const runtime = load();
const defaults = runtime.lifeInsuranceQueryDefaults;
const render = state => renderToStaticMarkup(React.createElement(runtime.LifeInsuranceRuntime, { initialState: state }));

test('retained source evidence pins the exact query factories and stage-activation contract', () => {
  assert.equal(evidence.sourceBundleSHA256, '75aa6f4d5c0dd662839844b490f99ab1534a24c8330f81b1c5cfd31a9d7371d7');
  for (const snippet of evidence.snippets) {
    assert.equal(crypto.createHash('sha256').update(snippet.code).digest('hex'), snippet.sha256, snippet.name);
  }
  assert.equal(evidence.snippets.find(({ name }) => name === 'querySnapshotAndActiveIdFactory').code,
    'var pV=new URLSearchParams(window.location.search);function pZ(){try{return pV.get("activeId")||iV}catch(e){return iV}}');
});

test('missing query leaves the source defaults untouched, including undefined numeric fields', () => {
  const state = defaults('');
  assert.equal(state.step, 0);
  assert.equal(state.values.hasPartner, 'yes');
  for (const name of engine.LIFE_INSURANCE_FIELD_NAMES.filter(name => name !== 'hasPartner')) assert.equal(state.values[name], undefined, name);
  assert.equal(state.result, null);
  assert.equal(state.focus, null);
  assert.equal(state.focusVersion, 0);
});

test('numeric query defaults preserve parseFloat prefixes, NaN, Infinity and raw partner choice', () => {
  const values = defaults('?currentAge=55years&currentAnnualIncome=12%2C500&currentLifeInsurance=&returnRate=%2B2.5percent&investmentAssets=Infinity&hasPartner=yes+no').values;
  assert.equal(values.currentAge, 55);
  assert.equal(values.currentAnnualIncome, 12);
  assert.ok(Number.isNaN(values.currentLifeInsurance));
  assert.equal(values.returnRate, 2.5);
  assert.equal(values.investmentAssets, Infinity);
  assert.equal(values.hasPartner, 'yes no');
  assert.equal(defaults('?hasPartner=').values.hasPartner, '');
});

test('input entries use last assignment while activeId uses its first value and empty fallback', () => {
  const state = defaults('?currentAge=40&currentAge=41&hasPartner=yes&hasPartner=no&activeId=summary&activeId=about-you');
  assert.equal(state.values.currentAge, 41);
  assert.equal(state.values.hasPartner, 'no');
  assert.equal(state.step, 4);
  assert.ok(!Object.hasOwn(state.values, 'activeId'));
  assert.equal(defaults('?activeId=&activeId=summary').step, 0);
  assert.ok(Number.isNaN(defaults('?currentAge=40&currentAge=').values.currentAge));
});

test('all five exact source IDs activate their corresponding panel without normalizing unknown IDs', () => {
  for (const [index, id] of ['about-you', 'one-time-costs', 'long-term-income-needs', 'available-assets', 'summary'].entries()) {
    assert.equal(defaults(`?activeId=${id}`).step, index);
  }
  for (const id of ['unknown', 'About-You', ' summary ', 'actions']) assert.equal(defaults(`?activeId=${encodeURIComponent(id)}`).step, -1);
});

test('unknown source stage renders no regular panel and a menu selection restores one without losing defaults', () => {
  const state = defaults('?activeId=unknown&currentAge=40');
  assert.equal(runtime.visibleStageFields(state).length, 0);
  assert.equal(Object.keys(runtime.stageErrors(state, { validateLifeInsuranceInputs() { throw new Error('No active form'); } })).length, 0);
  const html = render(state);
  assert.equal((html.match(/class="axl-tab-list-button"/g) ?? []).length, 5);
  assert.ok(!/<form\b|class="panel-header"|aria-current="step"/.test(html));
  assert.equal(runtime.reduceLifeUi(state, { type: 'next' }, engine), state);
  const selected = runtime.reduceLifeUi(state, { type: 'jump', step: 0 }, engine);
  assert.equal(selected.values.currentAge, 40);
  assert.ok(render(selected).includes('name="currentAge"'));
});

test('query assignments do not trigger income-change suggestions or field validation', () => {
  const state = defaults('?currentAnnualIncome=100000&partnerAnnualIncome=50000&currentAge=-10');
  assert.equal(state.values.desiredAnnualIncome, undefined);
  assert.equal(state.values.currentAge, -10);
  assert.equal(defaults('?currentAnnualIncome=100000&partnerAnnualIncome=50000&desiredAnnualIncome=80000').values.desiredAnnualIncome, 80000);
});

test('malformed numeric defaults retain source raw input values and recover through an ordinary edit', () => {
  const warnings = [];
  const originalError = console.error;
  let html;
  const state = defaults('?currentAge=invalid&currentAnnualIncome=Infinity&hasPartner=');
  try {
    console.error = (...args) => warnings.push(args.map(String).join(' '));
    html = render(state);
  } finally { console.error = originalError; }
  const numberInput = [...html.matchAll(/<input\b[^>]*>/g)].map(([tag]) => tag).find(tag => tag.includes('name="currentAge"'));
  assert.match(numberInput, /value="NaN"/);
  assert.ok(html.includes('value="$∞"'), 'The unchanged source currency mask formats Infinity without inventing a clamp.');
  if (process.env.NODE_ENV !== 'production') assert.ok(warnings.some(message => message.includes('NaN')));
  assert.ok(!html.includes('name="partnerAge"'));
  const infinityHtml = render(defaults('?currentAge=Infinity'));
  const infinityInput = [...infinityHtml.matchAll(/<input\b[^>]*>/g)].map(([tag]) => tag).find(tag => tag.includes('name="currentAge"'));
  assert.match(infinityInput, /value="Infinity"/);
  const recovered = runtime.reduceLifeUi(state, { type: 'change', name: 'currentAge', value: '55' }, engine);
  const recoveredInput = [...render(recovered).matchAll(/<input\b[^>]*>/g)].map(([tag]) => tag).find(tag => tag.includes('name="currentAge"'));
  assert.match(recoveredInput, /value="55"/);
});

test('empty or unsupported partner defaults keep source partner fields hidden and recover without clearing values', () => {
  for (const choice of ['', 'maybe', 'YES']) {
    const state = defaults(`?hasPartner=${choice}&partnerAge=38&partnerAnnualIncome=75000&partnerRetirementAge=65`);
    assert.equal(state.values.hasPartner, choice);
    assert.ok(!runtime.visibleStageFields(state).includes('partnerAge'));
    assert.ok(!render(state).includes('name="partnerAge"'));
    const selected = runtime.reduceLifeUi(state, { type: 'change', name: 'hasPartner', value: 'yes' }, engine);
    assert.equal(selected.values.partnerAge, 38);
    assert.equal(selected.values.partnerAnnualIncome, 75000);
    assert.ok(render(selected).includes('name="partnerAge"'));
    const noPartner = runtime.reduceLifeUi(selected, { type: 'change', name: 'hasPartner', value: 'no' }, engine);
    assert.equal(noPartner.values.partnerAge, 38);
    assert.ok(!render(noPartner).includes('name="partnerAge"'));
  }
});

test('ordinary unknown inputs and inherited-name dispatch preserve source partial-default behavior', () => {
  const ordinary = defaults('?campaign=123tail&constructor=9&toString=8&currentAge=41').values;
  assert.equal(ordinary.campaign, 123);
  assert.ok(!Object.hasOwn(ordinary, 'constructor'));
  assert.ok(!Object.hasOwn(ordinary, 'toString'));
  assert.equal(ordinary.currentAge, 41);
  const partial = defaults('?currentAge=40&__proto__=anything&yearsIncomeNeeded=20&activeId=summary');
  assert.equal(partial.values.currentAge, 40);
  assert.equal(partial.values.yearsIncomeNeeded, undefined);
  assert.ok(!Object.hasOwn(partial.values, '__proto__'));
  assert.equal(partial.step, 4);
  assert.ok(!Object.hasOwn(Object.prototype, 'yearsIncomeNeeded'));
});

for (const item of reference.cases.filter(item => item.officialBrowserVerified)) {
  test(`${item.id}: query initialization preserves all nine official amounts using the unchanged local engine`, () => {
    const parameters = new URLSearchParams(Object.entries(item.inputs));
    parameters.set('activeId', 'summary');
    const state = defaults(parameters.toString());
    const result = engine.calculateLifeInsurance(state.values);
    assert.equal(result.sourceSummaryValid, true);
    const html = render(state);
    for (const [name, expected] of Object.entries(item.expectedDisplayedTwoDecimals)) {
      const key = name === 'partnerEarnings' ? 'partnerAnnualIncomeSum' : name;
      const actual = String(engine.formatLifeCurrency(result.summary[key]));
      assert.equal(actual, String(engine.formatLifeCurrency(expected)), name);
      assert.ok(html.includes(actual), name);
    }
  });
}

test('SSR never reads the browser query, and explicit local QA state keeps precedence', () => {
  let reads = 0;
  const server = load(React, { get location() { reads++; throw new Error('No browser query on server'); } });
  const html = renderToStaticMarkup(React.createElement(server.LifeInsuranceRuntime));
  assert.equal(html, '', 'Source controls wait for browser query defaults, without an intermediate editable form.');
  assert.equal(reads, 0);
  const explicit = defaults('?activeId=one-time-costs');
  const browser = load({ ...React, useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() },
    { get location() { reads++; throw new Error('Explicit QA state must bypass query'); } });
  assert.equal(browser.LifeInsuranceRuntime({ initialState: explicit }).props.initialState, explicit);
  assert.equal(reads, 0);
});

test('browser defaults are read once after hydration and do not reset on a later rerender', () => {
  let reads = 0;
  let clientReady = false;
  let search = '?currentAge=40&activeId=one-time-costs';
  const states = [];
  let cursor = 0;
  const browser = load({ ...React,
    useSyncExternalStore: (_subscribe, getSnapshot, getServerSnapshot) => clientReady ? getSnapshot() : getServerSnapshot(),
    useState(initializer) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initializer === 'function' ? initializer() : initializer;
      return [states[index], () => {}];
    },
  }, { location: { get search() { reads++; return search; } } });
  assert.equal(browser.LifeInsuranceRuntime({ instancePrefix: 'local-one' }), null);
  assert.equal(reads, 0);
  clientReady = true;
  const element = browser.LifeInsuranceRuntime({ instancePrefix: 'local-one' });
  let calculator = element.type(element.props);
  assert.equal(calculator.props.initialState.values.currentAge, 40);
  assert.equal(calculator.props.initialState.step, 1);
  assert.equal(calculator.props.instancePrefix, 'local-one');
  calculator.props.initialState.values.currentAge = 45;
  search = '?currentAge=99&activeId=summary';
  cursor = 0;
  calculator = element.type(element.props);
  assert.equal(calculator.props.initialState.values.currentAge, 45);
  assert.equal(calculator.props.initialState.step, 1);
  assert.equal(reads, 1);
});

test.after(() => assert.deepEqual(deniedCalls, [], 'No query or financial data leaves the local runtime.'));
