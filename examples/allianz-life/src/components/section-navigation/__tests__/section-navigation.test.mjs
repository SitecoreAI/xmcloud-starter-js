import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { bindings, data, dataset, directory, id, load, require, sourceRoot, text } from './section-navigation-test-helper.mjs';
import { render } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const postcss = require('postcss');
const componentDirectory = path.dirname(directory);
const component = load(path.join(componentDirectory, 'SectionNavigation.tsx'));
const props = load(path.join(componentDirectory, 'section-navigation.props.ts'));
const read = (file) => fs.readFileSync(path.join(directory, file), 'utf8');
const hrefs = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((match) => match[1]);
const plain = (html) => html.replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').trim();
const links = (html) => [...html.matchAll(/<li><a\b[^>]*>(.*?)<\/a><\/li>/g)].map((match) => plain(match[1]));
const sourceLinks = (html) => [...html.matchAll(/<li><a\b[^>]*href="([^"]*)"[^>]*aria-label="([^"]*)"[^>]*>(.*?)<\/a><\/li>/g)]
  .map((match) => ({ href: match[1], label: match[2], text: plain(match[3]), active: /class="-is-active"/.test(match[0]) }));
const renderingUid = 'native-section-navigation';
const Wrapper = ({ fields, params }) => {
  const input = fields?.data?.datasource;
  return React.createElement(sdk.ComponentPropsContext, { value: input?.componentProps ?? {
    [renderingUid]: { automaticSectionNavigation: input?.automaticSectionNavigation },
  } }, React.createElement(component.Default, {
    rendering: input?.rendering ?? { uid: renderingUid, componentName: 'SectionNavigation' },
    params, fields: input?.fields,
  }));
};
const renderData = (automaticSectionNavigation, editing = false, params = {}) => render(Wrapper, { automaticSectionNavigation }, editing, params);

function fixture(witness = 'ventures.source.html') {
  const source = sourceLinks(read(witness)), rootId = id(100);
  const root = { id: rootId, path: '/sitecore/content/Test/Site/Home/about/ventures', url: { path: source[0].href },
    navigationTitle: text('Ventures', rootId) };
  const items = source.slice(1).map((link, index) => ({ id: id(index + 1), path: `${root.path}/${index + 1}`,
    parent: { id: rootId }, url: { path: link.href }, navigationTitle: text(link.label, id(index + 1)) }));
  const activeIndex = source.findIndex((link) => link.active);
  return { root, items, currentId: activeIndex === 0 ? rootId : items[activeIndex - 1].id, complete: true, status: 'ready' };
}

test('canonical source fragments use LF while preserving exact original-byte provenance', () => {
  const manifest = JSON.parse(read('SOURCE-MANIFEST.json'));
  assert.equal(manifest.sources[0].bytes, 119181);
  assert.equal(manifest.sources[0].sha256, 'f6771c2f64c1e089986dbc8770c32438b1f11161acc162d09322ed4c0392566b');
  for (const entry of manifest.sources) {
    const bytes = fs.readFileSync(path.join(directory, entry.fragment));
    assert.equal(bytes.length, entry.canonicalFragmentBytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.canonicalFragmentSha256);
    assert.equal(bytes.includes(13), false, 'Git-portable witnesses must contain LF line endings');
    const original = Buffer.from(bytes.toString().replaceAll('\n', '\r\n'));
    assert.equal(original.length, entry.fragmentBytes);
    assert.equal(createHash('sha256').update(original).digest('hex'), entry.fragmentSha256);
    assert.equal(entry.canonicalFragmentNormalization, 'CRLF to LF only');
    const html = bytes.toString();
    assert.match(html, /<nav class="m-navigation-secondary">/);
    assert.match(html, /Ventures <i class="c-icon c-icon--chevron-down"><\/i>/);
    assert.deepEqual(sourceLinks(html).map((link) => link.text), ['Overview', 'Team', 'Portfolio', 'Newsroom']);
  }
});

