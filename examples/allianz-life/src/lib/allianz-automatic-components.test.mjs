import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const { ComponentPropsService } = require('@sitecore-content-sdk/nextjs');
const directory = fileURLToPath(new URL('.', import.meta.url));
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier === 'server-only') return {};
    if (specifier.startsWith('.')) return load(path.resolve(path.dirname(filename), `${specifier}.ts`));
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return compiled.exports;
}
const { enrichAllianzComponentMap } = load(path.join(directory, 'allianz-automatic-components.ts'));
const names = ['PressReleaseArchive', 'NewsroomRecentReleases', 'NewsroomYearNavigation',
  'ProspectusDocumentTable', 'ProspectusProductDirectory', 'ExecutiveDirectory', 'ExpertDirectory',
  'InvestmentPortfolio', 'SectionNavigation'];
const id = '00000000-0000-4000-8000-000000000001';

test('composition keeps every native hook, dynamic module and unrelated SDK hook without mutating the input map', async () => {
  const original = new Map(names.map((name, index) => [name, index % 2
    ? { componentType: 'client', dynamicModule: async () => ({ Default: () => null }) }
    : { componentType: 'client', Default: () => null }]));
  const stock = { Default: () => null, getComponentServerProps: async () => ({ marker: 'preserved' }) };
  original.set('Stock', stock);
  const client = Object.assign(Object.create(SitecoreClient.prototype), {
    componentPropsService: new ComponentPropsService(),
    graphQLClient: { async request() { throw new Error('An invalid site must not make a GraphQL read'); } },
  });
  const enriched = enrichAllianzComponentMap(original, { getData: client.getData.bind(client),
    fetchOptions: { headers: { Authorization: 'synthetic-private-request' } } });
  for (const name of names) {
    assert.equal(original.get(name).getComponentServerProps, undefined);
    assert.equal(typeof enriched.get(name).getComponentServerProps, 'function');
  }
  assert.equal(enriched.get('Stock'), stock);
  const layout = { sitecore: { context: { site: { name: 'other-site' }, language: 'en' }, route: {
    itemId: id, placeholders: { main: [...names, 'Stock'].map((componentName, index) => ({
      uid: `rendering-${index}`, componentName, dataSource: id,
    })) },
  } } };
  const props = await client.getComponentData(layout, {}, enriched);
  assert.deepEqual(Object.keys(props).sort(), [...names, 'Stock'].map((_, index) => `rendering-${index}`).sort());
  for (const [index] of names.entries()) {
    const collection = Object.values(props[`rendering-${index}`])[0];
    assert.equal(collection.complete, false);
    assert.equal(collection.error, names[index] === 'InvestmentPortfolio' ? 'unconfigured'
      : names[index] === 'SectionNavigation' ? 'unbound' : 'invalid-scope');
  }
  assert.deepEqual(props[`rendering-${names.length}`], { marker: 'preserved' });
  assert.doesNotMatch(JSON.stringify(props), /synthetic-private-request|Authorization|fetchOptions/);
});

test('each request gets independent copied maps and hooks', () => {
  const original = new Map(names.map((name) => [name, { Default: () => null }]));
  const reader = async () => { throw new Error('Not executed'); };
  const first = enrichAllianzComponentMap(original, { getData: reader });
  const second = enrichAllianzComponentMap(original, { getData: reader });
  assert.notEqual(first, second);
  for (const name of names) assert.notEqual(first.get(name).getComponentServerProps, second.get(name).getComponentServerProps);
});
