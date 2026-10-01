import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sdk = require('@sitecore-content-sdk/nextjs');
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));

function loader(overrides = {}) {
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
      if (specifier === 'next/navigation') return { usePathname: () => '/about' };
      let local;
      if (specifier.startsWith('.')) local = path.resolve(path.dirname(filename), specifier);
      if (/^(components|lib)\//.test(specifier)) local = path.join(sourceRoot, specifier);
      if (local) {
        const resolved = [local, `${local}.ts`, `${local}.tsx`, path.join(local, 'index.ts')]
          .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return (name) => load(path.join(sourceRoot, `components/allianz-${name}/Allianz${name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('')}.tsx`)).Default;
}

function field(id, type, value = '') {
  return { jsonValue: { value, metadata: { fieldId: id, fieldType: type, itemId: 'native-datasource' } } };
}
const text = (id) => field(id, 'Single-Line Text');
const rich = (id) => field(id, 'Rich Text');
const image = (id) => field(id, 'Image', {});
const link = (id) => field(id, 'General Link', {});
const cases = [
  ['calculator', { heading: text('heading'), body: rich('body'), disclaimer: rich('disclaimer'), submitLabel: text('submit'), resultLabel: text('result-label'), initialResult: text('initial'), sampleResult: rich('sample'), children: { results: [{ id: 'input', label: text('label'), footnote: text('footnote'), initialValue: text('input-initial') }] } }],
  ['form', { heading: text('heading'), body: rich('body'), submitLabel: text('submit'), secondaryHeading: text('secondary-heading'), secondaryBody: rich('secondary-body'), reviewHeading: text('review'), successMessage: rich('success'), failureMessage: rich('failure'), children: { results: [{ id: 'conditional-input', label: text('conditional-label'), name: { jsonValue: { value: 'SelectFirm.SelectedFirm' } } }] } }],
  ['timeline', { heading: text('heading'), body: rich('body'), children: { results: [{ id: 'event', date: text('date'), heading: text('event-heading'), body: rich('event-body'), image: image('image'), link: link('link') }] } }],
  ['video', { heading: text('heading'), body: rich('body'), poster: image('poster'), mediaLink: link('media'), caption: rich('caption'), transcript: rich('transcript') }],
  ['rate-snapshot', { heading: text('heading'), rate: text('rate'), asOf: text('asof'), body: rich('body'), link: link('link') }],
  ['rate-table', { heading: text('heading'), body: rich('body'), captionText: text('caption'), tableBody: rich('table'), emptyState: rich('empty-state') }],
  ['legacy-hero', { heading: rich('heading'), body: rich('body'), desktopImage: image('desktop'), mobileImage: image('mobile'), primaryLink: link('link') }],
  ['legacy-rich-text', { heading: text('heading'), subheading: rich('subheading'), body: rich('body') }],
  ['legacy-card-grid', { heading: text('heading'), children: { results: [{ id: 'card', heading: text('card-heading'), body: rich('card-body'), image: image('image'), icon: image('icon'), link: link('link') }] } }],
  ['legacy-accordion', { heading: text('heading'), children: { results: [{ id: 'panel', heading: text('panel-heading'), body: rich('panel-body'), link: link('link') }] } }],
  ['legacy-page-header', { heading: rich('heading'), body: rich('body') }],
  ['legacy-link-list', { heading: text('heading'), children: { results: [{ id: 'link', heading: text('link-heading'), link: link('link') }] } }],
];
const components = loader();
function props(data, params = {}) {
  return { params: { theme: 'transparent', columns: '3', ...params }, fields: { data: { datasource: data } }, rendering: { componentName: 'Test', placeholders: {} } };
}
function render(component, data, mode, params = {}) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' }, siteName: 'allianzlife', layout: { sitecore: { context: {}, route: { name: 'Offline test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(component, props(data, params))));
}
function metadataIds(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId).sort();
}
function nativeFields(value, fields = []) {
  if (!value || typeof value !== 'object') return fields;
  if (value.jsonValue?.metadata) fields.push(value.jsonValue);
  else for (const child of Object.values(value)) nativeFields(child, fields);
  return fields;
}
function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!React.isValidElement(node)) return [];
  return [node, ...flatten(node.props.children)];
}

