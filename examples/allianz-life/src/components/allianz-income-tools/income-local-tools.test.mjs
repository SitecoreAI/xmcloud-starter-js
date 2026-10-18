import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename);
  cache.set(filename, compiled);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.module.css')) return { __esModule: true,
      default: new Proxy({}, { get: (_, name) => String(name) }) };
    if (specifier.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), specifier);
      const local = [`${base}.ts`, `${base}.tsx`].find((candidate) => fs.existsSync(candidate));
      if (local) return load(local);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const component = load(path.join(here, 'IncomeLocalToolsDemo.tsx'));
const model = load(path.join(here, 'income-tools-model.ts'));
const render = (mode) => renderToStaticMarkup(React.createElement(component.IncomeLocalToolsDemo, { mode }));

test('shared API renders a qualified sample-rate table with labeled filters and all supported rows', () => {
  assert.strictEqual(component.default, component.IncomeLocalToolsDemo);
  const html = render('rates');
  assert.match(html, /Demo sample rates/);
  assert.match(html, /fictional sample set/);
  assert.match(html, /No live rate data is connected/);
  assert.match(html, /Dual Precision strategies are not modeled/);
  assert.equal((html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0].match(/<tr/g) ?? []).length, 7);
  for (const strategy of model.STRATEGIES) assert.ok(html.includes(strategy.name));
  assert.equal((html.match(/<select/g) ?? []).length, 2);
  assert.match(html, /Reset filters/);
  assert.match(html, /role="region" aria-label="Demo sample rate assumptions" tabindex="0"/);
  assert.match(html, /role="status" aria-live="polite"/);
  for (const match of html.matchAll(/<select id="([^"]+)"/g)) assert.ok(html.includes(`for="${match[1]}"`));
});

test('strategy markup has labeled numeric inputs, local actions and an intelligible initial model result', () => {
  const html = render('strategy');
  assert.match(html, /Hypothetical strategy comparison/);
  assert.match(html, /not an annual rate/);
  assert.match(html, /Calculate illustration/);
  assert.match(html, /Reset demo/);
  assert.match(html, /aria-live="polite" aria-atomic="true"/);
  assert.match(html, /<legend>Edit sample assumptions<\/legend>/);
  assert.equal((html.match(/<input /g) ?? []).length, 8);
  for (const match of html.matchAll(/<input id="([^"]+)"/g)) assert.ok(html.includes(`for="${match[1]}"`));
  const strategy = model.STRATEGIES[0];
  const expected = model.calculateIllustration({ strategyId: strategy.id, amount: 10000,
    indexReturnPct: 8, allocationPct: 100, assumptions: { ...strategy.assumptions } });
  assert.ok(html.includes(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(expected.illustratedValue)));
  assert.match(html, /Unadjusted index comparison/);
  assert.match(html, /does not annualize returns or model an actual contract/);
  assert.doesNotMatch(html, /undefined|NaN|Infinity/);
  assert.doesNotMatch(html, /<form|type="submit"/);
});

test('standalone UI and model contain no persistence, remote transport or production integration', () => {
  for (const filename of ['IncomeLocalToolsDemo.tsx', 'income-tools-model.ts']) {
    const source = fs.readFileSync(path.join(here, filename), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|https?:\/\//);
  }
  assert.match(render('rates'), /Nothing is sent or saved/);
  assert.match(render('strategy'), /Nothing is sent or saved/);
});
