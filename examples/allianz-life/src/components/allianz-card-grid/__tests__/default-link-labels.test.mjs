import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

// Real installed SDK Link and SitecoreProvider. No network, browser or CMS calls.
const Cards = loadSource(process.env.CARDGRID_LABEL_SOURCE || path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const fixture = JSON.parse(fs.readFileSync(new URL('./default-link-labels.fixture.json', import.meta.url), 'utf8'));
const params = { layout: 'stacked', columns: '4', headingLevel: 'h3', alignment: 'left', theme: 'transparent' };
const field = (name, value, type = 'General Link') => ({ jsonValue: { value, metadata: {
  fieldId: `test-${name}`, fieldType: type, itemId: `test-item-${name}`,
} } });
const decode = (value) => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const anchors = (html) => [...html.matchAll(/<a\b([^>]*?)>([^]*?)<\/a>/g)].map((match) => ({
  attrs: Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [attr[1], decode(attr[2])])),
  body: match[2],
}));
function datasource(labelKey = 'aria-label') {
  return { children: { results: fixture.links.map((link) => ({
    id: link.key,
    heading: field(`${link.key}-heading`, link.heading, 'Single-Line Text'),
    body: field(`${link.key}-body`, link.body, 'Rich Text'),
    link: field(`${link.key}-scalar`, {}),
    links: { targetItems: [{ id: `${link.key}-ordered`, link: field(`${link.key}-link`, {
      href: link.href, text: link.text, target: link.target, [labelKey]: link.ariaLabel,
    }) }] },
  })) } };
}
const shown = (data, editing = true, variant = 'Default', override = params) => render(Cards[variant], data, editing, override);
const linkField = (data, i = 0) => data.children.results[i].links.targetItems[0].link.jsonValue;

for (const labelKey of ['aria-label', 'ariaLabel']) {
  test(`Default preserves the four exact source media labels from ${labelKey} in the real SDK editor`, () => {
    const data = datasource(labelKey), before = JSON.stringify(data);
    const html = shown(data), links = anchors(html);
    assert.equal(links.length, 4);
    links.forEach(({ attrs, body }, i) => {
      const expected = fixture.links[i];
      assert.equal(attrs['aria-label'], expected.ariaLabel);
      assert.equal(attrs.href, expected.href);
      assert.equal(attrs.target, '_blank');
      assert.equal(attrs.class, 'a-link');
      assert.match(body, /class="a-link__icon" aria-hidden="true"/);
      assert.ok(body.includes(`<span class="a-link__text">${expected.text}</span>`));
      assert.ok(html.includes(`test-${expected.key}-link`), 'General Link editor metadata remains mounted');
    });
    assert.equal(JSON.stringify(data), before);
  });
}

test('Default visitor output retains labels without changing the existing external-service safety policy', () => {
  const data = datasource(), before = JSON.stringify(data), links = anchors(shown(data, false));
  assert.equal(links.length, 4);
  links.forEach(({ attrs }, i) => {
    assert.equal(attrs['aria-label'], fixture.links[i].ariaLabel);
    assert.equal(attrs.href, '#service-unavailable');
    assert.ok(!attrs.target);
    assert.equal(attrs.title, 'This service is unavailable');
  });
  assert.equal(JSON.stringify(data), before);
});

test('local visitor links retain official-host normalization, query, fragment, target and authored label', () => {
  const data = datasource(); data.children.results = data.children.results.slice(0, 1);
  linkField(data).value = { href: 'http://www.allianzlife.com/about?first=1&first=2#overview',
    querystring: 'next=3', text: 'About', target: '_blank', 'aria-label': 'Read About Allianz' };
  const [link] = anchors(shown(data, false));
  assert.equal(link.attrs.href, '/about?first=1&first=2&next=3#overview');
  assert.equal(link.attrs.target, '');
  assert.equal(link.attrs['aria-label'], 'Read About Allianz');
});

