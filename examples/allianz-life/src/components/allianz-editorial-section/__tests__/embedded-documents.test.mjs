import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sdk = require('@sitecore-content-sdk/nextjs');
const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../../..');
const componentMap = new Map();
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(filename)); modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '.sitecore/component-map') return { __esModule: true, default: componentMap };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier) : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return compiled.exports;
}
const Section = load(path.join(here, '../AllianzEditorialSection.tsx'));
for (const [name, directory] of [['AllianzEditorialSection', 'allianz-editorial-section'], ['AllianzLegacyPageHeader', 'allianz-legacy-page-header'], ['ProspectusIntroduction', 'prospectus-introduction'], ['ProspectusDocumentTable', 'prospectus-document-table'], ['LegalDisclosures', 'legal-disclosures']]) componentMap.set(name, load(path.join(sourceRoot, `components/${directory}/${name}.tsx`)));
const sources = JSON.parse(fs.readFileSync(path.join(here, 'embedded-document-sources.json')));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const key = (slot, id = '{*}') => `allianz-legacy-document-${slot}-${id}`;
const testId = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const field = (name, value, itemId = 'test-only-content') => ({ jsonValue: { value, metadata: { itemId, fieldId: `test-only-${name}`, fieldType: ['heading', 'body'].includes(name) ? 'Rich Text' : name === 'documentLink' ? 'General Link' : 'Single-Line Text' } } });
const child = (name, variant, fields, uid) => ({ componentName: name, uid, dataSource: `test-only-datasource-${name}`, params: { FieldNames: variant }, fields: { data: { datasource: fields } } });
function fixture(source, editing = false, id = '71', resolvedKeys = false) {
  const placeholders = {};
  const add = (slot, control) => placeholders[key(slot, resolvedKeys ? id : '{*}')] = [control];
  // Existing table/notice UIDs are reproduced only to verify identity preservation, not imported.
  const tableUid = source.key === 'route02' ? '8AE9041B-3A75-4DDE-AF10-9F252FC4A600' : '7072938E-74BB-4F99-99D9-384240DD7BE1';
  add('table', child('ProspectusDocumentTable', 'Embedded', {}, tableUid));
  if (source.notice !== undefined) add('notice', child('ProspectusIntroduction', 'ArchivedContractNotice', { contractNotice: field('contractNotice', source.notice) }, '5691FFE6-45D1-49AB-815F-8338C1408240'));
  if (source.heading !== undefined) {
    add('heading', child('AllianzLegacyPageHeader', 'Default', { heading: field('heading', source.heading) }, 'test-only-heading'));
    add('disclosure', child('LegalDisclosures', 'Legacy', { body: field('body', source.disclosure) }, 'test-only-disclosure'));
  }
  const params = { FieldNames: source.variant, DynamicPlaceholderId: id };
  const page = { mode: { isEditing: editing, isNormal: !editing, isPreview: false }, siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: source.key, fields: {}, placeholders: {} } } } };
  const automatic = { [tableUid]: { automaticDocuments: { complete: true, status: 'ready', items: source.rows.map((row, i) => ({ id: testId(i + 1), ...Object.fromEntries(Object.entries(row).map(([name, data]) => [name, field(name, data.jsonValue.value, testId(i + 1))])) })) } } };
  return { props: { params, page, rendering: { componentName: 'AllianzEditorialSection', uid: `test-only-wrapper-${id}`, params, placeholders } }, automatic };
}
function render(Component, input) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, { page: input.props.page, api: {}, componentMap, loadImportMap: async () => ({}) }, React.createElement(sdk.ComponentPropsContext, { value: input.automatic }, React.createElement(Component, input.props))));
}
const pythonOracle = `
import sys,json,importlib.util
s=importlib.util.spec_from_file_location('source_oracle',sys.argv[1]);o=importlib.util.module_from_spec(s);sys.modules[s.name]=o;s.loader.exec_module(o)
def outline(n):
    if n.has('page-header'): return ['page-header', '', [outline(x) for x in n.children() if not (x.tag == 'span' and not x.attrs and not x.children())]]
    return [n.tag, ' '.join(n.attrs.get('class','').split()), [outline(x) for x in n.children() if not (x.tag == 'span' and not x.attrs and not x.children())]]
for r in json.load(sys.stdin):
    a=o.DOM(r['source']).root;b=o.DOM(r['actual']).root
    assert outline(a)==outline(b), (r['key'],outline(a),outline(b))
    assert a.text()==b.text(), (r['key'],a.text(),b.text())
print('2 embedded source ancestor, order and copy contracts match')
`;
test('two variants match full source ancestor hierarchy, ordered controls and text through real SDK', () => {
  const records = sources.map((source) => {
    assert.equal(hash(source.sourceFragment), source.sourceFragmentSha256);
    const input = fixture(source); const before = JSON.stringify({ children: Object.values(input.props.rendering.placeholders).flat().sort((a, b) => a.uid.localeCompare(b.uid)), automatic: input.automatic });
    const actual = render(Section[source.variant], input);
    assert.equal(JSON.stringify({ children: Object.values(input.props.rendering.placeholders).flat().sort((a, b) => a.uid.localeCompare(b.uid)), automatic: input.automatic }), before);
    assert.equal((actual.match(/<table\b/g) || []).length, 1);
    assert.doesNotMatch(actual, /l-container|l-grid|axlTileCollection|allianz-missing-data/);
    return { key: source.key, source: source.sourceFragment, actual };
  });
  const result = spawnSync('python3', ['-c', pythonOracle, path.join(sourceRoot, 'components/prospectus-document-table/__tests__/source_contract.py')], { input: JSON.stringify(records), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
test('resolved and wildcard dynamic placeholders render identical controls', () => {
  for (const source of sources) assert.equal(render(Section[source.variant], fixture(source)), render(Section[source.variant], fixture(source, false, '71', true)));
});
test('editing preserves independent placeholder/rendering chrome, field metadata and original source link values', () => {
  for (const source of sources) {
    const input = fixture(source, true); const before = JSON.stringify(input); const html = render(Section[source.variant], input);
    const slots = source.notice !== undefined ? ['notice', 'table'] : ['heading', 'table', 'disclosure'];
    for (const slot of slots) assert.ok(html.includes(key(slot)), slot);
    assert.equal((html.match(/chrometype="placeholder"/g) || []).length, slots.length * 2);
    for (const name of ['documentLink', 'contractNote', 'revisionDate', 'fileSize']) assert.equal((html.match(new RegExp(`fieldId&quot;:&quot;test-only-${name}&quot;`, 'g')) || []).length, source.rows.length);
    for (const row of source.rows) assert.ok(html.includes(row.documentLink.jsonValue.value.href.replaceAll('&', '&amp;')));
    if (source.notice !== undefined) assert.match(html, /test-only-contractNotice/); else { assert.match(html, /test-only-heading/); assert.match(html, /test-only-body/); }
    assert.equal(JSON.stringify(input), before);
  }
});
test('empty slots stay insertable in editing and cannot resurrect removed content', () => {
  for (const source of sources) {
    const input = fixture(source, true); for (const slot of Object.keys(input.props.rendering.placeholders)) input.props.rendering.placeholders[slot] = [];
    const html = render(Section[source.variant], input); assert.match(html, /chrometype="placeholder"/); assert.doesNotMatch(html, /<table|<h1|For contracts/);
    input.props.page.mode = { isEditing: false, isNormal: true, isPreview: false }; assert.doesNotMatch(render(Section[source.variant], input), /<table|<h1|For contracts|<p/);
  }
});
test('clear and restore retains native metadata and stable source order', () => {
  for (const source of sources) {
    const input = fixture(source, true); const saved = structuredClone(input); const expected = render(Section[source.variant], input);
    for (const value of Object.values(input.automatic)) for (const row of value.automaticDocuments.items) { row.contractNote.jsonValue.value = ''; row.revisionDate.jsonValue.value = ''; row.fileSize.jsonValue.value = ''; }
    for (const children of Object.values(input.props.rendering.placeholders)) for (const control of children) for (const f of Object.values(control.fields.data.datasource)) f.jsonValue.value = '';
    const html = render(Section[source.variant], input); assert.match(html, /test-only-revisionDate/); assert.doesNotMatch(html, /For contracts issued|Annuity Prospectus|Registered index-linked/); assert.equal(render(Section[source.variant], saved), expected);
  }
});
test('invalid or missing native DynamicPlaceholderId fails closed', () => {
  for (const source of sources) for (const id of [undefined, '', '7x', '../71', '-1', '1.5', 71]) { const input = fixture(source); input.props.params.DynamicPlaceholderId = id; assert.throws(() => render(Section[source.variant], input), /requires a numeric native SXA DynamicPlaceholderId/); }
});
test('fixed legacy geometry ignores modern styles and retains wrapper identifier', () => {
  for (const source of sources) { const input = fixture(source); Object.assign(input.props.params, { theme: 'evil', sectionWidth: 'contained', layout: 'column', sectionSpacing: '1', RenderingIdentifier: 'source-wrapper' }); const html = render(Section[source.variant], input); assert.match(html, /^<div class="row" id="source-wrapper">/); assert.doesNotMatch(html, /evil|l-container|l-grid|u-row-spacing/); }
});
test('each variant renders only its purpose-specific slots', () => {
  for (const source of sources) { const input = fixture(source); input.props.rendering.placeholders[key(source.notice !== undefined ? 'heading' : 'notice')] = [child('ProspectusIntroduction', 'ArchivedContractNotice', { contractNotice: field('contractNotice', 'Unrelated stale slot') }, 'test-only-stale')]; assert.doesNotMatch(render(Section[source.variant], input), /Unrelated stale slot/); }
});
test('modern Default remains byte-identical and retains original geometry', () => {
  const file = fs.readFileSync(path.join(here, '../AllianzEditorialSection.tsx'), 'utf8'); const marker = '\n/** Purpose-specific slots keep legacy document controls independently editable.';
  assert.equal(hash(file.slice(0, file.indexOf(marker))), 'e6e1094bd4b7b76e35466a75f1eed4124edbaa87c16aca8211d6d0691343db88');
  const input = fixture(sources[0]); input.props.rendering.placeholders = { 'allianz-editorial-section-{*}': [] }; Object.assign(input.props.params, { sectionWidth: 'contained', theme: 'transparent', layout: 'column', sectionSpacing: '1' });
  assert.match(render(Section.Default, input), /class="l-container u-row-spacing t-bg-transparent axlTileCollection"/); assert.match(render(Section.Default, input), /l-grid--no-gutters-outer/);
});
