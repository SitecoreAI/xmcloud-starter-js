import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
// Anonymous About source 2026-10-11: HTML ff97d1623247439379ffcacc1a2098416299eb9097d958a8e86b77d5834e8273.
// Plain unthemed stage, decorative image and H1; linked CSS 11de986b98b0afc9c4cd391d4b1072ff19d65c00567b70f5ded193fffe9f8c3f.
// Synthetic fields below mirror native jsonValue/value envelopes; metadata/URLs are test-only.
const title = 'Allianz: a leading provider of financial and retirement solutions';
const params = { FieldNames: 'AboutImageTitle', RenderingIdentifier: 'test-only-about-hero' };
const native = (name, value, type = 'Rich Text') => ({ jsonValue: { value, metadata: {
  itemId: 'test-only-about-hero-owner', fieldId: `test-only-about-hero-${name}`, fieldType: type,
} } });
const model = () => ({ heading: native('heading', title), desktopImage: native('desktopImage', {
  src: '/test-only/about-original.jpg', alt: '', width: '2368', height: '600',
}, 'Image') });
const freeze = (value) => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const markers = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

test('AboutImageTitle retains the plain source stage, one decorative short image and native H1', () => {
  const input = freeze(model()), before = JSON.stringify(input);
  const html = render(Hero.AboutImageTitle, input, false, params);
  assert.match(html, /^<div class="l-container-full-width" id="test-only-about-hero"><div class="m-axlHero">/);
  assert.match(html, /<picture class="c-image c-stage__image--cover c-stage__image--short"><img\b/);
  assert.match(html, /<div class="l-grid l-grid--max-width l-grid--no-gutters"><div class="l-grid__column-medium-12 c-hero__wrapper">/);
  assert.ok(html.includes(`<h1 class="c-heading c-hero__headline u-text-center">${title}</h1>`));
  assert.match(html, /src="\/test-only\/about-original.jpg"/);
  assert.match(html, /alt=""/);
  assert.match(html, /width="2368"/);
  assert.match(html, /height="600"/);
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, /allianz-editorial-hero|t-bg-|c-hero__theme|<source\b|<a\b|c-hero__subHeadline|kind="open"/);
  assert.equal(JSON.stringify(input), before);
});

test('AboutImageTitle owns only the original native image and heading once in installed SDK editing', () => {
  const input = freeze(model()), before = JSON.stringify(input);
  const html = render(Hero.AboutImageTitle, input, true, params), controls = markers(html);
  assert.deepEqual(controls.map((entry) => entry.fieldId), ['test-only-about-hero-desktopImage', 'test-only-about-hero-heading']);
  for (const [index, name] of ['desktopImage', 'heading'].entries()) {
    assert.equal(controls[index].itemId, input[name].jsonValue.metadata.itemId);
    assert.equal(controls[index].fieldType, input[name].jsonValue.metadata.fieldType);
  }
  assert.match(html, /alt=""/);
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.ok(html.includes(title));
  assert.doesNotMatch(html, /Mobile image|c-hero__subHeadline|<source\b|<a\b/);
  assert.equal(JSON.stringify(input), before);
});

test('AboutImageTitle handles the observed ordinary SDK envelope without metadata or alt', () => {
  const input = freeze({ heading: { jsonValue: { value: title } }, desktopImage: { jsonValue: { value: {
    src: '/test-only/initial-projected-image', width: '2000', height: '600',
    'dam-id': 'test-only-opaque-dam-id', 'dam-content-type': 'Image',
  } } } }), before = JSON.stringify(input);
  const html = render(Hero.AboutImageTitle, input, false, params);
  assert.match(html, /src="\/test-only\/initial-projected-image"/);
  assert.match(html, /width="2000"/);
  assert.match(html, /alt=""/);
  assert.ok(html.includes(title));
  assert.match(html, /dam-id="test-only-opaque-dam-id"/);
  assert.match(html, /dam-content-type="Image"/);
  assert.doesNotMatch(html, /kind="open"/);
  assert.equal(JSON.stringify(input), before);
});

test('AboutImageTitle never reads unused fields or presentation params in either mode', () => {
  const input = model(), unusedParams = { ...params };
  for (const name of ['body', 'eyebrow', 'mobileImage', 'primaryLink', 'secondaryLink']) {
    Object.defineProperty(input, name, { get() { throw new Error(`Unused native field read: ${name}`); } });
  }
  for (const name of ['theme', 'heroTheme', 'layout', 'showLogin', 'alignment', 'headingLevel']) {
    Object.defineProperty(unusedParams, name, { get() { throw new Error(`Unused presentation param read: ${name}`); } });
  }
  for (const editing of [false, true]) {
    const html = render(Hero.AboutImageTitle, input, editing, unusedParams);
    assert.ok(html.includes(title));
    assert.doesNotMatch(html, /<source\b|<a\b|<button\b|<iframe\b|t-bg-|c-hero__theme|m-hero-overlay|c-hero__loginForm|c-hero__subHeadline/);
    if (editing) assert.deepEqual(markers(html).map((entry) => entry.fieldId), ['test-only-about-hero-desktopImage', 'test-only-about-hero-heading']);
  }
});

