import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const source = postcss.parse(fs.readFileSync(new URL('../../public/allianz-assets/source-style.css', import.meta.url), 'utf8'));
const overrides = postcss.parse(fs.readFileSync(new URL('../assets/allianz-native-overrides.css', import.meta.url), 'utf8'));
const sourceSelector = '.m-navigationUtility .azl-nav-list.logo-name .logo-icon svg';
const imageSelector = '.allianz-modern .O-azl-header .m-navigationUtility .logo-icon img';
function declarations(root, selector) {
  const values = {};
  root.walkRules((rule) => {
    if (rule.selectors.includes(selector)) rule.walkDecls((decl) => { values[decl.prop] = decl.value; });
  });
  return values;
}

test('authored header logo uses the source SVG viewport with preserved intrinsic proportions', () => {
  const expected = declarations(source, sourceSelector), image = declarations(overrides, imageSelector);
  assert.equal(expected.width, '7.4rem');
  assert.equal(expected.height, '48px');
  assert.equal(image.width, expected.width);
  assert.equal(image.height, expected.height);
  assert.equal(image['object-fit'], 'contain');
  assert.equal(image['vertical-align'], 'top');
  // 122x30 source viewBox under preserveAspectRatio=xMidYMid meet.
  const viewport = { width: 7.4 * 16, height: 48 };
  const scale = Math.min(viewport.width / 122, viewport.height / 30);
  assert.ok(Math.abs((viewport.height - 30 * scale) / 2 - 9.442622950819674) < 1e-12);
  assert.equal((viewport.height - 30 * scale) / 2 + 30 * scale / 2, 24);
});

test('logo adaptation is scoped and cannot override responsive visibility or native authoring chrome', () => {
  const rules = [];
  overrides.walkRules((rule) => { if (rule.selector === imageSelector) rules.push(rule); });
  assert.equal(rules.length, 1);
  assert.equal(rules[0].parent.type, 'root');
  assert.deepEqual(Object.keys(declarations(overrides, imageSelector)).sort(), ['height', 'object-fit', 'vertical-align', 'width']);
  assert.ok(imageSelector.startsWith('.allianz-modern .O-azl-header .m-navigationUtility'));
  assert.doesNotMatch(rules[0].toString(), /!important|display:|position:|transform:|margin:|padding:|scpm|outline|page-ventures/);
});
