import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../../..');
// Fixtures live here; field renderers come from the consuming app's real SDK.
const dependencyRoot = path.resolve(sourceRoot, '..');
const require = createRequire(path.join(dependencyRoot, 'package.json'));
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { parse } = require('graphql');
const postcss = require('postcss');
const modules = new Map();
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(dependencyRoot);
  modules.set(filename, compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`]
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return /\.tsx?$/.test(resolved) ? loadSource(resolved) : require(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const components = {
  PressRelease: loadSource(path.join(sourceRoot, 'components/press-release/PressRelease.tsx')).Default,
  NewsroomReturn: loadSource(path.join(sourceRoot, 'components/newsroom-return/NewsroomReturn.tsx')).Default,
  LegalDisclosures: loadSource(path.join(sourceRoot, 'components/legal-disclosures/LegalDisclosures.tsx')).Default,
};
const records = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json'), 'utf8')).records;
const field = (value) => ({ jsonValue: { value } });
function render(name, data, isEditing = false, params = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Press Release', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(components[name], { params,
    fields: data === undefined ? undefined : { data: { datasource: data } },
  })));
}
function outline(kind, source) {
  const result = spawnSync('python3', [path.join(here, 'source_contract.py'), 'skeleton', kind], {
    input: source, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('all 81 captured sources validate independently of runtime implementation', () => {
  const result = spawnSync('python3', [path.join(here, 'source_contract.py')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('SDK rendering matches the independently captured source shell for all 81 routes', () => {
  for (const record of records) {
    const source = fs.readFileSync(path.join(here, record.fragmentFile), 'utf8');
    assert.deepEqual(outline('PressRelease', render('PressRelease', record.exactSourceFieldValues)),
      outline('PressRelease', source), record.route);
  }
});

test('one-link return and body-only disclosures have the same source design on all 81 routes', () => {
  for (const record of records) {
    const source = fs.readFileSync(path.join(here, record.fragmentFile), 'utf8');
    for (const [name, data] of [['NewsroomReturn', record.newsroomReturn], ['LegalDisclosures', { body: record.exactSourceLegalBody }]]) {
      assert.deepEqual(outline(name, render(name, data)), outline(name, source), record.route);
    }
    const sourceArrow = source.match(/<path[^>]*\bd="([^"]+)"/)[1];
    assert.ok(render('NewsroomReturn', record.newsroomReturn).includes(`d="${sourceArrow}"`));
  }
});

test('all exact captured HTML survives the real SDK, including styles, lists, tables, endnotes and blank disclosures', () => {
  const years = { 2024: 0, 2025: 0, 2026: 0 };
  const counts = { styledBodies: 0, formattingDivs: 0, lists: 0, tables: 0, endnotes: 0, nonemptyDisclosures: 0 };
  const disclosures = new Set();
  for (const record of records) {
    years[record.route.match(/\/(\d{4})-press-releases\//)[1]]++;
    const fields = record.exactSourceFieldValues;
    const before = JSON.stringify(fields);
    const html = render('PressRelease', fields);
    for (const name of ['summary', 'body']) {
      assert.ok(html.includes(fields[name].jsonValue.value), `${record.route}: exact ${name}`);
    }
    assert.equal(JSON.stringify(fields), before);
    const body = fields.body.jsonValue.value;
    counts.styledBodies += /\s(?:style|class)=/.test(body);
    counts.formattingDivs += /<div\b/.test(body);
    counts.lists += /<(?:ul|ol)\b/.test(body);
    counts.tables += /<table\b/.test(body);
    counts.endnotes += /id="edn/.test(body);
    const legal = record.exactSourceLegalBody.jsonValue.value;
    assert.ok(render('LegalDisclosures', { body: record.exactSourceLegalBody }).includes(legal), record.route);
    if (legal.trim()) {
      counts.nonemptyDisclosures++;
      disclosures.add(legal.trim());
    } else {
      const blank = render('LegalDisclosures', { body: record.exactSourceLegalBody });
      assert.match(blank, /class="col-md-12 content-body disclosure"/);
      assert.doesNotMatch(blank, /About Allianz Life|\[No text in field\]|data-sc-field/);
    }
  }
  assert.deepEqual(years, { 2024: 32, 2025: 25, 2026: 24 });
  assert.deepEqual(counts, { styledBodies: 77, formattingDivs: 7, lists: 46, tables: 3, endnotes: 1, nonemptyDisclosures: 80 });
  assert.equal(disclosures.size, 14);
});

test('summary P/div editing content keeps fixed source H4 typography without changing authored HTML', () => {
  const css = postcss.parse(fs.readFileSync(path.join(here, '../PressRelease.css'), 'utf8'));
  const sourceCss = postcss.parse(fs.readFileSync(path.join(here, 'source-summary-typography.css'), 'utf8'));
  const declarations = (rule) => Object.fromEntries(rule.nodes.filter((node) => node.type === 'decl')
    .map((node) => [node.prop, node.value]));
  const root = css.nodes.find((node) => node.type === 'rule' && node.selector === '.press-release .tileSubHeading');
  const sourceH4 = sourceCss.nodes.find((node) => node.type === 'rule' && node.selector === '.h4,h4');
  assert.equal(declarations(root)['font-size'], declarations(sourceH4)['font-size']);
  assert.equal(declarations(root)['line-height'], declarations(sourceH4)['line-height']);
  assert.equal(declarations(root)['font-weight'], '300');
  const responsive = css.nodes.find((node) => node.type === 'atrule' && node.params === '(min-width: 992px)');
  const sourceResponsive = sourceCss.nodes.find((node) => node.type === 'atrule' && node.params === '(min-width:992px)');
  assert.equal(declarations(responsive.nodes[0])['font-size'], declarations(sourceResponsive.nodes[0])['font-size']);
  const blocks = css.nodes.filter((node) => node.type === 'rule' && node.selector.includes(':where('));
  assert.equal(blocks.length, 2);
  assert.equal(declarations(blocks[0])['font-size'], 'inherit');
  assert.equal(declarations(blocks[0])['font-weight'], 'inherit');
  assert.equal(declarations(blocks[0])['line-height'], 'inherit');
  assert.equal(declarations(blocks[1]).margin, '24px 0');
  for (const summary of ['<h4>Source summary</h4>', '<p>Editor paragraph</p>', '<div><p>Editor div</p></div>']) {
    const fields = { title: field('Headline'), summary: field(summary), body: field('<p>Body</p>') };
    const before = JSON.stringify(fields);
    const html = render('PressRelease', fields);
    assert.ok(html.includes(`<div class="tileSubHeading">${summary}</div>`));
    assert.doesNotMatch(html, /<h4[^>]*><(?:h4|p|div)\b/);
    assert.equal(JSON.stringify(fields), before);
  }
});

test('each named datasource query fetches only its fixed purpose fields as full jsonValue objects', () => {
  for (const [name, directory, fields] of [
    ['PressRelease', 'press-release', ['title', 'summary', 'body']],
    ['NewsroomReturn', 'newsroom-return', ['link']],
    ['LegalDisclosures', 'legal-disclosures', ['body']],
  ]) {
    const query = fs.readFileSync(path.join(sourceRoot, `components/${directory}/${directory}.graphql`), 'utf8');
    const operation = parse(query).definitions[0];
    assert.equal(operation.name.value, `${name}Data`);
    assert.deepEqual(operation.variableDefinitions.map((entry) => entry.variable.name.value), ['datasource', 'language']);
    const datasource = operation.selectionSet.selections[0];
    assert.equal(datasource.alias.value, 'datasource');
    assert.equal(datasource.name.value, 'item');
    assert.deepEqual(datasource.arguments.map((entry) => [entry.name.value, entry.value.name.value]),
      [['path', 'datasource'], ['language', 'language']]);
    assert.deepEqual(datasource.selectionSet.selections.map((entry) => entry.alias?.value || entry.name.value), ['id', ...fields]);
    for (const entry of datasource.selectionSet.selections.slice(1)) {
      assert.equal(entry.name.value, 'field');
      assert.deepEqual(entry.arguments.map((argument) => [argument.name.value, argument.value.value]), [['name', entry.alias.value]]);
      assert.deepEqual(entry.selectionSet.selections.map((selection) => selection.name.value), ['jsonValue']);
    }
  }
});

test('Newsroom Return retains the fixed source nonbreaking-space line without an author field', () => {
  const html = render('NewsroomReturn', records[0].newsroomReturn);
  const spacer = /<div class="tileBody">([^<]*)<\/div>/.exec(html);
  assert.ok(spacer);
  assert.equal(spacer[1].replaceAll('&nbsp;', '\u00a0'), '\u00a0');
  for (const record of records) {
    const source = fs.readFileSync(path.join(here, record.fragmentFile), 'utf8');
    const fixed = /<div class="tileBody">([\s\S]*?)<\/div>/.exec(source);
    assert.ok(fixed);
    assert.equal(fixed[1].replaceAll('&nbsp;', '\u00a0').replace(/[ \t\r\n]/g, ''), '\u00a0');
  }
});

test('Newsroom Return uses safe native General Link handling for fragments, queries and cleared fields', () => {
  const href = (link) => render('NewsroomReturn', { link: { jsonValue: link } })
    .match(/href="([^"]*)"/)?.[1].replaceAll('&amp;', '&');
  for (const [value, expected] of [
    [{ href: 'https://www.allianzlife.com/about/newsroom?tag=one&tag=two&q=a%23b#releases' }, '/about/newsroom?tag=one&tag=two&q=a%23b#releases'],
    [{ href: '/about/newsroom?existing=1#captured', querystring: '?native=2', anchor: '#native' }, '/about/newsroom?existing=1&native=2#native'],
    [{ href: '#section', querystring: 'view=public' }, '?view=public#section'],
    [{ href: '?q=a%23b#section' }, '?q=a%23b#section'],
    [{ href: 'javascript:alert(1)', querystring: 'private=1', anchor: 'old' }, '#service-unavailable'],
    [{ href: '/login', querystring: 'private=1', anchor: 'old' }, '#service-unavailable'],
  ]) {
    const link = { value: { text: 'Authored return text', title: 'Authored title', ...value }, metadata: {
      fieldId: 'native-return-link', fieldType: 'General Link', itemId: 'native-return-item',
    } };
    const before = JSON.stringify(link);
    assert.equal(href(link), expected);
    assert.equal(JSON.stringify(link), before);
  }
  for (const value of [{}, { href: '', text: '' }]) {
    const link = { value, metadata: { fieldId: 'empty-return-link', fieldType: 'General Link', itemId: 'empty-return-item' } };
    assert.doesNotMatch(render('NewsroomReturn', { link: { jsonValue: link } }), /<a\b|<svg\b|Go to the Newsroom|service-unavailable/);
    const editing = render('NewsroomReturn', { link: { jsonValue: link } }, true);
    assert.match(editing, /empty-return-link/);
    assert.match(editing, /\[No text in field\]/);
  }
});

test('title is escaped, while authored summary and body block markup remain intact', () => {
  const summary = '<h4>A summary with <em>authored emphasis</em></h4>';
  const body = '<p><strong>MINNEAPOLIS – July 9, 2026</strong> First paragraph.</p><h2>Details</h2><ul><li>One item</li></ul><table><tbody><tr><td>Authored cell</td></tr></tbody></table>';
  const data = { title: field('Title <script>alert(1)</script>'), summary: field(summary), body: field(body) };
  const before = JSON.stringify(data);
  const html = render('PressRelease', data);
  assert.ok(html.includes('Title &lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes(summary));
  assert.ok(html.includes(body));
  assert.doesNotMatch(html, /<h4[^>]*><(?:div|h4)\b|<p[^>]*><(?:h2|ul|table)\b/);
  assert.equal(JSON.stringify(data), before);
});

test('source inline styling and endnote markup are never normalized at runtime', () => {
  const summary = '<h4><span style="line-height:115%">Authored source summary.</span></h4>';
  const body = '<div id="edn1" style="text-align:center"><p><a href="#ednref1">[i]</a> Exact authored endnote.</p></div>';
  const data = { title: field('Authored title'), summary: field(summary), body: field(body) };
  const before = JSON.stringify(data);
  const html = render('PressRelease', data);
  assert.ok(html.includes(summary));
  assert.ok(html.includes(body));
  assert.equal(JSON.stringify(data), before);
});

test('each cleared native field retains its own real SDK editing metadata and no default content', () => {
  const data = {};
  for (const [name, type] of [['title', 'Single-Line Text'], ['summary', 'Rich Text'], ['body', 'Rich Text']]) {
    data[name] = { jsonValue: { value: '', metadata: {
      fieldId: `native-${name}-field`, fieldType: type, itemId: 'native-press-release-datasource',
    } } };
  }
  const before = JSON.stringify(data);
  const editing = render('PressRelease', data, true).replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  for (const name of ['title','summary','body']) assert.ok(editing.includes(`"fieldId":"native-${name}-field"`));
  assert.ok(editing.includes('"itemId":"native-press-release-datasource"'));
  assert.doesNotMatch(editing, /MINNEAPOLIS|Go to the Newsroom|Add a datasource|Published|By /);
  assert.doesNotMatch(render('PressRelease', data), /data-sc-field|MINNEAPOLIS|Add a datasource/);
  assert.equal(JSON.stringify(data), before);
});

test('clearing one field does not borrow another field, child, or source seed', () => {
  const data = { title: field(''), summary: field('<h4>Summary stays independent.</h4>'),
    body: field('<p>Body stays independent.</p>'), children: { results: [{ title: field('Child must not substitute') }] },
    heading: field('Old article field must not substitute'), publishedDate: field('2026-07-09') };
  const html = render('PressRelease', data);
  assert.match(html, /Summary stays independent/);
  assert.match(html, /Body stays independent/);
  assert.doesNotMatch(html, /Child must not|Old article|2026-07-09/);
});

test('link clearing preserves real SDK metadata with no synthetic newsroom destination or label', () => {
  const link = { value: { href: '', text: '' }, metadata: {
    fieldId: 'native-newsroom-link', fieldType: 'General Link', itemId: 'native-newsroom-return',
  } };
  const before = JSON.stringify(link);
  const html = render('NewsroomReturn', { link: { jsonValue: link } }, true).replaceAll('&quot;', '"');
  assert.ok(html.includes('"fieldId":"native-newsroom-link"'));
  assert.ok(html.includes('"itemId":"native-newsroom-return"'));
  assert.doesNotMatch(html, /href="\/about\/newsroom"|Go to the Newsroom/);
  assert.equal(JSON.stringify(link), before);
});

test('disclosure body clearing preserves SDK metadata independently of the article', () => {
  const data = { body: { jsonValue: { value: '', metadata: { fieldId: 'native-disclosure-body',
    fieldType: 'Rich Text', itemId: 'native-legal-disclosures' } } } };
  const html = render('LegalDisclosures', data, true).replaceAll('&quot;', '"');
  assert.ok(html.includes('"fieldId":"native-disclosure-body"'));
  assert.doesNotMatch(html, /About Allianz Life|Add a datasource/);
});

test('generic layout parameters cannot redesign these purposes; rendering identity remains supported', () => {
  const parameters = { theme: 'blue-soft', layout: 'split', headingLevel: 'h2', columns: '4',
    styles: 'u-text-center', spacing: 'lg', marginBottom: 'none', imageSide: 'right' };
  for (const [name, data] of [['PressRelease', records[0].exactSourceFieldValues], ['NewsroomReturn', records[0].newsroomReturn], ['LegalDisclosures', { body: records[0].exactSourceLegalBody }]]) {
    assert.equal(render(name, data), render(name, data, false, parameters));
    assert.match(render(name, data, false, { RenderingIdentifier: 'authored-rendering-id' }), /id="authored-rendering-id"/);
    assert.match(render(name, data), /class="component /);
  }
});

test('missing datasource is distinct from an intentionally cleared field', () => {
  for (const name of Object.keys(components)) {
    assert.match(render(name, undefined), /role="status">Add a datasource/);
    assert.doesNotMatch(render(name, {}), /Add a datasource/);
  }
});
