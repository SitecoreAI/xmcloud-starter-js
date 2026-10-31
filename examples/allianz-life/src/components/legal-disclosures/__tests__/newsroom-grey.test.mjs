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
  assert.deepEqual(editingIds(render(NewsroomGrey, cleared, true)), []);
  assert.doesNotMatch(render(NewsroomGrey, cleared, true), /\[No text in field\]/);
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

const newsroomGreyOwner = '39B0FCF0-F366-471E-85BD-F501DE33DF5C';
const ownedGrey = (value = body, id = newsroomGreyOwner) => ({ id, body: field('owned-grey-body', 'Rich Text', value) });

test('verified NewsroomGrey disclosure preserves its two complete source anchors and plain source contact text', () => {
  const native = ownedGrey();
  const snapshot = JSON.stringify(native);
  const html = render(NewsroomGrey, native);
  assert.ok(html.includes(body));
  assert.deepEqual(links(html), ['https://www.ssa.gov/', 'http://www.finra.org']);
  assert.equal((html.match(/target="_blank"/g) ?? []).length, 2);
  assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 2);
  assert.equal((html.match(/class="disclosure-finra"/g) ?? []).length, 1);
  assert.match(html, /800\.542\.5427 www\.allianzlife\.com<\/p>/);
  assert.doesNotMatch(html, /href="tel:800|href="(?:https?:\/\/)?www\.allianzlife\.com/);
  assert.equal(JSON.stringify(native), snapshot);
  assert.equal(render(NewsroomGrey, wire(native)), html);
});

test('verified NewsroomGrey owner accepts native GUID wire forms without accepting malformed or different owners', () => {
  for (const id of [newsroomGreyOwner, newsroomGreyOwner.toLowerCase(), `{${newsroomGreyOwner}}`, newsroomGreyOwner.replaceAll('-', '')]) {
    assert.deepEqual(links(render(NewsroomGrey, ownedGrey(body, id))), ['https://www.ssa.gov/', 'http://www.finra.org']);
  }
  for (const id of [undefined, '', 'native-author-item', '39B0FCF0-F366-471E-85BD-F501DE33DF5D',
    `prefix${newsroomGreyOwner}`, `${newsroomGreyOwner}suffix`, `{${newsroomGreyOwner}`, `${newsroomGreyOwner}}`, 39]) {
    const native = { id, body: field('wrong-owner-body', 'Rich Text', body) };
    assert.deepEqual(links(render(NewsroomGrey, native)), ['#service-unavailable', '#service-unavailable']);
  }
});

test('the verified disclosure does not enable altered URL spellings, protocols, paths, suffixes or encoded raw hrefs', () => {
  const rejected = [
    'https://www.ssa.gov', 'http://www.ssa.gov/', 'HTTPS://www.ssa.gov/',
    'https://www.ssa.gov:443/', 'https://user@www.ssa.gov/', 'https://www.ssa.gov.evil.test/',
    'https://www.ssa.gov/path', 'https://www.ssa.gov/?q=x', 'https://www.ssa.gov/#details',
    'https://www.ssa.gov&#47;', 'https&colon;//www.ssa.gov/', 'https://www.ssa.gov/&#10;',
    'http://www.finra.org/', 'https://www.finra.org', 'http://www.finra.org/path',
    'http://www.finra.org?x=1', 'http://www.finra.org#details', 'http://www.finra.org:80',
    'http://www.finra.org.evil.test', 'http://www.finra&#46;org',
    'javascript:alert(1)', '//www.ssa.gov/', 'tel:800-542-5427', 'mailto:person@example.com',
  ];
  for (const href of rejected) {
    const native = ownedGrey(`<p><a href="${href}" target="_blank">Unverified destination</a></p>`);
    const snapshot = JSON.stringify(native);
    assert.deepEqual(links(render(NewsroomGrey, native)), ['#service-unavailable'], href);
    assert.equal(JSON.stringify(native), snapshot, href);
  }
});

test('the verified disclosure preserves its source links while ordinary unsupported and internal anchors retain their policy', () => {
  const text = '<p><a href="https://www.ssa.gov/" target="_blank" rel="noopener noreferrer">SSA</a> '
    + '<a href="http://www.finra.org" target="_blank" rel="noopener noreferrer" class="disclosure-finra">FINRA</a> '
    + '<a href="https://unknown.example/" target="_blank">Unknown</a> '
    + '<a href="https://www.allianzlife.com/Login" target="_blank">Account</a> '
    + '<a href="https://www.allianzlife.com/about" target="_blank">About</a></p>';
  const html = render(NewsroomGrey, ownedGrey(text));
  const baseline = render(NewsroomGrey, { body: field('generic-grey-body', 'Rich Text', text) });
  assert.deepEqual(links(html).slice(0, 2), ['https://www.ssa.gov/', 'http://www.finra.org']);
  assert.deepEqual(links(html).slice(2), links(baseline).slice(2));
  assert.equal((html.match(/target="_blank"/g) ?? []).length, 2);
});

test('href-looking title or data attributes cannot make an unverified disclosure destination count as a source URL', () => {
  const html = render(NewsroomGrey, ownedGrey('<p><a title="href=https://www.ssa.gov/" data-href="http://www.finra.org" href="https://unknown.example/" target="_blank">Unverified</a></p>'));
  assert.deepEqual(links(html), ['#service-unavailable']);
  assert.match(html, /title="href=https:\/\/www\.ssa\.gov\/"/);
  assert.match(html, /data-href="http:\/\/www\.finra\.org"/);
});

test('verified disclosure editing, deliberate clears and existing placeholders remain native without reconstruction', () => {
  const native = ownedGrey();
  const snapshot = JSON.stringify(native);
  const editing = render(NewsroomGrey, native, true);
  assert.ok(editing.includes(body));
  assert.deepEqual(editingIds(editing), ['owned-grey-body']);
  assert.deepEqual(links(editing), ['https://www.ssa.gov/', 'http://www.finra.org']);
  assert.equal(JSON.stringify(native), snapshot);
  const cleared = { ...native, body: field('owned-grey-body', 'Rich Text', ''), fieldCollection: wire(native).fieldCollection };
  assert.doesNotMatch(render(NewsroomGrey, cleared), /href=|World|AllianzIM/);
  assert.doesNotMatch(render(NewsroomGrey, cleared, true), /\[No text in field\]|href=|World|AllianzIM/);
  const placeholder = '<p><a href="#demo-unavailable">SSA</a><a>FINRA</a>800.542.5427 www.allianzlife.com</p>';
  const output = render(NewsroomGrey, ownedGrey(placeholder));
  assert.deepEqual(links(output), ['#service-unavailable']);
  assert.doesNotMatch(output, /href="https:\/\/www\.ssa\.gov\/"|href="http:\/\/www\.finra\.org"|href="tel:/);
  assert.match(output, /800\.542\.5427 www\.allianzlife\.com/);
});
