import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test, { after } from 'node:test';
import { loadSource, sourceRoot, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const ts = require('typescript');
const filename = path.join(sourceRoot, 'components/allianz-accordion/AllianzAccordion.tsx');
const previousElement = Object.getOwnPropertyDescriptor(globalThis, 'Element');
class TestElement {
  constructor(attributes = {}) { this.attributes = attributes; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
  closest(selector) { return selector === 'a[href]' ? this.anchor ?? this : null; }
}
Object.defineProperty(globalThis, 'Element', { value: TestElement, configurable: true });
after(() => {
  if (previousElement) Object.defineProperty(globalThis, 'Element', previousElement);
  else delete globalThis.Element;
});

const nodes = (element, predicate) => {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(child => nodes(child, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
};
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const body = () => ({ value: '<p>Before <strong>preserved formatting</strong> <a href="#contact" data-source-marker="keep">contact information</a> after &amp; retained.</p>',
  metadata: { itemId: 'test-only-claims-answer', fieldId: 'test-only-answer-field', fieldType: 'Rich Text', fixtureOnly: true } });
const datasource = answer => ({ id: 'test-only-claims-faq', primaryLink: { jsonValue: { value: { href: '/report-a-death' } } },
  children: { results: [{ id: 'test-only-question', heading: { jsonValue: { value: 'Claim questions' } }, body: { jsonValue: answer } }] } });

function harness({ pathname = '/claims-information', itemPath, mode = { isNormal: true, isEditing: false, isPreview: false } } = {}) {
  const calls = [];
  const page = { mode, layout: { sitecore: { context: { ...(itemPath === undefined ? {} : { itemPath }) } } } };
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(sourceRoot));
  compiled.require = specifier => {
    if (specifier === 'react') return { ...React, useId: () => 'claims-test-instance', useState: () => [[], () => {}] };
    if (specifier === 'next/navigation') return { usePathname: () => pathname, useRouter: () => ({ push: (...args) => calls.push(args) }) };
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, useSitecore: () => ({ page }) };
    if (specifier.endsWith('.css')) return {};
    const local = /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) return loadSource([`${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate)));
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  const draw = (answer = body(), variant = 'Default') => compiled.exports[variant]({ params: {}, fields: { data: { datasource: datasource(answer) } } });
  return { calls, draw, richText: (answer, variant) => nodes(draw(answer, variant), node => node.type === sdk.RichText)[0] };
}

function click({ attributes = {}, event: overrides = {}, contained = true, nested = true } = {}) {
  const anchor = new TestElement({ href: '#contact', ...attributes });
  const child = new TestElement(); child.anchor = anchor;
  let prevented = 0;
  return { event: { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    target: nested ? child : anchor, currentTarget: { contains: node => contained && node === anchor },
    preventDefault() { prevented++; }, ...overrides }, prevented: () => prevented };
}

test('actual Default body routes contained primary contact clicks using only the validated fragment', () => {
  for (const attributes of [{}, { target: '' }, { target: '_self' }, { target: '_SELF' }]) {
    const current = harness(), leaf = current.richText(), input = click({ attributes });
    leaf.props.onClick(input.event);
    assert.equal(input.prevented(), 1);
    assert.deepEqual(current.calls, [['#contact']]);
    const syntheticCurrent = 'http://127.0.0.1/claims-information?sample=keep';
    assert.equal(new URL(current.calls[0][0], syntheticCurrent).search, '?sample=keep');
  }
});

test('actual handler leaves modified, nonprimary, disabled, alternate and noncontained clicks native', () => {
  const cases = [
    ...['metaKey', 'ctrlKey', 'shiftKey', 'altKey', 'defaultPrevented'].map(name => ({ event: { [name]: true } })),
    ...[1, 2].map(button => ({ event: { button } })),
    ...['_blank', '_parent', '_top', 'named', ' _self '].map(target => ({ attributes: { target } })),
    { attributes: { download: '' } }, { attributes: { 'aria-disabled': 'true' } }, { attributes: { 'aria-disabled': 'false' } },
    ...['#other', '#Contact', '#contact ', '#%63ontact', '/claims-information#contact', '?sample=keep#contact', 'javascript:unused'].map(href => ({ attributes: { href } })),
    { contained: false }, { event: { target: null } }, { event: { target: {} } },
  ];
  for (const input of cases) {
    const current = harness(), target = click(input);
    current.richText().props.onClick(target.event);
    assert.equal(target.prevented(), 0, JSON.stringify(input));
    assert.deepEqual(current.calls, [], JSON.stringify(input));
  }
});

test('routing is limited to the exact Claims route and explicit normal mode, with context precedence', () => {
  for (const options of [
    { pathname: '/about' }, { pathname: '/new-york/claims-information' }, { pathname: '/claims-information/' },
    { pathname: '/Claims-information' }, { itemPath: '/other' },
    { mode: {} }, { mode: { isNormal: false } },
    { mode: { isNormal: true, isEditing: true } }, { mode: { isNormal: true, isPreview: true } },
  ]) assert.equal(harness(options).richText().props.onClick, undefined, JSON.stringify(options));
  for (const options of [{ itemPath: '/claims-information', pathname: '/other' }, { itemPath: '' }, {}]) {
    const current = harness(options), input = click();
    current.richText().props.onClick(input.event);
    assert.deepEqual(current.calls, [['#contact']]);
  }
});

test('whole safe RichText Field and metadata remain unchanged, with no SDK selector override', () => {
  for (const mode of [{ isNormal: true, isEditing: false, isPreview: false },
    { isNormal: false, isEditing: true, isPreview: false }, { isNormal: false, isEditing: false, isPreview: true }]) {
    const answer = freeze(body()), before = JSON.stringify(answer), current = harness({ mode });
    const leaf = current.richText(answer);
    assert.equal(leaf.props.field.value, answer.value);
    assert.equal(leaf.props.field.metadata, answer.metadata);
    assert.equal(leaf.props.internalLinksSelector, undefined);
    assert.equal(leaf.props.editable, mode.isEditing);
    if (mode.isEditing) assert.equal(leaf.props.field, answer);
    assert.equal(JSON.stringify(answer), before);
    assert.equal(current.richText(answer, 'FaqRow').props.onClick, undefined);
    assert.ok(nodes(current.draw(answer), node => node.type === sdk.Link).every(node => node.props.onClick === undefined));
  }
});
