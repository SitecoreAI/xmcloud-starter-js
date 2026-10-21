import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

// The installed Sitecore SDK renders every visitor/editing assertion. The
// fixture is limited to the two approved source entries, with no CMS calls.
const fixture = JSON.parse(fs.readFileSync(new URL('./two-section-breadth.fixture.json', import.meta.url), 'utf8'));
const layout = JSON.parse(fs.readFileSync(new URL('./two-section-breadth.layout.fixture.json', import.meta.url), 'utf8'));
const earlyPath = '/get-answers/how-to-address-financial-risks-of-early-retirement';
const offersPath = '/what-we-offer';
const early = fixture.routes[earlyPath];
const offers = fixture.routes[offersPath];
const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const Breadcrumbs = loadSource(path.join(sourceRoot, 'components/allianz-breadcrumbs/AllianzBreadcrumbs.tsx'));
const Legal = loadSource(path.join(sourceRoot, 'components/legal-disclosures/LegalDisclosures.tsx'));
const RichText = loadSource(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx'));
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const componentMap = new Map([['AllianzBreadcrumbs', Breadcrumbs], ['AllianzHero', Hero],
  ['AllianzCardGrid', Cards], ['AllianzRichText', RichText]]);
const count = (html, re) => [...html.matchAll(re)].length;
const decode = (html) => html.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'")
  .replaceAll('&nbsp;', ' ').replaceAll('&reg;', '®').replaceAll('&rsquo;', '’');
const text = (html) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const value = (field) => field?.jsonValue?.value;
const populated = field => { const v = value(field); return typeof v === 'string' ? Boolean(v.trim()) : Boolean(v?.src || v?.href || v?.text); };
const sourceData = (component) => component.fields.data.datasource;
const fieldType = (name) => ['body', 'subheading', 'summary'].includes(name) ? 'Rich Text'
  : /Image|image|icon/.test(name) && name !== 'iconTheme' ? 'Image'
  : /link/i.test(name) ? 'General Link' : 'Single-Line Text';

function nativeData(component) {
  const data = structuredClone(sourceData(component));
  function annotate(item) {
    for (const [name, field] of Object.entries(item)) {
      if (field && typeof field === 'object' && Object.hasOwn(field, 'jsonValue')) {
        field.jsonValue.metadata = { itemId: item.id, fieldId: `test-only-${item.id}-${name}`, fieldType: fieldType(name) };
      }
      for (const child of field?.results ?? field?.targetItems ?? []) annotate(child);
    }
  }
  annotate(data);
  return data;
}

const layouts = new Map(Object.values(layout.routes).flat().map((placement) => [placement.sourceKey, placement]));
function plannedData(component) {
  const data = nativeData(component);
  const [route] = Object.entries(fixture.routes).find(([, source]) => source.components.includes(component));
  for (const override of layout.sourceOverrides.filter((entry) => entry.route === route && entry.ownerSourceKey === component.sourceKey)) {
    const card = data.children.results.find((item) => item.id === override.ownerSourceId);
    assert.equal(value(card[override.field]), override.before);
    card[override.field].jsonValue.value = override.after;
  }
  const pdf = layout.pdfLinks.find((entry) => entry.route === route && entry.sourceOrder === layouts.get(component.sourceKey).sourceOrder);
  if (pdf) {
    const card = data.children.results[0];
    for (const link of [card.link, ...card.links.targetItems.map((item) => item.link)]) link.jsonValue.value = {
      ...link.jsonValue.value, href: pdf.absoluteSourceUrl, linktype: 'external', target: pdf.target, 'aria-label': pdf.ariaLabel,
    };
  }
  return data;
}

function fieldCollectionData(data) {
  const native = structuredClone(data);
  native.children.results = native.children.results.map((card) => ({
    id: card.id,
    fieldCollection: Object.entries(card).flatMap(([name, field]) => {
      if (field && typeof field === 'object' && Object.hasOwn(field, 'jsonValue')) return [{ name, jsonValue: field.jsonValue }];
      if (name !== 'links') return [];
      return [{ name, jsonValue: field.targetItems.map((item) => ({ id: item.id,
        fields: Object.fromEntries(Object.entries(item).filter(([, f]) => f?.jsonValue)
          .map(([key, f]) => [key[0].toUpperCase() + key.slice(1), f.jsonValue])) })) }];
    }),
  }));
  return native;
}

const marker = (item, field) => `test-only-${item.id}-${field}`;
const cards = [...early.components, ...offers.components].filter((component) => component.componentName === 'AllianzCardGrid');
const steps = early.components.slice(2, 5);
const callouts = [early.components[5], offers.components[3]];
const productTiles = offers.components[2];

const selectedVariant = (component) => layouts.get(component.sourceKey).export;
const selectedParams = (component) => layouts.get(component.sourceKey).params;
const stepParams = selectedParams(steps[0]);
const productsParams = selectedParams(productTiles);

function mappedMain(route, compact = false) {
  const placements = fixture.routes[route].components.map((component) => ({ ...component,
    params: { ...selectedParams(component), FieldNames: selectedVariant(component) },
    fields: { data: { datasource: compact && component.componentName === 'AllianzCardGrid'
      ? fieldCollectionData(plannedData(component)) : plannedData(component) } },
  }));
  const Main = () => {
    const { page } = sdk.useSitecore();
    return React.createElement(sdk.AppPlaceholder, { name: 'headless-main', page, componentMap,
      rendering: { uid: `test-only-native-main-${route}`, componentName: 'Test-only main', placeholders: { 'headless-main': placements } } });
  };
  return { placements, render: (editing = false) => render(Main, undefined, editing) };
}

test('fixture contains only the two exact native-content source entries and original rendering order', () => {
  assert.deepEqual(Object.keys(fixture.routes), [earlyPath, offersPath]);
  const native = JSON.parse(fs.readFileSync(path.resolve(sourceRoot, '../content/native-content.json'), 'utf8'));
  for (const route of [earlyPath, offersPath]) assert.deepEqual(fixture.routes[route], native.routes[route]);
  assert.deepEqual(early.components.map(({ componentName }) => componentName),
    ['AllianzBreadcrumbs', 'AllianzHero', 'AllianzCardGrid', 'AllianzCardGrid', 'AllianzCardGrid', 'AllianzCardGrid', 'AllianzRichText']);
  assert.deepEqual(offers.components.map(({ componentName }) => componentName),
    ['AllianzBreadcrumbs', 'AllianzHero', 'AllianzCardGrid', 'AllianzCardGrid', 'AllianzRichText', 'AllianzRichText']);
  assert.deepEqual(steps.map((component) => value(sourceData(component).children.results[0].alphanumeral)), ['1', '2', '3']);
  assert.equal(sourceData(productTiles).children.results.length, 2);
  assert.equal(sourceData(offers.components[3]).children.results.length, 1);
});

test('real SDK breadcrumbs preserve source labels, order and the active-page link', () => {
  for (const route of [early, offers]) {
    const data = nativeData(route.components[0]);
    for (const editing of [false, true]) {
      const html = render(Breadcrumbs.Default, data, editing);
      assert.equal(count(html, /class="c-breadcrumb__item"/g), data.primaryNav.targetItems.length);
      assert.equal(count(html, /aria-current="page"/g), 1);
      let previous = -1;
      for (const item of data.primaryNav.targetItems) {
        const index = html.indexOf(value(item.title));
        assert.ok(index > previous, `breadcrumb order ${value(item.title)}`);
        previous = index;
      }
    }
  }
});

test('early editorial stage and offers short overlay stage retain source heading, image and empty subtitle intent', () => {
  for (const [route, variant] of [[early, 'Editorial'], [offers, 'Editorial']]) {
    const component = route.components[1], data = nativeData(component), before = JSON.stringify(data);
    const visitor = render(Hero[variant], data, false, component.params);
    assert.match(visitor, /<h1 class="c-heading c-hero__headline/);
    assert.ok(visitor.includes(value(data.heading)));
    assert.ok(visitor.includes(`src="${value(data.desktopImage).src}"`));
    assert.ok(visitor.includes(`srcSet="${value(data.mobileImage).src}"`));
    assert.doesNotMatch(visitor, /c-hero__subHeadline|c-hero__loginForm|<a\b/);
    assert.match(visitor, /c-stage__image--short/);
    assert.equal(visitor.includes('c-hero m-hero-overlay'), route === offers);
    const editing = render(Hero[variant], data, true, component.params);
    for (const name of ['heading', 'body', 'desktopImage']) assert.equal(editing.includes(marker(data, name)), populated(data[name]), name);
    assert.ok(!editing.includes(marker(data, 'mobileImage')), 'mobile rendition remains available through content fields rather than an extra canvas image');
    assert.equal(JSON.stringify(data), before);
  }
});

test('cleared stage text and responsive images stay empty in both canvases with native Content data retained', () => {
  for (const [route, variant] of [[early, 'Editorial'], [offers, 'Editorial']]) {
    const component = route.components[1], data = nativeData(component);
    const initial = render(Hero[variant], data, false, component.params), original = structuredClone(data);
    for (const name of ['heading', 'body']) data[name].jsonValue.value = '';
    for (const name of ['desktopImage', 'mobileImage']) data[name].jsonValue.value = { src: '', alt: '' };
    const before = JSON.stringify(data), visitor = render(Hero[variant], data, false, component.params);
    assert.doesNotMatch(visitor, /<h1\b|c-hero__subHeadline|<source\b|src="\/allianz-assets\//);
    const editing = render(Hero[variant], data, true, component.params);
    for (const name of ['heading', 'body', 'desktopImage']) assert.equal(editing.includes(marker(data, name)), populated(data[name]), name);
    assert.ok(!editing.includes(marker(data, 'mobileImage')), 'mobile rendition remains available through content fields rather than an extra canvas image');
    assert.equal(JSON.stringify(data), before);
    assert.equal(render(Hero[variant], original, false, component.params), initial);
  }
});

test('named query and modern fieldCollection keep all selected source-card visitor and editor output identical', () => {
  for (const component of cards) {
    const named = plannedData(component), wire = fieldCollectionData(named), before = JSON.stringify(wire);
    const variant = selectedVariant(component), params = selectedParams(component);
    for (const editing of [false, true]) assert.equal(render(Cards[variant], wire, editing, params), render(Cards[variant], named, editing, params));
    assert.equal(JSON.stringify(wire), before);
  }
});

test('one first-step datasource renders the native introduction once before its numbered row without nested grid wrappers', () => {
  const component = steps[0], data = plannedData(component), before = JSON.stringify(data);
  const visitor = render(Cards.RetirementRiskSteps, data, false, selectedParams(component));
  assert.equal(count(visitor, /class="l-container--full-width /g), 1);
  assert.equal(count(visitor, /class="l-grid l-grid--max-width"/g), 1);
  assert.equal(count(visitor, /class="l-grid__row /g), 2);
  assert.equal(count(visitor, /m-axlIntroductionBlock -is--stacked -no--image/g), 1);
  assert.equal(count(visitor, /tile--alphaNumeric/g), 1);
  assert.equal(count(visitor, /<p>/g), 7);
  assert.ok(visitor.indexOf(value(data.body)) < visitor.indexOf(value(data.children.results[0].heading)));
  assert.match(visitor, /class="l-grid__row u-margin-bottom-lg u-padding-top-lg"/);
  assert.match(visitor, /class="l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12"/);
  const editing = render(Cards.RetirementRiskSteps, data, true, selectedParams(component));
  for (const name of ['heading', 'subheading', 'body']) assert.equal(editing.includes(marker(data, name)), populated(data[name]), name);
  assert.equal(JSON.stringify(data), before);
  const original = data.body.jsonValue.value;
  data.body.jsonValue.value = '';
  assert.equal(count(render(Cards.RetirementRiskSteps, data, false, selectedParams(component)), /<p>/g), 4);
  assert.ok(!render(Cards.RetirementRiskSteps, data, true, selectedParams(component)).includes(marker(data, 'body')));
  data.body.jsonValue.value = original;
  assert.equal(render(Cards.RetirementRiskSteps, data, false, selectedParams(component)), visitor);
});

test('real SDK main placeholder preserves the complete 7/6 native rendering order, visitor structure and editing chrome', () => {
  for (const route of [earlyPath, offersPath]) {
    const named = mappedMain(route), compact = mappedMain(route, true), before = JSON.stringify(named.placements);
    assert.equal(named.placements.length, route === earlyPath ? 7 : 6);
    assert.deepEqual(named.placements.map(({ componentName, params }) => [componentName, params.FieldNames]),
      layout.routes[route].map((entry) => [entry.componentName, entry.export]));
    const visitor = named.render();
    assert.equal(count(visitor, /axlTileCollection/g), route === earlyPath ? 5 : 3);
    assert.equal(count(visitor, /m-axlIntroductionBlock -is--stacked -no--image/g), route === earlyPath ? 3 : 2);
    assert.equal(count(visitor, /<h1\b/g), 1);
    // Existing Breadcrumb Default lets the SDK use its default editable flag;
    // source metadata can therefore mount its fields even in normal mode.
    // All scoped authored content controls explicitly select visitor mode.
    assert.doesNotMatch(visitor.replace(/<nav\b[^]*?<\/nav>/, ''), /chrometype="|data-sc-field-id=|tileBody u-font-size-xl/);
    const authored = fixture.routes[route].components.flatMap((component) => {
      const data = sourceData(component);
      return [value(data.body), ...(data.children?.results ?? []).flatMap((card) => [value(card.heading), value(card.body)])].filter(Boolean);
    });
    let previous = -1;
    for (const copy of authored) {
      const position = text(visitor).indexOf(text(copy));
      assert.ok(position > previous, `native source content order: ${text(copy).slice(0, 45)}`);
      previous = position;
    }
    const editing = named.render(true);
    assert.match(editing, /chrometype="placeholder"/);
    assert.equal(count(editing, /chrometype="rendering"/g), named.placements.length * 2);
    for (const placement of named.placements.filter(({ componentName }) => componentName !== 'AllianzBreadcrumbs')) {
      const data = placement.fields.data.datasource;
      if (populated(data.body) && (placement.componentName !== 'AllianzCardGrid' || placement.params.FieldNames === 'RetirementRiskSteps'))
        assert.ok(editing.includes(marker(data, 'body')));
    }
    for (const mode of [false, true]) assert.equal(compact.render(mode), named.render(mode));
    assert.equal(JSON.stringify(named.placements), before);
  }
});

test('grey native bodies and final offers disclosure remain source-complete, unscaled and editable after clear/restore', () => {
  for (const component of [early.components[6], offers.components[4], offers.components[5]]) {
    const data = plannedData(component), before = JSON.stringify(data), params = selectedParams(component);
    const visitor = render(RichText.Default, data, false, params);
    assert.ok(visitor.includes(value(data.body)));
    assert.doesNotMatch(visitor, /tileBody u-font-size-xl/);
    if (params.layout === 'disclosures') assert.match(visitor, /a-axlDisclosures[^]*?content-body disclosure/);
    else assert.match(visitor, /t-bg-grey-muted[^]*?m-axlIntroductionBlock[^]*?tileBody/);
    assert.ok(render(RichText.Default, data, true, params).includes(marker(data, 'body')));
    assert.equal(JSON.stringify(data), before);
    const original = value(data.body);
    data.body.jsonValue.value = '';
    assert.doesNotMatch(render(RichText.Default, data, false, params), /<p\b|<sup\b|<hr\b/);
    assert.ok(!render(RichText.Default, data, true, params).includes(marker(data, 'body')));
    data.body.jsonValue.value = original;
    assert.equal(render(RichText.Default, data, false, params), visitor);
  }
});

test('ordered steps keep 1, 2, 3 and complete source heading/body semantics in the real SDK', () => {
  const html = steps.map((component) => render(Cards.EditorialTiles, nativeData(component), false, selectedParams(component))).join('');
  assert.deepEqual([...html.matchAll(/<em class="alphaType">(\d)<\/em>/g)].map((match) => match[1]), ['1', '2', '3']);
  assert.equal(count(html, /tile--alphaNumeric/g), 3);
  assert.equal(count(html, /class="l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12"/g), 3);
  assert.equal(count(html, /<h4>/g), 3);
  assert.equal(count(html, /<p>/g), 9);
  assert.doesNotMatch(html, /tile--3366|tile--6633|tile--5050|match-height-row/);
  for (const component of steps) {
    const card = sourceData(component).children.results[0];
    assert.ok(html.includes(`<h4>${value(card.heading)}</h4>`));
    assert.ok(text(html).includes(text(value(card.body))));
  }
});

test('broken captured study link remains source-accurate in visitor/editing output without synthesizing the CTA destination', () => {
  const component = steps[0], data = nativeData(component), card = data.children.results[0], before = JSON.stringify(data);
  const broken = '/error-pages/404?item=web%3a%7b1E5EBA94-0237-4CEE-A3A9-5134E9B54A1C%7d%40en';
  assert.ok(value(card.body).includes(`href="${broken}"`));
  assert.ok(render(Cards.EditorialTiles, data, true, selectedParams(component)).includes(value(card.body)));
  const visitor = render(Cards.EditorialTiles, data, false, selectedParams(component));
  assert.ok(visitor.includes(`href="${broken}"`));
  assert.doesNotMatch(visitor, /276092315dabb182-EXT-0080\.pdf/);
  assert.equal(JSON.stringify(data), before);
});

test('study and financial-professional prompts retain distinct icons, source heading/body and original public PDF destination', () => {
  for (const component of callouts) {
    const data = plannedData(component), card = data.children.results[0], before = JSON.stringify(data);
    const visitor = render(Cards.EditorialIntro, data, false, selectedParams(component));
    assert.match(visitor, /t-bg-green-soft/);
    assert.match(visitor, /m-axlIntroductionBlock -is--stacked -no--image/);
    assert.match(visitor, /tileContent u-text-center/);
    assert.doesNotMatch(visitor, /tileBody u-font-size/);
    assert.ok(visitor.includes(`<h2>${value(card.heading)}</h2>`));
    assert.ok(visitor.includes(`src="${value(card.icon).src}"`));
    if (value(card.body)) assert.ok(visitor.includes(value(card.body)));
    const editing = render(Cards.EditorialIntro, data, true, selectedParams(component));
    for (const name of ['heading', 'subheading', 'body', 'icon', 'alphanumeral']) assert.equal(editing.includes(marker(card, name)), populated(card[name]), name);
    assert.equal(JSON.stringify(data), before);
  }
  const component = early.components[5], card = plannedData(component).children.results[0];
  const link = card.links.targetItems[0];
  const destination = 'https://www.allianzlife.com/-/media/Files/Global/documents/2023/06/02/17/42/EXT-0080.pdf';
  assert.equal(value(link.link).href, destination);
  assert.equal(link.link.asset.sourceUrl, 'https://www.allianzlife.com/-/media/Files/Global/documents/2023/06/02/17/42/EXT-0080.pdf');
  for (const editing of [false, true]) {
    const html = render(Cards.EditorialIntro, plannedData(component), editing, selectedParams(component));
    assert.ok(html.includes(`href="${destination}"`));
    assert.match(html, /target="_blank"/);
    assert.match(html, /aria-label="Get our study findings \(PDF\)"/);
    assert.match(html, /titleIconDownload/);
    assert.equal(count(html, /class="a-link__text">Get our study findings \(PDF\)<\/span>/g), 1);
  }
});

test('offers native pair preserves two grey product tiles, images, superscript disclosures and independent destination links', () => {
  const data = nativeData(productTiles), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Cards.EditorialStacked, data, editing, productsParams);
    assert.equal(count(html, /class="l-grid__column-medium-6"/g), 2);
    assert.equal(count(html, /tile--stackedImage -is--stacked t-bg-grey-soft/g), 2);
    assert.equal(count(html, /t-bg-grey-soft u-margin-bottom-xl/g), 2);
    assert.equal(count(html, /<sup>/g), 3);
    let previous = -1;
    for (const card of data.children.results) {
      const position = html.indexOf(value(card.heading));
      assert.ok(position > previous); previous = position;
      assert.ok(text(html).includes(text(value(card.body))));
      assert.ok(html.includes(`src="${value(card.image).src}"`));
      assert.ok(html.includes(`href="${value(card.links.targetItems[0].link).href}"`));
      if (editing) for (const name of ['heading', 'subheading', 'body', 'image']) assert.equal(html.includes(marker(card, name)), populated(card[name]), name);
    }
  }
  assert.equal(JSON.stringify(data), before);
});

test('canonical native clears override populated fieldCollection without stale source cards or mutation', () => {
  for (const component of cards) {
    const data = fieldCollectionData(plannedData(component));
    const original = structuredClone(data), card = data.children.results[0];
    const variant = selectedVariant(component), params = selectedParams(component);
    const populated = render(Cards[variant], data, false, params);
    const clearedNames = ['heading', 'subheading', 'body', 'image', 'icon', 'alphanumeral'];
    for (const name of clearedNames) {
      const field = card.fieldCollection.find((field) => field.name === name);
      if (field) card[name] = { jsonValue: { ...field.jsonValue, value: ['image', 'icon'].includes(name) ? { src: '', alt: '' } : '' } };
    }
    card.links = { targetItems: [] };
    const before = JSON.stringify(data), normal = render(Cards[variant], data, false, params), editing = render(Cards[variant], data, true, params);
    for (const name of ['heading', 'body']) {
      const stale = card.fieldCollection.find((field) => field.name === name)?.jsonValue?.value;
      if (stale) assert.ok(!normal.includes(stale));
    }
    const editableNames = variant === 'EditorialStacked' ? ['heading', 'subheading', 'body', 'image']
      : ['heading', 'subheading', 'body', 'icon', 'alphanumeral'];
    for (const name of editableNames) if (Object.hasOwn(card, name)) assert.ok(!editing.includes(marker(card, name)), `${variant} empty ${name} adds no canvas control`);
    assert.equal(JSON.stringify(data), before);
    data.children.results[0] = original.children.results[0];
    assert.equal(render(Cards[variant], data, false, params), populated);
  }
});

test('cleared ordered source links remain absent despite populated scalar fallback, with original Content metadata retained', () => {
  for (const component of [early.components[5], productTiles]) {
    const data = plannedData(component), card = data.children.results[0], variant = selectedVariant(component), params = selectedParams(component);
    const destination = value(card.link).href;
    card.links = { targetItems: [] };
    for (const editing of [false, true]) assert.ok(!render(Cards[variant], data, editing, params).includes(`href="${destination}"`));
    const link = plannedData(component).children.results[0].links.targetItems[0];
    card.links.targetItems = [link];
    link.link.jsonValue.value = { ...link.link.jsonValue.value, href: '', text: '' };
    const before = JSON.stringify(data);
    assert.ok(!render(Cards[variant], data, false, params).includes(`href="${destination}"`));
    const editing = render(Cards[variant], data, true, params);
    assert.ok(!editing.includes(marker(link, 'link')));
    assert.doesNotMatch(editing, /href="\/"/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('missing link icons use the source SVG; an authored or cleared native Image suppresses fallback and remains editable', () => {
  for (const component of [early.components[5], productTiles]) {
    const data = plannedData(component), variant = selectedVariant(component), params = selectedParams(component);
    data.children.results = data.children.results.slice(0, 1);
    const item = data.children.results[0].links.targetItems[0];
    assert.equal(count(render(Cards[variant], data, false, params), /<svg\b/g), 1);
    item.icon = { jsonValue: { value: { src: '/authored-link-icon.svg', alt: 'Authored link icon' },
      metadata: { itemId: item.id, fieldId: marker(item, 'icon'), fieldType: 'Image' } } };
    const populated = render(Cards[variant], data, false, params);
    assert.match(populated, /src="\/authored-link-icon\.svg"/);
    assert.equal(count(populated, /<svg\b/g), 0);
    const original = item.icon.jsonValue.value;
    item.icon.jsonValue.value = { src: '', alt: '' };
    const before = JSON.stringify(data);
    assert.equal(count(render(Cards[variant], data, false, params), /<svg\b/g), 0);
    const editing = render(Cards[variant], data, true, params);
    assert.equal(editing.includes(marker(item, 'icon')), Boolean(value(item.icon)?.src));
    assert.equal(count(editing, /<svg\b/g), 0);
    assert.equal(JSON.stringify(data), before);
    item.icon.jsonValue.value = original;
    assert.equal(render(Cards[variant], data, false, params), populated);
    const wire = fieldCollectionData(data);
    for (const mode of [false, true]) assert.equal(render(Cards[variant], wire, mode, params), render(Cards[variant], data, mode, params));
  }
});

test('clears stored directly in native fieldCollection preserve metadata and restore without stale source copy', () => {
  for (const component of cards) {
    const data = fieldCollectionData(plannedData(component)), variant = selectedVariant(component), params = selectedParams(component);
    data.children.results = data.children.results.slice(0, 1);
    const card = data.children.results[0], original = structuredClone(card.fieldCollection);
    const populated = render(Cards[variant], data, false, params);
    for (const field of card.fieldCollection) {
      if (['heading', 'subheading', 'body', 'alphanumeral'].includes(field.name)) field.jsonValue.value = '';
      if (['image', 'icon'].includes(field.name)) field.jsonValue.value = { src: '', alt: '' };
      if (field.name === 'links') for (const item of field.jsonValue) item.fields.Link.value = { href: '', text: '' };
    }
    const before = JSON.stringify(data), normal = render(Cards[variant], data, false, params), editing = render(Cards[variant], data, true, params);
    for (const name of ['heading', 'body']) {
      const stale = original.find((field) => field.name === name)?.jsonValue?.value;
      if (stale) assert.ok(!normal.includes(stale));
      assert.ok(!editing.includes(marker(card, name)));
    }
    assert.equal(JSON.stringify(data), before);
    card.fieldCollection = original;
    assert.equal(render(Cards[variant], data, false, params), populated);
  }
});

test('authored empty card lists and missing datasources retain the existing fallback contract', () => {
  for (const variant of ['RetirementRiskSteps', 'EditorialTiles', 'EditorialStacked', 'EditorialIntro', 'EditorialLegal']) {
    for (const editing of [false, true]) {
      assert.match(render(Cards[variant], undefined, editing, stepParams), /Add a datasource for AllianzCardGrid/);
      const empty = { children: { results: [] } };
      const html = render(Cards[variant], empty, editing, stepParams);
      assert.doesNotMatch(html, /<h[1-6]|<img\b|alphaType/);
      assert.equal(count(html, /<article\b/g), variant === 'RetirementRiskSteps' ? 1 : 0);
    }
  }
  for (const [Component, name] of [[Hero.Editorial, 'AllianzHero'], [Hero.Default, 'AllianzHero'], [Legal.Default, 'Legal Disclosures']])
    assert.ok(render(Component, undefined).includes(`Add a datasource for ${name}`));
});
