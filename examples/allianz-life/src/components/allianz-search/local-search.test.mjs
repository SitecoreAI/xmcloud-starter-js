/** Offline data, actual React markup, and navigation-handler tests. Browser QA is separate. */
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
const root = fileURLToPath(new URL('../..', import.meta.url));
const routeRoot = path.join(root, 'app/[site]/[locale]/search');
const newYorkRouteRoot = path.join(root, 'app/[site]/[locale]/new-york/search');

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
const rules = load(path.join(root, 'components/allianz-search/search-rules.props.ts'));
const data = load(path.join(routeRoot, 'search-data.ts'));
const route = (routePath, title, description, body = '', children = []) => ({
  path: routePath, title, description, sourceUrl: `https://www.allianzlife.com${routePath}`,
  components: [{ fields: { data: { datasource: { body: { jsonValue: { value: body } }, children: { results: children } } } } }],
});

test('query normalization handles blank, repeated, whitespace, and bounded input', () => {
  assert.equal(rules.normalizeSearchQuery(undefined), '');
  assert.equal(rules.normalizeSearchQuery('   '), '');
  assert.equal(rules.normalizeSearchQuery([' Annuities ', 'ignored']), 'Annuities');
  assert.equal(rules.normalizeSearchQuery('x'.repeat(1000)).length, 50);
  assert.equal(rules.normalizeSearchQuery('a & b # c'), 'a & b # c');
});

test('plain-text extraction is robust and excludes script/style/search markup', () => {
  assert.equal(rules.searchText('<style>hidden term</style><script>alert(1)</script><p>Income&nbsp;&amp; growth &#x24;100 &#8217;</p>'), 'Income & growth $100 ’');
  assert.equal(rules.searchText('<p>Invalid &#999999999; &#xD800;</p>'), 'Invalid &#999999999; &#xD800;');
  assert.equal(rules.searchText({ value: '<p>not a scalar</p>' }), '');
});

test('indexing includes typed child-body content beyond route intro and gives contextual snippets', () => {
  const body = `${'Background and context. '.repeat(30)}A distinctive harbor opportunity appears here. ${'More background. '.repeat(30)}`;
  const entries = rules.createSearchIndex({
    '/about': route('/about', 'About | Allianz Life', 'Short overview', '', [{ id: 'child', body: { jsonValue: { value: `<p>${body}</p>` } } }]),
    '/get-answers': route('/get-answers', 'Answers', 'Different overview', '<p>income protection</p>'),
  });
  assert.equal(entries[0].title, 'About');
  const matches = rules.searchPublicRoutes(entries, 'distinctive harbor');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].path, '/about');
  assert.match(matches[0].description, /distinctive harbor opportunity/);
  assert.ok(matches[0].description.length <= 262);
  assert.ok(!Object.hasOwn(matches[0], 'content'), 'full index bodies remain server-side');
  assert.deepEqual(rules.searchPublicRoutes(entries, 'distinctive absent'), []);
  assert.deepEqual(rules.searchPublicRoutes(entries, ''), []);
});

test('title matches rank first and English market filtering stays within New York', () => {
  const entries = [
    { path: '/about', title: 'Other', description: 'annuities guidance' },
    { path: '/what-we-offer/annuities', title: 'Annuities', description: 'guidance' },
    { path: '/new-york', title: 'Annuities', description: 'guidance in New York' },
  ];
  assert.equal(rules.searchPublicRoutes(entries, 'ANNUITIES')[0].title, 'Annuities');
  assert.deepEqual(rules.searchPublicRoutes(entries, 'annuities', 'new-york').map((entry) => entry.path), ['/new-york']);
});

