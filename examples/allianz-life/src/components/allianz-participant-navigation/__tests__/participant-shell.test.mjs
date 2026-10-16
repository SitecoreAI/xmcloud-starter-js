import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, require, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const postcss = require('postcss');
const directory = path.join(sourceRoot, 'components/allianz-participant-navigation');
const headerDirectory = path.join(sourceRoot, 'components/allianz-participant-header');
const rules = loadSource(path.join(directory, 'allianz-participant-navigation.props.ts'));
const fields = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
// Native component contracts are checked in connected mode, without any API
// requests. The released fixture-route guard is exercised separately below.
const originalContentMode = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
test.after(() => {
  if (originalContentMode === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = originalContentMode;
});
const base = '/what-we-offer/annuities/fixed-index-annuities/my-lifetime-income-plus';
const pageIds = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003', '5A5D37EE-1F18-4960-B030-FF5691D71DC9', 'BFBCD304-87A6-411B-AE71-DB48EDEA8D76'];
const expectedLinks = [
  ['Overview', base], ['Getting Started', `${base}/getting-started`], ['Taking Income', `${base}/taking-income`],
  ['FAQs', `${base}/frequently-asked-questions`], ['Glossary', `${base}/glossary`],
];
const nativeField = (fieldId, fieldType, value, itemId = 'participant-datasource') => ({
  jsonValue: { value, metadata: { fieldId, fieldType, itemId } },
});
const linkItem = (index, title, href, targetId) => ({
  id: `participant-link-${index}`,
  title: nativeField(`title-${index}`, 'Single-Line Text', title, `participant-link-${index}`),
  link: nativeField(`link-${index}`, 'General Link', {
    href, text: title, linktype: 'internal', ...(targetId ? { id: targetId } : {}),
  }, `participant-link-${index}`),
});
const navigationData = (withIds = false) => ({
  heading: nativeField('participant-heading', 'Single-Line Text', 'My Lifetime Income+'),
  primaryNav: { targetItems: expectedLinks.map(([title, href], index) => linkItem(index, title, href, withIds ? pageIds[index] : undefined)) },
});
const headerData = () => ({
  logo: nativeField('participant-logo', 'Image', { src: '/allianz-assets/7c46b7f557279783.svg', alt: 'Allianz Life Logo' }),
  tagline: nativeField('participant-tagline', 'Single-Line Text', 'Allianz Life Insurance Company of North America'),
  utilityNav: { targetItems: [linkItem('contact', 'Contact Us', '/contact-us'), linkItem('login', 'Log in', '/login')].map((item, index) => ({
    ...item, icon: nativeField(`icon-${index}`, 'Image', {
      src: `/allianz-assets/${index ? 'aad5d70fcd227d3a' : 'e1a3fd987734d434'}.svg`, alt: index ? 'User' : 'Contact',
    }, item.id),
  })) },
  // Supplying unrelated data must not activate the general-site menu.
  primaryNav: { targetItems: [linkItem('primary', 'Unrelated general navigation', '/why-allianz')] },
});

/** Only the routing hook is substituted; the installed SDK fields/provider are real. */
function loadComponent(filename, pathname = '', mocks = {}) {
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled.require = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier === 'next/navigation') return { usePathname: () => pathname };
    if (specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate));
      if (resolved) return loadSource(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports.Default;
}

function render(kind, datasource, { pathname = '', currentId, isEditing = false, isPreview = false,
  params = {}, omitFields = false } = {}) {
  const filename = kind === 'header' ? path.join(headerDirectory, 'AllianzParticipantHeader.tsx')
    : path.join(directory, 'AllianzParticipantNavigation.tsx');
  const Component = loadComponent(filename, pathname);
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: { mode: { isEditing, isPreview, isNormal: !isEditing && !isPreview },
      siteName: 'allianz-life', locale: 'en', layout: { sitecore: { context: {}, route: {
        name: 'Participant page', itemId: currentId, fields: {}, placeholders: {},
      } } } }, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params,
    ...(omitFields ? {} : { fields: { data: { datasource } } }),
  })));
}

