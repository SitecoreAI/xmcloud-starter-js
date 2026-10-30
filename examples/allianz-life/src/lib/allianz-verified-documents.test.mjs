import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Link, SitecoreProvider, ComponentPropsContext } = require('@sitecore-content-sdk/nextjs');
const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { allianzLinkField } = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
const { CoreIncome7ProductResources, EditorialStacked } = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const { prospectusLinkField } = loadSource(path.join(sourceRoot, 'components/prospectus-document-table/prospectus-document-table.props.ts'));
const { Default: DocumentTable } = loadSource(path.join(sourceRoot, 'components/prospectus-document-table/ProspectusDocumentTable.tsx'));
const productBrochures = [
  { name: 'CB95374 Core Income 7 product brochure', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/21d0a45c554a43cf8b28a1612f494e4b?v=95bc816d' },
  { name: 'RFA-001 Retirement Foundation ADV product brochure', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/a1470b7a389f4352b62c1603bfbf01e0?v=58949376' },
];
const destinations = [
  { name: 'Lifetime income percentage chart', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/47d0fbb1e2b6457fa2a595b96dcdccaa?v=27849fc6' },
  { name: 'ADV prospectus supplement', target: '',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/16cb820b40994ca3b7af38d574a44d59?v=d59e0053' },
  { name: 'Index Advantage+ Income lifetime income percentage chart', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/656eaeaaa433418ca03db6fcd7fa3512?v=f87588d4' },
  { name: 'Index Advantage+ Income Benefit Supplement', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/0aafda00578a4eb1a678b2aa04d15595?v=760d2d3b' },
  { name: 'Weatherproofing retirement EXT-1084 fact sheet', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/f109cc47edba46de921fecb735c567ea?v=68ea6fa3' },
  { name: 'CSI-504 Index Lock guide', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/ac0957d84998445e98adffaec3c6402f?v=4cfa94aa' },
  { name: 'ABCPL-001 Benefit Control+ product brochure', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/f2c2be58cff1453f93f24f122d3c30e1?v=1d29b652' },

  ...productBrochures,

  { name: 'M-5391 verified source PDF', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/7782b0dd295b4429815149f2c15039ae?v=71fb078a' },
  { name: 'M-5133 verified source PDF', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/1ea05d7fc4634af481700ebb8d0c65a7?v=37883710' },
  { name: 'AMK-605 verified source PDF', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/bf076ddaeea94fb6860c313589b4bb92?v=5e8d814f' },
  { name: 'LIA-003 verified source PDF', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/35d9e32f7d0f47bc8f54010dfdf4d977?v=f296bdeb' },
  { name: 'LIA-046 verified source PDF', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/96ef14f000424a3cab89e7f3c96fec68?v=6a52fdda' },
  { name: 'LIA-034 verified source PDF', target: '_blank',
    url: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/75abd5399396429db7940b01a1441a4c?v=9338bf84' },
];
process.env.NODE_ENV = 'test';

function field(entry, attributes = {}) {
  return { value: { href: entry.url, text: entry.name, target: entry.target,
    linktype: 'external', title: 'Authored PDF title', class: 'authored-pdf', rel: 'author', ...attributes },
    metadata: { itemId: 'test-only-pdf-row', fieldId: 'test-only-document-link', fieldType: 'General Link' } };
}
function render(child, isEditing = false) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing, isNormal: !isEditing, isPreview: false },
      layout: { sitecore: { context: {}, route: { name: 'Verified PDF test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, child));
}
function renderLink(input, editing = false) {
  const adapted = allianzLinkField(input, editing);
  return render(React.createElement(Link, {
    ...(editing ? { field: adapted } : safeLinkRenderProps(adapted)),
    editable: editing,
  }), editing);
}
function renderTable(input, editing = false) {
  const uid = 'test-only-prospectus-table';
  return render(React.createElement(ComponentPropsContext, { value: { [uid]: {
    automaticDocuments: { status: 'ready', complete: true, items: [
      { id: '00000000-0000-4000-8000-000000000001', documentLink: { jsonValue: input } },
    ] },
  } } }, React.createElement(DocumentTable, { rendering: { uid, componentName: 'ProspectusDocumentTable' },
    fields: { data: { datasource: {} } } })), editing);
}
function href(html) {
  return /href="([^"]*)"/.exec(html)?.[1].replaceAll('&amp;', '&');
}

test('native product resource variants retain exact verified brochure links and reject an unregistered DAM document', () => {
  const variants = [CoreIncome7ProductResources, EditorialStacked];
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [index, entry] of productBrochures.entries()) {
      for (const registered of [true, false]) {
        const input = field(entry, registered ? {} : {
          href: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/00000000000000000000000000000000?v=95bc816d',
        });
        const before = JSON.stringify(input);
        const markup = render(React.createElement(variants[index], {
          params: {},
          rendering: { uid: 'test-only-product-resources', componentName: 'AllianzCardGrid' },
          fields: { data: { datasource: { children: { results: [{
            id: 'test-only-brochure-card',
            fieldCollection: [{ name: 'links', jsonValue: [{
              id: 'test-only-brochure-link', fields: { link: input },
            }] }],
          }] } } } },
        }));
        assert.equal(href(markup), registered ? entry.url : '#service-unavailable');
        assert.match(markup, registered ? /target="_blank"/ : /target=""/);
        assert.equal(markup.includes('noopener noreferrer'), registered);
        assert.equal(markup.includes(' download='), false);
        assert.equal(JSON.stringify(input), before);
      }
    }
  }
});

for (const entry of destinations) test(`${entry.name}: installed SDK preserves exact visitor destination and editing ownership`, () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const parsed = new URL(entry.url);
    for (const attrs of [
      {}, { querystring: parsed.search.slice(1), anchor: '' },
      { href: `${parsed.origin}${parsed.pathname}`, querystring: parsed.search.slice(1) },
      { href: `${parsed.origin}${parsed.pathname}`, querystring: parsed.search },
    ]) {
      const input = field(entry, attrs), before = JSON.stringify(input);
      const normalized = safeLink(input);
      assert.equal(normalized.value.href, `${parsed.origin}${parsed.pathname}`);
      assert.equal(normalized.value.querystring, parsed.search.slice(1));
      assert.equal(normalized.value.anchor, '');
      assert.deepEqual(safeLink(normalized), normalized);
      assert.strictEqual(normalized.metadata, input.metadata);
      for (const attribute of ['text', 'target', 'title', 'class', 'linktype', 'rel']) {
        assert.equal(normalized.value[attribute], input.value[attribute], attribute);
      }
      for (const editing of [false, true]) {
        const html = renderLink(input, editing);
        // Visitors receive normalized SDK props. Editors retain the authored
        // field, including synthetic inputs with both full and split queries.
        if (!editing) assert.equal(href(html), entry.url);
        assert.ok(html.includes(`target="${entry.target}"`));
        assert.ok(html.includes(entry.name));
        assert.match(html, /title="Authored PDF title"/);
        assert.match(html, /class="authored-pdf"/);
        assert.equal(html.includes('noopener noreferrer'), entry.target === '_blank');
        if (editing) assert.match(html, /test-only-document-link/);
      }
      assert.strictEqual(allianzLinkField(input, true), input);
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('six source-matched PDF additions preserve either authored target without changing their destination', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const entry of destinations.slice(-6)) {
      for (const target of ['', '_blank']) {
        const input = field(entry, { target }), before = JSON.stringify(input);
        const markup = renderLink(input);
        assert.equal(href(markup), entry.url);
        assert.ok(markup.includes(`target="${target}"`));
        assert.equal(markup.includes('noopener noreferrer'), target === '_blank');
        assert.equal(safeLink(input).value.target, target);
        assert.equal(JSON.stringify(input), before);
      }
    }
  }
});

test('real prospectus table admits only the same verified destinations, keeping editing ownership and authored target', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const entry of destinations) {
      const input = field(entry), before = JSON.stringify(input);
      assert.equal(href(renderTable(input)), entry.url);
      assert.ok(renderTable(input).includes(`target="${entry.target}"`));
      assert.equal(renderTable(input).includes('noopener noreferrer'), entry.target === '_blank');
      assert.strictEqual(prospectusLinkField(input, true), input);
      assert.match(renderTable(input, true), /test-only-document-link/);
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('same-host URLs, changed versions, ambiguous queries, fragments and alternate authority forms stay unavailable', () => {
  for (const entry of destinations) {
    const parsed = new URL(entry.url), base = `${parsed.origin}${parsed.pathname}`, version = parsed.search.slice(1);
    const cases = [
      { href: base }, { href: `${base}?v=wrong` }, { href: `${entry.url}&extra=1` },
      { href: `${base}?extra=1&${version}` }, { href: `${entry.url}&${version}` },
      { querystring: 'v=wrong' }, { querystring: 'download=1' },
      { href: `${entry.url}#page-2` }, { href: `${entry.url}#` },
      { href: `${entry.url}#demo-unavailable` }, { anchor: 'service-unavailable' }, { anchor: '#page-2' },
      { href: `${base}?${version}%23page-2` },
      { href: entry.url.replace('/content/', '/content/other-') },
      { href: entry.url.replace('/api/', '/%61pi/') },
      { href: entry.url.replace('https:', 'http:') },
      { href: entry.url.replace('https://', '//') },
      { href: entry.url.replace('https://', 'https://user@') },
      { href: entry.url.replace('.cloud/', '.cloud:443/') },
      { href: entry.url.replace('.cloud/', '.cloud.attacker.example/') },
      { href: ` ${entry.url}` }, { href: `${entry.url} ` },
      { linktype: 'internal' }, { linktype: 'media' },
      { id: '{00000000-0000-4000-8000-000000000002}' },
    ];
    for (const mode of ['fixture', 'connected']) {
      process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
      for (const attrs of cases) {
        const input = field(entry, attrs), before = JSON.stringify(input);
        for (const adapt of [safeLink, (value) => prospectusLinkField(value, false)]) {
          const blocked = adapt(input);
          assert.equal(blocked.value.href, '#service-unavailable', JSON.stringify(attrs));
          assert.equal(blocked.value.target, '');
          assert.equal(blocked.value.querystring, '');
          assert.equal(blocked.value.anchor, '');
          assert.strictEqual(blocked.metadata, input.metadata);
        }
        assert.strictEqual(prospectusLinkField(input, true), input);
        assert.equal(JSON.stringify(input), before);
      }
    }
  }
});

test('disabled services, social destinations and third-party prospectuses retain their existing boundary', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const url of [
      '#demo-unavailable', '#service-unavailable',
      'https://www.allianzlife.com/login', 'https://www.allianzlife.com/account',
      'https://www.facebook.com/AllianzLife', 'https://www.linkedin.com/company/allianz-life',
      'https://vpx.broadridge.com/GetContract1.asp?doctype=usp&cid=allianzmft&fid=018817882',
      'https://vpx.broadridge.com/GetContract1.asp?doctype=isp&cid=allianzmft&fid=018815514',
      'https://vpx.broadridge.com/GetContract1.asp?doctype=usp&cid=allianzmft&fid=018815514',
      'https://vpx.broadridge.com/GetContract1.asp?doctype=pros&cid=allianzmft&fid=018815514',
      'https://vpx.broadridge.com/GetContract1.asp?doctype=sai&cid=allianzmft&fid=018815514',
      'https://connect.rightprospectus.com/Allianz?site=AZ600',
      'https://www.rightprospectus.com/documents/contract.pdf',
      'https://www.allianzlife.com/unverified-document.pdf',
      'https://thlt-demo.sitecoresandbox.cloud/api/public/content/00000000000000000000000000000000?v=95bc816d',
      'https://[invalid', 'javascript:alert(1)', 'data:application/pdf;base64,JVBER',
    ]) {
      const input = field({ ...destinations[0], url });
      // Connected official page navigation is deliberately broader than document approval.
      if (!url.endsWith('/unverified-document.pdf')) assert.equal(safeLink(input).value.href, '#service-unavailable', url);
      assert.equal(prospectusLinkField(input, false).value.href, '#service-unavailable', url);
    }
  }
});

test('cleared fields remain the original field in visitor and editing adapters', () => {
  const input = field(destinations[0], { href: '', target: '_blank' });
  assert.strictEqual(safeLink(input), input);
  assert.strictEqual(prospectusLinkField(input, false), input);
  assert.strictEqual(prospectusLinkField(input, true), input);
});
