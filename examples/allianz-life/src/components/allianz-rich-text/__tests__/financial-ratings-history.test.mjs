import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compile, field, filename, freeze, metadata, params, renderSDK } from './optional-icons-fixture.mjs';

const source = fs.readFileSync(filename, 'utf8');
const Components = compile(source);
const owner = 'test-only-history-owner';
const fixture = () => ({ id: owner,
  heading: field(owner, 'heading', 'An authored financial history heading'),
  body: field(owner, 'body', '<h5>Complete native <strong>history introduction</strong>.</h5>', 'Rich Text'),
});
const input = () => params({ layout: 'plain', headingLevel: 'h2', paddingTop: 'lg', marginBottom: 'lg',
  RenderingIdentifier: 'test-only-history-placement' });

// These are the source classes and field nesting captured at 1280px in
// RATINGS-SOURCE-PREVIEW-ANCESTOR-SPACING-TRACE.json and
// RATINGS-HISTORY-OUTER-CONTAINER-TRACE.json. Unit markup is not browser geometry.
for (const mode of ['normal', 'preview', 'editing']) {
  test(`${mode}: ratings history uses the contained source header structure and complete native fields`, () => {
    const data = freeze(fixture()), before = JSON.stringify(data), observed = [];
    const Variant = compile(source, { observe: observed }).FinancialRatingsHistoryIntroduction;
    const html = renderSDK(Variant, data, input(), mode);
    assert.match(html, /^<div class="l-container t-bg-transparent axlTileCollection" id="test-only-history-placement">/);
    assert.match(html, /<div class="l-grid l-grid--max-width l-grid--no-gutters-outer">/);
    assert.match(html, /<div class="l-grid__row u-padding-top-lg u-margin-bottom-lg">/);
    assert.match(html, /<article class="m-axlIntroductionBlock -is--stacked -no--image"><div class="tileContent u-text-center">/);
    const header = html.match(/<header>([\s\S]*?)<\/header>/)?.[1];
    assert.ok(header, 'both source fields belong to the same header');
    const visibleHeader = header.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '');
    assert.match(visibleHeader, /<div class="tileHeading"><h2>An authored financial history heading<\/h2><\/div>/);
    assert.match(header, /<div class="tileSubHeading">/);
    assert.match(header, /<h5>Complete native <strong>history introduction<\/strong>\.<\/h5>/);
    assert.doesNotMatch(html, /tileBody|u-font-size-xl/);
    assert.equal((html.match(/class="l-grid__row /g) ?? []).length, 1,
      'do not invent an uncaptured empty-row implementation to compensate for a pixel offset');
    const active = observed.filter(call => ['Text', 'RichText'].includes(call.name));
    assert.equal(active.length, 2);
    for (const key of ['heading', 'body']) {
      const calls = active.filter(call => call.field === data[key].jsonValue);
      assert.equal(calls.length, 1, `retain original ${key} field identity`);
      assert.equal(calls[0].editable, mode === 'editing');
    }
    assert.deepEqual(metadata(html).map(({ itemId, fieldId }) => ({ itemId, fieldId })), mode === 'editing'
      ? [{ itemId: owner, fieldId: 'fixture-heading' }, { itemId: owner, fieldId: 'fixture-body' }] : []);
    assert.equal(JSON.stringify(data), before);
  });
}

test('only source-owned Heading and Body are accessed, even with stale layout parameters', () => {
  const data = fixture();
  for (const key of ['icon', 'primaryLink', 'subheading', 'children']) Object.defineProperty(data, key, {
    get() { throw new Error(`unexpected inactive ${key} field access`); },
  });
  const html = renderSDK(Components.FinancialRatingsHistoryIntroduction, data,
    { ...input(), layout: 'disclosures', headingLevel: 'h4', alignment: 'left' }, 'editing');
  assert.match(html, /<h2>An authored financial history heading<\/h2>/);
  assert.match(html, /tileContent u-text-center/);
  assert.doesNotMatch(html, /a-axlDisclosures|tileIcon|a-link/);
  assert.equal(metadata(html).length, 2);
});

test('missing native fields keep the source wrappers without invented content or controls', () => {
  for (const mode of ['normal', 'preview', 'editing']) {
    const html = renderSDK(Components.FinancialRatingsHistoryIntroduction, { id: owner }, input(), mode);
    assert.match(html, /<header><div class="tileHeading"><\/div><div class="tileSubHeading"><\/div><\/header>/);
    assert.deepEqual(metadata(html), []);
    assert.doesNotMatch(html, /history introduction|tileIcon|a-link/);
    assert.match(renderSDK(Components.FinancialRatingsHistoryIntroduction, undefined, input(), mode), /Add a datasource/);
  }
});

test('cleared fields stay empty without inventing inline controls or changing native metadata', () => {
  const data = fixture(); data.heading.jsonValue.value = ''; data.body.jsonValue.value = '';
  const before = JSON.stringify(data);
  const observed = [], Variant = compile(source, { observe: observed }).FinancialRatingsHistoryIntroduction;
  const visitor = renderSDK(Variant, data, input());
  assert.equal(observed.length, 0);
  assert.deepEqual(metadata(visitor), []);
  const editing = renderSDK(Variant, data, input(), 'editing');
  assert.deepEqual(metadata(editing), []);
  assert.equal(observed.length, 0);
  assert.equal(JSON.stringify(data), before, 'cleared fields remain owned by the existing native content field panel');
});

test('visitor Body retains existing link handling and the original native editing value', () => {
  const data = fixture();
  data.body.jsonValue.value = '<h5>Authored history with <a href="https://www.allianzlife.com/about" target="_blank">About</a> and <a href="/contact-us">Contact us</a>.</h5>';
  const before = JSON.stringify(data), observed = [];
  const Variant = compile(source, { observe: observed }).FinancialRatingsHistoryIntroduction;
  const visitor = renderSDK(Variant, data, input());
  const links = html => [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]);
  assert.deepEqual(links(visitor), links(renderSDK(Components.Default, data, input())),
    'the opt-in layout preserves the complete existing visitor link contract');
  assert.match(visitor, /href="\/contact-us"/);
  assert.match(visitor, /Authored history with/);
  observed.length = 0;
  renderSDK(Variant, data, input(), 'editing');
  assert.equal(observed.find(call => call.name === 'RichText').field, data.body.jsonValue);
  assert.equal(JSON.stringify(data), before);
});
