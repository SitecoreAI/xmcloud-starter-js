import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { require, sourceRoot, loadSource, render } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { ComponentPropsContext } = require('@sitecore-content-sdk/nextjs');
const postcss = require('postcss');
const { parse, visit } = require('graphql');
const ts = require('typescript');
const { generateMap } = require('@sitecore-content-sdk/nextjs/tools');
const directory = path.join(sourceRoot, 'components/newsroom-year-navigation');
const component = loadSource(path.join(directory, 'NewsroomYearNavigation.tsx'));
const { Default } = component;
const { newsroomYearItems, newsroomYearLink, newsroomYearNavigationData } = loadSource(path.join(directory, 'newsroom-year-navigation.props.ts'));
const source = (name) => fs.readFileSync(path.join(directory, '__tests__/source', name), 'utf8');
const desktop = JSON.parse(source('source-year-navigation-1024.json'));
const mobile = JSON.parse(source('source-year-navigation-390.json'));
const expanded = JSON.parse(source('source-year-navigation-390-expanded.json'));
const keyboard = JSON.parse(source('source-year-navigation-390-keyboard.json'));
const titleFieldId = '4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8';
const hrefs = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((match) => match[1]);
const decode = (value) => value.replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&#x27;', "'");
const plain = (value) => decode(value.replace(/<[^>]*>/g, '')).trim();
const editingMetadata = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map((match) => JSON.parse(decode(match[1])));
const renderingUid = 'test-automatic-year-navigation';
const Wrapper = ({ fields, params }) => {
  const data = fields?.data?.datasource;
  return React.createElement(ComponentPropsContext, {
    value: data?.componentProps ?? { [renderingUid]: { automaticYears: data?.automaticYears } },
  }, React.createElement(Default, {
    rendering: data?.rendering ?? { uid: renderingUid, componentName: 'NewsroomYearNavigation' },
    params, ...(data?.fields ? { fields: data.fields } : {}),
  }));
};
const renderData = (data, isEditing = false, params = {}) => render(Wrapper, data, isEditing, params);

function fixture() {
  const items = desktop.links.map((link, index) => {
    // Test-only identities; labels, routes and order come directly from the source witness.
    const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    return { id, navigationTitle: { jsonValue: { value: link.text, metadata: {
      itemId: id, fieldId: titleFieldId, fieldType: 'Single-Line Text',
    } } }, url: { path: link.href }, name: link.href.split('/').at(-1).toLowerCase(),
    path: `/sitecore/content/allianz/allianz-life/Home${link.href.toLowerCase()}`,
    parent: { id: '00000000-0000-4000-8000-000000000100' }, year: Number(link.text.match(/^\d{4}/)[0]) };
  });
  return { automaticYears: { items, complete: true, status: 'ready',
    currentId: items[desktop.links.findIndex((link) => link.className === '-is-active')].id } };
}

test('source HTML and JSON witnesses retain their exact bytes and captured desktop/mobile states', () => {
  const manifest = JSON.parse(source('SOURCE-YEAR-NAVIGATION-MANIFEST.json'));
  for (const entry of manifest.files.filter((entry) => /\.(?:html|json)$/.test(entry.name))) {
    const bytes = Buffer.from(source(entry.name));
    assert.equal(bytes.length, entry.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
  }
  const html = source('source-year-navigation-1024.html');
  assert.equal(html, desktop.markup);
  assert.deepEqual([...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*aria-label="([^"]*)"[^>]*>(.*?)<\/a>/g)]
    .map((match) => ({ href: match[1], text: plain(match[3]), ariaLabel: match[2] })),
  desktop.links.map(({ href, text, ariaLabel }) => ({ href, text, ariaLabel })));
  assert.equal(desktop.navigation.computed.height, '57px');
  assert.equal(desktop.navigation.computed.backgroundColor, 'rgb(236, 236, 236)');
  assert.equal(desktop.list.computed.display, 'flex');
  assert.equal(desktop.title.computed.display, 'none');
  assert.equal(desktop.links.at(-1).computed.borderBottom, '4px solid rgb(0, 80, 116)');
  assert.equal(mobile.chain.find((node) => node.className === 'nav-sec-list').rect.height, 0);
  assert.equal(mobile.chain.find((node) => node.className === 'm-navigation-secondary').rect.height, 64);
  assert.equal(expanded.listHeight, 108);
  assert.equal(keyboard.clickExpandsWithoutNavigating, true);
  assert.equal(keyboard.enterTogglesClass, true);
  assert.equal(keyboard.escapeCloses, false);
  assert.equal(keyboard.afterEscape.path, new URL(keyboard.sourceUrl).pathname);
});

