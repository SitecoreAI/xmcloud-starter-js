import assert from 'node:assert/strict';
import test from 'node:test';
import { component, contract, fixture, witness, renderRecord, wire, field, editingIds, links } from '../../newsroom-public-relations/__tests__/runtime.mjs';

const { MediaContact } = component('media-contact', 'media-contact-record.props');
const { mediaContactFields, mediaContactLinkField } = contract('media-contact');
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
  assert.deepEqual(editingIds(renderRecord(MediaContact, empty, true)), []);
  assert.doesNotMatch(renderRecord(MediaContact, empty, true), /\[No text in field\]/);
  assert.doesNotMatch(renderRecord(MediaContact, empty), /Brett|Claire|href=|<br/);
  const normalized = mediaContactFields(wire(empty));
  assert.equal(normalized.email.jsonValue, empty.email.jsonValue);
  assert.equal(normalized.name.jsonValue, empty.name.jsonValue);
  const explicit = { ...wire(records[0]), name: empty.name, telephone: empty.telephone };
  assert.equal(mediaContactFields(explicit).name, empty.name);
  assert.equal(mediaContactFields(explicit).telephone, empty.telephone);
  assert.equal(mediaContactFields({ id: 'missing', children: records }).name, undefined);
});

const owners = ['7C1EF218-89ED-4368-A393-3DB958207E7A', '81F5FB5A-42A0-464E-9A81-AB7867104517'];
function sourceRecord(index, serialized = false) {
  const record = structuredClone(records[index]);
  record.id = owners[index];
  for (const name of ['telephone', 'email']) {
    const value = record[name].jsonValue.value;
    value.url = value.href;
    value.linktype = name === 'telephone' ? 'external' : 'mailto';
    value.anchor = '';
    value.querystring = '';
  }
  if (serialized) record.telephone.jsonValue.value.href = `http://${record.telephone.jsonValue.value.url}`;
  return record;
}

test('MediaContact renders all four source protocol links only for their native owners', () => {
  for (const index of [0, 1]) for (const serialized of [false, true]) {
    const record = sourceRecord(index, serialized);
    const before = structuredClone(record);
    const expected = [record.telephone.jsonValue.value.url, record.email.jsonValue.value.url];
    const html = renderRecord(MediaContact, record);
    assert.deepEqual(links(html), expected);
    for (const href of expected) assert.ok(source.includes(href));
    assert.match(html, /<\/a><br\/><a/);
    assert.doesNotMatch(html, /service-unavailable|This service is unavailable/);
    assert.equal(renderRecord(MediaContact, wire(record)), html);
    assert.deepEqual(record, before);
    for (const name of ['telephone', 'email']) {
      const native = record[name].jsonValue;
      assert.equal(mediaContactLinkField(record, name, true), native);
      assert.equal(mediaContactLinkField(record, name, false).metadata, native.metadata);
    }
    assert.deepEqual(links(renderRecord(MediaContact, record, true)),
      [record.telephone.jsonValue.value.href, record.email.jsonValue.value.href]);
    for (const id of [record.id.replaceAll('-', ''), `{${record.id.toLowerCase()}}`]) {
      assert.deepEqual(links(renderRecord(MediaContact, { ...record, id })), expected);
    }
  }
});

test('MediaContact source exceptions retain generic rejection and deliberate-clear behavior', () => {
  const rejected = [
    ['wrong owner', record => { record.id = owners[1]; }],
    ['missing owner', record => { delete record.id; }],
    ['malformed owner', record => { record.id = `--${owners[0]}`; }],
    ['embedded braces', record => { record.id = owners[0].replace('7C1E', '7{C1E}'); }],
    ['wrong field', record => { record.email = structuredClone(record.telephone); }],
    ['mismatched native URL', record => { record.telephone.jsonValue.value.url = 'tel:763-765-5106'; }],
    ['missing native URL', record => { delete record.telephone.jsonValue.value.url; }],
    ['unverified href', record => { record.telephone.jsonValue.value.href = 'tel:763-765-9999'; }],
    ['unverified serialized href', record => { record.telephone.jsonValue.value.href = 'https://tel:763-765-7160'; }],
    ['query', record => { record.telephone.jsonValue.value.querystring = 'subject=test'; }],
    ['anchor', record => { record.telephone.jsonValue.value.anchor = 'test'; }],
    ['new target', record => { record.telephone.jsonValue.value.target = '_blank'; }],
    ['native item ID', record => { record.telephone.jsonValue.value.id = owners[0]; }],
    ['wrong link type', record => { record.telephone.jsonValue.value.linktype = 'media'; }],
    ['percent encoding', record => { record.telephone.jsonValue.value.href = 'tel:763%2D765%2D7160'; }],
    ['control character', record => { record.telephone.jsonValue.value.href += '\r\n'; }],
    ['mail header query', record => { record.email.jsonValue.value.href += '?subject=test'; }],
    ['mail address mismatch', record => { record.email.jsonValue.value.url = 'mailto:claire.woit@allianzlife.com'; }],
  ];
  for (const [label, mutate] of rejected) {
    const record = sourceRecord(0, true);
    mutate(record);
    const name = label.startsWith('mail') || label === 'wrong field' ? 'email' : 'telephone';
    assert.equal(mediaContactLinkField(record, name, false).value.href, '#service-unavailable', label);
    assert.equal(mediaContactLinkField(record, name, true), record[name].jsonValue, label);
  }
  const record = sourceRecord(0, true);
  for (const name of ['telephone', 'email']) {
    record[name].jsonValue.value.href = '';
    assert.equal(mediaContactLinkField(record, name, false), record[name].jsonValue);
    assert.equal(mediaContactLinkField(record, name, true), record[name].jsonValue);
  }
  assert.deepEqual(links(renderRecord(MediaContact, record)), []);
});