test('real installed SDK reproduces exact source ordered links and active state on Overview and Portfolio', () => {
  for (const witness of ['ventures.source.html', 'portfolio.source.html']) {
    const automatic = fixture(witness), source = sourceLinks(read(witness)), before = JSON.stringify(automatic);
    const html = renderData(automatic);
    assert.deepEqual(hrefs(html), source.map((link) => link.href));
    assert.deepEqual(links(html), source.map((link) => link.text));
    assert.match(html, /class="m-navigation-secondary allianz-section-navigation"/);
    const active = html.match(/<a\b[^>]*class="-is-active"[^>]*>(.*?)<\/a>/);
    assert.equal(plain(active[1]), source.find((link) => link.active).text);
    assert.match(active[0], /aria-current="page"/);
    assert.equal(plain(html.match(/<button\b[^>]*>(.*?)<\/button>/)[1]), 'Ventures');
    assert.equal(JSON.stringify(automatic), before);
  }
});

test('read-only SDK captions emit no derived editing chrome while the same owning-page caption remains editable', () => {
  const automatic = fixture(), original = automatic.items[0].navigationTitle.jsonValue;
  const editing = renderData(automatic, true);
  assert.doesNotMatch(editing, /kind="open"|contenteditable|data-field-id|<code/);
  assert.deepEqual(hrefs(editing), hrefs(renderData(automatic)));
  assert.equal(props.sectionNavigationData(automatic, true).items[0].navigationTitle.jsonValue, original);
  const OwnerTitle = () => React.createElement(sdk.Text, { field: original, editable: true });
  assert.match(render(OwnerTitle, {}, true), /kind="open"/);
  assert.equal(automatic.root.navigationTitle.jsonValue.value, 'Ventures');
  assert.equal(props.SECTION_NAVIGATION_OVERVIEW.value, 'Overview');
});

test('blank native fields stay blank in editing mode and missing fields never borrow a title or slug', () => {
  for (const owner of ['root', 'child']) {
    const automatic = fixture(), page = owner === 'root' ? automatic.root : automatic.items[0];
    page.navigationTitle.jsonValue.value = '';
    assert.equal(props.sectionNavigationData(automatic).issue, 'missing-title');
    const field = page.navigationTitle.jsonValue;
    assert.equal(props.sectionNavigationData(automatic, true).issue, undefined);
    const html = renderData(automatic, true);
    assert.doesNotMatch(html, /data-field-id|contenteditable|kind="open"/);
    assert.equal(page.navigationTitle.jsonValue, field);
    delete page.navigationTitle;
    assert.equal(props.sectionNavigationData(automatic, true).issue, 'missing-title');
  }
});

test('missing, unavailable, duplicate, malformed or incomplete automatic data emits no manual or partial menu', () => {
  const automatic = fixture();
  for (const invalid of [undefined, {}, { ...automatic, complete: false }, { ...automatic, status: 'unavailable' },
    { ...automatic, error: 'unbound' }, { ...automatic, root: undefined }, { ...automatic, currentId: undefined },
    { ...automatic, items: [automatic.items[0], null] }, { ...automatic, items: [automatic.items[0], automatic.items[0]] },
    { ...automatic, items: [automatic.root] }, { ...automatic, items: [{ ...automatic.items[0], id: 'bad' }] },
    { ...automatic, root: { ...automatic.root, id: 'bad' } }]) {
    assert.equal(hrefs(renderData(invalid)).length, 0);
    assert.match(renderData(invalid), /Section navigation is temporarily unavailable/);
    assert.match(renderData(invalid, true), /verified native bindings/);
  }
  const rootOnly = { ...automatic, items: [], currentId: automatic.root.id };
  assert.deepEqual(hrefs(renderData(rootOnly)), [automatic.root.url.path]);
});

test('arbitrary native sections and new pages retain order with no fixture selector or manual list', () => {
  const records = dataset(17, '/new-authored-section');
  const automatic = { root: records.root, items: records.children.reverse(), currentId: records.current.id, complete: true, status: 'ready' };
  const html = renderData(automatic);
  assert.deepEqual(hrefs(html), [records.root.url.path, ...records.children.map((item) => item.url.path)]);
  assert.equal(links(html).length, 18);
  assert.equal(links(html)[0], 'Overview');
  for (const currentId of [`{${records.current.id.toUpperCase()}}`, records.current.id.replaceAll('-', '')]) {
    assert.equal((renderData({ ...automatic, currentId }).match(/aria-current="page"/g) ?? []).length, 1);
  }
  assert.doesNotMatch(renderData({ ...automatic, currentId: id(999) }), /aria-current|class="-is-active"/);
});

