import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, metadata } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Breadcrumbs = loadSource(path.join(sourceRoot, 'components/allianz-breadcrumbs/AllianzBreadcrumbs.tsx')).Default;
const fixture = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'lib/breadcrumb-source-labels.fixture.json'), 'utf8'));
function frozen(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
}
function fields(items, editing = false) {
  return { primaryNav: { targetItems: items.map((item, i) => ({ id: `test-breadcrumb-${i}`,
    title: { jsonValue: { value: item.title, ...(editing ? { metadata: metadata(`breadcrumb-title-${i}`, 'Single-Line Text') } : {}) } },
    link: { jsonValue: { value: item.linkValue, ...(editing ? { metadata: metadata(`breadcrumb-link-${i}`, 'General Link') } : {}) } },
  })) } };
}
const decode = value => value?.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const anchors = html => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(match => ({ attrs: Object.fromEntries([...match[1].matchAll(/([^\s=]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])), body: match[2] }));
const one = value => fields([{ title: 'Visible title remains distinct', linkValue: { href: '/about', text: 'Link text is not an aria fallback', title: 'Tooltip is not an aria fallback', ...value } }]);
function withMode(mode, run) {
  const env = process.env.NODE_ENV, content = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  process.env.NODE_ENV = 'test'; process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
  try { run(); } finally {
    if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
    if (content === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE; else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = content;
  }
}

for (const mode of ['fixture', 'connected']) {
  test(`${mode}: all five exact source labels survive with source order, destinations and clickable final item`, () => withMode(mode, () => {
    const data = frozen(fields(fixture.items)), before = JSON.stringify(data);
    const html = render(Breadcrumbs, data), links = anchors(html);
    assert.equal(links.length, 5);
    assert.deepEqual(links.map(a => a.attrs['aria-label']), fixture.items.map(item => item.sourceAttributes['aria-label']));
    assert.deepEqual(links.map(a => a.body), fixture.items.map(item => item.title));
    assert.deepEqual(links.map(a => a.attrs.href), fixture.items.map(item => item.linkValue.href === 'https://www.allianzlife.com/' ? '/' : item.linkValue.href));
    assert.equal(links.filter(a => a.attrs['aria-current'] === 'page').length, 1);
    assert.equal(links.at(-1).attrs['aria-current'], 'page');
    assert.match(links.at(-1).attrs.class, /\bis-active\b/);
    assert.ok(links.at(-1).attrs.href.endsWith('/5-tips-for-business-buy-sell-agreements'));
    assert.equal((html.match(/<i class="c-icon" aria-hidden="true">\//g) || []).length, 4);
    assert.match(html, /<nav class="azl-breadcrumb l-container" aria-label="Breadcrumbs">/);
    assert.match(html, /<span class="u-aria-only">You are here:<\/span>/);
    assert.equal(JSON.stringify(data), before);
  }));

  test(`${mode}: native Link and Text editing metadata remain exact and independently editable`, () => withMode(mode, () => {
    const data = frozen(fields(fixture.items, true)), before = JSON.stringify(data);
    const html = render(Breadcrumbs, data, true), links = anchors(html);
    assert.deepEqual(links.map(a => a.attrs['aria-label']), fixture.items.map(item => item.sourceAttributes['aria-label']));
    for (let i = 0; i < 5; i++) {
      assert.ok(html.includes(`test-breadcrumb-link-${i}-field`));
      assert.ok(html.includes(`test-breadcrumb-title-${i}-field`));
      assert.ok(links[i].body.includes(fixture.items[i].title));
    }
    assert.equal(links.at(-1).attrs['aria-current'], 'page');
    assert.equal(JSON.stringify(data), before);
  }));

  test(`${mode}: both SDK link value spellings are supported without inventing labels`, () => withMode(mode, () => {
    for (const [value, expected] of [
      [{ ariaLabel: 'Authored camelCase' }, 'Authored camelCase'],
      [{ 'aria-label': 'Authored literal attribute' }, 'Authored literal attribute'],
      [{ ariaLabel: 'Camel priority', 'aria-label': 'Literal alternative' }, 'Camel priority'],
      [{ ariaLabel: '', 'aria-label': 'No stale fallback' }, ''],
      [{ 'aria-label': '' }, ''],
      [{ ariaLabel: '  Preserve spacing  ' }, '  Preserve spacing  '],
      [{ ariaLabel: 12, 'aria-label': 'Valid authored string' }, 'Valid authored string'],
      [{ ariaLabel: null, 'aria-label': 'Literal after null' }, 'Literal after null'],
      [{}, undefined], [{ ariaLabel: false }, undefined], [{ 'aria-label': { text: 'Wrong type' } }, undefined],
    ]) {
      const data = frozen(one(value)), before = JSON.stringify(data);
      const [a] = anchors(render(Breadcrumbs, data));
      assert.equal(a.attrs['aria-label'], expected);
      assert.equal(a.body, 'Visible title remains distinct');
      assert.equal(JSON.stringify(data), before);
    }
  }));

  test(`${mode}: authored labels are safely escaped and remain independent from visible text`, () => withMode(mode, () => {
    const label = 'Read "buy & sell" <details>';
    const data = frozen(one({ 'aria-label': label }));
    const html = render(Breadcrumbs, data), [a] = anchors(html);
    assert.equal(a.attrs['aria-label'], label);
    assert.match(html, /aria-label="Read &quot;buy &amp; sell&quot; &lt;details&gt;"/);
    assert.equal(a.body, 'Visible title remains distinct');
  }));

  test(`${mode}: existing visitor link safety preserves the authored accessibility label`, () => withMode(mode, () => {
    for (const href of ['https://external.example/', '/login', 'mailto:someone@example.invalid', 'javascript:void(0)']) {
      const data = frozen(one({ href, 'aria-label': 'Original authored destination label' })), before = JSON.stringify(data);
      const [a] = anchors(render(Breadcrumbs, data));
      assert.equal(a.attrs.href, '#service-unavailable');
      assert.equal(a.attrs['aria-label'], 'Original authored destination label');
      assert.equal(JSON.stringify(data), before);
    }
  }));

  test(`${mode}: normal href query, case, hash, target and existing tooltip behavior remain intact`, () => withMode(mode, () => {
    const [a] = anchors(render(Breadcrumbs, one({ href: '/About?a=one&a=two#details', target: '_blank', 'aria-label': 'About details' })));
    assert.equal(a.attrs.href, '/About?a=one&a=two#details');
    assert.equal(a.attrs.target, '_blank');
    assert.equal(a.attrs.title, 'Tooltip is not an aria fallback');
    assert.equal(a.attrs['aria-label'], 'About details');
  }));

  test(`${mode}: missing and cleared collections do not manufacture breadcrumb items`, () => withMode(mode, () => {
    for (const data of [undefined, {}, { primaryNav: { targetItems: [] } }]) assert.equal(anchors(render(Breadcrumbs, data)).length, 0);
    const data = fields([{ title: '', linkValue: {} }], true), before = JSON.stringify(data);
    const editor = render(Breadcrumbs, frozen(data), true);
    assert.match(editor, /test-breadcrumb-link-0-field/);
    // The existing SDK empty-Link placeholder suppresses children; keep that behavior unchanged.
    assert.equal(JSON.stringify(data), before);
  }));
}

test('the narrow accessibility patch does not change the separately held two-ancestor current-state behavior', () => {
  const data = fields([{ title: 'Home', linkValue: { href: '/', 'aria-label': 'Home' } },
    { title: 'For Financial Professionals', linkValue: { href: '/for-financial-professionals', 'aria-label': 'For Financial Professionals' } }]);
  const links = anchors(render(Breadcrumbs, data));
  assert.equal(links.length, 2);
  assert.equal(links[1].attrs['aria-current'], 'page');
  assert.match(links[1].attrs.class, /\bis-active\b/);
  // This witnesses why the current Default is still not suitable for Spirit.
});
