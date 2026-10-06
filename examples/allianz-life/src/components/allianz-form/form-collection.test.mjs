/** Complete native query projections must produce the same SDK rendering and field identities. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const { parse } = require('graphql');
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
const formRoot = path.join(sourceRoot, 'components/allianz-form');
const schemas = JSON.parse(fs.readFileSync(path.join(formRoot, 'source-schemas.json'), 'utf8'));
function sourceLoader(root = sourceRoot) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (specifier.endsWith('.css')) return {};
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(lib|components)\//.test(specifier) ? path.join(root, specifier) : undefined;
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
  }
  return load;
}
const load = sourceLoader();
const { formDatasource, FORM_DATASOURCE_FIELDS, FORM_CHILD_FIELDS } = load(path.join(formRoot, 'allianz-form.props.ts'));
const { formDefinitions, visibleDefinitions, validateForm } = load(path.join(formRoot, 'form-rules.props.ts'));
const Default = load(path.join(formRoot, 'AllianzForm.tsx')).Default;
const Product = load(path.join(formRoot, 'ProductContactForm.props.tsx')).default;
const native = (itemId, name, value, rich = false) => ({ jsonValue: {
  value, metadata: { itemId, fieldId: `${itemId}-${name}`, fieldType: rich ? 'Rich Text' : 'Single-Line Text' },
} });
const generic = [{ name: 'choice', label: 'Native choice', inputType: 'select', required: true, maxLength: 100,
  pattern: '', placeholder: '', requiredMessage: 'Choose one', options: [{ value: 'a', label: 'Choice A' }, { value: 'b', label: 'Choice B' }] }];
function datasource(key) {
  const id = `${key}-parent`;
  const values = { heading: 'Authored heading', body: '<p>Authored body</p>', schemaKey: key,
    secondaryHeading: 'Authored secondary heading', secondaryBody: '<p>Authored secondary body</p>',
    reviewHeading: 'Authored review heading', successMessage: '<p>Authored success</p>', failureMessage: '<p>Authored failure</p>', submitLabel: 'Authored submit' };
  const results = (schemas[key]?.fields ?? generic).map((definition, index) => {
    const childId = `${key}-child-${index}`;
    const childValues = { name: definition.name, label: `Native ${index}: ${definition.label}`, inputType: definition.inputType,
      required: definition.required, validationMessage: definition.requiredMessage, options: JSON.stringify(definition.options),
      maxLength: String(definition.maxLength), pattern: definition.pattern, placeholder: definition.placeholder,
      sourceName: definition.name, minValue: '0', maxValue: '100', initialValue: '', footnote: `<p>Native note ${index}</p>` };
    return { id: childId, ...Object.fromEntries(Object.entries(childValues).map(([name, value]) => [name, native(childId, name, value, name === 'footnote')])) };
  });
  return { id, ...Object.fromEntries(Object.entries(values).map(([name, value]) => [name, native(id, name, value, /body|message/i.test(name))])),
    children: { total: results.length, pageInfo: { hasNext: false, endCursor: 'complete-native-cursor' }, results } };
}
function collectionItem(item, names) {
  const result = { ...item, fieldCollection: [] };
  for (const name of names) if (Object.hasOwn(item, name)) {
    result.fieldCollection.push({ name: name.toUpperCase(), jsonValue: item[name]?.jsonValue });
    delete result[name];
  }
  return result;
}
function collection(data, root = true, children = true) {
  const result = root ? collectionItem(data, FORM_DATASOURCE_FIELDS) : { ...data };
  result.children = { ...data.children, results: data.children.results.map((item) => children ? collectionItem(item, FORM_CHILD_FIELDS) : item) };
  return result;
}
function render(data, editing = false, Component = Default) {
  const page = { mode: { isEditing: editing, isNormal: !editing }, siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Native form test', fields: {}, placeholders: {} } } } };
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, { page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}) }, React.createElement(Component, { fields: { data: { datasource: data } }, params: {} })));
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); }
  return value;
}

for (const key of ['generic', 'death-claim', 'new-york-contact', 'product-contact', 'new-york-product-contact']) {
  test(`${key}: root, child and complete collections exactly equal named SDK output in editing and normal modes`, () => {
    const data = freeze(datasource(key));
    for (const editing of [false, true]) {
      const expected = render(data, editing);
      for (const [root, children] of [[true, false], [false, true], [true, true]]) {
        assert.equal(render(freeze(collection(data, root, children)), editing), expected);
      }
      assert.doesNotMatch(expected, /allianz-missing-data/);
      if (editing) for (const child of data.children.results) assert.ok(expected.includes(`${child.id}-label`), child.id);
    }
  });
  test(`${key}: all native field objects, child identity/order, completeness and rule outcomes survive without input mutation`, () => {
    const named = freeze(datasource(key)), input = freeze(collection(named));
    const before = JSON.stringify(input), result = formDatasource(input);
    assert.equal(result.id, named.id);
    assert.equal(result.children.total, named.children.total);
    assert.strictEqual(result.children.pageInfo, named.children.pageInfo);
    assert.deepEqual(result.children.results.map((child) => child.id), named.children.results.map((child) => child.id));
    for (const name of FORM_DATASOURCE_FIELDS) assert.strictEqual(result[name].jsonValue, named[name].jsonValue, name);
    for (let index = 0; index < named.children.results.length; index++) for (const name of FORM_CHILD_FIELDS) {
      assert.strictEqual(result.children.results[index][name].jsonValue, named.children.results[index][name].jsonValue, `${index}.${name}`);
    }
    const definitions = formDefinitions(key, named.children.results), actual = formDefinitions(key, result.children.results);
    assert.deepEqual(actual, definitions);
    assert.deepEqual(visibleDefinitions(key, actual, {}, 20), visibleDefinitions(key, definitions, {}, 20));
    assert.deepEqual(validateForm(actual, {}, key), validateForm(definitions, {}, key));
    assert.equal(JSON.stringify(input), before);
    assert.strictEqual(formDatasource(named), named);
    assert.strictEqual(formDatasource(result), result);
  });
}
for (const key of ['product-contact', 'new-york-product-contact']) test(`${key}: direct Product component consumes collection fields`, () => {
  const data = datasource(key);
  for (const editing of [false, true]) assert.equal(render(collection(data), editing, Product), render(data, editing, Product));
});

test('death claim preserves all 44 native editable labels and full 48-result capacity with truncation metadata unchanged', () => {
  const data = datasource('death-claim');
  assert.equal(data.children.results.length, 44);
  while (data.children.results.length < 48) {
    const index = data.children.results.length;
    data.children.results.push({ ...data.children.results[0], id: `extra-child-${index}`, name: native(`extra-${index}`, 'name', `extra-${index}`) });
  }
  data.children.total = 49;
  data.children.pageInfo = { hasNext: true, endCursor: 'next-cursor' };
  const result = formDatasource(collection(data));
  assert.equal(result.children.results.length, 48);
  assert.equal(result.children.total, 49);
  assert.strictEqual(result.children.pageInfo, data.children.pageInfo);
  assert.equal(result.children.results.at(-1).id, 'extra-child-47');
});

test('schema-less death-claim inference still uses collection child names', () => {
  const data = datasource('death-claim'); delete data.schemaKey;
  for (const editing of [false, true]) assert.equal(render(collection(data), editing), render(data, editing));
});

test('named null, undefined, empty and editable-only fields take precedence over stale collection values', () => {
  for (const value of [null, undefined, { jsonValue: null }, { jsonValue: { value: '' } }, { jsonValue: { editable: '<span>Editable empty</span>' } }]) {
    const input = collection(datasource('product-contact'));
    input.heading = value; input.children.results[0].label = value;
    const result = formDatasource(input);
    assert.ok(Object.hasOwn(result, 'heading')); assert.strictEqual(result.heading, value);
    assert.ok(Object.hasOwn(result.children.results[0], 'label')); assert.strictEqual(result.children.results[0].label, value);
  }
});

test('clear and restore preserve native field identity and SDK editable chrome for parent and every child', () => {
  const original = datasource('product-contact'), cleared = structuredClone(original);
  cleared.heading.jsonValue.value = ''; cleared.body.jsonValue.value = '';
  for (const child of cleared.children.results) child.label.jsonValue.value = '';
  const html = render(collection(cleared), true);
  assert.equal(html, render(cleared, true));
  assert.ok(html.includes(`${cleared.id}-heading`)); assert.ok(html.includes(`${cleared.id}-body`));
  for (const child of cleared.children.results) assert.ok(html.includes(`${child.id}-label`));
  assert.equal(render(collection(original), true), render(original, true));
  const editable = { editable: '<span data-native-editable="preserved"></span>', metadata: { itemId: original.id, fieldId: 'empty-editable' } };
  const input = collection(original); input.fieldCollection.find((field) => field.name === 'HEADING').jsonValue = editable;
  assert.strictEqual(formDatasource(input).heading.jsonValue, editable);
});

test('only allowlisted field names are adapted, malformed collection records are ignored and missing data stays missing', () => {
  assert.equal(formDatasource(undefined), undefined); assert.equal(formDatasource(null), null);
  assert.match(render(undefined), /Add a datasource for AllianzForm/);
  for (const fieldCollection of [null, {}, 'invalid', []]) {
    const data = { id: 'empty', fieldCollection }; assert.strictEqual(formDatasource(data), data);
  }
  const data = { id: 'native-id', fieldCollection: [null, 1, {}, { name: 7, jsonValue: {} }, { name: 'heading' },
    { name: 'id', jsonValue: { value: 'replace-id' } }, { name: '__proto__', jsonValue: { value: 'unsafe' } },
    { name: 'unrecognized', jsonValue: { value: 'unexpected' } }, { name: 'heading', jsonValue: { value: 'first' } },
    { name: 'HEADING', jsonValue: { value: 'second' } }] };
  const result = formDatasource(data);
  assert.equal(result.id, 'native-id'); assert.equal(result.heading.jsonValue.value, 'first');
  assert.equal(Object.hasOwn(result, '__proto__'), false); assert.equal(Object.hasOwn(result, 'unrecognized'), false);
});

test('serialized query keeps the datasource envelope, complete native fields and original 48-child connection metadata', () => {
  const file = path.resolve(sourceRoot, '../../../authoring/allianz-life/items/allianz.renderings/Allianz Life/Form.yml');
  const yaml = fs.readFileSync(file, 'utf8');
  const query = yaml.match(/Hint: ComponentQuery\n  Value: \|\n([\s\S]*?)(?=- ID:)/)?.[1];
  assert.ok(query);
  const operation = parse(query).definitions[0];
  assert.equal(operation.name.value, 'AllianzFormQuery');
  assert.deepEqual(operation.variableDefinitions.map((entry) => [entry.variable.name.value, entry.type.kind, entry.type.type.name.value]), [['datasource', 'NonNullType', 'String'], ['language', 'NonNullType', 'String']]);
  const root = operation.selectionSet.selections[0];
  assert.equal(root.name.value, 'item'); assert.equal(root.alias.value, 'datasource');
  assert.deepEqual(root.arguments.map((entry) => [entry.name.value, entry.value.name.value]), [['path', 'datasource'], ['language', 'language']]);
  const selections = (node) => node.selectionSet.selections;
  const names = (node) => selections(node).map((entry) => entry.name.value);
  assert.deepEqual(names(root), ['id', 'fields', 'children']);
  const [rootId, fields, children] = selections(root);
  assert.equal(rootId.name.value, 'id'); assert.equal(fields.alias.value, 'fieldCollection');
  assert.deepEqual(names(fields), ['name', 'jsonValue']);
  assert.deepEqual(children.arguments.map((entry) => [entry.name.value, entry.value.value]), [['first', '48']]);
  assert.deepEqual(names(children), ['total', 'pageInfo', 'results']);
  assert.deepEqual(names(selections(children)[1]), ['hasNext', 'endCursor']);
  const results = selections(children)[2]; assert.deepEqual(names(results), ['id', 'fields']);
  const childFields = selections(results)[1]; assert.equal(childFields.alias.value, 'fieldCollection');
  assert.deepEqual(names(childFields), ['name', 'jsonValue']);
  assert.deepEqual([...FORM_DATASOURCE_FIELDS], ['heading', 'body', 'schemaKey', 'secondaryHeading', 'secondaryBody', 'reviewHeading', 'successMessage', 'failureMessage', 'submitLabel']);
  assert.deepEqual([...FORM_CHILD_FIELDS], ['name', 'label', 'inputType', 'required', 'validationMessage', 'options', 'maxLength', 'pattern', 'placeholder', 'sourceName', 'minValue', 'maxValue', 'initialValue', 'footnote']);
});

// A release owner can add an immutable source snapshot to prove exact before/after named-field output.
if (process.env.ALLIANZ_FORM_BASELINE_SRC) {
  const baselineRoot = path.resolve(process.env.ALLIANZ_FORM_BASELINE_SRC);
  const baseline = sourceLoader(baselineRoot)(path.join(baselineRoot, 'components/allianz-form/AllianzForm.tsx')).Default;
  for (const key of ['generic', 'death-claim', 'new-york-contact', 'product-contact', 'new-york-product-contact']) test(`${key}: candidate named and collection SDK output equal immutable baseline`, () => {
    const data = datasource(key);
    for (const editing of [false, true]) {
      const expected = render(data, editing, baseline);
      assert.equal(render(data, editing), expected);
      assert.equal(render(collection(data), editing), expected);
    }
  });
}
