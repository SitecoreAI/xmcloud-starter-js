import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require, render as renderComponent } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Link, RichText, SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { safeEditorialRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial.ts'));
const { allianzLinkField } = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
const { safeNativeBodyRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-native-body-links.ts'));
const { allianzCardFields } = loadSource(path.join(sourceRoot, 'lib/allianz-card-fields.ts'));
const source = JSON.parse(fs.readFileSync(new URL('./approved-source-external-links.fixture.json', import.meta.url), 'utf8'));
const pdfs = source.entries.filter(({ kind }) => kind === 'public-pdf');
const how = source.entries.find(({ kind }) => kind === 'public-page').url;
const contacts = source.entries.filter(({ kind }) => kind === 'source-contact');
process.env.NODE_ENV = 'test';

function field(href, attributes = {}) {
  return { value: { href, text: 'Original source link', linktype: 'external', ...attributes },
    metadata: { itemId: 'test-only-source-link-item', fieldId: 'test-only-source-link-field', fieldType: 'General Link' } };
}
function render(input, isEditing = false, editable = true, isPreview = false) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing, isNormal: !isEditing && !isPreview, isPreview },
      layout: { sitecore: { context: {}, route: { name: 'Source links', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Link, { ...safeLinkRenderProps(input, isEditing), editable,
    'aria-label': input.value?.ariaLabel || input.value?.['aria-label'] })));
}
function assertContext(html, target, authoredRel = '') {
  assert.ok(html.includes(`target="${target}"`), html);
  const expectedRel = target === '_blank'
    ? [authoredRel, 'noopener noreferrer'].filter(Boolean).join(' ') : authoredRel;
  if (expectedRel) assert.ok(html.includes(`rel="${expectedRel}"`), html);
  else assert.doesNotMatch(html, /\brel=/);
}
function href(html) {
  return /href="([^"]*)"/.exec(html)?.[1].replaceAll('&amp;', '&');
}

// Reviewed visitor outcomes for every frozen source registration. These literals are
// independent of the production route resolver and its route-availability fixture.
const expectedSourceHrefs = {
  "insights-grid-card-01": "#",
  "insights-grid-card-02": "#",
  "insights-grid-card-03": "#",
  "insights-grid-card-04": "#",
  "insights-grid-card-05": "#",
  "insights-grid-card-06": "#",
  "insights-grid-card-07": "#",
  "product-grid-card-01": "#",
  "product-grid-card-02": "#",
  "product-grid-card-03": "#",
  "product-grid-card-04": "#",
  "product-grid-card-05": "#",
  "product-grid-card-06": "#",
  "product-grid-card-07": "#",
  "product-grid-card-08": "#",
  "product-grid-card-09": "#",
  "product-grid-card-10": "#",
  "next-step-link-2": "/what-we-offer/annuities/fixed-index-annuities/lifetime-income-plus/how-the-product-works",
  "next-step-link-3": "#",
  "section-5-card-1": "#",
  "sustainability-results-primaryLink": "#",
  "sustainability-responsible-investments": "#",
  "sustainability-climate": "#",
  "sustainability-global": "#",
  "early-retirement-study-findings-pdf": "#",
  "accumulator-product-navigation-product-title": "#",
  "accumulator-product-navigation-faq": "/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator/frequently-asked-questions",
  "accumulator-product-navigation-tools-and-resources": "/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator/tools-and-resources",
  "accumulator-product-navigation-rates": "#",
  "accumulator-tools-card-1": "/what-we-offer/life-insurance/calculator",
  "accumulator-tools-card-2": "/what-we-offer/allocation-insights-tool",
  "accumulator-tools-card-5": "/what-we-offer/life-insurance/strategies-for-business-owners",
  "accumulator-tools-card-8": "/what-we-offer/life-insurance/the-underwriting-process",
  "life-insurance-overview-benefit-external-index": "/what-we-offer/index-options",
  "about-us-teaser-01": "/about/executives",
  "about-us-teaser-02": "/about/newsroom",
  "about-us-teaser-03": "/why-allianz/culture",
  "what-we-offer-annuities-cta": "/what-we-offer/annuities",
  "annuities-product-choice-fia": "/what-we-offer/annuities/fixed-index-annuities",
  "annuities-product-choice-rila": "/what-we-offer/annuities/registered-index-linked-annuities",
  "fia-product-card-01": "/what-we-offer/annuities/fixed-index-annuities/accumulation-advantage-5",
  "fia-product-card-02": "/what-we-offer/annuities/fixed-index-annuities/accumulation-advantage-7",
  "fia-product-card-03": "/what-we-offer/annuities/fixed-index-annuities/accumulation-advantage",
  "fia-product-card-04": "/what-we-offer/annuities/fixed-index-annuities/accumulation-advantage-plus",
  "fia-product-card-05": "/what-we-offer/annuities/fixed-index-annuities/accumulation-advantage-classic",
  "fia-product-card-06": "/what-we-offer/annuities/fixed-index-annuities/222",
  "fia-product-card-07": "/what-we-offer/annuities/fixed-index-annuities/222-plus",
  "fia-product-card-08": "/what-we-offer/annuities/fixed-index-annuities/360",
  "fia-product-card-09": "/what-we-offer/annuities/fixed-index-annuities/benefit-control",
  "fia-product-card-10": "/what-we-offer/annuities/fixed-index-annuities/benefit-control-plus",
  "fia-product-card-11": "/what-we-offer/annuities/fixed-index-annuities/core-income-7",
  "fia-product-card-12": "/what-we-offer/annuities/fixed-index-annuities/essential-income-7",
  "fia-product-card-13": "/what-we-offer/annuities/fixed-index-annuities/retirement-foundation-adv",
  "fia-explore-faq": "/what-we-offer/annuities/fixed-index-annuities/frequently-asked-questions-for-fias",
  "fia-explore-contact-us": "/contact-us",
  "fia-explore-login": "#",
  "aa7-rates-source": "#",
  "aa7-product-brochure": "#",
  "aa7-product-brochure-insert": "#",
  "aa7-index-lock-brochure": "#",
  "aa5-rates-source": "#",
  "aa5-product-brochure": "#",
  "aa5-product-brochure-insert": "#",
  "rila-product-1-69da6e33-d800-4812-9830-87069a0ed144": "/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus",
  "rila-product-2-4907340b-9572-481d-b24a-61792439981d": "/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-nf",
  "rila-product-3-8fc76b2d-5f5e-4ae2-8211-0a5ed2e8fa11": "/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-select-income",
  "rila-product-4-6eac7bdc-d302-47b8-a358-0a98b1f7a168": "/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-income",
  "rila-product-5-efafbcc2-0c2b-4e84-a3d0-ebed43f07e92": "/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-income-adv",
  "iap-nav-video": "/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus/video",
  "iap-nav-prospectus": "/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus/prospectus",
  "iap-nav-and-tools-rates": "#",
  "iap-nav-and-tools-calculator": "/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus/calculator",
  "iap-tools-define-downside": "#",
  "iap-support-faq": "/what-we-offer/annuities/registered-index-linked-annuities/frequently-asked-questions",
  "aa-classic-exact-source-1": "#",
  "aa-classic-exact-source-2": "#",
  "aa-classic-exact-source-3": "#",
  "aa-classic-exact-source-4": "#",
  "essential-income-7-exact-source-1": "#",
  "essential-income-7-exact-source-2": "#",
  "retirement-foundation-adv-exact-source-1": "#",
  "retirement-foundation-adv-exact-source-2": "#",
  "core-income-7-exact-source-1": "#",
  "core-income-7-exact-source-2": "#",
  "retirement-foundation-adv-product-navigation-exact-source-1": "#",
  "222-plus-resource-rates-exact-source-1": "#",
  "360-resource-and-fixed-interest-rates-exact-source-1": "#",
  "footer-related-sites-allianz-group": "#",
  "footer-related-sites-allianzim": "#",
  "footer-related-sites-pimco": "https://www.pimco.com/us/en",
  "newsroom-company-profile-allianz-se": "#",
  "newsroom-company-profile-agcs": "#",
  "newsroom-company-profile-allianz-assistance": "#",
  "newsroom-company-profile-allianz-trade": "#",
  "advisory-allianzim-etfs": "#",
  "advisory-ria-onboarding": "https://azldigital.qualtrics.com/jfe/form/SV_8tRF7zOOWAfHp5k",
  "advisory-iar-onboarding": "https://azldigital.qualtrics.com/jfe/form/SV_3NSDoToKKIM8ugK",
  "advisory-partner-dpl-financial-partners": "https://www.dplfp.com/",
  "advisory-partner-simplicity-oid": "https://simplicityoid.com/",
  "advisory-partner-halo-investing-annuities": "https://haloinvesting.com/annuities/",
  "advisory-partner-ria-insurance-solutions": "https://www.ria-insurancesolutions.com/",
  "about-parent-company-agcs": "#",
  "about-parent-company-partners": "#",
  "about-parent-company-trade": "#",
  "professionals-alliance-for-lifetime-income": "https://www.protectedincome.org/",
  "financial-ratings-agency-am-best": "http://www.ambest.com/home/default.aspx",
  "financial-ratings-agency-moodys": "https://www.moodys.com/",
  "financial-ratings-agency-standard-and-poors": "https://www.standardandpoors.com/en_US/web/guest/home",
  "footer-public-careers": "#",
  "footer-public-facebook": "https://www.facebook.com/AllianzLife",
  "footer-public-linkedin": "https://www.linkedin.com/company/allianz-life",
  "footer-public-twitter": "https://twitter.com/allianzlife",
  "footer-public-instagram": "https://www.instagram.com/allianzlife/",
  "footer-public-youtube": "https://www.youtube.com/user/allianzus",
  "home-helpful-resources-careers": "#",
};
function sourceVariantHref(url, suffix = '') {
  const destination = sourceVisitorHref(url);
  return destination === '#' ? '#' : `${destination}${suffix}`;
}
function sourceVisitorHref(url) {
  const entry = source.entries.find(entry => entry.url === url);
  assert.ok(entry, `Source registration missing: ${url}`);
  assert.ok(Object.hasOwn(expectedSourceHrefs, entry.sourceRecordKey), `Expected visitor outcome missing: ${entry.sourceRecordKey}`);
  return expectedSourceHrefs[entry.sourceRecordKey];
}

