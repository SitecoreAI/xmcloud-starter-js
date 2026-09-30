/** Offline React/Node checks. No browser, server, external calls, or input storage. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sdk = require('@sitecore-content-sdk/nextjs');
function load(file, mocks = {}) {
  const filename = fileURLToPath(file);
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(fileURLToPath(new URL('.', file)));
  const localRequire = createRequire(file);
  compiled.require = (id) => Object.hasOwn(mocks, id) ? mocks[id] : localRequire(id);
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
function flatten(element) {
  if (Array.isArray(element)) return element.flatMap(flatten);
  if (!element || typeof element !== 'object' || !element.props) return [];
  return [element, ...flatten(element.props.children)];
}
const field = (value, metadata = {}) => ({ jsonValue: { value, ...metadata } });
const fields = load(new URL('../../lib/allianz-fields.ts', import.meta.url));
const documentRules = load(new URL('./allianz-document-list.props.ts', import.meta.url));
const documentMocks = {
  'components/content-sdk/NoDataFallback': 'no-data',
  'lib/allianz-fields': fields,
  './allianz-document-list.props': documentRules,
};
const documents = JSON.parse(fs.readFileSync(new URL('../../../content/documents.json', import.meta.url), 'utf8'));
const available = documents.find((document) => document.status === 'available');
const unavailable = documents.find((document) => document.status === 'missing');
const markerSdk = { Text: 'sdk-text', RichText: 'sdk-rich-text', File: 'sdk-file', Link: 'sdk-link', DateField: 'sdk-date' };
const { Default: DocumentList } = load(new URL('./AllianzDocumentList.tsx', import.meta.url), { ...documentMocks, '@sitecore-content-sdk/nextjs': markerSdk });
const listProps = (datasource) => ({ params: {}, fields: { data: { datasource } } });

test('document props match the exact authored component and child contract', () => {
  const contract = JSON.parse(fs.readFileSync(new URL('../../../../../authoring/allianz-life/content-contract.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(contract.components.AllianzDocumentList.fields), ['heading', 'body']);
  assert.equal(contract.components.AllianzDocumentList.children, 'AllianzDocument');
  assert.deepEqual(contract.childTemplates.AllianzDocument, { title: 'Single-Line Text', description: 'Rich Text', file: 'File', sourceUrl: 'Single-Line Text', publishedDate: 'Date' });
  const props = fs.readFileSync(new URL('./allianz-document-list.props.ts', import.meta.url), 'utf8');
  const names = [...props.matchAll(/^  (\w+)\??:/gm)].map((match) => match[1]);
  assert.deepEqual(names, ['id', 'title', 'description', 'file', 'sourceUrl', 'publishedDate', 'fields']);
  assert.match(props, /file\?: JsonField<FileField>/);
});

test('missing datasources, absent params, and empty children remain safe', () => {
  for (const props of [{}, { fields: {} }, { fields: { data: {} } }]) assert.equal(DocumentList(props).type, 'no-data');
  for (const datasource of [{}, { children: {} }, { children: { results: [] } }]) {
    const nodes = flatten(DocumentList({ fields: { data: { datasource } } }));
    assert.equal(nodes.filter((node) => node.type === 'li').length, 0);
    assert.ok(nodes.some((node) => node.type === 'sdk-text'));
    assert.ok(nodes.some((node) => node.type === 'sdk-rich-text'));
  }
});

test('document fields preserve SDK field objects and empty editing metadata', () => {
  const heading = field('', { editable: '<span>Edit heading</span>', metadata: { fieldId: 'heading' } });
  const body = field('', { editable: '<p>Edit body</p>' });
  const title = field('Public PDF', { metadata: { fieldId: 'title' } });
  const description = field('<p>Document <strong>description</strong></p>');
  const date = field('2026-09-30T00:00:00Z', { metadata: { fieldId: 'publishedDate' } });
  const file = field({ src: available.file.jsonValue.value.src, title: 'File title', displayName: 'Display name' });
  const data = { heading, body, children: { results: [{ id: 'document', title, description, file, publishedDate: date }] } };
  const before = JSON.stringify(data);
  const nodes = flatten(DocumentList({ ...listProps(data), params: { headingLevel: 'h3', theme: 'blue-soft', RenderingIdentifier: 'documents' } }));
  assert.ok(nodes.some((node) => node.type === 'sdk-text' && node.props.field === heading.jsonValue && node.props.tag === 'h3'));
  assert.ok(nodes.some((node) => node.type === 'sdk-rich-text' && node.props.field === body.jsonValue));
  assert.ok(nodes.some((node) => node.type === 'sdk-text' && node.props.field === title.jsonValue));
  assert.ok(nodes.some((node) => node.type === 'sdk-rich-text' && node.props.field === description.jsonValue));
  const fileNode = nodes.find((node) => node.type === 'sdk-file');
  assert.deepEqual(fileNode.props.field, file.jsonValue);
  const dateNode = nodes.find((node) => node.type === 'sdk-date');
  assert.equal(dateNode.props.field, date.jsonValue);
  assert.match(renderToStaticMarkup(dateNode.props.render(new Date('2026-09-30T00:00:00Z'))), /dateTime="2026-09-30">September 30, 2026/);
  assert.equal(dateNode.props.render(new Date('invalid')), null);
  assert.equal(JSON.stringify(data), before, 'SDK field data is never mutated');
});

test('captured source documents map to existing local copies; remote and private destinations are excluded', () => {
  for (const document of documents.filter((entry) => entry.status === 'available')) {
    const local = documentRules.localDocumentHref(document.sourceUrl.jsonValue.value);
    assert.equal(local, document.file.jsonValue.value.src);
    assert.ok(fs.existsSync(new URL(`../../../public${local}`, import.meta.url)), `captured document exists: ${local}`);
  }
  assert.equal(documentRules.localDocumentHref(available.sourceUrl.jsonValue.value.replace('https://www.allianzlife.com', '')), available.file.jsonValue.value.src);
  assert.equal(documentRules.localDocumentHref('/allianz-assets/test.docx'), '/allianz-assets/test.docx');
  for (const value of [undefined, '', unavailable.sourceUrl.jsonValue.value, 'https://external.invalid/file.pdf', '//external.invalid/file.pdf', 'javascript:alert(1)', 'data:text/html,test', '/login', '/new-york/portal', '/api/file.pdf', '/allianz-assets/../api/file.pdf', '/allianz-assets/%2e%2e/file.pdf', '/allianz-assets/file.pdf?redirect=https://external.invalid', '/allianz-assets/file.js', '/allianz-assets/subfolder/file.pdf', 'https://user:password@www.allianzlife.com/file.pdf']) {
    assert.equal(documentRules.localDocumentHref(value), '', `excluded document source: ${value}`);
  }
});

test('missing files use captured source links; uncaptured documents render an unavailable state', () => {
  const title = field('PDF');
  const source = field(available.sourceUrl.jsonValue.value);
  const nodes = flatten(DocumentList(listProps({ children: { results: [{ id: 'source', title, sourceUrl: source }, { id: 'missing', title, sourceUrl: field('https://external.invalid/file.pdf') }] } })));
  const link = nodes.find((node) => node.type === 'sdk-link');
  assert.equal(link.props.field.value.href, available.file.jsonValue.value.src);
  assert.equal(link.props.field.value.target, '');
  assert.equal(nodes.filter((node) => node.type === 'sdk-file').length, 0);
  assert.ok(nodes.some((node) => node.type === 'span' && node.props.children === 'Document unavailable in this demo.'));
});

test('real SDK server rendering preserves rich text, file anchors, titles and dates', () => {
  const { Default } = load(new URL('./AllianzDocumentList.tsx', import.meta.url), { ...documentMocks, '@sitecore-content-sdk/nextjs': sdk });
  const html = renderToStaticMarkup(React.createElement(Default, listProps({
    heading: field('Documents'), body: field('<p>Read our <strong>public resources</strong></p>'),
    children: { results: [{ id: 'pdf', title: field('A & B <guide>'), description: field('<p>PDF details</p>'), file: available.file, publishedDate: field('2026-09-30T00:00:00Z') }] },
  })));
  assert.match(html, /<h2>Documents<\/h2>/);
  assert.match(html, /<strong>public resources<\/strong>/);
  assert.ok(html.includes(`href="${available.file.jsonValue.value.src}"`));
  assert.match(html, /A &amp; B &lt;guide&gt;/);
  assert.match(html, /<p>PDF details<\/p>/);
  assert.match(html, /September 30, 2026/);
  assert.doesNotMatch(html, /https:\/\/www\.allianzlife\.com/);
});

test('an empty authored title retains its SDK field and an accessible file label', () => {
  const { Default } = load(new URL('./AllianzDocumentList.tsx', import.meta.url), { ...documentMocks, '@sitecore-content-sdk/nextjs': sdk });
  const html = renderToStaticMarkup(React.createElement(Default, listProps({ children: { results: [{ id: 'empty-title', title: field(''), file: available.file }] } })));
  assert.match(html, /<a[^>]+>View document<\/a>/);
  const nodes = flatten(DocumentList(listProps({ children: { results: [{ id: 'edit-title', title: field('', { editable: '<span>Edit title</span>' }), file: available.file }] } })));
  assert.ok(nodes.some((node) => node.type === 'sdk-text' && node.props.field?.editable === '<span>Edit title</span>'));
});

const searchRules = load(new URL('../allianz-search/search-rules.props.ts', import.meta.url));
function searchHarness(kind, initial = { pathname: '/search', query: 'Annuities' }) {
  let hooks = [], cursor = 0, previousKey;
  let pathname = initial.pathname, query = initial.query, root;
  const pushes = [];
  const fakeReact = { ...React, useId: () => ':test:', useState(value) {
    const slot = cursor++;
    if (!(slot in hooks)) hooks[slot] = value;
    return [hooks[slot], (next) => { hooks[slot] = typeof next === 'function' ? next(hooks[slot]) : next; }];
  } };
  const mocks = {
    react: fakeReact, '@sitecore-content-sdk/nextjs': markerSdk, 'next/link': 'a',
    'next/navigation': { useRouter: () => ({ push: (value) => pushes.push(value) }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams(query ? { q: query } : {}) },
    'components/content-sdk/NoDataFallback': 'no-data', 'lib/allianz-fields': fields,
    './search-rules.props': searchRules,
    './search-index.json': Array.from({ length: 25 }, (_, index) => ({ path: `/get-answers/example-${index}`, title: `Annuities ${index}`, description: 'Public example' })),
  };
  const source = kind === 'legacy' ? '../allianz-legacy-header/AllianzLegacyHeader.tsx' : '../allianz-search/AllianzSearch.tsx';
  const { Default } = load(new URL(source, import.meta.url), mocks);
  const defaultProps = listProps({ heading: field('Search') });
  return {
    pushes,
    navigate(value) { const url = new URL(value, 'https://local.invalid'); pathname = url.pathname; query = url.searchParams.get('q') || ''; },
    render(props = defaultProps) {
      cursor = 0;
      root = Default(props);
      if (kind !== 'legacy') {
        const keyed = root.props.children.type(root.props.children.props);
        if (keyed.key !== previousKey) { hooks = []; previousKey = keyed.key; }
        root = keyed.type(keyed.props);
      }
      return root;
    },
    nodes() { return flatten(root); },
    one(predicate) { const node = flatten(root).find(predicate); assert.ok(node, 'expected control exists'); return node; },
    input(value) { this.one((node) => node.type === 'input').props.onChange({ target: { value } }); },
    submit() {
      let prevented = false;
      this.one((node) => node.type === 'form').props.onSubmit({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true, 'native submission is always prevented');
    },
  };
}

test('both search forms intercept submission, encode queries, cap input and avoid native GET actions', () => {
  for (const kind of ['search', 'legacy']) {
    const h = searchHarness(kind);
    h.render();
    const form = h.one((node) => node.type === 'form');
    assert.equal(form.props.action, undefined);
    assert.equal(form.props.method, undefined);
    h.input('  Annuities & retirement? #future  '); h.render(); h.submit();
    assert.equal(h.pushes.at(-1), '/search?q=Annuities%20%26%20retirement%3F%20%23future');
    h.input('A'.repeat(100)); h.render(); h.submit();
    assert.equal(new URL(h.pushes.at(-1), 'https://local.invalid').searchParams.get('q').length, 50);
    h.input('   '); h.render(); h.submit();
    assert.equal(h.pushes.at(-1), '/search', 'empty query clears search results locally');
  }
});

test('New York search remains in the public New York branch', () => {
  for (const kind of ['search', 'legacy']) {
    const h = searchHarness(kind, { pathname: '/new-york/search', query: 'Annuities' });
    const props = { ...listProps({}), params: { market: 'new-york' } };
    h.render(props); h.input('Annuities'); h.render(props); h.submit();
    assert.equal(h.pushes.at(-1), '/new-york/search?q=Annuities');
  }
});

test('search pagination and input reset across repeated query changes and Back/Forward', () => {
  const h = searchHarness('search');
  h.render();
  assert.equal(h.nodes().filter((node) => node.type === 'li').length, 10);
  h.one((node) => node.type === 'button' && node.props.children === 'Show more results').props.onClick(); h.render();
  assert.equal(h.nodes().filter((node) => node.type === 'li').length, 20);
  h.input('Annuities 2'); h.render(); h.submit(); h.navigate(h.pushes.at(-1)); h.render();
  assert.equal(h.one((node) => node.type === 'input').props.value, 'Annuities 2');
  h.navigate('/search?q=Annuities'); h.render();
  assert.equal(h.one((node) => node.type === 'input').props.value, 'Annuities');
  assert.equal(h.nodes().filter((node) => node.type === 'li').length, 10);
  h.navigate('/search'); h.render();
  assert.equal(h.nodes().filter((node) => node.type === 'li').length, 0);
  assert.equal(h.one((node) => node.type === 'input').props.value, '');
});

test('legacy submission closes navigation and discards its in-memory draft', () => {
  const h = searchHarness('legacy');
  h.render();
  h.one((node) => node.type === 'button' && node.props['aria-controls']).props.onClick(); h.render();
  assert.equal(h.one((node) => node.type === 'button' && node.props['aria-controls']).props['aria-expanded'], true);
  h.input('Annuities'); h.render(); h.submit(); h.render();
  assert.equal(h.one((node) => node.type === 'input').props.value, '');
  assert.equal(h.one((node) => node.type === 'button' && node.props['aria-controls']).props['aria-expanded'], false);
  assert.equal(h.render({}).type, 'no-data');
});

test('CSP remains form-action none and scoped components add no requests or input persistence', () => {
  const config = fs.readFileSync(new URL('../../../next.config.ts', import.meta.url), 'utf8');
  assert.ok(config.includes("form-action 'none'"));
  for (const source of ['../allianz-search/AllianzSearch.tsx', '../allianz-legacy-header/AllianzLegacyHeader.tsx', './AllianzDocumentList.tsx', './allianz-document-list.props.ts']) {
    assert.doesNotMatch(fs.readFileSync(new URL(source, import.meta.url), 'utf8'), /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/);
  }
});
