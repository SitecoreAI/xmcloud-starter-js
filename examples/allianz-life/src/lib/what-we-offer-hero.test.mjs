import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const filename = path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx');
const Hero = loadSource(filename);
// Test-only metadata mirrors native SDK envelopes; no native IDs are invented.
const native = (name, value, fieldType = 'Rich Text') => ({ jsonValue: { value, metadata: {
  itemId: 'test-only-offer-hero-owner', fieldId: `test-only-offer-hero-${name}`, fieldType,
} } });
const title = 'Risk management solutions to help strengthen your financial portfolio';
const model = () => ({ heading: native('heading', title), desktopImage: native('desktopImage', {
  src: '/test-only/offer-stage.jpg', alt: ' ', width: '2368', height: '600',
  'dam-id': 'test-only-offer-dam', 'dam-content-type': 'Image',
}, 'Image') });
const params = { theme: 'purple-soft', layout: 'disclosures', headingLevel: 'h6', alignment: 'left',
  spacing: 'xl', paddingTop: 'xl', paddingBottom: 'xl', marginBottom: 'xl', showLogin: '1',
  heroTheme: 'life', RenderingIdentifier: 'test-only-offer-hero' };
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

test('OfferImageTitle preserves the source overlay stage, short image, literal alt and H1', () => {
  const data = freeze(model()), before = JSON.stringify(data);
  const html = render(Hero.OfferImageTitle, data, false, params);
  assert.match(html, /^<div class="l-container-full-width t-bg-transparent c-hero m-hero-overlay allianz-editorial-hero" id="test-only-offer-hero">/);
  assert.match(html, /<picture class="c-image c-stage__image--cover c-stage__image--short"><img\b/);
  assert.match(html, /<div class="l-grid l-grid--max-width l-grid--no-gutters"><div class="l-grid__column-medium-12 c-hero__wrapper">/);
  assert.ok(html.includes(`<h1 class="c-heading c-hero__headline u-text-center">${title}</h1>`));
  assert.match(html, /src="\/test-only\/offer-stage.jpg"/);
  assert.match(html, /alt=" "/);
  assert.match(html, /width="2368"/);
  assert.match(html, /height="600"/);
  assert.match(html, /dam-id="test-only-offer-dam"/);
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<source\b|<a\b|c-hero__subHeadline|Mobile image|kind="open"|t-bg-purple|c-hero__theme|loginForm/);
  assert.equal(JSON.stringify(data), before);
});

test('OfferImageTitle exposes each original native heading/image metadata identity once', () => {
  const data = freeze(model()), before = JSON.stringify(data);
  const fields = [data.desktopImage.jsonValue, data.heading.jsonValue];
  const html = render(Hero.OfferImageTitle, data, true, params), controls = markers(html);
  assert.equal(controls.length, 2);
  assert.deepEqual(controls.map(value => ({ itemId: value.itemId, fieldId: value.fieldId, fieldType: value.fieldType })),
    fields.map(value => value.metadata));
  assert.match(html, /alt=" "/);
  assert.ok(html.includes(title));
  assert.equal(data.desktopImage.jsonValue, fields[0]);
  assert.equal(data.heading.jsonValue, fields[1]);
  assert.equal(JSON.stringify(data), before);
});

test('OfferImageTitle suppresses real blank and populated source-inactive native fields in both modes', () => {
  for (const populated of [false, true]) {
    const data = freeze({ ...model(), body: native('body', populated ? '<p>UNUSED-BODY</p>' : ''),
      eyebrow: native('eyebrow', populated ? 'UNUSED-EYEBROW' : ''),
      mobileImage: native('mobile', populated ? { src: '/unused-mobile.jpg', alt: 'UNUSED-MOBILE' } : {}, 'Image'),
      primaryLink: native('primary', { href: populated ? '/unused-primary' : '', text: 'UNUSED-PRIMARY' }, 'General Link'),
      secondaryLink: native('secondary', { href: populated ? '/unused-secondary' : '', text: 'UNUSED-SECONDARY' }, 'General Link'),
    }), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(Hero.OfferImageTitle, data, editing, params);
      assert.doesNotMatch(html, /UNUSED|unused-|Mobile image|<source\b|<a\b|c-hero__subHeadline/);
      assert.equal(markers(html).length, editing ? 2 : 0);
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('OfferImageTitle never accesses source-inactive datasource getters', () => {
  const data = model(), before = JSON.stringify(data);
  for (const name of ['body', 'eyebrow', 'mobileImage', 'primaryLink', 'secondaryLink']) {
    Object.defineProperty(data, name, { get() { throw new Error(`Unused native field read: ${name}`); } });
  }
  Object.freeze(data);
  for (const editing of [false, true]) assert.ok(render(Hero.OfferImageTitle, data, editing, params).includes(title));
  assert.equal(JSON.stringify(data), before);
});

test('OfferImageTitle suppresses cleared canvas fields without changing ownership or creating missing fields', () => {
  const data = freeze({ heading: native('heading', ''), desktopImage: native('desktopImage', {}, 'Image') });
  const before = JSON.stringify(data), visitor = render(Hero.OfferImageTitle, data, false, params);
  assert.equal(markers(visitor).length, 0);
  const html = render(Hero.OfferImageTitle, data, true, params);
  assert.deepEqual(markers(html), []);
  assert.equal(html, visitor);
  assert.doesNotMatch(html, /c-hero__headline|<img\b|scEmptyImage|No text in field/);
  assert.equal(JSON.stringify(data), before);
  for (const editing of [false, true]) {
    assert.equal(markers(render(Hero.OfferImageTitle, {}, editing, params)).length, 0);
    assert.ok(render(Hero.OfferImageTitle, undefined, editing, params).includes('AllianzHero'));
  }
});

test('OfferImageTitle uses author replacements and retains the original field objects', () => {
  const data = freeze({ heading: native('heading', 'Edited native portfolio title'), desktopImage: native('desktopImage', {
    src: '/test-only/edited-portfolio.jpg', alt: 'Edited image description', width: '1800', height: '450',
  }, 'Image') }), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Hero.OfferImageTitle, data, editing, params);
    assert.match(html, /Edited native portfolio title/);
    assert.match(html, /src="\/test-only\/edited-portfolio.jpg"/);
    assert.match(html, /alt="Edited image description"/);
    assert.match(html, /width="1800"/);
    assert.doesNotMatch(html, /Risk management solutions|test-only\/offer-stage/);
  }
  assert.equal(JSON.stringify(data), before);
});

// Historical About164 source-prefix pin: first 16756 bytes SHA256
// 31e9054ef7828c67ec7978b1ea8fb82e0c3d50c0801e625d85a96625f5d870bf.
// WYSIWYG changes intentionally update that source; these exact visitor DOM pins
// were independently matched against the pre-change HEAD component with the same SDK/helpers.
test('OfferImageTitle and AboutImageTitle preserve their accepted visitor DOM contracts', () => {
  const data = freeze(model()), before = JSON.stringify(data);
  for (const [variant, digest] of [
    ['OfferImageTitle', 'd56896bb80fbf2e15e037a7be02adcb2ca869e72539a1545fb0fb922029ab3bc'],
    ['AboutImageTitle', '3b524cf08d41faf168100112f152dca5710929a0069753b4bacf91b8c1fbfe7c'],
  ]) assert.equal(createHash('sha256').update(render(Hero[variant], data, false, params)).digest('hex'), digest);
  assert.equal(JSON.stringify(data), before);
});