test('installed SDK renders exact source ordered links and identifies every active year by native context ID', () => {
  for (const activeIndex of [0, 1, 2]) {
    const data = fixture();
    const selected = data.automaticYears.items[activeIndex];
    data.automaticYears.currentId = `{${selected.id.toUpperCase()}}`;
    const before = JSON.stringify(data);
    const html = renderData(data);
    assert.deepEqual(hrefs(html), desktop.links.map((link) => link.href));
    assert.deepEqual([...html.matchAll(/<li><a\b[^>]*>(.*?)<\/a><\/li>/g)].map((match) => plain(match[1])), desktop.links.map((link) => link.text));
    const current = [...html.matchAll(/<a\b[^>]*class="-is-active"[^>]*>(.*?)<\/a>/g)];
    assert.equal(current.length, 1);
    assert.equal(plain(current[0][1]), selected.navigationTitle.jsonValue.value);
    assert.match(current[0][0], /aria-current="page"/);
    const button = html.match(/<button\b[^>]*>(.*?)<\/button>/);
    assert.equal(plain(button[1]), selected.navigationTitle.jsonValue.value);
    assert.equal(newsroomYearNavigationData(data.automaticYears).active, selected);
    assert.equal(JSON.stringify(data), before);
  }
});

test('complete automatic year projections preserve original native SDK fields and server order', () => {
  const data = fixture();
  const years = data.automaticYears;
  const original = years.items[0].navigationTitle.jsonValue;
  const before = JSON.stringify(years);
  const result = newsroomYearItems(years);
  assert.equal(result.complete, true);
  assert.equal(result.items, years.items);
  assert.equal(result.items[0].navigationTitle.jsonValue, original);
  assert.equal(JSON.stringify(years), before);
  const reordered = { ...years, items: [...years.items].reverse() };
  assert.deepEqual(hrefs(renderData({ automaticYears: reordered })), [...desktop.links].reverse().map((link) => link.href));
});

test('read-only empty year labels retain native fields without copied titles, slugs or editing chrome', () => {
  const data = fixture();
  const current = data.automaticYears.items.at(-1);
  current.navigationTitle.jsonValue.value = '';
  const original = current.navigationTitle.jsonValue;
  assert.equal(newsroomYearNavigationData(data.automaticYears).issue, 'missing-title');
  const result = newsroomYearNavigationData(data.automaticYears, true);
  assert.equal(result.active.navigationTitle.jsonValue, original);
  const editing = renderData(data, true);
  const chrome = editingMetadata(editing);
  assert.equal(chrome.length, 0);
  assert.doesNotMatch(editing, /contenteditable|data-field-id/);
  assert.equal(current.navigationTitle.jsonValue, original);
  assert.doesNotMatch(editing, new RegExp(desktop.links.at(-1).text));
  assert.deepEqual(hrefs(editing), desktop.links.map((link) => link.href));
  assert.equal(hrefs(renderData(data)).length, 0);
  delete current.navigationTitle;
  assert.equal(newsroomYearNavigationData(data.automaticYears, true).issue, 'missing-title');
});

test('missing, failed, duplicate or incomplete automatic years never render a partial or manual list', () => {
  const data = fixture();
  const list = data.automaticYears;
  for (const automaticYears of [
    undefined,
    { ...list, complete: false },
    { ...list, status: 'unavailable' },
    { ...list, error: 'unavailable' },
    { ...list, items: [list.items[0], null] },
    { ...list, items: [list.items[0], list.items[0]] },
    { ...list, items: [{ ...list.items[0], id: 'malformed' }] },
    { complete: true, status: 'ready' },
    {},
  ]) {
    assert.deepEqual(newsroomYearItems(automaticYears), { items: [], complete: false });
    const rejected = { automaticYears, fields: { data: { datasource: { years: { targetItems: list.items } }, contextItem: { id: list.currentId } } } };
    assert.equal(hrefs(renderData(rejected)).length, 0);
    assert.match(renderData(rejected, true), /Automatic archive years need complete native pages/);
    assert.doesNotMatch(renderData(rejected, true), /Add a datasource|Select the archive/);
  }
  const empty = { ...list, items: [] };
  assert.deepEqual(newsroomYearItems(empty), { items: [], complete: true });
  assert.equal(renderData({ automaticYears: empty }), '');
  assert.match(renderData({ automaticYears: empty }, true), /No automatic archive year pages are available/);
  assert.equal(newsroomYearNavigationData({ ...list, currentId: undefined }).issue, 'missing-current-year');
  assert.equal(newsroomYearNavigationData({ ...list, currentId: '00000000-0000-4000-8000-000000000999' }).issue, 'missing-current-year');
});

