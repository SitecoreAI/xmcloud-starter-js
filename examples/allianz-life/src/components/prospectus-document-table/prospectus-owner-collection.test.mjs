import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider, ComponentPropsContext } = require('@sitecore-content-sdk/nextjs');
const { prospectusLinkField } = loadSource(path.join(sourceRoot, 'components/prospectus-document-table/prospectus-document-table.props.ts'));
const { Default: DocumentTable } = loadSource(path.join(sourceRoot, 'components/prospectus-document-table/ProspectusDocumentTable.tsx'));
const { safeLink } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { isVerifiedContentHubDocumentLink } = loadSource(path.join(sourceRoot, 'lib/allianz-verified-documents.ts'));
const owner = '793CF45A-831A-4431-B2E0-DAC7E6E14DC6';
const otherOwner = '00000000-0000-4000-8000-000000000001';
const base = 'https://connect.rightprospectus.com/Allianz';
const destination = `${base}?site=AZ600`;
const variants = [
  {}, { querystring: 'site=AZ600', anchor: '' },
  { href: base, querystring: 'site=AZ600' },
  { href: base, querystring: '?site=AZ600' },
];
const viewerBase = 'https://vpx.broadridge.com/GetContract1.asp';
const viewers = [
  { owner: 'A32C0C37-E5BE-4DAE-84F9-6AEDDF656A50', type: 'isp', text: 'Index Advantage+ Income Initial Summary Prospectus' },
  { owner: '4C72BADA-56D1-4B0E-81F6-FA59C9B39410', type: 'usp', text: 'Index Advantage+ Income Updating Summary Prospectus' },
  { owner: 'B9EAA4AB-4AA3-4907-BF92-ED1CDD47ED52', type: 'pros', text: 'Index Advantage+ Income Statutory Prospectus' },
  { owner: '15D187B6-D7CD-4B02-8495-E185705D067E', type: 'sai', text: 'Index Advantage+ Income SAI' },
].map((entry) => ({ ...entry, query: `doctype=${entry.type}&cid=allianzmft&fid=018815514`,
  url: `${viewerBase}?doctype=${entry.type}&cid=allianzmft&fid=018815514` }));
process.env.NODE_ENV = 'test';

function field(attributes = {}) {
  return { value: { href: destination, text: 'Investment options prospectus', target: '_blank',
    linktype: 'external', title: 'Authored collection title', class: 'authored-collection', rel: 'author', ...attributes },
    metadata: { itemId: owner, fieldId: 'test-only-collection-link', fieldType: 'General Link' } };
}
function renderTable(input, isEditing = false, rowId = owner) {
  const uid = 'test-only-owner-collection';
  const items = Array.isArray(input) ? input : [{ id: rowId, documentLink: { jsonValue: input } }];
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing, isNormal: !isEditing, isPreview: false },
      layout: { sitecore: { context: {}, route: { name: 'Collection test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(ComponentPropsContext, { value: { [uid]: {
    automaticDocuments: { status: 'ready', complete: true, items },
  } } }, React.createElement(DocumentTable, { rendering: { uid, componentName: 'ProspectusDocumentTable' },
    fields: { data: { datasource: {} } } }))));
}
function href(html) {
  return /href="([^"]*)"/.exec(html)?.[1].replaceAll('&amp;', '&');
}

test('only the verified row normalizes the exact collection destination, preserving fields and idempotence', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const rowId of [owner, `{${owner}}`, owner.replaceAll('-', '').toLowerCase()]) {
      for (const attrs of variants) {
        const input = field(attrs), before = JSON.stringify(input);
        const output = prospectusLinkField(input, false, rowId);
        assert.equal(output.value.href, base);
        assert.equal(output.value.querystring, 'site=AZ600');
        assert.equal(output.value.anchor, '');
        assert.strictEqual(output.metadata, input.metadata);
        for (const name of ['text', 'target', 'linktype', 'title', 'class', 'rel']) {
          assert.equal(output.value[name], input.value[name], name);
        }
        assert.deepEqual(prospectusLinkField(output, false, rowId), output);
        assert.strictEqual(prospectusLinkField(input, true, rowId), input);
        assert.equal(JSON.stringify(input), before);
        assert.equal(safeLink(input).value.href, '#service-unavailable');
      }
    }
  }
});

