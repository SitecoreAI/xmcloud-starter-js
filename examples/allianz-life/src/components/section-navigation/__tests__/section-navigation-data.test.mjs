import assert from 'node:assert/strict';
import test from 'node:test';
import { bindings, data, dataset, harness, id, inputs, scope } from './section-navigation-test-helper.mjs';

async function discover(records, options) {
  const client = harness(records, options), current = scope(records);
  const [catalog, membership] = await Promise.all([
    data.collectSectionNavigationChildren(client.getData, current, bindings),
    data.collectSectionNavigationMembership(client.getData, current, bindings),
  ]);
  return { result: data.selectSectionNavigation(catalog, membership, current), catalog, membership, calls: client.calls };
}

test('queries scope native root/current GUIDs and language, and select latest inherited page versions without publication filters', () => {
  const records = dataset(), current = scope(records, 'en-US');
  const children = data.buildSectionNavigationChildrenQuery(current, bindings, 'cursor"\n');
  const query = inputs(children);
  assert.equal(query.selections[0].path, data.normalizeSectionNavigationId(records.root.id));
  assert.equal(query.selections[1].path, data.normalizeSectionNavigationId(records.current.id));
  assert.ok(query.selections.every((item) => item.language === 'en-US'));
  assert.equal(query.selections[0].selections.find((field) => field.name === 'children').after, 'cursor"\n');
  assert.match(children, new RegExp(data.SECTION_NAVIGATION_TITLE_FIELD_ID));
  assert.match(children, new RegExp(data.normalizeSectionNavigationId(bindings.excludedFilterFieldId)));
  const membership = inputs(data.buildSectionNavigationMembershipQuery(current, bindings)).selections[0];
  assert.deepEqual(membership.where.AND, [
    { name: '_templates', value: data.normalizeSectionNavigationId(bindings.pageBaseTemplateId), operator: 'CONTAINS' },
    { name: '_path', value: data.normalizeSectionNavigationId(records.root.id), operator: 'CONTAINS' },
    { name: '_language', value: 'en-US', operator: 'EQ' },
    { name: '_latestversion', value: 'true', operator: 'EQ' },
  ]);
  assert.doesNotMatch(children + data.buildSectionNavigationMembershipQuery(current, bindings), /_publish|_workflow|hasLayout|_template\"|sortBy|\$|\/about\/ventures/);
});

test('every native child and membership cursor is collected, inherited pages retain exact native sibling order and Field identity', async () => {
  const records = dataset(24);
  records.children.reverse(); records.pages.reverse();
  const folder = { ...records.children[3], inheritedTemplates: [] };
  records.children[3] = folder;
  records.pages[records.pages.findIndex((page) => page.id === folder.id)] = folder;
  records.children[4].excludedFilters.jsonValue.value = `{${id(700).toUpperCase()}}`;
  records.children[5].excludedFilters.jsonValue.value = id(701);
  const title = records.children[0].navigationTitle.jsonValue;
  const before = JSON.stringify(records);
  const { result, calls } = await discover(records);
  assert.equal(result.complete, true);
  assert.deepEqual(result.items.map((item) => item.id), records.children.filter((item) => item !== folder && item !== records.children[4]).map((item) => item.id));
  assert.equal(result.items[0].navigationTitle.jsonValue, title);
  assert.equal(result.root.navigationTitle.jsonValue, records.root.navigationTitle.jsonValue);
  assert.equal(result.currentId, records.current.id);
  assert.equal(result.root.children, undefined);
  assert.equal(JSON.stringify(records), before);
  assert.equal(calls.filter((call) => call.args.operation.endsWith('Children')).length, 3);
  assert.equal(calls.filter((call) => call.args.operation.endsWith('Membership')).length, 3);
});

test('arbitrary section roots work without name, URL, template or item exceptions', async () => {
  for (const [index, route] of ['/about/ventures', '/business/team', '/different-authored-section'].entries()) {
    const records = dataset(2, route, id(200 + index));
    const { result } = await discover(records);
    assert.equal(result.root.url.path, route);
    assert.equal(result.items.length, 2);
    assert.ok(result.items.every((item) => item.parent.id === records.root.id));
  }
});

test('only the selected existing filter excludes a page and native multilist serializer shapes stay read-only', () => {
  for (const raw of ['', null, [], { value: '' }, { value: [] }]) assert.deepEqual(data.sectionNavigationExcludedFilterIds(raw), []);
  for (const raw of [id(700), `{${id(700).toUpperCase()}}`, [id(700)], [{ id: id(700) }],
    { value: [id(700)] }, { value: [{ id: id(700) }] }, { value: `${id(700)}|${id(701)}` }]) {
    const before = JSON.stringify(raw);
    assert.equal(data.sectionNavigationExcludedFilterIds(raw)[0], data.normalizeSectionNavigationId(id(700)));
    assert.equal(JSON.stringify(raw), before);
  }
  for (const invalid of [undefined, false, 'not-a-guid', `${id(700)}|`, { unknown: [] }, { value: undefined },
    [id(700), 'bad'], [{ id: id(700) }, null], [id(700), `{${id(700)}}`]]) {
    assert.equal(data.sectionNavigationExcludedFilterIds(invalid), undefined);
  }
});

test('empty native child sets are complete and the section root still supplies Overview', async () => {
  const records = dataset(0);
  const { result } = await discover(records);
  assert.deepEqual(result.items, []);
  assert.equal(result.root.id, records.root.id);
  assert.equal(result.currentId, records.root.id);
  assert.equal(result.complete, true);
});

test('excluded or deeper current pages retain actual identity without selecting a parent or a biography sibling', async () => {
  const records = dataset(3);
  records.current.excludedFilters.jsonValue.value = id(700);
  const first = await discover(records);
  assert.equal(first.result.currentId, records.current.id);
  assert.equal(first.result.items.some((item) => item.id === records.current.id), false);
  const deeper = { ...records.current, id: id(40), path: `${records.children[0].path}/profile`,
    parent: { id: records.children[0].id }, url: { path: `${records.children[0].url.path}/profile` } };
  records.pages.push(deeper); records.current = deeper;
  const second = await discover(records);
  assert.equal(second.result.currentId, deeper.id);
  assert.equal(second.result.items.some((item) => item.id === deeper.id), false);
});

test('malformed scope and absent bindings reject construction before client use', () => {
  const records = dataset(), current = scope(records);
  for (const bad of [undefined, {}, { ...bindings, pageBaseTemplateId: 'bad' }, { ...bindings, excludedFilterFieldId: 'bad' },
    { ...bindings, rootParameterName: '' }, { ...bindings, filterParameterName: '__proto__' },
    { ...bindings, filterParameterName: bindings.rootParameterName }]) assert.equal(data.validSectionNavigationBindings(bad), false);
  for (const invalid of [{ ...current, rootId: 'bad' }, { ...current, currentId: 'bad' }, { ...current, filterId: 'bad' },
    { ...current, language: 'en" injection' }]) {
    assert.throws(() => data.buildSectionNavigationChildrenQuery(invalid, bindings));
    assert.throws(() => data.buildSectionNavigationMembershipQuery(invalid, bindings));
  }
});

test('broken native-child cursor pages, identity, ownership, totals and changes never produce partial collections', async () => {
  const cases = [
    (response) => ({ ...response, root: null }),
    (response) => ({ ...response, current: { ...response.current, id: id(900) } }),
    (response) => ({ ...response, current: { ...response.current, path: '/sitecore/content/Outside' } }),
    (response) => ({ ...response, root: { ...response.root, children: undefined } }),
    (response) => ({ ...response, root: { ...response.root, children: { ...response.root.children, pageInfo: undefined } } }),
    (response) => ({ ...response, root: { ...response.root, children: { ...response.root.children, total: -1 } } }),
    (response) => ({ ...response, root: { ...response.root, children: { ...response.root.children, results: [response.root.children.results[0], response.root.children.results[0]] } } }),
    (response) => ({ ...response, root: { ...response.root, children: { ...response.root.children, results: [{ ...response.root.children.results[0], parent: { id: id(999) } }] } } }),
    (response) => ({ ...response, root: { ...response.root, children: { ...response.root.children, pageInfo: { hasNext: true, endCursor: '' } } } }),
    (response, args) => args.selections[0].selections.find((item) => item.name === 'children').after
      ? { ...response, root: { ...response.root, path: `${response.root.path}-changed` } } : response,
    (response, args) => args.selections[0].selections.find((item) => item.name === 'children').after
      ? { ...response, root: { ...response.root, children: { ...response.root.children, total: 25 } } } : response,
    (response, args) => args.selections[0].selections.find((item) => item.name === 'children').after
      ? { ...response, root: { ...response.root, children: { ...response.root.children, pageInfo: { hasNext: true, endCursor: '10' } } } } : response,
    (response) => ({ ...response, root: { ...response.root, children: { ...response.root.children, pageInfo: { hasNext: false } } } }),
  ];
  for (const change of cases) {
    const records = dataset(), client = harness(records, { change });
    await assert.rejects(data.collectSectionNavigationChildren(client.getData, scope(records), bindings));
  }
});

test('broken membership pagination and contradictory root/current membership fail the whole menu', async () => {
  for (const change of [
    () => ({}),
    (response) => ({ search: { ...response.search, results: [] } }),
    (response) => ({ search: { ...response.search, total: 0 } }),
    (response) => ({ search: { ...response.search, pageInfo: { hasNext: true, endCursor: '10' } } }),
    (response) => ({ search: { ...response.search, results: [response.search.results[0], response.search.results[0]] } }),
  ]) {
    const records = dataset(), client = harness(records, { change });
    await assert.rejects(data.collectSectionNavigationMembership(client.getData, scope(records), bindings));
  }
  for (const modify of [
    (records) => { records.pages = records.pages.filter((page) => page.id !== records.root.id); },
    (records) => { records.pages = records.pages.filter((page) => page.id !== records.current.id); },
    (records) => { records.pages[1] = { ...records.pages[1], parent: { id: id(999) } }; },
    (records) => { delete records.children[0].excludedFilters; },
    (records) => { records.children[0].excludedFilters.jsonValue = { unknown: [] }; },
    (records) => { records.pages.push({ id: id(999), path: '/sitecore/content/Outside', inheritedTemplates: [bindings.pageBaseTemplateId] }); },
  ]) {
    const records = dataset(2); modify(records);
    await assert.rejects(discover(records));
  }
});
