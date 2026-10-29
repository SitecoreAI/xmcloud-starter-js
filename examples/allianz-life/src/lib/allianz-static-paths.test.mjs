import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(fileURLToPath(new URL('./allianz-static-paths.ts', import.meta.url)), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('exports', 'module', compiled)(mod.exports, mod);
const { excludeNewYorkSearchStaticPaths } = mod.exports;

test('only the two exact English Allianz utility routes are excluded', () => {
  const entry = (site, locale, path) => ({ site, locale, path, marker: path.join('/') });
  const inputs = [
    entry('allianz-life', 'en', ['new-york', 'search']),
    entry('allianz-life', 'en', ['new-york', 'search', 'advanced-search']),
    entry('allianz-life', 'en', ['new-york', 'search', 'other']),
    entry('allianz-life', 'en', ['new-york', 'searching']),
    entry('allianz-life', 'en', ['new-york']),
    entry('allianz-life', 'en', []),
    entry('allianz-life', 'fr', ['new-york', 'search']),
    entry('other-site', 'en', ['new-york', 'search', 'advanced-search']),
    entry('allianz-life', 'en', ['New-York', 'search']),
  ];
  const before = JSON.stringify(inputs);
  const filtered = excludeNewYorkSearchStaticPaths(inputs);
  assert.deepEqual(filtered, inputs.slice(2));
  assert.equal(JSON.stringify(inputs), before);
  assert.deepEqual(excludeNewYorkSearchStaticPaths([]), []);
});

