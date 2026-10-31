import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const Rich = loadSource(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx'));
const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const field = (name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: 'synthetic-professional-owner', fieldId: `synthetic-${name}`, fieldType } } });
const richData = () => ({ heading: field('heading', 'A native introduction'),
  body: field('body', '<p>Complete authored introduction.</p>', 'Rich Text'),
  icon: field('icon', { src: '/synthetic-badge.svg', alt: 'Badge' }, 'Image') });
const heroData = () => ({ heading: field('heading', '<strong>Native</strong> professional heading', 'Rich Text'),
  desktopImage: field('desktop', { src: '/synthetic-hero.jpg', alt: 'Native hero' }, 'Image'),
  mobileImage: field('mobile', { src: '/synthetic-mobile.jpg', alt: '' }, 'Image') });
const cardData = (collection = false) => {
  const card = { id: 'synthetic-contact-card', heading: field('heading', 'Native contact heading'),
    body: field('body', '<div class="tileBody u-font-size-xl"><p>Native contact copy.</p></div>', 'Rich Text'),
    icon: field('icon', { src: '/synthetic-information.svg', alt: 'Information' }, 'Image'),
    image: field('image', { src: '/source-absent-photo.jpg' }, 'Image'),
    alphanumeral: field('number', 'SOURCE-ABSENT-NUMBER'),
    links: { targetItems: [{ id: 'synthetic-contact-link', link: field('link', { href: '/contact-us', text: 'Contact us', target: '' }, 'General Link') }] } };
  return { heading: field('root-heading', 'SOURCE-ABSENT-ROOT'), children: { results: [collection
    ? { id: card.id, links: card.links, fieldCollection: Object.entries(card).filter(([name]) => !['id', 'links'].includes(name))
      .map(([name, value]) => ({ name, jsonValue: value.jsonValue })) }
    : card] } };
};
const params = { theme: 'green-soft', headingLevel: 'h2', alignment: 'center',
  paddingTop: 'lg', marginBottom: 'lg', RenderingIdentifier: 'synthetic-native-placement' };
function render(Component, data, mode = 'normal', overrides = {}) {
  const before = JSON.stringify(data);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {},
        route: { name: 'Synthetic professional page', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: { ...params, ...overrides },
    fields: data === undefined ? undefined : { data: { datasource: data } } })));
  assert.equal(JSON.stringify(data), before, 'render must preserve native values and field metadata');
  return html;
}
const decode = s => s.replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&#x27;', "'");
const editingFields = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(m => JSON.parse(decode(m[1])).fieldId).sort();