test('URLs come from native pages and invalid service/encoded/path URLs fail without changing labels', () => {
  const automatic = fixture();
  const renamed = { ...automatic.items[0], navigationTitle: text('Changed authored caption', automatic.items[0].id) };
  assert.equal(props.sectionNavigationLink(renamed).value.href, automatic.items[0].url.path);
  for (const href of ['https://elsewhere.example/page', '//elsewhere.example/page', 'javascript:alert(1)', '/api/private',
    '/sitecore/shell', '/login', '/account', '/about\\page', '/about%2Fpage', '/about/%5Cpage', '/about/%20page',
    '/about/%00page', '/about/../api/private', '/about/%2e%2e/api/private', '/invalid%value', '/about/page?query=1', '/about/page#hash']) {
    const bad = { ...automatic.items[0], url: { path: href } };
    assert.equal(props.sectionNavigationLink(bad), undefined, href);
    assert.equal(props.sectionNavigationData({ ...automatic, items: [bad] }).issue, 'invalid-url');
  }
  const hostile = fixture(); hostile.items[0].navigationTitle.jsonValue.value = 'Authored <script>alert(1)</script> & title';
  assert.match(renderData(hostile), /Authored &lt;script&gt;/);
  assert.doesNotMatch(renderData(hostile), /<script>/);
});

test('real SDK ComponentPropsContext isolates rendering UID and ignores manual fields', () => {
  const automatic = fixture();
  const input = { automaticSectionNavigation: automatic, componentProps: {
    [renderingUid]: { automaticSectionNavigation: automatic },
    unrelated: { automaticSectionNavigation: data.unavailableSectionNavigation() },
  } };
  assert.deepEqual(hrefs(render(Wrapper, input)), hrefs(renderData(automatic)));
  for (const rendering of [{ uid: 'unrelated' }, {}, { uid: '' }]) {
    assert.equal(hrefs(render(Wrapper, { ...input, rendering, fields: { data: { datasource: {
      links: { targetItems: automatic.items }, heading: automatic.root.navigationTitle,
    } } } })).length, 0);
  }
});

test('disclosure uses native button semantics, root title and controls, with repeated functional state toggles', () => {
  const automatic = fixture('portfolio.source.html');
  const html = renderData(automatic, false, { RenderingIdentifier: 'native-section-strip', theme: 'green', headingLevel: 'h2' });
  const button = html.match(/<button\b([^>]*)>/)[1];
  assert.match(button, /type="button"/);
  assert.match(button, /class="nav-sec-list-title"/);
  assert.match(button, /aria-expanded="false"/);
  const controls = button.match(/aria-controls="([^"]+)"/)[1];
  assert.ok(html.includes(`<ul class="nav-sec-list" id="${controls}">`));
  assert.match(html, /id="native-section-strip"/);
  assert.match(html, /c-icon--chevron-down" aria-hidden="true"/);
  assert.doesNotMatch(html, /t-bg-green|<h2|m-navigation-secondary-open/);
  assert.doesNotMatch(button, /href=|tabindex=/);
  const filename = path.join(componentDirectory, 'SectionNavigation.tsx');
  const source = fs.readFileSync(filename, 'utf8');
  assert.doesNotMatch(source, /onKeyDown|onKeyUp|window\.|location\.|router\.|preventDefault/);
  let open = false;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(sourceRoot));
  compiled.require = (specifier) => {
    if (specifier === 'react') return { ...React, useState: () => [open, (updater) => { open = updater(open); }], useId: () => 'toggle-list' };
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk,
      useSitecore: () => ({ page: { mode: { isEditing: false } } }),
      useComponentProps: () => ({ automaticSectionNavigation: automatic }),
    };
    if (specifier.endsWith('.css')) return {};
    if (specifier === './section-navigation.props') return props;
    if (specifier === 'lib/section-navigation-data') return data;
    return require(specifier);
  };
  const ts = require('typescript');
  compiled._compile(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  for (const expected of [false, true, false, true, false]) {
    const element = compiled.exports.Default({ rendering: { uid: renderingUid } });
    const disclosure = element.props.children[0];
    assert.equal(disclosure.type, 'button');
    assert.equal(disclosure.props['aria-expanded'], expected);
    assert.equal(disclosure.props['aria-controls'], 'toggle-list');
    assert.equal(element.props.className.includes('m-navigation-secondary-open'), expected);
    assert.equal(disclosure.props.href, undefined);
    disclosure.props.onClick();
  }
});

