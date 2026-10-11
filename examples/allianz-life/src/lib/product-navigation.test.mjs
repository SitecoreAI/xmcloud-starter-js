import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const postcss = require('postcss');
const directory = path.join(sourceRoot, 'components/allianz-product-navigation');
const filename = path.join(directory, 'AllianzProductNavigation.tsx');
const component = loadSource(filename);
const currentId = '68D665F3-E5C3-5823-B1B8-D475CAEDB5B1';
const titleFieldId = '97c0f508-2a3f-5a3d-a7ad-12f5232988b1';
const linkFieldId = '71b8f017-b44a-5706-bf18-73e0fea82b0d';
const base = 'https://www.allianzlife.com/what-we-offer/Life-Insurance/Indexed-Universal-Life';
const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const metadata = (itemId, fieldId, fieldType) => ({ itemId, fieldId, fieldType });
function item(number, title, href, targetId) {
  const itemId = id(number);
  return { id: itemId,
    title: { jsonValue: { value: title, metadata: metadata(itemId, titleFieldId, 'Single-Line Text') } },
    link: { jsonValue: { value: { href, text: title, linktype: targetId ? 'internal' : 'external',
      ...(targetId ? { id: `{${targetId}}` } : {}), target: '', querystring: '', anchor: '', 'aria-label': '' },
      metadata: metadata(itemId, linkFieldId, 'General Link') } },
  };
}
function model() {
  return { datasource: { primaryNav: { targetItems: [
    item(1, 'Allianz Life Accumulator', base),
    item(2, 'Overview', '/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator', currentId),
    item(3, 'FAQ', `${base}/Allianz-Life-Accumulator/frequently-asked-questions`),
    item(4, 'Tools & Resources', `${base}/Allianz-Life-Accumulator/tools-and-resources`),
    item(5, 'Rates', `${base}/Allianz-Life-Accumulator/Rates`),
  ] } }, contextItem: { id: currentId } };
}
const Wrapper = ({ fields, params }) => React.createElement(component.Default, {
  fields: { data: fields?.data?.datasource }, params,
});
const renderModel = (data, editing = false, params = {}) => render(Wrapper, data, editing, params);
const anchors = markup => [...markup.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)]
  .map(match => ({ href: match[1].replaceAll('&amp;', '&'), text: match[2].replace(/<[^>]*>/g, '').replaceAll('&amp;', '&'), tag: match[0] }));
