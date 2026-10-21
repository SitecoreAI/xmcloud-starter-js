import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, metadata } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

// Synthetic native fields exercise the installed SDK; these are not CMS prepins.
const { Default } = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const { safeNewsroomRichText } = loadSource(path.join(sourceRoot, 'components/legal-disclosures/newsroom-grey.links.props.ts'));
const accountHrefs = new Set(['/Login', '/Login/forgot-username-individual', '/Login/forgot-password-individual']);
const field = (name, value, type = 'Rich Text') => ({ jsonValue: { value, metadata: metadata(name, type) } });
const accountBody = '<p><a href="/Login" class="login">Log in</a> to view your contract.</p>'
  + '<p><a href="/Login/forgot-username-individual" target="_blank">Forgot username</a> or '
  + '<a href="/Login/forgot-password-individual" target="_self">Forgot password</a>.</p>';
const unavailableBody = '<p><a href="#service-unavailable" class="login">Log in</a> to view your contract.</p>'
  + '<p><a href="#service-unavailable" target="">Forgot username</a> or '
  + '<a href="#service-unavailable" target="">Forgot password</a>.</p>';
const otherBody = '<p><a href="tel:800-950-1962" target="_self">Call us</a> '
  + '<a href="/about?one=1&amp;two=2#details" target="_blank" rel="author">About</a> '
  + '<a href="#details">Details</a> <a href="https://example.invalid/" target="_blank">External</a></p>';
const datasource = (body) => ({ children: { results: [{ id: 'synthetic-help-card',
  heading: field('account-heading', 'Account help', 'Single-Line Text'), body: field('account-body', body),
}] } });
const params = { layout: 'stacked', columns: '3', headingLevel: 'h3' };

test('Default CardGrid exact three account anchors use the existing unavailable dialog destination', () => {
  const data = datasource(accountBody + otherBody), before = JSON.stringify(data);
  const html = render(Default, data, false, params);
  assert.ok(html.includes(unavailableBody));
  assert.ok(html.includes(otherBody), 'all other anchors and their attributes stay byte-identical');
  assert.doesNotMatch(html, /href="\/Login(?:"|\/)/);
  assert.equal((html.match(/href="#service-unavailable"/g) ?? []).length, 3);
  assert.equal(JSON.stringify(data), before);
});

test('native editing retains original HTML and real Rich Text metadata without mutation', () => {
  const data = datasource(accountBody + otherBody), before = JSON.stringify(data);
  const html = render(Default, data, true, params);
  assert.ok(html.includes(accountBody + otherBody));
  assert.ok(html.includes('test-account-body-field'));
  assert.equal(JSON.stringify(data), before);
  const original = data.children.results[0].body.jsonValue;
  assert.equal(safeNewsroomRichText(original, true, accountHrefs), original);
});

test('the exact-only policy does not normalize casing, prefixes, queries, fragments or official-host URLs', () => {
  const body = '<a href="/login">Lowercase</a> <a href="/LOGIN">Uppercase</a> '
    + '<a href="/Login/">Trailing slash</a> <a href="/Login?next=1">Query</a> '
    + '<a href="/Login#help">Fragment</a> <a href="/Login/forgot-password-individual-extra">Other path</a> '
    + '<a href="https://www.allianzlife.com/Login" target="_blank">Official host</a>';
  const original = field('nonmatching-body', body).jsonValue;
  assert.equal(safeNewsroomRichText(original, false, accountHrefs), original);
  assert.ok(render(Default, datasource(body), false, params).includes(body));
});

test('the shared parser filters decoded href attributes and leaves unrelated attributes and content intact', () => {
  const original = field('attribute-body', '<a title=" href=/about target=_self " data-href="/about" HREF=\'&#47;Login\' TARGET="_blank"><strong>Log in</strong></a>'
    + '<a title="/Login" data-href="/Login" href=\'/about\' target=\'_blank\'>About</a>').jsonValue;
  const visitor = safeNewsroomRichText(original, false, accountHrefs);
  assert.equal(visitor.value, '<a title=" href=/about target=_self " data-href="/about" href="#service-unavailable" target=""><strong>Log in</strong></a>'
    + '<a title="/Login" data-href="/Login" href=\'/about\' target=\'_blank\'>About</a>');
  assert.equal(visitor.metadata, original.metadata);
  assert.ok(original.value.includes("HREF='&#47;Login' TARGET=\"_blank\""));
});

test('the Default list and cards layouts apply the same bounded body policy', () => {
  for (const layout of ['list', 'cards']) {
    const html = render(Default, datasource(accountBody + otherBody), false, { ...params, layout });
    assert.ok(html.includes(unavailableBody), layout);
    assert.ok(html.includes(otherBody), layout);
  }
});

test('modern fieldCollection projects the same native body policy without changing native storage', () => {
  const data = datasource(accountBody + otherBody);
  data.children.results = data.children.results.map(({ id, heading, body }) => ({ id, fieldCollection: [
    { name: 'heading', jsonValue: heading.jsonValue }, { name: 'body', jsonValue: body.jsonValue },
  ] }));
  const before = JSON.stringify(data);
  assert.ok(render(Default, data, false, params).includes(unavailableBody + otherBody));
  assert.ok(render(Default, data, true, params).includes(accountBody + otherBody));
  assert.equal(JSON.stringify(data), before);
});

test('missing and deliberately cleared native bodies stay absent and editable', () => {
  assert.equal(safeNewsroomRichText(undefined, false, accountHrefs), undefined);
  const original = field('cleared-body', '').jsonValue;
  assert.equal(safeNewsroomRichText(original, false, accountHrefs), original);
  assert.doesNotMatch(render(Default, datasource(''), false, params), /service-unavailable/);
  assert.ok(!render(Default, datasource(''), true, params).includes('test-account-body-field'));
});
