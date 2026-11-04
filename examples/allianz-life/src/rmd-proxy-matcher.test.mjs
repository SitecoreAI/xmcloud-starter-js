import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require('typescript');
const file = path.join(here, 'proxy.ts');
const source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
let matchers;
const visit = (node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'config') {
    const value = node.initializer.properties.find((p) => p.name.getText(ast) === 'matcher').initializer;
    matchers = value.elements.map((entry) => new RegExp('^' + entry.text + '$'));
  }
  ts.forEachChild(node, visit);
};
visit(ast);
assert.ok(matchers);
const matches = (route) => matchers.some((re) => re.test(new URL(route, 'https://demo.invalid').pathname));
const rmd = '/~/Media/Files/Global/ToolShed/dx-required-minimum-distribution-general-ed/dx-required-minimum-distribution-general-ed-xlsx.xlsx';
const lifetime = '/~/Media/Files/Global/ToolShed/dx-allianz-in-plan-annuity/dx-allianz-in-plan-annuity-xlsx.xlsx';

test('the exact public RMD workbook is served without the CMS page proxy', () => {
  assert.equal(matches(rmd), false);
});

test('matcher evaluates pathname; query handling remains the source request boundary responsibility', () => {
  assert.equal(matches(rmd + '?version=1'), false);
  assert.equal(matches('/about?view=1'), true);
});

test('unregistered lookalike media paths remain in ordinary routing', () => {
  for (const route of [rmd + '.other', rmd.replace('-xlsx.xlsx', '-other.xlsx'), rmd.toLowerCase(),
    '/~/Media/Files/Global/ToolShed/unregistered.xlsx']) assert.equal(matches(route), true, route);
});

test('existing static assets and API exclusions remain separate from page navigation', () => {
  for (const route of [lifetime, '/allianz-assets/rmd/index.html', '/fonts/allianz/AllianzNeoW01-Regular.woff2',
    '/api/test', '/sitecore/api/test']) assert.equal(matches(route), false, route);
  for (const route of ['/', '/get-answers/calculate-your-rmd', '/about', '/new-york']) assert.equal(matches(route), true, route);
});