test('recovered CSS supplies strip geometry and breakpoint; candidate CSS adds only scoped button reset and mobile visibility', () => {
  const recovered = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8'));
  const local = postcss.parse(fs.readFileSync(path.join(componentDirectory, 'SectionNavigation.css'), 'utf8'));
  const rules = (root, selector, media) => {
    const found = [];
    root.walkRules((rule) => {
      if (rule.selector === selector && (rule.parent.type === 'atrule' ? rule.parent.params : undefined) === media) {
        found.push(Object.fromEntries(rule.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value])));
      }
    });
    return Object.assign({}, ...found);
  };
  assert.equal(rules(recovered, '.m-navigation-secondary', '(min-width:704px)').background, '#ececec');
  assert.equal(rules(recovered, '.m-navigation-secondary .nav-sec-list', '(min-width:704px)').display, 'flex');
  assert.equal(rules(recovered, '.m-navigation-secondary .nav-sec-list-title', '(min-width:704px)').display, 'none');
  assert.equal(rules(recovered, '.m-navigation-secondary .nav-sec-list', '(max-width:703px)')['max-height'], '0');
  assert.equal(rules(recovered, '.m-navigation-secondary-open .nav-sec-list', '(max-width:703px)')['max-height'], '3000px');
  local.walkRules((rule) => assert.ok(rule.selector.startsWith('.allianz-section-navigation')));
  local.walkAtRules((rule) => assert.equal(rule.params, '(max-width: 703px)'));
  const reset = rules(local, '.allianz-section-navigation button.nav-sec-list-title');
  assert.equal(reset.display, undefined);
  assert.equal(reset.width, '100%');
  assert.equal(reset.border, '0');
  assert.equal(reset.margin, '0');
  assert.equal(reset['line-height'], '24px');
  assert.equal(rules(local, '.allianz-section-navigation:not(.m-navigation-secondary-open) .nav-sec-list', '(max-width: 703px)').visibility, 'hidden');
  assert.equal(rules(local, '.allianz-section-navigation.m-navigation-secondary-open .nav-sec-list', '(max-width: 703px)').visibility, 'visible');
  local.walkDecls((decl) => assert.ok(!['height', 'padding', 'outline'].includes(decl.prop)));
  assert.doesNotMatch(local.toString(), /!important|\.sitecore|scpm|code/);
});

test('candidate contains no runtime reference list, selector, client fetch or separate invented native field', () => {
  for (const filename of ['SectionNavigation.tsx', 'section-navigation.props.ts']) {
    const source = fs.readFileSync(path.join(componentDirectory, filename), 'utf8');
    assert.doesNotMatch(source, /\/about\/ventures|Team|Portfolio|Newsroom|native-content|public-route|process\.env|fetch\(|targetItems|datasource|\.sort\(|\.slice\(/);
  }
  const hook = fs.readFileSync(path.join(sourceRoot, 'lib/section-navigation-server.ts'), 'utf8');
  assert.match(hook, /bindings\?: SectionNavigationBindings/);
  assert.match(hook, /unavailableSectionNavigation\('unbound'\)/);
  assert.doesNotMatch(hook, /process\.env|\/about\/ventures|515/);
  assert.deepEqual(Object.keys(component), ['Default']);
  assert.equal(fs.existsSync(path.join(componentDirectory, 'section-navigation.graphql')), false);
});
