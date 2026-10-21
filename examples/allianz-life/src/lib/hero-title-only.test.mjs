import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const params = { theme: 'transparent', layout: 'stage', columns: '1', alignment: 'center',
  spacing: 'none', headingLevel: 'h1', paddingTop: 'none', paddingBottom: 'none',
  marginBottom: 'none', showLogin: '0', DynamicPlaceholderId: '2', FieldNames: 'TitleOnly' };
const field = (name, value) => ({ jsonValue: { value, metadata: {
  itemId: 'test-only-title-item', fieldId: `test-only-title-${name}`,
  fieldType: ['desktopImage', 'mobileImage'].includes(name) ? 'Image'
    : ['primaryLink', 'secondaryLink'].includes(name) ? 'General Link' : 'Rich Text',
} } });
const policy = () => ({ heading: field('heading', 'Accessibility Policy'), body: field('body', ''),
  desktopImage: field('desktopImage', {}), mobileImage: field('mobileImage', {}),
  primaryLink: field('primaryLink', { href: '' }), secondaryLink: field('secondaryLink', { href: '' }) });
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const openFields = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

test('TitleOnly preserves the Policy heading field identity once without irrelevant empty surfaces', () => {
  const input = freeze(policy()), before = JSON.stringify(input);
  const html = render(Hero.TitleOnly, input, true, params);
  assert.deepEqual(openFields(html).map(value => value.fieldId), ['test-only-title-heading']);
  assert.equal(openFields(html)[0].itemId, input.heading.jsonValue.metadata.itemId);
  assert.match(html, /<h1 class="c-heading c-hero__headline u-text-center">Accessibility Policy<\/h1>/);
  assert.doesNotMatch(html, /<img\b|<source\b|<a\b|Mobile image|c-hero__subHeadline|scEmptyImage/);
  assert.equal(JSON.stringify(input), before);
});

test('TitleOnly ignores filled images, body, eyebrow and CTA fields in both modes', () => {
  const input = freeze({ ...policy(), body: field('body', '<p>Unrelated subtitle</p>'),
    eyebrow: field('eyebrow', 'Unrelated eyebrow'),
    desktopImage: field('desktopImage', { src: '/test-only/desktop.jpg', alt: 'Unrelated desktop' }),
    mobileImage: field('mobileImage', { src: '/test-only/mobile.jpg', alt: 'Unrelated mobile' }),
    primaryLink: field('primaryLink', { href: '/about', text: 'Unrelated primary link' }),
    secondaryLink: field('secondaryLink', { href: '/', text: 'Unrelated secondary link' }) });
  const before = JSON.stringify(input);
  for (const editing of [false, true]) {
    const html = render(Hero.TitleOnly, input, editing, { ...params, showImages: '1', showBody: '1', showLogin: '1' });
    assert.doesNotMatch(html, /Unrelated|<img\b|<source\b|<a\b|Mobile image|c-hero__subHeadline|c-hero__loginForm/);
    if (editing) assert.deepEqual(openFields(html).map(value => value.fieldId), ['test-only-title-heading']);
  }
  assert.equal(JSON.stringify(input), before);
});

test('TitleOnly never reads optional fields and does not invent a missing heading field', () => {
  const input = { heading: field('heading', 'Accessible title') };
  for (const name of ['desktopImage', 'mobileImage', 'body', 'eyebrow', 'primaryLink', 'secondaryLink']) {
    Object.defineProperty(input, name, { get() { throw new Error(`Unneeded field read: ${name}`); } });
  }
  for (const editing of [false, true]) assert.match(render(Hero.TitleOnly, input, editing, params), /Accessible title/);
  assert.doesNotMatch(render(Hero.TitleOnly, {}, true, params), /c-hero__headline|kind="open"/);
});

test('TitleOnly omits empty canvas headings and keeps populated block RichText semantics', () => {
  for (const value of ['', '<span>Accessibility Policy</span>', '<p>Accessibility <strong>Policy</strong></p>', '<h1>Accessibility Policy</h1>']) {
    const input = freeze({ heading: field('heading', value) }), before = JSON.stringify(input);
    for (const editing of [false, true]) {
      const html = render(Hero.TitleOnly, input, editing, params);
      if (!value) assert.doesNotMatch(html, /c-hero__headline|kind="open"|No text in field/);
      if (editing) assert.deepEqual(openFields(html).map(field => field.fieldId), value ? ['test-only-title-heading'] : []);
      if (value.startsWith('<p>') || value.startsWith('<h1>')) {
        assert.match(html, /<div role="heading" aria-level="1" class="h1 c-heading c-hero__headline u-text-center">/);
        assert.doesNotMatch(html, /<h1[^>]*><(?:p|h1)\b/);
      } else if (value) assert.match(html, /<h1\b[^>]*class="c-heading c-hero__headline u-text-center">/);
      if (value) assert.ok(html.includes(value));
    }
    assert.equal(JSON.stringify(input), before);
  }
});

test('actual Policy blank-field values preserve exact Editorial visitor wrappers, classes and spacing', () => {
  const input = freeze(policy());
  assert.equal(render(Hero.TitleOnly, input, false, params), render(Hero.Editorial, input, false, { ...params, FieldNames: 'Editorial' }));
  assert.match(render(Hero.TitleOnly, input, false, params), /<picture class="c-image c-stage__image--cover c-stage__image--short"><\/picture>/);
  assert.match(render(Hero.TitleOnly, undefined, true, params), /AllianzHero/);
});

test('Editorial and LifeStrategy keep populated native fields and use mobile images only in the responsive picture', () => {
  const input = freeze({ ...policy(), body: field('body', 'Native subtitle'),
    desktopImage: field('desktopImage', { src: '/test-only/desktop.jpg', alt: '' }),
    mobileImage: field('mobileImage', { src: '/test-only/mobile.jpg', alt: '' }) });
  for (const variant of ['Editorial', 'LifeStrategy']) {
    const html = render(Hero[variant], input, true, { ...params, heroTheme: 'life', theme: 'product-life' });
    assert.deepEqual(openFields(html).map(value => value.fieldId).sort(),
      ['test-only-title-body', 'test-only-title-desktopImage', 'test-only-title-heading']);
    assert.match(html, /<source media="\(max-width: 703px\)" srcSet="\/test-only\/mobile.jpg"\/>/);
    assert.equal((html.match(/<img\b/g) ?? []).length, 1);
    assert.match(html, /Native subtitle/);
    assert.doesNotMatch(html, /Mobile image|test-only-title-mobileImage|No text in field|scEmptyImage/);
  }
});
