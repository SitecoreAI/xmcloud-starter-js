import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { component, contract, render, wire, field, editingIds, links, loadSource, sourceRoot } from '../../company-hero/__tests__/runtime.mjs';
import { assertSourceWitness, sourceWitnessEvidence } from '../../newsroom-company-profile/__tests__/source-witness-hash.mjs';

const { Default, NewsroomGrey } = component('legal-disclosures', 'LegalDisclosures');
const { legalDisclosuresFields } = contract('legal-disclosures');
const { safeNewsroomRichText } = loadSource(path.join(sourceRoot, 'components/legal-disclosures/newsroom-grey.links.props.ts'));
const source = fs.readFileSync(new URL('./newsroom-grey.source.html', import.meta.url), 'utf8');
const trailing = fs.readFileSync(new URL('./newsroom-trailing-wrapper.source.html', import.meta.url), 'utf8');
const body = /<div class="tileBody">\s*([\s\S]*?)\s*<\/div>/.exec(source)[1];
const data = { body: field('grey-body', 'Rich Text', body) };
const compactHtml = (html) => html.replace(/>\s*</g, '><').trim();

test('NewsroomGrey preserves the complete canonical disclosure body and exact empty trailing wrapper geometry', () => {
  assertSourceWitness(source, sourceWitnessEvidence.grey);
  assertSourceWitness(trailing, sourceWitnessEvidence.trailing);
  const html = render(NewsroomGrey, data);
  const editing = render(NewsroomGrey, data, true);
  assert.match(html, /l-container--full-width t-bg-grey-muted axlTileCollection allianz-newsroom-grey/);
  assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
  assert.ok(editing.includes(body));
  assert.deepEqual([...html.matchAll(/<sup>(\d)<\/sup>/g)].map((match) => match[1]), ['1', '2', '3', '4']);
  assert.equal((html.match(/<p>/g) ?? []).length, (source.match(/<p>/g) ?? []).length);
  assert.match(html, /<hr\s*\/>/);
  assert.match(html, /class="disclosure-finra"/);
  assert.match(html, /state of New York/);
  assert.match(html, /Foreside Fund Services LLC/);
  assert.match(html, /AllianzIM provides hedging and other derivatives-based risk management solutions/);
  const actualTrailing = html.slice(html.indexOf('<div class="l-container--full-width a-axlDisclosures allianz-newsroom-grey-trailing">'))
    .replace(' a-axlDisclosures allianz-newsroom-grey-trailing', ' a-axlDisclosures');
  assert.equal(compactHtml(actualTrailing), compactHtml(trailing));
  assert.equal(render(NewsroomGrey, wire(data)), html);
  assert.equal(render(NewsroomGrey, data, false, { theme: 'blue', heading: 'Extra', trailingBody: 'Invented', spacing: 'xl' }), html);
  const identified = render(NewsroomGrey, data, false, { RenderingIdentifier: 'newsroom-disclosures' });
  assert.equal((identified.match(/id="newsroom-disclosures"/g) ?? []).length, 1);
});

test('grey native body metadata, canonical links and deliberate clears remain editable without a second datasource', () => {
  assert.deepEqual(editingIds(render(NewsroomGrey, data, true)), ['grey-body']);
  const original = data.body.jsonValue;
  const snapshot = JSON.stringify(original);
  const visitor = safeNewsroomRichText(original, false);
  assert.equal(visitor.metadata, original.metadata);
  assert.equal(safeNewsroomRichText(original, true), original);
  assert.equal(JSON.stringify(original), snapshot);
  assert.deepEqual(links(render(NewsroomGrey, data)), ['#service-unavailable', '#service-unavailable']);
  assert.deepEqual(links(render(NewsroomGrey, data, true)), links(source));
  assert.equal((render(NewsroomGrey, data).match(/rel="noopener noreferrer"/g) ?? []).length, 2);
  assert.equal((render(NewsroomGrey, data).match(/target=""/g) ?? []).length, 2);
  const cleared = { body: field('grey-body', 'Rich Text', ''), fieldCollection: wire(data).fieldCollection };
  assert.equal(legalDisclosuresFields(cleared).body, cleared.body);
  assert.deepEqual(editingIds(render(NewsroomGrey, cleared, true)), ['grey-body']);
  assert.doesNotMatch(render(NewsroomGrey, cleared), /AllianzIM|World|href=|<p>/);
  assert.match(render(NewsroomGrey, cleared), /allianz-newsroom-grey-trailing/);
  assert.equal(legalDisclosuresFields(wire(data)).body.jsonValue, original);
  assert.equal(safeNewsroomRichText(cleared.body.jsonValue, false), cleared.body.jsonValue);
  assert.doesNotMatch(render(NewsroomGrey, { children: { results: [data] } }), /AllianzIM|href=/);
  assert.match(render(NewsroomGrey, undefined), /Add a datasource for Legal Disclosures/);
  assert.doesNotMatch(render(NewsroomGrey, data), /data-demo-disabled|<h[1-6]/);
});

test('existing body-only Default keeps its original wrapper and grey-only styles stay scoped', () => {
  const native = { body: field('default-body', 'Rich Text', '<p>Existing disclosure remains here.</p>') };
  const html = render(Default, native);
  assert.match(html, /component legal-disclosures l-container--full-width a-axlDisclosures/);
  assert.match(html, /col-md-12 content-body disclosure/);
  assert.match(html, /<p>Existing disclosure remains here\.<\/p>/);
  assert.doesNotMatch(html, /allianz-newsroom-grey|axlTileCollection|m-axlIntroductionBlock/);
  assert.deepEqual(editingIds(render(Default, native, true)), ['default-body']);
  const css = fs.readFileSync(path.join(sourceRoot, 'components/legal-disclosures/NewsroomGrey.css'), 'utf8');
  assert.match(css, /allianz-newsroom-grey-trailing/);
  assert.match(css, /background-color: #bbbdbf/);
  const query = fs.readFileSync(path.join(sourceRoot, 'components/legal-disclosures/legal-disclosures.graphql'), 'utf8');
  assert.match(query, /body: field\(name: "body"\) \{ jsonValue \}/);
  assert.doesNotMatch(query, /children|heading|trailing/);
});
