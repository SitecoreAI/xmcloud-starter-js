import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Link, SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { safeEditorialRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial.ts'));
const source = JSON.parse(fs.readFileSync(new URL('./approved-source-external-links.fixture.json', import.meta.url), 'utf8'));
const pdfs = source.entries.filter(({ kind }) => kind === 'public-pdf');
const how = source.entries.find(({ kind }) => kind === 'public-page').url;
const contacts = source.entries.filter(({ kind }) => kind === 'source-contact');
process.env.NODE_ENV = 'test';

function field(href, attributes = {}) {
  return { value: { href, text: 'Original source link', linktype: 'external', ...attributes },
    metadata: { itemId: 'test-only-source-link-item', fieldId: 'test-only-source-link-field', fieldType: 'General Link' } };
}
function render(input, isEditing = false, editable = true) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing, isNormal: !isEditing, isPreview: false },
      layout: { sitecore: { context: {}, route: { name: 'Source links', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Link, { ...safeLinkRenderProps(input), editable,
    'aria-label': input.value?.ariaLabel || input.value?.['aria-label'] })));
}
function href(html) {
  return /href="([^"]*)"/.exec(html)?.[1].replaceAll('&amp;', '&');
}

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

test('all 26 approved PDF destinations retain their exact source identities and installed SDK behavior', () => {
  assert.equal(pdfs.length, 26);
  assert.deepEqual(pdfs.map(({ sourceRecordKey, url }) => [sourceRecordKey, url]), approvedPdfIdentities);
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const entry of pdfs) {
      const input = field(entry.url, { target: '_blank', rel: 'author', 'aria-label': '' });
      const before = JSON.stringify(input);
      for (const isEditing of [false, true]) {
        const html = render(input, isEditing);
        assert.equal(href(html), entry.url, entry.sourceRecordKey);
        assert.match(html, /target="_blank"/);
        assert.match(html, /rel="author noopener noreferrer"/);
        if (isEditing) assert.match(html, /test-only-source-link-field/);
      }
      assert.equal(href(render(input, false, false)), entry.url);
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('How it Works preserves its approved external destination and source same-tab target', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const input = field(how, { text: 'How it Works', target: '', 'aria-label': 'How it Works' });
    for (const isEditing of [false, true]) {
      const html = render(input, isEditing);
      assert.equal(href(html), how);
      assert.match(html, /target=""/);
      assert.doesNotMatch(html, /rel=/);
    }
  }
});

test('only the two captured contact URLs retain their original ordered query and new-tab behavior', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
  assert.equal(contacts.length, 2);
  for (const { url } of contacts) {
    const parsed = new URL(url);
    for (const input of [
      field(url, { target: '_blank' }),
      field(`${parsed.origin}${parsed.pathname}`, { querystring: parsed.search.slice(1), target: '_blank' }),
      field(url, { querystring: parsed.search.slice(1), target: '_blank' }),
    ]) {
      for (const isEditing of [false, true]) {
        const html = render(input, isEditing);
        assert.equal(href(html), url);
        assert.match(html, /target="_blank" rel="noopener noreferrer"/);
        if (isEditing) assert.match(html, /test-only-source-link-field/);
      }
    }
  }
});

test('lookalikes, credential URLs and unapproved source service variants still render unavailable', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
  const pdf = pdfs[0].url;
  const contact = contacts[0].url;
  for (const destination of [
    pdf.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'),
    pdf.replace('https://', 'https://user:password@'),
    pdf.replace('www.allianzlife.com', 'www.allianzlife.com:444'),
    pdf.replace('https://', 'http://'),
    pdf.replace('/-/media/', '/%2f-/media/'),
    pdf.replace('.pdf', '-uncaptured.pdf'),
    contact.replace('lp.allianzlife.com', 'lp.allianzlife.com.evil.invalid'),
    contact.replace('https://', 'https://user:password@'),
    contact.replace('lp.allianzlife.com', 'lp.allianzlife.com:444'),
    contact.replace('utm_content=em_resources', 'utm_content=unknown'),
    `${contact}&redirect=https%3A%2F%2Fevil.invalid`,
    'https://lp.allianzlife.com/EMContactUS.html',
    'javascript:alert(1)',
  ]) {
    const input = field(destination, { target: '_blank' });
    assert.equal(href(render(input)), '#service-unavailable', destination);
    assert.equal(safeLink(input).value.target, '');
    assert.doesNotMatch(render(input), /rel="noopener noreferrer"/);
  }
});

