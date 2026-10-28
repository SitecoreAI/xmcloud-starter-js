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
const ts = require('typescript');
const provenance = JSON.parse(fs.readFileSync(path.join(directory, 'runtime-provenance.json'), 'utf8'));
const reference = JSON.parse(fs.readFileSync(path.join(repository,
  'scripts/allianz-life/life-insurance-prototype/reference/official-browser-cases.json'), 'utf8'));
const engine = await import(pathToFileURL(path.join(directory, 'engine/life-insurance-engine.mjs')));
const formatter = await import(pathToFileURL(path.join(directory, 'engine/formatting/source-numeral-formatters.mjs')));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const calls = [];
const deny = name => () => { calls.push(name); throw new Error(`Outbound boundary invoked: ${name}`); };
const build = await esbuild.build({ entryPoints: [path.join(directory, 'LifeInsuranceRuntime.tsx')],
  bundle: true, write: false, metafile: true, platform: 'node', format: 'cjs', jsx: 'automatic',
  outfile: path.join(directory, 'test-output.cjs'), external: ['react', 'react/jsx-runtime'], logLevel: 'silent' });
const compiled = build.outputFiles.find(file => file.path.endsWith('.cjs')).text;
const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports,
  require(specifier) { assert.ok(['react', 'react/jsx-runtime'].includes(specifier)); return require(specifier); },
  fetch: deny('fetch'), XMLHttpRequest: deny('XMLHttpRequest'), WebSocket: deny('WebSocket'), EventSource: deny('EventSource'),
  navigator: { sendBeacon: deny('sendBeacon') }, window: { open: deny('window.open'), fetch: deny('window.fetch') },
  console: { log: deny('console.log'), warn: deny('console.warn'), error: deny('console.error') },
}, { filename: 'canonical-life-insurance-runtime.cjs' });
const { LifeInsuranceRuntime } = module.exports;
const render = props => renderToStaticMarkup(React.createElement(LifeInsuranceRuntime, props));
const summaryState = (values, result) => ({ values, result, step: 4, touched: {}, focus: null, focusVersion: 0 });

test('canonical source modules and formatter license retain exact pinned bytes', () => {
  const pinned = {
    'engine/life-insurance-engine.mjs': '2bccc7a6e0acba00f7f99a2c59ee75cc4e0fd94a41dfa6ff3fab3e93d21f3cb6',
    'engine/source-engine-exact.mjs': 'a3b01adc8636486dc84ab9fa63bcbe74db2e3fd6b81e27c85827f9165ac7b984',
    'engine/formatting/source-numeral-formatters.mjs': '0a84ae1e088ee9874a2f2b44650d16c13ced2b7a71475cf86120d66b9eeb4a13',
  };
  for (const [file, expected] of Object.entries(pinned)) {
    const bytes = fs.readFileSync(path.join(directory, file));
    assert.equal(digest(bytes), expected, file);
    assert.deepEqual(bytes, fs.readFileSync(path.join(repository, 'scripts/allianz-life/life-insurance-prototype', file)));
  }
  for (const item of provenance.copied) {
    const original = fs.readFileSync(path.join(repository, item.prototype));
    const actual = fs.readFileSync(path.join(directory, item.file));
    assert.equal(digest(original), item.sourceSHA256, `Pinned source drift: ${item.file}`);
    assert.equal(digest(actual), item.runtimeSHA256, `Runtime provenance drift: ${item.file}`);
    if (item.mode === 'exact') assert.deepEqual(actual, original);
  }
  assert.match(fs.readFileSync(path.join(directory, 'engine/formatting/NUMERAL-LICENSE'), 'utf8'), /MIT|Permission is hereby granted/);
});