test('all 115 source registrations have explicit visitor/preview outcomes and preserve authored SDK editing fields', () => {
  assert.equal(source.entries.length, 115);
  assert.deepEqual(Object.keys(expectedSourceHrefs), source.entries.map(entry => entry.sourceRecordKey));
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const entry of source.entries) {
      const input = field(entry.url, { target: '_blank' }), before = JSON.stringify(input);
      for (const preview of [false, true]) {
        const visitor = render(input, false, true, preview);
        assert.equal(href(visitor), expectedSourceHrefs[entry.sourceRecordKey], `${mode}/${preview}/${entry.sourceRecordKey}`);
        if (expectedSourceHrefs[entry.sourceRecordKey].startsWith('http')) {
          assert.match(visitor, /target="_blank" rel="noopener noreferrer"/);
        } else {
          assert.match(visitor, /target=""/);
          assert.doesNotMatch(visitor, /noopener|noreferrer/);
        }
      }
      const editing = render(input, true);
      assert.equal(href(editing), entry.url);
      assert.match(editing, /test-only-source-link-field/);
      assert.strictEqual(safeLinkRenderProps(input, true).field, input);
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
    }
  }
});

// These exact identities are already present in approved HEAD f2f97d59.
// b898b4e9 added only the Classic PDF to the preceding 25; the count test was stale.
const approvedPdfIdentities = [
  ['insights-grid-card-01', 'https://www.allianzlife.com/-/media/Files/Global/documents/2025/11/21/14/54/LIA-381.pdf'],
  ['insights-grid-card-02', 'https://www.allianzlife.com/-/media/Files/Global/documents/2026/03/19/17/49/LIA-470.pdf'],
  ['insights-grid-card-03', 'https://www.allianzlife.com/-/media/Files/Global/documents/2024/05/29/13/56/LIA-203.pdf'],
  ['insights-grid-card-04', 'https://www.allianzlife.com/-/media/Files/Allianz/Documents/LIA-166.pdf'],
  ['insights-grid-card-05', 'https://www.allianzlife.com/-/media/Files/Global/documents/2024/01/25/19/00/LIA-161.pdf'],
  ['insights-grid-card-06', 'https://www.allianzlife.com/-/media/Files/Global/documents/2021/10/27/15/05/LIA-008.pdf'],
  ['insights-grid-card-07', 'https://www.allianzlife.com/-/media/Files/Global/documents/2021/10/27/15/05/LIA-018.pdf'],
  ['product-grid-card-01', 'https://www.allianzlife.com/-/media/Files/Global/documents/2021/07/14/18/52/LIA-001.pdf'],
  ['product-grid-card-02', 'https://www.allianzlife.com/-/media/Files/Global/documents/2022/08/24/13/06/LIA-047.pdf'],
  ['product-grid-card-03', 'https://www.allianzlife.com/-/media/Files/Global/documents/2024/12/20/09/40/LIA-296.pdf'],
  ['product-grid-card-04', 'https://www.allianzlife.com/-/media/Files/Global/documents/2022/05/20/02/10/LIA-027.pdf'],
  ['product-grid-card-05', 'https://www.allianzlife.com/-/media/Files/Global/documents/2024/12/20/19/33/LIA-292.pdf'],
  ['product-grid-card-06', 'https://www.allianzlife.com/-/media/Files/Global/documents/2022/03/16/14/18/LIA-002-R04.pdf'],
  ['product-grid-card-07', 'https://www.allianzlife.com/-/media/Files/Global/documents/2022/03/24/13/15/LIA-003.pdf'],
  ['product-grid-card-08', 'https://www.allianzlife.com/-/media/Files/Global/documents/2022/08/17/12/48/LIA-035.pdf'],
  ['product-grid-card-09', 'https://www.allianzlife.com/-/media/Files/Global/documents/2022/12/16/14/36/LIA-046.pdf'],
  ['product-grid-card-10', 'https://www.allianzlife.com/-/media/Files/Global/documents/2022/12/16/14/37/LIA-034.pdf'],
  ['sustainability-results-primaryLink', 'https://www.allianzlife.com/-/media/Files/Allianz/PDFs/community-impact-report-overview.pdf'],
  ['sustainability-responsible-investments', 'https://www.allianzlife.com/-/media/Files/Allianz/PDFs/EXT-1120.pdf'],
  ['early-retirement-study-findings-pdf', 'https://www.allianzlife.com/-/media/Files/Global/documents/2023/06/02/17/42/EXT-0080.pdf'],
  ['aa7-product-brochure', 'https://www.allianzlife.com/-/media/Files/Global/documents/2023/11/10/18/35/AAA7-001.pdf'],
  ['aa7-product-brochure-insert', 'https://www.allianzlife.com/-/media/Files/Global/documents/2023/11/10/18/35/AAA7-001-B.pdf'],
  ['aa7-index-lock-brochure', 'https://www.allianzlife.com/-/media/Files/Global/documents/2019/05/15/12/35/CSI-504.pdf'],
  ['aa5-product-brochure', 'https://www.allianzlife.com/-/media/Files/Global/documents/2026/03/30/15/16/AAA5-001.pdf'],
  ['aa5-product-brochure-insert', 'https://www.allianzlife.com/-/media/Files/Global/documents/2026/03/30/15/16/AAA5-001-B.pdf'],
  ['aa-classic-exact-source-2', 'https://www.allianzlife.com/-/media/Files/Global/documents/2026/03/27/12/04/AAAC-001.pdf'],
];

test('all 26 source PDF identities render inert visitor anchors and retain installed SDK editing behavior', () => {
  assert.equal(pdfs.length, 26);
  assert.deepEqual(pdfs.map(({ sourceRecordKey, url }) => [sourceRecordKey, url]), approvedPdfIdentities);
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const entry of pdfs) {
      const input = field(entry.url, { target: '_blank', rel: 'author', 'aria-label': '' });
      const before = JSON.stringify(input);
      for (const isEditing of [false, true]) {
        const html = render(input, isEditing);
        assert.equal(href(html), isEditing ? entry.url : sourceVisitorHref(entry.url), entry.sourceRecordKey);
        assertContext(html, isEditing ? '_blank' : '', 'author');
        if (isEditing) assert.match(html, /test-only-source-link-field/);
      }
      assert.equal(href(render(input, false, false)), sourceVisitorHref(entry.url));
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('How it Works uses its verified local visitor route and retains its source destination in editing', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const input = field(how, { text: 'How it Works', target: '', 'aria-label': 'How it Works' });
    for (const isEditing of [false, true]) {
      const html = render(input, isEditing);
      assert.equal(href(html), isEditing ? how : sourceVisitorHref(how));
      assert.match(html, /target=""/);
      assert.doesNotMatch(html, /rel=/);
    }
  }
});

test('the two captured contact URLs become inert for visitors and retain ordered queries in editing', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
  assert.equal(contacts.length, 2);
  for (const { url } of contacts) {
    const parsed = new URL(url);
    // Editing passes the original field directly to the installed SDK, including
    // its verbatim rendering when both href and querystring carry the query.
    for (const [input, editingHref] of [
      [field(url, { target: '_blank' }), url],
      [field(`${parsed.origin}${parsed.pathname}`, { querystring: parsed.search.slice(1), target: '_blank' }), url],
      [field(url, { querystring: parsed.search.slice(1), target: '_blank' }), `${url}${parsed.search}`],
    ]) {
      for (const isEditing of [false, true]) {
        const html = render(input, isEditing);
        assert.equal(href(html), isEditing ? editingHref : sourceVisitorHref(url));
        assertContext(html, isEditing ? '_blank' : '');
        if (isEditing) assert.match(html, /test-only-source-link-field/);
      }
    }
  }
});

