import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { component, contract, witness, render, wire, field, editingIds, links, loadSource, sourceRoot } from '../../company-hero/__tests__/runtime.mjs';
import { assertSourceWitness, sourceWitnessEvidence } from './source-witness-hash.mjs';

const { Default } = component('newsroom-company-profile', 'NewsroomCompanyProfile');
const { newsroomCompanyProfileFields } = contract('newsroom-company-profile');
const { safeNewsroomRichText } = loadSource(path.join(sourceRoot, 'components/newsroom-company-profile/newsroom-company-profile.links.props.ts'));
const source = witness('newsroom-company-profile');
const bodies = [...source.matchAll(/<div class="tileBody u-font-size-md">\s*([\s\S]*?)\s*<\/div>/g)].map((match) => match[1]);
const images = [...source.matchAll(/<img\b[^>]*\ssrc="([^"]*)"[^>]*\salt="([^"]*)"/g)].map((match) => ({ src: match[1], alt: match[2] }));
const data = {
  heading: field('profile-heading', 'Single-Line Text', /<H2>(.*?)<\/H2>/.exec(source)[1]),
  facts: field('profile-facts', 'Rich Text', bodies[0]),
  companyImage: field('profile-company-image', 'Image', images[0]),
  parentHeading: field('profile-parent-heading', 'Single-Line Text', /<H3>(.*?)<\/H3>/.exec(source)[1]),
  parentBody: field('profile-parent-body', 'Rich Text', bodies[1]),
  parentImage: field('profile-parent-image', 'Image', images[1]),
};

test('profile source witness verifies six fields, complete facts and parent copy, and both source images', () => {
  assertSourceWitness(source, sourceWitnessEvidence.profile);
  assert.equal(bodies.length, 2);
  assert.equal(images.length, 2);
  const html = render(Default, data);
  assert.match(html, /l-container--full-width t-bg-blue-soft axlTileCollection allianz-newsroom-company-profile/);
  assert.match(html, /<h2>About Allianz Life<\/h2>/);
  assert.match(html, /<h3>Our parent company, Allianz SE<\/h3>/);
  assert.ok(html.includes(bodies[0]));
  assert.equal((html.match(/<li>/g) ?? []).length, 6);
  assert.deepEqual([...html.matchAll(/<sup>(\d)<\/sup>/g)].map((match) => match[1]), ['1', '2', '3', '4']);
  assert.equal((html.match(/style="margin-left: 40px;"/g) ?? []).length, 4);
  assert.equal((html.match(/<picture/g) ?? []).length, 2);
  assert.equal((html.match(/alt=" "/g) ?? []).length, 2);
  for (const image of images) assert.ok(html.includes(`src="${image.src}"`));
  const editing = render(Default, data, true);
  assert.ok(editing.includes(bodies[1]));
  assert.deepEqual(links(editing), links(source));
  assert.equal(render(Default, wire(data)), html);
  assert.equal(render(Default, data, false, { theme: 'green', columns: '3', ratio: '6633', alignment: 'right', headingLevel: 'h1' }), html);
  assert.match(render(Default, data, false, { RenderingIdentifier: 'company-profile' }), /id="company-profile"/);
});

test('profile complete native field objects and explicit root clears survive collection projection and SDK editing', () => {
  const cleared = Object.fromEntries(Object.entries(data).map(([name, entry]) => [name, {
    jsonValue: { ...entry.jsonValue, value: /Image$/.test(name) ? {} : '' },
  }]));
  cleared.fieldCollection = wire(data).fieldCollection;
  const expectedIds = Object.values(data).map((entry) => entry.jsonValue.metadata.fieldId).sort();
  assert.deepEqual(editingIds(render(Default, cleared, true)), expectedIds);
  assert.doesNotMatch(render(Default, cleared), /About Allianz|AH-Lee-Ahnz|<img|<h[23]|href=/);
  const projected = newsroomCompanyProfileFields(wire(cleared));
  for (const name of Object.keys(data)) assert.equal(projected[name].jsonValue, cleared[name].jsonValue);
  const mixed = { ...data, parentBody: { jsonValue: undefined }, fieldCollection: wire(data).fieldCollection };
  assert.equal(newsroomCompanyProfileFields(mixed).parentBody, mixed.parentBody);
  assert.doesNotMatch(render(Default, mixed), /Allianz Global Corporate|PIMCO/);
  assert.doesNotMatch(render(Default, { children: { results: [data] } }), /AH-Lee-Ahnz|About Allianz|<img|href=/);
  assert.match(render(Default, undefined), /Add a datasource for Newsroom Company Profile/);
});

test('profile visitors use existing unavailable-service links without modifying native body or Field metadata', () => {
  const original = data.parentBody.jsonValue;
  const snapshot = JSON.stringify(original);
  const visitor = safeNewsroomRichText(original, false);
  assert.notEqual(visitor, original);
  assert.equal(visitor.metadata, original.metadata);
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(safeNewsroomRichText(original, true), original);
  assert.equal(safeNewsroomRichText(data.facts.jsonValue, false), data.facts.jsonValue);
  assert.equal(safeNewsroomRichText(undefined, false), undefined);
  const empty = field('empty', 'Rich Text', '').jsonValue;
  assert.equal(safeNewsroomRichText(empty, false), empty);
  assert.deepEqual(links(render(Default, data)), Array(5).fill('#service-unavailable'));
  assert.deepEqual(links(render(Default, data, true)), links(source));
  assert.equal((render(Default, data).match(/rel="noopener noreferrer"/g) ?? []).length, 5);
  assert.equal((render(Default, data).match(/target=""/g) ?? []).length, 5);
  assert.doesNotMatch(render(Default, data), /data-demo-disabled/);
  const tricky = field('custom', 'Rich Text', '<p><a data-href="keep" data-target="also keep" href="mailto:media@example.com" target="_blank" rel="author external">Email</a></p>').jsonValue;
  assert.equal(safeNewsroomRichText(tricky, false).value, '<p><a data-href="keep" data-target="also keep" href="#service-unavailable" target="" rel="author external">Email</a></p>');
});

test('profile layout and query are fixed to the reviewed source contract', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/newsroom-company-profile/NewsroomCompanyProfile.css'), 'utf8');
  assert.match(css, /@media \(min-width: 704px\)/);
  assert.match(css, /\.tileImage\s*\{\s*width: 50%;/);
  assert.doesNotMatch(css, /flex-direction|order:/);
  const sourceCss = fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8');
  assert.match(sourceCss, /\.m-axlTile\.-is--split\{flex-direction:column\}/);
  assert.match(sourceCss, /@media \(min-width:704px\)\{\.m-axlTile\.-is--split\{flex-direction:row\}/);
  assert.match(sourceCss, /\.m-axlTile\.-is--split\.-is--flipped\{flex-direction:row-reverse\}/);
  const query = fs.readFileSync(path.join(sourceRoot, 'components/newsroom-company-profile/newsroom-company-profile.graphql'), 'utf8');
  assert.match(query, /fieldCollection: fields \{ name jsonValue \}/);
  assert.doesNotMatch(query, /children|targetItems|url|ancestors/);
  const code = fs.readFileSync(path.join(sourceRoot, 'components/newsroom-company-profile/NewsroomCompanyProfile.tsx'), 'utf8');
  assert.doesNotMatch(code, /allianzlife\.com|1896|97 million|params\?\.(?:theme|alignment|ratio|columns)/);
});
