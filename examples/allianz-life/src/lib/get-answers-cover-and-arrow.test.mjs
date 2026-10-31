import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const field = (name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: 'test-only-editorial-owner', fieldId: `test-only-${name}`, fieldType } } });
const heroData = () => ({
  heading: field('heading', 'An authored resource heading', 'Rich Text'),
  body: field('body', '<p>Complete <strong>authored</strong> resource introduction.</p>', 'Rich Text'),
  desktopImage: field('desktop', { src: '/test-only-cover.jpg', alt: 'Authored cover' }, 'Image'),
  mobileImage: field('mobile', { src: '/test-only-cover-mobile.jpg', alt: 'Authored mobile cover' }, 'Image'),
});
const promptData = (collection = false) => {
  const card = { id: 'test-only-prompt-card',
    heading: field('prompt-heading', 'An authored closing introduction'),
    body: field('prompt-body', '<p>Preserve the complete native <em>body</em>.</p>', 'Rich Text'),
    link: field('prompt-link', { href: '/what-we-offer', text: 'Authored CTA label', target: '' }, 'General Link') };
  return { children: { results: [collection ? { id: card.id,
    fieldCollection: Object.entries(card).filter(([name]) => name !== 'id')
      .map(([name, value]) => ({ name, jsonValue: value.jsonValue })) } : card] } };
};
const params = { layout: 'home', theme: 'green-soft', headingLevel: 'h2', alignment: 'center',
  paddingTop: 'lg', marginBottom: 'lg', RenderingIdentifier: 'test-only-resource-placement' };
function render(Component, data, mode = 'normal', overrides = {}) {
  const before = JSON.stringify(data);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {},
        route: { name: 'Test-only resource page', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: { ...params, ...overrides },
    fields: data === undefined ? undefined : { data: { datasource: data } } })));
  assert.equal(JSON.stringify(data), before, 'render preserves original native values and editing metadata');
  return html;
}
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&#x27;', "'");
const editingFields = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(decode(match[1])).fieldId).sort();
const arrowPaths = html => [...html.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match => match[1]);
// Exact arrow path from the captured source Get Answers closing CTA.
const sourceArrowSHA256 = '7124b4cce7e1ad3e5f42d521958e5d613be46f97f9507b9b539710031d97e870';
const hash = text => createHash('sha256').update(text).digest('hex');

for (const mode of ['normal', 'preview', 'editing']) {
  test(`${mode}: EditorialCover retains native cover fields without the short-image cap`, () => {
    const data = heroData(), html = render(Hero.EditorialCover, data, mode);
    assert.match(html, /c-hero m-hero-overlay allianz-editorial-hero allianz-editorial-cover-hero/);
    assert.match(html, /<picture class="c-image c-stage__image--cover">/);
    assert.doesNotMatch(html, /c-stage__image--short/);
    assert.match(html, /id="test-only-resource-placement"/);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.match(html, /An authored resource heading/);
    assert.match(html, /<div class="h4 c-heading c-hero__subHeadline u-text-center">/);
    assert.match(html, /<p>Complete <strong>authored<\/strong> resource introduction\.<\/p>/);
    assert.match(html, /srcSet="\/test-only-cover-mobile\.jpg"/);
    assert.match(html, /src="\/test-only-cover\.jpg"/);
    if (mode === 'editing') assert.deepEqual(editingFields(html), ['test-only-body', 'test-only-desktop', 'test-only-heading']);
    else assert.deepEqual(editingFields(html), []);
  });

  test(`${mode}: existing editorial stages keep their prior short-stage presentation`, () => {
    for (const Component of [Hero.Editorial, Hero.LifeStrategy]) {
      const html = render(Component, heroData(), mode);
      assert.match(html, /c-stage__image--cover c-stage__image--short/);
      assert.doesNotMatch(html, /allianz-editorial-cover-hero/);
    }
  });

  test(`${mode}: block-normalized cover headings keep one accessible level-one heading`, () => {
    const data = heroData(); data.heading = field('heading', '<p>A normalized <strong>heading</strong></p>', 'Rich Text');
    const html = render(Hero.EditorialCover, data, mode);
    assert.equal((html.match(/role="heading" aria-level="1"/g) ?? []).length, 1);
    assert.doesNotMatch(html, /<h1\b[^>]*>\s*<p\b/);
    assert.match(html, /<p>A normalized <strong>heading<\/strong><\/p>/);
  });

  for (const collection of [false, true]) {
    test(`${mode}: EditorialIntroArrow retains ${collection ? 'field-collection' : 'scalar'} native content and the exact source arrow`, () => {
      const html = render(Cards.EditorialIntroArrow, promptData(collection), mode);
      assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image allianz-editorial-cards/);
      assert.match(html, /<h2>An authored closing introduction<\/h2>/);
      assert.match(html, /<div class="tileBody">/);
      assert.match(html, /Preserve the complete native <em>body<\/em>/);
      assert.match(html, /href="\/what-we-offer"/);
      assert.match(html, /Authored CTA label/);
      assert.equal(arrowPaths(html).length, 1);
      assert.equal(hash(arrowPaths(html)[0]), sourceArrowSHA256);
      assert.match(html, /a-link__icon" aria-hidden="true"/);
      if (mode === 'editing') assert.deepEqual(editingFields(html), ['test-only-prompt-body', 'test-only-prompt-heading', 'test-only-prompt-link']);
      else assert.deepEqual(editingFields(html), []);
      const original = render(Cards.EditorialIntro, promptData(collection), mode);
      assert.deepEqual(arrowPaths(original), [], 'original intro does not gain the opt-in glyph');
    });
  }
}

