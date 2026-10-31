import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const { safeLink } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { allianzLinkField } = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
const { Default: Footer } = loadSource(path.join(sourceRoot, 'components/allianz-footer/AllianzFooter.tsx'));
const { prospectusLinkField } = loadSource(path.join(sourceRoot, 'components/prospectus-document-table/prospectus-document-table.props.ts'));
const registry = JSON.parse(fs.readFileSync(new URL('./approved-source-external-links.fixture.json', import.meta.url), 'utf8'));
const destinations = [
  ['careers', 'Careers', 'https://careers.allianz.com/US/go/Allianz-US-Life/5140601/'],
  ['facebook', 'Facebook', 'https://www.facebook.com/AllianzLife'],
  ['linkedin', 'LinkedIn', 'https://www.linkedin.com/company/allianz-life'],
  ['twitter', 'Twitter', 'https://twitter.com/allianzlife'],
  ['instagram', 'Instagram', 'https://www.instagram.com/allianzlife/'],
  ['youtube', 'YouTube', 'https://www.youtube.com/user/allianzus'],
];
process.env.NODE_ENV = 'test';

function field(url, attributes = {}) {
  return { value: { href: url, text: 'Source footer link', linktype: 'external', target: '_blank', ...attributes },
    metadata: { itemId: 'test-only-footer-item', fieldId: 'test-only-footer-link', fieldType: 'General Link' } };
}
function item(key, label, input) {
  return { id: `test-only-footer-${key}`, title: { jsonValue: { value: label } }, link: { jsonValue: input } };
}
function footerData(inputs) {
  const [careers, ...social] = destinations.map(([key, label], index) => item(key, label, inputs[index]));
  return { primaryNav: { targetItems: [{ id: 'test-only-about-group', title: { jsonValue: { value: 'About' } },
    children: { results: [careers] } }] }, socialNav: { targetItems: social } };
}
function anchors(markup) {
  return [...markup.matchAll(/<a\b[^>]*>/g)].map(([tag]) => ({
    href: /href="([^"]*)"/.exec(tag)?.[1].replaceAll('&amp;', '&'),
    target: /target="([^"]*)"/.exec(tag)?.[1],
  }));
}

test('footer public registry contains only the six exact captured outgoing destinations', () => {
  assert.deepEqual(registry.entries.filter(({ sourceRecordKey }) => sourceRecordKey.startsWith('footer-public-')),
    destinations.map(([key, , url]) => ({ kind: 'public-page', url, sourceRecordKey: `footer-public-${key}` })));
  assert.ok(registry.sourcePins.some((pin) => pin.url === 'https://www.allianzlife.com/get-answers'
    && pin.sourceHtmlSha256 === '83960ac2dbd84e9effa1e5e7f5730d911ac601d256e49bb5dc4279911a713f91'
    && JSON.stringify(pin.sourceRecordKeys) === JSON.stringify(destinations.map(([key]) => `footer-public-${key}`))));
});

test('actual footer preserves all six literal URLs and new-tab targets in visitor and editing SDK states', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const inputs = destinations.map(([, label, url]) => field(url, { text: label, title: label }));
    const data = footerData(inputs), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const markup = render(Footer, data, editing);
      assert.deepEqual(anchors(markup), destinations.map(([, , url]) => ({ href: url, target: '_blank' })));
      assert.doesNotMatch(markup, /service-unavailable|demo-unavailable/);
      if (editing) assert.match(markup, /test-only-footer-link/);
    }
    for (const input of inputs) {
      const output = safeLink(input);
      assert.deepEqual(safeLink(output), output);
      assert.strictEqual(output.metadata, input.metadata);
      assert.strictEqual(allianzLinkField(input, true), input);
      // An outgoing source page does not become a verified prospectus/document.
      assert.equal(prospectusLinkField(input, false).value.href, '#service-unavailable');
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('footer URL entries keep malformed and unrecorded URLs, native identities and unavailable fields rejected', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const [, , url] of destinations) {
      const parsed = new URL(url);
      const variants = [
        url.replace('https:', 'http:'), url.slice('https:'.length),
        url.replace('https://', 'https://user:password@'),
        url.replace(parsed.host, `${parsed.host}:443`), url.replace(parsed.host, `${parsed.host}:444`),
        url.replace(parsed.host, `${parsed.host}.example.invalid`),
        url.replace(parsed.pathname, parsed.pathname.toUpperCase()),
        url.endsWith('/') ? url.slice(0, -1) : `${url}/`,
        `${url}/unregistered`, `${url}%2f`, `${url}%5c`,
        `${url}?redirect=unapproved`, `${url}#unrecorded`, ` ${url}`, `${url} `,
        new URL('/unrecorded-footer-target', url).href,
      ];
      const inputs = variants.map((candidate) => field(candidate));
      inputs.push(field(url, { querystring: 'redirect=unapproved' }), field(url, { anchor: 'unrecorded' }),
        field(url, { anchor: 'demo-unavailable' }), field('#demo-unavailable', { linktype: 'anchor', anchor: 'demo-unavailable' }));
      for (const linktype of ['internal', 'media']) inputs.push(field(url, { linktype, id: '{TEST-ONLY-NATIVE-ITEM}' }));
      for (const input of inputs) {
        const before = JSON.stringify(input), output = safeLink(input);
        assert.equal(output.value.href, '#service-unavailable', JSON.stringify(input.value));
        assert.equal(output.value.target, '');
        assert.equal(output.value.querystring, '');
        assert.equal(output.value.anchor, '');
        assert.strictEqual(output.metadata, input.metadata);
        assert.strictEqual(allianzLinkField(input, true), input);
        assert.equal(JSON.stringify(input), before);
      }
      const unregistered = inputs[0];
      const markup = render(Footer, footerData(destinations.map(() => unregistered)));
      assert.ok(anchors(markup).every((anchor) => anchor.href === '#service-unavailable' && anchor.target === ''));
    }
  }
});

test('footer public registrations do not enable local account services or an unrecorded social profile', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    for (const url of ['/Login', 'https://www.allianzlife.com/login', '/Registration/individual',
      'https://www.allianzlife.com/Registration/individual', '/account', '/portal', '/api/private', '/sitecore',
      'https://www.facebook.com/unrecorded-profile', 'https://www.linkedin.com/company/unrecorded-company']) {
      assert.equal(safeLink(field(url)).value.href, '#service-unavailable', url);
    }
  }
});
