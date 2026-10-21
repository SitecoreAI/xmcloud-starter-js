import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

// Read-only prepared source/binding evidence. SDK wrappers and image URLs below
// are explicit test-only projections; these tests neither obtain nor save CMS data.
const prepRoot = process.env.ALLIANZ_SUSTAINABILITY_PREP_ROOT ||
  path.resolve(sourceRoot, '../../../../preparation/sustainability-breadth-v1');
const candidate = JSON.parse(fs.readFileSync(path.join(prepRoot, 'candidate/SCOPED-CANDIDATE.json'), 'utf8'));
const bindings = JSON.parse(fs.readFileSync(path.join(prepRoot, 'candidate/BINDINGS.template.json'), 'utf8'));
const source = JSON.parse(fs.readFileSync(path.join(prepRoot, 'content/SOURCE-ROUTE.json'), 'utf8'));
const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const Breadcrumbs = loadSource(path.join(sourceRoot, 'components/allianz-breadcrumbs/AllianzBreadcrumbs.tsx'));
const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const approvedLinks = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'lib/approved-source-external-links.fixture.json'), 'utf8'));
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
const records = new Map(candidate.contentItems.map(item => [item.key, item]));
const byId = new Map(candidate.contentItems.map(item => [item.id.toLowerCase(), item]));
const routeById = new Map(Object.entries(bindings.internalTargets).map(([href, row]) => [canonicalId(row.id), href]));
routeById.set(candidate.pageId, '/why-allianz/sustainability');
const occurrence = (html, token) => html.split(token).length - 1;
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
const field = (record, name, value, kind) => ({ jsonValue: { value,
  metadata: { itemId: `test-only-sustainability-${record.id}`, fieldId: `test-only-sustainability-${record.id}-${name}`, fieldType: kind } } });
const informationPath = 'M14,8 C14.3,8 14.5,8.2 14.5,8.5 L14.5,23.5 C14.5,23.8 14.3,24 14,24 L10,24 C9.7,24 9.5,23.8 9.5,23.5 L9.5,8.5 C9.5,8.2 9.7,8 10,8 L14,8 Z M12,6 C10.3,6 9,4.7 9,3 C9,1.3 10.3,0 12,0 C13.7,0 15,1.3 15,3 C15,4.7 13.7,6 12,6 Z';
const downloadPath = 'M11.0088496,18.601 L5.41052947,13.1737857 C4.86315684,12.6431429 4.86315684,11.7854286 5.41052947,11.2547857 C5.9579021,10.7241429 6.84265787,10.7241429 7.3900305,11.2547857 L10.60007,14.3667143 L10.60007,1.35714286 C10.60007,0.606642857 11.2258387,0 12,0 C12.7741613,0 13.39993,0.606642857 13.39993,1.35714286 L13.39993,14.3667143 L16.6099695,11.2547857 C17.1573421,10.7241429 18.0420979,10.7241429 18.5894705,11.2547857 C19.1368432,11.7854286 19.1368432,12.6431429 18.5894705,13.1737857 L12.9911504,18.601 C12.8623569,18.7272143 12.7069647,18.8262857 12.5347733,18.8955 C12.3639818,18.9647143 12.1819909,19 12,19 C11.8180091,19 11.6360182,18.9647143 11.4652267,18.8955 C11.2930353,18.8262857 11.1376431,18.7272143 11.0088496,18.601 Z M22.9090909,18 C23.5104545,18 24,18.4669565 24,19.0434783 L24,22.9565217 C24,23.5317391 23.5104545,24 22.9090909,24 L1.09090909,24 C0.489545455,24 0,23.5317391 0,22.9565217 L0,19.0434783 C0,18.4669565 0.489545455,18 1.09090909,18 C1.69227273,18 2.18181818,18.4669565 2.18181818,19.0434783 L2.18181818,21.9130435 L21.8181818,21.9130435 L21.8181818,19.0434783 C21.8181818,18.4669565 22.3077273,18 22.9090909,18 Z';
const arrowPath = 'M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536';