const markers = markup => [...markup.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

test('installed SDK preserves the source product title and four ordered tabs, real externals and native Overview', () => {
  const data = model(), before = JSON.stringify(data);
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const markup = renderModel(data), links = anchors(markup);
    assert.deepEqual(links.map(link => link.href), data.datasource.primaryNav.targetItems.map(item => item.link.jsonValue.value.href));
    assert.deepEqual(links.map(link => link.text), ['Allianz Life Accumulator', 'Overview', 'FAQ', 'Tools & Resources', 'Rates']);
    assert.match(links[1].tag, /class="-is-active"/);
    assert.match(links[1].tag, /aria-current="page"/);
    assert.equal((markup.match(/aria-current="page"/g) ?? []).length, 1);
    assert.doesNotMatch(markup, /kind="open"|allianz-missing-data/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('current state uses destination page GUID, with arbitrary authored labels, order and unrelated navigation-item IDs', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  const data = model(), entries = data.datasource.primaryNav.targetItems;
  entries[0] = item(44, 'An authored product title', '/about', id(80));
  entries[1] = item(45, 'Summary', '/about/ventures', id(81));
  entries[2] = item(46, 'Changed tab', '/about', id(82));
  data.datasource.primaryNav.targetItems = [entries[0], entries[2], entries[1]];
  for (const context of [id(82), `{${id(82).toUpperCase()}}`, id(82).replaceAll('-', '')]) {
    data.contextItem.id = context;
    const markup = renderModel(data), links = anchors(markup);
    assert.deepEqual(links.map(link => link.text), ['An authored product title', 'Changed tab', 'Summary']);
    assert.match(links[1].tag, /aria-current="page"/);
    assert.doesNotMatch(links[2].tag, /aria-current/);
  }
  for (const context of [entries[2].id, undefined, '', 'not-a-native-page-id']) {
    data.contextItem.id = context;
    assert.doesNotMatch(renderModel(data), /aria-current/);
  }
});

test('editing keeps all ten native title/link fields exactly once, expands the menu and preserves every target and field object', () => {
  const data = model(), before = JSON.stringify(data);
  const markup = renderModel(data, true), actual = markers(markup);
  assert.equal(actual.length, 10);
  for (const item of data.datasource.primaryNav.targetItems) {
    for (const fieldId of [titleFieldId, linkFieldId]) {
      assert.equal(actual.filter(marker => marker.itemId === item.id && marker.fieldId === fieldId).length, 1);
    }
  }
  assert.match(markup, /m-navigation-secondary-open allianz-product-navigation-editing/);
  assert.match(markup, /aria-expanded="true"/);
  assert.deepEqual(anchors(markup).map(link => link.href), anchors(renderModel(data)).map(link => link.href));
  assert.equal(data.datasource.primaryNav.targetItems[1].link.jsonValue.value.id, `{${currentId}}`);
  assert.equal(JSON.stringify(data), before);
});

test('missing data uses the normal fallback, while native cleared fields keep their authoring surfaces and do not borrow labels', () => {
  for (const data of [undefined, {}, { datasource: {} }, { datasource: { primaryNav: { targetItems: [] } } }]) {
    assert.match(renderModel(data), /allianz-missing-data/);
  }
  const data = model(), product = data.datasource.primaryNav.targetItems[0];
  product.title.jsonValue.value = '';
  product.link.jsonValue.value = { href: '' };
  const markup = renderModel(data, true);
  assert.equal(markers(markup).filter(marker => marker.itemId === product.id).length, 2);
  assert.doesNotMatch(markup, /Allianz Life Accumulator<|indexed-universal-life"/);
});

test('mobile disclosure has separate native product link and button, linked ARIA controls, repeated toggles and an expanded author view', () => {
  let open = false, editing = false;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(sourceRoot));
  compiled.require = specifier => {
    if (specifier === 'react') return { ...React, useState: () => [open, updater => { open = updater(open); }], useId: () => 'product-tabs' };
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, useSitecore: () => ({ page: { mode: { isEditing: editing } } }) };
    if (specifier.endsWith('.css')) return {};
    if (specifier === 'lib/allianz-fields') return loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
    if (specifier === 'components/content-sdk/NoDataFallback') return loadSource(path.join(sourceRoot, 'components/content-sdk/NoDataFallback.tsx'));
    return require(specifier);
  };
  const ts = require('typescript');
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  for (const expected of [false, true, false, true, false]) {
    const nav = compiled.exports.Default({ fields: { data: model() }, params: {} });
    const [productLink, button] = nav.props.children[0].props.children;
    assert.equal(productLink.type, sdk.Link);
    assert.equal(button.type, 'button');
    assert.equal(button.props.type, 'button');
    assert.equal(button.props['aria-expanded'], expected);
    assert.equal(button.props['aria-controls'], nav.props.children[1].props.id);
    assert.equal(button.props['aria-label'], 'Toggle product navigation');
    assert.equal(button.props.href, undefined);
    assert.equal(button.props.children.type, 'i');
    button.props.onClick();
  }
  editing = true; open = false;
  const nav = compiled.exports.Default({ fields: { data: model() }, params: {} });
  assert.equal(nav.props.children[0].props.children[1].props['aria-expanded'], true);
  assert.equal(nav.props.children[0].props.children[1].props.disabled, true);
});

test('recovered desktop gray tabs and 703/704 breakpoint remain source-owned, with only scoped disclosure and author CSS', () => {
  const source = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8'));
  const local = postcss.parse(fs.readFileSync(path.join(directory, 'AllianzProductNavigation.css'), 'utf8'));
  const rules = (root, selector, media) => {
    const found = [];
    root.walkRules(rule => {
      if (rule.selector === selector && (rule.parent.type === 'atrule' ? rule.parent.params : undefined) === media) {
        found.push(Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value])));
      }
    });
    return Object.assign({}, ...found);
  };
  assert.equal(rules(source, '.m-navigation-secondary', '(min-width:704px)').background, '#ececec');
  assert.equal(rules(source, '.m-navigation-secondary .nav-sec-list-title', '(min-width:704px)').display, 'none');
  assert.equal(rules(source, '.m-navigation-secondary .nav-sec-list', '(max-width:703px)')['max-height'], '0');
  assert.equal(rules(source, '.m-navigation-secondary-open .nav-sec-list', '(max-width:703px)').opacity, '1');
  const sourceLinkColor = rules(source, '.a-link,a').color;
  const titleSelector = '.allianz-product-navigation .nav-sec-list-title';
  assert.equal(sourceLinkColor, '#005074');
  assert.equal(rules(source, '.m-navigation-secondary .nav-sec-list-title').background, '#ececec');
  assert.equal(rules(local, titleSelector).color, sourceLinkColor,
    'The new div wrapper must retain the recovered anchor color instead of inheriting a surrounding section color');
  assert.equal(rules(local, '.allianz-product-navigation .nav-sec-product-link').color, 'inherit');
  assert.equal(rules(local, '.allianz-product-navigation button.nav-sec-toggle').color, 'inherit');
  const hoverSelector = '.m-navigation-secondary .nav-sec-list-title:hover';
  const mobileHover = rules(source, hoverSelector, '(max-width:703px)');
  assert.equal(mobileHover.color, '#fff');
  assert.equal(mobileHover.background, '#223e7c');
  const specificity = selector => (selector.match(/[.:]/g) ?? []).length;
  assert.ok(specificity(hoverSelector) > specificity(titleSelector),
    'The source mobile hover color/background pair must still win regardless of CSS import order');
  local.walkRules(rule => assert.ok(rule.selector.split(',').every(selector => selector.trim().startsWith('.allianz-product-navigation'))));
  assert.equal(rules(local, '.allianz-product-navigation:not(.m-navigation-secondary-open) .nav-sec-list', '(max-width: 703px)').visibility, 'hidden');
  assert.equal(rules(local, '.allianz-product-navigation.m-navigation-secondary-open .nav-sec-list', '(max-width: 703px)').visibility, 'visible');
  const authorSelector = '.allianz-product-navigation.allianz-product-navigation-editing .nav-sec-list-title';
  assert.equal(rules(local, authorSelector).display, 'flex');
  assert.ok((authorSelector.match(/\./g) ?? []).length > 2, 'Author title/link fields must beat source desktop hiding regardless of CSS import order');
});