test('native internal and media identity retain local navigation even when their href matches an approved source URL', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const linktype of ['internal', 'media']) {
    const input = field(how, { linktype, id: '{TEST-ONLY-NATIVE-ITEM}' });
    assert.equal(href(render(input)), new URL(how).pathname);
    assert.equal(safeLink(input).value.id, '{TEST-ONLY-NATIVE-ITEM}');
    assert.equal(safeLink(input).value.linktype, linktype);
  }
  const implicitInternal = field(how, { linktype: undefined, id: '{TEST-ONLY-NATIVE-ITEM}' });
  assert.equal(href(render(implicitInternal)), new URL(how).pathname);
  const capturedShape = field(how, { linktype: undefined });
  assert.equal(href(render(capturedShape)), how);
  const about = field('https://www.allianzlife.com/about?view=public#overview', { linktype: 'internal' });
  assert.equal(href(render(about)), '/about?view=public#overview');
  for (const destination of ['/login', '/api/private', 'https://external.example.invalid/']) {
    assert.equal(href(render(field(destination))), '#service-unavailable');
  }
});


test('Sustainability preserves its four exact source destinations and targets through the installed SDK', () => {
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
        assert.equal(href(html), url);
        assert.ok(html.includes(`target="${target}"`));
        if (target === '_blank') assert.match(html, /rel="noopener noreferrer"/);
        else assert.doesNotMatch(html, /rel=/);
        if (isEditing) assert.match(html, /test-only-source-link-field/);
      }
      assert.equal(JSON.stringify(input), before);
    }
  }
  for (const invalid of [
    'https://www.allianz.com/en/sustainability.html?redirect=unknown',
    'https://www.allianz.com/en/sustainability/sustainability-hub/sustainability-at-allianz/climate-change.html#unknown',
    'https://www.allianz.com.evil.invalid/en/sustainability.html',
  ]) assert.equal(href(render(field(invalid))), '#service-unavailable');
});


