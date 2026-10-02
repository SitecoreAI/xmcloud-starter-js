import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { here, sourceRoot, loadSource, render, metadata } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const records = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json'), 'utf8')).records
  .filter((record) => record.rendering === 'ExpertBiography');
const documents = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/documents.json'), 'utf8'));
const { biographyLinkField } = loadSource(path.join(sourceRoot, 'components/expert-biography/expert-biography.props.ts'));
const { Default: ExpertBiography } = loadSource(path.join(sourceRoot, 'components/expert-biography/ExpertBiography.tsx'));
const { LinkedPortrait } = loadSource(path.join(sourceRoot, 'components/executive-biography/ExecutiveBiography.tsx'));
const mappings = records.map((record) => {
  const matches = documents.filter((document) => document.sourceUrl.jsonValue.value === record.sourceDocumentEvidence.url);
  assert.equal(matches.length, 1, record.route);
  return { record, document: matches[0], href: matches[0].file.jsonValue.value.src };
});

test('all33 local biography downloads join the original successful PDF receipts without filename guessing', () => {
  assert.equal(mappings.length, 33);
  assert.equal(new Set(mappings.map(({ href }) => href)).size, 33);
  for (const { record, document, href } of mappings) {
    assert.equal(document.status, 'available');
    assert.equal(record.sourceDocumentEvidence.http_status, 200);
    assert.equal(record.sourceDocumentEvidence.detected_type, 'pdf');
    assert.equal(record.sourceDocumentEvidence.content_type, 'application/pdf');
    assert.match(record.sourceDocumentEvidence.sha256, /^[a-f0-9]{64}$/);
    assert.ok(record.sourceDocumentEvidence.bytes > 0);
    assert.match(href, /^\/allianz-assets\/[a-f0-9]{16}-[^/]+\.pdf$/);
    const original = { value: { href, url: href, text: 'Download bio', target: '_blank', linktype: 'external' } };
    assert.equal(biographyLinkField(original, false).value.href, href);
    assert.equal(biographyLinkField(original, false, 'portrait').value.href, '');
  }
});

test('the exact saved AdamBrown local field produces a real native SDK download anchor', () => {
  const { record, href } = mappings.find(({ record }) => record.route.endsWith('/adam-brown'));
  const link = { value: { href, url: href, text: 'Download bio', target: '_blank', linktype: 'external' },
    metadata: metadata('downloadLink', 'General Link') };
  const data = { ...record.exactSourceFieldValues, downloadLink: { jsonValue: link } };
  const before = JSON.stringify(data);
  const html = render(ExpertBiography, data);
  assert.match(html, /<a\b[^>]*class="a-link"/);
  assert.ok(html.includes(`href="${href}"`));
  assert.match(html, /target="_blank"/);
  assert.match(html, /<span class="a-link__text">Download bio<\/span>/);
  assert.equal(JSON.stringify(data), before);
});

test('captured local download normalization preserves native query, anchor, caption, target and editing metadata', () => {
  const href = mappings[0].href;
  const field = { value: { href: `${href}?source=1#old`, url: href, querystring: '?native=2', anchor: '#author',
    text: 'Authored caption', target: '_blank', title: 'Authored title', linktype: 'external' },
  metadata: metadata('downloadLink', 'General Link') };
  const before = JSON.stringify(field);
  const normalized = biographyLinkField(field, false);
  assert.equal(normalized.value.href, href);
  assert.equal(normalized.value.querystring, 'source=1&native=2');
  assert.equal(normalized.value.anchor, 'author');
  assert.equal(normalized.value.text, 'Authored caption');
  assert.equal(normalized.value.target, '_blank');
  assert.equal(normalized.value.title, 'Authored title');
  assert.equal(normalized.metadata, field.metadata);
  assert.equal(biographyLinkField(field, true), field);
  assert.equal(JSON.stringify(field), before);
});

test('uncaptured files, remote hosts, unsafe schemes and lookalike paths stay unavailable', () => {
  const href = mappings[0].href;
  for (const value of [
    '/allianz-assets/unverified.pdf', `${href}.exe`, href.replace('c3d6cc05f70a263c', '0000000000000000'),
    `https://unverified.example${href}`, `http://www.allianzlife.com${href}`, `//www.allianzlife.com${href}`,
    `https://user:secret@www.allianzlife.com${href}`, 'javascript:alert(1)',
  ]) {
    const field = { value: { href: value, url: value, text: 'Download bio', target: '_blank' },
      metadata: metadata('downloadLink', 'General Link') };
    const normalized = biographyLinkField(field, false);
    assert.equal(normalized.value.href, '', value);
    assert.equal(normalized.metadata, field.metadata);
    assert.equal(biographyLinkField(field, true), field);
  }
});

