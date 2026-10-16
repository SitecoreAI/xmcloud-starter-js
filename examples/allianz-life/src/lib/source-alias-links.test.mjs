import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, metadata, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const { restoreSourceAliasRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-source-aliases.ts'));
const { safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { Default: PressRelease } = loadSource(path.join(sourceRoot, 'components/press-release/PressRelease.tsx'));
const { Link } = require('@sitecore-content-sdk/nextjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const records = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'components/press-release/__tests__/manifest.json'), 'utf8')).records;
const aliases = ['/careers', '/culture', '/allianzfortomorrow', '/AllianzForTomorrow'];
const linkHrefs = (html) => [...html.matchAll(/<a\b[^>]*\bhref=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)]
  .map((match) => match[1] ?? match[2] ?? match[3]);

test('the 11 affected captured press bodies retain their exact original source destinations', () => {
  const affected = records.filter((record) => linkHrefs(record.fields.body.jsonValue.value).some((href) => aliases.includes(href)));
  assert.equal(affected.length, 11);
  const counts = new Map();
  for (const record of affected) {
    const fields = record.fields, before = JSON.stringify(fields);
    const html = render(PressRelease, fields);
    const sourceHrefs = linkHrefs(record.exactSourceFieldValues.body.jsonValue.value);
    for (const alias of linkHrefs(fields.body.jsonValue.value).filter((href) => aliases.includes(href))) {
      counts.set(alias, (counts.get(alias) ?? 0) + 1);
      const original = `http://www.allianzlife.com${alias}`;
      assert.ok(sourceHrefs.includes(original), `${record.route}: source witness`);
      assert.ok(linkHrefs(html).includes(original), `${record.route}: visitor destination`);
      assert.ok(!linkHrefs(html).includes(alias), `${record.route}: broken alias removed`);
    }
    assert.equal(JSON.stringify(fields), before);
  }
  assert.deepEqual(Object.fromEntries(counts), { '/careers': 3, '/allianzfortomorrow': 2, '/culture': 5, '/AllianzForTomorrow': 1 });
});

test('visitor repair keeps query/hash encoding, markup, target, metadata and source labels', () => {
  const markup = `<p><a class="original" href='/careers?tag=one&amp;tag=two&amp;q=a%23b#jobs' target="_blank" rel="author">www.allianzlife.com/careers</a> <a HREF=/AllianzForTomorrow#giving>Give</a></p>`;
  const input = { value: markup, metadata: metadata('press-body', 'Rich Text') };
  const output = restoreSourceAliasRichText(input, false);
  assert.equal(output.value, markup.replace("href='/careers", "href='http://www.allianzlife.com/careers")
    .replace('HREF=/AllianzForTomorrow', 'HREF=http://www.allianzlife.com/AllianzForTomorrow'));
  assert.strictEqual(output.metadata, input.metadata);
  assert.equal(input.value, markup);
  assert.strictEqual(restoreSourceAliasRichText(input, true), input);
  const fields = { title: { jsonValue: { value: 'Headline' } }, body: { jsonValue: input }, summary: { jsonValue: input } };
  const visitor = render(PressRelease, fields);
  assert.equal(linkHrefs(visitor).filter((href) => href.startsWith('http://www.allianzlife.com/careers?')).length, 2);
  const editor = render(PressRelease, fields, true);
  assert.ok(editor.includes(markup));
  assert.match(editor, /test-press-body-field/);
});

test('ordinary migrated links, intentionally unavailable links and original source HTML stay untouched', () => {
  for (const value of [undefined, '', '<p>No links</p>',
    '<a href="/why-allianz/culture">Culture</a><a href="/new-york/about/careers">NY careers</a>',
    '<a href="#service-unavailable">Login</a><a href="#demo-unavailable">Service</a>',
    '<a href="http://www.allianzlife.com/careers">Source</a><a href="https://external.example/careers">External</a>',
    '<a href="/careers/extra">Other route</a><a href="//external.example/careers">Other host</a>',
    '<div data-href="/careers"><a data-href="/careers">No destination</a></div>',
    '<a href="toString">Ordinary relative URL</a>']) {
    const field = value === undefined ? undefined : { value };
    assert.strictEqual(restoreSourceAliasRichText(field, false), field);
  }
});

test('only the real href attribute is repaired when quoted attributes contain href-looking text', () => {
  for (const title of [
    `title="Read href='/careers'"`,
    `title="Read href='/other'"`,
    `title='Read href="/culture"'`,
    `title="Read > href='/AllianzForTomorrow'"`,
  ]) {
    const value = `<a ${title} href="/careers?tag=one&amp;tag=two#jobs">Jobs</a>`;
    const input = { value, metadata: metadata('press-body', 'Rich Text') };
    const output = restoreSourceAliasRichText(input, false);
    assert.equal(output.value, `<a ${title} href="http://www.allianzlife.com/careers?tag=one&amp;tag=two#jobs">Jobs</a>`);
    assert.strictEqual(output.metadata, input.metadata);
    assert.equal(input.value, value);
    assert.strictEqual(restoreSourceAliasRichText(input, true), input);

    const ordinary = { value: `<a ${title} href="/about">About</a>` };
    assert.strictEqual(restoreSourceAliasRichText(ordinary, false), ordinary);
    const noHref = { value: `<a ${title}>Label</a>` };
    assert.strictEqual(restoreSourceAliasRichText(noHref, false), noHref);
  }
});

test('the real SDK General Link renderer preserves source aliases, queries and native attributes', () => {
  const previous = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
  try {
    for (const alias of aliases) {
      const field = { value: { href: `${alias}?tag=one&tag=two&q=a%23b#details`, target: '_blank',
        linktype: 'internal', id: '{11111111-1111-1111-1111-111111111111}', text: 'Original label' }, metadata: metadata('alias', 'General Link') };
      const before = JSON.stringify(field), props = safeLinkRenderProps(field);
      const html = renderToStaticMarkup(React.createElement(Link, { ...props, editable: false }));
      assert.ok(html.includes(`href="http://www.allianzlife.com${alias}?tag=one&amp;tag=two&amp;q=a%23b#details"`));
      assert.match(html, /target="_blank" rel="noopener noreferrer"/);
      assert.match(html, /Original label/);
      assert.strictEqual(props.field.metadata, field.metadata);
      assert.equal(props.field.value.id, field.value.id);
      assert.equal(JSON.stringify(field), before);
    }
    for (const destination of ['/login', '/api/private', '/about#service-unavailable', 'https://www.allianzlife.com.evil.invalid/careers']) {
      assert.equal(safeLinkRenderProps({ value: { href: destination } }).field.value.href, '#service-unavailable');
    }
    assert.equal(safeLinkRenderProps({ value: { href: '/about' } }).field.value.href, '/about');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = previous;
  }
});