test('results reject external, unrecorded, malformed, fragment, and private destinations', () => {
  const bad = ['https://evil.invalid/about', '//evil.invalid/about', '/\\evil.invalid/about', '/about?redirect=https://evil.invalid', '/about#intro', '/login', '/%6cogin', '/api/private', '/does-not-exist', '/%E0%A4%A', '/new-yorkish'];
  for (const value of bad) assert.equal(rules.safeSearchPath(value), null, value);
  assert.equal(rules.safeSearchPath('/what-we-offer/annuities'), '/what-we-offer/annuities');
  const matches = rules.searchPublicRoutes(bad.map((routePath) => ({ path: routePath, title: 'Annuities', description: 'Income' })), 'annuities');
  assert.deepEqual(matches, []);
  const native = route('/about', 'About', 'income');
  const entries = rules.createSearchIndex({ '/about': { ...native, sourceUrl: 'https://evil.invalid/about' } });
  assert.deepEqual(entries, []);
});

test('live imported snapshot returns real internal results without adding a canonical search record', () => {
  const imported = JSON.parse(fs.readFileSync(path.join(root, '../content/native-content.json'), 'utf8'));
  const entries = rules.createSearchIndex(imported.routes);
  assert.equal(entries.length, Object.keys(imported.routes).length);
  assert.equal(imported.routes['/search'], undefined);
  const { query, matches } = data.localSearchResults('annuities');
  assert.equal(query, 'annuities');
  assert.ok(matches.length > 10);
  assert.ok(matches.some((entry) => entry.path === '/what-we-offer/annuities'));
  assert.ok(matches.every((entry) => rules.safeSearchPath(entry.path)));
  assert.deepEqual(data.localSearchResults('unlikelytermzzzzzz'), { query: 'unlikelytermzzzzzz', matches: [] });
  assert.deepEqual(data.localSearchResults(' '), { query: '', matches: [] });
});

const notFound = new Error('NEXT_NOT_FOUND_TEST');
const pageLoad = loader({ 'next/navigation': { useRouter: () => ({ push() {} }), notFound() { throw notFound; } } });
const page = pageLoad(path.join(routeRoot, 'page.tsx'));
const newYorkPage = pageLoad(path.join(newYorkRouteRoot, 'page.tsx'));
async function pageElement(q, site = 'allianz-life', locale = 'en') {
  return page.default({ params: Promise.resolve({ site, locale }), searchParams: Promise.resolve({ q }) });
}
async function newYorkPageElement(q, site = 'allianz-life', locale = 'en') {
  return newYorkPage.default({ params: Promise.resolve({ site, locale }), searchParams: Promise.resolve({ q }) });
}

