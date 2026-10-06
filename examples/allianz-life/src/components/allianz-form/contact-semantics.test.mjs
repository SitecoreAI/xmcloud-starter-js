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
      if (specifier.endsWith('.css')) return {}; // App build evaluates local CSS; the handler harness does not.
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
const configs = JSON.parse(fs.readFileSync(path.join(formRoot, 'migration-forms.json'), 'utf8'));
const config = configs.find((form) => form.id === 'ny-contact');
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

test('CMS label/options/validation edits and empty fields cannot change code-owned contact definitions', () => {
  const native = datasource().children.results;
  for (const field of native) { field.label = { jsonValue: { value: 'CMS override' } }; field.options = { jsonValue: { value: '[]' } }; field.maxLength = { jsonValue: { value: '1' } }; }
  assert.deepEqual(formDefinitions('new-york-contact', native), definitions);
  assert.equal(definitions.length, 9);
});
const RealComponent = sourceLoader()(path.join(formRoot, 'GenericForm.props.tsx')).default;
function sdkRender(data, editing, Component = RealComponent) {
  const page = { mode: { isEditing: editing, isNormal: !editing }, siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Contact test', fields: {}, placeholders: {} } } } };
  return renderToStaticMarkup(React.createElement(realSdk.SitecoreProvider, { page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}) },
    React.createElement(Component, { config, params: {} })));
}
for (const editing of [false, true]) test(`code-owned contact renders with real SDK in ${editing ? 'editing' : 'normal'} mode`, () => {
  const html = sdkRender(undefined, editing);
  assert.doesNotMatch(html, /allianz-missing-data|contact-test-|CMS override|action=|method=/);
  if (editing) for (const field of definitions) assert.ok(html.includes(field.label));
  else assert.match(html, /<form[^>]*noValidate/);
});

// Real React hooks and SDK render seeded conditional fixtures; event behavior is checked below.
for (const [reason, open] of [['Other', false], ['SellProducts', false], ['PurchaseProducts', true]]) {
  test(`real Content SDK seeded ${reason} render exposes source multiple controls, labels and grouping`, () => {
    let index = 0;
    const seededReact = { ...React, useState(initial) { const current = index++; return React.useState(current === 0 ? valid(reason) : current === 5 ? open : initial); } };
    const Component = sourceLoader({ react: seededReact })(path.join(formRoot, 'GenericForm.props.tsx')).default;
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
  const Component = sourceLoader({ react: hooks, '@sitecore-content-sdk/nextjs': sdk })(path.join(formRoot, 'GenericForm.props.tsx')).default;
  data.schemaKey = field('schemaKey', key);
  const props = { config: key === 'new-york-contact' ? config : configs.find((form) => form.schemaKey === key) || config, params };
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

test('generic source search selects remain scalar and CMS cannot introduce credential fields', () => {
  const generic = formDefinitions('generic');
  assert.deepEqual(validateForm(generic, { selectPageCount: '12' }, 'generic'), {});
  assert.ok(validateForm(generic, { selectPageCount: 'bad' }, 'generic').selectPageCount);
  assert.ok(!generic[1].multiple);
  const h = harness('generic');
  const select = h.find((node) => node.type === 'select'); assert.equal(select.props.multiple, undefined);
  h.change('selectPageCount', '12'); h.submit(); h.click('Edit information'); assert.equal(h.state()[0].selectPageCount, '12');
  assert.deepEqual(formDefinitions('generic', [{ id: 'password', inputType: field('type', 'password') }]), generic);
});

test('no requests, logging, persistence, source backend/auth endpoints or widgets in form implementation', () => {
  for (const name of ['AllianzForm.tsx', 'form-rules.props.ts']) {
    const source = fs.readFileSync(path.join(formRoot, name), 'utf8');
    assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB)\b|console\.(?:log|warn|error)\s*\(/);
    assert.doesNotMatch(source, /\/SPA\/|<script|formAction|action=|method=/);
  }
  assert.equal(requests, 0); assert.equal(stores, 0);
});

test('death-claim handlers preserve conditional relationship, 20 policies, masked review, edit and repeated local outcomes', () => {
  const priorDocument=globalThis.document;globalThis.document={getElementById:()=>({focus(){}})};
  try {
    const h=harness('death-claim');
    assert.equal(h.nodes().filter(n=>n.props.name?.startsWith('StartClaimAbout.policycontractnumber')).length,1);
    const sampleClaim={
      'StartClaimAbout.firstname':'Avery','StartClaimAbout.lastname':'Sample',
      'StartClaimAbout.DateOfDeathMonth':'1','StartClaimAbout.DateOfDeathDay':'31','StartClaimAbout.DateOfDeathYear':'2025',
      'StartClaimAbout.DateOfBirthMonth':'2','StartClaimAbout.DateOfBirthDay':'28','StartClaimAbout.DateOfBirthYear':'1970',
      'StartClaimAbout.Last4SSN':'1234','StartClaimAboutYou.selectedrelationship':'Other',
      'StartClaimAboutYou.yourfirstname':'Morgan','StartClaimAboutYou.yourlastname':'Sample',
      'StartClaimAboutYou.emailaddress':'morgan@example.invalid','StartClaimAboutYou.phone':'2025550148',
      'StartClaimAboutYou.address':'100 Sample Street','StartClaimAboutYou.city':'Sample City','StartClaimAboutYou.selectedcountry':'United States',
    };
    for(const[name,value]of Object.entries(sampleClaim))h.change(name,value);
    assert.ok(h.nodes().some(n=>n.props.name==='StartClaimAboutYou.otherRelationship'));
    assert.equal(formDefinitions('death-claim').find(f=>f.name==='StartClaimAboutYou.otherRelationship').required,false);
    h.change('StartClaimAboutYou.otherRelationship','Sample relative');
    for(let i=1;i<20;i++)h.click('+ Add one more policy');
    assert.equal(h.state()[2],20);assert.equal(h.button('+ Add one more policy').props.disabled,true);
    assert.equal(h.nodes().filter(n=>n.props.name?.startsWith('StartClaimAbout.policycontractnumber')).length,20);
    h.submit();assert.equal(h.state()[3],'review');assert.match(h.text(),/••••/);assert.doesNotMatch(h.text(),/1234/);
    h.click('Edit information');assert.equal(h.state()[0]['StartClaimAbout.Last4SSN'],'1234');
    h.change('StartClaimAboutYou.selectedrelationship','Child');
    assert.ok(!h.nodes().some(n=>n.props.name==='StartClaimAboutYou.otherRelationship'));
    h.submit();assert.doesNotMatch(h.text(),/Sample relative/);h.click('Continue');assert.equal(h.state()[3],'complete');assert.deepEqual(h.state()[0],{});
    h.click('Start again');assert.equal(h.state()[2],1);assert.equal(h.state()[3],'entry');assert.deepEqual(h.state()[0],{});
  } finally {globalThis.document=priorDocument;}
});