test('installed SDK Default table uses the row owner and retains authored target and editor metadata', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const attrs of variants) {
      const input = field(attrs), before = JSON.stringify(input);
      const html = renderTable(input);
      assert.equal(href(html), destination);
      assert.match(html, /target="_blank"/);
      assert.match(html, /rel="noopener noreferrer"/);
      assert.match(html, /title="Authored collection title"/);
      assert.match(html, /class="authored-collection"/);
      assert.match(html, /Investment options prospectus/);
      const editor = renderTable(input, true);
      assert.match(editor, /test-only-collection-link/);
      assert.match(editor, /target="_blank"/);
      assert.match(editor, /Investment options prospectus/);
      assert.equal(href(renderTable(input, false, otherOwner)), '#service-unavailable');
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('owner, exact URL and external shape are all required; other prospectuses stay unavailable', () => {
  const blocked = [
    { href: base }, { href: `${base}?site=AZ601` },
    { href: `${destination}&extra=1` }, { href: `${destination}&site=AZ600` },
    { href: `${base}?extra=1&site=AZ600` }, { querystring: 'site=AZ601' },
    { querystring: 'site=AZ600&site=AZ600' }, { querystring: 'download=1' },
    { href: `${destination}#funds` }, { href: `${destination}#` }, { anchor: 'funds' },
    { href: destination.replace('connect.', 'foreign.') },
    { href: destination.replace('.com/', '.com.attacker.example/') },
    { href: destination.replace('https:', 'http:') },
    { href: destination.replace('https://', '//') },
    { href: destination.replace('https://', 'https://user@') },
    { href: destination.replace('.com/', '.com:443/') },
    { href: destination.replace('/Allianz', '/%41llianz') },
    { href: ` ${destination}` }, { href: `${destination} ` },
    { id: otherOwner }, { linktype: 'internal' }, { linktype: 'media' },
    { linktype: undefined },
    ...['isp', 'usp', 'pros', 'sai'].map((doctype) => ({
      href: `https://vpx.broadridge.com/GetContract1.asp?doctype=${doctype}&cid=allianzmft&fid=018815514`,
    })),
  ];
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const attrs of blocked) {
      const input = field(attrs), before = JSON.stringify(input);
      const output = prospectusLinkField(input, false, owner);
      assert.equal(output.value.href, '#service-unavailable', JSON.stringify(attrs));
      assert.equal(output.value.target, '');
      assert.equal(output.value.querystring, '');
      assert.equal(output.value.anchor, '');
      assert.strictEqual(output.metadata, input.metadata);
      assert.strictEqual(prospectusLinkField(input, true, owner), input);
      assert.equal(JSON.stringify(input), before);
    }
    for (const rowId of [undefined, '', otherOwner, 'invalid-owner']) {
      assert.equal(prospectusLinkField(field(), false, rowId).value.href, '#service-unavailable');
    }
  }
});

test('cleared fields and editing fields stay original without synthesizing a destination or target', () => {
  for (const input of [field({ href: '' }), { value: {}, metadata: field().metadata }]) {
    for (const editing of [false, true]) assert.strictEqual(prospectusLinkField(input, editing, owner), input);
    assert.doesNotMatch(renderTable(input), /href=|service-unavailable/);
    assert.match(renderTable(input, true), /test-only-collection-link/);
  }
  assert.equal(prospectusLinkField(undefined, false, owner).value.href, '');
  const sameTab = field({ target: '' });
  assert.equal(prospectusLinkField(sameTab, false, owner).value.target, '');
});

function viewerField(entry, attributes = {}) {
  return { ...field({ href: entry.url, text: entry.text, ...attributes }),
    metadata: { itemId: entry.owner, fieldId: `test-only-viewer-${entry.type}`, fieldType: 'General Link' } };
}

for (const entry of viewers) test(`${entry.type}: exact native owner opens only its verified HTML viewer through the installed SDK`, () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const rowId of [entry.owner, `{${entry.owner}}`, entry.owner.replaceAll('-', '').toLowerCase()]) {
      for (const attrs of [{}, { querystring: entry.query },
        { href: viewerBase, querystring: entry.query }, { href: viewerBase, querystring: `?${entry.query}` }]) {
        const input = viewerField(entry, attrs), before = JSON.stringify(input);
        const output = prospectusLinkField(input, false, rowId);
        assert.equal(output.value.href, viewerBase);
        assert.equal(output.value.querystring, entry.query);
        assert.equal(output.value.anchor, '');
        assert.strictEqual(output.metadata, input.metadata);
        for (const name of ['text', 'target', 'linktype', 'title', 'class', 'rel']) {
          assert.equal(output.value[name], input.value[name], name);
        }
        assert.deepEqual(prospectusLinkField(output, false, rowId), output);
        assert.strictEqual(prospectusLinkField(input, true, rowId), input);
        const html = renderTable(input, false, rowId);
        assert.equal(href(html), entry.url);
        assert.match(html, /target="_blank"/);
        assert.match(html, /rel="noopener noreferrer"/);
        assert.ok(html.includes(entry.text));
        assert.match(renderTable(input, true, rowId), new RegExp(`test-only-viewer-${entry.type}`));
        assert.equal(safeLink(input).value.href, '#service-unavailable');
        assert.equal(isVerifiedContentHubDocumentLink(input), false);
        assert.equal(JSON.stringify(input), before);
      }
    }
  }
});

test('installed SDK renders all four owner-paired HTML viewer rows in native order with their editable labels', () => {
  const rows = viewers.map((entry) => ({ id: entry.owner, documentLink: { jsonValue: viewerField(entry) },
    revisionDate: { jsonValue: { value: '5/1/2026' } } }));
  const before = JSON.stringify(rows);
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const html = renderTable(rows);
    assert.deepEqual([...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1].replaceAll('&amp;', '&')),
      viewers.map((entry) => entry.url));
    assert.equal((html.match(/target="_blank"/g) ?? []).length, 4);
    assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 4);
    assert.equal((html.match(/5\/1\/2026/g) ?? []).length, 4);
    const editing = renderTable(rows, true);
    for (const entry of viewers) {
      assert.ok(html.includes(entry.text));
      assert.ok(editing.includes(`test-only-viewer-${entry.type}`));
    }
    assert.equal(JSON.stringify(rows), before);
  }
});

