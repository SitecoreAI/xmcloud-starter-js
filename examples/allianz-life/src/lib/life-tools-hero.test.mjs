import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
// Fresh Tools source, 2026-10-11, SHA256 df6c4ac43d1adfae92a0b405d502c922f82cd2f025f862326fed30e7137c1163.
// The source owns an H1, a p.h4 subtitle and an empty short-stage picture.
const title = 'Tools &amp; Resources';
const subtitle = 'Explore how our indexed universal life (IUL) insurance could work for you';
const params = { FieldNames: 'LifeToolsTitle', RenderingIdentifier: 'tools-title',
  theme: 'product-life', heroTheme: 'life' };
const native = (name, value, type = 'Rich Text') => ({ jsonValue: { value, metadata: {
  itemId: 'test-only-tools-hero-owner', fieldId: `test-only-tools-${name}`, fieldType: type,
} } });
const model = () => ({ heading: native('heading', title), body: native('body', subtitle) });
const freeze = (value) => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const markers = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

test('LifeToolsTitle preserves the source life shell, empty picture, H1 and p.h4 subtitle', () => {
  const input = freeze(model()), before = JSON.stringify(input);
  const html = render(Hero.LifeToolsTitle, input, false, params);
  assert.match(html, /^<div class="l-container-full-width t-bg-product-life c-hero__theme--life allianz-editorial-hero" id="tools-title">/);
  assert.match(html, /<picture class="c-image c-stage__image--cover c-stage__image--short"><\/picture>/);
  assert.match(html, /<div class="l-grid l-grid--max-width l-grid--no-gutters"><div class="l-grid__column-medium-12 c-hero__wrapper">/);
  assert.ok(html.includes(`<h1 class="c-heading c-hero__headline u-text-center">${title}</h1>`));
  assert.ok(html.includes(`<p class="h4 c-heading c-hero__subHeadline u-text-center">${subtitle}</p>`));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.equal((html.match(/c-hero__subHeadline/g) ?? []).length, 1);
  assert.equal(html, render(Hero.LifeStrategy, input, false, { ...params, FieldNames: 'LifeStrategy' }));
  assert.equal(JSON.stringify(input), before);
});

test('LifeToolsTitle owns exactly the native heading and body once in installed SDK editing', () => {
  const input = freeze(model()), before = JSON.stringify(input);
  const html = render(Hero.LifeToolsTitle, input, true, params);
  const controls = markers(html);
  assert.deepEqual(controls.map((entry) => entry.fieldId), ['test-only-tools-heading', 'test-only-tools-body']);
  for (const [index, name] of ['heading', 'body'].entries()) {
    assert.equal(controls[index].itemId, input[name].jsonValue.metadata.itemId);
    assert.equal(controls[index].fieldType, input[name].jsonValue.metadata.fieldType);
    assert.equal(controls[index].fieldId, input[name].jsonValue.metadata.fieldId);
    assert.ok(html.includes(input[name].jsonValue.value));
  }
  assert.equal(JSON.stringify(input), before);
});

test('LifeToolsTitle suppresses accidentally filled image, CTA, eyebrow and login surfaces in both modes', () => {
  const input = freeze({ ...model(), eyebrow: native('eyebrow', 'Unwanted eyebrow'),
    desktopImage: native('desktopImage', { src: '/test-only/unwanted-desktop.jpg', alt: 'Unwanted desktop' }, 'Image'),
    mobileImage: native('mobileImage', { src: '/test-only/unwanted-mobile.jpg', alt: 'Unwanted mobile' }, 'Image'),
    primaryLink: native('primaryLink', { href: '/unwanted-primary', text: 'Unwanted primary CTA' }, 'General Link'),
    secondaryLink: native('secondaryLink', { href: '/unwanted-secondary', text: 'Unwanted secondary CTA' }, 'General Link') });
  const before = JSON.stringify(input);
  for (const editing of [false, true]) {
    const html = render(Hero.LifeToolsTitle, input, editing, { ...params,
      theme: 'injected-theme', heroTheme: 'variable', layout: 'home', showLogin: '1', showImages: '1' });
    assert.doesNotMatch(html, /Unwanted|unwanted-|<img\b|<source\b|<a\b|<button\b|<iframe\b|Mobile image|scEmptyImage|c-hero__loginForm|injected-theme|c-hero__theme--variable|m-hero-overlay/);
    assert.ok(html.includes(subtitle));
    if (editing) assert.deepEqual(markers(html).map((entry) => entry.fieldId), ['test-only-tools-heading', 'test-only-tools-body']);
  }
  assert.equal(JSON.stringify(input), before);
});

