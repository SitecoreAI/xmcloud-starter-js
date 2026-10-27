/** Offline matching, actual React markup, and client-handler checks. No browser acceptance claimed. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const routeRoot = path.dirname(fileURLToPath(import.meta.url));
const pageFile = path.resolve(routeRoot, '../new-york/search/advanced-search/page.tsx');

function loader(mocks = {}) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, compiled);
    const nativeRequire = createRequire(filename);
    compiled.require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.endsWith('.module.css')) return { controls: 'controls', query: 'query', actions: 'actions' };
      if (specifier.startsWith('.')) {
        const local = path.resolve(path.dirname(filename), specifier);
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
  return load;
}

const load = loader();
const model = load(path.join(routeRoot, 'advanced-search-model.ts'));
const data = load(path.join(routeRoot, 'search-data.ts'));
const rules = load(path.resolve(routeRoot, '../../../../components/allianz-search/search-rules.props.ts'));
const defaults = () => model.normalizeAdvancedSearch({});
const entries = [
  { path: '/new-york', title: 'Income annuities', description: 'Retirement choices' },
  { path: '/new-york/annuities', title: 'Zeta retirement', description: 'Income annuities overview' },
  { path: '/new-york/report-a-death', title: 'Alpha income', description: 'Annuities information' },
  { path: '/what-we-offer/annuities', title: 'Income annuities', description: 'National content' },
  { path: '/new-yorkish', title: 'Income annuities', description: 'Unrecorded path' },
  { path: '/new-york/login', title: 'Income annuities', description: 'Private path' },
  { path: 'https://evil.invalid/new-york', title: 'Income annuities', description: 'External path' },
];

test('advanced options validate repeated/unknown params and bound the query', () => {
  assert.deepEqual(defaults(), { query: '', within: 'all', sort: 'best', pageSize: '12' });
  assert.deepEqual(model.normalizeAdvancedSearch({ q: [' income ', 'ignored'], within: ['titles', 'all'], sort: 'title', size: '60' }), {
    query: 'income', within: 'titles', sort: 'title', pageSize: '60',
  });
  assert.deepEqual(model.normalizeAdvancedSearch({ q: ' ', within: 'external', sort: 'recent', size: '1000000' }), defaults());
  assert.equal(model.normalizeAdvancedSearch({ q: 'x'.repeat(1000) }).query.length, 50);
  assert.equal(model.advancedSearchHref(defaults()), '/new-york/search/advanced-search');
  assert.equal(model.advancedSearchHref({ query: 'income & growth # future', within: 'titles', sort: 'title', pageSize: 'all' }),
    '/new-york/search/advanced-search?q=income%20%26%20growth%20%23%20future&within=titles&sort=title&size=all');
});

test('advanced queries preserve complete emoji and remove unpaired surrogates before URL encoding', () => {
  const cases = [
    ['A'.repeat(48) + '😀', 'A'.repeat(48) + '😀'],
    ['A' + '😀'.repeat(25), 'A' + '😀'.repeat(24)],
    ['A\uD83DB\uDE00C😀', 'ABC😀'],
  ];
  for (const [query, expected] of cases) {
    assert.equal(model.normalizeAdvancedSearch({ q: query }).query, expected);
    let href;
    assert.doesNotThrow(() => { href = model.advancedSearchHref({ ...defaults(), query }); });
    assert.equal(new URL(href, 'https://local.invalid').searchParams.get('q'), expected);
  }
});

test('all-text matching reuses NY-safe all-term ranking while title-only excludes body-only matches', () => {
  const state = { ...defaults(), query: 'income annuities' };
  assert.deepEqual(model.advancedSearchMatches(entries, state), rules.searchPublicRoutes(entries, state.query, 'new-york'));
  assert.deepEqual(model.advancedSearchMatches(entries, { ...state, within: 'titles' }).map((entry) => entry.path), ['/new-york']);
  assert.deepEqual(model.advancedSearchMatches(entries, { ...state, query: 'income absent' }), []);
  assert.deepEqual(model.advancedSearchMatches(entries, defaults()), []);
  assert.deepEqual(model.advancedSearchMatches(entries, { ...state, sort: 'title' }).map((entry) => entry.title),
    ['Alpha income', 'Income annuities', 'Zeta retirement']);
  assert.ok(model.advancedSearchMatches(entries, state).every((entry) => !Object.hasOwn(entry, 'content')));
});

test('real captured NY snapshot remains safe and title mode is strictly title-only', () => {
  const all = data.localAdvancedSearchResults({ q: 'annuities' });
  assert.ok(all.matches.length > 12);
  assert.ok(all.matches.every((entry) => (entry.path === '/new-york' || entry.path.startsWith('/new-york/')) && rules.safeSearchPath(entry.path)));
  const titles = data.localAdvancedSearchResults({ q: 'annuities', within: 'titles', sort: 'title', size: 'all' });
  assert.ok(titles.matches.length > 0);
  assert.ok(titles.matches.every((entry) => entry.title.toLocaleLowerCase('en-US').includes('annuities')));
  assert.deepEqual(titles.matches.map((entry) => entry.title), [...titles.matches].sort((a, b) => a.title.localeCompare(b.title, 'en-US') || a.path.localeCompare(b.path, 'en-US')).map((entry) => entry.title));
  assert.deepEqual(data.localAdvancedSearchResults({ q: 'unlikelytermzzzzzz' }).matches, []);
});

const notFound = new Error('NEXT_NOT_FOUND_TEST');
// This suite owns the utility's existing filters/handlers; shell integration has its own regression suite.
const page = loader({
  'next/navigation': { useRouter: () => ({ push() {} }), notFound() { throw notFound; } },
  '../../../search/NewYorkSearchUtilityShell': { __esModule: true, default: async ({ children }) => children },
})(pageFile);
const pageElement = (params = {}, site = 'allianz-life', locale = 'en') => page.default({
  params: Promise.resolve({ site, locale }), searchParams: Promise.resolve(params),
});

test('route labels the local adaptation, renders controls/results, and keeps non-indexable scope', async () => {
  const html = renderToStaticMarkup(await pageElement({ q: 'annuities' }));
  assert.match(html, /<h1[^>]*>Local advanced search demo<\/h1>/);
  assert.match(html, /Search the captured New York website content\. This demo does not use a live search service\./);
  assert.match(html, /Document contents are not indexed/);
  assert.match(html, /href="\/new-york">Allianz Life New York home/);
  assert.match(html, /href="\/new-york\/search">Search<\/a>/);
  for (const label of ['Search words', 'Search within', 'Sort results', 'Results per page']) assert.match(html, new RegExp(`<label for="[^"]+">${label}<\\/label>`));
  assert.match(html, /value="all" selected="">All captured page text/);
  assert.match(html, /value="best" selected="">Best match/);
  assert.match(html, /value="12" selected="">12/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Showing 12 of/);
  assert.match(html, /Show more results/);
  assert.doesNotMatch(html, /href="\/what-we-offer|<iframe|<form[^>]+action=/);
  assert.match(renderToStaticMarkup(await pageElement()), /Enter one or more words/);
  assert.match(renderToStaticMarkup(await pageElement({ q: 'unlikelytermzzzzzz' })), /No results found/);
  assert.match(renderToStaticMarkup(await pageElement({ q: '<script>alert(1)</script>' })), /&lt;script&gt;/);
  await assert.doesNotReject(pageElement({ q: 'A' + '😀'.repeat(25) }));
  assert.deepEqual(page.metadata.robots, { index: false, follow: false, noarchive: true });
  await assert.rejects(pageElement({}, 'other-site'), (error) => error === notFound);
  await assert.rejects(pageElement({}, 'allianz-life', 'fr'), (error) => error === notFound);
});

function flatten(element) {
  if (Array.isArray(element)) return element.flatMap(flatten);
  if (!element || typeof element !== 'object' || !element.props) return [];
  return [element, ...flatten(element.props.children)];
}

function harness(state, matches) {
  let cursor = 0;
  const hooks = [];
  const pushes = [];
  let pending = false;
  const mockReact = {
    ...React, useId: () => 'advanced-search-test',
    useState(initial) {
      const slot = cursor++;
      if (!(slot in hooks)) hooks[slot] = initial;
      return [hooks[slot], (value) => { hooks[slot] = typeof value === 'function' ? value(hooks[slot]) : value; }];
    },
    useTransition: () => [pending, (callback) => { pending = true; callback(); }],
  };
  const component = loader({ react: mockReact, 'next/navigation': { useRouter: () => ({ push: (value) => pushes.push(value) }) } })(path.join(routeRoot, 'LocalAdvancedSearchUtility.tsx')).default;
  let nodes;
  return {
    pushes,
    render() { cursor = 0; nodes = flatten(component({ state, matches })); return nodes; },
    one(predicate) { const node = nodes.find(predicate); assert.ok(node, 'expected control exists'); return node; },
    finish() { pending = false; },
  };
}

test('client submit prevents native submission, bounds/encodes query and persists validated options', () => {
  const h = harness(defaults(), []);
  h.render();
  const change = (name, value) => {
    h.one((node) => node.props.name === name).props.onChange({ target: { value } });
    h.render();
  };
  change('q', ' income & growth # future ');
  change('within', 'titles');
  change('sort', 'title');
  change('size', '24');
  let prevented = false;
  h.one((node) => node.type === 'form').props.onSubmit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.pushes.at(-1), '/new-york/search/advanced-search?q=income%20%26%20growth%20%23%20future&within=titles&sort=title&size=24');
  h.render();
  assert.equal(h.one((node) => node.type === 'fieldset').props.disabled, true);
  assert.equal(h.one((node) => node.props.className === 'allianz-local-search-results').props['aria-busy'], true);
  h.finish();
  change('q', 'x'.repeat(1000));
  assert.equal(h.one((node) => node.props.name === 'q').props.value.length, 50);
});

test('show-more honors each page size; All has no show-more action', () => {
  const matches = Array.from({ length: 70 }, (_, index) => ({ path: `/new-york/result-${index}`, title: `Result ${index}`, description: 'Snippet' }));
  for (const [pageSize, count] of [['12', 12], ['24', 24], ['60', 60], ['all', 70]]) {
    const h = harness({ ...defaults(), query: 'result', pageSize }, matches);
    assert.equal(h.render().filter((node) => node.type === 'li').length, count);
    if (pageSize === 'all') {
      assert.ok(!h.render().some((node) => node.type === 'button' && node.props.children === 'Show more results'));
    } else {
      h.one((node) => node.type === 'button' && node.props.children === 'Show more results').props.onClick();
      assert.equal(h.render().filter((node) => node.type === 'li').length, Math.min(count * 2, matches.length));
    }
  }
});

test('clear resets query/options/limit, and route keys reset state for subsequent queries', async () => {
  const matches = Array.from({ length: 70 }, (_, index) => ({ path: `/new-york/result-${index}`, title: `Result ${index}`, description: 'Snippet' }));
  const h = harness({ query: 'result', within: 'titles', sort: 'title', pageSize: '24' }, matches);
  h.render();
  h.one((node) => node.type === 'button' && node.props.children === 'Show more results').props.onClick();
  assert.equal(h.render().filter((node) => node.type === 'li').length, 48);
  h.one((node) => node.type === 'button' && node.props.children === 'Clear search').props.onClick();
  h.render();
  assert.equal(h.pushes.at(-1), '/new-york/search/advanced-search');
  for (const [name, expected] of [['q', ''], ['within', 'all'], ['sort', 'best'], ['size', '12']]) {
    assert.equal(h.one((node) => node.props.name === name).props.value, expected);
  }
  assert.equal(h.render().filter((node) => node.type === 'li').length, 12);
  const first = flatten(await pageElement({ q: 'annuities' })).find((node) => node.props.matches);
  const next = flatten(await pageElement({ q: 'income', within: 'titles', sort: 'title', size: '24' })).find((node) => node.props.matches);
  assert.notEqual(first.key, next.key);
  assert.equal(next.key, '/new-york/search/advanced-search?q=income&within=titles&sort=title&size=24');
  const cleared = flatten(await pageElement()).find((node) => node.props.matches);
  assert.deepEqual(cleared.props.state, defaults());
  assert.deepEqual(cleared.props.matches, []);
});