test('lookalikes, credential URLs and unapproved source service variants still render unavailable', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
  const pdf = pdfs[0].url;
  const contact = contacts[0].url;
  for (const [destination, expected] of [
    [pdf.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'), '#service-unavailable'],
    [pdf.replace('https://', 'https://user:password@'), '#service-unavailable'],
    [pdf.replace('www.allianzlife.com', 'www.allianzlife.com:444'), '#service-unavailable'],
    [pdf.replace('https://', 'http://'), '#'],
    [pdf.replace('/-/media/', '/%2f-/media/'), '#service-unavailable'],
    [pdf.replace('.pdf', '-uncaptured.pdf'), '#'],
    [contact.replace('lp.allianzlife.com', 'lp.allianzlife.com.evil.invalid'), '#service-unavailable'],
    [contact.replace('https://', 'https://user:password@'), '#service-unavailable'],
    [contact.replace('lp.allianzlife.com', 'lp.allianzlife.com:444'), '#service-unavailable'],
    [contact.replace('utm_content=em_resources', 'utm_content=unknown'), '#'],
    [`${contact}&redirect=https%3A%2F%2Fevil.invalid`, '#'],
    ['https://lp.allianzlife.com/EMContactUS.html', '#'],
    ['javascript:alert(1)', '#service-unavailable'],
  ]) {
    const input = field(destination, { target: '_blank' });
    assert.equal(href(render(input)), expected, destination);
    assert.equal(safeLink(input).value.target, '');
    assert.doesNotMatch(render(input), /rel="noopener noreferrer"/);
  }
});

test('native source identities follow verified local destinations or inert anchors without losing native metadata', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const linktype of ['internal', 'media']) {
    const input = field(how, { linktype, id: '{TEST-ONLY-NATIVE-ITEM}' });
    assert.equal(href(render(input)), sourceVisitorHref(how));
    assert.equal(safeLink(input).value.id, '{TEST-ONLY-NATIVE-ITEM}');
    assert.equal(safeLink(input).value.linktype, linktype);
  }
  const implicitInternal = field(how, { linktype: undefined, id: '{TEST-ONLY-NATIVE-ITEM}' });
  assert.equal(href(render(implicitInternal)), sourceVisitorHref(how));
  const capturedShape = field(how, { linktype: undefined });
  assert.equal(href(render(capturedShape)), sourceVisitorHref(how));
  const about = field('https://www.allianzlife.com/about?view=public#overview', { linktype: 'internal' });
  assert.equal(href(render(about)), '/about?view=public#overview');
  for (const destination of ['/login', '/api/private', 'https://external.example.invalid/']) {
    assert.equal(href(render(field(destination))), destination === '/login' ? '#' : '#service-unavailable');
  }
});


test('Sustainability source destinations become inert for visitors and retain original editing fields', () => {
  const destinations = [
    ['https://www.allianzlife.com/-/media/Files/Allianz/PDFs/community-impact-report-overview.pdf', '_blank'],
    ['https://www.allianzlife.com/-/media/Files/Allianz/PDFs/EXT-1120.pdf', '_blank'],
    ['https://www.allianz.com/en/sustainability/sustainability-hub/sustainability-at-allianz/climate-change.html', ''],
    ['https://www.allianz.com/en/sustainability.html', '_blank'],
  ];
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [url, target] of destinations) {
      assert.ok(source.entries.some((entry) => entry.url === url));
      const input = field(url, { target });
      const before = JSON.stringify(input);
      for (const isEditing of [false, true]) {
        const html = render(input, isEditing);
        assert.equal(href(html), isEditing ? url : sourceVisitorHref(url));
        assertContext(html, isEditing ? target : '');
        if (isEditing) assert.match(html, /test-only-source-link-field/);
      }
      assert.equal(JSON.stringify(input), before);
    }
  }
  for (const invalid of [
    'https://www.allianz.com/en/sustainability.html?redirect=unknown',
    'https://www.allianz.com/en/sustainability/sustainability-hub/sustainability-at-allianz/climate-change.html#unknown',
    'https://www.allianz.com.evil.invalid/en/sustainability.html',
  ]) assert.equal(href(render(field(invalid))), invalid.includes('evil.invalid') ? '#service-unavailable' : '#');
});


test('early-retirement study uses an inert visitor PDF anchor and retains original native editing chrome', () => {
  const url = 'https://www.allianzlife.com/-/media/Files/Global/documents/2023/06/02/17/42/EXT-0080.pdf';
  const entry = source.entries.find(row => row.sourceRecordKey === 'early-retirement-study-findings-pdf');
  assert.equal(entry.url, url);
  assert.ok(source.sourcePins.some(pin => pin.sourceRoute === '/get-answers/how-to-address-financial-risks-of-early-retirement' && pin.httpStatus === 200 && pin.sourceHtmlSha256 === '65bd0c1f502d2aeae70a92cd4d76cc00e83d8679e9ffa5b485851e21bcc5b0de'));
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const input = field(url, { text: 'Get our study findings (PDF)', target: '_blank', 'aria-label': 'Get our study findings (PDF)' });
    const before = JSON.stringify(input);
    for (const editing of [false, true]) {
      const html = render(input, editing);
      assert.equal(href(html), editing ? url : sourceVisitorHref(url));
      assertContext(html, editing ? '_blank' : '');
      if (!editing) assert.match(html, /aria-label="Get our study findings \(PDF\)"/);
      if (editing) assert.match(html, /test-only-source-link-field/);
    }
    assert.strictEqual(safeLink(input).metadata, input.metadata);
    assert.equal(JSON.stringify(input), before);
  }
});

// Exact source card links are explicit external fields, even on the official host.
// Render the actual finite variants through both safeLink passes and installed SDK.
const toolsCards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const toolsDestinations = [
  ['LifeToolsNeeds', 'Life insurance needs calculator', 'https://www.allianzlife.com/what-we-offer/Life-Insurance/Calculator', 'accumulator-tools-card-1'],
  ['LifeToolsNeeds', 'Allocation insights tool', 'https://www.allianzlife.com/what-we-offer/allocation-insights-tool', 'accumulator-tools-card-2'],
  ['LifeToolsStrategy', 'Owning a business', 'https://www.allianzlife.com/what-we-offer/Life-Insurance/strategies-for-business-owners', 'accumulator-tools-card-5'],
  ['LifeToolsMore', 'What is underwriting', 'https://www.allianzlife.com/what-we-offer/Life-Insurance/The-underwriting-process', 'accumulator-tools-card-8'],
];
function toolsData(input, label) {
  return { id: 'test-only-tools-introduction', heading: { jsonValue: { value: 'Tools introduction' } },
    body: { jsonValue: { value: '' } }, children: { results: [{ id: 'test-only-tools-card',
      heading: { jsonValue: { value: label } }, body: { jsonValue: { value: '<p>Full card body.</p>' } },
      link: { jsonValue: input }, subheading: { jsonValue: { value: 'Video' } },
    }] } };
}
function renderTools(Component, datasource, isEditing, isPreview = false, params = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', mode: { isEditing, isNormal: !isEditing && !isPreview, isPreview },
      layout: { sitecore: { context: {}, route: { name: 'Tools links', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: { data: { datasource } } })));
}
// React may prepend image preload links; inspect the rendered card anchor itself.
const toolsHref = html => /<a\b[^>]*href="([^"]*)"/.exec(html)?.[1].replaceAll('&amp;', '&');
test('Tools source destinations use verified local routes or inert anchors and retain exact editing fields', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [variant, label, url, key] of toolsDestinations) {
      const input = field(url, { text: label, url, target: '' });
      const data = toolsData(input, label), before = JSON.stringify(data);
      for (const editing of [false, true]) {
        const html = renderTools(toolsCards[variant], data, editing);
        assert.equal(toolsHref(html), editing ? url : sourceVisitorHref(url), `${mode}/${variant}/${key}`);
        const anchor = /<a\b[^>]*>/.exec(html)?.[0] ?? '';
        assert.match(anchor, /target=""/);
        assert.doesNotMatch(anchor, /rel=/);
        if (editing) assert.match(html, /test-only-source-link-field/);
      }
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.equal(JSON.stringify(data), before);
    }
  }
});
test('Tools approval is limited to four exact captured URLs with the frozen source-facts pin', () => {
  const added = source.entries.filter(entry => entry.sourceRecordKey.startsWith('accumulator-tools-card-'));
  assert.deepEqual(added.map(entry => [entry.url, entry.sourceRecordKey]), toolsDestinations.map(([, , url, key]) => [url, key]));
  assert.ok(added.every(entry => entry.kind === 'public-page'));
  assert.ok(source.sourcePins.some(pin => pin.path === 'preparation/accumulator-tools-final-qa-v1/source/SOURCE-CONTENT-LAYOUT.json'
    && pin.sha256 === 'c7f01de66ec0ef148ef3cace21b001948effe4549447106a9366c3dde9541133'));
});
test('Tools source variants use exact local or inert outcomes while malformed origins remain rejected', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const [variant, label, url] of toolsDestinations) {
    for (const [modified, expected] of [
      [url.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'), '#service-unavailable'],
      [`${url}?redirect=unapproved`, sourceVariantHref(url, '?redirect=unapproved')],
      [`${url}#unapproved`, sourceVariantHref(url, '#unapproved')], [`${url}-uncaptured`, '#'],
    ]) {
      const input = field(modified, { text: label, url: modified, target: '' });
      const data = toolsData(input, label), before = JSON.stringify(data);
      assert.notEqual(toolsHref(renderTools(toolsCards[variant], data, false)), modified);
      assert.equal(toolsHref(renderTools(toolsCards[variant], data, false)), expected);
      assert.match(renderTools(toolsCards[variant], data, true), /test-only-source-link-field/);
      assert.equal(JSON.stringify(data), before);
    }
  }
});
test('Tools native source identities follow verified local destinations or inert anchors', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const [variant, label, url] of toolsDestinations) {
    const input = field(url, { text: label, linktype: 'internal', id: '{TEST-ONLY-NATIVE-TOOLS-ITEM}', target: '' });
    const data = toolsData(input, label), before = JSON.stringify(data);
    assert.equal(toolsHref(renderTools(toolsCards[variant], data, false)), sourceVisitorHref(url));
    assert.match(renderTools(toolsCards[variant], data, true), /test-only-source-link-field/);
    assert.equal(JSON.stringify(data), before);
  }
});