function canonicalId(value) {
  const hex = value.replace(/[{}-]/g, '').toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function linkValue(xml) {
  const attrs = Object.fromEntries([...xml.matchAll(/([\w-]+)="([^"]*)"/g)].map(item => [item[1], decode(item[2])]));
  const href = attrs.linktype === 'internal' ? routeById.get(canonicalId(attrs.id)) : attrs.url;
  assert.equal(typeof href, 'string', 'Every READY link has a proved destination projection');
  return { ...attrs, href, text: attrs.text || '', target: attrs.target || '', linktype: attrs.linktype };
}
function native(key, withMedia = false) {
  const record = records.get(key);
  assert.ok(record, key);
  const data = { id: record.id };
  for (const intent of record.fieldIntents) {
    if (intent.kind === 'Treelist') {
      data[intent.hint] = { targetItems: intent.status === 'READY'
        ? intent.logicalValue.split('|').filter(Boolean).map(id => native(byId.get(canonicalId(id)).key, withMedia)) : [] };
      continue;
    }
    let value;
    if (intent.kind === 'Image' || intent.kind === 'File') {
      value = withMedia && intent.sourceValue?.src
        ? { src: `/test-only-sustainability/${record.id}-${intent.hint}.${intent.hint === 'icon' ? 'svg' : 'jpg'}`, alt: intent.sourceValue.alt || '' } : {};
    } else if (intent.kind === 'General Link') value = intent.status === 'READY' ? linkValue(intent.logicalValue) : { href: '', text: '', target: '' };
    else value = intent.status === 'READY' ? intent.logicalValue : intent.sourceValue || '';
    data[intent.hint] = field(record, intent.hint, value, intent.kind);
  }
  if (record.orderedChildKeys.length) data.children = { results: record.orderedChildKeys.map(child => native(child, withMedia)) };
  return data;
}
const placement = index => candidate.placements[index - 1];
const datasource = (index, media = false) => native(placement(index).recordKey, media);
const component = index => index === 1 ? Breadcrumbs.Default : index === 2 ? Hero.Default : Cards[placement(index).frontendExport];
const renderPlacement = (index, editing = false, data = datasource(index), params = placement(index).parameters) => render(component(index), data, editing, params);
const anchors = html => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(match => ({ tag: match[0], attrs: match[1], body: match[2] }));
const href = anchor => decode(/\bhref="([^"]*)"/.exec(anchor.attrs)?.[1] || '');
const classTokens = tag => new Set((/class="([^"]*)"/.exec(tag)?.[1] || '').split(/\s+/).filter(Boolean));
function ordered(html, values) {
  let previous = -1;
  for (const value of values) { const next = html.indexOf(value); assert.ok(next > previous, `Missing/out-of-order source token: ${value}`); previous = next; }
}
function metadataMatchesContent(html, wrapped) {
  const value = wrapped.jsonValue.value;
  const populated = typeof value === 'string' ? Boolean(value) : Boolean(value?.src || value?.href);
  assert.equal(html.includes(wrapped.jsonValue.metadata.fieldId), populated, wrapped.jsonValue.metadata.fieldId);
}
function projected(data) {
  return { ...data, children: { results: data.children.results.map(card => ({ id: card.id, links: card.links,
    fieldCollection: Object.entries(card).filter(([name, value]) => name !== 'id' && name !== 'links' && value?.jsonValue).map(([name, value]) => ({ name, jsonValue: value.jsonValue })) })) } };
}

test('source-backed batch keeps eight placements, four finite exports and seven source image fields', () => {
  assert.deepEqual(candidate.placements.map(item => item.frontendExport), ['Default', 'Default', 'EditorialIntro', 'SustainabilityResults', 'SustainabilityPillars', 'Default', 'SustainabilityGlobal', 'SustainabilityRelated']);
  assert.equal(candidate.counts.totalProspectiveCreates, 45);
  assert.equal(candidate.counts.pageFieldIntents, 10);
  const imageIntents = candidate.contentItems.flatMap(item => item.fieldIntents).filter(intent => intent.kind === 'Image' && intent.sourceValue?.src);
  assert.equal(imageIntents.length, 7);
  assert.ok(candidate.heldBindings.length <= 7);
  assert.ok(candidate.heldBindings.every(intent => intent.dependency === 'VERIFIED_PERMANENT_PUBLIC_ORIGINAL_DELIVERY'));
  assert.equal(candidate.sourceProofOverrides.sourceMarkupReceipt.sha256, '0743908b7a1302be9ea34ed1bf440a79b648f7f60f5cb9657786dc33665c68f1');
  for (const index of [4, 5, 7, 8]) assert.equal(typeof component(index), 'function');
});

for (const editing of [false, true]) {
  test(`${editing ? 'editing' : 'visitor'}: eight placements preserve heading hierarchy, copy and structured ownership`, () => {
    const data = candidate.placements.map((_, index) => datasource(index + 1));
    const before = JSON.stringify(data);
    const htmls = data.map((item, index) => renderPlacement(index + 1, editing, item));
    const html = htmls.join('');
    assert.equal(occurrence(html, '<h1'), 1);
    ordered(htmls[0], ['>Home', '>Why Allianz', '>Sustainability']);
    assert.match(htmls[0], /aria-current="page"/);
    assert.ok(htmls[1].includes(source.components[1].fields.data.datasource.heading.jsonValue.value));
    assert.match(htmls[2], /m-axlIntroductionBlock/);
    for (let index = 2; index < data.length; index++) {
      for (const card of data[index].children.results) {
        const body = card.body.jsonValue.value;
        if (body) assert.equal(occurrence(htmls[index], body), 1, `One source body: ${card.id}`);
        if (editing) { metadataMatchesContent(htmls[index], card.body); if (card.heading.jsonValue.value) metadataMatchesContent(htmls[index], card.heading); }
      }
    }
    if (editing) metadataMatchesContent(htmls[1], data[1].heading);
    assert.equal(JSON.stringify(data), before);
  });

  test(`${editing ? 'editing' : 'visitor'}: Results intro precedes three branded numerals and exactly one final Download PDF CTA`, () => {
    const data = datasource(4), html = renderPlacement(4, editing, data);
    ordered(html, [escape(data.heading.jsonValue.value), data.body.jsonValue.value, ...data.children.results.map(card => card.alphanumeral.jsonValue.value), escape(data.primaryLink.jsonValue.value.text)]);
    assert.match(html, /l-container u-row-spacing t-bg-transparent axlTileCollection/);
    assert.match(html, /l-grid--no-gutters-outer/);
    assert.ok(html.includes(`<h2>${escape(data.heading.jsonValue.value)}</h2>`));
    assert.equal(occurrence(html, 'tileIcon -is--wide t-bg-primary-brand t-icon-primary-white'), 3);
    assert.equal(occurrence(html, '<em'), 3);
    assert.equal(occurrence(html, 'class="alphaType"'), 3);
    const pdfs = anchors(html).filter(anchor => href(anchor).endsWith('.pdf'));
    assert.equal(pdfs.length, 1);
    assert.equal(href(pdfs[0]), 'https://www.allianzlife.com/-/media/Files/Allianz/PDFs/community-impact-report-overview.pdf');
    assert.match(pdfs[0].attrs, /target="_blank"/);
    assert.ok(pdfs[0].body.includes(`d="${downloadPath}"`));
    assert.ok(!pdfs[0].body.includes(`d="${arrowPath}"`));
    assert.match(html, /l-grid__row u-margin-bottom-xl/);
    if (editing) { metadataMatchesContent(html, data.heading); metadataMatchesContent(html, data.body); metadataMatchesContent(html, data.primaryLink); data.children.results.forEach(card => metadataMatchesContent(html, card.alphanumeral)); }
  });

  test(`${editing ? 'editing' : 'visitor'}: impact anchor starts first Pillars grid; six h3 cards retain source order across two placements`, () => {
    const first = datasource(5), second = datasource(6);
    const firstHtml = renderPlacement(5, editing, first), secondHtml = renderPlacement(6, editing, second), html = firstHtml + secondHtml;
    assert.equal(occurrence(firstHtml, 'name="impact"'), 1);
    assert.equal(occurrence(secondHtml, 'name="impact"'), 0);
    assert.match(firstHtml, /<div class="l-grid l-grid--max-width"><a name="impact"><\/a>/);
    assert.ok(firstHtml.indexOf('name="impact"') < firstHtml.indexOf(escape(first.heading.jsonValue.value)));
    ordered(html, ['Investing for positive impact', 'Innovating to create new opportunities', 'Elevating sustainability', 'Building stronger communities', 'Protecting the environment', 'Staying true to our values']);
    assert.equal(occurrence(html, '<h3'), 6);
    const links = anchors(html);
    assert.ok(links.some(anchor => href(anchor) === 'https://www.allianzlife.com/-/media/Files/Allianz/PDFs/EXT-1120.pdf' && /target="_blank"/.test(anchor.attrs) && /aria-label="Learn about our responsible investments \(PDF\)"/.test(anchor.attrs)));
    assert.ok(links.some(anchor => href(anchor) === 'https://www.allianz.com/en/sustainability/sustainability-hub/sustainability-at-allianz/climate-change.html' && !/target="_blank"/.test(anchor.attrs)));
  });

  test(`${editing ? 'editing' : 'visitor'}: Global is a framed 67:33 split with medium body and exact source-arrow CTA`, () => {
    const data = datasource(7, true), card = data.children.results[0], html = renderPlacement(7, editing, data);
    const article = /<article\b[^>]*>/.exec(html)?.[0] || '';
    const tokens = classTokens(article);
    for (const name of ['m-axlTile', 'match-height', 'tile--6633', '-is--framed', '-is--split', 't-bg-transparent', 'u-margin-bottom-xl']) assert.ok(tokens.has(name), name);
    assert.ok(!tokens.has('-is--flipped'));
    assert.match(html, /class="tileBody u-font-size-md"/);
    assert.doesNotMatch(html, /tileBody u-font-size-xl/);
    assert.ok(html.includes(card.body.jsonValue.value));
    const cta = anchors(html).find(anchor => href(anchor) === 'https://www.allianz.com/en/sustainability.html');
    assert.ok(cta); assert.match(cta.attrs, /target="_blank"/); assert.ok(cta.body.includes(`d="${arrowPath}"`));
    assert.ok(html.includes(card.image.jsonValue.value.src));
    if (editing) { metadataMatchesContent(html, card.image); metadataMatchesContent(html, card.heading); metadataMatchesContent(html, card.body); metadataMatchesContent(html, card.links.targetItems[0].link); }
  });

  test(`${editing ? 'editing' : 'visitor'}: Related Information is before the intro header; three native cards have no padded card row or footer icon`, () => {
    const data = datasource(8, true), html = renderPlacement(8, editing, data);
    assert.match(html, /^<div class="l-container--full-width t-bg-green-soft"/);
    assert.doesNotMatch(html, /axlTileCollection|m-card__footer/);
    assert.ok(html.includes(`<h2>${escape(data.heading.jsonValue.value)}</h2>`));
    assert.equal(occurrence(html, `d="${informationPath}"`), 1);
    ordered(html, ['tileIcon t-bg-primary-brand t-icon-primary-white', `d="${informationPath}"`, '<header>', escape(data.heading.jsonValue.value), 'class="o-cards o-cards__col3"']);
    const cardRow = /(<div class="l-grid__row[^"]*">)<div class="l-grid__column-medium-12"><div class="o-cards o-cards__col3">/.exec(html)?.[1];
    assert.ok(cardRow); assert.deepEqual([...classTokens(cardRow)], ['l-grid__row']);
    const cards = anchors(html).filter(anchor => classTokens(`<a ${anchor.attrs}>`).has('m-card'));
    assert.equal(cards.length, 3);
    assert.deepEqual(cards.map(href), ['/why-allianz/community', '/why-allianz/inclusion', '/why-allianz/culture']);
    for (const [index, card] of data.children.results.entries()) {
      assert.ok(cards[index].body.includes(escape(card.heading.jsonValue.value)));
      assert.ok(cards[index].body.includes(card.body.jsonValue.value));
      assert.ok(cards[index].body.includes(card.image.jsonValue.value.src));
      assert.match(cards[index].body, /<h4/);
      if (editing) { metadataMatchesContent(html, card.link); metadataMatchesContent(html, card.image); }
    }
    if (editing) metadataMatchesContent(html, data.heading);
  });
}

test('four exact external URLs and original source targets survive visitor and editing SDK rendering', () => {
  const expected = bindings.remainingFrontendImplementation.exactExternalAdmission.fixtureEntries;
  assert.equal(expected.length, 4);
  for (const entry of expected) assert.equal(approvedLinks.entries.filter(row => row.url === entry.url).length, 1, entry.url);
  for (const editing of [false, true]) {
    const html = [4, 5, 6, 7].map(index => renderPlacement(index, editing)).join('');
    for (const entry of expected) {
      const matches = anchors(html).filter(anchor => href(anchor) === entry.url);
      assert.equal(matches.length, 1, entry.url);
      const target = entry.kind === 'public-pdf' || entry.sourceRecordKey === 'sustainability-global' ? '_blank' : '';
      assert.equal(/target="([^"]*)"/.exec(matches[0].attrs)?.[1] || '', target);
      if (target === '_blank') assert.match(matches[0].attrs, /rel="[^"]*noopener[^"]*noreferrer/);
    }
  }
  // Exact entries do not admit new services, mutated PDF names or other origins.
  for (const href of [expected[0].url.replace('.pdf', '-unproved.pdf'), `${expected[2].url}?unproved=1`, 'https://external.example.invalid/']) {
    assert.equal(safeLink({ value: { href, text: 'Test-only unapproved destination', linktype: 'external' } }).value.href,
      href.startsWith('https://www.allianzlife.com/') ? new URL(href).pathname : '#service-unavailable');
  }
});

test('held Original images remain absent from both canvases and keep their Content fields', () => {
  const before = JSON.stringify(candidate);
  for (const index of [2, 3, 7, 8]) {
    const data = datasource(index), visitor = renderPlacement(index, false, data), editor = renderPlacement(index, true, data);
    assert.doesNotMatch(visitor, /<img|src="\/allianz-assets|src="\/test-only-sustainability/);
    const imageOwners = index === 2 ? [data] : data.children.results;
    for (const owner of imageOwners) for (const name of ['desktopImage', 'mobileImage', 'icon', 'image']) {
      if (owner[name] && (index === 2 || name === (index === 3 ? 'icon' : 'image'))) metadataMatchesContent(editor, owner[name]);
    }
  }
  assert.equal(JSON.stringify(candidate), before);
});

test('explicit text and link clears omit canvas controls without source-copy or CTA fallback', () => {
  for (const index of [4, 5, 7, 8]) {
    const data = datasource(index);
    const owner = index === 4 || index === 8 ? data : data.children.results[0];
    const originalHeading = owner.heading.jsonValue.value;
    const originalBody = owner.body?.jsonValue.value;
    owner.heading.jsonValue.value = '';
    if (owner.body) owner.body.jsonValue.value = '';
    const link = index === 4 ? owner.primaryLink : owner.link;
    if (link) link.jsonValue.value = {};
    if (owner.links) owner.links.targetItems.forEach(item => { item.link.jsonValue.value = {}; });
    const before = JSON.stringify(data), visitor = renderPlacement(index, false, data), editor = renderPlacement(index, true, data);
    if (originalHeading) assert.ok(!visitor.includes(escape(originalHeading)));
    if (originalBody) assert.ok(!visitor.includes(originalBody));
    metadataMatchesContent(editor, owner.heading); if (owner.body) metadataMatchesContent(editor, owner.body); if (link && [4, 8].includes(index)) metadataMatchesContent(editor, link);
    if (owner.links) owner.links.targetItems.forEach(item => metadataMatchesContent(editor, item.link));
    assert.equal(JSON.stringify(data), before);
  }
  for (const index of [5, 7]) {
    const data = datasource(index), card = data.children.results[0];
    const scalarHref = card.link.jsonValue.value.href;
    card.link.jsonValue.value = {}; card.links.targetItems = [];
    assert.ok(!anchors(renderPlacement(index, false, data)).some(anchor => href(anchor) === scalarHref), 'Both independent authored link sources are explicitly cleared');
  }
});

test('native fieldCollection projection preserves structured card bodies and editing metadata for all four new exports', () => {
  for (const index of [4, 5, 7, 8]) {
    const data = datasource(index, true), projection = projected(data), before = JSON.stringify(projection);
    assert.equal(renderPlacement(index, false, projection), renderPlacement(index, false, data));
    const editor = renderPlacement(index, true, projection);
    for (const card of data.children.results) metadataMatchesContent(editor, card.body);
    assert.equal(JSON.stringify(projection), before);
  }
});
