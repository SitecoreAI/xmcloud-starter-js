import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const filename = path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx');
const RTE = loadSource(filename);
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(decode(match[1])));
const field = (name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: 'test-only-life-rte-owner', fieldId: `test-only-${name}`, fieldType: type, fixtureOnly: true } } });
const fixture = () => ({ heading: field('heading', 'A native heading'), body: field('body', '<p style="text-align:left;">Native <strong>body</strong>.</p>', 'Rich Text'),
  subheading: field('subheading', 'UNUSED-SUBHEADING', 'Rich Text'), primaryLink: field('link', { href: '/unused', text: 'UNUSED-LINK' }, 'General Link') });
const forbidden = (data, names) => { for (const name of names) Object.defineProperty(data, name, { get() { throw new Error(`Unused ${name} accessed`); } }); return data; };
const headingVariants = [ ['LifeShapesHeading', 'shapes', true], ['LifeInformationHeading', 'information', false], ['LifePuzzleHeading', 'puzzle', false] ];
const staleParams = { layout: 'disclosures', theme: 'yellow-soft', alignment: 'left', headingLevel: 'h6', paddingTop: 'xl', paddingBottom: 'xl', marginBottom: 'xl' };

for (const [name, icon, hasBody] of headingVariants) {
  test(`${name}: original field identities, fixed source structure, unused getters in both modes`, () => {
    for (const editing of [false, true]) {
      const data = forbidden(fixture(), ['subheading', 'primaryLink', ...(!hasBody ? ['body'] : [])]);
      const beforeHeading = data.heading.jsonValue;
      const beforeBody = hasBody ? data.body.jsonValue : undefined;
      const html = render(RTE[name], data, editing, staleParams);
      assert.match(html, /<h2[^>]*>A native heading<\/h2>/);
      assert.match(html, new RegExp(`/allianz-ui/life-overview/${icon}\\.svg`));
      assert.match(html, /alt="" aria-hidden="true"/);
      assert.match(html, /class="tileContent u-text-center"><div class="tileIcon[^>]*><img[^>]*><\/div><header>/);
      assert.match(html, /l-grid__row u-margin-bottom-lg u-padding-top-lg/);
      assert.doesNotMatch(html, /UNUSED|u-font-size-xl|a-axlDisclosures/);
      if (hasBody) assert.match(html, /class="tileBody"[^>]*><p style="text-align:left;">Native <strong>body<\/strong>\.<\/p>/);
      else assert.doesNotMatch(html, /class="tileBody"/);
      assert.equal(data.heading.jsonValue, beforeHeading);
      if (hasBody) assert.equal(data.body.jsonValue, beforeBody);
      const ids = markers(html).map(m => m.fieldId);
      assert.deepEqual(ids, editing ? ['test-only-heading', ...(hasBody ? ['test-only-body'] : [])] : []);
    }
  });
  test(`${name}: blank active fields keep editor controls and absent fields create none`, () => {
    const data = forbidden({ heading: field('heading', ''), ...(hasBody ? { body: field('body', '', 'Rich Text') } : {}) }, ['subheading', 'primaryLink', ...(!hasBody ? ['body'] : [])]);
    assert.equal(markers(render(RTE[name], data, false)).length, 0);
    assert.deepEqual(markers(render(RTE[name], data, true)).map(m => m.fieldId), ['test-only-heading', ...(hasBody ? ['test-only-body'] : [])]);
    assert.equal(markers(render(RTE[name], {}, true)).length, 0);
  });
  test(`${name}: author replacement stays in the same native fields`, () => {
    const data = fixture(); data.heading.jsonValue.value = 'Edited native H2';
    if (hasBody) data.body.jsonValue.value = '<p>Edited native body</p>';
    const html = render(RTE[name], data, true);
    assert.match(html, /Edited native H2/);
    if (hasBody) assert.match(html, /Edited native body/);
    assert.equal(markers(html)[0].fieldId, 'test-only-heading');
  });
}

test('Information fixed circle and ordinary source yellow/green theme', () => {
  for (const theme of ['yellow-soft', 'green-soft']) {
    const html = render(RTE.LifeInformationHeading, fixture(), false, { theme });
    assert.match(html, new RegExp(`t-bg-${theme}`));
    assert.match(html, /tileIcon t-bg-primary-brand t-icon-primary-white/);
    assert.match(html, /allianz-life-overview-glyph-white/);
  }
  for (const name of ['LifeShapesHeading', 'LifePuzzleHeading']) assert.match(render(RTE[name], fixture(), false, { theme: 'green-soft' }), /t-bg-transparent/);
});

test('Footnotes: body-only original editor identity, source wrapper and absent/blank cases', () => {
  for (const editing of [false, true]) {
    const data = forbidden({ body: field('body', '<p><sup>1</sup> Native footnote.</p><hr />', 'Rich Text') }, ['heading', 'subheading', 'primaryLink']);
    const before = data.body.jsonValue;
    const html = render(RTE.LifeFootnotes, data, editing, staleParams);
    assert.match(html, /t-bg-grey-muted axlTileCollection/);
    assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
    assert.match(html, /class="tileBody"[^>]*><p><sup>1<\/sup> Native footnote\.<\/p><hr \/>/);
    assert.doesNotMatch(html, /a-axlDisclosures|content-body disclosure|u-font-size-xl|tileIcon/);
    assert.equal(data.body.jsonValue, before);
    assert.deepEqual(markers(html).map(m => m.fieldId), editing ? ['test-only-body'] : []);
  }
  const blank = { body: field('body', '', 'Rich Text') };
  assert.equal(markers(render(RTE.LifeFootnotes, blank, false)).length, 0);
  assert.equal(markers(render(RTE.LifeFootnotes, blank, true)).length, 1);
  assert.equal(markers(render(RTE.LifeFootnotes, {}, true)).length, 0);
});

test('Existing Default implementation remains byte-identical after its single CSS import', () => {
  const source = fs.readFileSync(filename, 'utf8');
  const original = source.slice(0, source.indexOf('\r\n\r\n// These finite variants')).replace("import './AllianzLifeOverviewHeadings.css';\r\n", '');
  assert.equal(Buffer.byteLength(original), 2660);
  assert.equal(createHash('sha256').update(original).digest('hex'), '581566db8f97bb54b3c92549e164dee865ea2034d2a77c564f26f15c0a8b88e0');
  for (const editing of [false, true]) {
    const html = render(RTE.Default, fixture(), editing, { headingLevel: 'h2' });
    assert.match(html, /u-font-size-xl/);
    assert.match(html, /UNUSED-SUBHEADING/);
    assert.match(html, /UNUSED-LINK/);
    const disclosure = render(RTE.Default, fixture(), editing, { layout: 'disclosures', theme: 'grey-muted' });
    assert.match(disclosure, /a-axlDisclosures/);
    assert.doesNotMatch(disclosure, /t-bg-grey-muted/);
  }
});
