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
const { Link, SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const filename = fileURLToPath(new URL('./allianz-fields.ts', import.meta.url));
function loadSource(filename) {
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    const local = specifier.startsWith('.') && path.resolve(path.dirname(filename), `${specifier}.ts`);
    return local && fs.existsSync(local) ? loadSource(local) : nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const { safeLink } = loadSource(filename);
const field = (href, attributes = {}) => ({ value: { href, text: 'Open', ...attributes } });
const href = (value) => safeLink(field(value)).value.href;
process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
process.env.NODE_ENV = 'test';

// Both Sitecore Link and its underlying Next Link are the installed renderers.
function render(input, isEditing = false, editable = true) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: {
      siteName: 'allianz-life', locale: 'en',
      mode: { isEditing, isNormal: !isEditing, isPreview: false },
      layout: { sitecore: { context: {}, route: { name: 'Link contract test', fields: {}, placeholders: {} } } },
    }, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Link, { field: safeLink(input), editable })));
}
function renderedHref(input, editable = true) {
  const html = render(input, false, editable);
  return /href="([^"]*)"/.exec(html)?.[1].replaceAll('&amp;', '&');
}

test('captured public routes and assets stay local; unavailable routes are service states', () => {
  for (const value of ['/what-we-offer/annuities', '/for-financial-professionals/resources/4-ways-to-help-clients-fight-inflation', '/allianz-assets/source.pdf', '/search']) {
    assert.equal(href(value), value);
  }
  for (const value of ['/rates', '/for-financial-professionals/advisory-solutions', '/what-we-offer/life-insurance/the-underwriting-process', '/about/newsroom/_local/missing']) {
    assert.equal(href(value), '#service-unavailable');
  }
});

test('normal production accepts new native public routes without a custom content-mode setting', () => {
  const previousNode = process.env.NODE_ENV, previousMode = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  process.env.NODE_ENV = 'production';
  delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  try {
    assert.equal(renderedHref(field('/new-native-public-page?view=detail#section')), '/new-native-public-page?view=detail#section');
    for (const value of ['/api/private', '/login', 'https://external.example.invalid/']) assert.equal(href(value), '#service-unavailable');
  } finally {
    if (previousNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNode;
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE; else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = previousMode;
  }
});

test('Consumer Protection fragment reaches the real SDK as hash, not encoded pathname', () => {
  const content = JSON.parse(fs.readFileSync(new URL('../../content/native-content.json', import.meta.url), 'utf8'));
  const footer = content.shared.footer.fields.data.datasource;
  const links = [...footer.utilityNav.targetItems, ...footer.primaryNav.targetItems.flatMap((group) => group.children.results)];
  const input = links.find((item) => item.link.jsonValue.value.href.includes('#consumer')).link.jsonValue;
  const normalized = safeLink(input);
  assert.equal(normalized.value.href, '/customer-service-frequently-asked-questions');
  assert.equal(normalized.value.anchor, 'consumer');
  assert.equal(renderedHref(input), '/customer-service-frequently-asked-questions#consumer');
  assert.doesNotMatch(render(input), /%23consumer/);
  assert.equal(input.value.href, '/customer-service-frequently-asked-questions#consumer');
});

test('embedded query/hash values preserve encoding, repeated keys, and native attributes', () => {
  const input = field('https://www.allianzlife.com/about?tag=one&tag=two&q=a%23b&term=c%26d#overview', { class: 'native-link', title: 'About', target: '_blank', linktype: 'internal' });
  const output = safeLink(input);
  assert.equal(output.value.href, '/about');
  assert.equal(output.value.querystring, 'tag=one&tag=two&q=a%23b&term=c%26d');
  assert.equal(output.value.anchor, 'overview');
  assert.equal(output.value.target, '');
  assert.equal(output.value.class, 'native-link');
  assert.equal(output.value.title, 'About');
  assert.equal(renderedHref(input), '/about?tag=one&tag=two&q=a%23b&term=c%26d#overview');
});

test('native split query/hash fields and combined captured fields use the same contract', () => {
  const native = field('/about', { querystring: 'utm_campaign=retirement_income', anchor: 'overview' });
  assert.equal(renderedHref(native), '/about?utm_campaign=retirement_income#overview');
  const mixed = field('/about?existing=1#captured', { querystring: '?native=2', anchor: '#native' });
  assert.equal(renderedHref(mixed), '/about?existing=1&native=2#native');
  const alreadySplit = field('/about?q=a%23b', { querystring: 'q=a%23b', anchor: 'details' });
  assert.equal(renderedHref(alreadySplit), '/about?q=a%23b#details');
});

test('file links and same-page fragment/query links use real SDK fallback safely', () => {
  assert.equal(renderedHref(field('/allianz-assets/source.pdf?download=1#page=2')), '/allianz-assets/source.pdf?download=1#page=2');
  assert.equal(renderedHref(field('#section')), '#section');
  assert.equal(renderedHref(field('#section', { querystring: 'view=public' })), '?view=public#section');
  assert.equal(renderedHref(field('?q=a%23b#section')), '?q=a%23b#section');
  assert.equal(renderedHref(field('?')), '?');
});

test('blocked services discard stale query/hash fields and never leak their destination', () => {
  for (const value of ['https://external.example.invalid/', '//external.example.invalid/about', 'http://www.allianzlife.com/about', 'https://www.allianzlife.com:444/about', 'https://user:password@www.allianzlife.com/about', 'javascript:alert(1)', '/login', '/%6cogin', '/api/private', '/sitecore', '/about#demo-unavailable', '#service-unavailable']) {
    const input = field(value, { querystring: 'private=1', anchor: 'old', target: '_blank' });
    assert.equal(renderedHref(input), '#service-unavailable', value);
    const output = safeLink(input);
    assert.equal(output.value.querystring, '');
    assert.equal(output.value.anchor, '');
    assert.equal(output.value.title, 'This service is unavailable');
  }
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  try {
    assert.equal(renderedHref(field('/future-public-page?x=1#intro')), '/future-public-page?x=1#intro');
    for (const value of ['/login', '/%6cogin', '/%2flogin', '/new-york/registration', '/api/private']) assert.equal(href(value), '#service-unavailable');
  } finally { process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture'; }
});

test('cleared native fields and real metadata survive normal and editing SDK rendering', () => {
  const metadata = { fieldId: 'native-general-link', fieldType: 'General Link', itemId: 'native-item' };
  const cleared = { value: {}, metadata };
  assert.strictEqual(safeLink(cleared), cleared);
  assert.strictEqual(safeLink({ value: { href: '' }, metadata }).metadata, metadata);
  const emptyEditing = render(cleared, true);
  assert.match(emptyEditing, /native-general-link/);
  assert.match(emptyEditing, /\[No text in field\]/);
  assert.doesNotMatch(emptyEditing, /href="\/"|service-unavailable/);
  assert.equal(render(cleared, false, false), '');
  const populated = { ...field('/about?view=public#overview', { linktype: 'internal' }), metadata };
  assert.strictEqual(safeLink(populated).metadata, metadata);
  assert.equal(renderedHref(populated), '/about?view=public#overview');
  assert.equal(renderedHref(populated, false), '/about?view=public#overview');
  const editing = render(populated, true);
  assert.match(editing, /native-general-link/);
  assert.match(editing, /href="\/about\?view=public#overview"/);
});