for (const [name, data] of cases) {
  test(`${name}: cleared native fields retain real SDK chrome only in editing`, () => {
    const before = JSON.stringify(data);
    const html = render(components(name), data, 'editing');
    assert.deepEqual(metadataIds(html), nativeFields(data).map((field) => field.metadata.fieldId).sort());
    assert.doesNotMatch(html, /href="\/"/);
    for (const mode of ['normal', 'preview']) {
      const visitor = render(components(name), data, mode);
      assert.deepEqual(metadataIds(visitor), []);
      assert.doesNotMatch(visitor, /\[No text in field\]|scEmptyImage|href="\/"/);
    }
    assert.equal(JSON.stringify(data), before, 'field values and metadata stay unchanged');
  });
  test(`${name}: missing native fields are never synthesized for authoring`, () => {
    const html = render(components(name), { children: { results: [{ id: 'missing' }] } }, 'editing');
    assert.deepEqual(metadataIds(html), []);
    assert.doesNotMatch(html, /\[No text in field\]|scEmptyImage|href="\/"/);
  });
  test(`${name}: component invocation uses actual SDK editing context and exact field objects`, () => {
    let mode = 'editing';
    const mocked = loader({
      '@sitecore-content-sdk/nextjs': { ...sdk, Text: 'sdk-text', RichText: 'sdk-rich', Image: 'sdk-image', Link: 'sdk-link', useSitecore: () => ({ page: { mode: { isEditing: mode === 'editing', isPreview: mode === 'preview', isNormal: mode === 'normal' } } }) },
      react: { ...React, useId: () => ':test:', useMemo: (fn) => fn(), useRef: () => ({ current: null }), useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}] },
    })(name);
    const original = nativeFields(data);
    const before = JSON.stringify(data);
    const nodes = flatten(mocked(props(data))).filter((node) => typeof node.type === 'string' && /^sdk-/.test(node.type));
    for (const field of original) assert.ok(nodes.some((node) => node.props.field === field), `${field.metadata.fieldId} stays the original SDK object`);
    assert.ok(nodes.every((node) => original.includes(node.props.field)), 'no nonexistent editing fields');
    for (const next of ['normal', 'preview']) {
      mode = next;
      const visitorNodes = flatten(mocked(props(data))).filter((node) => typeof node.type === 'string' && /^sdk-/.test(node.type));
      assert.ok(visitorNodes.every((node) => node.props.editable === false), 'only actual editing enables authoring');
    }
    assert.equal(JSON.stringify(data), before);
  });
}

test('editing exposes state-dependent content without calculator/form/video interactions', () => {
  for (const [name, data] of cases.filter(([name]) => ['calculator', 'form', 'video'].includes(name))) {
    const html = render(components(name), data, 'editing');
    assert.doesNotMatch(html, /<form\b|<input\b|<video\b|type="submit"/);
    if (name === 'video') assert.match(html, /<details open=""/);
  }
  const accordion = cases.find(([name]) => name === 'legacy-accordion')[1];
  assert.match(render(components('legacy-accordion'), accordion, 'editing'), /aria-expanded="true"/);
  assert.match(render(components('legacy-accordion'), accordion, 'normal'), /aria-expanded="false"/);
});

test('normal and preview keep conditional result, rate, and safe media behavior', () => {
  for (const mode of ['normal', 'preview']) {
    const video = render(components('video'), { heading: { jsonValue: { value: 'Sample' } }, localVideo: { jsonValue: { value: { src: 'https://external.invalid/movie.mp4' } } }, poster: { jsonValue: { value: { src: '/allianz-assets/poster.png' } } } }, mode);
    assert.doesNotMatch(video, /<video\b|external.invalid/);
    assert.match(video, /allianz-local-video-play/);
    assert.match(render(components('video'), { localVideo: { jsonValue: { value: { src: '/allianz-assets/sample.mp4' } } } }, mode), /<video[^>]*controls=""[^>]*src="\/allianz-assets\/sample.mp4"/);
    const rates = render(components('rate-table'), { tableBody: { jsonValue: { value: '<p>Table content</p>' } }, emptyState: { jsonValue: { value: '<p>Empty content</p>' } } }, mode);
    assert.match(rates, /Table content/);
    assert.doesNotMatch(rates, /Empty content/);
    const calculator = render(components('calculator'), { schemaKey: { jsonValue: { value: 'retirement-income' } }, sampleResult: { jsonValue: { value: '<p>Sample result</p>' } } }, mode);
    assert.match(calculator, /<form\b/);
    assert.doesNotMatch(calculator, /Sample result/);
    const form = render(components('form'), { schemaKey: { jsonValue: { value: 'new-york-contact' } }, successMessage: { jsonValue: { value: '<p>Complete content</p>' } }, children: { results: [{ id: 'firm', name: { jsonValue: { value: 'SelectFirm.SelectedFirm' } }, label: { jsonValue: { value: 'Conditional firm label' } } }] } }, mode);
    assert.doesNotMatch(form, /Conditional firm label|Complete content/);
    assert.match(form, /<form\b/);
  }
});