const overviewIndexUrl = 'https://www.allianzlife.com/what-we-offer/Index-options';
function overviewBenefitData(destination) {
  const nativeBody = { value: `<p>Interest follows an <a href="${destination}" title="Source index" class="source-index">external index</a> while the original benefit copy and <sup>1</sup> remain.</p>`,
    metadata: { itemId: 'test-only-life-benefit-item', fieldId: 'test-only-life-benefit-body', fieldType: 'Rich Text' } };
  const cards = ['Protection', 'Tax deferral', 'Opportunity to earn interest', 'Flexibility'].map((heading, index) => ({
    id: `test-only-life-benefit-${index}`, heading: { jsonValue: { value: heading } },
    body: { jsonValue: index === 2 ? nativeBody : { value: '<p>Other native benefit copy.</p>' } },
  }));
  return { data: { id: 'test-only-life-benefits-grid', children: { results: cards } }, nativeBody };
}

test('Life benefits use the canonical local Index Options body link and retain the original editing field', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const { data, nativeBody } = overviewBenefitData(overviewIndexUrl), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = renderTools(toolsCards.LifeBenefitsGrid, data, editing);
      assert.equal(toolsHref(html), editing ? overviewIndexUrl : '/what-we-offer/index-options', `${mode}/LifeBenefitsGrid/${editing}`);
      assert.match(html, /title="Source index" class="source-index"/);
      assert.match(html, />external index<\/a>/);
      assert.match(html, /<sup>1<\/sup>/);
      assert.doesNotMatch(/<a\b[^>]*>/.exec(html)?.[0] ?? '', /target=|rel=/);
      if (editing) assert.match(html, /test-only-life-benefit-body/);
      assert.strictEqual(safeEditorialRichText(nativeBody, true), nativeBody);
      assert.strictEqual(safeEditorialRichText(nativeBody, editing).metadata, nativeBody.metadata);
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('Life overview approval adds only the exact source body URL with final source and materialized v2 evidence pins', () => {
  const entries = source.entries.filter(entry => entry.sourceRecordKey.startsWith('life-insurance-overview-'));
  assert.deepEqual(entries, [{ kind: 'public-page', url: overviewIndexUrl, sourceRecordKey: 'life-insurance-overview-benefit-external-index' }]);
  assert.ok(source.sourcePins.some(pin => pin.path === 'preparation/life-insurance-ancestor-final-qa-v1/source/SOURCE-CONTENT-LAYOUT.json'
    && pin.sha256 === 'f6fc9265d3569e6c418f67b2ad54f5377fdd32949455b6e336d46e3620ae3eb2'
    && pin.jsonPointer === '/benefitTiles/cards/2/links/0/absoluteHref'));
  assert.ok(source.sourcePins.some(pin => pin.path === 'preparation/life-insurance-ancestor-final-qa-v1/native-final/life-insurance-native-checkpoint-links-20261011.json'
    && pin.sha256 === 'c15536e72b260c651f6fad15a8668398daaa5d50ec6c17623d263e14db8de290'));
});

test('Index Options source variants retain canonical local suffixes and reject unsafe authorities', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const [destination, expected] of [
    [overviewIndexUrl.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'), '#service-unavailable'],
    [overviewIndexUrl.replace('https://', 'https://user:password@'), '#service-unavailable'],
    [overviewIndexUrl.replace('www.allianzlife.com', 'www.allianzlife.com:444'), '#service-unavailable'],
    [overviewIndexUrl.replace('https://', 'http://'), '/what-we-offer/index-options'],
    [`${overviewIndexUrl}?redirect=unapproved`, '/what-we-offer/index-options?redirect=unapproved'],
    [`${overviewIndexUrl}#unapproved`, '/what-we-offer/index-options#unapproved'],
    [`${overviewIndexUrl}-uncaptured`, '#'],
  ]) {
    const { data, nativeBody } = overviewBenefitData(destination), before = JSON.stringify(data);
    const rendered = renderTools(toolsCards.LifeBenefitsGrid, data, false);
    assert.notEqual(toolsHref(rendered), destination);
    assert.equal(toolsHref(rendered), expected);
    assert.strictEqual(safeEditorialRichText(nativeBody, true), nativeBody);
    assert.match(renderTools(toolsCards.LifeBenefitsGrid, data, true), /test-only-life-benefit-body/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('Index Options approval preserves local navigation for explicitly authored native identities', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const linktype of ['internal', 'media']) {
    const input = field(overviewIndexUrl, { linktype, id: '{TEST-ONLY-NATIVE-INDEX-ITEM}' }), before = JSON.stringify(input);
    assert.equal(href(render(input)), '/what-we-offer/index-options');
    assert.equal(safeLink(input).value.id, input.value.id);
    assert.strictEqual(safeLink(input).metadata, input.metadata);
    assert.equal(JSON.stringify(input), before);
  }
});

const aboutTeaserDestinations = [
  'https://www.allianzlife.com/about/executives',
  'https://www.allianzlife.com/about/newsroom',
  'https://www.allianzlife.com/why-allianz/culture',
];

test('About Us routes all three verified local teasers while retaining original editing fields', () => {
  const entries = source.entries.filter(({ kind }) => kind === 'about-teaser-page');
  assert.deepEqual(entries.map(({ url }) => url), aboutTeaserDestinations);
  assert.ok(source.sourcePins.some(pin => pin.path === 'preparation/about-us-ancestor-final-qa-v1/source/SOURCE-CONTENT-LAYOUT.json'
    && pin.sha256 === '2b6ae774cb44d98542546bc93a37855b9fa6d6c7c200e453470e713cb48c54be'));
  assert.ok(source.sourcePins.some(pin => pin.path === 'preparation/about-us-ancestor-final-qa-v1/native-initial/about-us-native-checkpoint-20261011.json'
    && pin.sha256 === '381dd4a0762f191e1353e748db3323c9c3fd0d228147e37f30fb0d4a4b5460d3'));
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const url of aboutTeaserDestinations) {
      const input = field(url, { target: '', 'aria-label': '', text: 'Native About teaser' });
      const before = JSON.stringify(input);
      for (const isEditing of [false, true]) {
        const html = render(input, isEditing);
        assert.equal(href(html), isEditing ? url : sourceVisitorHref(url));
        assert.match(html, /target=""/);
        assert.doesNotMatch(html, /rel="noopener noreferrer"/);
        if (isEditing) assert.match(html, /test-only-source-link-field/);
      }
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('About Us source variants preserve canonical local suffixes or stay inert and reject unsafe authorities', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const url of aboutTeaserDestinations) {
    for (const invalid of [
      url.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'),
      url.replace('https://', 'https://user:password@'),
      url.replace('www.allianzlife.com', 'www.allianzlife.com:444'),
    ]) assert.equal(href(render(field(invalid))), '#service-unavailable');
    for (const [uncaptured, expected] of [
      [`${url}?redirect=unknown`, sourceVariantHref(url, '?redirect=unknown')],
      [`${url}#uncaptured`, sourceVariantHref(url, '#uncaptured')],
      [`${url}/extra`, '#'], [url.replace('https://', 'http://'), sourceVisitorHref(url)],
    ]) {
      assert.notEqual(href(render(field(uncaptured))), uncaptured);
      assert.equal(href(render(field(uncaptured))), expected);
      assert.ok(!href(render(field(uncaptured))).startsWith('https://www.allianzlife.com'));
    }
  }
});

test('About Us source policy preserves native internal identity and verified local routing', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const url of aboutTeaserDestinations) {
    for (const linktype of ['internal', 'media']) {
      const input = field(url, { linktype, id: '{TEST-ONLY-ABOUT-NATIVE-ITEM}', target: '' });
      const before = JSON.stringify(input);
      assert.equal(href(render(input)), sourceVisitorHref(url));
      assert.equal(safeLink(input).value.id, '{TEST-ONLY-ABOUT-NATIVE-ITEM}');
      assert.equal(safeLink(input).value.linktype, linktype);
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
    }
  }
});


const offerAnnuitiesSourceUrl = 'https://www.allianzlife.com/what-we-offer/annuities';