test('LifeToolsTitle never reads unused native fields or fabricates absent text controls', () => {
  const input = model();
  for (const name of ['desktopImage', 'mobileImage', 'primaryLink', 'secondaryLink', 'eyebrow']) {
    Object.defineProperty(input, name, { get() { throw new Error(`Unused native field read: ${name}`); } });
  }
  for (const editing of [false, true]) {
    assert.ok(render(Hero.LifeToolsTitle, input, editing, params).includes(subtitle));
    assert.doesNotMatch(render(Hero.LifeToolsTitle, {}, editing, params), /c-hero__headline|c-hero__subHeadline|kind="open"/);
  }
  assert.match(render(Hero.LifeToolsTitle, undefined, true, params), /AllianzHero/);
});

test('LifeToolsTitle omits blank canvas text without changing native fields', () => {
  const input = freeze({ heading: native('heading', ''), body: native('body', '') });
  const before = JSON.stringify(input);
  const visitor = render(Hero.LifeToolsTitle, input, false, params);
  assert.doesNotMatch(visitor, /c-hero__headline|c-hero__subHeadline|kind="open"/);
  const editor = render(Hero.LifeToolsTitle, input, true, params);
  assert.deepEqual(markers(editor), []);
  assert.equal(editor, visitor);
  assert.doesNotMatch(editor, /c-hero__headline|c-hero__subHeadline|No text in field/);
  assert.equal(JSON.stringify(input), before);
});

test('LifeToolsTitle keeps block RichText semantics and preserves the separate title-only variant', () => {
  for (const [heading, body] of [
    ['<span>Tools &amp; Resources</span>', '<em>Authored subtitle</em>'],
    ['<p>Tools <strong>&amp; Resources</strong></p>', '<p>Authored <strong>subtitle</strong></p>'],
    ['<h1>Tools &amp; Resources</h1>', '<ul><li>Authored subtitle</li></ul>'],
  ]) {
    const input = freeze({ heading: native('heading', heading), body: native('body', body) });
    const before = JSON.stringify(input);
    for (const editing of [false, true]) {
      const html = render(Hero.LifeToolsTitle, input, editing, params);
      assert.ok(html.includes(heading) && html.includes(body));
      if (heading.startsWith('<span>')) assert.match(html, /<h1 class="c-heading c-hero__headline u-text-center">/);
      else assert.match(html, /<div role="heading" aria-level="1" class="h1 c-heading c-hero__headline u-text-center">/);
      if (body.startsWith('<em>')) assert.match(html, /<p class="h4 c-heading c-hero__subHeadline u-text-center">/);
      else assert.match(html, /<div class="h4 c-heading c-hero__subHeadline u-text-center">/);
      assert.doesNotMatch(html, /<h1[^>]*><(?:p|h1)\b|<p[^>]*><(?:p|ul)\b/);
      if (editing) assert.deepEqual(markers(html).map((entry) => entry.fieldId), ['test-only-tools-heading', 'test-only-tools-body']);
      const titleOnly = render(Hero.LifeFaqTitle, input, editing, { ...params, FieldNames: 'LifeFaqTitle' });
      assert.ok(titleOnly.includes(heading));
      assert.ok(!titleOnly.includes(body));
      if (editing) assert.deepEqual(markers(titleOnly).map((entry) => entry.fieldId), ['test-only-tools-heading']);
    }
    assert.equal(JSON.stringify(input), before);
  }
});
