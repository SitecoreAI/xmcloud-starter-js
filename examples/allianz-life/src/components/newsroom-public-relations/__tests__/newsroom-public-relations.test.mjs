import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { component, contract, fixture, witness, render, wire, field, editingIds, links, loadSource, sourceRoot } from './runtime.mjs';

const { Default } = component('newsroom-public-relations', 'NewsroomPublicRelations');
const { newsroomContactItems, newsroomPublicRelationsFields } = contract('newsroom-public-relations');
const { safeNewsroomRichText } = loadSource(path.join(sourceRoot, 'components/newsroom-public-relations/newsroom-public-relations.links.props.ts'));
const data = fixture('newsroom-public-relations');
const source = witness('newsroom-public-relations');

test('PR retains canonical fields and exact source People icon in fixed blue/two-white-column primitives', () => {
  const html = render(Default, data);
  assert.match(source, /Contact our public relations team/);
  assert.ok(source.includes(data.intro.jsonValue.value));
  assert.match(html, /t-bg-blue-soft axlTileCollection allianz-newsroom-public-relations/);
  assert.match(html, /<h2>Contact our public relations team<\/h2>/);
  assert.equal((html.match(/class="l-grid__column-medium-6"/g) ?? []).length, 2);
  assert.equal((html.match(/m-axlTile match-height -is--stacked t-bg-primary-white/g) ?? []).length, 2);
  const iconPath = /<path d="([^"]+)"/.exec(source)[1];
  assert.ok(html.includes(`d="${iconPath}"`));
  assert.match(html, /tileIcon t-bg-transparent t-icon-primary-black/);
  assert.match(html, /Follow us on <a[^>]+>LinkedIn<\/a> for Allianz Life news and updates/);
  assert.deepEqual(links(html), Array(5).fill('#service-unavailable'));
  assert.doesNotMatch(html, /href="(?:tel:|mailto:|https:)|target="_blank"|data-demo-disabled/);
  assert.equal(render(Default, wire(data)), html);
  assert.equal(render(Default, data, false, { theme: 'white', columns: '4', headingLevel: 'h1', icon: 'other' }), html);
});

test('PR uses ordered reference aliases, preserves an intentional empty selection, and ignores historical children', () => {
  const reversed = { ...data, contactReferences: { targetItems: [...data.contactReferences.targetItems].reverse() } };
  const html = render(Default, reversed);
  assert.ok(html.indexOf('Claire Woit') < html.indexOf('Brett Weinberg'));
  const empty = { ...data, contactReferences: { targetItems: [] }, children: { results: data.contactReferences.targetItems } };
  assert.doesNotMatch(render(Default, empty), /Brett Weinberg|Claire Woit|allianz-media-contact/);
  assert.doesNotMatch(render(Default, { heading: data.heading, intro: data.intro, children: empty.children }), /Brett Weinberg|Claire Woit/);
  assert.equal(newsroomPublicRelationsFields(wire(data)).contacts.jsonValue, data.contacts.jsonValue);
  for (const incomplete of [
    { targetItems: data.contactReferences.targetItems, total: 3 },
    { targetItems: data.contactReferences.targetItems, pageInfo: { hasNext: true } },
    { targetItems: [data.contactReferences.targetItems[0], null] },
  ]) {
    assert.deepEqual(newsroomContactItems(incomplete), { items: [], complete: false });
    assert.doesNotMatch(render(Default, { ...data, contactReferences: incomplete }), /Brett Weinberg|Claire Woit/);
    assert.match(render(Default, { ...data, contactReferences: incomplete }, true), /media contact references have not loaded completely/);
  }
});

test('PR and referenced records keep real empty SDK authoring fields and exact canonical editing targets', () => {
  const contacts = data.contactReferences.targetItems.map((record, index) => ({ id: record.id,
    name: field(`empty-${index}-name`, 'Single-Line Text', ''), role: field(`empty-${index}-role`, 'Single-Line Text', ''),
    telephone: field(`empty-${index}-telephone`, 'General Link', { href: '', text: '' }),
    email: field(`empty-${index}-email`, 'General Link', { href: '', text: '' }) }));
  const empty = { ...data, heading: field('empty-pr-heading', 'Single-Line Text', ''),
    intro: field('empty-pr-intro', 'Rich Text', ''), contactReferences: { targetItems: contacts } };
  assert.deepEqual(editingIds(render(Default, empty, true)), ['empty-0-email', 'empty-0-name', 'empty-0-role', 'empty-0-telephone',
    'empty-1-email', 'empty-1-name', 'empty-1-role', 'empty-1-telephone', 'empty-pr-heading', 'empty-pr-intro']);
  assert.doesNotMatch(render(Default, empty), /Contact our public|Follow us|Brett Weinberg|Claire Woit|href=/);
  assert.deepEqual(links(render(Default, data, true)), ['https://www.linkedin.com/company/allianz-life',
    'tel:763-765-7160', 'mailto:brett.weinberg@allianzlife.com', 'tel:763-765-5106', 'mailto:claire.woit@allianzlife.com']);
  assert.match(render(Default, undefined), /Add a datasource for Public relations team/);
});

