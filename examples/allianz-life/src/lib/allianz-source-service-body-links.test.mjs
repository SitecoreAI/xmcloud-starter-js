import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./allianz-source-service-body-links.fixture.json', import.meta.url), 'utf8'));
const retained = JSON.parse(fs.readFileSync(new URL('./allianz-retained-native-body-assets.fixture.json', import.meta.url), 'utf8'));
const policy = loadSource(path.join(sourceRoot, 'lib/allianz-native-body-links.ts'));
const { safeLink } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const React = require('react'), sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const Accordion = loadSource(path.join(sourceRoot, 'components/allianz-accordion/AllianzAccordion.tsx'));
process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';

// Independent source/owner oracle from the witnessed Claims/FAQ field matrix.
const PHONE = ['tel:800-950-1962', 'tel:800-624-0197'];
const MAIL = [
  'mailto:fixedannuity@send.allianzlife.com?subject=Fixed Annuity Document',
  'mailto:variableannuity@send.allianzlife.com?subject=Variable Annuity Document',
  'mailto:lifeinsurance@send.allianzlife.com?subject=Life Insurance Document',
];
const expectedPairs = [
  ['AllianzCardGrid', 'a1f100d06ce24cca8cec282873ddde28', '3f2f9cc424bb40ab8a276379f11e6357', PHONE],
  ['AllianzCardGrid', '08fb929580cd439e95868ad5bb1ffd2f', 'f25567668e784f6aa3a6b095b467b984', PHONE],
  ['AllianzAccordion', '5e25a48649b44f309d34fc3378960cb9', '9625b30455e84a28bc8225120b016aec', ['tel:800-950-3347']],
  ...[
    ['e429aff2b27a4673b2108bf3f7372930', 3],
    ['cc502c7b7ac24b1ba9ce929911814d47', 3],
    ['7869d6b690924bef9e2d8f0fac3b84ae', 3],
    ['0669e118a2044477a17219fee6d0ec2c', 2],
  ].map(([entry, count]) => ['AllianzAccordion', '7a373530bf2a415cb3f3816889f55061', entry, MAIL.slice(0, count)]),
  ['AllianzAccordion', '77365a0a946848af98dfdc357a4c596f', 'eb99e34bf812436b8e616637d219b1b9', MAIL],
  ['AllianzAccordion', '4a4de2a435ea49b2802c4ad7426758ea', '91e0af244b3845d7a95682f0ce6222aa', ['http://www.naic.org/state_web_map.htm', 'http://www.finra.org/']],
];
const key = ({ componentName, datasourceId, entryId }) => `${componentName}:${datasourceId}:${entryId}`;
const context = (owner) => ({ componentName: owner.componentName, datasourceId: owner.datasourceId, entryId: owner.entryId });
const zero = '00000000000000000000000000000000';
const body = (href) => `<p>Before <strong>preserved</strong> <a href="${href}" data-source-marker="keep"${href.startsWith('http:') ? ' target="_blank" rel="author-token"' : ''}>Source contact</a> after &amp; retained.</p>`;
const field = (value, owner) => ({ value, metadata: { itemId: owner.entryId, fieldId: 'test-only-service-body', fieldType: 'Rich Text' } });
const freeze = (value) => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

test('source service scope is exactly nine witnessed owners and 21 href occurrences', () => {
  const actual = fixture.owners.map(o => [o.componentName, o.datasourceId, o.entryId, o.hrefs]);
  assert.deepEqual(actual, expectedPairs);
  assert.equal(fixture.owners.reduce((n, o) => n + o.hrefs.length, 0), 21);
  assert.equal(new Set(fixture.owners.map(key)).size, 9);
  const excluded = new Set(retained.excludedBodyOwners.map(key));
  for (const owner of fixture.owners) assert.equal(excluded.has(key(owner)), false);
  for (const pin of fixture.sourcePins) {
    assert.equal(pin.httpStatus, 200);
    assert.match(pin.htmlSHA256, /^[0-9a-f]{64}$/);
    assert.match(pin.url, /^https:\/\/www\.allianzlife\.com\/(claims-information|customer-service-frequently-asked-questions)$/);
  }
});

for (const owner of fixture.owners) for (const href of owner.hrefs) {
  test(`source service Body keeps exact ${owner.entryId}:${href}`, () => {
    const original = freeze(field(body(href), owner));
    const out = policy.safeNativeBodyRichText(original, false, context(owner));
    assert.equal(policy.isUnavailableNativeBodyHref(href, href, context(owner)), false);
    assert.equal(out.value, original.value);
    assert.equal(out.metadata, original.metadata);
    assert.equal(policy.safeNativeBodyRichText(original, true, context(owner)), original);
    // The scalar General Link contract receives no protocol or domain expansion.
    assert.equal(safeLink({ value: { href } }).value.href, '#service-unavailable');
  });
}

test('service exceptions require exact component, datasource, entry and strict native IDs', () => {
  for (const owner of fixture.owners) for (const href of owner.hrefs) {
    const valid = context(owner);
    for (const invalid of [undefined, { ...valid, componentName: 'AllianzRichText' },
      { ...valid, componentName: valid.componentName === 'AllianzCardGrid' ? 'AllianzAccordion' : 'AllianzCardGrid' },
      { ...valid, datasourceId: zero }, { ...valid, entryId: zero },
      { ...valid, datasourceId: `prefix-${valid.datasourceId}` },
      { ...valid, entryId: `${valid.entryId}-suffix` },
      { ...valid, datasourceId: `{${valid.datasourceId}` },
      { ...valid, entryId: `${valid.entryId}}` }]) {
      assert.equal(policy.isUnavailableNativeBodyHref(href, href, invalid), true);
      assert.match(policy.safeNativeBodyRichText(field(body(href), owner), false, invalid).value, /href="#service-unavailable"/);
    }
    const guid = value => `{${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}}`.toUpperCase();
    assert.equal(policy.isUnavailableNativeBodyHref(href, href, { ...valid,
      datasourceId: guid(valid.datasourceId), entryId: guid(valid.entryId) }), false);
  }
});