test('the verified EXT-1084 destination works through ordered card links without losing labels or editing ownership', () => {
  const url = 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/f109cc47edba46de921fecb735c567ea?v=68ea6fa3';
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const data = datasource(); data.children.results = data.children.results.slice(0, 1);
    const native = linkField(data);
    native.value = { href: url, text: 'Fact sheet', target: '_blank', linktype: 'external',
      'aria-label': 'Download the Weatherproofing retirement fact sheet' };
    const before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = shown(data, editing), [link] = anchors(html);
      assert.equal(link.attrs.href, url);
      assert.equal(link.attrs.target, '_blank');
      assert.equal(link.attrs['aria-label'], native.value['aria-label']);
      assert.ok(link.body.includes('Fact sheet'));
      if (editing) assert.ok(html.includes(native.metadata.fieldId));
      else assert.match(link.attrs.rel, /noopener/);
    }
    assert.equal(JSON.stringify(data), before);
    native.value.href = url.replace('v=68ea6fa3', 'v=unverified');
    const [blocked] = anchors(shown(data, false));
    assert.equal(blocked.attrs.href, '#service-unavailable');
    assert.ok(!blocked.attrs.target);
    assert.ok(shown(data, true).includes(native.metadata.fieldId));
  }
});

const verifiedProductDocuments = [
  { variant: 'AA5Features', explicitAria: true },
  { variant: 'CoreIncome7ProductFeatures' },
  { variant: 'BenefitControlPlusProductFeatures' },
  { variant: 'ClassicProductFeatures' },
  { variant: 'AAPlusProductFeaturesContinuation' },
  { variant: 'BenefitControlPlusProductResources', brochure: true },
];
for (const entry of verifiedProductDocuments) test(`${entry.variant}: verified product PDF keeps native link ownership, labels and visitor destination`, () => {
  const url = entry.brochure
    ? 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/f2c2be58cff1453f93f24f122d3c30e1?v=1d29b652'
    : 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/ac0957d84998445e98adffaec3c6402f?v=4cfa94aa';
  const text = entry.brochure ? 'Download the product brochure (PDF)' : 'See how Index Lock works (PDF)';
  const parsed = new URL(url);
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const splitQuery of [false, true]) for (const projected of [false, true]) {
      const data = datasource(); data.children.results = data.children.results.slice(0, 1);
      const native = linkField(data);
      native.value = { href: splitQuery ? `${parsed.origin}${parsed.pathname}` : url,
        ...(splitQuery ? { querystring: parsed.search.slice(1) } : {}),
        text, target: '_blank', linktype: 'external',
        ...(entry.explicitAria ? { 'aria-label': text } : {}) };
      if (projected) {
        const card = data.children.results[0];
        data.children.results[0] = { id: card.id, fieldCollection: [
          { name: 'heading', jsonValue: card.heading.jsonValue },
          { name: 'body', jsonValue: card.body.jsonValue },
          { name: 'links', jsonValue: [{ id: card.links.targetItems[0].id, fields: { Link: native } }] },
        ] };
      }
      const before = JSON.stringify(data);
      for (const editing of [false, true]) {
        const html = shown(data, editing, entry.variant), links = anchors(html);
        assert.equal(links.length, 1);
        const [link] = links;
        assert.equal(link.attrs.href, url);
        assert.equal(link.attrs['aria-label'], text);
        assert.equal(link.attrs.target, '_blank');
        assert.match(link.attrs.rel, /noopener/);
        assert.match(link.attrs.rel, /noreferrer/);
        assert.ok(link.body.includes(text));
        if (editing) assert.ok(html.includes(native.metadata.fieldId));
      }
      assert.equal(JSON.stringify(data), before);
      native.value.href = `${parsed.origin}${parsed.pathname}`;
      native.value.querystring = 'v=unverified';
      const blockedBefore = JSON.stringify(data);
      const [blocked] = anchors(shown(data, false, entry.variant));
      assert.equal(blocked.attrs.href, '#service-unavailable');
      assert.ok(!blocked.attrs.target);
      assert.ok(shown(data, true, entry.variant).includes(native.metadata.fieldId));
      assert.equal(JSON.stringify(data), blockedBefore);
    }
  }
});