const plain = (html) => html.replace(/<code\b[^>]*>.*?<\/code>/gs, '').replace(/<[^>]+>/g, '').replaceAll('&amp;', '&').trim();
const anchors = (html) => [...html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/gs)]
  .map((match) => ({ attributes: match[1], text: plain(match[2]), href: match[1].match(/\bhref="([^"]*)"/)?.[1] }));
const active = (html) => anchors(html).filter(({ attributes }) => /aria-current="page"/.test(attributes));
const metadata = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/gs)]
  .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
const withoutMetadata = (value) => Array.isArray(value) ? value.map(withoutMetadata)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'metadata').map(([key, item]) => [key, withoutMetadata(item)])) : value;

test('real SDK renders the exact five authored participant links in Treelist order', () => {
  const data = navigationData(), before = JSON.stringify(data);
  const html = render('navigation', data, { pathname: `${base}/glossary`, params: { RenderingIdentifier: 'participant-strip' } });
  assert.deepEqual(anchors(html).map(({ text, href }) => [text, href]), expectedLinks);
  assert.deepEqual(active(html).map(({ text }) => text), ['Glossary']);
  assert.match(html, /id="participant-strip"/);
  assert.match(html, /aria-label="Participant navigation"/);
  assert.match(html, /m-navigation-secondary allianz-participant-navigation/);
  assert.equal(JSON.stringify(data), before, 'rendering leaves the native fields untouched');
  data.primaryNav.targetItems.reverse();
  assert.deepEqual(anchors(render('navigation', data)).map(({ text, href }) => [text, href]), [...expectedLinks].reverse());
});

test('Pages and Preview routes select the native internal item ID even when the rendering URL differs', () => {
  const data = navigationData(true);
  for (const options of [
    { isEditing: true, pathname: '/api/editing/render', currentId: `{${pageIds[3].toLowerCase()}}` },
    { isPreview: true, pathname: '/allianz-life/en/_preview/render', currentId: pageIds[4].replaceAll('-', '') },
    { pathname: base, currentId: pageIds[3] },
  ]) {
    const html = render('navigation', data, options);
    assert.deepEqual(active(html).map(({ text }) => text), [options.currentId.includes('-') ? 'FAQs' : 'Glossary']);
  }
  assert.deepEqual(active(render('navigation', data, { pathname: base, currentId: '00000000-0000-0000-0000-000000000999' })), [],
    'a different native item ID never falls back to a coincident pathname');
});

test('exact public path fallback marks only the current page after the site/language route prefix is removed', () => {
  const data = navigationData();
  for (const [title, href] of expectedLinks) {
    for (const pathname of [href, `/allianz-life/en${href}`, `${href.toUpperCase()}/`]) {
      assert.deepEqual(active(render('navigation', data, { pathname })).map(({ text }) => text), [title]);
    }
  }
  for (const pathname of [`${base}/glossary/child`, `${base}-lookalike`, `${base}/glossary-more`, '', null, '/other-page']) {
    assert.deepEqual(active(render('navigation', data, { pathname })), [], String(pathname));
  }
});

test('current-link comparison rejects external, incomplete and malformed paths without false active states', () => {
  const link = (href, id) => ({ value: { href, ...(id ? { id } : {}) } });
  assert.equal(rules.isCurrentParticipantLink(link(`${base}/glossary?x=1#term`), undefined, `${base}/glossary`), true);
  assert.equal(rules.isCurrentParticipantLink(link(`https://www.allianzlife.com${base}/glossary`), undefined, `${base}/glossary/`), true);
  for (const href of ['', '#term', '?x=1', 'javascript:alert(1)', `https://elsewhere.example${base}`,
    `//elsewhere.example${base}`, `https://www.allianzlife.com@elsewhere.example${base}`, ` ${base}`, `${base}\\glossary`, 'http://[invalid']) {
    assert.equal(rules.isCurrentParticipantLink(link(href), undefined, base), false, href);
    assert.equal(rules.isCurrentParticipantLink(link(href, pageIds[0]), pageIds[0], base), false, `invalid href with ID: ${href}`);
  }
  for (const field of [undefined, {}, { value: {} }]) assert.equal(rules.isCurrentParticipantLink(field, undefined, base), false);
  assert.equal(rules.isCurrentParticipantLink(link(base), undefined, `https://elsewhere.example${base}`), false);
  assert.equal(rules.isCurrentParticipantLink(link(base), undefined, ''), false);
});