test('What We Offer Annuities CTA uses its verified local route and preserves original native editing chrome', () => {
  assert.deepEqual(source.entries.filter(entry => entry.kind === 'what-we-offer-page'), [{
    kind: 'what-we-offer-page', url: offerAnnuitiesSourceUrl, sourceRecordKey: 'what-we-offer-annuities-cta',
  }]);
  assert.ok(source.sourcePins.some(pin => pin.sha256 === '5a666c76ba2b9bde98ce8148c01852d5142d1899a4faa287525fec9376e508c0'
    && pin.jsonPointer === '/source/links/0/href'));
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const original = field(offerAnnuitiesSourceUrl, { text: 'Learn more about which annuity might be right for you', target: '' });
    const before = JSON.stringify(original);
    for (const isEditing of [false, true]) {
      const html = render(original, isEditing);
      assert.equal(href(html), isEditing ? offerAnnuitiesSourceUrl : '/what-we-offer/annuities');
      assert.match(html, /Learn more about which annuity might be right for you/);
      if (isEditing) assert.match(html, /test-only-source-link-field/);
    }
    assert.strictEqual(safeLink(original).metadata, original.metadata);
    assert.equal(JSON.stringify(original), before);
    const acceptedLife = field('/what-we-offer/life-insurance', {
      linktype: 'internal', id: '{F2C4D8F4-80A9-54CB-95C2-27F1EEF2CB18}', text: 'See the unique benefits of IUL',
    });
    assert.equal(href(render(acceptedLife)), '/what-we-offer/life-insurance');
  }
});

test('What We Offer source variants retain canonical local suffixes and reject unverified routes or origins', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [candidate, expected] of [
      [offerAnnuitiesSourceUrl + '?extra=1', '/what-we-offer/annuities?extra=1'],
      [offerAnnuitiesSourceUrl + '#extra', '/what-we-offer/annuities#extra'],
      [offerAnnuitiesSourceUrl + '/other', '#'],
      ['http://www.allianzlife.com/what-we-offer/annuities', '/what-we-offer/annuities'],
      ['https://www.allianzlife.com.example.test/what-we-offer/annuities', '#service-unavailable'],
    ]) {
      assert.notEqual(href(render(field(candidate))), candidate);
      assert.equal(href(render(field(candidate))), expected);
    }
  }
});


// The two source product pages now have substantive native local destinations.
// Exercise the real purpose component, including its installed SDK Link renderer.
const annuitiesProductChoices = loadSource(path.join(sourceRoot, 'components/product-type-choices/ProductTypeChoices.tsx'));
const annuitiesProductDestinations = [
  ['https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities', 'Learn about Allianz® fixed index annuities', 'annuities-product-choice-fia'],
  ['https://www.allianzlife.com/what-we-offer/annuities/registered-index-linked-annuities', 'Learn about Allianz® registered index-linked annuities', 'annuities-product-choice-rila'],
];
function annuitiesChoiceData(inputs) {
  return { id: 'test-only-annuities-product-choices', children: { total: inputs.length,
    pageInfo: { hasNext: false, endCursor: null }, results: inputs.map((link, index) => ({
      id: `test-only-annuities-choice-${index}`, link: { jsonValue: link },
    })) } };
}
function annuitiesChoiceAnchors(html) {
  return [...html.matchAll(/<a\b[^>]*class="a-link"[^>]*>/g)].map(([anchor]) => anchor);
}

test('Annuities choices use local same-tab pages in visitor/preview and retain native editing fields', () => {
  assert.deepEqual(source.entries.filter(entry => entry.sourceRecordKey.startsWith('annuities-product-choice-')),
    annuitiesProductDestinations.map(([url, , sourceRecordKey]) => ({ kind: 'public-page', url, sourceRecordKey })));
  assert.ok(source.sourcePins.some(pin => pin.path === 'preparation/annuities-final-qa-v1/source/SOURCE-FACTS.json'
    && pin.sha256 === '6068f3532acd0aaaf1355143487356bb45d23d371c1c8c17774522d43952b468'
    && JSON.stringify(pin.jsonPointers) === JSON.stringify(['/sections/5/tiles/0/links/0/resolvedUrl', '/sections/5/tiles/1/links/0/resolvedUrl'])));
  assert.ok(source.sourcePins.some(pin => pin.url === 'https://www.allianzlife.com/what-we-offer/annuities'
    && pin.sourceHtmlSha256 === '8a59679052f16a35b6eee6e21f59ed94d58429754a27afca5c4940133339453c'));
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const inputs = annuitiesProductDestinations.map(([url, text], index) => {
      const original = field(url, { url, text, title: '', target: '', querystring: '', anchor: '' });
      original.metadata = { ...original.metadata, itemId: `test-only-annuities-choice-${index}`,
        fieldId: `test-only-annuities-choice-${index}-link` };
      return original;
    });
    const data = annuitiesChoiceData(inputs), before = JSON.stringify(data);
    for (const [editing, preview] of [[false, false], [false, true], [true, false]]) {
      const html = renderTools(annuitiesProductChoices.Default, data, editing, preview);
      const anchors = annuitiesChoiceAnchors(html);
      assert.equal(anchors.length, 2);
      inputs.forEach((original, index) => {
        assert.equal(href(anchors[index]), editing ? original.value.href : new URL(original.value.href).pathname,
          `${mode}/${editing}/${preview}/${index}`);
        assert.ok(anchors[index].includes(`aria-label="${original.value.text}"`));
        assert.match(anchors[index], /target=""/);
        assert.doesNotMatch(anchors[index], /\brel=/);
        if (editing) assert.ok(html.includes(original.metadata.fieldId));
        assert.strictEqual(safeLink(original).metadata, original.metadata);
        assert.strictEqual(allianzLinkField(original, true), original);
        assert.strictEqual(data.children.results[index].link.jsonValue, original);
      });
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('Annuities product variants preserve canonical local suffixes and reject unsafe authorities', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [url, text] of annuitiesProductDestinations) {
      for (const [candidate, expected] of [
        [`${url}?redirect=unapproved`, sourceVariantHref(url, '?redirect=unapproved')],
        [`${url}#uncaptured`, sourceVariantHref(url, '#uncaptured')], [`${url}/extra`, '#'],
        [url.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'), '#service-unavailable'],
        [url.replace('https://', 'https://user:password@'), '#service-unavailable'],
        [url.replace('www.allianzlife.com', 'www.allianzlife.com:444'), '#service-unavailable'],
        [url.replace('https://', 'http://'), sourceVisitorHref(url)],
      ]) {
        const original = field(candidate, { url: candidate, text, target: '' });
        const data = annuitiesChoiceData([original]), before = JSON.stringify(data);
        const anchor = annuitiesChoiceAnchors(renderTools(annuitiesProductChoices.Default, data, false))[0];
        assert.notEqual(href(anchor), candidate);
        assert.equal(href(anchor), expected);
        assert.match(renderTools(annuitiesProductChoices.Default, data, true), /test-only-source-link-field/);
        assert.equal(JSON.stringify(data), before);
      }
    }
  }
});

test('Annuities product URL approvals preserve local routing and original identity for native internal and media links', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const [url, text] of annuitiesProductDestinations) {
    for (const linktype of ['internal', 'media']) {
      const original = field(url, { text, linktype, id: '{TEST-ONLY-NATIVE-ANNUITY-ITEM}', target: '' });
      const data = annuitiesChoiceData([original]), before = JSON.stringify(data);
      const anchor = annuitiesChoiceAnchors(renderTools(annuitiesProductChoices.Default, data, false))[0];
      assert.equal(href(anchor), new URL(url).pathname);
      assert.equal(safeLink(original).value.id, original.value.id);
      assert.equal(safeLink(original).value.linktype, linktype);
      assert.strictEqual(safeLink(original).metadata, original.metadata);
      assert.match(renderTools(annuitiesProductChoices.Default, data, true), /test-only-source-link-field/);
      assert.equal(JSON.stringify(data), before);
    }
  }
});


// FIA source identities: product cards plus the original FAQ/Contact resource fields.
const fiaCardSourceDestinations = [
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/accumulation-advantage-5",
    "Allianz Accumulation Advantage 5\u2122 Annuity",
    "",
    "fia-product-card-01"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/Accumulation-Advantage-7",
    "Allianz Accumulation Advantage 7\u00ae Annuity",
    "",
    "fia-product-card-02"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/Accumulation-Advantage",
    "Allianz Accumulation Advantage\u00ae Annuity",
    "",
    "fia-product-card-03"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/Accumulation-Advantage-plus",
    "Allianz Accumulation Advantage+\u00ae Annuity",
    "",
    "fia-product-card-04"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/Accumulation-Advantage-Classic",
    "Allianz Accumulation Advantage Classic\u2122 Annuity",
    "_blank",
    "fia-product-card-05"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/222",
    "Allianz 222\u00ae Annuity",
    "",
    "fia-product-card-06"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/222-plus",
    "Allianz 222+\u00ae Annuity",
    "",
    "fia-product-card-07"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/360",
    "Allianz 360\u2122 Annuity",
    "",
    "fia-product-card-08"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/Benefit-Control",
    "Allianz Benefit Control\u00ae Annuity",
    "",
    "fia-product-card-09"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/Benefit-Control-Plus",
    "Allianz Benefit Control+\u00ae Annuity",
    "",
    "fia-product-card-10"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/Core-Income-7",
    "Allianz Core Income 7\u00ae Annuity",
    "",
    "fia-product-card-11"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/Essential-Income-7",
    "Allianz Essential Income 7\u00ae Annuity",
    "",
    "fia-product-card-12"
  ],
  [
    "https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/Retirement-Foundation-ADV",
    "Allianz Retirement Foundation ADV\u00ae Annuity",
    "",
    "fia-product-card-13"
  ]
];

const fiaSourceApprovals = source.entries.filter((entry) => entry.sourceRecordKey.startsWith('fia-')
  && entry.sourceRecordKey !== 'fia-explore-login');