for (const mode of ['normal', 'preview', 'editing']) {
  test(`${mode}: ProfessionalLoginHero keeps the native stage and disabled account controls`, () => {
    const html = render(Hero.ProfessionalLoginHero, heroData(), mode, { layout: 'product', showLogin: '0' });
    assert.match(html, /class="allianz-professional-login-hero"/);
    assert.match(html, /id="synthetic-native-placement"/);
    assert.match(html, /c-hero.*-login/);
    assert.match(html, /synthetic-hero\.jpg/);
    assert.match(html, /srcSet="\/synthetic-mobile\.jpg"/);
    assert.equal((html.match(/<input\b[^>]*disabled=""/g) ?? []).length, 3);
    assert.match(html, /Forgot username\?/); assert.match(html, /Forgot password\?/);
    assert.doesNotMatch(html, /<form\b|action=|auth\.allianzlife/);
    const control = render(Hero.Default, heroData(), mode, { layout: 'home', showLogin: '1' });
    assert.doesNotMatch(control, /allianz-professional-login-hero/);
    assert.equal(html.replace(/^<div class="allianz-professional-login-hero" id="synthetic-native-placement">/, '').replace(/<\/div>$/, ''), control);
  });

  test(`${mode}: ProfessionalPlainIntroduction has the source plain outer body`, () => {
    const data = richData(), html = render(Rich.ProfessionalPlainIntroduction, data, mode);
    assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
    assert.match(html, /class="tileBody"/);
    assert.doesNotMatch(html, /class="tileBody u-font-size-xl"/);
    assert.match(html, /<h2>A native introduction<\/h2>/);
    assert.match(html, /Complete authored introduction/);
    assert.match(render(Rich.Default, data, mode), /tileBody u-font-size-xl/);
    if (mode === 'editing') assert.deepEqual(editingFields(html), ['synthetic-body', 'synthetic-heading', 'synthetic-icon']);
    else assert.equal(editingFields(html).length, 0);
  });

  test(`${mode}: explicit nested body typography stays authored and unchanged`, () => {
    const data = richData();
    data.body = field('body', '<div class="tileBody u-font-size-xl"><p>Explicit native body.</p></div>', 'Rich Text');
    const html = render(Rich.ProfessionalPlainIntroduction, data, mode);
    assert.equal((html.match(/tileBody u-font-size-xl/g) ?? []).length, 1);
    assert.match(html, /class="tileBody"/);
    assert.match(html, /Explicit native body/);
  });

  test(`${mode}: ProfessionalSubheadingIntroduction keeps its original Body in the header`, () => {
    const data = richData(); data.body = field('body', '<h5>Native subheading copy.</h5>', 'Rich Text');
    const html = render(Rich.ProfessionalSubheadingIntroduction, data, mode);
    assert.match(html, /class="tileSubHeading"/);
    assert.match(html, /<h5>Native subheading copy\.<\/h5>/);
    assert.ok(html.indexOf('Native subheading copy.') < html.indexOf('</header>'));
    assert.doesNotMatch(html, /class="tileBody/);
    if (mode === 'editing') assert.deepEqual(editingFields(html), ['synthetic-body', 'synthetic-heading', 'synthetic-icon']);
  });

  test(`${mode}: ProfessionalContactPrompt uses introduction geometry and the original child fields`, () => {
    const html = render(Cards.ProfessionalContactPrompt, cardData(), mode);
    assert.match(html, /l-grid__row u-padding-top-lg u-margin-bottom-lg/);
    assert.match(html, /l-grid__column-medium-12/);
    assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
    assert.doesNotMatch(html, /m-axlTile match-height|SOURCE-ABSENT|source-absent-photo/);
    assert.match(html, /tileContent u-text-center/);
    assert.match(html, /data-allianz-card-icon-appearance="white-on-brand"/);
    assert.match(html, /<h3>Native contact heading<\/h3>/);
    assert.equal((html.match(/tileBody u-font-size-xl/g) ?? []).length, 1);
    assert.match(html, /class="tileBody"/);
    assert.match(html, /<footer><div class="tileLink">/);
    assert.match(html, /href="\/contact-us"/);
    assert.match(html, /a-link__icon" aria-hidden="true"/);
    assert.equal(html, render(Cards.ProfessionalContactPrompt, cardData(true), mode));
    if (mode === 'editing') assert.deepEqual(editingFields(html), ['synthetic-body', 'synthetic-heading', 'synthetic-icon', 'synthetic-link']);
  });
}

test('professional variants do not invent content for missing or cleared native fields', () => {
  for (const Component of [Hero.ProfessionalLoginHero, Rich.ProfessionalPlainIntroduction,
    Rich.ProfessionalSubheadingIntroduction, Cards.ProfessionalContactPrompt]) {
    assert.match(render(Component, undefined), /AllianzHero|AllianzRichText|AllianzCardGrid/);
  }
  for (const mode of ['normal', 'preview', 'editing']) {
    const cleared = { heading: field('heading', ''), body: field('body', '', 'Rich Text'), icon: field('icon', {}, 'Image') };
    for (const Component of [Rich.ProfessionalPlainIntroduction, Rich.ProfessionalSubheadingIntroduction]) {
      const html = render(Component, cleared, mode);
      assert.doesNotMatch(html, /<h2|<h5|<img|scEmptyImage|No text in field/);
    }
    assert.doesNotMatch(render(Cards.ProfessionalContactPrompt, { children: { results: [] } }, mode), /<h3|<a\b|<img/);
  }
});

test('professional bodies retain internal page routing and General Links retain rejection rules', () => {
  const data = richData();
  data.body = field('body', '<p><a href="https://www.allianzlife.com/contact-us" target="_blank">Contact</a></p>', 'Rich Text');
  for (const Component of [Rich.ProfessionalPlainIntroduction, Rich.ProfessionalSubheadingIntroduction]) {
    const html = render(Component, data);
    assert.match(html, /href="\/contact-us"/);
    assert.doesNotMatch(html, /target="_blank"/);
  }
  data.primaryLink = field('primary', { href: 'javascript:alert(1)', text: 'Unsafe' }, 'General Link');
  assert.doesNotMatch(render(Rich.ProfessionalPlainIntroduction, data), /href="javascript:/);
  const cards = cardData(); cards.children.results[0].links.targetItems[0].link.jsonValue.value.href = 'javascript:alert(1)';
  assert.doesNotMatch(render(Cards.ProfessionalContactPrompt, cards), /href="javascript:/);
  cards.children.results[0].links.targetItems[0].link.jsonValue.value.href = 'https://unregistered.example/';
  assert.doesNotMatch(render(Cards.ProfessionalContactPrompt, cards), /href="https:\/\/unregistered\.example/);
});

test('cleared ordered contact links stay cleared and cannot reactivate an inactive scalar link', () => {
  for (const mode of ['normal', 'preview', 'editing']) {
    const data = cardData(), card = data.children.results[0];
    card.link = field('inactive-scalar', { href: '/contact-us', text: 'INACTIVE-SCALAR' }, 'General Link');
    card.links.targetItems = [];
    const html = render(Cards.ProfessionalContactPrompt, data, mode);
    assert.doesNotMatch(html, /INACTIVE-SCALAR|<a\b/);
    delete card.links;
    assert.match(render(Cards.ProfessionalContactPrompt, data, mode), /INACTIVE-SCALAR/);
  }
});

test('the forgotten-account spacing rule is limited to the new hero wrapper', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-hero/AllianzProfessionalHero.css'), 'utf8');
  assert.match(css, /\.allianz-professional-login-hero \.c-hero__loginForm \.o-axlLogin__linkGroupItem > \.allianz-text-button\s*\{\s*margin: 0;/);
  assert.equal((css.match(/\{/g) ?? []).length, 1);
});