test('known Multilist serializer clears override stale contacts and known selected IDs prove exact order/completeness', () => {
  const targetItems = data.contactReferences.targetItems;
  for (const jsonValue of [[], null, { value: '' }, { value: [] }, { value: null }]) {
    const cleared = { ...data, contacts: { jsonValue }, contactReferences: { targetItems } };
    assert.deepEqual(newsroomContactItems(cleared.contactReferences, jsonValue), { items: [], complete: true });
    assert.doesNotMatch(render(Default, cleared), /Brett Weinberg|Claire Woit/);
    assert.equal(newsroomPublicRelationsFields(wire(cleared)).contacts.jsonValue, jsonValue);
  }
  const selected = targetItems.map(({ id }) => ({ id }));
  const expected = { items: targetItems, complete: true };
  for (const jsonValue of [selected, { value: selected }, targetItems.map(({ id }) => id), { value: targetItems.map(({ id }) => id) }]) {
    assert.deepEqual(newsroomContactItems({ targetItems }, jsonValue), expected);
    for (const stale of [undefined, {}, { targetItems: [targetItems[0]] }, { targetItems: [...targetItems].reverse() }]) {
      assert.deepEqual(newsroomContactItems(stale, jsonValue), { items: [], complete: false });
      assert.doesNotMatch(render(Default, { ...data, contacts: { jsonValue }, contactReferences: stale }), /Brett Weinberg|Claire Woit/);
    }
  }
  const guidItems = targetItems.map((item, index) => ({ ...item, id: index === 0 ? '11111111-1111-1111-1111-111111111111' : '22222222-2222-2222-2222-222222222222' }));
  const pipe = '{11111111-1111-1111-1111-111111111111}|{22222222-2222-2222-2222-222222222222}';
  assert.deepEqual(newsroomContactItems({ targetItems: guidItems }, { value: pipe }), { items: guidItems, complete: true });
  assert.deepEqual(newsroomContactItems({ targetItems: [...guidItems].reverse() }, pipe), { items: [], complete: false });
  assert.deepEqual(newsroomContactItems(undefined, pipe), { items: [], complete: false });
  // A future serializer is not mistaken for a clear or a selected-ID receipt.
  assert.deepEqual(newsroomContactItems({ targetItems }, { unresolvedShape: 'unknown' }), expected);
  assert.equal(newsroomPublicRelationsFields({ ...wire(data), contacts: { jsonValue: [] } }).contacts.jsonValue.length, 0);
});

test('visitor Rich Text reconciliation preserves field/markup metadata and never changes storage or editing', () => {
  const original = field('rt-field', 'Rich Text', '<p><a data-href="kept" data-target="kept" href="https://example.com/?x=1&amp;y=2" target="_blank" rel="noopener noreferrer">External</a> <A href=tel:123 target=_blank>Telephone</A> <a title="1 > 0" href="/about?x=1&amp;x=2#facts">Internal</a></p>').jsonValue;
  const before = JSON.stringify(original);
  const visitor = safeNewsroomRichText(original, false);
  assert.equal(JSON.stringify(original), before);
  assert.equal(visitor.metadata, original.metadata);
  assert.notEqual(visitor, original);
  assert.match(visitor.value, /data-href="kept" data-target="kept" href="#service-unavailable" target="" rel="noopener noreferrer"/);
  assert.match(visitor.value, /<A href="#service-unavailable" target="">Telephone<\/A>/);
  assert.match(visitor.value, /title="1 > 0" href="\/about\?x=1&amp;x=2#facts"/);
  assert.equal(safeNewsroomRichText(original, true), original);
  const cleared = field('cleared-rt', 'Rich Text', '').jsonValue;
  assert.equal(safeNewsroomRichText(cleared, false), cleared);
  assert.equal(safeNewsroomRichText(undefined, false), undefined);
  const attributeTrick = field('quoted-attributes', 'Rich Text', '<a title=" href=/about target=_self " data-href="/about" href="https://example.com/" target="_blank">Label</a>').jsonValue;
  assert.equal(safeNewsroomRichText(attributeTrick, false).value, '<a title=" href=/about target=_self " data-href="/about" href="#service-unavailable" target="">Label</a>');
  const encodedProtocol = field('encoded-href', 'Rich Text', '<a href="javascript&colon;alert(1)">Label</a>').jsonValue;
  assert.equal(safeNewsroomRichText(encodedProtocol, false).value, '<a href="#service-unavailable">Label</a>');
});

test('PR compact root/reference query is proposed, separate, and has no descendant/template identity logic', () => {
  const query = fs.readFileSync(path.join(sourceRoot, 'components/newsroom-public-relations/newsroom-public-relations.graphql'), 'utf8');
  assert.match(query, /fieldCollection: fields \{ name jsonValue \}/);
  assert.match(query, /contactReferences: field\(name: "contacts"\)/);
  assert.match(query, /MultilistField[\s\S]+targetItems/);
  assert.doesNotMatch(query, /children|parent|url|[\da-f]{8}-[\da-f]{4}-/i);
  const author = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'components/newsroom-public-relations/AUTHOR-CONTRACT.json'), 'utf8'));
  assert.match(author.status, /pending/);
  assert.deepEqual(author.contract.fields.map(({ name }) => name), ['heading', 'intro', 'contacts']);
});
