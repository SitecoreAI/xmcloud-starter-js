import assert from 'node:assert/strict';
import test from 'node:test';
import { component, contract, fixture, witness, render, wire, field, editingIds, links, complete, decode } from '../../company-hero/__tests__/runtime.mjs';
const { Introduction, Continuation } = component('company-strengths', 'CompanyStrengths');
const { companyStrengthFields, companyStrengthsFields } = contract('company-strengths');
const [intro, continued] = fixture('company-strengths').datasources;
const norm = (s) => decode(s).replaceAll('&ndash;', '–').replaceAll('&reg;', '®').replaceAll('&rsquo;', '’');

test('strengths preserve six actual ordered benefits, source h5/h4 and two closed row variants', () => {
  for (const [Component, data] of [[Introduction, intro], [Continuation, continued]]) {
    const html = render(Component, data);
    assert.equal((html.match(/<h4>/g) ?? []).length, 3);
    assert.equal((html.match(/class="l-grid__column-medium-4"/g) ?? []).length, 3);
    for (const entry of data.children.results) {
      assert.ok(html.includes(entry.heading.jsonValue.value));
      assert.ok(norm(html).includes(norm(entry.body.jsonValue.value)));
      assert.ok(norm(witness('company-strengths')).includes(norm(entry.body.jsonValue.value)));
    }
    assert.equal(render(Component, wire(data)), html);
    assert.equal(render(Component, data, false, { columns: '1', theme: 'white', headingLevel: 'h1', alignment: 'left', spacing: 'xl' }), html);
    assert.doesNotMatch(html, /<img|mask-image/);
  }
  assert.match(render(Introduction, intro), /<h5>Allianz is driven/);
  assert.match(render(Continuation, continued), /u-row-spacing/);
  assert.match(render(Continuation, continued), /match-height-row u-margin-bottom-xl/);
  assert.deepEqual(links(render(Continuation, continued)), ['/about/financial-ratings']);
});

test('strengths keep cleared native icon/link/title/body editable, maintain order and fail closed on incomplete children', () => {
  const entry = { id: 'native-strength', heading: field('strength-heading', 'Single-Line Text', ''), body: field('strength-body', 'Rich Text', ''),
    icon: field('strength-icon', 'Image', {}), link: field('strength-link', 'General Link', { href: '', text: '' }) };
  const data = { introduction: field('strength-intro', 'Multi-Line Text', ''), children: complete([wire(entry)]) };
  assert.deepEqual(editingIds(render(Introduction, data, true)), ['strength-body', 'strength-heading', 'strength-icon', 'strength-intro', 'strength-link']);
  assert.deepEqual(links(render(Introduction, data)), []);
  assert.equal(companyStrengthFields(wire(entry)).body.jsonValue, entry.body.jsonValue);
  assert.equal(companyStrengthsFields({ ...intro, introduction: data.introduction }).introduction, data.introduction);
  const reversed = { ...intro, children: complete([...intro.children.results].reverse()) };
  assert.ok(render(Introduction, reversed).indexOf('Rely on our risk-management') < render(Introduction, reversed).indexOf('Work with an industry leader'));
  const partial = { ...intro, children: { ...intro.children, total: 4, pageInfo: { hasNext: true } } };
  assert.match(render(Introduction, partial), /role="alert"/);
  assert.doesNotMatch(render(Introduction, partial), /Work with an industry leader/);
});

test('strengths reject missing children/results in normal and editing SDK modes', () => {
  for (const children of [undefined, null, {}, { total: 0, pageInfo: { hasNext: false } }, { results: null, total: 0, pageInfo: { hasNext: false } }]) {
    for (const Component of [Introduction, Continuation]) {
      for (const editing of [false, true]) {
        const html = render(Component, { ...intro, children }, editing);
        assert.match(html, /role="alert"/);
        assert.doesNotMatch(html, /Work with an industry leader|Add a company strength|<h4>/);
      }
    }
  }
  assert.doesNotMatch(render(Introduction, { ...intro, children: complete([]) }), /role="alert"/);
  assert.match(render(Introduction, { ...intro, children: complete([]) }, true), /Add a company strength/);
});
