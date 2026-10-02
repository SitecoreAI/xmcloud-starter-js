import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { component, contract, render, field, editingIds, links, sourceRoot } from './runtime.mjs';
import { archive, collected, evidence, normalize } from './release-fixtures.mjs';

const { Default } = component('press-release-archive', 'PressReleaseArchive');
const { newsroomCalendarDate, newsroomDateLabel, newsroomReleaseFields, newsroomReleaseItems, newsroomReleaseLink } = contract('press-release-archive');

for (const year of evidence.years) {
  test(`${year.year} archive renders every canonical row in exact native reference order`, () => {
    const datasource = archive(year);
    const html = render(Default, datasource);
    const witness = fs.readFileSync(new URL(`./archive-${year.year}.source.html`, import.meta.url), 'utf8');
    const sourceRows = [...witness.matchAll(/c-search-result-text-teaser__item[\s\S]*?<h5[^>]*>([\s\S]*?)<\/h5>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g)]
      .filter((match) => normalize(match[1])); // Exclude only the captured blank _local row.
    assert.equal(sourceRows.length, year.count);
    assert.equal((html.match(/class="c-search-result-text-teaser__item"/g) ?? []).length, year.count);
    assert.deepEqual(datasource.releases.targetItems.map((item) => item.id), year.orderedArticleIds);
    assert.deepEqual(links(html), year.rows.map((row) => row.route));
    const titles = [...html.matchAll(/<h5[^>]*>([\s\S]*?)<\/h5>/g)].map((match) => normalize(match[1]));
    assert.deepEqual(titles, year.rows.map((row) => normalize(row.title)));
    for (const [index, row] of year.rows.entries()) {
      assert.equal(normalize(sourceRows[index][1]), normalize(row.title));
      assert.equal(normalize(sourceRows[index][2]), row.dateText);
      assert.equal(normalize(sourceRows[index][3]), normalize(row.snippet));
      assert.ok(normalize(html).includes(normalize(row.snippet)));
      assert.ok(html.includes(row.dateText));
    }
    assert.match(html, /l-grid__column-medium-12 l-grid__column-large-8/);
    assert.match(html, new RegExp(`<h1>${year.heading}</h1>`));
    assert.doesNotMatch(html, /<img|<button|year-picker|More press releases|<h[2346]/);
    assert.equal(render(Default, collected({ ...datasource, releases: { ...datasource.releases, targetItems: datasource.releases.targetItems.map(collected) } })), html);
    assert.equal(render(Default, datasource, false, { theme: 'green', columns: '4', headingLevel: 'h2', layout: 'cards', spacing: 'xl' }), html);
  });
}

test('native calendar formatting cannot shift with timezone and validates dates', () => {
  const previous = process.env.TZ;
  for (const timezone of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
    process.env.TZ = timezone;
    assert.equal(newsroomDateLabel('2026-04-01T00:00:00Z', 'archive'), 'Apr 01, 2026');
    assert.equal(newsroomDateLabel('20260401T000000Z', 'recent'), 'Date: 04/01/2026');
    assert.equal(newsroomDateLabel('2024-02-29', 'archive'), 'Feb 29, 2024');
  }
  if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  for (const value of ['', 'yesterday', '2025-02-29', '2026-13-01', '2026-04-31']) assert.equal(newsroomCalendarDate(value), undefined);
});

test('intentional clears retain real SDK editing chrome and owning URLs never use headlines', () => {
  const data = archive(evidence.years[0]);
  const original = data.releases.targetItems[0];
  const cleared = { ...original, title: field('release-title', 'Single-Line Text', ''), summary: field('release-summary', 'Rich Text', ''), releaseDate: field('release-date', 'Date', ''),
    fieldCollection: [{ name: 'title', jsonValue: original.title.jsonValue }, { name: 'summary', jsonValue: original.summary.jsonValue }, { name: 'releaseDate', jsonValue: original.releaseDate.jsonValue }] };
  const clearData = { heading: field('archive-heading', 'Single-Line Text', ''), releases: { targetItems: [cleared] } };
  assert.deepEqual(editingIds(render(Default, clearData, true)), ['archive-heading', 'release-date', 'release-summary', 'release-title']);
  assert.doesNotMatch(render(Default, clearData), /More Americans|Dec 18|Allianz Life New/);
  assert.equal(newsroomReleaseFields(cleared).title.jsonValue, cleared.title.jsonValue);
  const renamed = { ...original, title: field('renamed', 'Single-Line Text', 'A completely different headline') };
  assert.equal(newsroomReleaseLink(renamed).value.href, original.parent.parent.url.path);
  assert.equal(newsroomReleaseLink({ ...original, parent: undefined }), undefined);
  assert.equal(newsroomReleaseLink({ ...original, parent: { parent: { id: 'page', url: { path: '//other-site.example' } } } }), undefined);
});

test('known incomplete projections are rejected instead of silently truncating rows', () => {
  const data = archive(evidence.years[0]);
  for (const releases of [
    { ...data.releases, targetItems: data.releases.targetItems.slice(0, 8) },
    { ...data.releases, pageInfo: { hasNext: true, endCursor: 'pending' } },
    { targetItems: [data.releases.targetItems[0], null] },
  ]) {
    assert.deepEqual(newsroomReleaseItems(releases), { items: [], complete: false });
    assert.equal(links(render(Default, { ...data, releases })).length, 0);
    assert.match(render(Default, { ...data, releases }, true), /not loaded completely/);
  }
  assert.deepEqual(newsroomReleaseItems({ targetItems: [] }), { items: [], complete: true });
  assert.deepEqual(newsroomReleaseItems({ jsonValue: { value: '' }, targetItems: data.releases.targetItems }), { items: [], complete: true });
  assert.deepEqual(newsroomReleaseItems({ jsonValue: [{ id: data.releases.targetItems[0].id }], targetItems: [] }), { items: [], complete: false });
  assert.deepEqual(newsroomReleaseItems({ jsonValue: data.releases.targetItems.map(({ id }) => ({ id })) }), { items: [], complete: false });
  assert.deepEqual(newsroomReleaseItems({ jsonValue: data.releases.targetItems.map(({ id }) => ({ id })), targetItems: [...data.releases.targetItems].reverse() }), { items: [], complete: false });
});

test('proposed query is bounded to references and teaser fields, with native acceptance explicit', () => {
  const query = fs.readFileSync(`${sourceRoot}/components/press-release-archive/press-release-archive.graphql`, 'utf8');
  assert.match(query, /fieldCollection: fields \{ name jsonValue \}/);
  assert.match(query, /MultilistField/);
  assert.match(query, /releaseDate: field\(name: "releaseDate"\)/);
  assert.doesNotMatch(query, /children|descendants|body:|first:|sourceUrl|[0-9a-f]{8}-[0-9a-f]{4}/);
  const props = fs.readFileSync(`${sourceRoot}/components/press-release-archive/press-release-archive.props.ts`, 'utf8');
  assert.doesNotMatch(props, /\.sort\(|\.slice\(|native-content|public-route|[0-9a-f]{8}-[0-9a-f]{4}/);
});
