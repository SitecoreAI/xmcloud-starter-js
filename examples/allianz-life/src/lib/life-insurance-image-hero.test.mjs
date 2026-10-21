import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
// Anonymous source 2026-10-11, SHA e7781ea2ad024c4c9a9671b72eb5a1cc78c6fb70b0974d617cb6fba8a3a75cd9:
// one short life picture/image and one H1; no subtitle, CTA or mobile source.
const title = 'What is indexed universal life insurance?';
const params = { FieldNames: 'LifeImageTitle', RenderingIdentifier: 'life-image-title' };
const native = (name, value, type = 'Rich Text') => ({ jsonValue: { value, metadata: {
  itemId: 'test-only-life-image-owner', fieldId: `test-only-life-image-${name}`, fieldType: type,
} } });
const model = () => ({ heading: native('heading', title), desktopImage: native('desktopImage', {
  src: '/test-only/life-hero.jpg', alt: 'What is fixed index universal life insurance', width: '2368', height: '600',
}, 'Image') });
const freeze = (value) => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const markers = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

test('LifeImageTitle preserves the source life shell, one short native image and one H1', () => {
  const input = freeze(model()), before = JSON.stringify(input);
  const html = render(Hero.LifeImageTitle, input, false, params);
  assert.match(html, /^<div class="l-container-full-width t-bg-product-life c-hero__theme--life allianz-editorial-hero" id="life-image-title">/);
  assert.match(html, /<picture class="c-image c-stage__image--cover c-stage__image--short"><img\b/);
  assert.match(html, /<div class="l-grid l-grid--max-width l-grid--no-gutters"><div class="l-grid__column-medium-12 c-hero__wrapper">/);
  assert.ok(html.includes(`<h1 class="c-heading c-hero__headline u-text-center">${title}</h1>`));
  assert.match(html, /src="\/test-only\/life-hero.jpg"/);
  assert.match(html, /alt="What is fixed index universal life insurance"/);
  assert.match(html, /width="2368"/);
  assert.match(html, /height="600"/);
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<source\b|<a\b|c-hero__subHeadline|kind="open"/);
  assert.equal(JSON.stringify(input), before);
});

test('LifeImageTitle owns the original native image and heading once in installed SDK editing', () => {
  const input = freeze(model()), before = JSON.stringify(input);
  const html = render(Hero.LifeImageTitle, input, true, params), controls = markers(html);
  assert.deepEqual(controls.map((entry) => entry.fieldId), ['test-only-life-image-desktopImage', 'test-only-life-image-heading']);
  for (const [index, name] of ['desktopImage', 'heading'].entries()) {
    assert.equal(controls[index].itemId, input[name].jsonValue.metadata.itemId);
    assert.equal(controls[index].fieldType, input[name].jsonValue.metadata.fieldType);
  }
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.ok(html.includes(title));
  assert.doesNotMatch(html, /Mobile image|c-hero__subHeadline|<source\b|<a\b/);
  assert.equal(JSON.stringify(input), before);
});

test('LifeImageTitle suppresses filled unused native fields and unrelated presentation params in both modes', () => {
  const input = freeze({ ...model(), body: native('body', '<p>Unused subtitle</p>'),
    eyebrow: native('eyebrow', 'Unused eyebrow'),
    mobileImage: native('mobileImage', { src: '/test-only/unused-mobile.jpg', alt: 'Unused mobile' }, 'Image'),
    primaryLink: native('primaryLink', { href: '/unused-primary', text: 'Unused primary' }, 'General Link'),
    secondaryLink: native('secondaryLink', { href: '/unused-secondary', text: 'Unused secondary' }, 'General Link') });
  const before = JSON.stringify(input);
  for (const editing of [false, true]) {
    const html = render(Hero.LifeImageTitle, input, editing, { ...params,
      theme: 'unwanted-theme', heroTheme: 'variable', layout: 'home', showLogin: '1' });
    assert.doesNotMatch(html, /Unused|unused-|unwanted-theme|c-hero__theme--variable|c-hero__loginForm|m-hero-overlay|Mobile image|c-hero__subHeadline|<source\b|<a\b|<button\b|<iframe\b/);
    assert.equal((html.match(/<img\b/g) ?? []).length, 1);
    if (editing) assert.deepEqual(markers(html).map((entry) => entry.fieldId), ['test-only-life-image-desktopImage', 'test-only-life-image-heading']);
  }
  assert.equal(JSON.stringify(input), before);
});

