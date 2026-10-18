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
const owner = '793CF45A-831A-4431-B2E0-DAC7E6E14DC6';
const otherOwner = '00000000-0000-4000-8000-000000000001';
const base = 'https://connect.rightprospectus.com/Allianz';
const destination = `${base}?site=AZ600`;
const variants = [
  {}, { querystring: 'site=AZ600', anchor: '' },
  { href: base, querystring: 'site=AZ600' },
  { href: base, querystring: '?site=AZ600' },
];
process.env.NODE_ENV = 'test';

function field(attributes = {}) {
  return { value: { href: destination, text: 'Investment options prospectus', target: '_blank',
    linktype: 'external', title: 'Authored collection title', class: 'authored-collection', rel: 'author', ...attributes },
    metadata: { itemId: owner, fieldId: 'test-only-collection-link', fieldType: 'General Link' } };
}
function renderTable(input, isEditing = false, rowId = owner) {
  const uid = 'test-only-owner-collection';
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing, isNormal: !isEditing, isPreview: false },
      layout: { sitecore: { context: {}, route: { name: 'Collection test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(ComponentPropsContext, { value: { [uid]: {
    automaticDocuments: { status: 'ready', complete: true, items: [
      { id: rowId, documentLink: { jsonValue: input } },
    ] },
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
