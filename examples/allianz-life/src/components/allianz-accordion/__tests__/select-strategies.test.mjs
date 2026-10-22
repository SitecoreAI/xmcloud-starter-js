import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, render, require, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./select-strategies.fixture.json', import.meta.url)));
const filename = path.join(sourceRoot, 'components/allianz-accordion/AllianzAccordion.tsx');
const Accordion = loadSource(filename), React = require('react'), sdk = require('@sitecore-content-sdk/nextjs');
const sha = value => createHash('sha256').update(value).digest('hex');
const params = { RenderingIdentifier: 'fixture-select-strategies', theme: 'blue-soft', headingLevel: 'h1',
  spacing: 'sm', paddingTop: 'sm', paddingBottom: 'sm' };
const envelope = (state = 'filled') => {
  const data = structuredClone(fixture.syntheticSdkEnvelope);
  for (const entry of data.children.results) for (const key of ['heading', 'body']) {
    if (state === 'absent') delete entry[key];
    else if (state === 'cleared') entry[key].jsonValue.value = '';
  }
  return data;
};
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const nodes = (element, predicate) => {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(child => nodes(child, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
};
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

function observedModule(calls, hooks) {
  const compiled = new Module(filename);
  compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(sourceRoot));
  compiled.require = specifier => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === 'react') return hooks ? { ...React, ...hooks.react } : React;
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk,
      ...(hooks ? { useSitecore: hooks.useSitecore } : {}),
      ...Object.fromEntries(['Text', 'RichText'].map(name => [name, props => {
        calls.push({ name, ...props }); return React.createElement(sdk[name], props);
      }])) };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return loadSource(resolved);
    }
    return require(specifier);
  };
  const ts = require('typescript');
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  return compiled.exports;
}

test('Select binds one existing collection to six independently spaced source grids in source order', () => {
  assert.equal(fixture.source.sha256, '8fe6d596749100391f339280abbf78a6e997eef4a5196f4d187fa2a489e0acd8');
  assert.deepEqual(fixture.binding.rootFieldFence, { heading: '', primaryLink: '' });
  const data = freeze(envelope()), before = JSON.stringify(data);
  const html = render(Accordion.SelectStrategies, data, false, params);
  assert.match(html, /^<div class="l-container--full-width t-bg-transparent axlTileCollection allianz-iap-strategies allianz-select-strategies" id="fixture-select-strategies">/);
  const grids = html.split('<div class="l-grid l-grid--max-width l-grid--no-gutters-mobile">').slice(1);
  assert.equal(grids.length, fixture.sourceGrids.length);
  for (const [index, source] of fixture.sourceGrids.entries()) {
    assert.equal(source.order, index + 1);
    assert.equal(sha(source.sourceBody), source.bodySHA256);
    assert.ok(grids[index].includes(`class="${source.columnClass}"`));
    assert.ok(grids[index].includes(`class="${source.accordionClass}"`));
    assert.ok(grids[index].includes(`class="${source.triggerClass}"`));
    assert.ok(grids[index].includes(`class="${source.panelClass}"`));
    assert.equal((grids[index].match(/<button /g) || []).length, 1);
    assert.ok(grids[index].includes(source.heading));
    assert.ok(grids[index].includes(source.sourceBody));
    assert.equal(html.split(source.sourceBody).length - 1, 1, 'Each complete Body appears once');
  }
  assert.equal((html.match(/u-padding-bottom-md/g) || []).length, 6);
  assert.equal((html.match(/<table class="o-table-index">/g) || []).length, 6);
  assert.doesNotMatch(html, /t-bg-blue-soft|u-padding-top-sm|u-padding-bottom-sm|<h1|<h2|role="heading"/);
  assert.equal(JSON.stringify(data), before);
  assert.equal((render(Accordion.IapStrategies, data, false, params).match(/u-padding-bottom-md/g) || []).length, 1,
    'The prior shared-grid presentation cannot satisfy Select source spacing');
});

