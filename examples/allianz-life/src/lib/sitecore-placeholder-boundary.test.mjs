import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { allianzLinkField } = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
const { safeEditorialRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial.ts'));
const { Default } = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const metadata = Object.freeze({ itemId: 'test-only-placeholder-owner', fieldId: 'test-only-placeholder-link', fieldType: 'General Link' });
const freeze = (value) => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
// Controlled formatter-output JSON only: this is not a Sitecore XML serializer or native Preview test.
const field = (href, extra = {}) => freeze({ value: {
  href, linktype: 'external', text: 'Original native caption', target: '_blank',
  title: 'Original native title', class: 'original-link', 'aria-label': 'Original native label', ...extra,
}, metadata });

function card(input, mode, layout) {
  const data = freeze({ id: 'test-only-grid', children: { results: [{ id: 'test-only-card', fieldCollection: [
    { name: 'Heading', jsonValue: { value: 'Authored card heading' } },
    { name: 'Body', jsonValue: { value: '<p>Authored card body.</p>' } },
    { name: 'Link', jsonValue: input },
  ] }] } });
  const before = JSON.stringify(data);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: {
      isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview',
    }, layout: { sitecore: { context: {}, route: { name: 'Synthetic native placeholder', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Default, { fields: { data: { datasource: data } },
    params: { layout, columns: '3', headingLevel: 'h3' } })));
  assert.equal(JSON.stringify(data), before);
  return html;
}

test('only the exact typed unbound external placeholder enters ordinary literal-hash normalization', () => {
  for (const attributes of [{}, { id: '', querystring: '', anchor: '' }]) {
    const original = field('http://#', attributes), before = JSON.stringify(original);
    const output = safeLink(original);
    assert.deepEqual(output.value, { ...original.value, href: '#', target: '', querystring: '', anchor: '' });
    assert.strictEqual(output.metadata, original.metadata);
    assert.strictEqual(allianzLinkField(original, true), original);
    assert.strictEqual(safeLinkRenderProps(original, true).field, original);
    assert.equal(JSON.stringify(original), before);
  }
});

test('actual CardGrid and installed SDK render repaired native JSON like ordinary hash in normal and Preview only', () => {
  for (const layout of ['stacked', 'cards']) for (const mode of ['normal', 'preview', 'editing']) {
    const input = field('http://#', { id: '', querystring: '', anchor: '' });
    const html = card(input, mode, layout);
    const href = /<a\b[^>]*href="([^"]*)"/.exec(html)?.[1];
    assert.equal(href, mode === 'editing' ? 'http://#' : '#');
    if (layout === 'stacked') assert.match(html, /Original native caption/);
    assert.match(html, /Authored card heading/);
    assert.match(html, /Authored card body/);
    if (mode === 'editing') {
      assert.match(html, /target="_blank"/);
      assert.match(html, /test-only-placeholder-link/);
      assert.strictEqual(allianzLinkField(input, true), input);
    } else {
      assert.match(html, /target=""/);
      assert.doesNotMatch(html, /service-unavailable|demo-unavailable|disabled|http:\/\/#/);
      assert.equal(html, card(field('#', { id: '', querystring: '', anchor: '' }), mode, layout));
    }
  }
});

test('query, anchor, identity or download intent never inherits the external placeholder repair', () => {
  const variants = [
    ...['internal', 'media', 'anchor', 'External', '', undefined].map(linktype => ({ linktype })),
    ...['synthetic-bound-item', ' ', null, false, 0, {}].map(id => ({ id })),
    ...['x=1', '?x=1', ' ', null, false, 0, {}].map(querystring => ({ querystring })),
    ...['section', '#', ' ', null, false, 0, {}].map(anchor => ({ anchor })),
    ...['', 'file.pdf', false, undefined].map(download => ({ download })),
  ];
  for (const extra of variants) {
    const input = field('http://#', extra), before = JSON.stringify(input), output = safeLink(input);
    assert.equal(output.value.href, '#service-unavailable', JSON.stringify(extra));
    assert.equal(output.value.target, '');
    assert.strictEqual(output.metadata, input.metadata);
    assert.strictEqual(allianzLinkField(input, true), input);
    assert.equal(JSON.stringify(input), before);
  }
  const inherited = Object.create({ download: false });
  Object.assign(inherited, field('http://#').value);
  assert.equal(safeLink({ value: inherited, metadata }).value.href, '#service-unavailable');
});

test('malformed suffixes, lookalikes, raw body URLs and existing restricted destinations stay unchanged', () => {
  for (const href of ['http://#suffix', 'http://##', 'http://#/path', 'http://#?x=1',
    'HTTP://#', 'https://#', ' http://#', 'http://# ', 'http://#@example.invalid',
    'http://example.invalid/#', 'https://external.example.invalid/register']) {
    assert.equal(safeLink(field(href)).value.href, '#service-unavailable', href);
  }
  for (const [href, expected] of [['/Login', '#'], ['tel:12345', '#service-unavailable'],
    ['/api/private', '#service-unavailable'], ['##', '##'], ['#section', '#section']]) {
    assert.equal(safeLink(field(href)).value.href, expected, href);
  }
  const rawBody = { value: '<p><a href="http://#" target="_blank">Original native caption</a></p>' };
  assert.equal(safeEditorialRichText(rawBody, false).value,
    '<p><a href="#service-unavailable" target="">Original native caption</a></p>');
  assert.strictEqual(safeEditorialRichText(rawBody, true), rawBody);
});

test('cleared or missing fields retain their original field and never create a synthetic link', () => {
  assert.deepEqual(safeLink(), { value: { href: '' } });
  for (const href of ['', undefined]) {
    const cleared = field(href);
    assert.strictEqual(safeLink(cleared), cleared);
    assert.strictEqual(allianzLinkField(cleared, false), cleared);
    assert.strictEqual(allianzLinkField(cleared, true), cleared);
    for (const mode of ['normal', 'preview', 'editing']) assert.doesNotMatch(card(cleared, mode, 'stacked'), /<a\b/);
  }
});
