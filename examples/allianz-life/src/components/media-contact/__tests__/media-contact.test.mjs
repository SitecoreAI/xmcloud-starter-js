import assert from 'node:assert/strict';
import test from 'node:test';
import { component, contract, fixture, witness, renderRecord, wire, field, editingIds, links } from '../../newsroom-public-relations/__tests__/runtime.mjs';

const { MediaContact } = component('media-contact', 'media-contact-record.props');
const { mediaContactFields } = contract('media-contact');
const records = fixture('media-contact');
const source = witness('media-contact');

test('MediaContact splits four native fields with source name sizing and role/contact lines', () => {
  for (const record of records) {
    const html = renderRecord(MediaContact, record);
    for (const name of ['name', 'role']) assert.ok(source.includes(record[name].jsonValue.value));
    assert.ok(html.includes(`<div class="tileBody u-font-size-xl">${record.name.jsonValue.value}</div>`));
    assert.ok(html.includes(record.role.jsonValue.value));
    assert.ok(source.includes(record.telephone.jsonValue.value.href));
    assert.ok(source.includes(record.email.jsonValue.value.href));
    assert.ok(html.includes(record.telephone.jsonValue.value.text));
    assert.ok(html.includes(record.email.jsonValue.value.text));
    assert.match(html, /<\/a><br\/><a/);
    assert.deepEqual(links(html), ['#service-unavailable', '#service-unavailable']);
    assert.deepEqual(links(renderRecord(MediaContact, record, true)), [record.telephone.jsonValue.value.href, record.email.jsonValue.value.href]);
    assert.equal(renderRecord(MediaContact, wire(record)), html);
  }
});

test('MediaContact retains empty record fields, metadata, and direct aliases without fallback content', () => {
  const empty = { id: 'test-empty-record', name: field('contact-name', 'Single-Line Text', ''), role: field('contact-role', 'Single-Line Text', ''),
    telephone: field('contact-telephone', 'General Link', { href: '', text: '' }), email: field('contact-email', 'General Link', { href: '', text: '' }) };
  assert.deepEqual(editingIds(renderRecord(MediaContact, empty, true)), ['contact-email', 'contact-name', 'contact-role', 'contact-telephone']);
  assert.doesNotMatch(renderRecord(MediaContact, empty), /Brett|Claire|href=|<br/);
  const normalized = mediaContactFields(wire(empty));
  assert.equal(normalized.email.jsonValue, empty.email.jsonValue);
  assert.equal(normalized.name.jsonValue, empty.name.jsonValue);
  const explicit = { ...wire(records[0]), name: empty.name, telephone: empty.telephone };
  assert.equal(mediaContactFields(explicit).name, empty.name);
  assert.equal(mediaContactFields(explicit).telephone, empty.telephone);
  assert.equal(mediaContactFields({ id: 'missing', children: records }).name, undefined);
});
