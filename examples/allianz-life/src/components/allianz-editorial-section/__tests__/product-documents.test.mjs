/** Offline integration: real SDK placeholders, field chrome, existing table and form. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sdk = require('@sitecore-content-sdk/nextjs');
const { PathnameContext } = require('next/dist/shared/lib/hooks-client-context.shared-runtime');
const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../../..');
const componentMap = new Map();
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '.sitecore/component-map') return { __esModule: true, default: componentMap };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
for (const [name, directory] of [
  ['AllianzEditorialSection', 'allianz-editorial-section'], ['AllianzLegacyPageHeader', 'allianz-legacy-page-header'],
  ['AllianzLegacyLinkList', 'allianz-legacy-link-list'], ['ProspectusDocumentTable', 'prospectus-document-table'],
  ['AllianzForm', 'allianz-form'], ['LegalDisclosures', 'legal-disclosures'],
]) componentMap.set(name, load(path.join(sourceRoot, `components/${directory}/${name}.tsx`)));
const Section = componentMap.get('AllianzEditorialSection');
const Lists = componentMap.get('AllianzLegacyLinkList');
const sources = JSON.parse(fs.readFileSync(path.join(here, 'product-document-sources.json')));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const key = (slot, id = '{*}') => `allianz-product-document-${slot}-${id}`;
const slots = ['heading', 'navigation', 'table', 'next-steps', 'form', 'disclosure'];
const field = (name, value, itemId = 'test-only-content', fieldType = 'Single-Line Text') => ({
  jsonValue: { value, metadata: { itemId, fieldId: `test-only-${name}`, fieldType } },
});
const child = (name, variant, datasource, uid, dataSource = `test-only-${name}-${uid}`) => ({
  componentName: name, uid, dataSource, params: { FieldNames: variant }, fields: { data: { datasource } },
});
function linkDatasource(entries, heading = '') {
  return { heading: field('list-heading', heading), children: {
    total: entries.length, pageInfo: { hasNext: false },
    results: entries.map((entry, index) => ({ id: `test-only-link-${index}`,
      heading: field(`link-heading-${index}`, entry.label, `test-only-link-${index}`),
      link: field(`link-${index}`, { href: entry.href, text: entry.label, target: entry.target, linktype: 'internal' }, `test-only-link-${index}`, 'General Link'),
    })),
  } };
}
function formDatasource(source) {
  return {
    ...Object.fromEntries(Object.entries(source.form.parentFields).map(([name, value]) => [name,
      field(`form-${name}`, value, 'test-only-form', /body|message/i.test(name) ? 'Rich Text' : 'Single-Line Text')])),
    children: { total: source.form.children.length, pageInfo: { hasNext: false },
      results: source.form.children.map((entry, index) => ({ id: `test-only-form-child-${index}`,
        ...Object.fromEntries(Object.entries(entry).map(([name, value]) => [name, field(`form-${name}-${index}`, value)])),
      })),
    },
  };
}
function fixture(source, editing = false, id = '81', resolvedKeys = false) {
  const placeholders = {};
  const add = (slot, control) => placeholders[key(slot, resolvedKeys ? id : '{*}')] = [control];
  add('heading', child('AllianzLegacyPageHeader', 'Default', { heading: field('heading', source.heading, 'test-only-heading', 'Rich Text') }, 'test-only-heading'));
  add('navigation', child('AllianzLegacyLinkList', 'ProductNavigation', linkDatasource(source.navigation), 'test-only-navigation'));
  add('table', child('ProspectusDocumentTable', 'Product', {}, source.table.uid, source.table.datasourceId));
  add('next-steps', child('AllianzLegacyLinkList', 'ProductNextSteps', linkDatasource(source.nextStepsLinks, source.nextStepsHeading), 'test-only-next-steps'));
  add('form', child('AllianzForm', 'Default', formDatasource(source), 'test-only-form'));
  add('disclosure', child('LegalDisclosures', 'Legacy', { body: field('body', source.disclosure, 'test-only-disclosure', 'Rich Text') }, 'test-only-disclosure'));
  const params = { FieldNames: 'LegacyProductDocument', DynamicPlaceholderId: id };
  const page = { mode: { isEditing: editing, isNormal: !editing, isPreview: false }, siteName: 'allianz-life',
    layout: { sitecore: { context: { itemPath: source.route }, route: { name: source.key, fields: {}, placeholders: {} } } } };
  // Existing read-back table/row IDs are test assertions only; no new native identity is invented.
  const automatic = { [source.table.uid]: { automaticDocuments: { complete: true, status: 'ready',
    items: source.table.rows.map((row) => ({ id: row.nativeId,
      documentLink: field('documentLink', { href: row.sourceHref, text: row.label, target: row.sourceTarget, linktype: 'external' }, row.nativeId, 'General Link'),
      contractNote: field('contractNote', row.note, row.nativeId), revisionDate: field('revisionDate', row.revisionDate, row.nativeId),
      fileSize: field('fileSize', row.size, row.nativeId),
    })),
  } } };
  return { route: source.route, props: { params, page, rendering: { componentName: 'AllianzEditorialSection',
    uid: `test-only-wrapper-${id}`, params, placeholders } }, automatic };
}
function render(input, Component = Section.LegacyProductDocument, props = input.props) {
  const saved = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  try {
    return renderToStaticMarkup(React.createElement(PathnameContext.Provider, { value: input.route },
      React.createElement(sdk.SitecoreProvider, { page: input.props.page, api: {}, componentMap, loadImportMap: async () => ({}) },
        React.createElement(sdk.ComponentPropsContext, { value: input.automatic }, React.createElement(Component, props)))));
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = saved;
  }
}
const control = (input, slot) => (input.props.rendering.placeholders[key(slot)] || input.props.rendering.placeholders[key(slot, input.props.params.DynamicPlaceholderId)])[0];
// AppPlaceholder resolves wildcard map keys in-place. Assert all authored payloads, not those SDK-owned keys.
const identitySnapshot = (input) => JSON.stringify({ route: input.route, params: input.props.params, automatic: input.automatic, children: Object.values(input.props.rendering.placeholders).flat().sort((a, b) => a.uid.localeCompare(b.uid)) });
const datasource = (input, slot) => control(input, slot).fields.data.datasource;
const decode = (value) => value.replaceAll('&quot;', '"').replaceAll('&amp;', '&');
const chrome = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map((match) => decode(match[1])).filter((value) => value.trim().startsWith('{')).map((value) => JSON.parse(value));

test('six product shells match safe source hierarchy, lists, copy and bare table through real SDK', () => {
  const records = sources.map((source) => {
    assert.equal(hash(source.sourceFragment), source.sourceFragmentSha256);
    const input = fixture(source), before = identitySnapshot(input);
    const actual = render(input);
    assert.equal(identitySnapshot(input), before);
    assert.equal((actual.match(/<table\b/g) || []).length, 1);
    assert.equal((actual.match(/id="prospectusTable"/g) || []).length, 1);
    assert.doesNotMatch(actual, /l-container|l-grid|axlTileCollection|allianz-missing-data|<nav/);
    assert.match(actual, /class="next-steps"/);
    assert.match(actual, /allianz-product-contact/);
    return { key: source.key, source: source.sourceFragment, actual };
  });
  const result = spawnSync('python3', ['-B', path.join(here, 'product-document-source-contract.py')], {
    input: JSON.stringify(records), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('source navigation order, active Prospectus and exact New-York case survive connected output', () => {
  for (const source of sources) {
    const input = fixture(source);
    const html = render(input, Lists.ProductNavigation, control(input, 'navigation'));
    assert.match(html, /^<ul class="nav-links">/);
    assert.doesNotMatch(html, /<div|<nav|<h[1-6]|service-unavailable/);
    const links = [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)];
    assert.deepEqual(links.map((m) => decode(m[1])), source.navigation.map((entry) => entry.href));
    assert.deepEqual(links.map((m) => m[2].replace(/<[^>]+>/g, '')), source.navigation.map((entry) => entry.label));
    assert.equal((html.match(/class="active"/g) || []).length, 1);
    assert.match(html, /class="active"[^>]*aria-current="page"[^>]*><span>Prospectus<\/span>/);
    const next = render(input, Lists.ProductNextSteps, control(input, 'next-steps'));
    assert.match(next, /^<hr\/><h2>Next steps:<\/h2><ul class="link-list">/);
    assert.doesNotMatch(next, /Prospectus|class="active"|aria-current|<div|<nav/);
    assert.deepEqual([...next.matchAll(/href="([^"]+)"/g)].map((m) => decode(m[1])), source.nextStepsLinks.map((entry) => entry.href));
  }
});

test('ProductNavigation uses native page context across rewritten routes and falls back to pathname', () => {
  for (const source of sources) {
    const input = fixture(source), navigation = control(input, 'navigation');
    const before = JSON.stringify(navigation);
    for (const pathname of [`/allianz-life/en${source.route}`, '/_site_allianz-life/en/rewritten', '/api/editing/render']) {
      input.route = pathname;
      const html = render(input, Lists.ProductNavigation, navigation);
      assert.equal((html.match(/class="active"/g) || []).length, 1, `${source.key}: ${pathname}`);
      assert.match(html, /class="active"[^>]*aria-current="page"[^>]*><span>Prospectus<\/span>/);
    }
    for (const itemPath of [undefined, '']) {
      input.props.page.layout.sitecore.context.itemPath = itemPath;
      input.route = source.route;
      assert.match(render(input, Lists.ProductNavigation, navigation), /class="active"[^>]*aria-current="page"/);
    }
    assert.equal(JSON.stringify(navigation), before);
  }
});

test('all six editable slots retain chrome, table UID lookup and child General Link metadata', () => {
  for (const source of sources) {
    const input = fixture(source, true), before = identitySnapshot(input), html = render(input);
    for (const slot of slots) assert.ok(html.includes(key(slot)), slot);
    assert.equal((html.match(/chrometype="placeholder"/g) || []).length, 12);
    assert.ok(html.includes(source.table.uid));
    for (const row of source.table.rows) {
      for (const name of ['documentLink', 'contractNote', 'revisionDate', 'fileSize']) {
        assert.ok(chrome(html).some((entry) => entry.itemId === row.nativeId && entry.fieldId === `test-only-${name}`));
      }
    }
    for (const slot of ['navigation', 'next-steps']) {
      const list = render(input, slot === 'navigation' ? Lists.ProductNavigation : Lists.ProductNextSteps, control(input, slot));
      for (const [index, item] of datasource(input, slot).children.results.entries()) {
        assert.ok(chrome(list).some((entry) => entry.fieldId === `test-only-link-${index}` && entry.fieldType === 'General Link'));
        assert.ok(chrome(list).some((entry) => entry.fieldId === `test-only-link-heading-${index}`));
        assert.ok(list.includes(item.link.jsonValue.value.href));
      }
    }
    assert.equal(identitySnapshot(input), before);
  }
});

test('cleared headings and links stay cleared, retain native chrome and restore exactly', () => {
  for (const source of sources) {
    const input = fixture(source, true), original = structuredClone(input), expected = render(input);
    datasource(input, 'heading').heading.jsonValue.value = '';
    for (const slot of ['navigation', 'next-steps']) {
      datasource(input, slot).heading.jsonValue.value = '';
      for (const item of datasource(input, slot).children.results) {
        item.heading.jsonValue.value = '';
        item.link.jsonValue.value = { href: '', text: '' };
      }
    }
    const html = render(input);
    assert.ok(chrome(html).some((entry) => entry.fieldId === 'test-only-heading'));
    assert.ok(chrome(html).some((entry) => entry.fieldId === 'test-only-list-heading'));
    assert.ok(chrome(html).some((entry) => entry.fieldId === 'test-only-link-0' && entry.fieldType === 'General Link'));
    input.props.page.mode = { isEditing: false, isNormal: true, isPreview: false };
    for (const slot of ['navigation', 'next-steps']) {
      const list = render(input, slot === 'navigation' ? Lists.ProductNavigation : Lists.ProductNextSteps, control(input, slot));
      assert.doesNotMatch(list, /href=|Overview|Prospectus|Next steps:|service-unavailable/);
    }
    assert.equal(render(original), expected);
  }
});

test('source order reflects repeated native edits without mutating or resurrecting deleted children', () => {
  const input = fixture(sources[0]), data = datasource(input, 'navigation');
  const original = structuredClone(data.children.results);
  data.children.results.reverse();
  const reversed = render(input, Lists.ProductNavigation, control(input, 'navigation'));
  assert.ok(reversed.indexOf('Prospectus') < reversed.indexOf('Overview'));
  data.children.results = []; data.children.total = 0;
  assert.equal(render(input, Lists.ProductNavigation, control(input, 'navigation')), '<ul class="nav-links"></ul>');
  data.children.results = original; data.children.total = original.length;
  assert.ok(render(input, Lists.ProductNavigation, control(input, 'navigation')).indexOf('Overview') < reversed.indexOf('Overview'));
});

test('safe-link conventions block unsafe destinations only for visitors and retain original authoring fields', () => {
  const input = fixture(sources[0]);
  const item = datasource(input, 'navigation').children.results[0];
  for (const href of ['javascript:alert(1)', '/New-York/Login', 'https://untrusted.example.invalid/path']) {
    item.link.jsonValue.value = { href, text: 'Unsafe test' };
    input.props.page.mode.isEditing = false;
    const html = render(input, Lists.ProductNavigation, control(input, 'navigation'));
    assert.match(html, /href="#service-unavailable"/); assert.ok(!html.includes(href));
    input.props.page.mode.isEditing = true;
    const editable = render(input, Lists.ProductNavigation, control(input, 'navigation'));
    assert.ok(chrome(editable).some((entry) => entry.fieldId === 'test-only-link-0'));
    assert.equal(item.link.jsonValue.value.href, href);
  }
  input.props.page.mode.isEditing = false;
  item.link.jsonValue.value = { href: sources[0].navigation[0].href, target: '_blank', rel: 'author' };
  assert.match(render(input, Lists.ProductNavigation, control(input, 'navigation')), /rel="author noopener noreferrer"/);
});

test('resolved and wildcard keys agree; real numeric instance IDs remain isolated', () => {
  for (const source of sources) assert.equal(render(fixture(source)), render(fixture(source, false, '81', true)));
  const a = fixture(sources[0], true, '81', true), b = fixture(sources[1], true, '82', true);
  assert.notEqual(a.props.rendering.uid, b.props.rendering.uid);
  for (const slot of slots) {
    assert.ok(render(a).includes(key(slot, '81'))); assert.ok(!render(a).includes(key(slot, '82')));
    assert.ok(render(b).includes(key(slot, '82'))); assert.ok(!render(b).includes(key(slot, '81')));
  }
  for (const id of [undefined, '', '8x', '../81', '-1', '1.5', 81, null]) {
    const input = fixture(sources[0]); input.props.params.DynamicPlaceholderId = id;
    assert.throws(() => render(input), /requires a numeric native SXA DynamicPlaceholderId/);
  }
});

test('empty and unrelated slots never create fallback controls; six empty slots remain insertable', () => {
  const input = fixture(sources[0], true);
  for (const name of Object.keys(input.props.rendering.placeholders)) input.props.rendering.placeholders[name] = [];
  input.props.rendering.placeholders['allianz-editorial-section-{*}'] = [child('AllianzLegacyPageHeader', 'Default', { heading: field('heading', 'Stale unrelated content') }, 'test-only-stale')];
  const editing = render(input);
  assert.equal((editing.match(/chrometype="placeholder"/g) || []).length, 12);
  assert.doesNotMatch(editing, /<table|<h1|allianz-product-contact|Stale unrelated content/);
  input.props.page.mode.isEditing = false;
  assert.doesNotMatch(render(input), /<table|<h1|<h2|<p|allianz-product-contact|Stale unrelated content/);
});

test('hidden next steps stay source-hidden; no new CSS, fixture, auth, or props-helper registration', () => {
  const shell = fs.readFileSync(path.join(here, '../AllianzEditorialSection.tsx'), 'utf8');
  const appended = shell.slice(shell.indexOf('/** Product documents have six independent native controls'));
  const css = fs.readFileSync(path.join(sourceRoot, 'assets/allianz-legacy.css'), 'utf8');
  assert.match(css, /\.allianz-legacy \.content-body \.next-steps\s*\{\s*display\s*:\s*none\s*\}/);
  assert.doesNotMatch(appended, /isEditing|style=|dangerouslySetInnerHTML|sourceFragment|fetch\(|iframe|<script|data-sitekey/);
  for (const source of sources) for (const editing of [false, true]) {
    const html = render(fixture(source, editing));
    assert.doesNotMatch(html, /__RequestVerificationToken|data-sitekey|action=|method=|data-auth|sitecore\/api/);
    const head = html.indexOf('class="next-steps"');
    assert.ok(html.indexOf('allianz-product-contact') > head);
    assert.ok(html.indexOf('allianz-product-contact') < html.indexOf('content-body post-content'));
  }
  assert.ok(!componentMap.has('ProductContactForm'));
  assert.match(fs.readFileSync(path.join(sourceRoot, '../sitecore.cli.config.ts'), 'utf8'), /src\/components\/\*\*\/\*\.props\.tsx/);
});

test('shared connected collection guard requires complete metadata for both source list sizes', () => {
  const { collectionsComplete } = load(path.join(sourceRoot, 'lib/collection-completeness.ts'));
  for (const source of sources) for (const entries of [source.navigation, source.nextStepsLinks]) {
    const data = linkDatasource(entries);
    assert.ok(entries.length <= 8);
    assert.equal(collectionsComplete(data, true), true);
    delete data.children.total; assert.equal(collectionsComplete(data, true), false);
    data.children.total = entries.length + 1; assert.equal(collectionsComplete(data, true), false);
    data.children.total = entries.length; data.children.pageInfo.hasNext = true; assert.equal(collectionsComplete(data, true), false);
  }
  assert.match(fs.readFileSync(path.join(sourceRoot, 'Layout.tsx'), 'utf8'), /collectionsComplete\(layout, isConnected\(\)\)/);
});

test('both Product lists fail closed on missing or malformed connections and preserve complete empty lists', () => {
  const mutations = [
    (props) => { delete props.fields; },
    (props) => { delete props.fields.data.datasource; },
    (props) => { delete props.fields.data.datasource.children; },
    (props) => { props.fields.data.datasource.children = null; },
    (props) => { props.fields.data.datasource.children = {}; },
    (props) => { delete props.fields.data.datasource.children.results; },
    (props) => { props.fields.data.datasource.children.results = null; },
    (props) => { props.fields.data.datasource.children.results = {}; },
    (props) => { delete props.fields.data.datasource.children.total; },
    (props) => { props.fields.data.datasource.children.total = 0; },
    (props) => { props.fields.data.datasource.children.total = '5'; },
    (props) => { props.fields.data.datasource.children.total = -1; },
    (props) => { props.fields.data.datasource.children.total = 1.5; },
    (props) => { delete props.fields.data.datasource.children.pageInfo; },
    (props) => { props.fields.data.datasource.children.pageInfo = null; },
    (props) => { props.fields.data.datasource.children.pageInfo = {}; },
    (props) => { props.fields.data.datasource.children.pageInfo.hasNext = true; },
    (props) => { props.fields.data.datasource.children.pageInfo.hasNext = 'false'; },
  ];
  for (const editing of [false, true]) for (const [slot, Component] of [['navigation', Lists.ProductNavigation], ['next-steps', Lists.ProductNextSteps]]) {
    for (const mutate of mutations) {
      const input = fixture(sources[0], editing), props = control(input, slot);
      mutate(props);
      const html = render(input, Component, props);
      assert.match(html, /^<p role="status" class="allianz-missing-data">/);
      assert.doesNotMatch(html, /<ul|<li|<a|<h2|<hr/);
    }
    const input = fixture(sources[0], editing), data = datasource(input, slot);
    data.children = { results: [], total: 0, pageInfo: { hasNext: false } };
    const html = render(input, Component, control(input, slot));
    assert.match(html, /<ul class="(?:nav-links|link-list)"><\/ul>/);
    assert.doesNotMatch(html, /allianz-missing-data|<li|<a/);
  }
});

test('Product lists reject malformed child identities and field projections without rejecting cleared native values', () => {
  const mutations = [
    (data) => { delete data.heading; },
    (data) => { data.heading = {}; },
    (data) => { data.heading.jsonValue.value = null; },
    (data) => { data.children.results[0] = null; },
    (data) => { data.children.results[0] = 'scalar'; },
    (data) => { data.children.results[0] = 42; },
    (data) => { data.children.results[0] = []; },
    (data) => { delete data.children.results[0].id; },
    (data) => { data.children.results[0].id = ''; },
    (data) => { data.children.results[0].id = '  '; },
    (data) => { data.children.results[0].id = 42; },
    (data) => { data.children.results[1].id = data.children.results[0].id; },
    (data) => { data.children.results[1].id = data.children.results[0].id.toUpperCase(); },
    (data) => { delete data.children.results[0].heading; },
    (data) => { data.children.results[0].heading = {}; },
    (data) => { data.children.results[0].heading.jsonValue = null; },
    (data) => { data.children.results[0].heading.jsonValue.value = {}; },
    (data) => { delete data.children.results[0].link; },
    (data) => { data.children.results[0].link = {}; },
    (data) => { data.children.results[0].link.jsonValue = null; },
    (data) => { data.children.results[0].link.jsonValue.value = null; },
    (data) => { data.children.results[0].link.jsonValue.value = ''; },
    (data) => { data.children.results[0].link.jsonValue.value = []; },
    ...['href', 'text', 'target', 'rel', 'querystring', 'anchor', 'title', 'linktype'].map((name) =>
      (data) => { data.children.results[0].link.jsonValue.value[name] = 42; }),
  ];
  for (const editing of [false, true]) for (const [slot, Component] of [['navigation', Lists.ProductNavigation], ['next-steps', Lists.ProductNextSteps]]) {
    for (const mutate of mutations) {
      const input = fixture(sources[0], editing);
      mutate(datasource(input, slot));
      const html = render(input, Component, control(input, slot));
      assert.match(html, /^<p role="status" class="allianz-missing-data">/);
      assert.doesNotMatch(html, /<ul|<li|<a|<h2|<hr/);
    }
    for (const cleared of [{ href: '', text: '' }, {}]) {
      const input = fixture(sources[0], editing), data = datasource(input, slot);
      data.heading.jsonValue = { value: '' };
      for (const item of data.children.results) {
        item.heading.jsonValue = { value: '' };
        item.link.jsonValue = { value: cleared };
      }
      const html = render(input, Component, control(input, slot));
      assert.match(html, /<ul class="(?:nav-links|link-list)">/);
      assert.doesNotMatch(html, /allianz-missing-data|Overview|Next steps:|href=/);
    }
  }
});

test('shared-section and legacy prefixes, Product table and canceled heading files remain pinned', () => {
  const prefixCases = [
    ['components/allianz-editorial-section/AllianzEditorialSection.tsx', '\n/** Product documents have six independent native controls', 'cebcc8aadbb983b9dc7ed86869b2fbb8d8afdddc09a233bfc0a1df0c8116c4ae'],
    ['components/allianz-legacy-link-list/AllianzLegacyLinkList.tsx', '\n/** Bare lists for the product-document shell', '1b8698fdac4c45ca47805ac2d8889ef24d6a6b5e0f0e20f7cdaa46084451ba47'],
  ];
  for (const [name, marker, expected] of prefixCases) {
    const text = fs.readFileSync(path.join(sourceRoot, name), 'utf8');
    assert.ok(text.includes(marker)); assert.equal(hash(text.slice(0, text.indexOf(marker))), expected);
  }
  const pinned = [
    ['components/prospectus-document-table/ProspectusDocumentTable.tsx', 'dfc68ef0f34a162e7d9dde3ce8c205dd807e4fc752a8728eca2a8addd2949a7d'],
    ['components/allianz-legacy-page-header/AllianzLegacyPageHeader.tsx', '0cef1145aa97f9de0e9e5eca5cf94d3f62bad244e5a00c28017cb55ea597599f'],
    ['components/allianz-legacy-page-header/AllianzLegacyLegalHeader.css', 'e1884c1b511071acdcc16ba402231c71d8a93a616ba8242a96536a02c7d74553'],
  ];
  for (const [name, expected] of pinned) assert.equal(hash(fs.readFileSync(path.join(sourceRoot, name))), expected);
  for (const name of ['AllianzLegacyPageHeader.css', 'legacy-page-heading.test.mjs']) assert.equal(fs.existsSync(path.join(sourceRoot, `components/allianz-legacy-page-header/${name}`)), false);
});
