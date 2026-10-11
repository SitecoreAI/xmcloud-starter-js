import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
const formRoot = path.join(sourceRoot, 'components/allianz-form');
function loader(overrides = {}) {
  const modules = new Map();
  const load = (filename) => {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (specifier.endsWith('.css')) return {};
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(lib|components)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
      if (local) {
        const resolved = [local, `${local}.ts`, `${local}.tsx`].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
        if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  };
  return load;
}
const load = loader();
const { MIGRATION_FORMS, resolveMigrationForm } = load(path.join(formRoot, 'migration-form-config.props.ts'));
const { Default } = load(path.join(formRoot, 'AllianzForm.tsx'));
const config = MIGRATION_FORMS.find((form) => form.id === 'contact-us');
const sourceText = {
  notice: 'Please note: We cannot reply with personal account information unless you first log in',
  legend: 'My reason for contacting Allianz is:',
  reasons: ['I have a question about a policy or contract (login is required)', 'I would like to become appointed to sell Allianz products', 'I would like to purchase Allianz products', 'Other'],
  fields: ['Name*', 'Email address*', 'Phone number*', 'Postal/Zip code*', 'Comment*'],
  helpers: ['Please give a full email address including @ and .com, .net, .org etc.', 'Enter your Phone number - xxxxxxxxxx, xxx-xxx-xxxx, (xxx) xxx-xxxx'],
};
const page = (mode = 'normal', itemPath = '/contact-us') => ({
  mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
  siteName: 'allianz-life', layout: { sitecore: { context: { itemPath }, route: { name: 'Contact us', fields: {}, placeholders: {} } } },
});
const render = (props = {}, mode = 'normal', itemPath = '/contact-us', count = 1) => renderToStaticMarkup(React.createElement(SitecoreProvider, {
  page: page(mode, itemPath), api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
}, Array.from({ length: count }, (_, index) => React.createElement(Default, { key: index, params: {}, ...props }))));
const text = (html) => html.replace(/<[^>]*>/g, '');

test('modern contact identity is exact and remains separate from the New York form', () => {
  assert.equal(config.schemaKey, 'contact-us');
  assert.deepEqual(config.routes, ['/contact-us']);
  assert.equal(resolveMigrationForm({ params: { formId: 'contact-us' } }, page('editing', '/api/editing/render')), config);
  assert.equal(resolveMigrationForm({}, page()), config);
  assert.equal(resolveMigrationForm({}, page('normal', '/contact-us/')), config);
  assert.equal(resolveMigrationForm({}, page('normal', '/sitecore/content/allianz/allianz-life/Home/contact-us')), config);
  assert.equal(resolveMigrationForm({}, page('normal', '/contact-us/extra')), undefined);
  assert.equal(resolveMigrationForm({}, page('normal', '/new-york/contact-us')).id, 'ny-contact');
});

for (const mode of ['normal', 'preview', 'editing']) test(`${mode}: exact source copy, four reasons and five disabled contact fields`, () => {
  const html = render({}, mode);
  const copy = text(html);
  for (const value of [sourceText.notice, sourceText.legend, ...sourceText.reasons, ...sourceText.fields, ...sourceText.helpers]) assert.ok(copy.includes(value), value);
  assert.equal((html.match(/<input\b[^>]*type="radio"/g) || []).length, 4);
  assert.equal((html.match(/<input\b/g) || []).length, 8);
  assert.equal((html.match(/<textarea\b/g) || []).length, 1);
  for (const tag of html.match(/<(?:input|textarea)\b[^>]*>/g)) assert.match(tag, /disabled=""/);
  assert.match(html, /<button\b[^>]*type="button"[^>]*disabled=""[^>]*>Submit<\/button>/);
  assert.doesNotMatch(html, /<form\b|<select\b|\bname=|\baction=|\bmethod=|type="submit"|type="password"|SelectFirm|ProductCategory|Review sample|Use sample/);
  assert.equal((html.match(/<button\b/g) || []).length, 3);
});

test('labels and helper references resolve and remain unique across duplicate placements', () => {
  const html = render({}, 'normal', '/contact-us', 2);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/(?:for|aria-describedby|aria-labelledby)="([^"]+)"/g)) for (const id of match[1].split(' ')) assert.ok(ids.includes(id), id);
});

test('stale CMS fields and generic mock outcome cannot enable or replace the disabled form', () => {
  const html = render({ params: { formId: 'contact-us', mockOutcome: 'success' }, fields: { data: { datasource: {
    schemaKey: { jsonValue: { value: 'new-york-contact' } }, body: { jsonValue: { value: 'STALE CMS COPY' } },
    children: { results: [{ inputType: { jsonValue: { value: 'password' } } }] },
  } } } }, 'editing', '/api/editing/render');
  assert.equal(html, render({ params: { formId: 'contact-us' } }, 'editing', '/api/editing/render'));
});

test('both login links only toggle the shared local dialog; no entered-value state or handlers exist', () => {
  const state = [];
  let cursor = 0;
  const mockReact = { ...React, useId: () => 'contact-test', useState: (initial) => {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [state[index], (value) => { state[index] = value; }];
  } };
  const local = loader({ react: mockReact });
  const Component = local(path.join(formRoot, 'ContactUsForm.props.tsx')).default;
  const Dialog = local(path.join(sourceRoot, 'components/content-sdk/AccessibleDialog.tsx')).default;
  const nodes = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const tree = () => { cursor = 0; return Component({ config }); };
  const links = nodes(tree()).filter((node) => node.type === 'button' && !node.props.disabled);
  assert.deepEqual(links.map((node) => node.props.children), ['log in', 'login']);
  for (const link of links) {
    link.props.onClick();
    let current = tree();
    const dialog = nodes(current).find((node) => node.type === Dialog);
    assert.ok(dialog);
    assert.equal(dialog.props.titleId, 'contact-test-contact-account-title');
    assert.equal(nodes(dialog).find((node) => node.type === 'h2').props.id, dialog.props.titleId);
    assert.equal(nodes(dialog).find((node) => node.type === 'p').props.children, 'Online account access is unavailable on this site. Please contact customer service for assistance.');
    dialog.props.onClose();
    assert.equal(nodes(tree()).some((node) => node.type === Dialog), false);
    link.props.onClick(); current = tree();
    nodes(current).find((node) => node.type === 'button' && node.props.children === 'Close').props.onClick();
    assert.equal(nodes(tree()).some((node) => node.type === Dialog), false);
  }
  assert.deepEqual(state, [false]);
  for (const control of nodes(tree()).filter((node) => ['input', 'textarea'].includes(node.type))) {
    assert.equal(control.props.disabled, true);
    assert.equal(control.props.name, undefined);
    assert.equal(control.props.value, undefined);
    assert.equal(control.props.onChange, undefined);
  }
  const source = fs.readFileSync(path.join(formRoot, 'ContactUsForm.props.tsx'), 'utf8');
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|console\.|dangerouslySetInnerHTML|onSubmit|formAction|\baction=|\bmethod=|window\.location|<form\b|<a\b/);
});