test('AboutImageTitle omits absent controls and preserves real cleared field ownership without mobile fallback', () => {
  const cleared = freeze({ heading: native('heading', ''), desktopImage: native('desktopImage', {}, 'Image'),
    body: native('body', '<p>Unused body</p>'), eyebrow: native('eyebrow', 'Unused eyebrow'),
    mobileImage: native('mobileImage', { src: '/test-only/unused-mobile.jpg', alt: 'Unused mobile' }, 'Image'),
    primaryLink: native('primaryLink', { href: '/unused-primary', text: 'Unused primary' }, 'General Link'),
    secondaryLink: native('secondaryLink', { href: '/unused-secondary', text: 'Unused secondary' }, 'General Link') });
  const before = JSON.stringify(cleared), visitor = render(Hero.AboutImageTitle, cleared, false, params);
  assert.match(visitor, /<picture class="c-image c-stage__image--cover c-stage__image--short"><\/picture>/);
  assert.doesNotMatch(visitor, /c-hero__headline|<img\b|kind="open"|Unused|unused-/);
  const editor = render(Hero.AboutImageTitle, cleared, true, params);
  assert.deepEqual(markers(editor).map((entry) => entry.fieldId), ['test-only-about-hero-desktopImage', 'test-only-about-hero-heading']);
  assert.doesNotMatch(editor, /Unused|unused-|Mobile image|<source\b|<a\b/);
  assert.equal(JSON.stringify(cleared), before);
  for (const editing of [false, true]) {
    assert.doesNotMatch(render(Hero.AboutImageTitle, {}, editing, params), /c-hero__headline|<img\b|kind="open"/);
    assert.match(render(Hero.AboutImageTitle, undefined, editing, params), /AllianzHero/);
  }
});

test('AboutImageTitle keeps authored inline and block RichText semantic and immutable', () => {
  for (const heading of ['<span>Authored <em>title</em></span>', '<p>Authored <strong>title</strong></p>']) {
    const input = freeze({ ...model(), heading: native('heading', heading) }), before = JSON.stringify(input);
    for (const editing of [false, true]) {
      const html = render(Hero.AboutImageTitle, input, editing, params);
      assert.ok(html.includes(heading));
      if (heading.startsWith('<span>')) assert.match(html, /<h1 class="c-heading c-hero__headline u-text-center">/);
      else assert.match(html, /<div role="heading" aria-level="1" class="h1 c-heading c-hero__headline u-text-center">/);
      assert.doesNotMatch(html, /<h1[^>]*><p\b/);
      if (editing) assert.deepEqual(markers(html).map((entry) => entry.fieldId), ['test-only-about-hero-desktopImage', 'test-only-about-hero-heading']);
    }
    assert.equal(JSON.stringify(input), before);
  }
});

test('AboutImageTitle uses native author replacements instead of hardcoded About copy or image identity', () => {
  const input = freeze({ heading: native('heading', 'Replacement company title'), desktopImage: native('desktopImage', {
    src: '/test-only/replacement-company.jpg', alt: 'Authored replacement alt', width: '1800', height: '450',
  }, 'Image') }), before = JSON.stringify(input);
  for (const editing of [false, true]) {
    const html = render(Hero.AboutImageTitle, input, editing, params);
    assert.match(html, /Replacement company title/);
    assert.match(html, /src="\/test-only\/replacement-company.jpg"/);
    assert.match(html, /alt="Authored replacement alt"/);
    assert.match(html, /width="1800"/);
    assert.match(html, /height="450"/);
    assert.doesNotMatch(html, /Allianz: a leading provider|hero-azl-about-2023-1|test-only\/about-original/);
  }
  assert.equal(JSON.stringify(input), before);
});

test('AboutImageTitle source classes select existing short-image and heading spacing rules', () => {
  const css = require('postcss').parse(fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8'));
  const rule = (selector, media) => {
    const found = [];
    css.walkRules((candidate) => {
      if (candidate.selector !== selector) return;
      let actualMedia;
      for (let parent = candidate.parent; parent; parent = parent.parent) {
        if (parent.type === 'atrule' && parent.name === 'media') actualMedia = parent.params;
      }
      if (actualMedia === media) found.push(Object.fromEntries(candidate.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value])));
    });
    return found;
  };
  assert.ok(rule('.c-stage__image--short .c-hero__image', '(min-width:992px)').some((entry) => entry['max-height'] === '300px'));
  assert.ok(rule('.c-hero__headline', undefined).some((entry) => entry['padding-top'] === '40px' && entry.margin === '0'));
  assert.ok(rule('.c-hero__headline', '(min-width:704px)').some((entry) => entry['padding-top'] === '65px'));
  assert.ok(rule('.c-hero__wrapper', undefined).some((entry) => entry.padding === '0 10px 64px'));
  assert.ok(rule('.c-hero__wrapper', '(max-width:991px)').some((entry) => entry.padding === '0 10px 40px'));
});