const fiaHelpfulResources = loadSource(path.join(sourceRoot, 'components/helpful-resources/HelpfulResources.tsx'));
function fiaCardData(inputs) {
  return { id: 'test-only-fia-product-cards', children: { total: inputs.length,
    pageInfo: { hasNext: false, endCursor: null }, results: inputs.map((link, index) => ({
      id: `test-only-fia-card-${index}`, heading: { jsonValue: { value: link.value.text } },
      link: { jsonValue: link },
    })) } };
}
function fiaAnchors(markup) {
  return [...markup.matchAll(/<a\b[^>]*class="m-card"[^>]*>/g)].map(([anchor]) => anchor);
}

test('FIA product cards and FAQ/Contact resources use verified local routes or inert anchors through installed SDK', () => {
  assert.equal(fiaSourceApprovals.length, 15);
  assert.deepEqual(source.entries.filter((entry) => entry.sourceRecordKey.startsWith('fia-product-card-')),
    fiaCardSourceDestinations.map(([url, , , sourceRecordKey]) => ({ kind: 'public-page', url, sourceRecordKey })));
  assert.ok(source.sourcePins.some((pin) => pin.path === 'preparation/fixed-index-annuities-final-qa-v1/source/SOURCE-FACTS.json'
    && pin.sha256 === '8604f9955a865180440207ff745918a961275afe9d749cf73d9043a3e993aaa5'
    && pin.jsonPointers.length === 15));
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const inputs = fiaCardSourceDestinations.map(([url, text, target]) => field(url, { text, target, url }));
    const data = fiaCardData(inputs), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const markup = renderTools(toolsCards.ProductCards, data, editing);
      const anchors = fiaAnchors(markup);
      assert.equal(anchors.length, 13);
      anchors.forEach((anchor, index) => {
        assert.equal(href(anchor), editing ? inputs[index].value.href : sourceVisitorHref(inputs[index].value.href));
        assertContext(anchor, editing ? inputs[index].value.target : '');
      });
      if (editing) assert.match(markup, /test-only-source-link-field/);
    }
    assert.equal(JSON.stringify(data), before);
    const resources = [
      ['https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities/Frequently-Asked-Questions-for-FIAs', 'Frequently asked questions for FIAs'],
      ['https://www.allianzlife.com/Login', 'Log in to manage your account'],
      ['https://www.allianzlife.com/Contact-Us', 'Contact us'],
    ];
    const resourceData = { id: 'test-only-fia-explore', children: { results: resources.map(([url, text], index) => ({
      id: `test-only-fia-resource-${index}`, title: { jsonValue: { value: text } },
      link: { jsonValue: field(url, { text, target: '', url }) },
    })) } };
    const resourceBefore = JSON.stringify(resourceData);
    for (const editing of [false, true]) {
      const markup = renderTools(fiaHelpfulResources.Green, resourceData, editing);
      const anchors = fiaAnchors(markup);
      assert.equal(anchors.length, 3);
      assert.equal(href(anchors[0]), editing ? resources[0][0] : sourceVisitorHref(resources[0][0]));
      assert.equal(href(anchors[1]), editing ? resources[1][0] : sourceVisitorHref(resources[1][0]));
      assert.equal(href(anchors[2]), editing ? resources[2][0] : sourceVisitorHref(resources[2][0]));
      if (editing) assert.match(markup, /test-only-source-link-field/);
    }
    assert.equal(JSON.stringify(resourceData), resourceBefore);
  }
});

test('FIA source variants use verified local suffixes or inert outcomes and reject unsafe authorities', () => {
  assert.equal(fiaSourceApprovals.length, 15);
  assert.equal(source.entries.filter(({ url }) => url === 'https://www.allianzlife.com/Login').length, 1);
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    assert.equal(href(render(field('https://www.allianzlife.com/Login'))), '#');
    for (const { url } of fiaSourceApprovals) {
      for (const [variant, expected] of [
        [`${url}?redirect=unapproved`, sourceVariantHref(url, '?redirect=unapproved')],
        [`${url}#uncaptured`, sourceVariantHref(url, '#uncaptured')], [`${url}/extra`, '#'],
        [url.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'), '#service-unavailable'],
        [url.replace('https://', 'https://user:password@'), '#service-unavailable'],
        [url.replace('www.allianzlife.com', 'www.allianzlife.com:444'), '#service-unavailable'],
        [url.replace('https://', 'http://'), sourceVisitorHref(url)],
      ]) {
        const original = field(variant, { target: '' }), before = JSON.stringify(original);
        assert.notEqual(href(render(original)), variant);
        assert.equal(href(render(original)), expected);
        assert.equal(JSON.stringify(original), before);
      }
    }
  }
});

test('FIA source policy preserves native identity and author metadata for internal/media fields', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const { url } of fiaSourceApprovals) {
    for (const linktype of ['internal', 'media']) {
      const original = field(url, { target: '', linktype, id: '{TEST-ONLY-FIA-NATIVE-ITEM}' });
      const before = JSON.stringify(original);
      assert.equal(href(render(original)), sourceVisitorHref(url));
      assert.equal(safeLink(original).value.id, original.value.id);
      assert.equal(safeLink(original).value.linktype, linktype);
      assert.strictEqual(safeLink(original).metadata, original.metadata);
      assert.match(render(original, true), /test-only-source-link-field/);
      assert.equal(JSON.stringify(original), before);
    }
  }
});


// The exact existing FIA Login link is source fidelity; it does not open a service route.
const fiaLoginUrl = 'https://www.allianzlife.com/Login';
const fiaLoginCaption = 'Log in to manage your account';
function fiaLoginData(input) {
  return { id: 'test-only-fia-login-resource', children: { results: [{
    id: 'test-only-fia-login-child', title: { jsonValue: { value: fiaLoginCaption } },
    link: { jsonValue: input },
  }] } };
}

test('FIA Login source link is inert for visitors and preserves caption and original editing field', () => {
  assert.deepEqual(source.entries.filter(({ url }) => url === fiaLoginUrl), [
    { kind: 'public-page', url: fiaLoginUrl, sourceRecordKey: 'fia-explore-login' },
  ]);
  assert.ok(source.sourcePins.some((pin) => pin.path === 'preparation/fixed-index-annuities-final-qa-v1/source/SOURCE-FACTS.json'
    && pin.sha256 === '8604f9955a865180440207ff745918a961275afe9d749cf73d9043a3e993aaa5'
    && JSON.stringify(pin.jsonPointers) === JSON.stringify(['/sections/10/links/1/resolvedUrl'])));
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const original = field(fiaLoginUrl, { url: fiaLoginUrl, text: fiaLoginCaption, target: '' });
    const data = fiaLoginData(original), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const markup = renderTools(fiaHelpfulResources.Green, data, editing);
      const anchors = fiaAnchors(markup);
      assert.equal(anchors.length, 1);
      assert.equal(href(anchors[0]), editing ? fiaLoginUrl : '#');
      assert.match(anchors[0], /target=""/);
      assert.doesNotMatch(anchors[0], /service-unavailable|title="This service is unavailable"|\brel=/);
      assert.match(markup, /Log in to manage your account/);
      if (editing) assert.match(markup, /test-only-source-link-field/);
      assert.equal(JSON.stringify(data), before);
      assert.strictEqual(data.children.results[0].link.jsonValue, original);
      assert.strictEqual(safeLink(original).metadata, original.metadata);
    }
  }
});

test('FIA exact Login approval leaves URL variants, native internal/media fields and all other service routes restricted', () => {
  const variants = [
    '/Login', 'https://www.allianzlife.com/login', 'https://www.allianzlife.com/Login/',
    'https://www.allianzlife.com/Login?redirect=unapproved', 'https://www.allianzlife.com/Login#uncaptured',
    'https://www.allianzlife.com/Login/extra', 'http://www.allianzlife.com/Login',
    'https://www.allianzlife.com:444/Login', 'https://user:password@www.allianzlife.com/Login',
    'https://www.allianzlife.com.evil.invalid/Login', 'https://evil.invalid/Login',
    'https://www.allianzlife.com/Registration', 'https://www.allianzlife.com/spa',
    'https://www.allianzlife.com/account', 'https://www.allianzlife.com/portal',
    'https://www.allianzlife.com/secured', 'https://www.allianzlife.com/logout',
    'https://www.allianzlife.com/manageuserprofile', 'https://www.allianzlife.com/api',
    'https://www.allianzlife.com/sitecore', 'https://www.allianzlife.com/new-york/Login',
  ];
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const inputs = variants.map((url) => field(url, { url, text: fiaLoginCaption, target: '' }));
    inputs.push(field(fiaLoginUrl, { url: fiaLoginUrl, querystring: 'redirect=unapproved' }));
    inputs.push(field(fiaLoginUrl, { url: fiaLoginUrl, anchor: 'uncaptured' }));
    for (const linktype of ['internal', 'media']) inputs.push(field(fiaLoginUrl,
      { url: fiaLoginUrl, linktype, id: '{TEST-ONLY-FIA-LOGIN-NATIVE-ITEM}' }));
    for (const original of inputs) {
      const data = fiaLoginData(original), before = JSON.stringify(data);
      const visitor = renderTools(fiaHelpfulResources.Green, data, false);
      const expected = /evil\.invalid|user:password|:444/.test(original.value.href) ? '#service-unavailable' : '#';
      assert.equal(href(fiaAnchors(visitor)[0]), expected, original.value.href);
      if (expected === '#service-unavailable') assert.match(fiaAnchors(visitor)[0], /title="This service is unavailable"/);
      else assert.doesNotMatch(fiaAnchors(visitor)[0], /title="This service is unavailable"/);
      const editing = renderTools(fiaHelpfulResources.Green, data, true);
      assert.match(editing, /test-only-source-link-field/);
      assert.equal(JSON.stringify(data), before);
      assert.equal(safeLink(original).value.id, original.value.id);
      assert.equal(safeLink(original).value.linktype, original.value.linktype);
      assert.strictEqual(safeLink(original).metadata, original.metadata);
    }
  }
});

