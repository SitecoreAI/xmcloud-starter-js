import assert from 'node:assert/strict';
import test from 'node:test';
import { component, contract, fixture, witness, render, wire, field, editingIds, complete, decode } from '../../company-hero/__tests__/runtime.mjs';
const { Default } = component('leadership-quote', 'LeadershipQuote');
const { leadershipFields, attributionFields } = contract('leadership-quote');
const data = fixture('leadership-quote').datasources[0];

test('leadership preserves source h2/h4/h6, centers one attribution and restores the exact fixed Badge path', () => {
  const html = render(Default, data);
  assert.match(html, /<h2>A few words from our CEO<\/h2>/);
  assert.match(decode(html), /<h4>"As a leading provider/);
  assert.match(html, /<h6>Jasmine Jirele<br>/);
  assert.equal((html.match(/class="l-grid__column-medium-4"/g) ?? []).length, 3);
  const sourcePath = witness('leadership-quote').match(/<path d="([^"]+)"/)[1];
  assert.ok(html.includes(sourcePath));
  assert.match(html, /<svg aria-hidden="true" focusable="false"/);
  assert.doesNotMatch(html, /titleIconBadge|<img/);
  assert.equal(render(Default, wire(data)), html);
  assert.equal(render(Default, data, false, { headingLevel: 'h4', alignment: 'left', columns: '1', theme: 'blue-soft' }), html);
});

test('leadership canonical clears preserve real authoring fields and never rehydrate historical quote/portrait', () => {
  const entry = { ...data.children.results[0], attribution: field('ceo-attribution', 'Rich Text', ''), portrait: field('ceo-portrait', 'Image', {}) };
  const root = { ...data, heading: field('ceo-heading', 'Single-Line Text', ''), quote: field('ceo-quote', 'Rich Text', ''), children: complete([wire(entry)]) };
  assert.deepEqual(editingIds(render(Default, root, true)), ['ceo-attribution', 'ceo-heading', 'ceo-portrait', 'ceo-quote']);
  assert.doesNotMatch(render(Default, root), /A few words|As a leading|Jasmine|<img/);
  assert.equal(leadershipFields(wire(root)).quote.jsonValue, root.quote.jsonValue);
  assert.equal(attributionFields(wire(entry)).portrait.jsonValue, entry.portrait.jsonValue);
  assert.match(render(Default, { ...data, children: complete([entry, { ...entry, id: 'extra-ceo' }]) }), /requires one attribution item/);
  assert.match(render(Default, { ...data, children: { ...data.children, pageInfo: { hasNext: true } } }), /role="alert"/);
});

test('leadership preserves the fixed empty attribution header and rejects absent children/results', () => {
  const html = render(Default, data);
  assert.match(html, /<div class="tileSubGrid__content"><header><div class="tileHeading"><\/div><div class="tileSubHeading"><\/div><\/header><div class="tileBody u-font-size-md"><h6>Jasmine/);
  assert.match(witness('leadership-quote'), /<div class="tileHeading "><\/div>\s*<div class="tileSubHeading "><\/div>/);
  for (const children of [undefined, null, {}, { total: 0, pageInfo: { hasNext: false } }, { results: null, total: 0, pageInfo: { hasNext: false } }]) {
    for (const editing of [false, true]) {
      const missing = render(Default, { ...data, children }, editing);
      assert.match(missing, /role="alert"/);
      assert.doesNotMatch(missing, /Jasmine|A few words|Add the leadership/);
    }
  }
  assert.doesNotMatch(render(Default, { ...data, children: complete([]) }), /role="alert"/);
});
