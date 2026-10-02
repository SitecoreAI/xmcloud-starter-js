import assert from 'node:assert/strict';
import test from 'node:test';
import { component, contract, fixture, witness, render, wire, field, editingIds, links, complete, decode } from '../../company-hero/__tests__/runtime.mjs';
const { Default } = component('sustainability-commitment', 'SustainabilityCommitment');
const { sustainabilityFields, commitmentFields } = contract('sustainability-commitment');
const evidence = fixture('sustainability-commitment');
const data = evidence.canonicalMigrationPreview;
const norm = (s) => decode(s).replaceAll('&ndash;', '–').replaceAll('&rsquo;', '’');

test('sustainability renders the preserved split statement before three h3 white tiles in one blue section', () => {
  const html = render(Default, data);
  assert.match(html, /t-bg-blue-soft axlTileCollection allianz-sustainability-commitment/);
  assert.match(html, /<h2>Our mission/);
  assert.equal((html.match(/<h3>/g) ?? []).length, 3);
  assert.equal((html.match(/t-bg-primary-white/g) ?? []).length, 3);
  const statement = evidence.supportingStatementSource.body.jsonValue.value;
  assert.equal(data.supportingStatement.jsonValue, evidence.canonicalMigrationPreview.supportingStatement.jsonValue);
  assert.equal(data.supportingStatement.jsonValue.value, statement);
  assert.equal((norm(html).split(norm(statement)).length - 1), 1);
  assert.ok(html.indexOf('At Allianz, sustainability') < html.indexOf('Helping employees do the best work'));
  for (const entry of data.children.results) assert.ok(norm(witness('sustainability-commitment')).includes(norm(entry.body.jsonValue.value)));
  assert.deepEqual(links(html), ['/why-allianz/sustainability', '/why-allianz/culture', '/why-allianz/inclusion', '/why-allianz/community']);
  assert.equal(render(Default, wire(data)), html);
  assert.doesNotMatch(html, /<img/); // Pending native images are not fabricated.
});

test('new statement clears remain empty and every root/child field remains editable through the real SDK', () => {
  const entry = { id: 'native-commitment', heading: field('commitment-heading', 'Single-Line Text', ''), body: field('commitment-body', 'Rich Text', ''),
    image: field('commitment-image', 'Image', {}), link: field('commitment-link', 'General Link', { href: '', text: '' }) };
  const root = { ...data, heading: field('sustainability-heading', 'Single-Line Text', ''), overview: field('sustainability-overview', 'Rich Text', ''),
    supportingStatement: field('sustainability-statement', 'Rich Text', ''), link: field('sustainability-link', 'General Link', { href: '', text: '' }), children: complete([wire(entry)]) };
  assert.deepEqual(editingIds(render(Default, root, true)), ['commitment-body', 'commitment-heading', 'commitment-image', 'commitment-link', 'sustainability-heading', 'sustainability-link', 'sustainability-overview', 'sustainability-statement']);
  assert.doesNotMatch(render(Default, root), /At Allianz|For more than|href=|<img/);
  assert.equal(sustainabilityFields(wire(root)).supportingStatement.jsonValue, root.supportingStatement.jsonValue);
  assert.equal(commitmentFields(wire(entry)).image.jsonValue, entry.image.jsonValue);
  assert.match(render(Default, { ...root, children: { ...root.children, total: 2 } }), /role="alert"/);
  assert.equal(render(Default, data, false, { theme: 'white', columns: '1', headingLevel: 'h1', layout: 'image-left', spacing: 'sm' }), render(Default, data));
});

test('sustainability preserves the fixed empty supporting header and rejects absent children/results', () => {
  const html = render(Default, data);
  assert.match(html, /<header><div class="tileHeading"><\/div><div class="tileSubHeading"><\/div><\/header><div class="tileBody"><p>At Allianz, sustainability/);
  assert.match(witness('sustainability-commitment'), /<div class="tileHeading"><\/div>\s*<div class="tileSubHeading"><\/div>/);
  for (const children of [undefined, null, {}, { total: 0, pageInfo: { hasNext: false } }, { results: null, total: 0, pageInfo: { hasNext: false } }]) {
    for (const editing of [false, true]) {
      const missing = render(Default, { ...data, children }, editing);
      assert.match(missing, /role="alert"/);
      assert.doesNotMatch(missing, /At Allianz|Helping employees|Add a sustainability/);
    }
  }
  assert.doesNotMatch(render(Default, { ...data, children: complete([]) }), /role="alert"/);
});
