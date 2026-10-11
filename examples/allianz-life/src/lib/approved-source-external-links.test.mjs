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

test('all 20 approved PDF destinations remain absolute through the installed SDK in visitor and editing modes', () => {
  assert.equal(pdfs.length, 20);
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