test('cleared and absent downloads retain their state and never acquire a source PDF fallback', () => {
  assert.equal(biographyLinkField(undefined, false), undefined);
  for (const value of [{}, { href: '' }, { href: '', url: mappings[0].href }]) {
    const field = { value, metadata: metadata('downloadLink', 'General Link') };
    assert.equal(biographyLinkField(field, false), field);
    const html = render(ExpertBiography, { ...mappings[0].record.exactSourceFieldValues,
      downloadLink: { jsonValue: field } });
    assert.doesNotMatch(html, /class="a-link"|Download bio/);
  }
});

test('the one byte-verified Luca DAM Original wraps its image in a real SDK link with native metadata', () => {
  const href = 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/46a4ef1cbe2a4e51871bab9ccdb957a9?v=3cf794f0';
  const record = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json'), 'utf8')).records
    .find((entry) => entry.variant === 'LinkedPortrait');
  const link = { value: { href, url: href, target: '_blank', linktype: 'external', text: '' },
    metadata: metadata('portraitLink', 'General Link') };
  const normalized = biographyLinkField(link, false, 'portrait');
  assert.equal(`${normalized.value.href}?${normalized.value.querystring}`, href);
  assert.equal(normalized.metadata, link.metadata);
  assert.equal(normalized.value.target, '_blank');
  assert.equal(biographyLinkField(link, true, 'portrait'), link);
  assert.equal(biographyLinkField(link, false, 'document').value.href, '');
  const data = { ...record.exactSourceFieldValues,
    portrait: { jsonValue: { value: { src: href, width: '768', height: '960', alt: '' } } },
    portraitLink: { jsonValue: link } };
  const before = JSON.stringify(data);
  const html = render(LinkedPortrait, data);
  assert.ok(html.includes(`href="${href}"`));
  assert.match(html, /<a\b[^>]*target="_blank"[^>]*><img\b/);
  assert.equal(JSON.stringify(data), before);
  for (const unverified of [href.replace('v=3cf794f0', 'v=unverified'), href.replace('46a4ef1cbe2a4e51871bab9ccdb957a9', '00000000000000000000000000000000'),
    href.replace('https://', 'http://'), href.replace('https://', 'https://user:secret@'), `${href}&extra=1`]) {
    assert.equal(biographyLinkField({ ...link, value: { ...link.value, href: unverified } }, false, 'portrait').value.href, '', unverified);
  }
  for (const querystring of ['', '?v=3cf794f0', 'v=3cf794f0']) {
    const field = { ...link, value: { ...link.value, querystring } };
    const allowed = biographyLinkField(field, false, 'portrait');
    assert.equal(`${allowed.value.href}?${allowed.value.querystring}`, href);
    assert.equal(allowed.metadata, field.metadata);
    assert.equal(biographyLinkField(field, true, 'portrait'), field);
  }
  for (const querystring of ['?v=unverified', '?extra=1', '?v=3cf794f0&v=unverified',
    'v=3cf794f0&extra=1', 'v=3cf794f0&v=3cf794f0']) {
    const field = { ...link, value: { ...link.value, querystring } };
    const original = JSON.stringify(field);
    const rejected = biographyLinkField(field, false, 'portrait');
    assert.equal(rejected.value.href, '', querystring);
    assert.equal(rejected.value.url, '', querystring);
    assert.equal(rejected.value.querystring, '', querystring);
    assert.equal(rejected.value.anchor, '', querystring);
    assert.equal(rejected.value.target, '', querystring);
    assert.equal(rejected.metadata, field.metadata);
    assert.equal(biographyLinkField(field, true, 'portrait'), field);
    assert.equal(JSON.stringify(field), original);
    const rejectedHtml = render(LinkedPortrait, { ...data, portraitLink: { jsonValue: field } });
    assert.match(rejectedHtml, /<img\b/);
    assert.doesNotMatch(rejectedHtml, /<a\b[^>]*><img\b/, querystring);
    const anchors = [...rejectedHtml.matchAll(/<a\b[^>]*>/g)].map(([anchor]) => anchor);
    assert.ok(anchors.every((anchor) => !anchor.includes(`href="${href}`)), querystring);
  }
});