test('native links retain safe SDK navigation and never use titles to manufacture destinations', () => {
  const data = fixture();
  const original = data.automaticYears.items[0];
  const renamed = { ...original, navigationTitle: { jsonValue: { value: 'Different authored label' } } };
  assert.equal(newsroomYearLink(renamed).value.href, original.url.path);
  for (const href of ['https://unverified.example/about', '//unverified.example/about', 'javascript:alert(1)',
    '/api/private', '/sitecore/shell', '/account', '/about\\other', '/about\nother', '/login']) {
    const item = { ...original, url: { path: href } };
    assert.equal(newsroomYearLink(item), undefined, href);
    const automaticYears = { ...data.automaticYears, items: [item], currentId: item.id };
    assert.equal(newsroomYearNavigationData(automaticYears).issue, 'invalid-url');
    assert.equal(hrefs(renderData({ automaticYears })).length, 0);
  }
  const previous = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  try {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
    assert.equal(newsroomYearLink({ ...original, url: { path: '/about/new-authored-archive' } }).value.href, '/about/new-authored-archive');
    assert.equal(newsroomYearLink({ ...original, url: { path: '/about/%2Fprivate' } }).value.href, '#service-unavailable');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = previous;
  }
});

test('source disclosure markup uses native button activation and ignores appearance parameters', () => {
  const data = fixture();
  const html = renderData(data, false, { RenderingIdentifier: 'native-archive-years', theme: 'green', columns: '4', spacing: 'xl', headingLevel: 'h2' });
  assert.match(html, /class="m-navigation-secondary allianz-newsroom-year-navigation"/);
  assert.match(html, /id="native-archive-years"/);
  const button = html.match(/<button\b([^>]*)>/)[1];
  assert.match(button, /type="button"/);
  assert.match(button, /class="nav-sec-list-title"/);
  assert.match(button, /aria-expanded="false"/);
  const controls = button.match(/aria-controls="([^"]+)"/)[1];
  assert.ok(html.includes(`<ul class="nav-sec-list" id="${controls}">`));
  assert.match(html, /class="c-icon c-icon--chevron-down" aria-hidden="true"/);
  assert.doesNotMatch(button, /href=|tabindex=/);
  assert.doesNotMatch(html, /t-bg-green|headingLevel|columns|<h\d|m-navigation-secondary-open/);
  const source = fs.readFileSync(path.join(directory, 'NewsroomYearNavigation.tsx'), 'utf8');
  assert.match(source, /onClick=\{\(\) => setOpen\(\(current\) => !current\)\}/);
  assert.doesNotMatch(source, /onKeyDown|onKeyUp|Escape|window\.|location\.|router\.|preventDefault/);
  assert.deepEqual(Object.keys(component), ['Default']);
  const hostile = fixture();
  hostile.automaticYears.items[0].navigationTitle.jsonValue.value = 'Authored <script>alert(1)</script> & title';
  assert.match(renderData(hostile), /Authored &lt;script&gt;/);
  assert.doesNotMatch(renderData(hostile), /<script>/);
  assert.match(renderData(undefined, true), /Automatic archive years need complete native pages/);
  assert.doesNotMatch(renderData(undefined, true), /Add a datasource/);
});

test('real SDK ComponentPropsContext isolates data by rendering UID and never reads manual fields', () => {
  const data = fixture();
  const matching = { componentProps: {
    'different-rendering': { automaticYears: { ...data.automaticYears, items: [] } },
    [renderingUid]: { automaticYears: data.automaticYears },
  } };
  assert.deepEqual(hrefs(renderData(matching)), desktop.links.map((link) => link.href));
  for (const rendering of [{ uid: 'different-rendering' }, {}, { uid: '' }]) {
    const missing = { ...data, rendering, fields: { data: {
      datasource: { years: { targetItems: data.automaticYears.items } },
      contextItem: { id: data.automaticYears.currentId },
    } } };
    assert.equal(hrefs(renderData(missing)).length, 0);
    assert.match(renderData(missing, true), /Automatic archive years need complete native pages/);
  }
});

