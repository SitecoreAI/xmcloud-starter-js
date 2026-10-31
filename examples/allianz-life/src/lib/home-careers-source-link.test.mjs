import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const { Default: HelpfulResources } = loadSource(path.join(sourceRoot, 'components/helpful-resources/HelpfulResources.tsx'));
const { safeLink } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { allianzLinkField } = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
const registry = JSON.parse(fs.readFileSync(new URL('./approved-source-external-links.fixture.json', import.meta.url), 'utf8'));
const homeCareers = 'https://careers.allianz.com/us/en/allianz-us-life';
const footerCareers = 'https://careers.allianz.com/US/go/Allianz-US-Life/5140601/';
process.env.NODE_ENV = 'test';

function field(href, attributes = {}) {
  return { value: { href, text: 'Careers', linktype: 'external', target: '_blank', ...attributes },
    metadata: { itemId: 'test-only-home-careers-card', fieldId: 'test-only-home-careers-link', fieldType: 'General Link' } };
}
function data(link) {
  return { id: 'test-only-home-resources', title: { jsonValue: { value: 'Helpful resources' } },
    children: { total: 1, pageInfo: { hasNext: false, endCursor: 'test-only-end' }, results: [{
      id: 'test-only-home-careers-card', fieldCollection: [
        { name: 'title', jsonValue: { value: 'Careers' } },
        { name: 'text', jsonValue: { value: '<p>Authored careers summary.</p>' } },
        { name: 'image', jsonValue: { value: {} } },
        { name: 'link', jsonValue: link },
      ],
    }] } };
}
function anchor(markup) {
  const tag = markup.match(/<a\b[^>]*>/)?.[0];
  return { href: /href="([^"]*)"/.exec(tag ?? '')?.[1].replaceAll('&amp;', '&'),
    target: /target="([^"]*)"/.exec(tag ?? '')?.[1],
    rel: /rel="([^"]*)"/.exec(tag ?? '')?.[1] };
}

test('Home Careers has one distinct source-pinned registration without changing the six footer records', () => {
  assert.deepEqual(registry.entries.filter(({ sourceRecordKey }) => sourceRecordKey === 'home-helpful-resources-careers'), [
    { kind: 'public-page', url: homeCareers, sourceRecordKey: 'home-helpful-resources-careers' },
  ]);
  assert.equal(registry.entries.filter(({ url }) => url === homeCareers).length, 1);
  assert.equal(registry.entries.filter(({ sourceRecordKey }) => sourceRecordKey.startsWith('footer-public-')).length, 6);
  assert.deepEqual(registry.entries.find(({ sourceRecordKey }) => sourceRecordKey === 'footer-public-careers'),
    { kind: 'public-page', url: footerCareers, sourceRecordKey: 'footer-public-careers' });
  assert.ok(registry.sourcePins.some((pin) => pin.url === 'https://www.allianzlife.com/'
    && pin.capturedAtUtc === '2026-10-31T14:34:06.489Z'
    && pin.sourceDomSha256 === '40266098feb516bd48a9eefed1c47fe4c65885602a5734fd2be4b2fd99263327'
    && JSON.stringify(pin.sourceRecordKeys) === JSON.stringify(['home-helpful-resources-careers'])));
});

test('actual HelpfulResources preserves the exact Home URL, SDK new-tab rel, native metadata and source fields', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const link = field(homeCareers), input = data(link), before = JSON.stringify(input);
    for (const editing of [false, true]) {
      const markup = render(HelpfulResources, input, editing);
      assert.deepEqual(anchor(markup), { href: homeCareers, target: '_blank', rel: 'noopener noreferrer' });
      assert.match(markup, /<h4>Careers<\/h4>|>Careers<\/span><\/h4>/);
      assert.match(markup, /Authored careers summary/);
      assert.doesNotMatch(markup, /service-unavailable|demo-unavailable/);
      assert.equal((markup.match(/test-only-home-careers-link/g) ?? []).length, editing ? 1 : 0);
    }
    assert.strictEqual(allianzLinkField(link, true), link);
    assert.strictEqual(safeLink(link).metadata, link.metadata);
    assert.deepEqual(safeLink(safeLink(link)), safeLink(link));
    assert.equal(JSON.stringify(input), before);
    assert.equal(safeLink(field(footerCareers)).value.href, footerCareers);
  }
});

test('Home registration does not recover placeholders or accept native identities and augmented URLs', () => {
  const variants = [
    'http://careers.allianz.com/us/en/allianz-us-life', '//careers.allianz.com/us/en/allianz-us-life',
    'https://user:password@careers.allianz.com/us/en/allianz-us-life',
    'https://careers.allianz.com:443/us/en/allianz-us-life', 'https://careers.allianz.com:444/us/en/allianz-us-life',
    'https://careers.allianz.com.example.invalid/us/en/allianz-us-life',
    'https://careers.allianz.com/US/EN/allianz-us-life', `${homeCareers}/`, `${homeCareers}/unrecorded`,
    'https://careers.allianz.com/us/en/%61llianz-us-life', `${homeCareers}%2f`, `${homeCareers}%5c`,
    `${homeCareers}?team=life`, `${homeCareers}#jobs`, ` ${homeCareers}`, `${homeCareers} `,
    'https://careers.allianz.com/us/en/unrecorded-careers',
  ];
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const inputs = variants.map((url) => field(url));
    inputs.push(field(homeCareers, { querystring: 'team=life' }), field(homeCareers, { anchor: 'jobs' }),
      field(homeCareers, { anchor: 'demo-unavailable' }),
      field('#demo-unavailable', { anchor: 'demo-unavailable', linktype: 'anchor' }));
    for (const linktype of ['internal', 'media']) inputs.push(field(homeCareers,
      { linktype, id: '{TEST-ONLY-NATIVE-IDENTITY}' }));
    for (const link of inputs) {
      const input = data(link), before = JSON.stringify(input), output = safeLink(link);
      assert.equal(output.value.href, '#service-unavailable', JSON.stringify(link.value));
      assert.equal(output.value.target, '');
      assert.equal(output.value.querystring, '');
      assert.equal(output.value.anchor, '');
      assert.strictEqual(output.metadata, link.metadata);
      assert.strictEqual(allianzLinkField(link, true), link);
      assert.equal(anchor(render(HelpfulResources, input)).href, '#service-unavailable');
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('cleared Home Careers remains cleared and unrecorded account/service URLs remain unavailable', () => {
  for (const mode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    const cleared = field('', { text: '' });
    assert.strictEqual(safeLink(cleared), cleared);
    assert.doesNotMatch(render(HelpfulResources, data(cleared)), /<a\b|service-unavailable/);
    for (const url of ['/Login', '/Registration/individual', '/account', '/portal', '/api/private', '/sitecore']) {
      assert.equal(safeLink(field(url)).value.href, '#service-unavailable', url);
    }
  }
});