test('route-prefix normalization does not trim site-name lookalikes or arbitrary public paths', () => {
  for (const [input, expected] of [
    ['/allianz-life/en', '/'], ['/allianz-life/en/', '/'], [`/allianz-life/en${base}`, base],
    ['/allianz-life/english/page', '/allianz-life/english/page'], ['/allianz-life/en-more/page', '/allianz-life/en-more/page'],
    ['/other-site/en/page', '/other-site/en/page'], [base, base], ['', ''],
  ]) assert.equal(rules.participantCurrentPath(input, 'allianz-life', 'en'), expected);
  assert.equal(rules.participantCurrentPath('/allianz-life/en/page', undefined, 'en'), '/allianz-life/en/page');
  assert.equal(rules.participantCurrentPath('/allianz-life/en/page', 'allianz-life', undefined), '/allianz-life/en/page');
});

test('native Text, General Link, Image and utility icon authoring metadata remains visible in editing', () => {
  const nav = navigationData(true), header = headerData();
  for (const [kind, data, fieldIds] of [
    ['navigation', nav, ['participant-heading', ...expectedLinks.flatMap((_, index) => [`title-${index}`, `link-${index}`])]],
    ['header', header, ['participant-logo', 'participant-logo', 'participant-tagline', 'title-contact', 'link-contact',
      'title-login', 'link-login', 'icon-0', 'icon-1']],
  ]) {
    const before = JSON.stringify(data), html = render(kind, data, { isEditing: true });
    assert.deepEqual(metadata(html).map(({ fieldId }) => fieldId).sort(), fieldIds.sort());
    assert.equal(JSON.stringify(data), before);
    assert.deepEqual(metadata(render(kind, withoutMetadata(data))), [], 'ordinary Edge fields without editing metadata emit no chrome');
  }
});

test('cleared native fields keep their editing chrome without borrowing source captions or destinations', () => {
  // The SDK replaces an empty General Link with its editing placeholder, which
  // intentionally suppresses nested children. Clear Text and Image fields while
  // their parent links are populated to verify their own editing chrome too.
  const clearedTitle = navigationData();
  clearedTitle.heading.jsonValue.value = '';
  for (const item of clearedTitle.primaryNav.targetItems) item.title.jsonValue.value = '';
  assert.equal(metadata(render('navigation', clearedTitle, { isEditing: true })).length, 11);
  const clearedImages = headerData();
  clearedImages.logo.jsonValue.value = {};
  clearedImages.tagline.jsonValue.value = '';
  for (const item of clearedImages.utilityNav.targetItems) {
    item.title.jsonValue.value = '';
    item.icon.jsonValue.value = {};
  }
  assert.equal(metadata(render('header', clearedImages, { isEditing: true })).length, 9);
  const nav = navigationData(), header = headerData();
  nav.heading.jsonValue.value = '';
  for (const item of nav.primaryNav.targetItems) {
    item.title.jsonValue.value = '';
    item.link.jsonValue.value = { href: '' };
  }
  header.logo.jsonValue.value = {};
  header.tagline.jsonValue.value = '';
  for (const item of header.utilityNav.targetItems) {
    item.title.jsonValue.value = '';
    item.link.jsonValue.value = { href: '' };
    item.icon.jsonValue.value = {};
  }
  for (const [kind, data, count] of [['navigation', nav, 6], ['header', header, 5]]) {
    const html = render(kind, data, { isEditing: true });
    assert.equal(metadata(html).length, count);
    assert.match(html, /\[No text in field\]/);
    assert.doesNotMatch(html, /Overview|Taking Income|Contact Us|Allianz Life Insurance Company/);
    assert.doesNotMatch(html, /href="#service-unavailable"/);
  }
  assert.deepEqual(anchors(render('navigation', nav)), []);
  assert.deepEqual(active(render('navigation', nav, { pathname: base })), []);
});