test('native link icons are retained without adding a second arrow', () => {
  const data = promptData();
  data.children.results[0].links = { targetItems: [{ id: 'test-only-native-navigation',
    link: field('native-link', { href: '/what-we-offer', text: 'Native navigation label' }, 'General Link'),
    icon: field('native-icon', { src: '/test-only-native-arrow.svg', alt: 'Authored arrow' }, 'Image') }] };
  for (const mode of ['normal', 'editing']) {
    const html = render(Cards.EditorialIntroArrow, data, mode);
    assert.match(html, /test-only-native-arrow\.svg/);
    assert.deepEqual(arrowPaths(html), []);
    assert.match(html, /Native navigation label/);
  }
});

test('native PDF links keep one download glyph instead of adding a second CTA arrow', () => {
  const href = 'https://xmc-sitecoresaaef4e-thltmnpdemof1fc-devdd6f.sitecorecloud.io/-/media/Project/Allianz-Life/Documents/Test-Brochure.pdf?ttc=1&tt=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const data = promptData();
  data.children.results[0].link = field('prompt-link', { href, text: 'Authored PDF label', target: '_blank',
    linktype: 'media', id: '{11111111-1111-4111-8111-111111111111}' }, 'General Link');
  for (const mode of ['normal', 'preview', 'editing']) {
    const html = render(Cards.EditorialIntroArrow, data, mode);
    assert.equal(arrowPaths(html).length, 1);
    assert.notEqual(hash(arrowPaths(html)[0]), sourceArrowSHA256);
    assert.match(html, /<title id="titleIconDownload">Download<\/title>/);
    assert.match(html, /href="https:\/\/xmc-sitecoresaaef4e-thltmnpdemof1fc-devdd6f\.sitecorecloud\.io\/-\/media\/Project\/Allianz-Life\/Documents\/Test-Brochure\.pdf\?ttc=1&amp;tt=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"/);
    assert.match(html, /target="_blank"/);
    assert.match(html, /Authored PDF label/);
    if (mode === 'editing') assert.deepEqual(editingFields(html), ['test-only-prompt-body', 'test-only-prompt-heading', 'test-only-prompt-link']);
    else assert.deepEqual(editingFields(html), []);
  }
});

test('new variants preserve missing-datasource fallback and existing visitor link rejection', () => {
  for (const Component of [Hero.EditorialCover, Cards.EditorialIntroArrow])
    assert.match(render(Component, undefined), /Add a datasource/);
  const data = promptData();
  data.children.results[0].link.jsonValue.value.href = 'javascript:alert(1)';
  const html = render(Cards.EditorialIntroArrow, data);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /href="#service-unavailable"/);
});

test('source cover margin is opt-in and relative to the native subtitle font', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-hero/AllianzEditorialHero.css'), 'utf8');
  assert.match(css, /\.allianz-editorial-cover-hero \.c-hero__subHeadline\s*\{\s*margin-bottom:\s*1em;/);
  assert.doesNotMatch(css, /margin-bottom:\s*26px/);
});