test('LifeImageTitle never reads unused fields and does not invent absent native controls', () => {
  const input = model();
  for (const name of ['body', 'mobileImage', 'primaryLink', 'secondaryLink', 'eyebrow']) {
    Object.defineProperty(input, name, { get() { throw new Error(`Unused native field read: ${name}`); } });
  }
  for (const editing of [false, true]) {
    assert.ok(render(Hero.LifeImageTitle, input, editing, params).includes(title));
    assert.doesNotMatch(render(Hero.LifeImageTitle, {}, editing, params), /c-hero__headline|<img\b|kind="open"/);
  }
  assert.match(render(Hero.LifeImageTitle, undefined, true, params), /AllianzHero/);
});

test('LifeImageTitle omits blank canvas image and title without changing native fields', () => {
  const input = freeze({ heading: native('heading', ''), desktopImage: native('desktopImage', {}, 'Image') });
  const before = JSON.stringify(input), visitor = render(Hero.LifeImageTitle, input, false, params);
  assert.match(visitor, /<picture class="c-image c-stage__image--cover c-stage__image--short"><\/picture>/);
  assert.doesNotMatch(visitor, /c-hero__headline|<img\b|kind="open"/);
  const editor = render(Hero.LifeImageTitle, input, true, params);
  assert.deepEqual(markers(editor), []);
  assert.equal(editor, visitor);
  assert.doesNotMatch(editor, /c-hero__headline|<img\b|scEmptyImage|No text in field/);
  assert.equal(JSON.stringify(input), before);
});

test('LifeImageTitle retains native block RichText without nested invalid H1 markup', () => {
  for (const heading of ['<span>Authored <em>title</em></span>', '<p>Authored <strong>title</strong></p>']) {
    const input = freeze({ ...model(), heading: native('heading', heading) }), before = JSON.stringify(input);
    for (const editing of [false, true]) {
      const html = render(Hero.LifeImageTitle, input, editing, params);
      assert.ok(html.includes(heading));
      if (heading.startsWith('<span>')) assert.match(html, /<h1 class="c-heading c-hero__headline u-text-center">/);
      else assert.match(html, /<div role="heading" aria-level="1" class="h1 c-heading c-hero__headline u-text-center">/);
      assert.doesNotMatch(html, /<h1[^>]*><p\b/);
      if (editing) assert.deepEqual(markers(html).map((entry) => entry.fieldId), ['test-only-life-image-desktopImage', 'test-only-life-image-heading']);
    }
    assert.equal(JSON.stringify(input), before);
  }
});

test('LifeImageTitle renders ordinary native author replacements without source prose or asset hardcoding', () => {
  const input = freeze({ heading: native('heading', 'Replacement life title'), desktopImage: native('desktopImage', {
    src: '/test-only/replacement-life.jpg', alt: 'Authored replacement alt', width: '1800', height: '450',
  }, 'Image') }), before = JSON.stringify(input);
  for (const editing of [false, true]) {
    const html = render(Hero.LifeImageTitle, input, editing, params);
    assert.match(html, /Replacement life title/);
    assert.match(html, /src="\/test-only\/replacement-life.jpg"/);
    assert.match(html, /alt="Authored replacement alt"/);
    assert.match(html, /width="1800"/);
    assert.match(html, /height="450"/);
    assert.doesNotMatch(html, /What is indexed universal life insurance|hero-azl-what-is-fiul|be13628c9f2a448c87bf5d2e47e3c80e/);
  }
  assert.equal(JSON.stringify(input), before);
});
