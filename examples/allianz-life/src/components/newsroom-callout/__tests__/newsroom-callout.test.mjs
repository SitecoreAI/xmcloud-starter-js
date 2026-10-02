import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { component, contract, jsonLocal, readLocal, render, wire, field, editingIds, links, sourceRoot } from '../../newsroom-public-relations/__tests__/runtime.mjs';

const variants = component('newsroom-callout', 'NewsroomCallout');
const { newsroomCalloutFields } = contract('newsroom-callout');

for (const [name, file, theme, iconTheme, blankColumn] of [
  ['Experts', 'experts', 'transparent', 'transparent t-icon-primary-black', 'l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12'],
  ['LearnMore', 'learn-more', 'green-soft', 'primary-brand t-icon-primary-white', 'l-grid__column-medium-12'],
]) {
  const data = jsonLocal('newsroom-callout', `${file}.json`);
  const source = readLocal('newsroom-callout', `${file}.source.html`);
  const Variant = variants[name];
  test(`${name} retains canonical heading/body/icon and source arrow link with fixed ${theme} introduction`, () => {
    const html = render(Variant, data);
    assert.ok(source.includes(data.heading.jsonValue.value));
    assert.ok(source.includes(data.body.jsonValue.value));
    assert.ok(source.includes(data.link.jsonValue.value.href));
    assert.ok(source.includes(data.link.jsonValue.value.text));
    assert.ok(html.includes(`<h2>${data.heading.jsonValue.value}</h2>`));
    assert.ok(html.includes(data.body.jsonValue.value));
    assert.ok(html.includes(`t-bg-${theme} axlTileCollection allianz-newsroom-callout`));
    assert.ok(html.includes(`tileIcon t-bg-${iconTheme}`));
    const paths = [...source.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(paths.length, 2);
    for (const value of paths) assert.ok(html.includes(`d="${value}"`));
    assert.match(html, /<a\b[^>]*class="a-link"[^>]*><span aria-hidden="true" class="a-link__icon">/);
    assert.ok(html.includes(`<span class="a-link__text">${data.link.jsonValue.value.text}</span>`));
    assert.ok(html.includes(`<div class="l-grid__row"><div class="${blankColumn}"></div></div>`));
    assert.deepEqual(links(html), [data.link.jsonValue.value.href]);
    assert.doesNotMatch(html, /m-axlButton|<button|<img/);
    assert.equal(render(Variant, wire(data)), html);
    assert.equal(render(Variant, data, false, { theme: 'purple-soft', columns: '3', headingLevel: 'h1', icon: 'other', variant: 'other' }), html);
  });

  test(`${name} preserves deliberate empty SDK fields, exact editor targets and visitor mock protection`, () => {
    const empty = { ...data, heading: field(`${file}-heading`, 'Single-Line Text', ''), body: field(`${file}-body`, 'Rich Text', ''),
      link: field(`${file}-link`, 'General Link', { href: '', text: '' }) };
    assert.deepEqual(editingIds(render(Variant, empty, true)), [`${file}-body`, `${file}-heading`, `${file}-link`]);
    assert.doesNotMatch(render(Variant, empty), /href=|<h2>|a-link__icon/);
    assert.equal(newsroomCalloutFields(wire(empty)).link.jsonValue, empty.link.jsonValue);
    const external = { ...empty, body: field(`${file}-body`, 'Rich Text', '<p><a href="mailto:news@example.com">Email</a></p>'),
      link: field(`${file}-link`, 'General Link', { href: 'https://example.com/', text: 'External', target: '_blank' }) };
    assert.deepEqual(links(render(Variant, external)), ['#service-unavailable', '#service-unavailable']);
    assert.deepEqual(links(render(Variant, external, true)), ['mailto:news@example.com', 'https://example.com/']);
    assert.match(render(Variant, undefined), /Add a datasource for Newsroom callout/);
  });
}

test('callout exposes only the two source-defined variants and three root author fields', () => {
  assert.deepEqual(Object.keys(variants).sort(), ['Experts', 'LearnMore']);
  const query = fs.readFileSync(path.join(sourceRoot, 'components/newsroom-callout/newsroom-callout.graphql'), 'utf8');
  assert.match(query, /fieldCollection: fields \{ name jsonValue \}/);
  assert.doesNotMatch(query, /children|parent|url/);
  const author = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'components/newsroom-callout/AUTHOR-CONTRACT.json'), 'utf8'));
  assert.deepEqual(author.contract.fields.map(({ name }) => name), ['heading', 'body', 'link']);
  assert.deepEqual(author.contract.variants, ['Experts', 'LearnMore']);
  const noFallback = newsroomCalloutFields({ id: 'empty', children: [{ heading: field('wrong', 'Single-Line Text', 'Wrong') }] });
  assert.equal(noFallback.heading, undefined);
});
