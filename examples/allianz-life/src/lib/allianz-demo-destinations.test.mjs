import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require, render as renderComponent } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { safeEditorialRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial.ts'));
const { safeNativeBodyRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-native-body-links.ts'));
const { restoreSourceAliasRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-source-aliases.ts'));
const retained = require(path.join(sourceRoot, 'lib/allianz-retained-native-body-assets.fixture.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Link, SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
process.env.NODE_ENV = 'production';
delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;

const source = 'https://www.allianzlife.com';
const faq = '/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator/frequently-asked-questions';
const sourceFaq = `${source}/what-we-offer/Life-Insurance/Indexed-Universal-Life/Allianz-Life-Accumulator/frequently-asked-questions`;
const metadata = { itemId: 'original-owner', fieldId: 'original-link', fieldType: 'General Link' };
const field = (href, extra = {}) => ({ value: { href, text: 'Original caption', target: '_blank', ...extra }, metadata });
function render(input) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isNormal: true, isEditing: false, isPreview: false },
      layout: { sitecore: { context: {}, route: { name: 'Containment', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Link, { ...safeLinkRenderProps(input), editable: false })));
}

test('Accumulator FAQ is canonical local in the real SDK and in descriptive rich text', () => {
  for (const href of [sourceFaq, sourceFaq.toUpperCase(), `http://www.allianzlife.com${faq}`, `//www.allianzlife.com${faq}`]) {
    const input = field(href, { linktype: 'external', title: 'Original title', class: 'authored-class' });
    const before = JSON.stringify(input), output = safeLink(input);
    assert.equal(output.value.href, faq);
    assert.equal(output.value.target, '');
    assert.equal(output.value.title, 'Original title');
    assert.equal(output.value.class, 'authored-class');
    assert.strictEqual(output.metadata, metadata);
    assert.equal(JSON.stringify(input), before);
    assert.match(render(input), new RegExp(`href="${faq}"`));
    assert.doesNotMatch(render(input), /allianzlife\.com|target="_blank"/);
    for (const internalOnly of [false, true]) {
      const body = { value: `<p>Keep <a data-href="untouched" href="${href}" target="_blank" rel="author"><b>FAQs</b></a>.</p>`, metadata };
      const result = safeEditorialRichText(body, false, internalOnly);
      assert.equal(result.value, `<p>Keep <a data-href="untouched" href="${faq}" target="" rel="author"><b>FAQs</b></a>.</p>`);
      assert.strictEqual(result.metadata, metadata);
      assert.strictEqual(safeEditorialRichText(body, true, internalOnly), body);
    }
  }
});

test('valid local counterparts preserve repeated encoded queries and native fragments once', () => {
  const input = field(`${sourceFaq}?tag=one&tag=two&q=a%23b#section`, { querystring: 'tag=one&tag=two&q=a%23b', anchor: 'section' });
  const output = safeLink(input);
  assert.equal(output.value.href, faq);
  assert.equal(output.value.querystring, 'tag=one&tag=two&q=a%23b');
  assert.equal(output.value.anchor, 'section');
  assert.match(render(input), /\?tag=one&amp;tag=two&amp;q=a%23b#section/);
});

test('fresh verified local counterparts survive repeated normalization without the old fixture catalogue', () => {
  const href = `${source}/what-we-offer/Life-Insurance/The-underwriting-process?one=1#details`;
  const output = safeLink(field(href));
  assert.equal(output.value.href, '/what-we-offer/life-insurance/the-underwriting-process');
  assert.equal(safeLink(output).value.href, output.value.href);
  assert.match(render(output), /href="\/what-we-offer\/life-insurance\/the-underwriting-process\?one=1#details"/);
  assert.doesNotMatch(render(output), /allianzlife\.com|service-unavailable/);
});

for (const missing of ['/Login', '/Rates', '/SPA/MVARate/DisplayHistoricalRates?productGuid=synthetic',
  '/what-we-offer/annuities/registered-index-linked-annuities/define-your-downside',
  '/what-we-offer/Life-Insurance/Indexed-Universal-Life',
  '/what-we-offer/Life-Insurance/Indexed-Universal-Life/Allianz-Life-Accumulator/Rates',
  '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus/rila-rates-center-ixap',
  '/what-we-offer/annuities/fixed-index-annuities/Core-Income-7/Rates', '/unknown-future-source-page']) {
  test(`unverified source counterpart stays literal # through SDK: ${missing}`, () => {
    const input = field(`${source}${missing}`, { querystring: 'stale=1', anchor: 'old', title: 'Original title' });
    const output = safeLink(input);
    assert.equal(output.value.href, '#');
    assert.equal(output.value.querystring, ''); assert.equal(output.value.anchor, ''); assert.equal(output.value.target, '');
    assert.strictEqual(output.metadata, metadata); assert.equal(output.value.title, 'Original title');
    assert.match(render(input), /href="#"/);
    assert.doesNotMatch(render(input), /service-unavailable|allianzlife\.com|stale=|#old/);
    const body = { value: `<a href="${source}${missing.replaceAll('&', '&amp;')}" target="_blank">Original</a>` };
    assert.equal(safeEditorialRichText(body, false, true).value, '<a href="#" target="">Original</a>');
  });
}

test('witnessed missing local counterparts and source aliases cannot reintroduce production URLs', () => {
  for (const href of ['/Login', '/Rates', '/culture', '/careers', '/AllianzForTomorrow']) assert.equal(safeLink(field(href)).value.href, '#');
  const body = { value: '<a href="/culture?original=1#here" target="_blank">Culture</a><a href="/careers">Careers</a>', metadata };
  const result = safeEditorialRichText(restoreSourceAliasRichText(body, false), false, true);
  assert.doesNotMatch(result.value, /allianzlife\.com|original=1/);
  assert.equal(result.value, '<a href="#" target="">Culture</a><a href="#">Careers</a>');
  assert.strictEqual(restoreSourceAliasRichText(body, true), body);
});

test('related Allianz sites do not resolve to demo homepage or remain external', () => {
  for (const href of ['https://www.allianz.com/en_GB.html', 'https://www.allianzim.com/buffered-outcome-etfs/', 'https://www.allianzimetfs.com/',
    'https://careers.allianz.com/us/en/allianz-us-life', 'https://lp.allianzlife.com/EMContactUS.html']) {
    assert.equal(safeLink(field(href, { linktype: 'external' })).value.href, '#');
    assert.equal(safeEditorialRichText({ value: `<a href="${href}">Original</a>` }, false, true).value, '<a href="#">Original</a>');
  }
});

test('source PDF anchors are contained without touching image sources or verified DAM documents', () => {
  const pdf = `${source}/-/media/Files/Global/documents/2016/05/09/17/31/S2004.pdf`;
  const image = `${source}/-/media/Images/original.jpg`;
  const body = { value: `<p><img src="${image}" alt="Original"><a href="${pdf}" download target="_blank">PDF</a></p>` };
  assert.equal(safeLink(field(pdf)).value.href, '#');
  assert.equal(safeEditorialRichText(body, false, true).value, `<p><img src="${image}" alt="Original"><a href="#" target="">PDF</a></p>`);
  assert.equal(Object.hasOwn(safeLink(field(pdf, { download: '' })).value, 'download'), false);
  const hub = 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/21d0a45c554a43cf8b28a1612f494e4b?v=95bc816d';
  const native = field(hub, { linktype: 'external' });
  assert.match(render(native), /target="_blank"/); assert.match(render(native), /21d0a45c554a43cf8b28a1612f494e4b/);
  assert.equal(safeLink(field('/allianz-assets/source.pdf')).value.href, '/allianz-assets/source.pdf');
});

test('retention callbacks and excluded native bodies cannot exempt source navigation', () => {
  const body = { value: `<a href="${sourceFaq}" target="_blank">FAQs</a><a href="https://external.example.test/original.pdf">Retained</a>`, metadata };
  const result = safeEditorialRichText(body, false, true, () => true);
  assert.match(result.value, new RegExp(`href="${faq}" target=""`));
  assert.match(result.value, /href="https:\/\/external.example.test\/original.pdf"/);
  const owner = retained.excludedBodyOwners[0];
  const context = { componentName: owner.componentName, datasourceId: owner.datasourceId, entryId: owner.entryId };
  assert.equal(safeNativeBodyRichText(body, false, context).value, result.value);
  assert.strictEqual(safeNativeBodyRichText(body, true, context), body);
});

test('untrusted destinations keep the prior rejection policy; cleared and native editor fields stay exact', () => {
  for (const href of ['https://www.allianzlife.com.evil.test/about', 'https://user:password@www.allianzlife.com/about',
    'https://www.allianzlife.com:444/about', 'https://www.allianzlife.com/%2flogin', 'javascript:alert(1)',
    'https://external.example.test/unregistered', '/api/private']) assert.equal(safeLink(field(href)).value.href, '#service-unavailable');
  const empty = field(''); assert.strictEqual(safeLink(empty), empty);
  const input = field(sourceFaq); assert.strictEqual(safeLinkRenderProps(input, true).field, input);
  assert.equal(safeLink(field('/future-native-page')).value.href, '/future-native-page');
});

test('unsafe recognized source authorities cannot escape through retained or internal-only Rich Text', () => {
  for (const href of ['https://user:password@www.allianzlife.com/about', 'https://www.allianzlife.com:444/about',
    'https://www.allianzim.com:443/etfs/',
    String.raw`https:\\www.allianzlife.com\Contact-Us`, 'https:\n//www.allianzlife.com/Contact-Us',
    'https://www.allianzlife.com/%2flogin', 'https://www.allianzlife.com./about']) {
    const body = { value: `<a href="${href}" target="_blank">Original</a>` };
    for (const retain of [undefined, () => true]) {
      const result = safeEditorialRichText(body, false, true, retain);
      assert.equal(result.value, '<a href="#service-unavailable" target="">Original</a>');
    }
  }
  const body = { value: `<a href="${sourceFaq}?query=benign space" target="_blank">FAQ</a>` };
  assert.equal(safeEditorialRichText(body, false, true, () => true).value,
    `<a href="${faq}?query=benign%20space" target="">FAQ</a>`);
  assert.equal(safeLink(field('https://allianzlife.com/Contact-Us')).value.href, '/contact-us');
});

test('URL path normalization stays inside verified local destinations and never decodes twice', () => {
  for (const href of [`${source}/%61bout`, `${source}/ignored/../about`, `${source}/ignored/%2e%2e/about`]) {
    assert.equal(safeLink(field(href)).value.href, '/about');
    assert.doesNotMatch(render(field(href)), /allianzlife\.com/);
  }
  for (const href of [`${source}/%252flogin`, `${source}/%252e%252e/about`]) assert.equal(safeLink(field(href)).value.href, '#');
  for (const href of [`${source}/%2flogin`, `${source}/%5clogin`, `${source}/double//about`]) assert.equal(safeLink(field(href)).value.href, '#service-unavailable');
});

test('witnessed post-normalization source projectors cannot restore production URLs', () => {
  const { sourceDestinationLinkField, restoreSourceDestinationLinkProps } = loadSource(path.join(sourceRoot, 'lib/allianz-source-destinations.ts'));
  const cases = [
    ['5b186c8836a64df8b9100187d1bd7101', '/for-financial-professionals/Life-Sales-Tools/flexible-estate-planning-materials', '/for-financial-professionals/life-sales-tools/flexible-estate-planning-materials'],
    ['143dd9d8760c4ac589591c534360e51c', '/for-financial-professionals/Life-Sales-Tools/key-employee-compensation-materials', '/for-financial-professionals/life-sales-tools/key-employee-compensation-materials'],
    ['5d51bc887cc84f159ed72598ee011858', '/for-financial-professionals/Life-Sales-Tools/essential-concepts', '/for-financial-professionals/life-sales-tools/essential-concepts'],
    ['b95a8d6917354b278c57e7bc71106800', '/what-we-offer/annuities/fixed-index-annuities/Benefit-Control-Plus/Rates', '/what-we-offer/annuities/fixed-index-annuities/benefit-control-plus/rates'],
    ['6976acdff6d1420da80513e46b79fe4d', '/what-we-offer/annuities/fixed-index-annuities/Accumulation-Advantage-plus/Rates', '#'],
  ];
  for (const [owner, href, expected] of cases) {
    const input = field(`${source}${href}`, { linktype: 'external' });
    const projected = sourceDestinationLinkField(input, false, owner);
    assert.equal(projected.value.href, expected);
    assert.strictEqual(projected.metadata, metadata);
    const props = restoreSourceDestinationLinkProps(safeLinkRenderProps(input), input, false, owner);
    assert.equal(props.field.value.href, expected);
    assert.equal(props.field.value.target, '');
    assert.match(render(props.field), new RegExp(`href="${expected}"`));
    assert.equal(sourceDestinationLinkField(input, true, owner), undefined);
  }
});

test('real Default descriptive card bodies apply containment and retain native editor ownership', () => {
  const { Default } = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
  const body = { value: `<p><a href="${sourceFaq}" target="_blank">FAQs</a> <a href="https://www.allianzimetfs.com/" target="_blank">ETF</a></p>`, metadata };
  const data = { id: 'test-card-grid', children: { results: [{ id: 'test-card', heading: { jsonValue: { value: 'Resources' } }, body: { jsonValue: body } }] } };
  const page = (isEditing) => ({ siteName: 'allianz-life', locale: 'en', mode: { isEditing, isNormal: !isEditing, isPreview: false }, layout: { sitecore: { context: {}, route: { fields: {}, placeholders: {} } } } });
  const html = (isEditing) => renderToStaticMarkup(React.createElement(SitecoreProvider, { page: page(isEditing), api: {}, componentMap: new Map(), loadImportMap: async () => ({}) },
    React.createElement(Default, { params: { layout: 'cards' }, fields: { data: { datasource: data } } })));
  assert.match(html(false), new RegExp(`href="${faq}" target=""`));
  assert.match(html(false), /href="#" target="">ETF/);
  assert.doesNotMatch(html(false), /https:\/\/(?:www\.)?allianz/);
  assert.match(html(true), /allianzlife\.com/);
  assert.strictEqual(data.children.results[0].body.jsonValue, body);
  assert.equal(body.value.includes(sourceFaq), true);
});

test('raw disclosure variants contain source anchors without sanitizing unrelated third-party markup', () => {
  const variants = [
    ['components/product-footnotes/ProductFootnotes.tsx', 'Default'],
    ['components/product-disclosures/ProductDisclosures.tsx', 'Default'],
    ['components/product-disclosures/ProductDisclosures.tsx', 'FaqNote'],
    ['components/product-disclosures/ProductDisclosures.tsx', 'SourceLegal'],
    ['components/product-risk-disclosures/ProductRiskDisclosures.tsx', 'Default'],
    ['components/biography-disclosures/BiographyDisclosures.tsx', 'Default'],
  ];
  for (const [filename, name] of variants) {
    const Component = loadSource(path.join(sourceRoot, filename))[name];
    const external = '<a href="https://third-party.example.test/original" target="_blank" data-original="yes">External</a>';
    const body = { value: `<p><a href="${source}/Contact-Us" target="_blank">Contact</a>${external}</p>`, metadata };
    const data = { id: 'native-owner', body: { jsonValue: body } };
    const visitor = renderComponent(Component, data, false);
    assert.match(visitor, /href="\/contact-us" target="">Contact/);
    assert.ok(visitor.includes(external), `${filename}/${name}: unrelated anchor bytes preserved`);
    assert.doesNotMatch(visitor, /allianzlife\.com/);
    const editing = renderComponent(Component, data, true);
    assert.match(editing, /allianzlife\.com/);
    assert.strictEqual(data.body.jsonValue, body);
  }
});

test('existing strict disclosure variants still reject unregistered third-party links', () => {
  const variants = [
    ['components/legal-disclosures/LegalDisclosures.tsx', 'StrategyFootnotes'],
    ['components/legal-disclosures/LegalDisclosures.tsx', 'StrategyRichText'],
    ['components/product-disclosures/ProductDisclosures.tsx', 'Editorial'],
  ];
  for (const [filename, name] of variants) {
    const Component = loadSource(path.join(sourceRoot, filename))[name];
    const body = { value: '<p><a href="https://unregistered.example.test/page" target="_blank">Original</a></p>', metadata };
    const data = { id: 'native-owner', body: { jsonValue: body } };
    const visitor = renderComponent(Component, data, false);
    assert.match(visitor, /href="#service-unavailable" target="">Original/);
    assert.doesNotMatch(visitor, /href="https:\/\/unregistered/);
    assert.match(renderComponent(Component, data, true), /href="https:\/\/unregistered/);
    assert.strictEqual(data.body.jsonValue, body);
  }
});

test('actual MVA and RILA contract text contains missing destinations while preserving editing and third parties', () => {
  const variants = loadSource(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx'));
  const cases = [
    ['FixedMvaReference', `${source}/SPA/MVARate/DisplayHistoricalRates?productGuid=synthetic-reference`],
    ['RilaContractIntroduction', `${source}/what-we-offer/annuities/registered-index-linked-annuities/define-your-downside`],
  ];
  for (const [name, href] of cases) {
    const external = '<a href="https://third-party.example.test/retained" target="_blank">Third party</a>';
    const body = { value: `<p><a href="${href}" target="_blank">Source caption</a>${external}</p>`, metadata };
    const data = { id: 'native-owner', heading: { jsonValue: { value: 'Existing heading' } }, body: { jsonValue: body } };
    const visitor = renderComponent(variants[name], data, false);
    assert.match(visitor, /href="#" target="">Source caption/);
    assert.ok(visitor.includes(external));
    assert.doesNotMatch(visitor, /allianzlife\.com|productGuid/);
    const editing = renderComponent(variants[name], data, true);
    assert.ok(editing.includes(href), `${name}: original native field remains editable`);
    assert.strictEqual(data.body.jsonValue, body);
    assert.equal(data.heading.jsonValue.value, 'Existing heading');
  }
});
