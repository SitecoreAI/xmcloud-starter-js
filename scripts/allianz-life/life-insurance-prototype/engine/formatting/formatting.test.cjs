'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cjs = require('./source-numeral-formatters.cjs');
const digest = (x) => crypto.createHash('sha256').update(x).digest('hex');
const ORIGINAL_BUNDLE_HASH = '75aa6f4d5c0dd662839844b490f99ab1534a24c8330f81b1c5cfd31a9d7371d7';
const originalFactory = (source) => {
  const start = source.indexOf('7242(e){');
  const end = source.indexOf('};\nconst numeralModule=',start);
  assert.ok(start >= 0 && end > start);
  return source.slice(start,end);
};

test('CJS and browser ESM retain the exact source factory with dependency-closed provenance', () => {
  const provenance = JSON.parse(fs.readFileSync(path.join(__dirname,'provenance.json'),'utf8'));
  const cjsSource = fs.readFileSync(path.join(__dirname,'source-numeral-formatters.cjs'),'utf8');
  const esmSource = fs.readFileSync(path.join(__dirname,'source-numeral-formatters.mjs'),'utf8');
  assert.equal(provenance.sourceBundleSHA256,ORIGINAL_BUNDLE_HASH);
  assert.equal(provenance.sourceBundleBytes,1655293);
  assert.equal(provenance.moduleId,7242);
  assert.deepEqual(provenance.webpackDependencies,[]);
  assert.equal(provenance.fullBundleSaved,false);
  assert.equal(Buffer.byteLength(originalFactory(cjsSource)),11104);
  assert.equal(digest(originalFactory(cjsSource)),provenance.originalModuleSHA256);
  assert.equal(originalFactory(esmSource),originalFactory(cjsSource));
  assert.equal(digest(cjsSource),provenance.outputSHA256);
  assert.equal(digest(esmSource),provenance.browserESM.outputSHA256);
  assert.equal(cjs.numeral.version,'2.0.6');
  assert.equal(cjs.numeral.locale(),'en');
});

test('original currency wrapper preserves source positive and negative half rounding', () => {
  const cases = [
    [0,'$0.00'],[1,'$1.00'],[-1,'-$1.00'],
    [1.005,'$1.01'],[-1.005,'-$1.00'],
    [1234.565,'$1,234.57'],[-1234.565,'-$1,234.56'],
    [999999999,'$999,999,999.00'],['1234.565','$1,234.57'],
    [0.00005,'$0.00'],[-0.00005,'0$.00'],
  ];
  for (const [input,expected] of cases) assert.equal(cjs.hs(input),expected,`input ${String(input)}`);
  assert.strictEqual(cjs.formatCurrency,cjs.hs);
});

test('original percent wrapper uses ratios and preserves source half rounding at rate boundaries', () => {
  const cases = [
    [0,'0.00%'],[0.12,'12.00%'],[-0.12,'-12.00%'],
    [0.025,'2.50%'],[0.00005,'0.01%'],[-0.00005,'0.00%'],
    [1,'100.00%'],[-1,'-100.00%'],
  ];
  for (const [input,expected] of cases) assert.equal(cjs.ho(input),expected,`input ${String(input)}`);
  assert.strictEqual(cjs.formatPercent,cjs.ho);
});

test('invalid/NaN formatting behavior is preserved and must not substitute for input validation', () => {
  for (const value of [NaN,null,undefined,'','not-a-number']) {
    assert.equal(cjs.hs(value),'$0.00');
    assert.equal(cjs.ho(value),'0.00%');
  }
  assert.equal(cjs.hs(Infinity),'$NaN');
  assert.equal(cjs.hs(-Infinity),'N$aN');
  assert.equal(cjs.ho(Infinity),'NaN%');
  assert.equal(cjs.ho(-Infinity),'NaN%');
  const unsupported = Symbol('formatter-unsupported');
  assert.strictEqual(cjs.hs(unsupported),unsupported);
  assert.strictEqual(cjs.ho(unsupported),unsupported);
});

test('browser ESM exports exactly the same original wrapper behavior without CJS globals', async () => {
  const esm = await import('./source-numeral-formatters.mjs');
  assert.equal(esm.numeral.version,cjs.numeral.version);
  for (const value of [0,1.005,-1.005,1234.565,-1234.565,0.00005,-0.00005,-0.12,0.12,NaN,Infinity,-Infinity,'invalid',null,undefined]) {
    assert.equal(esm.hs(value),cjs.hs(value));
    assert.equal(esm.ho(value),cjs.ho(value));
  }
  assert.strictEqual(esm.formatCurrency,esm.hs);
  assert.strictEqual(esm.formatPercent,esm.ho);
});