test('early-retirement study preserves its exact proved PDF href, new-tab target and native field chrome', () => {
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
      assert.equal(href(html), url);
      assert.match(html, /target="_blank"/);
      if (!editing) assert.match(html, /aria-label="Get our study findings \(PDF\)"/);
      assert.match(html, /rel="noopener noreferrer"/);
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
function renderTools(Component, datasource, isEditing) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', mode: { isEditing, isNormal: !isEditing, isPreview: false },
      layout: { sitecore: { context: {}, route: { name: 'Tools links', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: {}, fields: { data: { datasource } } })));
}
// React may prepend image preload links; inspect the rendered card anchor itself.
const toolsHref = html => /<a\b[^>]*href="([^"]*)"/.exec(html)?.[1].replaceAll('&amp;', '&');
test('Tools exact four source destinations remain absolute in real finite variants and both SDK modes', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [variant, label, url, key] of toolsDestinations) {
      const input = field(url, { text: label, url, target: '' });
      const data = toolsData(input, label), before = JSON.stringify(data);
      for (const editing of [false, true]) {
        const html = renderTools(toolsCards[variant], data, editing);
        assert.equal(toolsHref(html), url, `${mode}/${variant}/${key}`);
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
test('Tools lookalikes and unapproved query, fragment and route variants gain no absolute-URL approval', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const [variant, label, url] of toolsDestinations) {
    for (const modified of [url.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'),
      `${url}?redirect=unapproved`, `${url}#unapproved`, `${url}-uncaptured`]) {
      const input = field(modified, { text: label, url: modified, target: '' });
      const data = toolsData(input, label), before = JSON.stringify(data);
      assert.notEqual(toolsHref(renderTools(toolsCards[variant], data, false)), modified);
      if (modified.includes('evil.invalid')) assert.equal(toolsHref(renderTools(toolsCards[variant], data, false)), '#service-unavailable');
      assert.match(renderTools(toolsCards[variant], data, true), /test-only-source-link-field/);
      assert.equal(JSON.stringify(data), before);
    }
  }
});
test('Tools native internal identity retains local navigation when its href matches an approved external source', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const [variant, label, url] of toolsDestinations) {
    const input = field(url, { text: label, linktype: 'internal', id: '{TEST-ONLY-NATIVE-TOOLS-ITEM}', target: '' });
    const data = toolsData(input, label), before = JSON.stringify(data);
    assert.equal(toolsHref(renderTools(toolsCards[variant], data, false)), new URL(url).pathname);
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

test('Life benefits retain the approved absolute Index Options body link in the real finite variant and both SDK modes', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const { data, nativeBody } = overviewBenefitData(overviewIndexUrl), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = renderTools(toolsCards.LifeBenefitsGrid, data, editing);
      assert.equal(toolsHref(html), overviewIndexUrl, `${mode}/LifeBenefitsGrid/${editing}`);
      assert.match(html, /title="Source index" class="source-index"/);
      assert.match(html, />external index<\/a>/);
      assert.match(html, /<sup>1<\/sup>/);
      assert.doesNotMatch(/<a\b[^>]*>/.exec(html)?.[0] ?? '', /target=|rel=/);
      if (editing) assert.match(html, /test-only-life-benefit-body/);
      assert.strictEqual(safeEditorialRichText(nativeBody, editing), nativeBody);
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

test('Index Options lookalikes, credentials, ports, scheme and uncaptured query/fragment/path variants gain no absolute approval', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const destination of [overviewIndexUrl.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'),
    overviewIndexUrl.replace('https://', 'https://user:password@'), overviewIndexUrl.replace('www.allianzlife.com', 'www.allianzlife.com:444'),
    overviewIndexUrl.replace('https://', 'http://'), `${overviewIndexUrl}?redirect=unapproved`, `${overviewIndexUrl}#unapproved`, `${overviewIndexUrl}-uncaptured`]) {
    const { data, nativeBody } = overviewBenefitData(destination), before = JSON.stringify(data);
    const rendered = renderTools(toolsCards.LifeBenefitsGrid, data, false);
    assert.notEqual(toolsHref(rendered), destination);
    if (/evil\.invalid|user:password|:444/.test(destination)) assert.equal(toolsHref(rendered), '#service-unavailable');
    assert.strictEqual(safeEditorialRichText(nativeBody, true), nativeBody);
    assert.match(renderTools(toolsCards.LifeBenefitsGrid, data, true), /test-only-life-benefit-body/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('Index Options approval preserves local navigation for explicitly authored native identities', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const linktype of ['internal', 'media']) {
    const input = field(overviewIndexUrl, { linktype, id: '{TEST-ONLY-NATIVE-INDEX-ITEM}' }), before = JSON.stringify(input);
    assert.equal(href(render(input)), '/what-we-offer/Index-options');
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

test('About Us routes two verified local teasers while retaining the held Culture source fallback through the installed SDK', () => {
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
        assert.equal(href(html), url.endsWith('/why-allianz/culture') ? url : new URL(url).pathname);
        assert.match(html, /target=""/);
        assert.doesNotMatch(html, /rel="noopener noreferrer"/);
        if (isEditing) assert.match(html, /test-only-source-link-field/);
      }
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('About Us exact source approvals do not retain lookalike or augmented destinations', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const url of aboutTeaserDestinations) {
    for (const invalid of [
      url.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'),
      url.replace('https://', 'https://user:password@'),
      url.replace('www.allianzlife.com', 'www.allianzlife.com:444'),
    ]) assert.equal(href(render(field(invalid))), '#service-unavailable');
    for (const uncaptured of [`${url}?redirect=unknown`, `${url}#uncaptured`, `${url}/extra`, url.replace('https://', 'http://')]) {
      assert.notEqual(href(render(field(uncaptured))), uncaptured);
      assert.ok(!href(render(field(uncaptured))).startsWith('https://www.allianzlife.com'));
    }
  }
});

test('About Us approved URLs preserve native internal identity and local routing', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const url of aboutTeaserDestinations) {
    for (const linktype of ['internal', 'media']) {
      const input = field(url, { linktype, id: '{TEST-ONLY-ABOUT-NATIVE-ITEM}', target: '' });
      const before = JSON.stringify(input);
      assert.equal(href(render(input)), new URL(url).pathname);
      assert.equal(safeLink(input).value.id, '{TEST-ONLY-ABOUT-NATIVE-ITEM}');
      assert.equal(safeLink(input).value.linktype, linktype);
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
    }
  }
});


const offerAnnuitiesSourceUrl = 'https://www.allianzlife.com/what-we-offer/annuities';

test('What We Offer consumed Annuities CTA preserves the exact approved source URL and native Link chrome', () => {
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
      assert.equal(href(html), offerAnnuitiesSourceUrl);
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

test('What We Offer source approval does not preserve augmented Annuities URLs or alternate origins', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const candidate of [offerAnnuitiesSourceUrl + '?extra=1', offerAnnuitiesSourceUrl + '#extra',
      offerAnnuitiesSourceUrl + '/other', 'http://www.allianzlife.com/what-we-offer/annuities',
      'https://www.allianzlife.com.example.test/what-we-offer/annuities']) {
      assert.notEqual(href(render(field(candidate))), candidate);
    }
  }
});


// The two source product pages have no verified native destinations in this page scope.
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

test('Annuities exact product source URLs remain absolute in the real ProductTypeChoices visitor and editing rendering', () => {
  assert.deepEqual(source.entries.filter(entry => entry.sourceRecordKey.startsWith('annuities-product-choice-')),
    annuitiesProductDestinations.map(([url, , sourceRecordKey]) => ({ kind: 'public-page', url, sourceRecordKey })));
  assert.ok(source.sourcePins.some(pin => pin.path === 'preparation/annuities-final-qa-v1/source/SOURCE-FACTS.json'
    && pin.sha256 === '6068f3532acd0aaaf1355143487356bb45d23d371c1c8c17774522d43952b468'
    && JSON.stringify(pin.jsonPointers) === JSON.stringify(['/sections/5/tiles/0/links/0/resolvedUrl', '/sections/5/tiles/1/links/0/resolvedUrl'])));
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const inputs = annuitiesProductDestinations.map(([url, text], index) => {
      const original = field(url, { url, text, title: '', target: '', querystring: '', anchor: '' });
      original.metadata = { ...original.metadata, itemId: `test-only-annuities-choice-${index}`,
        fieldId: `test-only-annuities-choice-${index}-link` };
      return original;
    });
    const data = annuitiesChoiceData(inputs), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = renderTools(annuitiesProductChoices.Default, data, editing);
      const anchors = annuitiesChoiceAnchors(html);
      assert.equal(anchors.length, 2);
      inputs.forEach((original, index) => {
        assert.equal(href(anchors[index]), original.value.href, `${mode}/${editing}/${index}`);
        assert.ok(anchors[index].includes(`aria-label="${original.value.text}"`));
        assert.match(anchors[index], /target=""/);
        assert.doesNotMatch(anchors[index], /\brel=/);
        if (editing) assert.ok(html.includes(original.metadata.fieldId));
        assert.strictEqual(safeLink(original).metadata, original.metadata);
        assert.strictEqual(data.children.results[index].link.jsonValue, original);
      });
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('Annuities two product approvals do not retain augmented URLs, alternate origins, credentials or schemes', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [url, text] of annuitiesProductDestinations) {
      for (const candidate of [`${url}?redirect=unapproved`, `${url}#uncaptured`, `${url}/extra`,
        url.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'),
        url.replace('https://', 'https://user:password@'),
        url.replace('www.allianzlife.com', 'www.allianzlife.com:444'),
        url.replace('https://', 'http://')]) {
        const original = field(candidate, { url: candidate, text, target: '' });
        const data = annuitiesChoiceData([original]), before = JSON.stringify(data);
        const anchor = annuitiesChoiceAnchors(renderTools(annuitiesProductChoices.Default, data, false))[0];
        assert.notEqual(href(anchor), candidate);
        if (/evil\.invalid|user:password|:444/.test(candidate)) assert.equal(href(anchor), '#service-unavailable');
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


// FIA exact source destinations: product cards plus unchanged FAQ/Contact resource fields.
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

test('FIA product cards and existing FAQ/Contact fields preserve fifteen exact public source destinations through installed SDK', () => {
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
        assert.equal(href(anchor), inputs[index].value.href);
        assert.ok(anchor.includes(`target="${inputs[index].value.target}"`));
        if (!editing && inputs[index].value.target === '_blank') assert.match(anchor, /rel="noopener noreferrer"/);
        if (!editing && inputs[index].value.target === '') assert.doesNotMatch(anchor, /\brel=/);
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
      assert.equal(href(anchors[0]), resources[0][0]);
      assert.equal(href(anchors[1]), resources[1][0]);
      assert.equal(href(anchors[2]), resources[2][0]);
      if (editing) assert.match(markup, /test-only-source-link-field/);
    }
    assert.equal(JSON.stringify(resourceData), resourceBefore);
  }
});

test('FIA fifteen non-service source approvals do not preserve augmented URLs or unsafe origins', () => {
  assert.equal(fiaSourceApprovals.length, 15);
  assert.equal(source.entries.filter(({ url }) => url === 'https://www.allianzlife.com/Login').length, 1);
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    assert.equal(href(render(field('https://www.allianzlife.com/Login'))), 'https://www.allianzlife.com/Login');
    for (const { url } of fiaSourceApprovals) {
      for (const variant of [`${url}?redirect=unapproved`, `${url}#uncaptured`, `${url}/extra`,
        url.replace('www.allianzlife.com', 'www.allianzlife.com.evil.invalid'),
        url.replace('https://', 'https://user:password@'),
        url.replace('www.allianzlife.com', 'www.allianzlife.com:444'),
        url.replace('https://', 'http://')]) {
        const original = field(variant, { target: '' }), before = JSON.stringify(original);
        assert.notEqual(href(render(original)), variant);
        if (/evil\.invalid|user:password|:444/.test(variant)) assert.equal(href(render(original)), '#service-unavailable');
        assert.equal(JSON.stringify(original), before);
      }
    }
  }
});

test('FIA exact source approvals preserve local routing, native identity and author metadata for internal/media fields', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  for (const { url } of fiaSourceApprovals) {
    for (const linktype of ['internal', 'media']) {
      const original = field(url, { target: '', linktype, id: '{TEST-ONLY-FIA-NATIVE-ITEM}' });
      const before = JSON.stringify(original);
      assert.equal(href(render(original)), new URL(url).pathname);
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

test('FIA exact Login source link preserves href, empty target, caption and original field in all four installed SDK states', () => {
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
      assert.equal(href(anchors[0]), fiaLoginUrl);
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
      assert.equal(href(fiaAnchors(visitor)[0]), '#service-unavailable');
      assert.match(fiaAnchors(visitor)[0], /title="This service is unavailable"/);
      const editing = renderTools(fiaHelpfulResources.Green, data, true);
      assert.match(editing, /test-only-source-link-field/);
      assert.equal(JSON.stringify(data), before);
      assert.equal(safeLink(original).value.id, original.value.id);
      assert.equal(safeLink(original).value.linktype, original.value.linktype);
      assert.strictEqual(safeLink(original).metadata, original.metadata);
    }
  }
});

test('Related Sites footer preserves exactly the three official external URLs and intentional new tabs', () => {
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
        assert.equal(href(html), url);
        assert.match(html, /target="_blank"/);
        assert.match(html, /rel="noopener noreferrer"/);
      }
      for (const unverified of [`${url}/not-verified`, `${url}?redirect=https://example.invalid`, url.replace('https://', 'http://')]) {
        assert.equal(href(render(field(unverified, { target: '_blank' }))), '#service-unavailable');
      }
    }
    assert.equal(href(render(field('https://www.allianzlife.com/login', { target: '_blank' }))), '#service-unavailable');
  }
});

