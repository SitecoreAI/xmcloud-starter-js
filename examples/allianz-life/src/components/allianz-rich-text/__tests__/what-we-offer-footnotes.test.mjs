import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const filename = path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx');
const RichText = loadSource(filename);
// Test-only metadata mirrors native SDK envelopes; no native IDs are invented.
const native = (name, value, fieldType = 'Rich Text') => ({ jsonValue: { value, metadata: {
  itemId: 'test-only-offer-footnotes-owner', fieldId: `test-only-offer-footnotes-${name}`, fieldType,
} } });
const sourceBody = '<p><sup>1\u00a0</sup>A level of protection may be provided by benefits that are either built into the contract or through optional riders at an additional cost.</p>\r\n'
  + '<p><sup>2\u00a0</sup>The death benefit is generally income-tax-free when left to beneficiaries.</p>\r\n'
  + '<p><sup>3\u00a0</sup>Policy loans and withdrawals will reduce the available cash value and death benefit and may cause the policy to lapse, or affect guarantees against lapse. Withdrawals in excess of premiums paid will be subject to ordinary income tax. Additional premium payments may be required to keep the policy in force. In the event of a lapse, outstanding policy loans in excess of unrecovered cost basis will be subject to ordinary income tax. If a policy is a modified endowment contract (MEC), policy loans and withdrawals will be taxable as ordinary income to the extent there are earnings in the policy. If any of these features are exercised prior to age 59\u00bd on a MEC, a 10% federal additional tax may be imposed. Tax laws are subject to change, and you should consult a tax professional.</p>\r\n<hr>';
const model = () => ({ body: native('body', sourceBody) });
const params = { theme: 'purple-soft', layout: 'disclosures', columns: '3', alignment: 'center', headingLevel: 'h2',
  spacing: 'xl', paddingTop: 'xl', paddingBottom: 'xl', marginBottom: 'xl', RenderingIdentifier: 'test-only-offer-footnotes' };
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

test('OfferFootnotes retains the complete source paragraphs, superscripts, rule and fixed plain grey structure', () => {
  const data = freeze(model()), before = JSON.stringify(data);
  const html = render(RichText.OfferFootnotes, data, false, params);
  assert.match(html, /^<div class="l-container--full-width t-bg-grey-muted axlTileCollection" id="test-only-offer-footnotes">/);
  assert.match(html, /<div class="l-grid__row "><div class="l-grid__column-medium-12">/);
  assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
  assert.match(html, /tileContent u-text-left/);
  assert.ok(html.includes(sourceBody));
  assert.equal((html.match(/<p>/g) ?? []).length, 3);
  assert.equal((html.match(/<sup>/g) ?? []).length, 3);
  assert.equal((html.match(/<hr\s*\/?\s*>/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<h[1-6]\b|<a\b|tileSubHeading|a-axlDisclosures|content-body disclosure|u-font-size-xl|t-bg-purple|u-padding-|u-margin-|kind="open"/);
  assert.equal(JSON.stringify(data), before);
});

test('OfferFootnotes exposes only the original native Body metadata once', () => {
  const data = freeze(model()), body = data.body.jsonValue, before = JSON.stringify(data);
  const html = render(RichText.OfferFootnotes, data, true, params), controls = markers(html);
  assert.equal(controls.length, 1);
  assert.deepEqual(controls.map(value => ({ itemId: value.itemId, fieldId: value.fieldId, fieldType: value.fieldType })), [body.metadata]);
  assert.ok(html.includes(sourceBody));
  assert.equal(data.body.jsonValue, body);
  assert.equal(JSON.stringify(data), before);
});

test('OfferFootnotes suppresses real blank and populated source-inactive fields in both modes', () => {
  for (const populated of [false, true]) {
    const data = freeze({ ...model(), heading: native('heading', populated ? 'UNUSED-HEADING' : '', 'Single-Line Text'),
      subheading: native('subheading', populated ? '<p>UNUSED-SUBHEADING</p>' : ''),
      primaryLink: native('primary', { href: populated ? '/unused-primary' : '', text: 'UNUSED-PRIMARY' }, 'General Link'),
    }), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(RichText.OfferFootnotes, data, editing, params);
      assert.doesNotMatch(html, /UNUSED|unused-|<h[1-6]\b|<a\b|tileSubHeading/);
      assert.equal(markers(html).length, editing ? 1 : 0);
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('OfferFootnotes never reads source-inactive datasource getters', () => {
  const data = model(), before = JSON.stringify(data);
  for (const name of ['heading', 'subheading', 'primaryLink']) {
    Object.defineProperty(data, name, { get() { throw new Error(`Unused native field read: ${name}`); } });
  }
  Object.freeze(data);
  for (const editing of [false, true]) assert.ok(render(RichText.OfferFootnotes, data, editing, params).includes(sourceBody));
  assert.equal(JSON.stringify(data), before);
});

test('OfferFootnotes keeps a cleared native Body editor field without inventing absent fields', () => {
  const data = freeze({ body: native('body', '') });
  assert.equal(markers(render(RichText.OfferFootnotes, data, false, params)).length, 0);
  assert.deepEqual(markers(render(RichText.OfferFootnotes, data, true, params)).map(value => value.fieldId), ['test-only-offer-footnotes-body']);
  for (const editing of [false, true]) {
    assert.equal(markers(render(RichText.OfferFootnotes, {}, editing, params)).length, 0);
    assert.ok(render(RichText.OfferFootnotes, undefined, editing, params).includes('AllianzRichText'));
  }
});

test('OfferFootnotes renders authored replacement copy through the same native Body', () => {
  const data = freeze({ body: native('body', '<p><sup>1</sup>Edited native footnote.</p><hr>') }), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(RichText.OfferFootnotes, data, editing, params);
    assert.ok(html.includes(data.body.jsonValue.value));
    assert.doesNotMatch(html, /A level of protection|Policy loans and withdrawals/);
  }
  assert.equal(JSON.stringify(data), before);
});

test('OfferFootnotes leaves the entire accepted About164 RichText prefix and existing Default disclosures intact', () => {
  const source = fs.readFileSync(filename), before = source.subarray(0, 9237);
  assert.equal(createHash('sha256').update(before).digest('hex'), '6e04aff47362287b6a2e50d48673a4579748e7f425e1c2f386afa4f257fc4a9b');
  assert.match(source.subarray(9237).toString(), /export const OfferFootnotes =/);
  const data = freeze({ ...model(), heading: native('heading', 'UNUSED-HEADING'), subheading: native('subheading', 'UNUSED-SUBHEADING'),
    primaryLink: native('primary', { href: '/unused-link', text: 'UNUSED-LINK' }, 'General Link') });
  for (const editing of [false, true]) {
    const html = render(RichText.Default, data, editing, { layout: 'disclosures' });
    assert.match(html, /a-axlDisclosures/);
    assert.ok(html.includes(sourceBody));
    assert.doesNotMatch(html, /UNUSED|unused-|<h[1-6]\b/);
    assert.equal(markers(html).length, editing ? 1 : 0);
  }
});