test('an additional automatic native year appears without a datasource, manual selection, or client limit', () => {
  const data = fixture();
  const year = Math.max(...data.automaticYears.items.map((item) => item.year)) + 1;
  const current = { ...data.automaticYears.items[0],
    id: '00000000-0000-4000-8000-000000000004', year,
    name: `${year}-press-releases`, path: `/sitecore/content/allianz/allianz-life/Home/about/newsroom/${year}-press-releases`,
    url: { path: `/about/newsroom/${year}-press-releases` },
    navigationTitle: { jsonValue: { value: 'New native archive label', metadata: {
      itemId: '00000000-0000-4000-8000-000000000004', fieldId: titleFieldId, fieldType: 'Single-Line Text',
    } } },
  };
  data.automaticYears.items.unshift(current);
  data.automaticYears.currentId = current.id;
  const previous = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  try {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
    const html = renderData(data);
    assert.deepEqual(hrefs(html), data.automaticYears.items.map((item) => item.url.path));
    assert.equal(hrefs(html).length, desktop.links.length + 1);
    assert.equal(plain(html.match(/<a\b[^>]*class="-is-active"[^>]*>(.*?)<\/a>/)[1]), 'New native archive label');
    assert.equal(newsroomYearNavigationData(data.automaticYears).active.navigationTitle.jsonValue, current.navigationTitle.jsonValue);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = previous;
  }
});

test('recovered CSS owns the 703/704 geometry and added CSS scopes only button reset and mobile visibility', () => {
  const recovered = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8'));
  const local = postcss.parse(fs.readFileSync(path.join(directory, 'NewsroomYearNavigation.css'), 'utf8'));
  const rules = (root, selector, media) => {
    const found = [];
    root.walkRules((rule) => {
      if (rule.selector !== selector) return;
      const query = rule.parent.type === 'atrule' ? rule.parent.params : undefined;
      if (query === media) found.push(Object.fromEntries(rule.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value])));
    });
    return Object.assign({}, ...found);
  };
  assert.equal(rules(recovered, '.m-navigation-secondary', '(min-width:704px)').padding, '8px 0');
  assert.equal(rules(recovered, '.m-navigation-secondary', '(min-width:704px)').background, '#ececec');
  assert.equal(rules(recovered, '.m-navigation-secondary .nav-sec-list', '(min-width:704px)').display, 'flex');
  assert.equal(rules(recovered, '.m-navigation-secondary .nav-sec-list-title', '(min-width:704px)').display, 'none');
  assert.equal(rules(recovered, '.m-navigation-secondary .nav-sec-list-title').padding, '20px');
  assert.equal(rules(recovered, '.m-navigation-secondary .nav-sec-list-title')['font-size'], '20px');
  assert.equal(rules(recovered, '.m-navigation-secondary .nav-sec-list', '(max-width:703px)')['max-height'], '0');
  assert.equal(rules(recovered, '.m-navigation-secondary .nav-sec-list', '(max-width:703px)').overflow, 'hidden');
  assert.equal(rules(recovered, '.m-navigation-secondary-open .nav-sec-list', '(max-width:703px)')['max-height'], '3000px');
  local.walkRules((rule) => assert.ok(rule.selector.startsWith('.allianz-newsroom-year-navigation'), rule.selector));
  local.walkAtRules((rule) => assert.equal(rule.params, '(max-width: 703px)'));
  const reset = rules(local, '.allianz-newsroom-year-navigation button.nav-sec-list-title');
  assert.equal(reset.width, '100%');
  assert.equal(reset.margin, '0');
  assert.equal(reset.border, '0');
  assert.equal(reset['border-radius'], '0');
  assert.equal(reset.color, '#005074');
  assert.equal(reset['font-weight'], '400');
  assert.equal(reset['letter-spacing'], 'normal');
  assert.equal(reset['line-height'], '24px');
  assert.equal(reset['text-align'], 'left');
  assert.equal(reset.display, undefined, 'Source title visibility must win at 704px');
  assert.equal(rules(local, '.allianz-newsroom-year-navigation:not(.m-navigation-secondary-open) .nav-sec-list', '(max-width: 703px)').visibility, 'hidden');
  assert.equal(rules(local, '.allianz-newsroom-year-navigation.m-navigation-secondary-open .nav-sec-list', '(max-width: 703px)').visibility, 'visible');
  local.walkDecls((declaration) => assert.ok(!['height', 'padding', 'outline'].includes(declaration.prop)));
  assert.doesNotMatch(local.toString(), /!important|code|scpm|\.sitecore|\.c-heading/);
});

