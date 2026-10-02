import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { parse } = require('graphql');
const filename = fileURLToPath(new URL('./newsroom-automatic-data.ts', import.meta.url));
const compiled = new Module(filename);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { NEWSROOM_ROOT_ID, NEWSROOM_PAGE_TEMPLATE_ID, PRESS_RELEASE_TEMPLATE_ID,
  NEWSROOM_YEAR_PAGE_TEMPLATE_ID, NEWSROOM_NAVIGATION_TITLE_FIELD_ID, normalizeNewsroomId,
  buildNewsroomQuery, collectNewsroomSearch, selectNewsroomYears, selectNewsroomReleases,
  newsroomAutomaticDate } = compiled.exports;

const id = (number) => `00000000-0000-4000-8000-${number.toString(16).padStart(12, '0')}`;
const year = (number, key = number) => ({ id: id(key), name: `${number}-press-releases`,
  path: `/sitecore/content/Allianz/Home/about/Newsroom/${number}-press-releases`,
  url: { path: `/about/newsroom/${number}-press-releases` }, parent: { id: NEWSROOM_ROOT_ID },
  navigationTitle: { jsonValue: { value: String(number), editable: `<span>${number}</span>` } } });
const page = (number, parent) => ({ id: id(number), path: `${parent.path}/article-${number}`,
  url: { path: `${parent.url.path}/article-${number}` }, parent: { id: parent.id } });
const source = (number, owner, value = '2026-01-01T00:00:00Z') => ({ id: id(number),
  title: { jsonValue: { value: `Release ${number}`, editable: `<span>${number}</span>` } },
  summary: { jsonValue: { value: '<p>Summary</p>' } }, releaseDate: { jsonValue: { value } },
  parent: { parent: { id: owner.id, url: owner.url, parent: owner.parent } } });
const connection = (results, total = results.length, hasNext = false, endCursor = null) =>
  ({ search: { results, total, pageInfo: { hasNext, endCursor } } });

function inputs(query) {
  const definition = parse(query).definitions[0];
  const selection = definition.selectionSet.selections[0];
  const value = (node) => node.kind === 'ObjectValue' ? Object.fromEntries(node.fields.map((field) => [field.name.value, value(field.value)]))
    : node.kind === 'ListValue' ? node.values.map(value) : node.kind === 'IntValue' ? Number(node.value) : node.value;
  return { name: definition.name.value, ...Object.fromEntries(selection.arguments.map((argument) => [argument.name.value, value(argument.value)])) };
}

