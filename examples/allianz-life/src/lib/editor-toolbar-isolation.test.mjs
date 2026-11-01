import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const css = fs.readFileSync(new URL('../../public/allianz-assets/source-style.css', import.meta.url), 'utf8');
const root = postcss.parse(css);
const boundary = ':where(.allianz-modern *, .allianz-legacy *)';
const nyScrollbarBoundary = ":where(html:not(:has(#page-new-york.allianz-legacy.new-york)), html:not(:has(#page-new-york.allianz-legacy.new-york)) *, .mfe *)";
const scrollbarFallback = "@supports not (selector(html:has(*)) and selector(:where(html))){::-webkit-scrollbar{-webkit-appearance:none;width:6px;height:6px}::-webkit-scrollbar:horizontal{height:6px}::-webkit-scrollbar:vertical{width:6px}::-webkit-scrollbar-thumb{border-radius:8px;background-color:#005074}::-webkit-scrollbar-track{background:#ececec}}";
const scrollbarSuffixes = ['::-webkit-scrollbar', '::-webkit-scrollbar:horizontal', '::-webkit-scrollbar:vertical', '::-webkit-scrollbar-thumb', '::-webkit-scrollbar-track'];
const typeSelector = /(^|[\s>+~,(])(?:button|input)(?=$|[^\w-])/;
const rules = [];
root.walkRules((rule) => rules.push(rule));

test('source button and input rules cannot select native controls outside the site wrapper', () => {
  const affected = rules.filter((rule) => rule.selectors.some((selector) => typeSelector.test(selector)));
  assert.equal(affected.length, 82);
  assert.equal(affected.reduce((total, rule) => total + rule.selectors.length, 0), 144);
  for (const rule of affected) {
    for (const selector of rule.selectors) assert.ok(selector.includes(boundary), selector);
  }
  // The witnessed native toolbar is a separate direct child of BODY, with
  // no .allianz-modern ancestor. Its generated class names are unnecessary.
  assert.doesNotMatch(css, /sc-page-element-outline--|icon-button--|sort--eaAVX/);
});

test('zero-specificity scope preserves every original selector, declaration and media byte', () => {
  const source = css.replaceAll(boundary, '').replaceAll(nyScrollbarBoundary, '').replace(scrollbarFallback, '');
  assert.equal(css.split(nyScrollbarBoundary).length - 1, 5);
  for (const suffix of scrollbarSuffixes) {
    assert.equal(rules.filter((rule) => rule.selector === nyScrollbarBoundary + suffix).length, 1);
  }
  assert.equal(Buffer.byteLength(source), 396404);
  assert.equal(createHash('sha256').update(source).digest('hex'),
    '8e750d00a5fadb19847dbe45bd21576acfc3586a8e2fb60979720d02d13f471c');
  assert.equal(css.split(boundary).length - 1, 144);
  // :where adds no specificity. Bare button rules must not gain a class
  // specificity and displace the source's accordion/button variant rules.
  assert.ok(rules.some((rule) => rule.selectors.includes(`button${boundary}`)));
  assert.ok(!rules.some((rule) => rule.selectors.includes('.allianz-modern button')));
});

test('visitor button geometry and the original 703px mobile transition remain intact', () => {
  const base = rules.find((rule) => rule.parent.type === 'root' &&
    rule.selectors.includes(`button${boundary}`) &&
    rule.nodes.some((node) => node.type === 'decl' && node.prop === 'padding'));
  assert.ok(base);
  const declarations = Object.fromEntries(base.nodes.filter((node) => node.type === 'decl')
    .map((node) => [node.prop, node.value]));
  assert.equal(declarations.padding, '8px 18px');
  assert.equal(declarations.margin, '0 0 24px');
  assert.equal(declarations['min-width'], 'fit-content');
  assert.equal(declarations['line-height'], '1.5rem');
  const mobile = rules.find((rule) => rule.parent.type === 'atrule' &&
    rule.parent.params === '(max-width:703px)' &&
    rule.selectors.includes(`button${boundary}`) &&
    rule.nodes.some((node) => node.type === 'decl' && node.prop === 'width' && node.value === '100%'));
  assert.ok(mobile);
});

test('font inheritance and background shorthand stay inside the content boundary', () => {
  const inherited = rules.find((rule) => rule.selectors.includes(`button${boundary}`) &&
    rule.selectors.includes(`input${boundary}`) &&
    rule.nodes.some((node) => node.type === 'decl' && node.prop === 'font' && node.value === 'inherit'));
  assert.ok(inherited);
  const background = rules.filter((rule) => rule.selectors.some((selector) => selector.startsWith('button') && selector.includes(boundary)) &&
    rule.nodes.some((node) => node.type === 'decl' && node.prop === 'background'));
  assert.ok(background.length >= 3);
  for (const rule of background) assert.ok(rule.selectors.every((selector) => selector.includes(boundary)));
});

test('source IDs on the site wrapper keep their original control selectors', () => {
  for (const id of ['page-new-business-rates', 'dx-rila-new-business-rates']) {
    assert.ok(rules.some((rule) => rule.selectors.includes(
      `#${id} .expand-collapse-row .button-row button${boundary}`)));
  }
  // The original ID remains the ancestor of button, so it can be on the
  // wrapper itself. Scope is checked on the control, not before that ID.
  assert.ok(!rules.some((rule) => rule.selectors.some((selector) => selector.startsWith(boundary))));
});

test('native input pseudo-elements remain valid after scope is inserted on the input', () => {
  for (const suffix of ['::-webkit-inner-spin-button', '::-webkit-outer-spin-button']) {
    assert.ok(rules.some((rule) => rule.selectors.includes(`input[type=number]${boundary}${suffix}`)));
  }
  assert.ok(rules.some((rule) => rule.selectors.includes(`.m-form-group.has-error input${boundary}::placeholder`)));
  assert.ok(!rules.some((rule) => rule.selectors.some((selector) => /::[^,]*:where\(/.test(selector))));
});

test('the site wrapper contains the notice, header, main and footer in both page modes', () => {
  const layout = fs.readFileSync(new URL('../Layout.tsx', import.meta.url), 'utf8');
  const wrapper = layout.indexOf('className={`${mode.isEditing');
  assert.ok(wrapper >= 0);
  for (const markup of ['<ConsentControls />', '{header}', '<main id="main">', '{footer}']) {
    assert.ok(layout.indexOf(markup, wrapper) > wrapper, markup);
  }
  assert.match(layout, /'allianz-modern'/);
  assert.ok(layout.includes('allianz-legacy'));
  const notice = fs.readFileSync(new URL('../components/content-sdk/ConsentControls.tsx', import.meta.url), 'utf8');
  assert.match(notice, /page\?\.mode\?\.isEditing/);
});

test('unsupported selector engines retain the five original scrollbar rules', () => {
  const fallback = rules.filter((rule) => rule.parent.type === 'atrule' && rule.parent.name === 'supports' && rule.parent.params === 'not (selector(html:has(*)) and selector(:where(html)))');
  assert.equal(fallback.length, 5);
  assert.deepEqual(fallback.map((rule) => rule.selector), scrollbarSuffixes);
  assert.equal(css.split(scrollbarFallback).length - 1, 1);
});
