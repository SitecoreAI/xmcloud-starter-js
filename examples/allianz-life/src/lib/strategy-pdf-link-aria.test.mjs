import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const Fields = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
process.env.NODE_ENV = 'test';
const contracts = [
  ['college-funding--section-8-card-2', 'Download our college funding brochure for parents', ''],
  ['college-funding--section-8-card-3', 'Download our college funding brochure for grandparents', ''],
  ['college-funding--section-8-card-4', 'See how IUL can be a tax-efficient gift to help benefit generations of your family', ''],
  ['flexible-estate-planning-strategies--section-5-card-2', 'Flexible estate planning strategies overview', ''],
  ['flexible-estate-planning-strategies--section-5-card-3', 'Private split-dollar arrangements', ''],
  ['flexible-estate-planning-strategies--section-5-card-4', 'Irrevocable life insurance trusts', ''],
  ['retirement-planning--section-5-card-2', 'A strategy that can protect assets and help supplement retirement income', 'A strategy that can protect assets and help supplement retirement income'],
  ['retirement-planning--section-5-card-3', 'The three buckets of a retirement strategy', 'The three buckets of a retirement strategy'],
  ['retirement-planning--section-5-card-4', 'Understanding indexed universal life insurance (IUL)', 'Understanding fixed index universal life insurance (FIUL)'],
];
const field = (key, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: `test-only-${key}`, fieldId: `test-only-${key}-field`, fieldType: type } } });
function datasource(key, caption, value) {
  return { children: { results: [
    { id: 'test-only-intro', heading: field('intro-heading', 'Resources'), body: field('intro-body', '<p>Introduction</p>', 'Rich Text') },
    { id: `test-only-${key}`, heading: field(`${key}-heading`, caption),
      body: field(`${key}-body`, '', 'Rich Text'), link: field(`${key}-link`, value, 'General Link') },
  ] } };
}
const mediaValue = (caption, attrs = {}) => ({ href: '/allianz-assets/test-only-resource.pdf',
  text: caption, linktype: 'media', id: '{TEST-ONLY-MEDIA}', target: '_blank', querystring: '', anchor: '', ...attrs });
function resourceAnchor(html) {
  const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]).filter(tag => /class="m-card"/.test(tag));
  assert.equal(anchors.length, 1, html);
  return anchors[0];
}

for (const [key, caption, ariaLabel] of contracts) {
  test(`${key}: exact source ARIA label survives visitor and editor SDK rendering`, () => {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
    const data = datasource(key, caption, mediaValue(caption, { 'aria-label': ariaLabel }));
    const before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(Cards.StrategyIntroResources, data, editing);
      const anchor = resourceAnchor(html);
      assert.ok(anchor.includes(`aria-label="${ariaLabel}"`), anchor);
      assert.ok(anchor.includes('target="_blank"'), anchor);
      assert.ok(anchor.includes('href="/allianz-assets/test-only-resource.pdf"'), anchor);
      assert.ok(html.includes(`<h4>${caption}</h4>`) || (editing && html.includes(caption)), html);
      if (editing) assert.ok(html.includes(`test-only-${key}-link-field`), html);
      else assert.ok(anchor.includes('rel="noopener noreferrer"'), anchor);
    }
    assert.equal(JSON.stringify(data), before);
  });
}

test('an explicitly empty camelCase SDK label takes precedence over the kebab-case alias', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
  const data = datasource('empty-alias', 'Resource', mediaValue('Resource', { ariaLabel: '', 'aria-label': 'Stale alias' }));
  for (const editing of [false, true]) {
    const anchor = resourceAnchor(render(Cards.StrategyIntroResources, data, editing));
    assert.ok(anchor.includes('aria-label=""'), anchor);
    assert.ok(!anchor.includes('Stale alias'), anchor);
  }
});

test('an absent source ARIA label stays absent and cleared links add no canvas controls', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
  const data = datasource('absent-label', 'Resource', mediaValue('Resource'));
  for (const editing of [false, true]) assert.doesNotMatch(resourceAnchor(render(Cards.StrategyIntroResources, data, editing)), /aria-label=/);
  data.children.results[1].link.jsonValue.value = { 'aria-label': '' };
  const before = JSON.stringify(data);
  const visitor = render(Cards.StrategyIntroResources, data);
  assert.ok(visitor.includes('<div class="m-card">'), visitor);
  assert.doesNotMatch(visitor, /<a\b[^>]*class="m-card"/);
  assert.ok(!render(Cards.StrategyIntroResources, data, true).includes('test-only-absent-label-link-field'));
  assert.equal(JSON.stringify(data), before);
});

test('representative media shapes preserve fields while visitor URL policy remains explicit', () => {
  const relative = mediaValue('Resource', { href: '/-/media/test-only-resource.pdf', 'aria-label': '' });
  const idOnly = mediaValue('Resource', { href: undefined, 'aria-label': '' });
  const absolute = mediaValue('Resource', { href: 'https://test-only-cm.invalid/-/media/resource.pdf', 'aria-label': '' });
  for (const [mode, value, expectedHref] of [
    ['connected', relative, '/-/media/test-only-resource.pdf'],
    ['fixture', relative, '#service-unavailable'],
    ['connected', absolute, '#service-unavailable'],
  ]) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const data = datasource(`shape-${mode}`, 'Resource', value), before = JSON.stringify(data);
    const anchor = resourceAnchor(render(Cards.StrategyIntroResources, data));
    assert.ok(anchor.includes(`href="${expectedHref}"`), anchor);
    assert.ok(anchor.includes('aria-label=""'), anchor);
    const native = data.children.results[1].link.jsonValue;
    const preserved = Fields.allianzLinkField(native, true);
    assert.equal(preserved, native);
    assert.deepEqual(preserved.metadata, native.metadata);
    assert.equal(preserved.value.id, '{TEST-ONLY-MEDIA}');
    assert.equal(JSON.stringify(data), before);
  }
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  const data = datasource('id-only', 'Resource', idOnly);
  assert.ok(render(Cards.StrategyIntroResources, data).includes('<div class="m-card">'));
  assert.doesNotMatch(render(Cards.StrategyIntroResources, data), /<a\b[^>]*class="m-card"/);
  assert.ok(!render(Cards.StrategyIntroResources, data, true).includes('test-only-id-only-link-field'));
});