test('Select preserves every whole source body, table, financial sentence and PDF attribute through installed RichText', () => {
  const data = freeze(envelope());
  for (const editing of [false, true]) {
    const html = render(Accordion.SelectStrategies, data, editing, params);
    for (const source of fixture.sourceGrids) {
      assert.ok(html.includes(source.sourceBody));
      assert.ok(html.includes(`href="${source.pdfHref}"`));
      if (source.pdfTarget) assert.ok(html.includes(`target="${source.pdfTarget}"`));
    }
  }
  // This deliberately unapproved synthetic URL is not a native asset mapping.
  const linked = envelope();
  const unapprovedBody = '<p>Existing 0.70% wording and 1.55% wording stay authored.</p><table class="o-table-index"><tbody><tr><td>Authored</td></tr></tbody></table><a href="https://dam.example.test/original.pdf?v=fixture-only" target="_blank" aria-label="Keep authored PDF">PDF</a>';
  const unavailableBody = '<p>Existing 0.70% wording and 1.55% wording stay authored.</p><table class="o-table-index"><tbody><tr><td>Authored</td></tr></tbody></table><a href="#service-unavailable" target="" aria-label="Keep authored PDF">PDF</a>';
  linked.children.results[0].body.jsonValue.value = unapprovedBody;
  const original = linked.children.results[0].body.jsonValue, before = JSON.stringify(linked);
  const calls = [], Observed = observedModule(calls);
  freeze(linked);
  assert.ok(render(Observed.SelectStrategies, linked, false, params).includes(unavailableBody),
    'An unapproved synthetic URL stays inert while the financial sentence, table and ARIA remain exact');
  assert.ok(calls.some(call => call.name === 'RichText' && call.field.value === unavailableBody && call.field.metadata === original.metadata));
  calls.length = 0;
  assert.ok(render(Observed.SelectStrategies, linked, true, params).includes(unapprovedBody));
  assert.ok(calls.some(call => call.name === 'RichText' && call.field === original), 'editing receives the original complete Field');
  assert.equal(JSON.stringify(linked), before);
});