test('HTML viewer pairs reject cross-owner types, alternate URLs and ambiguous query representations', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const entry of viewers) {
      const blocked = [
        { href: viewerBase }, { href: `${entry.url}&extra=1` }, { href: `${entry.url}&${entry.query}` },
        { href: `${viewerBase}?cid=allianzmft&doctype=${entry.type}&fid=018815514` },
        { href: `${viewerBase}?doctype=${entry.type}&fid=018815514&cid=allianzmft` },
        { href: entry.url.replace('018815514', '018817882') },
        { href: entry.url.replace('allianzmft', 'AllianzMFT') },
        { href: entry.url.replace('doctype=', 'Doctype=') },
        { href: entry.url.replace(`doctype=${entry.type}`, `doctype=%${entry.type.charCodeAt(0).toString(16)}${entry.type.slice(1)}`) },
        { href: `${viewerBase}?doctype=${entry.type}`, querystring: 'cid=allianzmft&fid=018815514' },
        { href: `${viewerBase}?doctype=${entry.type}&cid=allianzmft`, querystring: 'fid=018815514' },
        { querystring: 'doctype=wrong&cid=allianzmft&fid=018815514' },
        { querystring: `${entry.query}&extra=1` },
        { href: `${entry.url}#document` }, { href: `${entry.url}#` }, { anchor: 'document' },
        { href: entry.url.replace('https:', 'http:') },
        { href: entry.url.replace('https://', '//') },
        { href: entry.url.replace('https://', 'https://user@') },
        { href: entry.url.replace('.com/', '.com:443/') },
        { href: entry.url.replace('.com/', '.com.attacker.example/') },
        { href: entry.url.replace('vpx.', 'VPX.') },
        { href: entry.url.replace('/GetContract1.asp', '/getcontract1.asp') },
        { href: entry.url.replace('/GetContract1.asp', '/GetContract1.asp/') },
        { href: entry.url.replace('/GetContract1.asp', '/%47etContract1.asp') },
        ...['/SaveHelp.htm', '/save.asp', '/summarydocument.asp', '/print.asp'].map((pathname) => ({
          href: `https://vpx.broadridge.com${pathname}?${entry.query}`,
        })),
        { href: ` ${entry.url}` }, { href: `${entry.url} ` },
        { id: otherOwner }, { linktype: 'internal' }, { linktype: 'media' }, { linktype: undefined },
      ];
      for (const attrs of blocked) {
        const input = viewerField(entry, attrs), before = JSON.stringify(input);
        const output = prospectusLinkField(input, false, entry.owner);
        assert.equal(output.value.href, '#service-unavailable', JSON.stringify(attrs));
        assert.equal(output.value.target, '');
        assert.equal(output.value.querystring, '');
        assert.equal(output.value.anchor, '');
        assert.strictEqual(output.metadata, input.metadata);
        assert.strictEqual(prospectusLinkField(input, true, entry.owner), input);
        assert.equal(JSON.stringify(input), before);
      }
      for (const rowId of [undefined, '', otherOwner, owner, 'invalid-owner',
        ...viewers.filter((other) => other !== entry).map((other) => other.owner)]) {
        const input = viewerField(entry);
        assert.equal(prospectusLinkField(input, false, rowId).value.href, '#service-unavailable');
        if (rowId && rowId !== 'invalid-owner') assert.equal(href(renderTable(input, false, rowId)), '#service-unavailable');
      }
      assert.equal(prospectusLinkField(field(), false, entry.owner).value.href, '#service-unavailable');
    }
  }
});

test('HTML viewer adaptation preserves cleared fields, editor ownership and authored same-tab targets', () => {
  for (const entry of viewers) {
    for (const input of [viewerField(entry, { href: '' }), { value: {}, metadata: viewerField(entry).metadata }]) {
      for (const editing of [false, true]) assert.strictEqual(prospectusLinkField(input, editing, entry.owner), input);
      assert.doesNotMatch(renderTable(input, false, entry.owner), /href=|service-unavailable/);
      assert.ok(renderTable(input, true, entry.owner).includes(`test-only-viewer-${entry.type}`));
    }
    for (const target of ['', '_self', undefined]) {
      const input = viewerField(entry, { target }), before = JSON.stringify(input);
      assert.equal(prospectusLinkField(input, false, entry.owner).value.target, target);
      const html = renderTable(input, false, entry.owner);
      assert.equal(href(html), entry.url);
      if (target === undefined) assert.doesNotMatch(html, /\starget=/);
      else assert.ok(html.includes(`target="${target}"`));
      assert.doesNotMatch(html, /noopener noreferrer/);
      assert.equal(JSON.stringify(input), before);
    }
  }
});
