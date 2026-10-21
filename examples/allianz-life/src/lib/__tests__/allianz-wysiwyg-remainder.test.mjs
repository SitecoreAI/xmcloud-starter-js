import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, render, sourceRoot } from '../../components/executive-biography/__tests__/sdk-test-helper.mjs';

const components = Object.fromEntries([
  ['RateSnapshot', 'allianz-rate-snapshot/AllianzRateSnapshot'],
  ['LegacyCardGrid', 'allianz-legacy-card-grid/AllianzLegacyCardGrid'],
  ['ProductOfferings', 'product-offerings/ProductOfferings'],
].map(([name, file]) => [name, loadSource(path.join(sourceRoot, `components/${file}.tsx`)).Default]));

const field = (id, type, value) => ({ jsonValue: {
  value, metadata: { itemId: 'test-only-native-owner', fieldId: id, fieldType: type },
} });
const text = (id, cleared) => field(id, 'Single-Line Text', cleared ? '' : `Authored ${id}`);
const rich = (id, cleared) => field(id, 'Rich Text', cleared ? '' : `<p>Authored ${id}</p>`);
const image = (id, cleared) => field(id, 'Image', cleared ? {} : { src: '/authored.svg', alt: `Authored ${id}` });
const link = (id, cleared) => field(id, 'General Link', cleared ? {} : { href: '/about', text: `Authored ${id}` });
const metadata = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId).sort();

const cases = [
  ['RateSnapshot', cleared => ({
    heading: text('snapshot-heading', cleared), rate: text('snapshot-rate', cleared),
    asOf: text('snapshot-asof', cleared), body: rich('snapshot-body', cleared), link: link('snapshot-link', cleared),
  }), ['snapshot-heading', 'snapshot-rate', 'snapshot-asof', 'snapshot-body', 'snapshot-link']],
  ['LegacyCardGrid', cleared => ({ heading: text('legacy-heading', cleared), children: { results: [{
    id: 'test-only-card', heading: text('legacy-card-heading', cleared), body: rich('legacy-card-body', cleared),
    image: image('legacy-card-image', cleared), icon: image('legacy-card-icon', cleared), link: link('legacy-card-link', cleared),
  }] } }), ['legacy-heading', 'legacy-card-heading', 'legacy-card-body', 'legacy-card-image', 'legacy-card-icon', 'legacy-card-link']],
  ['ProductOfferings', cleared => ({ children: { results: [{
    id: 'test-only-offering', title: text('offering-title', cleared), text: rich('offering-body', cleared),
    icon: image('offering-icon', cleared), link: link('offering-link', cleared),
  }] } }), ['offering-title', 'offering-body', 'offering-icon', 'offering-link']],
];

for (const [name, build, ids] of cases) {
  test(`${name}: empty optional native fields create no visible editing artifacts`, () => {
    const data = build(true), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(components[name], data, editing, { columns: '3', headingLevel: 'h2' });
      assert.deepEqual(metadata(html), []);
      assert.doesNotMatch(html, /\[No text in field\]|scEmptyImage/);
    }
    assert.equal(JSON.stringify(data), before);
  });
  test(`${name}: populated values retain native SDK editing metadata and input fields`, () => {
    const data = build(false), before = JSON.stringify(data);
    const html = render(components[name], data, true, { columns: '3', headingLevel: 'h2' });
    assert.deepEqual(metadata(html), [...ids].sort());
    assert.doesNotMatch(html, /\[No text in field\]|scEmptyImage/);
    assert.match(html, /href="\/about"/);
    assert.equal(JSON.stringify(data), before);
  });
}

test('an empty ProductOfferings collection adds no authoring-only instruction to the canvas', () => {
  for (const editing of [false, true]) {
    const html = render(components.ProductOfferings, { children: { results: [] } }, editing);
    assert.doesNotMatch(html, /Add a product offering|\[No text in field\]|scEmptyImage/);
  }
});


const RateTable = loadSource(path.join(sourceRoot, 'components/allianz-rate-table/AllianzRateTable.tsx')).Default;
const { EditorialBody } = loadSource(path.join(sourceRoot, 'components/allianz-article/AllianzArticle.tsx'));

test('RateTable shows the same single populated state in editing and normal mode', () => {
  for (const hasTable of [true, false]) {
    const data = { tableBody: field('test-only-table', 'Rich Text', hasTable ? '<p>Captured table</p>' : ''),
      emptyState: field('test-only-empty-state', 'Rich Text', '<p>No captured rates</p>') };
    const before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(RateTable, data, editing);
      assert.equal(html.includes('Captured table'), hasTable);
      assert.equal(html.includes('No captured rates'), !hasTable);
      assert.deepEqual(metadata(html), editing ? [hasTable ? 'test-only-table' : 'test-only-empty-state'] : []);
      assert.doesNotMatch(html, /\[No text in field\]/);
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('RateTable cleared or metadata-only state fields create no optional canvas artifact', () => {
  for (const body of ['', undefined]) {
    const data = { tableBody: field('test-only-table', 'Rich Text', body),
      emptyState: field('test-only-empty-state', 'Rich Text', body) };
    for (const editing of [false, true]) {
      const html = render(RateTable, data, editing);
      assert.deepEqual(metadata(html), []);
      assert.doesNotMatch(html, /\[No text in field\]/);
    }
  }
});

test('Article rich-text scaffold omits cleared or metadata-only optional fields in both modes', () => {
  for (const value of ['', undefined]) {
    const data = { body: field('test-only-article-body', 'Rich Text', value) };
    const before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(EditorialBody, data, editing, { scaffold: 'rich-text' });
      assert.deepEqual(metadata(html), []);
      assert.doesNotMatch(html, /\[No text in field\]/);
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('Article rich-text scaffold keeps populated native body metadata and content', () => {
  const data = { body: field('test-only-article-body', 'Rich Text', '<p>Authored article &amp; formatting.</p>') };
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(EditorialBody, data, editing, { scaffold: 'rich-text' });
    assert.match(html, /<p>Authored article &amp; formatting\.<\/p>/);
    assert.deepEqual(metadata(html), editing ? ['test-only-article-body'] : []);
  }
  assert.equal(JSON.stringify(data), before);
});
