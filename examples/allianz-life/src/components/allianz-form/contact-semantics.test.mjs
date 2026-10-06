/** Offline contract/handler checks plus real Content SDK SSR. No browser or native CMS writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const realSdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
const formRoot = path.join(sourceRoot, 'components/allianz-form');
const schemas = JSON.parse(fs.readFileSync(path.join(formRoot, 'source-schemas.json'), 'utf8'));
function sourceLoader(overrides = {}) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
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
  }
  return load;
}
const rules = sourceLoader()(path.join(formRoot, 'form-rules.props.ts'));
const { formDefinitions, visibleDefinitions, validateForm, REASON } = rules;
const CATEGORY = 'ProductCategory.SelectedCategories';
const PRODUCT = '_ProductSelector.SelectedProducts';
const FIRM = 'SelectFirm.SelectedFirm';
const definitions = formDefinitions('new-york-contact');
const productValue = definitions.find((field) => field.name === PRODUCT).options[0].value;
const sample = {
  'ContactInfo.Name': 'Sample', 'ContactInfo.Email': 'sample@example.invalid',
  'ContactInfo.Phone': '202-555-0148', 'ContactInfo.ZipCode': '55416',
  'ContactInfo.Comment': 'Synthetic test only.',
};
const field = (name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value, metadata: {
  itemId: 'contact-test-item', fieldId: `contact-test-${name}`, fieldType,
} } });
function datasource() {
  return {
    heading: field('heading', 'Contact test heading'), body: field('body', '<p>Contact test body</p>', 'Rich Text'),
    schemaKey: field('schemaKey', 'new-york-contact'), submitLabel: field('submitLabel', 'Submit'),
    reviewHeading: field('reviewHeading', 'Review sample information'),
    successMessage: field('successMessage', '<p>Local mock success.</p>', 'Rich Text'),
    failureMessage: field('failureMessage', '<p>Local simulated failure.</p>', 'Rich Text'),
    children: { results: schemas['new-york-contact'].fields.map((definition, index) => ({
      id: `contact-field-${index}`, name: field(`name-${index}`, definition.name),
      label: field(`label-${index}`, definition.label), placeholder: field(`placeholder-${index}`, definition.placeholder),
      options: field(`options-${index}`, JSON.stringify(definition.options)), maxLength: field(`maxLength-${index}`, String(definition.maxLength)),
    })) },
  };
}
const visible = (values) => visibleDefinitions('new-york-contact', definitions, values, 1);
const valid = (reason) => ({ ...sample, [REASON]: reason, [FIRM]: 'Example Financial Group', [CATEGORY]: ['Fixed', 'Life'], [PRODUCT]: [productValue] });

test('source contract: nine fields, both source selectors multiple, category checkboxes and product optgroup', () => {
  assert.equal(definitions.length, 9);
  assert.deepEqual(definitions.filter((field) => field.multiple).map((field) => [field.name, field.selectionDisplay]), [[PRODUCT, 'dropdown'], [CATEGORY, 'checkboxes']]);
  assert.equal(definitions.find((field) => field.name === PRODUCT).options[0].group, 'Variable annuities');
  assert.equal(definitions.find((field) => field.name === PRODUCT).options.length, 1);
  assert.ok(formDefinitions('death-claim').every((field) => !field.multiple));
});

for (const [reason, conditional] of [['', []], ['PurchaseProducts', [PRODUCT]], ['SellProducts', [FIRM, CATEGORY]], ['Other', [CATEGORY]], ['QuestionContractPolicy', [CATEGORY]]]) {
  test(`live-source branch ${reason || 'initial'} has exact conditional fields and required semantics`, () => {
    const shown = visible({ [REASON]: reason });
    assert.deepEqual(shown.filter((field) => [FIRM, PRODUCT, CATEGORY].includes(field.name)).map((field) => field.name), conditional);
    assert.equal(shown.length, 6 + conditional.length);
    assert.ok(shown.every((field) => field.required));
    if (reason) assert.deepEqual(validateForm(shown, valid(reason), 'new-york-contact'), {});
  });
}

test('multi-value validation accepts all available selected values and rejects unknown, mixed, scalar, and cleared selections', () => {
  for (const [name, reason, options] of [[CATEGORY, 'Other', ['Fixed', 'Life']], [PRODUCT, 'PurchaseProducts', [productValue]]]) {
    const values = valid(reason);
    assert.deepEqual(validateForm(visible(values), { ...values, [name]: options }, 'new-york-contact'), {});
    for (const invalid of [[], [''], ['missing'], [...options, 'missing'], options[0], [42], [{}]]) {
      assert.ok(validateForm(visible(values), { ...values, [name]: invalid }, 'new-york-contact')[name], JSON.stringify(invalid));
    }
    assert.equal(validateForm(visible(values), { ...values, [name]: [] }, 'new-york-contact')[name], definitions.find((field) => field.name === name).requiredMessage);
  }
});

test('source required/maxLength/pattern validation remains active for every ordinary contact field', () => {
  const values = valid('Other');
  for (const name of Object.keys(sample)) assert.ok(validateForm(visible(values), { ...values, [name]: '' }, 'new-york-contact')[name]);
  for (const [name, invalid] of [['ContactInfo.Name', 'x'.repeat(51)], ['ContactInfo.Email', 'invalid'], ['ContactInfo.Phone', '123'], ['ContactInfo.ZipCode', 'no'], [REASON, 'missing']]) {
    assert.ok(validateForm(visible(values), { ...values, [name]: invalid }, 'new-york-contact')[name]);
  }
  assert.deepEqual(validateForm(visible(values), { ...values, 'ContactInfo.ZipCode': '55416-1234' }, 'new-york-contact'), {});
});

test('native labels/options/placeholders/maxLength remain editable while compiled validation/multiplicity stay locked', () => {
  const native = datasource().children.results;
  const email = native.find((entry) => entry.name.jsonValue.value === 'ContactInfo.Email');
  Object.assign(email, { label: field('label', 'Edited email'), placeholder: field('placeholder', 'Edited placeholder'), maxLength: field('max', '80'),
    inputType: field('type', 'textarea'), required: field('required', false), pattern: field('pattern', '^EDIT$'), validationMessage: field('message', 'Edited error') });
  const product = native.find((entry) => entry.name.jsonValue.value === PRODUCT);
  product.options = field('options', JSON.stringify([{ value: productValue, label: 'Edited product' }]));
  const actual = formDefinitions('new-york-contact', native);
  const edited = actual.find((entry) => entry.name === 'ContactInfo.Email');
  assert.equal(edited.label, 'Edited email'); assert.equal(edited.placeholder, 'Edited placeholder'); assert.equal(edited.maxLength, 80);
  assert.equal(edited.inputType, 'email'); assert.equal(edited.required, true); assert.notEqual(edited.pattern, '^EDIT$'); assert.notEqual(edited.requiredMessage, 'Edited error');
  assert.deepEqual(actual.find((entry) => entry.name === PRODUCT).options, [{ value: productValue, label: 'Edited product', group: 'Variable annuities' }]);
  assert.ok(actual.find((entry) => entry.name === PRODUCT).multiple);
  product.maxLength = field('max', '10');
  const limited = formDefinitions('new-york-contact', native);
  assert.equal(validateForm(visibleDefinitions('new-york-contact', limited, valid('PurchaseProducts'), 1), valid('PurchaseProducts'), 'new-york-contact')[PRODUCT], 'Enter no more than 10 characters');
  email.maxLength = field('max', '999999'); assert.equal(formDefinitions('new-york-contact', native).find((entry) => entry.name === 'ContactInfo.Email').maxLength, 5000);
});

test('native clear/restore and missing children preserve fixed schema contract and compiled fallbacks', () => {
  const native = datasource().children.results;
  const original = JSON.stringify(native);
  const cleared = native.map((entry) => ({ ...entry, label: field('empty-label', ''), placeholder: field('empty-placeholder', ''), options: field('empty-options', '') }));
  const actual = formDefinitions('new-york-contact', cleared);
  for (const [index, definition] of actual.entries()) {
    assert.equal(definition.label, definitions[index].label);
    assert.deepEqual(definition.options, definitions[index].options);
    assert.equal(definition.labelField.jsonValue.value, '', 'native empty editing metadata is retained');
  }
  assert.equal(formDefinitions('new-york-contact', []).length, 9);
  assert.equal(JSON.stringify(native), original);
});

const RealComponent = sourceLoader()(path.join(formRoot, 'AllianzForm.tsx')).Default;
function sdkRender(data, editing, Component = RealComponent) {
  const page = { mode: { isEditing: editing, isNormal: !editing }, siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Contact test', fields: {}, placeholders: {} } } } };
  return renderToStaticMarkup(React.createElement(realSdk.SitecoreProvider, { page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}) },
    React.createElement(Component, { fields: { data: { datasource: data } }, params: {} })));
}
for (const editing of [false, true]) {
  test(`real Content SDK ${editing ? 'editing' : 'normal'} render, native clear and restoration preserve metadata and safety`, () => {
    const data = datasource(); const before = JSON.stringify(data);
    const html = sdkRender(data, editing);
    assert.match(html, /Contact test heading/); assert.match(html, /Contact test body/);
    if (editing) {
      assert.doesNotMatch(html, /<form|<input|<textarea|<select/);
      for (let i = 0; i < 9; i++) assert.match(html, new RegExp(`contact-test-label-${i}`));
      assert.match(html, /contact-test-successMessage/); assert.match(html, /contact-test-failureMessage/);
    } else {
      assert.match(html, /<form[^>]*noValidate/); assert.match(html, /Information entered here stays in this browser/);
      assert.doesNotMatch(html, /action=|method=|<select|type="checkbox"/);
    }
    const clear = structuredClone(data);
    clear.heading.jsonValue.value = ''; clear.body.jsonValue.value = '';
    clear.children.results.forEach((entry) => { entry.label.jsonValue.value = ''; });
    const empty = sdkRender(clear, editing);
    assert.doesNotMatch(empty, /Contact test heading|Contact test body/);
    if (editing) for (let i = 0; i < 9; i++) assert.match(empty, new RegExp(`contact-test-label-${i}`));
    assert.equal(sdkRender(data, editing), html);
    assert.equal(JSON.stringify(data), before);
  });
}

// Real React hooks and SDK render seeded conditional fixtures; event behavior is checked below.
for (const [reason, open] of [['Other', false], ['SellProducts', false], ['PurchaseProducts', true]]) {
  test(`real Content SDK seeded ${reason} render exposes source multiple controls, labels and grouping`, () => {
    let index = 0;
    const seededReact = { ...React, useState(initial) { const current = index++; return React.useState(current === 0 ? valid(reason) : current === 5 ? open : initial); } };
    const Component = sourceLoader({ react: seededReact })(path.join(formRoot, 'AllianzForm.tsx')).Default;
    const html = sdkRender(datasource(), false, Component);
    if (reason === 'PurchaseProducts') {
      assert.match(html, /aria-expanded="true"/);
      assert.match(html, /role="group" aria-label="Variable annuities"/);
      assert.match(html, /type="checkbox"[^>]*name="_ProductSelector.SelectedProducts"[^>]*checked=""/);
    } else {
      assert.equal((html.match(/type="checkbox"/g) || []).length, 3);
      assert.equal((html.match(/checked=""/g) || []).length, 3, 'two categories plus reason');
      assert.match(html, /<fieldset[^>]*allianz-local-checkboxes/);
      assert.match(html, /Select at least one product category/);
    }
    assert.doesNotMatch(html, /action=|method=|<script/);
  });
}

// Hook/element harness executes event handlers; it is not a DOM, accessibility-tree or browser test.
function harness(key = 'new-york-contact', params = {}, data = datasource()) {
  let state = [], cursor = 0, tree; const refs = []; let refCursor = 0; let focusCalls = [];
  const hooks = { ...React, useId: () => 'contact-harness', useMemo: (fn) => fn(),
    useRef: () => { const index = refCursor++; return refs[index] ||= { current: null }; },
    useState: (initial) => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], (next) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; } };
  const sdk = { ...realSdk, useSitecore: () => ({ page: { mode: { isEditing: false } } }) };
  const Component = sourceLoader({ react: hooks, '@sitecore-content-sdk/nextjs': sdk })(path.join(formRoot, 'AllianzForm.tsx')).Default;
  data.schemaKey = field('schemaKey', key);
  const props = { fields: { data: { datasource: data } }, params };
  function nodes(node = tree) { if (Array.isArray(node)) return node.flatMap((child) => nodes(child ?? null)); if (!React.isValidElement(node)) return []; return [node, ...nodes(node.props.children ?? null)]; }
  function text(node = tree) {
    if (Array.isArray(node)) return node.map((child) => text(child ?? null)).join('');
    if (node == null || typeof node === 'boolean') return '';
    if (!React.isValidElement(node)) return String(node);
    if (node.type === sdk.Text || node.type === sdk.RichText) return node.props.field?.value || '';
    return text(node.props.children ?? null);
  }
  function render() { cursor = 0; refCursor = 0; tree = Component(props); for (const node of nodes()) if (node.props.ref) node.props.ref.current = { focus: () => focusCalls.push(node.type), querySelector: (selector) => ({ focus: () => focusCalls.push(selector) }) }; return tree; }
  function find(predicate) { const node = nodes().find(predicate); assert.ok(node, 'element found'); return node; }
  function button(label) { return find((node) => node.type === 'button' && text(node) === label); }
  function click(label) { button(label).props.onClick(); render(); }
  function change(name, value, checked = true) {
    const node = find((entry) => entry.props.name === name && (!['radio', 'checkbox'].includes(entry.props.type) || entry.props.value === value));
    node.props.onChange({ target: { value, checked } }); render();
  }
  function submit() { find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} }); render(); }
  function selectProducts() { find((node) => node.type === 'button' && node.props['aria-controls'])?.props.onClick(); render(); }
  function fill(reason) { change(REASON, reason); if (reason === 'QuestionContractPolicy') click('Continue'); if (reason === 'PurchaseProducts') { selectProducts(); change(PRODUCT, productValue); } else { change(CATEGORY, 'Fixed'); change(CATEGORY, 'Life'); } if (reason === 'SellProducts') change(FIRM, 'Example Financial Group'); for (const [name, value] of Object.entries(sample)) change(name, value); }
  render();
  return { render, nodes, text, find, button, click, change, submit, selectProducts, fill, state: () => state, focusCalls };
}
let requests = 0, stores = 0;
globalThis.requestAnimationFrame = (fn) => { fn(); return 1; };
globalThis.window = { location: { search: '' } };
globalThis.fetch = () => { requests++; throw new Error('No request permitted'); };
globalThis.XMLHttpRequest = class { constructor() { requests++; throw new Error('No request permitted'); } };
globalThis.localStorage = globalThis.sessionStorage = { setItem() { stores++; throw new Error('No storage permitted'); }, getItem() { stores++; throw new Error('No storage permitted'); } };

for (const reason of ['PurchaseProducts', 'SellProducts', 'Other', 'QuestionContractPolicy']) {
  test(`handlers: ${reason} review/edit preserves all selected values; clear/reselect/reset works`, () => {
    const h = harness(); h.fill(reason);
    const name = reason === 'PurchaseProducts' ? PRODUCT : CATEGORY;
    const selection = reason === 'PurchaseProducts' ? [productValue] : ['Fixed', 'Life'];
    assert.deepEqual(h.state()[0][name], selection);
    h.submit(); assert.equal(h.state()[3], 'review');
    for (const value of selection) assert.ok(h.text().includes(definitions.find((field) => field.name === name).options.find((option) => option.value === value).label));
    assert.match(h.text(), /Information entered here stays in this browser/);
    h.click('Edit information'); assert.equal(h.state()[3], 'entry'); assert.deepEqual(h.state()[0][name], selection);
    assert.ok(h.focusCalls.includes('input, select, textarea'));
    if (reason === 'PurchaseProducts') h.selectProducts();
    for (const value of selection) h.change(name, value, false);
    h.submit(); assert.ok(h.state()[1][name]); assert.equal(h.state()[3], 'entry');
    for (const value of selection) h.change(name, value);
    h.submit(); h.click('Start again');
    assert.deepEqual(h.state()[0], {}); assert.deepEqual(h.state()[1], {}); assert.equal(h.state()[3], 'entry'); assert.equal(h.state()[4], false); assert.equal(h.state()[5], false);
  });
}

test('handlers: product is a local accessible disclosure with checkbox choices, group label and Escape focus return', () => {
  const h = harness(); h.change(REASON, 'PurchaseProducts');
  const trigger = h.find((node) => node.type === 'button' && node.props['aria-controls']);
  assert.equal(trigger.props['aria-expanded'], false); assert.match(h.text(trigger), /Select/);
  assert.equal(h.find((node) => node.props.id === trigger.props['aria-controls']).props.hidden, true);
  h.selectProducts(); assert.match(h.text(), /Variable annuities/);
  assert.equal(h.find((node) => node.props.name === PRODUCT).props.type, 'checkbox');
  h.change(PRODUCT, productValue);
  h.find((node) => node.props.className === 'dropdown').props.onKeyDown({ key: 'Escape' }); h.render();
  assert.equal(h.state()[5], false); assert.ok(h.focusCalls.includes('button'));
  assert.match(h.text(h.find((node) => node.props['aria-controls'])), /Index Advantage/);
});

test('handlers: category group has visible labels, independent checkboxes and associated validation errors', () => {
  const h = harness(); h.change(REASON, 'Other'); h.submit();
  const controls = h.nodes().filter((node) => node.props.name === CATEGORY);
  assert.equal(controls.length, 3); assert.ok(controls.every((node) => node.props.type === 'checkbox' && node.props['aria-invalid']));
  for (const control of controls) assert.ok(h.nodes().some((node) => node.props.id === control.props['aria-describedby'] && node.props.role === 'alert'));
  h.change(CATEGORY, 'Fixed'); h.change(CATEGORY, 'Life'); h.change(CATEGORY, 'Fixed', false);
  assert.deepEqual(h.state()[0][CATEGORY], ['Life']);
});

test('handlers: original hidden-value retention stays local and hidden fields cannot leak into review/validation', () => {
  const h = harness(); h.fill('SellProducts'); h.change(REASON, 'PurchaseProducts');
  assert.equal(h.state()[0][FIRM], 'Example Financial Group'); assert.deepEqual(h.state()[0][CATEGORY], ['Fixed', 'Life']);
  h.selectProducts(); h.change(PRODUCT, productValue); h.submit();
  assert.equal(h.state()[3], 'review'); assert.doesNotMatch(h.text(), /Example Financial Group|Life Insurance|Fixed annuities or/);
  h.click('Edit information'); h.change(REASON, 'Other'); h.submit();
  assert.equal(h.state()[3], 'review'); assert.match(h.text(), /Life Insurance/); assert.doesNotMatch(h.text(), /Example Financial Group|Index Advantage/);
});

test('handlers: policy prompt is informational only, traps Tab and closes on Escape with radio focus restoration', () => {
  const h = harness(); h.change(REASON, 'QuestionContractPolicy');
  assert.equal(h.state()[4], true);
  const modal = h.find((node) => node.props.role === 'dialog');
  assert.equal(modal.props['aria-modal'], 'true'); assert.ok(modal.props['aria-labelledby']);
  assert.doesNotMatch(h.text(modal), /password|username/i);
  let prevented = false;
  const overlay = h.find((node) => node.props.className === 'allianz-local-account-overlay');
  overlay.props.onKeyDown({ key: 'Tab', preventDefault() { prevented = true; }, currentTarget: { querySelector: () => ({ focus() {} }) } }); assert.ok(prevented);
  overlay.props.onKeyDown({ key: 'Escape' }); h.render(); assert.equal(h.state()[4], false); assert.ok(h.focusCalls.includes('input[type="radio"]:checked'));
});

for (const outcome of ['success', 'error', 'failure']) {
  test(`handlers: ${outcome} local outcome clears all scalar/array values and can repeat from reset`, () => {
    const h = harness('new-york-contact', { mockOutcome: outcome }); h.fill('Other'); h.submit(); h.click('Continue');
    assert.equal(h.state()[3], outcome === 'success' ? 'complete' : 'failure'); assert.deepEqual(h.state()[0], {}); assert.match(h.text(), /No information was sent/);
    h.click('Start again'); h.fill('Other'); h.submit(); assert.equal(h.state()[3], 'review'); h.click('Start again'); assert.deepEqual(h.state()[0], {});
  });
}

test('generic forms retain native single-select/scalar validation; credential fields stay excluded', () => {
  const native = [{ id: 'select', name: field('name', 'choice'), label: field('label', 'Choice'), inputType: field('inputType', 'select'), required: field('required', true), options: field('options', '[{"value":"a","label":"A"},{"value":"b","label":"B"}]') }];
  const generic = formDefinitions('generic', native);
  assert.deepEqual(validateForm(generic, { choice: 'a' }, 'generic'), {});
  assert.ok(validateForm(generic, { choice: 'bad' }, 'generic').choice);
  assert.ok(!generic[0].multiple);
  const h = harness('generic', {}, { children: { results: native } });
  const select = h.find((node) => node.type === 'select'); assert.equal(select.props.multiple, undefined);
  h.change('choice', 'a'); h.submit(); h.click('Edit information'); assert.equal(h.state()[0].choice, 'a');
  assert.equal(formDefinitions('generic', [{ id: 'password', inputType: field('type', 'password') }]).length, 0);
});

test('no requests, logging, persistence, source backend/auth endpoints or widgets in form implementation', () => {
  for (const name of ['AllianzForm.tsx', 'form-rules.props.ts']) {
    const source = fs.readFileSync(path.join(formRoot, name), 'utf8');
    assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB)\b|console\.(?:log|warn|error)\s*\(/);
    assert.doesNotMatch(source, /\/SPA\/|<script|formAction|action=|method=/);
  }
  assert.equal(requests, 0); assert.equal(stores, 0);
});