test('Related Sites footer inerts Allianz sources and retains the exact PIMCO external destination', () => {
  const links = [
    'https://www.allianz.com/en_GB.html',
    'https://www.allianzim.com',
    'https://www.pimco.com/us/en',
  ];
  assert.deepEqual(source.entries.filter(({ sourceRecordKey }) => sourceRecordKey.startsWith('footer-related-sites-')).map(({ url }) => url), links);
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const url of links) {
      const input = field(url, { target: '_blank' });
      for (const editing of [false, true]) {
        const html = render(input, editing);
        assert.equal(href(html), editing ? url : sourceVisitorHref(url));
        assertContext(html, editing || url === 'https://www.pimco.com/us/en' ? '_blank' : '');
      }
      for (const unverified of [`${url}/not-verified`, `${url}?redirect=https://example.invalid`, url.replace('https://', 'http://')]) {
        assert.equal(href(render(field(unverified, { target: '_blank' }))), url === 'https://www.pimco.com/us/en' ? '#service-unavailable' : '#');
      }
    }
    assert.equal(href(render(field('https://www.allianzlife.com/login', { target: '_blank' }))), '#');
  }
});

const aboutCorporateDestinations = [
  ['https://www.agcs.allianz.com/global-offices/united-states.html', 'Allianz Global Corporate & Specialty', 'about-parent-company-agcs'],
  ['https://www.allianzworldwidepartners.com/usa/', 'Allianz Partners', 'about-parent-company-partners'],
  ['https://www.allianz-trade.com/en_US.html', 'Allianz Trade', 'about-parent-company-trade'],
];
const corporateContext = {
  componentName: 'AllianzCardGrid', datasourceId: '4B9BEE98-EC6E-4082-A0EB-C4FF2C4C69E7',
  entryId: 'DDFFD29F-7AFD-4AFD-B169-22783948C013',
};
function corporateData(body) {
  return { id: corporateContext.datasourceId, children: { results: [{ id: corporateContext.entryId,
    fieldCollection: [{ name: 'body', jsonValue: body }],
  }] } };
}
const corporateParams = { layout: 'image-left', splitRatio: '67:33', columns: '1', alignment: 'left' };

test('About corporate body inerts Allianz sources and preserves the existing PIMCO anchor in real SDK modes', () => {
  assert.deepEqual(source.entries.filter(({ sourceRecordKey }) => sourceRecordKey.startsWith('about-parent-company-')),
    aboutCorporateDestinations.map(([url, , sourceRecordKey]) => ({ kind: 'public-page', url, sourceRecordKey })));
  assert.ok(source.sourcePins.some(pin => pin.url === 'https://www.allianzlife.com/about'
    && pin.sourceHtmlSha256 === '70d30879ae603f36f1653350a87e86eb5d083544118d4d65d1ad8278f63bc997'));
  const destinations = [...aboutCorporateDestinations, ['https://www.pimco.com/us/en', 'PIMCO']];
  const body = Object.freeze({ value: destinations.map(([url, text]) =>
    `<p><a href="${url}" target="_blank" rel="noopener noreferrer">${text.replaceAll('&', '&amp;')}</a></p>`).join(''),
  metadata: Object.freeze({ itemId: 'test-only-about-corporate-card', fieldId: 'test-only-corporate-body', fieldType: 'Rich Text' }) });
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const data = corporateData(body), before = JSON.stringify(data);
    assert.strictEqual(allianzCardFields(data.children.results[0]).body.jsonValue, body);
    for (const [editing, preview] of [[false, false], [false, true], [true, false]]) {
      const markup = renderTools(toolsCards.Default, data, editing, preview, corporateParams);
      for (const [url] of destinations) {
        const destination = editing ? url : sourceVisitorHref(url);
        const target = editing || url === 'https://www.pimco.com/us/en' ? '_blank' : '';
        const rel = target === '_blank' ? ' rel="noopener noreferrer"' : '';
        assert.ok(markup.includes(`href="${destination}" target="${target}"${rel}`), `${mode}/${editing}/${preview}/${url}`);
        assert.equal(safeLink(field(url, { target: '_blank' })).value.href, sourceVisitorHref(url));
      }
      assert.ok(!markup.includes('#service-unavailable'));
      assert.strictEqual(safeNativeBodyRichText(body, true, corporateContext), body);
      assert.strictEqual(safeNativeBodyRichText(body, false, corporateContext).metadata, body.metadata);
      if (editing) assert.ok(markup.includes(body.metadata.fieldId));
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('About corporate additions reject unrecorded URL variants without changing native editing fields', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [url] of aboutCorporateDestinations) {
      const parsed = new URL(url);
      const variants = [`${url}?redirect=unapproved`, `${url}#uncaptured`, `${url}/extra`,
        url.replace(parsed.hostname, `${parsed.hostname}.evil.invalid`),
        url.replace('https://', 'https://user:password@'),
        url.replace(parsed.hostname, `${parsed.hostname}:444`), url.replace('https://', 'http://')];
      for (const candidate of variants) {
        const input = field(candidate, { target: '_blank' }), before = JSON.stringify(input);
        const expected = /evil\.invalid|user:password|:444|\/\/extra$/.test(candidate) ? '#service-unavailable' : '#';
        assert.equal(safeLink(input).value.href, expected, candidate);
        assert.strictEqual(allianzLinkField(input, true), input);
        const body = { value: `<p><a href="${candidate}" target="_blank">Corporate variant</a></p>`,
          metadata: { itemId: 'test-only-corporate-variant', fieldId: 'test-only-variant-body', fieldType: 'Rich Text' } };
        const data = corporateData(body), bodyBefore = JSON.stringify(data);
        for (const preview of [false, true]) {
          const markup = renderTools(toolsCards.Default, data, false, preview, corporateParams);
          assert.ok(markup.includes(`href="${expected}" target=""`));
          assert.ok(!markup.includes(`href="${candidate}"`));
        }
        assert.strictEqual(safeNativeBodyRichText(body, true, corporateContext), body);
        assert.equal(JSON.stringify(input), before);
        assert.equal(JSON.stringify(data), bodyBefore);
      }
    }
    assert.equal(safeLink(field('/Login')).value.href, '#');
    assert.equal(safeLink(field('https://unrecorded.example.invalid/')).value.href, '#service-unavailable');
  }
});

test('newsroom corporate profile destinations are inert for visitors and preserved in editing', () => {
  const urls = [
    'https://www.allianz.com/en.html',
    'https://www.agcs.allianz.com/',
    'https://www.allianztravelinsurance.com/',
    'https://www.allianz-trade.com/en_global.html',
  ];
  assert.deepEqual(source.entries.filter(({ sourceRecordKey }) => sourceRecordKey.startsWith('newsroom-company-profile-')).map(({ url }) => url), urls);
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const url of urls) {
      for (const editing of [false, true]) {
        const html = render(field(url, { target: '_blank' }), editing);
        assert.equal(href(html), editing ? url : sourceVisitorHref(url));
        assertContext(html, editing ? '_blank' : '');
      }
      for (const invalid of [url.replace('https://', 'http://'), `${url}?redirect=https://example.invalid`, url.replace('https://', 'https://user:password@')]) {
        assert.equal(href(render(field(invalid, { target: '_blank' }))), invalid.includes('user:password') ? '#service-unavailable' : '#');
      }
    }
  }
});

const advisoryDestinations = [
  ['advisory-allianzim-etfs', 'https://www.allianzim.com/etfs/'],
  ['advisory-ria-onboarding', 'https://azldigital.qualtrics.com/jfe/form/SV_8tRF7zOOWAfHp5k'],
  ['advisory-iar-onboarding', 'https://azldigital.qualtrics.com/jfe/form/SV_3NSDoToKKIM8ugK'],
];
const advisoryPartnerDestinations = [
  ['advisory-partner-dpl-financial-partners', 'https://www.dplfp.com/'],
  ['advisory-partner-simplicity-oid', 'https://simplicityoid.com/'],
  ['advisory-partner-halo-investing-annuities', 'https://haloinvesting.com/annuities/'],
  ['advisory-partner-ria-insurance-solutions', 'https://www.ria-insurancesolutions.com/'],
];
const advisorySourceDestinations = [...advisoryDestinations, ...advisoryPartnerDestinations];

