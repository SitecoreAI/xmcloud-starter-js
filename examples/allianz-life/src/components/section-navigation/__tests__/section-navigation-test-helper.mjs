import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const directory = fileURLToPath(new URL('.', import.meta.url));
export const sourceRoot = path.resolve(directory, '../../..');
export const require = createRequire(path.join(sourceRoot, '../package.json'));
const ts = require('typescript');
const { parse } = require('graphql');
const modules = new Map();
export function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(sourceRoot));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier === 'server-only' || specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(lib|components)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return load(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}

export const data = load(path.join(sourceRoot, 'lib/section-navigation-data.ts'));
export const server = load(path.join(sourceRoot, 'lib/section-navigation-server.ts'));
export const id = (number) => `00000000-0000-4000-8000-${number.toString(16).padStart(12, '0')}`;
export const bindings = {
  pageBaseTemplateId: id(800), excludedFilterFieldId: id(801),
  rootParameterName: 'Verified section root', filterParameterName: 'Verified selected filter',
};
export const text = (value, owner) => ({ jsonValue: { value, metadata: {
  itemId: owner, fieldId: data.SECTION_NAVIGATION_TITLE_FIELD_ID, fieldType: 'Single-Line Text',
}, editable: `<span data-field-id="${data.SECTION_NAVIGATION_TITLE_FIELD_ID}">${value}</span>` } });

export function dataset(count = 24, publicRoot = '/a-section', rootId = id(100)) {
  const root = { id: rootId, path: `/sitecore/content/Test/Site/Home${publicRoot}`, url: { path: publicRoot },
    navigationTitle: text('Authored section caption', rootId), parent: { id: id(99) } };
  const children = Array.from({ length: count }, (_, index) => ({
    id: id(index + 1), path: `${root.path}/child-${index + 1}`, url: { path: `${publicRoot}/child-${index + 1}` },
    parent: { id: rootId }, navigationTitle: text(`Caption ${index + 1}`, id(index + 1)),
    excludedFilters: { jsonValue: { value: '' } },
    // Different concrete templates share the same inherited page base membership.
    concreteTemplate: id(1000 + index), inheritedTemplates: [bindings.pageBaseTemplateId],
  }));
  const pages = [root, ...children].map((page) => ({ ...page, inheritedTemplates: page.inheritedTemplates ?? [bindings.pageBaseTemplateId] }));
  return { root, children, pages, current: children[1] ?? root };
}

export function scope(records, language = 'en', filterId = id(700)) {
  return { rootId: records.root.id, currentId: records.current.id, language, filterId };
}

export function inputs(query) {
  const operation = parse(query).definitions[0];
  const value = (node) => node.kind === 'ObjectValue' ? Object.fromEntries(node.fields.map((field) => [field.name.value, value(field.value)]))
    : node.kind === 'ListValue' ? node.values.map(value) : node.kind === 'IntValue' ? Number(node.value) : node.value;
  const selections = operation.selectionSet.selections.map((selection) => ({
    alias: selection.alias?.value ?? selection.name.value, name: selection.name.value,
    ...Object.fromEntries(selection.arguments.map((argument) => [argument.name.value, value(argument.value)])),
    selections: selection.selectionSet.selections.map((child) => ({ name: child.name.value,
      ...Object.fromEntries((child.arguments ?? []).map((argument) => [argument.name.value, value(argument.value)])),
    })),
  }));
  return { operation: operation.name.value, selections };
}

export function harness(records, { failure, change } = {}) {
  const calls = [];
  const getData = async (query, variables, fetchOptions) => {
    const args = inputs(query);
    calls.push({ query, args, variables, fetchOptions });
    if (failure) throw failure;
    let response;
    if (args.operation.endsWith('Children')) {
      const rootInput = args.selections[0], currentInput = args.selections[1];
      const childInput = rootInput.selections.find((selection) => selection.name === 'children');
      const offset = Number(childInput.after ?? 0), hasNext = offset + childInput.first < records.children.length;
      response = {
        root: data.normalizeSectionNavigationId(rootInput.path) === data.normalizeSectionNavigationId(records.root.id)
          ? { ...records.root, children: { total: records.children.length, results: records.children.slice(offset, offset + childInput.first),
            pageInfo: { hasNext, endCursor: hasNext ? String(offset + childInput.first) : null } } } : null,
        current: data.normalizeSectionNavigationId(currentInput.path) === data.normalizeSectionNavigationId(records.current.id) ? records.current : null,
      };
    } else {
      const search = args.selections[0];
      const template = search.where.AND.find((filter) => filter.name === '_templates').value;
      const rows = records.pages.filter((page) => page.inheritedTemplates?.some((id) => data.normalizeSectionNavigationId(id) === template));
      const offset = Number(search.after ?? 0), hasNext = offset + search.first < rows.length;
      response = { search: { total: rows.length, results: rows.slice(offset, offset + search.first),
        pageInfo: { hasNext, endCursor: hasNext ? String(offset + search.first) : null } } };
    }
    return change ? change(response, args, calls.length) : response;
  };
  return { getData, calls };
}

export function layout(records, { language = 'en', params, currentId = records.current.id, count = 1 } = {}) {
  return { sitecore: { context: { language, site: { name: 'allianz-life' } }, route: {
    itemId: currentId, fields: {}, placeholders: { main: Array.from({ length: count }, (_, index) => ({
      uid: `section-${index}`, componentName: 'SectionNavigation', params: params ?? {
        [bindings.rootParameterName]: records.root.id, [bindings.filterParameterName]: id(700),
      },
    })) },
  } } };
}