for (const item of reference.cases.filter(item => item.officialBrowserVerified)) {
  test(`${item.id}: canonical engine and actual runtime preserve all nine pinned amounts and chart branch`, () => {
    const result = engine.calculateLifeInsurance(item.inputs);
    assert.equal(result.sourceSummaryValid, true);
    const html = render({ instancePrefix: item.id, initialState: summaryState(item.inputs, result) });
    for (const [name, expected] of Object.entries(item.expectedDisplayedTwoDecimals)) {
      const key = name === 'partnerEarnings' ? 'partnerAnnualIncomeSum' : name;
      const actual = String(formatter.formatCurrency(result.summary[key]));
      assert.equal(actual, String(formatter.formatCurrency(expected)), key);
      assert.ok(html.includes(actual), `Missing ${key}`);
    }
    assert.equal((html.match(/class="life-pie-sector"/g) ?? []).length, item.observedChartSlices);
    assert.equal((html.match(/<table\b/g) ?? []).length, 3);
    assert.ok(html.includes(`id="${item.id}-tabPanelChartTotals"`));
    assert.ok(html.includes(`id="${item.id}-tabPanelTable"`));
    assert.ok(!/<(?:iframe|video|audio|object|embed)\b/.test(html));
    assert.ok(!/\s(?:src|href|action)=/i.test(html));
  });
}

test('canonical initial/invalid Summary stays local and does not fabricate a report', () => {
  const values = engine.createLifeInsuranceInputs();
  const result = engine.calculateLifeInsurance(values);
  assert.equal(result.sourceSummaryValid, false);
  const initial = render({});
  assert.equal((initial.match(/\$0\.00/g) ?? []).length, 3, 'Unconditional mobile source banner formats raw NaNs.');
  const invalid = render({ initialState: summaryState(values, result) });
  assert.ok(invalid.includes('You have not filled out all of the fields'));
  assert.equal((invalid.match(/<table\b/g) ?? []).length, 0);
  assert.equal((invalid.match(/class="life-pie-sector"/g) ?? []).length, 0);
  assert.ok(!invalid.includes('calcxml.com'));
});

test('two complete native calculator instances have unique report, field, action and SVG IDs', () => {
  const item = reference.cases[0];
  const result = engine.calculateLifeInsurance(item.inputs);
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(LifeInsuranceRuntime, { instancePrefix: 'native-one', initialState: summaryState(item.inputs, result) }),
    React.createElement(LifeInsuranceRuntime, { instancePrefix: 'native-two', initialState: summaryState(item.inputs, result) })));
  const ids = [...html.matchAll(/\bid="([^"]*)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const prefix of ['native-one', 'native-two']) {
    assert.ok(ids.includes(`${prefix}-tabPanelChartTotals`));
    assert.ok(ids.includes(`${prefix}-tabPanelTable`));
  }
});

test('actual client dependency graph stays app-local, excludes tool/player code and exposes no outbound operation', () => {
  const ownInputs = Object.keys(build.metafile.inputs).map(input => path.resolve(input));
  assert.ok(ownInputs.length > 15);
  for (const file of ownInputs) {
    assert.ok(file.startsWith(directory + path.sep), `Unexpected runtime dependency: ${file}`);
    assert.ok(!/(?:calcxml-urls|source-render\.test|runtime-paths|harness|\/scripts\/|\.test\.)/.test(file));
    if (!/\.(?:ts|tsx|mjs)$/.test(file)) continue;
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = node => {
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const target = node.expression.getText(source);
        assert.ok(!/(?:^|\.)(?:fetch|sendBeacon|postMessage|XMLHttpRequest|WebSocket|EventSource|Worker|open)$/.test(target),
          `Unexpected outbound operation ${target} in ${file}`);
      }
      if (ts.isPropertyAccessExpression(node)) {
        assert.ok(!['localStorage', 'sessionStorage', 'indexedDB'].includes(node.name.text));
        assert.notEqual(node.getText(source), 'process.env');
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.deepEqual(calls, [], 'SSR and module initialization may not invoke network, external navigation or logging adapters.');
  assert.ok(!compiled.includes('ins01.htm') && !compiled.includes('ins01t.htm'));
});