test('newsroom profile retains only its four additional verified official destinations', () => {
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
        assert.equal(href(html), url);
        assert.match(html, /target="_blank" rel="noopener noreferrer"/);
      }
      for (const invalid of [url.replace('https://', 'http://'), `${url}?redirect=https://example.invalid`, url.replace('https://', 'https://user:password@')]) {
        assert.equal(href(render(field(invalid, { target: '_blank' }))), '#service-unavailable');
      }
    }
  }
});

const advisoryDestinations = [
  ['advisory-allianzim-etfs', 'https://www.allianzim.com/etfs/'],
  ['advisory-ria-onboarding', 'https://azldigital.qualtrics.com/jfe/form/SV_8tRF7zOOWAfHp5k'],
  ['advisory-iar-onboarding', 'https://azldigital.qualtrics.com/jfe/form/SV_3NSDoToKKIM8ugK'],
];

test('Advisory preserves its three exact public source destinations through the installed SDK', () => {
  assert.deepEqual(source.entries.filter(({ sourceRecordKey }) => sourceRecordKey.startsWith('advisory-')),
    advisoryDestinations.map(([sourceRecordKey, url]) => ({ kind: 'public-page', url, sourceRecordKey })));
  assert.ok(source.sourcePins.some((pin) =>
    pin.url === 'https://www.allianzlife.com/for-financial-professionals/advisory-solutions'
    && pin.sourceHtmlSha256 === '3379420feba810ad2e701d12bfd365093f86296b916a6622f4b24477381d00e0'));
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [, url] of advisoryDestinations) {
      const input = field(url, { target: '_blank', rel: 'author' }), before = JSON.stringify(input);
      for (const editing of [false, true]) {
        const markup = render(input, editing);
        assert.equal(href(markup), url);
        assert.match(markup, /target="_blank"/);
        assert.match(markup, /rel="author noopener noreferrer"/);
        if (editing) assert.match(markup, /test-only-source-link-field/);
      }
      assert.strictEqual(safeLinkRenderProps(input, true).field, input);
      assert.strictEqual(safeLink(input).metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('Advisory approvals reject unrecorded URL, query, fragment and authority variants', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [, url] of advisoryDestinations) {
      const parsed = new URL(url);
      const variants = [
        `${url}?redirect=unapproved`, `${url}#unrecorded`, `${url}/extra`,
        url.replace('https:', 'http:'), url.replace('https:', ''),
        url.replace('https://', 'https://user:password@'),
        url.replace(parsed.host, `${parsed.host}:443`),
        url.replace(parsed.host, `${parsed.host}.example.invalid`),
        url.replace('/etfs/', '/%65tfs/').replace('/form/', '/%66orm/'),
        ` ${url}`, `${url} `,
      ];
      const inputs = variants.map((variant) => field(variant, { target: '_blank' }));
      inputs.push(field(url, { target: '_blank', querystring: 'redirect=unapproved' }));
      inputs.push(field(url, { target: '_blank', anchor: 'unrecorded' }));
      for (const linktype of ['internal', 'media']) inputs.push(field(url,
        { target: '_blank', linktype, id: '{TEST-ONLY-ADVISORY-NATIVE-ITEM}' }));
      for (const input of inputs) {
        const before = JSON.stringify(input), output = safeLink(input);
        assert.equal(output.value.href, '#service-unavailable', input.value.href);
        assert.equal(output.value.target, '');
        assert.equal(output.value.querystring, '');
        assert.equal(output.value.anchor, '');
        assert.strictEqual(output.metadata, input.metadata);
        assert.equal(href(render(input)), '#service-unavailable');
        assert.equal(JSON.stringify(input), before);
      }
    }
    for (const unrecorded of [
      'https://azldigital.qualtrics.com/jfe/form/SV_UNRECORDED',
      'https://www.allianzim.com/etfs/unrecorded', '/Login',
    ]) assert.equal(href(render(field(unrecorded, { target: '_blank' }))), '#service-unavailable');
  }
});