test('explicit utility route renders accessible query, results, empty and unmatched states', async () => {
  const html = renderToStaticMarkup(await pageElement('annuities'));
  assert.match(html, /<h1[^>]*>Search<\/h1>/);
  assert.match(html, /role="search"/);
  assert.match(html, /<label for="[^"]+">Search this website<\/label>/);
  assert.match(html, /type="search"[^>]*name="q"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /href="\/what-we-offer\/annuities"/);
  assert.match(html, /Show more results/);
  assert.match(html, /imported public-content snapshot/);
  assert.match(html, /not a live Sitecore search index/);
  assert.doesNotMatch(html, /%23consumer|Page not found|action="https:|<iframe/);
  assert.match(renderToStaticMarkup(await pageElement('')), /Enter a word or phrase/);
  assert.match(renderToStaticMarkup(await pageElement('unlikelytermzzzzzz')), /No results found/);
  assert.match(renderToStaticMarkup(await pageElement('<script>alert(1)</script>')), /&lt;script&gt;/);
  assert.deepEqual(page.metadata.robots, { index: false, follow: false, noarchive: true });
});

test('site/locale guard rejects unsupported utility scopes without native fallback', async () => {
  assert.equal(data.isLocalSearchScope('allianz-life', 'en'), true);
  assert.equal(data.isLocalSearchScope('other-site', 'en'), false);
  assert.equal(data.isLocalSearchScope('allianz-life', 'fr'), false);
  await assert.rejects(pageElement('annuities', 'other-site'), (error) => error === notFound);
  await assert.rejects(pageElement('annuities', 'allianz-life', 'fr'), (error) => error === notFound);
  await assert.rejects(newYorkPageElement('annuities', 'other-site'), (error) => error === notFound);
  await assert.rejects(newYorkPageElement('annuities', 'allianz-life', 'fr'), (error) => error === notFound);
  for (const source of [path.join(routeRoot, 'page.tsx'), path.join(routeRoot, 'SearchUtilityPage.tsx'), path.join(newYorkRouteRoot, 'page.tsx')]) {
    assert.doesNotMatch(fs.readFileSync(source, 'utf8'), /getFixturePage|getPage\(|Providers|SitecoreProvider/);
  }
});

test('fixture proxy preserves NY query and reaches the explicit utility without adding source routes', async () => {
  const { NextRequest } = require('next/server');
  const proxy = loader({
    '.sitecore/sites.json': [{ name: 'allianz-life', hostName: '*', language: 'en' }],
    'sitecore.config': {}, './i18n/routing': { routing: { locales: ['en'] } }, './lib/sitecore-client': {},
  })(path.join(root, 'proxy.ts')).default;
  const previousMode = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
  try {
    const request = new NextRequest('https://local.invalid/new-york/search?q=Annuities%20%26%20income');
    const rewrite = new URL(proxy(request).headers.get('x-middleware-rewrite'));
    assert.equal(rewrite.pathname, '/allianz-life/en/new-york/search');
    assert.equal(rewrite.searchParams.get('q'), 'Annuities & income');
    const direct = proxy(new NextRequest(rewrite));
    assert.equal(direct.headers.get('x-middleware-next'), '1');
    const segments = rewrite.pathname.split('/').filter(Boolean);
    const element = await newYorkPage.default({
      params: Promise.resolve({ site: segments[0], locale: segments[1] }),
      searchParams: Promise.resolve({ q: rewrite.searchParams.get('q') }),
    });
    assert.match(renderToStaticMarkup(element), /<h1[^>]*>Search<\/h1>/);
    const nativeAdapter = load(path.join(root, 'lib/allianz-page.ts'));
    const captured = nativeAdapter.getFixturePage(['new-york', 'search']);
    assert.ok(captured, 'before the wrapper, NY search resolved through the captured catch-all record');
    const components = captured.layout.sitecore.route.placeholders['headless-main'].map((component) => component.componentName);
    assert.ok(components.includes('AllianzForm'), 'the prior record has a generic form rather than query results');
    assert.equal(components.includes('AllianzSearch'), false);
    assert.equal(Object.keys(nativeAdapter.fixtureContent.routes).length, 357);
    assert.ok(nativeAdapter.fixtureContent.routes['/new-york/search']);
    assert.equal(nativeAdapter.fixtureContent.routes['/search'], undefined);
  } finally {
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = previousMode;
  }
});

test('NY wrapper reuses accessible utility states, NY-only results and NY home breadcrumb', async () => {
  const html = renderToStaticMarkup(await newYorkPageElement('annuities'));
  assert.match(html, /href="\/new-york">Allianz Life New York home/);
  assert.match(html, /imported New York public-content snapshot/);
  assert.match(html, /role="search"/);
  assert.match(html, /aria-live="polite"/);
  const resultView = flatten(await newYorkPageElement('annuities')).find((node) => node.props.matches);
  assert.equal(resultView.props.market, 'new-york');
  assert.ok(resultView.props.matches.length > 0);
  assert.ok(resultView.props.matches.every((entry) => entry.path === '/new-york' || entry.path.startsWith('/new-york/')));
  assert.ok(!resultView.props.matches.some((entry) => entry.path === '/what-we-offer/annuities'));
  assert.match(renderToStaticMarkup(await newYorkPageElement('')), /Enter a word or phrase/);
  assert.match(renderToStaticMarkup(await newYorkPageElement('unlikelytermzzzzzz')), /No results found/);
  assert.deepEqual(newYorkPage.metadata.robots, { index: false, follow: false, noarchive: true });
});

function flatten(element) {
  if (Array.isArray(element)) return element.flatMap(flatten);
  if (!element || typeof element !== 'object' || !element.props) return [];
  return [element, ...flatten(element.props.children)];
}
function harness(query, matches, market) {
  let cursor = 0;
  const hooks = [];
  const pushes = [];
  let pending = false;
  const mockReact = {
    ...React, useId: () => 'query-test',
    useState(initial) {
      const slot = cursor++;
      if (!(slot in hooks)) hooks[slot] = initial;
      return [hooks[slot], (value) => { hooks[slot] = typeof value === 'function' ? value(hooks[slot]) : value; }];
    },
    useTransition: () => [pending, (callback) => { pending = true; callback(); }],
  };
  const component = loader({ react: mockReact, 'next/navigation': { useRouter: () => ({ push: (value) => pushes.push(value) }) } })(path.join(routeRoot, 'LocalSearchUtility.tsx')).default;
  let nodes;
  return {
    pushes,
    render() { cursor = 0; nodes = flatten(component({ query, matches, market })); return nodes; },
    one(predicate) { const node = nodes.find(predicate); assert.ok(node, 'expected control exists'); return node; },
    finish() { pending = false; },
  };
}

test('client submit prevents native forms, escapes URL data, and exposes pending state', () => {
  const h = harness('', []);
  h.render();
  h.one((node) => node.type === 'input').props.onChange({ target: { value: 'income & growth # future' } });
  h.render();
  let prevented = false;
  h.one((node) => node.type === 'form').props.onSubmit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(h.pushes, ['/search?q=income%20%26%20growth%20%23%20future']);
  h.render();
  assert.equal(h.one((node) => node.type === 'button' && node.props.type === 'submit').props.disabled, true);
  assert.equal(h.one((node) => node.props.role === 'status').props['aria-busy'], true);
  h.finish();
  h.one((node) => node.type === 'input').props.onChange({ target: { value: ' ' } });
  h.render();
  h.one((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(h.pushes.at(-1), '/search');
});

test('NY repeated searches and clearing the query stay in the NY branch', () => {
  const h = harness('annuities', data.localSearchResults('annuities', 'new-york').matches, 'new-york');
  h.render();
  h.one((node) => node.type === 'input').props.onChange({ target: { value: 'income & growth # future' } });
  h.render();
  h.one((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(h.pushes.at(-1), '/new-york/search?q=income%20%26%20growth%20%23%20future');
  h.finish();
  h.one((node) => node.type === 'input').props.onChange({ target: { value: '   ' } });
  h.render();
  h.one((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(h.pushes.at(-1), '/new-york/search');
});

test('show-more expands results and query navigation remounts draft and pagination', async () => {
  const matches = Array.from({ length: 25 }, (_, index) => ({ path: `/about/${index}`, title: `Result ${index}`, description: 'Snippet' }));
  const h = harness('annuities', matches);
  h.render();
  assert.equal(h.render().filter((node) => node.type === 'li').length, 10);
  h.one((node) => node.type === 'button' && node.props.type === 'button').props.onClick();
  assert.equal(h.render().filter((node) => node.type === 'li').length, 20);
  h.one((node) => node.type === 'button' && node.props.type === 'button').props.onClick();
  assert.equal(h.render().filter((node) => node.type === 'li').length, 25);
  const first = flatten(await pageElement('annuities')).find((node) => node.props.matches);
  const second = flatten(await pageElement('life insurance')).find((node) => node.props.matches);
  const back = flatten(await pageElement('annuities')).find((node) => node.props.matches);
  assert.equal(first.key, 'annuities');
  assert.equal(second.key, 'life insurance');
  assert.equal(back.key, first.key);
  const remounted = harness(second.props.query, second.props.matches);
  remounted.render();
  assert.equal(remounted.one((node) => node.type === 'input').props.value, 'life insurance');
  assert.ok(remounted.render().filter((node) => node.type === 'li').length <= 10);
});