test('Select passes exact field objects and metadata once to SDK Text/RichText in visitor and editing modes', () => {
  const calls = [], Observed = observedModule(calls);
  for (const state of ['filled', 'cleared', 'absent']) for (const editing of [false, true]) {
    const data = freeze(envelope(state)), before = JSON.stringify(data); calls.length = 0;
    render(Observed.SelectStrategies, data, editing, params);
    assert.equal(calls.length, state === 'filled' ? 12 : 0);
    for (const entry of data.children.results) for (const [key, sdkName] of [['heading', 'Text'], ['body', 'RichText']]) {
      const field = entry[key]?.jsonValue;
      const matches = calls.filter(call => call.name === sdkName && call.field === field);
      assert.equal(matches.length, field?.value ? 1 : 0, `${state}/${key}: only populated native fields render`);
      for (const call of matches) assert.equal(call.editable, editing);
      if (field?.value) assert.ok(matches[0].field.metadata.fixtureOnly);
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('editing preserves 12 populated field markers and starts collapsed like the visitor', () => {
  const data = envelope(), expected = data.children.results.flatMap(entry => [entry.heading.jsonValue.metadata, entry.body.jsonValue.metadata]);
  const visitor = render(Accordion.SelectStrategies, data, false, params);
  assert.equal(markers(visitor).length, 0);
  assert.equal((visitor.match(/aria-expanded="false"/g) || []).length, 6);
  assert.equal((visitor.match(/hidden=""/g) || []).length, 6);
  const editor = render(Accordion.SelectStrategies, data, true, params), actual = markers(editor);
  assert.equal(actual.length, expected.length);
  for (const owner of expected) assert.equal(actual.filter(marker => marker.itemId === owner.itemId && marker.fieldId === owner.fieldId).length, 1);
  assert.equal((editor.match(/aria-expanded="false"/g) || []).length, 6);
  assert.equal((editor.match(/hidden=""/g) || []).length, 6);
});

test('each Select instance and duplicate child identity receives unique matching trigger/panel IDs', () => {
  const data = envelope(); data.children.results[1].id = data.children.results[0].id;
  const { renderToStaticMarkup } = require('react-dom/server');
  const html = renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: { mode: { isEditing: false }, siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(React.Fragment, null,
    ...['one', 'two'].map(id => React.createElement(Accordion.SelectStrategies, { key: id,
      fields: { data: { datasource: data } }, params: { RenderingIdentifier: id } })))));
  const triggers = [...html.matchAll(/<button id="([^"]+)"[^>]*aria-controls="([^"]+)"/g)];
  assert.equal(triggers.length, 12);
  assert.equal(new Set(triggers.flatMap(match => [match[1], match[2]])).size, 24);
  for (const [, trigger, panel] of triggers) assert.ok(html.includes(`id="${panel}" role="region" aria-labelledby="${trigger}"`));
  assert.doesNotMatch(html, /id="accordion1"|id="content1"|id="accordion4"/);
});

test('native button toggles compose functional state, allow independent panels and remain instance-scoped', () => {
  let instance = 'one', editing = false;
  const states = new Map();
  const hooks = { react: { useId: () => `instance-${instance}`, useState: () => {
    const name = instance;
    return [states.get(name) ?? [], update => {
      assert.equal(typeof update, 'function'); states.set(name, update(states.get(name) ?? []));
    }];
  } }, useSitecore: () => ({ page: { mode: { isEditing: editing } } }) };
  const Observed = observedModule([], hooks), data = freeze(envelope());
  const draw = () => Observed.SelectStrategies({ params, fields: { data: { datasource: data } } });
  const buttons = tree => nodes(tree, node => node.type === 'button');
  const panels = tree => nodes(tree, node => node.props?.role === 'region');
  let tree = draw(), initial = buttons(tree);
  initial[0].props.onClick(); initial[1].props.onClick();
  tree = draw(); assert.deepEqual(buttons(tree).map(button => button.props['aria-expanded']), [true, true, false, false, false, false]);
  assert.deepEqual(panels(tree).map(panel => panel.props.hidden), [false, false, true, true, true, true]);
  buttons(tree)[0].props.onClick(); assert.deepEqual(buttons(draw()).map(button => button.props['aria-expanded']), [false, true, false, false, false, false]);
  instance = 'two'; assert.ok(buttons(draw()).every(button => !button.props['aria-expanded']));
  editing = true; tree = draw(); assert.ok(buttons(tree).every(button => !button.props['aria-expanded']));
  assert.ok(panels(tree).every(panel => panel.props.hidden));
  buttons(tree)[0].props.onClick(); tree = draw();
  assert.deepEqual(buttons(tree).map(button => button.props['aria-expanded']), [true, false, false, false, false, false]);
  assert.deepEqual(panels(tree).map(panel => panel.props.hidden), [false, true, true, true, true, true]);
  for (const button of buttons(tree)) { assert.equal(button.props.type, 'button'); assert.equal(button.props.role, undefined); }
});

test('empty and absent fields/children retain source ownership and missing datasource fallback without invented content', () => {
  for (const editing of [false, true]) {
    for (const state of ['cleared', 'absent']) assert.doesNotThrow(() => render(Accordion.SelectStrategies, envelope(state), editing, params));
    for (const data of [{}, { children: { results: [] } }, { children: { total: 0 } }]) {
      const html = render(Accordion.SelectStrategies, data, editing, params);
      assert.doesNotMatch(html, /<button|<table|u-padding-bottom-md|Additional resources/);
    }
    assert.equal(render(Accordion.SelectStrategies, undefined, editing, params), render(Accordion.IapStrategies, undefined, editing, params));
  }
});

test('Select retains inherited hidden/expanded CSS guards and table-scroller markup without modifying styles', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-accordion/AllianzIapStrategies.css'), 'utf8');
  assert.match(css, /\.allianz-iap-strategies \.c-accordion__item-content\[hidden\]\s*\{\s*display: none;/);
  assert.match(css, /:not\(\[hidden\]\)\s*\{\s*max-height: none;\s*overflow: hidden;/);
  const html = render(Accordion.SelectStrategies, envelope(), true, params);
  assert.equal((html.match(/class="table-scroller-container"/g) || []).length, 6);
  assert.equal((html.match(/class="c-accordion__chevron a-icon" aria-hidden="true"/g) || []).length, 6);
  assert.equal((html.match(/focusable="false"/g) || []).length, 6);
});

test('all 28 pre-existing accordion exports preserve 84 approved-release visitor outputs', () => {
  const baseline = JSON.parse(fs.readFileSync(new URL('./wysiwyg-normal-baseline.fixture.json', import.meta.url)));
  assert.equal(baseline.sourceCommit, 'f2f97d59e94c06485394c75104607f2bd8e346b8');
  assert.equal(baseline.componentSourceSHA256, 'bc954b8b1dfeefdc255e278ea4a00fd23c0cdfc36965581c02a5d2b1da1e50ee');
  assert.equal(baseline.inputFixtureSHA256, sha(fs.readFileSync(new URL('./select-strategies.fixture.json', import.meta.url))));
  assert.equal(baseline.renders.length, 84);
  for (const item of baseline.renders) {
    assert.equal(item.editing, false);
    assert.equal(sha(render(Accordion[item.variant], envelope(item.state), false, params)), item.sha256,
      `${item.variant}/${item.state}/visitor`);
  }
  // Preserve the older source-layout oracle wherever it predates no approved
  // instance-ID change. Its editing snapshots describe the superseded open-all UI.
  const instanceScopedAliases = new Set(['Default', 'FixedProductAccordion', 'AA5AllocationAnswers', 'AA5CreditingAnswers']);
  const compatible = fixture.baseline.renders.filter(item => !item.editing && !instanceScopedAliases.has(item.variant));
  assert.equal(compatible.length, 72);
  for (const item of compatible) assert.equal(
    sha(render(Accordion[item.variant], envelope(item.state), false, params)), item.sha256,
    `${item.variant}/${item.state}/historical-visitor`);
});