test('integrated query is context-only while automatic years arrive through shared server-hook types', () => {
  const query = fs.readFileSync(path.join(directory, 'newsroom-year-navigation.graphql'), 'utf8');
  const ast = parse(query);
  const variables = [];
  visit(ast, { VariableDefinition(node) { variables.push(node.variable.name.value); } });
  assert.deepEqual(variables, ['contextItem', 'language']);
  assert.match(query, /contextItem: item\(path: \$contextItem, language: \$language\) \{ id \}/);
  assert.doesNotMatch(query, /\$datasource|datasource:|years:|MultilistField|children|ancestors|descendants|first:|template|body|fieldCollection|field\(/);
  for (const filename of ['NewsroomYearNavigation.tsx', 'newsroom-year-navigation.props.ts']) {
    const production = fs.readFileSync(path.join(directory, filename), 'utf8');
    assert.doesNotMatch(production, /2024|2025|2026|Press-Releases|\.sort\(|\.slice\(|native-content|public-route|templateId|__tests__\/|datasource|targetItems|Multilist|fields\?\.data/);
  }
  const component = fs.readFileSync(path.join(directory, 'NewsroomYearNavigation.tsx'), 'utf8');
  assert.match(component, /useComponentProps<NewsroomYearNavigationComponentData>\(rendering\?\.uid\)/);
  assert.match(component, /componentData\?\.automaticYears/);
  const props = fs.readFileSync(path.join(directory, 'newsroom-year-navigation.props.ts'), 'utf8');
  assert.match(props, /type AutomaticYear, type AutomaticYears.*'lib\/newsroom-automatic-data'/);
  const contract = fs.readFileSync(path.join(directory, 'AUTHOR-CONTRACT.md'), 'utf8');
  assert.match(contract, /no data template, datasource, authored year list/);
  assert.match(contract, /renderer, its variant group, and Default variant/);
  assert.match(contract, /direct child page of Newsroom/);
});

function mapSettings(appRoot) {
  const filename = path.join(appRoot, 'sitecore.cli.config.ts');
  const ast = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  let config;
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'componentMap') config = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(config && ts.isObjectLiteralExpression(config));
  const settings = {};
  for (const property of config.properties) {
    assert.ok(ts.isPropertyAssignment(property));
    assert.ok(ts.isArrayLiteralExpression(property.initializer));
    settings[property.name.getText(ast)] = property.initializer.elements.map((entry) => {
      assert.ok(ts.isStringLiteral(entry));
      return entry.text;
    });
  }
  assert.equal(settings.includeVariants, undefined);
  return settings;
}

test('default production installed SDK map registers the rendering and excludes every props helper export', () => {
  const appRoot = path.dirname(sourceRoot);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'allianz-year-navigation-map-'));
  const names = ['component-map.ts', 'component-map.client.ts'];
  const snapshot = (name) => {
    const filename = path.join(appRoot, '.sitecore', name);
    return fs.existsSync(filename) ? fs.readFileSync(filename) : undefined;
  };
  const before = names.map(snapshot);
  const workingDirectory = process.cwd();
  const debug = console.debug;
  try {
    process.chdir(appRoot);
    console.debug = () => {};
    generateMap({ ...mapSettings(appRoot), destination: path.relative(appRoot, temporary) });
    for (const name of names) {
      const map = fs.readFileSync(path.join(temporary, name), 'utf8');
      const registrations = [...map.matchAll(/^\s*\['([^']+)',/gm)].map((match) => match[1]);
      assert.deepEqual(registrations.filter((entry) => /newsroom.?year|newsroomYear/i.test(entry)), ['NewsroomYearNavigation']);
      assert.doesNotMatch(map, /newsroom-year-navigation\.props|newsroomYearItems|newsroomYearLink|newsroomYearNavigationData/);
      assert.match(map, /NewsroomYearNavigation\/|newsroom-year-navigation\/NewsroomYearNavigation/);
    }
    for (const [index, name] of names.entries()) assert.deepEqual(snapshot(name), before[index]);
  } finally {
    console.debug = debug;
    process.chdir(workingDirectory);
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});


test('automatic year captions are read-only in Pages while owning-page title fields remain editable', () => {
  const data = fixture(), before = JSON.stringify(data);
  const html = renderData(data, true);
  assert.deepEqual(editingMetadata(html), []);
  assert.doesNotMatch(html, /contenteditable|data-field-id/);
  assert.deepEqual(hrefs(html), desktop.links.map((link) => link.href));
  assert.match(html, /aria-current="page"/);
  assert.equal(JSON.stringify(data), before);
  const { Text } = require('@sitecore-content-sdk/nextjs');
  const OwningPageTitle = () => React.createElement(Text, { field: data.automaticYears.items[0].navigationTitle.jsonValue, editable: true });
  assert.equal(editingMetadata(render(OwningPageTitle, data, true)).length, 1);
});