test('absent datasource is an explicit SDK fallback and absent lists create no borrowed navigation', () => {
  for (const kind of ['navigation', 'header']) {
    for (const options of [{}, { omitFields: true }, { isEditing: true }]) {
      const html = render(kind, undefined, options);
      assert.match(html, /role="status"/);
      assert.match(html, new RegExp(`Add a datasource for AllianzParticipant${kind === 'header' ? 'Header' : 'Navigation'}`));
      assert.doesNotMatch(html, /<nav|<header|<a |<button/);
    }
  }
  assert.deepEqual(anchors(render('navigation', { heading: navigationData().heading })), []);
  assert.deepEqual(anchors(render('header', { logo: headerData().logo })).map(({ href }) => href), ['/', '/']);
});

test('participant links inherit safeLink query, fragment, unavailable-service and new-tab rel policy', () => {
  const nav = navigationData();
  Object.assign(nav.primaryNav.targetItems[3].link.jsonValue.value, {
    href: `https://www.allianzlife.com${base}/frequently-asked-questions?from=source`,
    querystring: 'from=native&data=a%23b', anchor: 'faq', target: '_blank', rel: 'author',
  });
  const link = anchors(render('navigation', nav)).find(({ text }) => text === 'FAQs');
  assert.equal(link.href, `${base}/frequently-asked-questions?from=source&amp;from=native&amp;data=a%23b#faq`);
  assert.match(link.attributes, /target="_blank"/);
  assert.match(link.attributes, /rel="author noopener noreferrer"/);
  assert.equal(nav.primaryNav.targetItems[3].link.jsonValue.value.href.startsWith('https://'), true);
  const ordinary = anchors(render('navigation', navigationData()))[0];
  assert.doesNotMatch(ordinary.attributes, /rel=|target=/);
  const header = headerData();
  Object.assign(header.utilityNav.targetItems[0].link.jsonValue.value, { target: '_blank', rel: 'noopener' });
  const contact = anchors(render('header', header)).find(({ text }) => text === 'Contact Us');
  assert.match(contact.attributes, /rel="noopener noreferrer"/);
  const login = anchors(render('header', header)).find(({ text }) => text === 'Log in');
  assert.equal(login.href, '#service-unavailable');
  assert.match(login.attributes, /title="This service is unavailable"/);
  assert.doesNotMatch(login.attributes, /target="_blank"/);
  assert.equal(fields.safeLink(nav.primaryNav.targetItems[3].link.jsonValue).metadata,
    nav.primaryNav.targetItems[3].link.jsonValue.metadata);
  nav.primaryNav.targetItems[3].link.jsonValue.editable = '<a data-native-authoring="true">Native link chrome</a>';
  assert.equal(fields.safeLinkRenderProps(nav.primaryNav.targetItems[3].link.jsonValue).field.editable,
    nav.primaryNav.targetItems[3].link.jsonValue.editable);
});