test('source service exceptions reject URI near matches, extra headers, encoding and CRLF', () => {
  for (const owner of fixture.owners) for (const href of owner.hrefs) {
    for (const value of [href + '?unregistered=1', href + '#unregistered', href + '&bcc=other@example.invalid',
      href + '%0d%0aBcc:other@example.invalid', href + '%250d%250aBcc:other@example.invalid',
      href + '\r\nBcc:other@example.invalid', href + '\u0000', ' ' + href, href + ' ',
      href.replace(':', ':%0a'), href.replace(':', ':\t'), href.replace(':', ':\r\n')]) {
      assert.equal(policy.isUnavailableNativeBodyHref(value, value, context(owner)), true, value);
    }
    assert.equal(policy.isUnavailableNativeBodyHref(href, href.replace(':', '&#58;'), context(owner)), true);
    for (const encoded of [href.replace(':', '&#58;'), href.replace(':', '&#x3a;'), href.replace(':', '&colon;')]) {
      assert.match(policy.safeNativeBodyRichText(field(body(encoded), owner), false, context(owner)).value,
        /href="#service-unavailable"/);
    }
    if (href.startsWith('mailto:')) {
      for (const value of [href.replace('mailto:', 'MAILTO:'), href.replaceAll(' ', '%20'),
        href.replace('subject=', 'Subject='), href.replace('@send.', '@other.'),
        href.replace(' Document', ' Document&cc=other@example.invalid')]) {
        assert.equal(policy.isUnavailableNativeBodyHref(value, value, context(owner)), true, value);
      }
      assert.equal(policy.isUnavailableNativeBodyHref(href, href.replaceAll(' ', '&#32;'), context(owner)), true);
      assert.match(policy.safeNativeBodyRichText(field(body(href.replaceAll(' ', '&#32;')), owner), false, context(owner)).value,
        /href="#service-unavailable"/);
    }
    if (href.startsWith('tel:')) assert.equal(policy.isUnavailableNativeBodyHref(href.toUpperCase(), href.toUpperCase(), context(owner)), true);
    if (href.startsWith('http:')) for (const value of [href.replace('http:', 'https:'),
      href.replace('www.', 'other.'), href.replace('http://', 'http://user@'), href.replace('www.', 'WWW.')]) {
      assert.equal(policy.isUnavailableNativeBodyHref(value, value, context(owner)), true, value);
    }
  }
});

test('service contracts never reconstruct placeholders or alter held owners, empty fields or generic internal links', () => {
  for (const owner of fixture.owners) {
    for (const href of ['#demo-unavailable', '#service-unavailable']) {
      const original = freeze(field(body(href), owner));
      assert.equal(policy.safeNativeBodyRichText(original, false, context(owner)).value, original.value);
    }
    assert.equal(policy.safeNativeBodyRichText(undefined, false, context(owner)), undefined);
    const empty = freeze(field('', owner));
    assert.equal(policy.safeNativeBodyRichText(empty, false, context(owner)), empty);
    assert.equal(policy.isUnavailableNativeBodyHref('/about', '/about', context(owner)), false);
  }
  for (const owner of retained.excludedBodyOwners) {
    const original = freeze(field(body('mailto:unknown@example.invalid'), owner));
    assert.equal(policy.isExcludedNativeBodyOwner(context(owner)), true);
    assert.equal(policy.safeNativeBodyRichText(original, false, context(owner)), original);
  }
});

for (const mode of ['normal', 'preview', 'editing']) test(`actual SDK ${mode} retains all 21 exact service hrefs with text and target ownership`, () => {
  let count = 0;
  for (const owner of fixture.owners) for (const href of owner.hrefs) {
    const entry = { id: owner.entryId, heading: { jsonValue: { value: 'Fixture heading' } }, body: { jsonValue: field(body(href), owner) } };
    const data = { id: owner.datasourceId, heading: { jsonValue: { value: 'Fixture group' } }, children: { results: [entry] } };
    const page = { siteName: 'allianz-life', mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      layout: { sitecore: { context: { site: { name: 'allianz-life' }, language: 'en' }, route: {
        itemId: owner.componentName === 'AllianzCardGrid' ? '020ebca91af55887b0716295be26d994' : '2dd1fc4fa1bb5c21bcb050f018920742', name: 'Service test fixture', fields: {}, placeholders: {},
      } } } };
    const Component = owner.componentName === 'AllianzCardGrid' ? Cards.Default : Accordion.Default;
    const html = renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, { page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}) },
      React.createElement(Component, { fields: { data: { datasource: data } }, params: { layout: 'stacked', columns: '1', alignment: 'left', theme: 'transparent', headingLevel: 'h3' } })));
    assert(html.includes(body(href)), `${owner.entryId}:${href}`);
    assert.equal(entry.body.jsonValue.metadata.itemId, owner.entryId);
    count++;
  }
  assert.equal(count, 21);
});