test('missing, empty and malformed labels add no aria-label or synthetic accessible name', () => {
  for (const value of [undefined, '', null, false, 42, {}, []]) {
    const data = datasource();
    for (const card of data.children.results) card.links.targetItems[0].link.jsonValue.value['aria-label'] = value;
    for (const editing of [false, true]) for (const { attrs } of anchors(shown(data, editing))) {
      assert.equal(Object.hasOwn(attrs, 'aria-label'), false);
    }
  }
});

test('label clearing and restoring does not borrow heading or link text and preserves field metadata', () => {
  const data = datasource(), initial = shown(data), native = linkField(data), metadata = native.metadata;
  const label = native.value['aria-label'];
  native.value['aria-label'] = '';
  assert.equal(anchors(shown(data))[0].attrs['aria-label'], undefined);
  assert.equal(native.metadata, metadata);
  native.value['aria-label'] = label;
  assert.equal(shown(data), initial);
});

test('cleared link href stays absent from both canvases and preserves the Content field', () => {
  const data = datasource(); data.children.results = data.children.results.slice(0, 1);
  const native = linkField(data); native.value = { href: '', text: '', 'aria-label': '' };
  const before = JSON.stringify(data);
  assert.equal(anchors(shown(data, false)).length, 0);
  const editing = shown(data);
  assert.ok(!editing.includes('test-link-13-link'));
  assert.doesNotMatch(editing, /aria-label=|href="\/"/);
  assert.equal(JSON.stringify(data), before);
  delete data.children.results[0].links;
  delete data.children.results[0].link;
  assert.equal(anchors(shown(data)).length, 0);
});

test('scalar fallback links and modern fieldCollection ordered links preserve labels without mutating native fields', () => {
  const named = datasource('ariaLabel'), projected = structuredClone(named);
  projected.children.results = projected.children.results.map((card) => ({ id: card.id, fieldCollection: [
    { name: 'heading', jsonValue: card.heading.jsonValue },
    { name: 'body', jsonValue: card.body.jsonValue },
    { name: 'link', jsonValue: card.link.jsonValue },
    { name: 'links', jsonValue: card.links.targetItems.map((item) => ({ id: item.id, fields: { Link: item.link.jsonValue } })) },
  ] }));
  const before = JSON.stringify(projected);
  for (const editing of [false, true]) assert.equal(shown(projected, editing), shown(named, editing));
  assert.equal(JSON.stringify(projected), before);
  for (const card of named.children.results) { card.link = card.links.targetItems[0].link; delete card.links; }
  assert.deepEqual(anchors(shown(named)).map(({ attrs }) => attrs['aria-label']), fixture.links.map((link) => link.ariaLabel));
});

test('labels are escaped as text attributes and current camel-case alias precedence is retained', () => {
  const data = datasource(); data.children.results = data.children.results.slice(0, 1);
  const value = linkField(data).value;
  value.ariaLabel = 'Read "A&B" <guide> onfocus="bad"'; value['aria-label'] = 'Secondary alias';
  const [link] = anchors(shown(data));
  assert.equal(link.attrs['aria-label'], value.ariaLabel);
  assert.equal(Object.hasOwn(link.attrs, 'onfocus'), false);
  value.ariaLabel = '';
  assert.equal(anchors(shown(data))[0].attrs['aria-label'], 'Secondary alias');
});

test('shared RILA and FAQ footer variants gain the same authored label without losing variant classes', () => {
  for (const [variant, expected] of [['RilaPromotion', /tile--6633 -is--split -is--flipped/],
    ['FaqHelp', /allianz-faq-cards/], ['FaqProfessional', /tile--stackedImage -is--stacked/]]) {
    const html = shown(datasource(), true, variant);
    assert.match(html, expected);
    assert.deepEqual(anchors(html).map(({ attrs }) => attrs['aria-label']), fixture.links.map((link) => link.ariaLabel));
  }
});
