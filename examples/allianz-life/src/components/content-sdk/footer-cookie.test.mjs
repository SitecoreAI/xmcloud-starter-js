/** Source, interaction-handler and SDK-field checks; managed browser QA is separate. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const postcss = require('postcss');
const sourceRoot = fileURLToPath(new URL('../..', import.meta.url));
const appRoot = path.resolve(sourceRoot, '..');
const read = (file) => fs.readFileSync(path.join(appRoot, file), 'utf8');
const fixture = JSON.parse(read('content/native-content.json')).shared.footer.fields.data.datasource;
const sourceBanner = read('src/components/content-sdk/__tests__/cookie-banner.source.html');
const sourceStyles = postcss.parse(read('public/allianz-assets/source-style.css'));

function load(relative, mocks) {
  const modules = new Map();
  function compile(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const result = new Module(filename);
    result.filename = filename;
    result.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, result);
    const fallback = result.require.bind(result);
    result.require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
      if (local) {
        const found = [local, `${local}.ts`, `${local}.tsx`].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
        if (found && /\.tsx?$/.test(found)) return compile(found);
      }
      return fallback(specifier);
    };
    result._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return result.exports;
  }
  return compile(path.join(sourceRoot, relative));
}
function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  return React.isValidElement(node) ? [node, ...flatten(node.props.children)] : [];
}
function harness({ width = 704, isEditing = false, isDesignLibrary = false, clientReady = true, cookie = '', protocol = 'https:' } = {}) {
  const states = [], writes = [], events = [], listeners = [];
  let cursor = 0, root, cookieValue = cookie;
  const document = { get cookie() { return cookieValue; }, set cookie(value) { writes.push(value); cookieValue = [cookieValue, value.split(';')[0]].filter(Boolean).join('; '); } };
  const window = { matchMedia: () => ({ matches: width <= 703 }),
    addEventListener: (...args) => listeners.push(['add', ...args]), removeEventListener: (...args) => listeners.push(['remove', ...args]),
    dispatchEvent: (event) => { events.push(event.type); }, location: { reload() { assert.fail('dismissal must not reload the page'); } } };
  const hooks = { ...React, useId: () => ':footer:', useSyncExternalStore: (_subscribe, snapshot, server) => clientReady ? snapshot() : server(),
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; } };
  const mocks = { react: hooks, '@sitecore-content-sdk/nextjs': { ...sdk, Text: 'sdk-text', RichText: 'sdk-rich', Link: 'sdk-link', useSitecore: () => ({ page: { mode: { isEditing, isDesignLibrary } } }) } };
  const notice = load('components/content-sdk/ConsentControls.tsx', mocks).default;
  const footer = load('components/allianz-footer/AllianzFooter.tsx', mocks).Default;
  const consent = load('lib/consent.ts', {});
  function scope(fn) {
    const previous = { document: globalThis.document, window: globalThis.window, location: globalThis.location };
    Object.assign(globalThis, { document, window, location: { protocol } });
    try { return fn(); } finally { Object.assign(globalThis, previous); }
  }
  return { writes, events, listeners, consent, scope,
    notice() { cursor = 0; root = scope(notice); return flatten(root); },
    footer() { cursor = 0; root = scope(() => footer({ params: {}, fields: { data: { datasource: fixture } } })); return flatten(root); },
    html() { return renderToStaticMarkup(root); },
    click() { const button = flatten(root).find((node) => node.type === 'button'); assert.ok(button); scope(() => button.props.onClick()); },
  };
}
function rule(selector, media = null) {
  const result = {};
  let found = false;
  sourceStyles.walkRules((node) => {
    if (node.selector.split(',').map((value) => value.trim()).includes(selector) &&
      (media === null ? node.parent.type === 'root' : node.parent.params === media)) {
      found = true;
      Object.assign(result, Object.fromEntries(node.nodes.filter((entry) => entry.type === 'decl').map((entry) => [entry.prop, entry.value])));
    }
  });
  assert.ok(found, `recovered source rule: ${selector} / ${media}`);
  return result;
}
const textContent = (html) => html.replace(/<[^>]+>/g, '').replaceAll('&quot;', '"').replaceAll('&amp;', '&').replace(/\s+/g, ' ').trim();

test('exact source cookie text, Privacy fragment and Dismiss icon are retained', () => {
  const h = harness(); const nodes = h.notice(); const html = h.html();
  assert.equal(textContent(html), textContent(sourceBanner.replace(/<(title|desc)\b[^>]*>.*?<\/\1>/g, '')));
  const link = nodes.find((node) => node.props.href === '/Privacy#OnlinePrivacyPolicy');
  assert.equal(link.props.href, '/Privacy#OnlinePrivacyPolicy');
  assert.equal(link.props.target, undefined);
  const button = nodes.find((node) => node.type === 'button');
  assert.equal(button.props.type, 'button', 'Enter and Space use native activation');
  assert.equal(button.props.onKeyDown, undefined);
  assert.equal(button.props.className, 'm-axlButton m-axlButton-icon m-axlButton--secondary m-axlButton--negative js-close-button');
  assert.equal(nodes.find((node) => node.type === 'path').props.d, /<path[^>]+d="([^"]+)"/.exec(sourceBanner)[1]);
  assert.doesNotMatch(html, /Cookie settings|Accept optional cookies|Reject optional cookies/);
});

test('fresh visitors see one notice; dismissed reloads and route changes stay dismissed', () => {
  const first = harness(); assert.equal(first.notice().filter((node) => node.props.className === 'm-axl-cookie-banner').length, 1);
  first.click(); assert.equal(first.notice().length, 0);
  assert.deepEqual(first.writes, ['allianz_cookie_notice=dismissed; Path=/; SameSite=Lax; Secure']);
  assert.deepEqual(first.events, ['allianz-cookie-notice-dismissed']);
  assert.equal(harness({ cookie: first.writes[0].split(';')[0] }).notice().length, 0, 'new mount after reload/navigation reads the cookie');
  const http = harness({ protocol: 'http:' }); http.notice(); http.click();
  assert.equal(http.writes[0], 'allianz_cookie_notice=dismissed; Path=/; SameSite=Lax');
});

test('dismissal never grants analytics consent or treats malformed/other cookies as notice dismissal', () => {
  for (const cookie of ['', 'other_allianz_cookie_notice=dismissed', 'allianz_cookie_notice=other', 'allianz_demo_consent=granted']) {
    const h = harness({ cookie }); assert.ok(h.notice().length);
    assert.equal(h.scope(h.consent.hasAnalyticsConsent), cookie === 'allianz_demo_consent=granted');
    h.click(); assert.equal(h.scope(h.consent.hasAnalyticsConsent), cookie === 'allianz_demo_consent=granted');
    assert.ok(h.writes.every((value) => !value.includes('allianz_demo_consent')));
  }
  assert.equal(harness({ cookie: 'a=1; allianz_cookie_notice=dismissed; b=2' }).notice().length, 0);
});

test('editing, Design Library and pre-hydration visits have no notice or settings row', () => {
  for (const settings of [{ isEditing: true }, { isDesignLibrary: true }, { clientReady: false }]) assert.equal(harness(settings).notice().length, 0);
  const layout = read('src/Layout.tsx');
  assert.ok(layout.indexOf('<ConsentControls />') < layout.indexOf('{header}'), 'relative mobile notice precedes the header');
  assert.equal((layout.match(/<ConsentControls\s*\/>/g) || []).length, 1);
  assert.doesNotMatch(read('src/app/globals.css'), /allianz-cookie-settings|allianz-consent-panel/);
});

test('source cookie styling stays fixed at704 and relative at703 with the original gray and button spacing', () => {
  const banner = rule('.m-axl-cookie-banner');
  assert.equal(banner.position, 'fixed'); assert.equal(banner.bottom, '0'); assert.equal(banner.background, '#5b5b5b');
  assert.equal(banner.padding, '24px'); assert.equal(banner['z-index'], '6000');
  assert.equal(rule('.m-axl-cookie-banner', '(max-width:703px)').position, 'relative');
  assert.equal(rule('.m-axl-cookie-banner__content').display, 'flex');
  assert.equal(rule('.m-axl-cookie-banner__content', '(max-width:703px)').display, 'block');
  assert.equal(rule('.m-axl-cookie-banner__content .m-axlButton').margin, '0 0 0 12px');
  assert.equal(rule('.m-axl-cookie-banner__content .m-axlButton', '(max-width:703px)').margin, '24px 0 0');
  assert.equal(rule('.m-axl-cookie-banner', 'print').display, 'none');
});

test('source footer social row moves below legal links at703 and returns above the service at704', () => {
  for (const width of [370, 703, 704, 991, 992, 1280]) {
    const h = harness({ width }); const nodes = h.footer();
    const social = nodes.filter((node) => node.props['aria-label'] === 'Social networks');
    assert.equal(social.length, 1, 'only the active native image/link fields mount');
    assert.equal(social[0].props.className, `m-footer__social ${width <= 703 ? 'u-hidden-medium-up' : 'u-hidden-small-down'}`);
    const service = nodes.find((node) => node.props.className === 'c-footer__service');
    const serviceSocial = flatten(service).filter((node) => node.props['aria-label'] === 'Social networks');
    assert.equal(serviceSocial.length, width <= 703 ? 1 : 0);
    const links = flatten(social[0]).filter((node) => node.type === 'sdk-link');
    assert.equal(links.length, 5);
    assert.deepEqual(links.map((node) => node.key), fixture.socialNav.targetItems.map((item) => item.id));
    assert.ok(nodes.find((node) => node.props.className === 'c-copyright').props.field === fixture.copyright.jsonValue);
  }
  assert.equal(rule('.c-footer__service .c-footer__copyright', '(max-width:703px)').order, '2');
  assert.equal(rule('.c-footer__legal', '(max-width:703px)')['flex-direction'], 'column');
  assert.equal(rule('.m-footer__social', '(max-width:703px)')['padding-top'], '40px');
});

test('mobile authoring retains each actual social field object once and keeps copyright typography', () => {
  const h = harness({ width: 703, isEditing: true }); const nodes = h.footer();
  const social = nodes.find((node) => node.props['aria-label'] === 'Social networks');
  const content = flatten(social);
  for (const item of fixture.socialNav.targetItems) {
    assert.equal(content.filter((node) => node.type === 'sdk-link' && node.props.field === item.link.jsonValue).length, 1);
    assert.equal(content.filter((node) => node.props.field === item.icon.jsonValue).length, 1);
  }
  const copyright = nodes.find((node) => node.props.className === 'c-copyright');
  assert.equal(copyright.props.tag, 'small');
  assert.equal(rule('.c-copyright')['font-weight'], '600');
  assert.equal(rule('.c-copyright')['font-size'], '1rem');
  assert.equal(rule('.c-copyright')['line-height'], '1.5rem');
});