test('Advisory inerts the AllianzIM source and retains its six non-Allianz source destinations', () => {
  assert.deepEqual(source.entries.filter(({ sourceRecordKey }) => sourceRecordKey.startsWith('advisory-')),
    advisorySourceDestinations.map(([sourceRecordKey, url]) => ({ kind: 'public-page', url, sourceRecordKey })));
  assert.ok(source.sourcePins.some((pin) =>
    pin.url === 'https://www.allianzlife.com/for-financial-professionals/advisory-solutions'
    && pin.sourceHtmlSha256 === '3379420feba810ad2e701d12bfd365093f86296b916a6622f4b24477381d00e0'));
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [, url] of advisorySourceDestinations) {
      const input = field(url, { target: '_blank', rel: 'author' }), before = JSON.stringify(input);
      for (const editing of [false, true]) {
        const markup = render(input, editing);
        assert.equal(href(markup), editing ? url : sourceVisitorHref(url));
        assertContext(markup, editing || url !== 'https://www.allianzim.com/etfs/' ? '_blank' : '', 'author');
        if (editing) assert.match(markup, /test-only-source-link-field/);
      }
      assert.strictEqual(safeLinkRenderProps(input, true).field, input);
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
    }
  }
});

function partnerBody(url, rel = '') {
  const escaped = url.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return {
    value: `<p><a class="a-link" href="${escaped}" target="_blank"${rel ? ` rel="${rel}"` : ''}>Public partner</a></p>`,
    metadata: { itemId: 'test-only-partner-item', fieldId: 'test-only-partner-body', fieldType: 'Rich Text' },
  };
}

function renderPartnerBody(input, isEditing = false) {
  return renderComponent(() => React.createElement(RichText, {
    field: safeEditorialRichText(input, isEditing), editable: isEditing,
  }), {}, isEditing);
}

test('Advisory partner body links preserve exact source new-tab behavior and native editing fields', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [, url] of advisoryPartnerDestinations) {
      for (const rel of ['', 'author']) {
        const input = partnerBody(url, rel), before = JSON.stringify(input);
        const visitor = renderPartnerBody(input);
        assert.equal(href(visitor), url);
        assert.match(visitor, /target="_blank"/);
        assert.ok(visitor.includes(`rel="${rel ? `${rel} ` : ''}noopener noreferrer"`));
        assert.strictEqual(safeEditorialRichText(input).metadata, input.metadata);
        assert.strictEqual(safeEditorialRichText(input, true), input);
        const editing = renderPartnerBody(input, true);
        assert.equal(href(editing), url);
        assert.match(editing, /target="_blank"/);
        if (rel) assert.match(editing, /rel="author"/);
        else assert.doesNotMatch(editing, /rel=/);
        assert.doesNotMatch(editing, /noopener|noreferrer/);
        assert.match(editing, /test-only-partner-body/);
        assert.equal(JSON.stringify(input), before);
      }
    }
  }
});

test('Advisory partner body approvals reject URL lookalikes and unrecorded path, query and fragment variants', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [, url] of advisoryPartnerDestinations) {
      const parsed = new URL(url);
      const variants = [
        `${url}unrecorded`, `${url}?redirect=unapproved`, `${url}#unrecorded`, `${url}%2f`,
        url.replace('https:', 'http:'), url.replace('https:', ''),
        url.replace('https://', 'https://user:password@'),
        url.replace(parsed.host, `${parsed.host}:443`),
        url.replace(parsed.host, `${parsed.host}.example.invalid`),
        ` ${url}`, `${url} `,
      ];
      for (const variant of variants) {
        const input = partnerBody(variant), before = JSON.stringify(input);
        const normalized = safeEditorialRichText(input);
        const visitor = renderPartnerBody(input);
        assert.equal(href(visitor), '#service-unavailable', variant);
        assert.match(visitor, /target=""/);
        assert.doesNotMatch(visitor, /noopener|noreferrer/);
        assert.strictEqual(normalized.metadata, input.metadata);
        assert.strictEqual(safeEditorialRichText(input, true), input);
        assert.equal(JSON.stringify(input), before);
      }
    }
  }
});

test('Advisory AllianzIM variants stay inert while non-Allianz variants and unsafe authorities stay rejected', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [, url] of advisoryDestinations) {
      const parsed = new URL(url);
      const inert = url === 'https://www.allianzim.com/etfs/' ? '#' : '#service-unavailable';
      const variants = [
        [`${url}?redirect=unapproved`, inert], [`${url}#unrecorded`, inert],
        [`${url}/extra`, url.endsWith('/') ? '#service-unavailable' : inert],
        [url.replace('https:', 'http:'), inert], [url.replace('https:', ''), inert],
        [url.replace('https://', 'https://user:password@'), '#service-unavailable'],
        [url.replace(parsed.host, `${parsed.host}:443`), '#service-unavailable'],
        [url.replace(parsed.host, `${parsed.host}.example.invalid`), '#service-unavailable'],
        [url.replace('/etfs/', '/%65tfs/').replace('/form/', '/%66orm/'), inert],
        [` ${url}`, '#service-unavailable'], [`${url} `, '#service-unavailable'],
      ];
      const inputs = variants.map(([variant, expected]) => [field(variant, { target: '_blank' }), expected]);
      inputs.push([field(url, { target: '_blank', querystring: 'redirect=unapproved' }), inert]);
      inputs.push([field(url, { target: '_blank', anchor: 'unrecorded' }), inert]);
      for (const linktype of ['internal', 'media']) inputs.push([field(url,
        { target: '_blank', linktype, id: '{TEST-ONLY-ADVISORY-NATIVE-ITEM}' }), inert]);
      for (const [input, expected] of inputs) {
        const before = JSON.stringify(input), output = safeLink(input);
        assert.equal(output.value.href, expected, input.value.href);
        assert.equal(output.value.target, '');
        assert.equal(output.value.querystring, '');
        assert.equal(output.value.anchor, '');
        assert.strictEqual(output.metadata, input.metadata);
        assert.equal(href(render(input)), expected);
        assert.equal(JSON.stringify(input), before);
      }
    }
    for (const [unrecorded, expected] of [
      ['https://azldigital.qualtrics.com/jfe/form/SV_UNRECORDED', '#service-unavailable'],
      ['https://www.allianzim.com/etfs/unrecorded', '#'], ['/Login', '#'],
    ]) assert.equal(href(render(field(unrecorded, { target: '_blank' }))), expected);
  }
});

const professionalsAllianceUrl = 'https://www.protectedincome.org/';

test('Professionals preserves only the recorded Alliance source link and its SDK new-tab policy', () => {
  assert.deepEqual(source.entries.filter(({ sourceRecordKey }) =>
    sourceRecordKey === 'professionals-alliance-for-lifetime-income'), [
    { kind: 'public-page', url: professionalsAllianceUrl, sourceRecordKey: 'professionals-alliance-for-lifetime-income' },
  ]);
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const rel of ['', 'author']) {
      const input = field(professionalsAllianceUrl, { target: '_blank', rel });
      const before = JSON.stringify(input);
      assert.equal(safeLink(input).value.href, professionalsAllianceUrl);
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.strictEqual(allianzLinkField(input, true), input);
      assert.strictEqual(safeLinkRenderProps(input, true).field, input);
      for (const editing of [false, true]) {
        const markup = render(input, editing);
        assert.equal(href(markup), professionalsAllianceUrl);
        assert.match(markup, /target="_blank"/);
        assert.ok(markup.includes(`rel="${rel ? `${rel} ` : ''}noopener noreferrer"`));
        if (editing) assert.match(markup, /test-only-source-link-field/);
      }
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('Professionals Alliance registration does not admit URL variants or native-link identities', () => {
  const variants = [
    'https://protectedincome.org/',
    'http://www.protectedincome.org/',
    '//www.protectedincome.org/',
    'https://user:password@www.protectedincome.org/',
    'https://www.protectedincome.org:443/',
    'https://www.protectedincome.org:444/',
    'https://www.protectedincome.org.example.invalid/',
    'https://www.protectedincome.org/unrecorded',
    'https://www.protectedincome.org/%2f',
    'https://www.protectedincome.org/?redirect=unapproved',
    'https://www.protectedincome.org/#unrecorded',
    'https://www.protectedincome.org',
    ` ${professionalsAllianceUrl}`,
    `${professionalsAllianceUrl} `,
    'https://www.limraconsumer.com/',
    '/Login',
  ];
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const inputs = variants.map((url) => field(url, { target: '_blank' }));
    inputs.push(field(professionalsAllianceUrl, { target: '_blank', querystring: 'redirect=unapproved' }));
    inputs.push(field(professionalsAllianceUrl, { target: '_blank', anchor: 'unrecorded' }));
    for (const linktype of ['internal', 'media']) inputs.push(field(professionalsAllianceUrl,
      { target: '_blank', linktype, id: '{TEST-ONLY-ALLIANCE-NATIVE-ITEM}' }));
    for (const input of inputs) {
      const before = JSON.stringify(input), output = safeLink(input);
      const expected = input.value.href === '/Login' ? '#' : '#service-unavailable';
      assert.equal(output.value.href, expected, JSON.stringify(input.value));
      assert.equal(output.value.target, '');
      assert.equal(output.value.querystring, '');
      assert.equal(output.value.anchor, '');
      assert.strictEqual(output.metadata, input.metadata);
      assert.strictEqual(allianzLinkField(input, true), input);
      const visitor = render(input);
      assert.equal(href(visitor), expected);
      assert.doesNotMatch(visitor, /target="_blank"|noopener|noreferrer/);
      assert.equal(JSON.stringify(input), before);
    }
  }
});