test('fixtures still render normally with no invented placeholders, requests, or persistence', () => {
  const fixtures = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json'), 'utf8'));
  const names = new Map(cases.map(([name]) => [`Allianz${name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('')}`, name]));
  let count = 0;
  for (const route of Object.values(fixtures.routes)) for (const rendering of route.components) {
    const name = names.get(rendering.componentName);
    if (!name) continue;
    const html = render(components(name), rendering.fields?.data?.datasource, 'normal', rendering.params);
    assert.doesNotMatch(html, /\[No text in field\]|scEmptyImage|allianz-missing-data/);
    count += 1;
  }
  assert.ok(count > 10, `Only ${count} fixtures exercised`);
  for (const [name] of cases) {
    const filename = `Allianz${name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('')}.tsx`;
    const source = fs.readFileSync(path.join(sourceRoot, `components/allianz-${name}/${filename}`), 'utf8');
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/);
  }
});

function interactionHarness(name, data, params = {}) {
  const hooks = [];
  let cursor = 0, root;
  const component = loader({
    '@sitecore-content-sdk/nextjs': { ...sdk, Text: 'sdk-text', RichText: 'sdk-rich', Image: 'sdk-image', Link: 'sdk-link', useSitecore: () => ({ page: { mode: { isEditing: false, isNormal: true, isPreview: false } } }) },
    react: { ...React, useId: () => ':flow:', useMemo: (fn) => fn(), useRef: () => ({ current: null }), useState(initial) {
      const slot = cursor++;
      if (!(slot in hooks)) hooks[slot] = typeof initial === 'function' ? initial() : initial;
      return [hooks[slot], (next) => { hooks[slot] = typeof next === 'function' ? next(hooks[slot]) : next; }];
    } },
  })(name);
  return {
    render() { cursor = 0; root = component(props(data, params)); return flatten(root); },
    one(predicate) { const node = flatten(root).find(predicate); assert.ok(node, 'expected local control exists'); return node; },
    submit() { let prevented = false; this.one((node) => node.type === 'form').props.onSubmit({ preventDefault() { prevented = true; } }); assert.equal(prevented, true); },
  };
}

test('visitor calculator retains validation, compute, reset, and prevented native submission', () => {
  const previous = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => callback();
  try {
    const data = { sampleResult: rich('sample'), children: { results: [{ id: 'amount', label: text('label'), minValue: { jsonValue: { value: '0' } }, initialValue: { jsonValue: { value: '' } } }] } };
    data.sampleResult.jsonValue.value = '<p>Sample output</p>';
    const h = interactionHarness('calculator', data);
    h.render(); h.submit();
    assert.ok(h.render().some((node) => node.props.role === 'alert'), 'empty input fails validation');
    h.one((node) => node.type === 'input').props.onChange({ target: { value: '100' } });
    h.render(); h.submit();
    assert.ok(h.render().some((node) => node.type === 'sdk-rich' && node.props.field === data.sampleResult.jsonValue), 'valid input unlocks captured sample only');
    h.one((node) => node.type === 'button' && node.props.children === 'Reset').props.onClick();
    assert.equal(h.render().find((node) => node.type === 'input').props.value, '');
    assert.ok(!h.render().some((node) => node.type === 'sdk-rich' && node.props.field === data.sampleResult.jsonValue));
  } finally { globalThis.requestAnimationFrame = previous; }
});

test('visitor form retains entry validation, review, local outcome, and reset without backend actions', () => {
  const previous = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => callback();
  try {
    for (const outcome of ['complete', 'failure']) {
      const data = { successMessage: rich('success'), failureMessage: rich('failure'), children: { results: [{ id: 'name', name: { jsonValue: { value: 'sample-name' } }, label: text('label'), required: { jsonValue: { value: true } } }] } };
      const h = interactionHarness('form', data, { mockOutcome: outcome });
      h.render(); h.submit();
      assert.ok(h.render().some((node) => node.props.role === 'alert'), 'required field stays required');
      h.one((node) => node.type === 'input').props.onChange({ target: { value: 'Synthetic Example' } });
      h.render(); h.submit(); h.render();
      assert.ok(h.one((node) => node.props.className === 'allianz-local-review'));
      h.one((node) => node.type === 'button' && node.props.children === 'Continue').props.onClick();
      assert.ok(h.render().some((node) => node.type === 'sdk-rich' && node.props.field === data[outcome === 'failure' ? 'failureMessage' : 'successMessage'].jsonValue));
      h.one((node) => node.type === 'button' && node.props.children === 'Start again').props.onClick();
      assert.equal(h.render().find((node) => node.type === 'input').props.value, '');
      const form = h.one((node) => node.type === 'form');
      assert.equal(form.props.action, undefined);
      assert.equal(form.props.method, undefined);
    }
  } finally { globalThis.requestAnimationFrame = previous; }
});
