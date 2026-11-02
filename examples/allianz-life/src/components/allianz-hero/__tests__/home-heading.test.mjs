import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { homeHeroHeadingField } = loadSource(path.join(sourceRoot, 'lib/allianz-home-heading.ts'));
const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const inline = '<span class="t-primary-brand"><strong>Allianz</strong></span> annuities and life insurance: for all that\'s ahead';
const native = `<div class="ck-content"><p>${inline}</p></div>`;
const metadata = Object.freeze({ itemId: 'test-home-hero', fieldId: 'test-home-heading', fieldType: 'Rich Text', rawValue: native });
const field = (value = native) => Object.freeze({ value, metadata, editable: 'test-metadata-envelope' });

function render(heading, mode = 'normal', params = { layout: 'home' }, Component = Hero.Default) {
  const before = JSON.stringify(heading);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Home', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: { data: { datasource: { heading: { jsonValue: heading } } } } })));
  assert.equal(JSON.stringify(heading), before, 'rendering must not mutate native fields or metadata');
  return html;
}

for (const mode of ['normal', 'preview']) test(`${mode}: the actual normalized homepage value produces one source-shaped H1`, () => {
  const heading = field();
  const html = render(heading, mode);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.ok(html.includes(`<h1 class="c-heading c-hero__headline">${inline}</h1>`));
  assert.doesNotMatch(html, /role="heading"|aria-level|<h1[^>]*>\s*<(?:div|p)\b/);
  assert.equal(html.replace(/<[^>]*>/g, ''), inline.replace(/<[^>]*>/g, ''));
  assert.equal(heading.value, native);
});

test('native editing retains original wrapper HTML, field identity and one metadata chrome', () => {
  const heading = field();
  assert.equal(homeHeroHeadingField(heading, true, true), heading);
  const html = render(heading, 'editing');
  assert.ok(html.includes(native));
  assert.match(html, /<div role="heading" aria-level="1" data-allianz-hero-block-heading="true"/);
  assert.equal((html.match(/kind="open"/g) ?? []).length, 1);
  assert.equal((html.match(/test-home-heading/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<h1\b/);
});

test('non-home Default and FixedProduct retain their established block surfaces', () => {
  const heading = field();
  assert.equal(homeHeroHeadingField(heading, false, false), heading);
  for (const Component of [Hero.Default, Hero.FixedProduct]) {
    const html = render(heading, 'normal', {}, Component);
    assert.ok(html.includes(native));
    assert.match(html, /role="heading" aria-level="1"/);
    assert.doesNotMatch(html, /<h1\b/);
  }
});

test('the visitor copy preserves every field property and metadata reference', () => {
  const heading = field();
  const projected = homeHeroHeadingField(heading, true, false);
  assert.notEqual(projected, heading);
  assert.equal(projected.value, inline);
  assert.equal(projected.metadata, metadata);
  assert.equal(projected.editable, heading.editable);
  assert.deepEqual(Object.keys(projected), Object.keys(heading));
});

test('metadata-rich visitors render the projected value rather than stale editable HTML', () => {
  const heading = Object.freeze({ value: native, metadata, editable: '<p>Stale editable heading</p>' });
  const html = render(heading);
  assert.ok(html.includes(`<h1 class="c-heading c-hero__headline">${inline}</h1>`));
  assert.doesNotMatch(html, /Stale editable heading|kind="open"/);
  assert.equal(heading.editable, '<p>Stale editable heading</p>');
});

for (const inner of [
  'Source text',
  '<span data-owner="retained" aria-label="Allianz" style="color: purple"><strong>Source</strong></span><br />next line',
  '<span title="x > y"><strong lang=\'en\'>Source</strong></span>',
  '<span title="A > B < C and </p>"><strong>Source</strong></span>',
]) test(`transparent wrappers preserve inline markup and attributes: ${inner.slice(0, 24)}`, () => {
  for (const value of [`<p>${inner}</p>`, `<div class="ck-content"><p>${inner}</p></div>`]) {
    assert.equal(homeHeroHeadingField(field(value), true, false).value, inner);
  }
});

for (const value of [
  '<div class="ck-content" data-owner="authored"><p>Text</p></div>',
  '<div class="ck-content"><p class="authored">Text</p></div>',
  '<div class="ck-content" style="text-align:right"><p>Text</p></div>',
  '<div class="authored"><p>Text</p></div>',
  '<div class="ck-content"><p>First</p><p>Second</p></div>',
  '<div class="ck-content"><p><h2>Heading</h2></p></div>',
  '<div class="ck-content"><p><ul><li>Text</li></ul></p></div>',
  '<div class="ck-content"><p><span><strong>Text</span></strong></p></div>',
  '<div class="ck-content"><p><span/>Text</p></div>',
  '<div class="ck-content"><p>Text</br></p></div>',
  '<div class="ck-content"><p><a href="/about">Text</a></p></div>',
  '<div class="ck-content"><p>Text<!-- preserve --></p></div>',
  '<p class="authored">Text</p>',
  '<div class="ck-content"><p><span title="unfinished>Text</span></p></div>',
  '<div class="ck-content"><p>Text<span</p></div>',
]) test(`unrecognized markup keeps the original field: ${value.slice(0, 48)}`, () => {
  const heading = field(value);
  assert.equal(homeHeroHeadingField(heading, true, false), heading);
  assert.ok(render(heading).includes(value));
});

test('plain/inline, absent and cleared fields keep their existing identity and absence behavior', () => {
  assert.equal(homeHeroHeadingField(undefined, true, false), undefined);
  for (const value of ['', inline, 'Plain heading']) {
    const heading = field(value);
    assert.equal(homeHeroHeadingField(heading, true, false), heading);
    if (!value) assert.doesNotMatch(render(heading), /<h1\b|c-hero__headline/);
  }
  assert.doesNotMatch(render(field('<div class="ck-content"><p></p></div>')), /<h1\b|c-hero__headline/);
});