test('released fixture mode keeps its existing route availability guard separate from native component link data', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
  try {
    const routes = require(path.join(sourceRoot, '../content/public-route-index.json'));
    const data = navigationData();
    assert.deepEqual(anchors(render('navigation', data)).map(({ href }) => href), expectedLinks
      .map(([, href]) => Object.hasOwn(routes, href) ? href : '#service-unavailable'));
    assert.deepEqual(data.primaryNav.targetItems.map(({ link }) => link.jsonValue.value.href), expectedLinks.map(([, href]) => href),
      'local availability never rewrites the authored datasource');
  } finally {
    delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('participant utility header owns the logo and authored utility links without general navigation, search or breadcrumbs', () => {
  const data = headerData(), html = render('header', data);
  assert.match(html, /O-azl-header allianz-participant-header/);
  assert.match(html, /m-navigationUtilityWrapper/);
  assert.match(html, /aria-label="Utility navigation"/);
  assert.deepEqual(anchors(html).map(({ href }) => href), ['/', '/contact-us', '#service-unavailable', '/']);
  assert.equal((html.match(/src="\/allianz-assets\/7c46b7f557279783.svg"/g) ?? []).length, 2);
  for (const source of ['e1a3fd987734d434.svg', 'aad5d70fcd227d3a.svg']) {
    assert.match(html, new RegExp(source.replace('.', '\\.')));
    assert.ok(fs.existsSync(path.join(sourceRoot, '../public/allianz-assets', source)), source);
  }
  assert.doesNotMatch(html, /Unrelated general navigation|allianz-main-navigation|m-navigation-primary\b|Search|search|breadcrumb|<input/);
  assert.match(html, /class="a-link__icon"><span[^>]*aria-hidden="true"/);
  assert.match(html, /aria-label="Menu" aria-pressed="false"/);
});

function flatten(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...React.Children.toArray(element.props?.children).flatMap(flatten)];
}

test('mobile participant navigation and utility control toggle repeatedly with native button semantics', () => {
  for (const kind of ['navigation', 'header']) {
    let open = false;
    const Component = loadComponent(kind === 'header' ? path.join(headerDirectory, 'AllianzParticipantHeader.tsx')
      : path.join(directory, 'AllianzParticipantNavigation.tsx'), base, {
      react: { ...React, useState: () => [open, (updater) => { open = updater(open); }], useId: () => 'participant-native-list' },
      '@sitecore-content-sdk/nextjs': { ...sdk, useSitecore: () => ({ page: {
        siteName: 'allianz-life', locale: 'en', mode: { isEditing: false }, layout: { sitecore: { route: {} } },
      } }) },
    });
    const data = kind === 'header' ? headerData() : navigationData();
    for (const expected of [false, true, false, true, false]) {
      const element = Component({ fields: { data: { datasource: data } } }), nodes = flatten(element);
      const button = nodes.find((node) => node.type === 'button');
      assert.equal(button.props.type, 'button');
      assert.equal(button.props.onKeyDown, undefined, 'Enter and Space keep browser-native activation');
      assert.equal(button.props.href, undefined);
      assert.equal(button.props[kind === 'navigation' ? 'aria-expanded' : 'aria-pressed'], expected);
      assert.equal(element.props.className.includes(kind === 'navigation' ? 'm-navigation-secondary-open' : 'm-navigation-primary-open'), expected);
      assert.equal(nodes.find((node) => node.type === 'i').props['aria-hidden'], 'true');
      if (kind === 'navigation') {
        assert.equal(button.props['aria-controls'], 'participant-native-list');
        assert.equal(nodes.find((node) => node.type === 'ul').props.id, button.props['aria-controls']);
        assert.equal(nodes.filter((node) => node.type === 'li').length, 5);
      }
      button.props.onClick();
    }
  }
});

test('mobile list hiding prevents collapsed links from exposure and desktop source geometry stays inherited', () => {
  const local = postcss.parse(fs.readFileSync(path.join(directory, 'AllianzParticipantNavigation.css'), 'utf8'));
  const recovered = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8'));
  const declarations = (root, selector, media) => {
    const matches = [];
    root.walkRules((rule) => {
      if (rule.selector === selector && (rule.parent.type === 'atrule' ? rule.parent.params : undefined) === media) {
        matches.push(Object.fromEntries(rule.nodes.map(({ prop, value }) => [prop, value])));
      }
    });
    return Object.assign({}, ...matches);
  };
  assert.equal(declarations(local, '.allianz-participant-navigation:not(.m-navigation-secondary-open) .nav-sec-list', '(max-width: 703px)').visibility, 'hidden');
  assert.equal(declarations(local, '.allianz-participant-navigation.m-navigation-secondary-open .nav-sec-list', '(max-width: 703px)').visibility, 'visible');
  assert.equal(declarations(recovered, '.m-navigation-secondary .nav-sec-list', '(max-width:703px)')['max-height'], '0');
  assert.equal(declarations(recovered, '.m-navigation-secondary-open .nav-sec-list', '(max-width:703px)').overflow, 'visible');
  assert.equal(declarations(recovered, '.m-navigation-secondary .nav-sec-list', '(min-width:704px)').display, 'flex');
  assert.equal(declarations(recovered, '.m-navigation-secondary .nav-sec-list-title', '(min-width:704px)').display, 'none');
  local.walkRules((rule) => assert.match(rule.selector, /^\.allianz-participant-navigation\b/));
});