test('queries filter the actual templates, exact parents, language/latest and narrow projections', () => {
  const years = inputs(buildNewsroomQuery('years', { language: 'en' }));
  assert.deepEqual(years.where.AND, [
    { name: '_templates', value: normalizeNewsroomId(NEWSROOM_YEAR_PAGE_TEMPLATE_ID), operator: 'CONTAINS' },
    { name: '_parent', value: normalizeNewsroomId(NEWSROOM_ROOT_ID), operator: 'EQ' },
    { name: '_language', value: 'en', operator: 'EQ' },
    { name: '_latestversion', value: 'true', operator: 'EQ' },
  ]);
  const archive = inputs(buildNewsroomQuery('pages', { language: 'en-US', yearId: id(2026) }));
  assert.equal(archive.first, 20);
  assert.equal(archive.where.AND[0].value, normalizeNewsroomId(NEWSROOM_PAGE_TEMPLATE_ID));
  assert.deepEqual(archive.where.AND[1], { name: '_parent', value: normalizeNewsroomId(id(2026)), operator: 'EQ' });
  const recent = inputs(buildNewsroomQuery('releases', { language: 'en' }));
  assert.equal(recent.first, 10);
  assert.equal(recent.where.AND[0].value, normalizeNewsroomId(PRESS_RELEASE_TEMPLATE_ID));
  assert.equal(recent.where.AND[1].name, '_path');
  assert.match(buildNewsroomQuery('years', { language: 'en' }), new RegExp(NEWSROOM_NAVIGATION_TITLE_FIELD_ID));
  assert.doesNotMatch(buildNewsroomQuery('releases', { language: 'en' }), /fieldCollection|body|children\(|rendered/);
});

test('query cursor literals survive quotes, backslashes and attempted GraphQL injection', () => {
  const cursor = 'quoted"\\\n } mutation Unsafe { field }';
  const query = buildNewsroomQuery('releases', { language: 'en' }, cursor);
  assert.equal(parse(query).definitions.length, 1);
  assert.equal(inputs(query).after, cursor);
  assert.throws(() => buildNewsroomQuery('pages', { language: 'en" } query Unsafe {' }));
  assert.throws(() => buildNewsroomQuery('pages', { language: 'en', yearId: 'not-a-guid' }));
});

test('GUID comparison normalizes native representations without accepting arbitrary IDs', () => {
  assert.equal(normalizeNewsroomId(`{${NEWSROOM_ROOT_ID.toUpperCase()}}`), normalizeNewsroomId(NEWSROOM_ROOT_ID));
  assert.equal(normalizeNewsroomId('not-an-item'), undefined);
  assert.equal(normalizeNewsroomId(undefined), undefined);
});

test('complete pagination uses returned cursors, all results, and the original fetch options', async () => {
  const rows = Array.from({ length: 23 }, (_, i) => ({ id: id(i + 1) }));
  const calls = [];
  const options = { headers: { Authorization: 'synthetic-credential', sc_previewMode: 'true' } };
  const getData = async (query, variables, fetchOptions) => {
    const args = inputs(query); calls.push({ args, variables, fetchOptions });
    const offset = Number(args.after ?? 0);
    return connection(rows.slice(offset, offset + 10), rows.length, offset + 10 < rows.length, String(offset + 10));
  };
  assert.deepEqual(await collectNewsroomSearch(getData, 'releases', { language: 'en' }, options), rows);
  assert.deepEqual(calls.map((call) => call.args.after), [undefined, '10', '20']);
  assert.ok(calls.every((call) => call.variables === undefined && call.fetchOptions === options));
  assert.deepEqual(await collectNewsroomSearch(async () => connection([]), 'years', { language: 'en' }), []);
});

test('pagination rejects absent metadata, duplicates, changed totals and corrupt cursors', async () => {
  const first = { id: id(1) }, second = { id: id(2) };
  const badResponses = [
    [{ search: { results: [first] } }],
    [connection([first], 2, false)],
    [connection([first], 0, false)],
    [connection([first], 2, true, null)],
    [connection([], 1, true, 'next')],
    [connection([first], 2, true, 'next'), connection([second], 3, false)],
    [connection([first], 2, true, 'next'), connection([first], 2, false)],
    [connection([first], 3, true, 'same'), connection([second], 3, true, 'same')],
    [connection([{ id: 'not-a-guid' }])],
    [connection(Array.from({ length: 11 }, (_, i) => ({ id: id(i + 1) })))],
  ];
  for (const responses of badResponses) {
    let request = 0;
    await assert.rejects(collectNewsroomSearch(async () => responses[request++], 'releases', { language: 'en' }));
  }
});

test('year selection is automatic, preserves field metadata, and excludes other root items', () => {
  const older = year(2025), newer = year(2026);
  const invalid = [
    { ...year(2023), name: 'Media Contacts', url: { path: '/about/newsroom/media-contacts' } },
    { ...year(2022), parent: { id: id(900) } },
    { ...year(2021), url: { path: '/different/2021-press-releases' } },
    { ...year(2020), path: '/sitecore/content/2020' },
  ];
  const selected = selectNewsroomYears([older, ...invalid, newer]);
  assert.deepEqual(selected.map((item) => item.year), [2026, 2025]);
  assert.equal(selected[0].navigationTitle.jsonValue, newer.navigationTitle.jsonValue);
  assert.throws(() => selectNewsroomYears([newer, { ...newer, id: id(888) }]));
  const friendly = { ...year(2027), name: '2027 Press Releases', path: '/sitecore/content/Newsroom/2027 Press Releases', url: { path: '/ABOUT/NEWSROOM/2027-PRESS-RELEASES/' } };
  assert.equal(selectNewsroomYears([friendly])[0].year, 2027);
  assert.equal(selectNewsroomYears([friendly])[0].navigationTitle.jsonValue, friendly.navigationTitle.jsonValue);
});

test('adding/removing direct child pages changes the archive without a manual release list', () => {
  const nativeYear = year(2026), years = selectNewsroomYears([nativeYear]);
  const first = page(1, nativeYear), second = page(2, nativeYear);
  const older = source(101, first, '2026-02-01'), newer = source(102, second, '2026-03-01');
  assert.deepEqual(selectNewsroomReleases(years, [first], [older], nativeYear.id).items, [older]);
  assert.deepEqual(selectNewsroomReleases(years, [first, second], [older, newer], nativeYear.id).items, [newer, older]);
  assert.deepEqual(selectNewsroomReleases(years, [second], [newer], nativeYear.id).items, [newer]);
  assert.equal(selectNewsroomReleases(years, [first], [older], nativeYear.id).items[0].title.jsonValue, older.title.jsonValue);
});

test('ownership excludes unrelated templates, deeper pages, folders and datasources outside known pages', () => {
  const nativeYear = year(2026), years = selectNewsroomYears([nativeYear]);
  const valid = page(1, nativeYear), deep = { ...page(2, nativeYear), parent: { id: id(500) } };
  const invalidUrl = { ...page(3, nativeYear), url: { path: `${nativeYear.url.path}/folder/article` } };
  const unrelated = page(4, nativeYear);
  const accepted = source(101, valid);
  const result = selectNewsroomReleases(years, [valid, deep, invalidUrl], [accepted, source(102, deep), source(103, invalidUrl), source(104, unrelated)], nativeYear.id);
  assert.deepEqual(result.items, [accepted]);
  assert.throws(() => selectNewsroomReleases(years, [valid], [accepted, source(105, valid)], nativeYear.id));
  assert.equal(selectNewsroomReleases(years, [valid], [], nativeYear.id).missingSources, 1);
  assert.throws(() => selectNewsroomReleases(years, [valid], [{ ...accepted, parent: { parent: { ...accepted.parent.parent, url: { path: '/wrong' } } } }], nativeYear.id));
});

test('a newly added page without a source keeps populated stories visible and reports the incomplete record', () => {
  const nativeYear = year(2026), years = selectNewsroomYears([nativeYear]);
  const populated = page(1, nativeYear), pending = page(2, nativeYear), release = source(101, populated);
  const result = selectNewsroomReleases(years, [populated, pending], [release], nativeYear.id);
  assert.deepEqual(result.items, [release]);
  assert.equal(result.complete, true);
  assert.equal(result.missingSources, 1);
});

test('recent uses all enumerated years, validates dates, and takes six after sorting', () => {
  const older = year(2025), newer = year(2026), years = selectNewsroomYears([older, newer]);
  const pages = Array.from({ length: 9 }, (_, i) => page(i + 1, i % 2 ? older : newer));
  const sources = pages.map((owner, i) => source(i + 101, owner, `2026-01-${String(i + 1).padStart(2, '0')}`));
  sources[2].releaseDate.jsonValue.value = '';
  sources[3].releaseDate.jsonValue.value = '2025-02-29';
  const recent = selectNewsroomReleases(years, pages, sources);
  assert.equal(recent.complete, true);
  assert.equal(recent.missingDates, 2);
  assert.deepEqual(recent.items.map((item) => item.id), [109, 108, 107, 106, 105, 102].map(id));
  const archive = selectNewsroomReleases(years, pages, sources, newer.id);
  assert.deepEqual(archive.items.map((item) => item.id), [109, 107, 105, 101, 103].map(id));
  assert.equal(archive.missingDates, 1);
});

test('same-day ties use normalized owning-page IDs and invalid dates remain last in archive', () => {
  const nativeYear = year(2026), years = selectNewsroomYears([nativeYear]);
  const first = page(1, nativeYear), second = page(2, nativeYear), undated = page(3, nativeYear);
  const a = source(110, first, '20260101T000000Z'), b = source(100, second, '2026-01-01T23:00:00-08:00'), c = source(111, undated, 'invalid');
  assert.deepEqual(selectNewsroomReleases(years, [second, undated, first], [b, c, a], nativeYear.id).items, [a, b, c]);
  assert.deepEqual(selectNewsroomReleases(years, [second, undated, first], [b, c, a]).items, [a, b]);
});

test('calendar dates retain timezone-independent days and reject impossible typed values', () => {
  for (const value of ['20260228T000000Z', '2026-02-28', '2026-02-28T23:59:59+12:00']) assert.equal(newsroomAutomaticDate(value), 20260228);
  assert.equal(newsroomAutomaticDate('2024-02-29'), 20240229);
  for (const value of ['', '2025-02-29', '2026-04-31', '2026-13-01', '2026-01-01T99:00:00Z', '2026-01-01junk', undefined]) assert.equal(newsroomAutomaticDate(value), undefined);
});
