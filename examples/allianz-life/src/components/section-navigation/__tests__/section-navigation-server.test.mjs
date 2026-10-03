import assert from 'node:assert/strict';
import test from 'node:test';
import { bindings, data, dataset, harness, id, layout, require, server } from './section-navigation-test-helper.mjs';

const { ComponentPropsService } = require('@sitecore-content-sdk/nextjs');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const map = (dynamic = false) => new Map([
  ['OtherComponent', { Default: () => null }],
  ['SectionNavigation', dynamic ? { componentType: 'client', dynamicModule: async () => ({ Default: () => null }) }
    : { componentType: 'client', Default: () => null }],
]);
function sdk(records, options) {
  const { getData, calls } = harness(records, options);
  const client = Object.assign(Object.create(SitecoreClient.prototype), {
    componentPropsService: new ComponentPropsService(), graphQLClient: { request: getData },
  });
  return { client, calls };
}
const unavailable = (error) => ({ automaticSectionNavigation: data.unavailableSectionNavigation(error) });

test('real installed SDK transports native automatic data through rendering UID and forwards exact per-request headers', async () => {
  const records = dataset(), { client, calls } = sdk(records);
  const options = { headers: { Authorization: 'synthetic-token', sc_previewMode: 'true', sc_site: 'allianz-life' } };
  const original = map();
  const enriched = server.enrichSectionNavigationComponentMap(original, { getData: client.getData.bind(client), fetchOptions: options, bindings });
  const props = await client.getComponentData(layout(records), {}, enriched);
  assert.equal(original.get('SectionNavigation').getComponentServerProps, undefined);
  assert.equal(enriched.get('OtherComponent'), original.get('OtherComponent'));
  assert.equal(props['section-0'].automaticSectionNavigation.items.length, 24);
  assert.equal(props['section-0'].automaticSectionNavigation.root.navigationTitle.jsonValue, records.root.navigationTitle.jsonValue);
  assert.equal(props['section-0'].automaticSectionNavigation.items[0].navigationTitle.jsonValue, records.children[0].navigationTitle.jsonValue);
  assert.equal(props['section-0'].automaticSectionNavigation.currentId, records.current.id);
  assert.equal(calls.length, 6);
  assert.ok(calls.every((call) => call.variables === undefined && call.fetchOptions === options));
  assert.doesNotMatch(JSON.stringify(props), /synthetic-token|Authorization|sc_previewMode|fetchOptions|inheritedTemplates/);
});

test('request-local cache shares repeated renderings and a new map re-reads changed native content', async () => {
  const records = dataset(2), { client, calls } = sdk(records);
  const first = await client.getComponentData(layout(records, { count: 2 }), {},
    server.enrichSectionNavigationComponentMap(map(), { getData: client.getData.bind(client), bindings }));
  assert.equal(calls.length, 2);
  assert.equal(first['section-0'].automaticSectionNavigation, first['section-1'].automaticSectionNavigation);
  records.children[0].excludedFilters.jsonValue.value = id(700);
  const second = await client.getComponentData(layout(records), {},
    server.enrichSectionNavigationComponentMap(map(), { getData: client.getData.bind(client), bindings }));
  assert.equal(calls.length, 4);
  assert.equal(second['section-0'].automaticSectionNavigation.items.length, 1);
});

test('cache keys include current identity, selected filter, root and language', async () => {
  const records = dataset(2), { getData, calls } = harness(records);
  const hook = server.createSectionNavigationServer({ getData, bindings });
  const currentLayout = layout(records), rendering = currentLayout.sitecore.route.placeholders.main[0];
  const initial = await hook(rendering, currentLayout);
  const second = await hook({ ...rendering, params: { ...rendering.params, [bindings.filterParameterName]: id(701) } }, currentLayout);
  assert.equal(calls.length, 4);
  assert.notEqual(initial.automaticSectionNavigation, second.automaticSectionNavigation);
  await hook(rendering, layout(records, { language: 'en-US' }));
  assert.equal(calls.length, 6);
  await hook(rendering, layout(records, { currentId: id(999) }));
  assert.equal(calls.length, 8);
  await hook({ ...rendering, params: { ...rendering.params, [bindings.rootParameterName]: id(998) } }, currentLayout);
  assert.equal(calls.length, 10);
});

test('SDK dynamic-module resolution keeps the native server hook', async () => {
  const records = dataset(2), { client } = sdk(records);
  const props = await client.getComponentData(layout(records), {},
    server.enrichSectionNavigationComponentMap(map(true), { getData: client.getData.bind(client), bindings }));
  assert.equal(props['section-0'].automaticSectionNavigation.complete, true);
  assert.equal(props['section-0'].automaticSectionNavigation.items.length, 2);
});

test('unbound native metadata and malformed parameters/current/language do no discovery reads', async () => {
  const records = dataset(2), { getData, calls } = harness(records);
  const currentLayout = layout(records), rendering = currentLayout.sitecore.route.placeholders.main[0];
  for (const absent of [undefined, {}, { ...bindings, pageBaseTemplateId: 'unverified' },
    { ...bindings, excludedFilterFieldId: undefined }, { ...bindings, rootParameterName: undefined },
    { ...bindings, filterParameterName: undefined }]) {
    const hook = server.createSectionNavigationServer({ getData, bindings: absent });
    assert.deepEqual(await hook(rendering, currentLayout), unavailable('unbound'));
  }
  const hook = server.createSectionNavigationServer({ getData, bindings });
  for (const params of [undefined, {}, { [bindings.rootParameterName]: records.root.id },
    { [bindings.filterParameterName]: id(700) }, { ...rendering.params, [bindings.rootParameterName]: '/a-section' },
    { ...rendering.params, [bindings.filterParameterName]: 'named-filter' },
    Object.create(rendering.params)]) {
    assert.deepEqual(await hook({ ...rendering, params }, currentLayout), unavailable('invalid-scope'));
  }
  for (const invalidLayout of [layout(records, { language: 'bad" language' }), layout(records, { currentId: undefined }),
    layout(records, { currentId: 'not-an-item' })]) {
    if (invalidLayout.sitecore.route.itemId === records.current.id) delete invalidLayout.sitecore.route.itemId;
    assert.deepEqual(await hook(rendering, invalidLayout), unavailable('invalid-scope'));
  }
  assert.equal(calls.length, 0);
});

test('failed or later incomplete pages become sanitized unavailable states and never leak a partial menu', async () => {
  for (const options of [
    { failure: new Error('synthetic-secret internal endpoint') },
    { change: (response, args) => {
      const after = args.operation.endsWith('Children') ? args.selections[0].selections.find((item) => item.name === 'children').after
        : args.selections[0].after;
      return after ? {} : response;
    } },
  ]) {
    const records = dataset(), { client } = sdk(records, options);
    const props = await client.getComponentData(layout(records), {}, server.enrichSectionNavigationComponentMap(map(), {
      getData: client.getData.bind(client), bindings, fetchOptions: { headers: { Authorization: 'synthetic-secret' } },
    }));
    assert.deepEqual(props['section-0'], unavailable('unavailable'));
    assert.doesNotMatch(JSON.stringify(props), /synthetic-secret|internal endpoint|query|Authorization/);
  }
});

test('candidate is map-local and no navigation rendering means no reads', async () => {
  const records = dataset(), { getData, calls } = harness(records);
  const original = new Map([['OtherComponent', { Default: () => null }]]);
  const enriched = server.enrichSectionNavigationComponentMap(original, { getData, bindings });
  assert.deepEqual([...enriched], [...original]);
  assert.equal(calls.length, 0);
});
