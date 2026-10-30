import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const filename = path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx');
const RTE = loadSource(filename);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const renderPreview = (Component, data, params) => renderToStaticMarkup(React.createElement(SitecoreProvider, {
  page: { mode: { isEditing: false, isNormal: false, isPreview: true }, siteName: 'allianz-life',
    layout: { sitecore: { context: {}, route: { name: 'Life Insurance', fields: {}, placeholders: {} } } } },
  api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
}, React.createElement(Component, { params, fields: { data: { datasource: data } } })));
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
      assert.match(html, name === 'LifeInformationHeading'
        ? /l-grid__row u-padding-bottom-lg u-padding-top-lg/
        : /l-grid__row u-margin-bottom-lg u-padding-top-lg/);
      assert.doesNotMatch(html, /UNUSED|u-font-size-xl|a-axlDisclosures/);
      if (hasBody) assert.match(html, /class="tileBody"[^>]*><p style="text-align:left;">Native <strong>body<\/strong>\.<\/p>/);
      else assert.doesNotMatch(html, /class="tileBody"/);
      assert.equal(data.heading.jsonValue, beforeHeading);
      if (hasBody) assert.equal(data.body.jsonValue, beforeBody);
      const ids = markers(html).map(m => m.fieldId);
      assert.deepEqual(ids, editing ? ['test-only-heading', ...(hasBody ? ['test-only-body'] : [])] : []);
    }
  });
  test(`${name}: blank active fields create no extra canvas controls and absent fields create none`, () => {
    const data = forbidden({ heading: field('heading', ''), ...(hasBody ? { body: field('body', '', 'Rich Text') } : {}) }, ['subheading', 'primaryLink', ...(!hasBody ? ['body'] : [])]);
    assert.equal(markers(render(RTE[name], data, false)).length, 0);
    assert.deepEqual(markers(render(RTE[name], data, true)).map(m => m.fieldId), []);
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

test('only resolved-yellow Information moves the same 32px bottom gap inside its background', () => {
  const postcss = require('postcss');
  const css = postcss.parse(fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8'));
  const utility = (selector, property) => {
    const values = [];
    css.walkRules(selector, rule => rule.walkDecls(property, declaration => values.push(declaration.value)));
    return values;
  };
  assert.deepEqual(utility('.u-margin-bottom-lg', 'margin-bottom'), ['32px']);
  assert.deepEqual(utility('.u-padding-bottom-lg', 'padding-bottom'), ['32px']);
  assert.deepEqual(utility('.u-padding-top-lg', 'padding-top'), ['32px']);

  for (const theme of ['yellow-soft', 'transparent', 'purple-soft', undefined]) {
    const data = fixture(), before = JSON.stringify(data);
    const originalHeading = data.heading.jsonValue;
    for (const editing of [false, true]) {
      const html = render(RTE.LifeInformationHeading, data, editing, { ...staleParams, theme });
      assert.match(html, /t-bg-yellow-soft/);
      assert.match(html, /l-grid__row u-padding-bottom-lg u-padding-top-lg/);
      assert.doesNotMatch(html, /u-margin-bottom-lg|u-padding-bottom-xl|u-margin-bottom-xl/);
      assert.equal(markers(html).length, editing ? 1 : 0);
      assert.strictEqual(data.heading.jsonValue, originalHeading);
    }
    const preview = renderPreview(RTE.LifeInformationHeading, data, { ...staleParams, theme });
    assert.match(preview, /t-bg-yellow-soft/);
    assert.match(preview, /l-grid__row u-padding-bottom-lg u-padding-top-lg/);
    assert.doesNotMatch(preview, /u-margin-bottom-lg|u-padding-bottom-xl|u-margin-bottom-xl/);
    assert.equal(markers(preview).length, 0);
    assert.strictEqual(data.heading.jsonValue, originalHeading);
    assert.equal(JSON.stringify(data), before);
  }
  for (const [name, themes] of [
    ['LifeInformationHeading', ['green-soft']],
    ['LifeShapesHeading', ['yellow-soft', 'green-soft']],
    ['LifePuzzleHeading', ['yellow-soft', 'green-soft']],
    ['AboutSectionHeading', ['yellow-soft']],
    ['AboutInformationHeading', ['yellow-soft']],
  ]) {
    for (const theme of themes) {
      const html = render(RTE[name], fixture(), false, { theme });
      assert.match(html, /l-grid__row u-margin-bottom-lg u-padding-top-lg/, `${name}/${theme}`);
      assert.doesNotMatch(html, /u-padding-bottom-lg/, `${name}/${theme}`);
    }
  }
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
  assert.equal(markers(render(RTE.LifeFootnotes, blank, true)).length, 0);
  assert.equal(markers(render(RTE.LifeFootnotes, {}, true)).length, 0);
});

test('Existing Default preserves source copy, populated native fields and normal disclosure presentation', () => {
  // The original source-byte prefix is superseded by the WYSIWYG field guards.
  // Existing rendered source copy and disclosure behavior remain checked below.
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
