import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { require, sourceRoot, loadSource, render } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { parse, visit } = require('graphql');
const directory = path.join(sourceRoot, 'components/allianz-context-breadcrumbs');
const { Default } = loadSource(path.join(directory, 'AllianzContextBreadcrumbs.tsx'));
const { contextBreadcrumbLabel, contextBreadcrumbTrail } = loadSource(path.join(directory, 'allianz-context-breadcrumbs.props.ts'));
const rows = JSON.parse(fs.readFileSync(path.join(directory, '__tests__/source-trails.json'), 'utf8')).rows;
const home = '/sitecore/content/allianz/allianz-life/Home';
const Wrapper = ({ fields, params }) => React.createElement(Default,
  { params, fields: { data: { contextItem: fields?.data?.datasource } } });
function inspectHtml(htmls) {
  const result = spawnSync('python3', ['-c', `import json,sys
from lxml import html
out=[]
for value in json.load(sys.stdin):
 root=html.fromstring(value)
 labels=[''.join(node.itertext()) for node in root.xpath('//li/*[contains(concat(" ",normalize-space(@class)," ")," c-breadcrumb__link ")]')]
 links=root.xpath('//a')
 current=root.xpath('//*[@aria-current="page"]')
 status=root.xpath('//*[@role="status"]')
 out.append(dict(labels=labels,links=len(links),firstHref=links[0].get('href') if links else None,currentTag=current[0].tag if current else None,currentLinks=len(current[0].xpath('.//a')) if current else None,ariaText=''.join(root.xpath('//span[@class="u-aria-only"]/text()')),status=''.join(status[0].itertext()) if status else None))
json.dump(out,sys.stdout)`], { input: JSON.stringify(htmls), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
function item(id, nativePath, title, url) {
  return { id, path: nativePath, url: { path: url }, navigationTitle: { jsonValue: { value: title,
    metadata: { fieldId: '4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8', fieldType: 'Single-Line Text', itemId: id } } } };
}
function nativeTitle(id, value) {
  return { jsonValue: { value,
    metadata: { fieldId: '6c7fab7b-a9c2-4b26-838a-830bdc49fe00', fieldType: 'Single-Line Text', itemId: id } } };
}
function context(row = rows[0]) {
  const segments = row.route.slice(1).split('/');
  const ancestors = row.labels.slice(0, -1).map((title, index) => item(`ancestor-${index}`,
    index ? `${home}/${segments.slice(0, index).join('/')}` : home, title,
    index ? `/${segments.slice(0, index).join('/')}` : '/'));
  return { ...item(row.pageId, home + row.route, row.labels.at(-1), row.route), ancestors: ancestors.reverse() };
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('all81 exact source trails render native links and current plain text through the installed SDK', () => {
  assert.equal(rows.length, 81);
  assert.equal(new Set(rows.map((row) => row.pageId)).size, 81);
  const rendered = [];
  for (const row of rows) {
    assert.equal(createHash('sha256').update(row.labels.at(-1)).digest('hex'), row.labelSha256);
    const data = context(row), before = JSON.stringify(data);
    const html = render(Wrapper, data);
    rendered.push(html);
    assert.equal(JSON.stringify(data), before);
  }
  for (const [index, result] of inspectHtml(rendered).entries()) {
    assert.deepEqual(result.labels, rows[index].labels, rows[index].route);
    assert.equal(result.links, rows[index].labels.length - 1);
    assert.equal(result.currentTag, 'span');
    assert.equal(result.currentLinks, 0);
    assert.equal(result.firstHref, '/');
    assert.equal(result.ariaText, 'You are here:');
  }
});

test('CMS ancestors above the Home subtree are excluded without duplicating Home or changing field objects', () => {
  const data = context();
  data.ancestors.push(item('site', '/sitecore/content/allianz/allianz-life', 'CMS site', '/site'),
    item('collection', '/sitecore/content/allianz', 'CMS collection', '/collection'));
  const originalField = data.ancestors[0].navigationTitle.jsonValue;
  const before = JSON.stringify(data);
  const trail = contextBreadcrumbTrail(data);
  assert.equal(trail.issue, undefined);
  assert.equal(trail.items.filter((node) => node.navigationTitle.jsonValue.value === 'Home').length, 1);
  assert.equal(trail.items[3].navigationTitle.jsonValue, originalField);
  assert.equal(JSON.stringify(data), before);
  const root = { ...item('home', home, 'Home', '/'), ancestors: [item('site', '/sitecore/content/allianz/allianz-life', 'CMS site', '/site')] };
  assert.equal(contextBreadcrumbTrail(root).items.length, 1);
  assert.equal(inspectHtml([render(Wrapper, root)])[0].links, 0);
});

test('missing years, duplicate ancestors and invalid chain order fail explicitly without slug or headline substitutes', () => {
  for (const mutate of [
    (data) => data.ancestors.shift(),
    (data) => data.ancestors.push(data.ancestors[0]),
    (data) => data.ancestors.reverse(),
    (data) => { data.ancestors[0].path = `${home}/unrelated`; },
  ]) {
    const data = context();
    for (const node of [data, ...data.ancestors]) {
      node.navigationTitle.jsonValue.value = '';
      node.displayName = 'Native fallback';
    }
    mutate(data);
    assert.equal(contextBreadcrumbTrail(data).issue, 'incomplete-chain');
    const result = inspectHtml([render(Wrapper, data)])[0];
    assert.equal(result.status, 'Breadcrumb navigation is temporarily unavailable.');
    assert.equal(result.links, 0);
  }
});

test('absent, blank or malformed labels fail explicitly in both Pages and visitor mode', () => {
  const rendered = [], expected = [];
  for (const navigationTitle of [undefined, null, {}, { jsonValue: null },
    { jsonValue: { value: '' } }, { jsonValue: { value: ' \n\t ' } },
    { jsonValue: { value: 123 } }, { jsonValue: { value: { title: 'Malformed' } } }]) {
    for (const current of [true, false]) {
      const data = context(), node = current ? data : data.ancestors[0];
      node.navigationTitle = navigationTitle;
      node.displayName = ' \n\t ';
      node.name = null;
      node.headline = 'Headline is not a breadcrumb source';
      const before = JSON.stringify(data);
      freeze(data);
      assert.equal(contextBreadcrumbTrail(data).issue, 'missing-title');
      for (const isEditing of [false, true]) {
        const html = render(Wrapper, data, isEditing);
        rendered.push(html);
        expected.push(isEditing ? 'Breadcrumb trail needs complete native page titles, ancestors, and links.'
          : 'Breadcrumb navigation is temporarily unavailable.');
        assert.doesNotMatch(html, /code\b[^>]*class="scpm"|contenteditable|data-field-id|Headline is not a breadcrumb source/);
        assert.ok(!html.includes('4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8'));
      }
      assert.equal(JSON.stringify(data), before);
    }
  }
  for (const [index, result] of inspectHtml(rendered).entries()) {
    assert.equal(result.status, expected[index]);
    assert.equal(result.links, 0);
    assert.deepEqual(result.labels, []);
  }
});

test('blank and missing canonical titles use unmodified native DisplayName for every caption in both modes', () => {
  const rendered = [], expected = [];
  for (const title of ['', ' \n\t ', undefined]) {
    const data = context(), nodes = [...data.ancestors].reverse().concat(data);
    const fields = nodes.map((node) => node.navigationTitle.jsonValue);
    nodes.forEach((node, index) => {
      if (title === undefined) delete node.navigationTitle;
      else node.navigationTitle.jsonValue.value = title;
      node.displayName = ` Native DisplayName ${index} `;
      node.name = `lower-priority-item-${index}`;
    });
    const before = JSON.stringify(data);
    freeze(data);
    const trail = contextBreadcrumbTrail(data);
    assert.equal(trail.issue, undefined);
    trail.items.forEach((node, index) => {
      assert.equal(node, nodes[index]);
      const label = contextBreadcrumbLabel(node);
      assert.deepEqual(label, { value: node.displayName });
      if (title === undefined) assert.ok(!Object.hasOwn(node, 'navigationTitle'));
      else assert.equal(node.navigationTitle.jsonValue, fields[index]);
    });
    for (const isEditing of [false, true]) {
      rendered.push(render(Wrapper, data, isEditing));
      expected.push(nodes.map((node) => node.displayName));
    }
    assert.equal(JSON.stringify(data), before);
  }
  for (const [index, result] of inspectHtml(rendered).entries()) {
    assert.deepEqual(result.labels, expected[index]);
    assert.equal(result.status, null);
    assert.equal(result.links, expected[index].length - 1);
    assert.equal(result.currentTag, 'span');
    assert.equal(result.currentLinks, 0);
  }
});

test('native item names remain exact when canonical titles and DisplayName cannot supply a label', () => {
  const rendered = [], expected = [];
  for (const [title, displayName] of [[undefined, undefined], ['', ''], [' \t ', ' \t '], [42, { value: 'Malformed' }]]) {
    const data = context(), nodes = [...data.ancestors].reverse().concat(data);
    nodes.forEach((node, index) => {
      if (title === undefined) delete node.navigationTitle;
      else node.navigationTitle.jsonValue.value = title;
      node.displayName = displayName;
      node.name = ` native-item-${index}_2026 `;
    });
    const before = JSON.stringify(data);
    freeze(data);
    assert.equal(contextBreadcrumbTrail(data).issue, undefined);
    for (const isEditing of [false, true]) {
      rendered.push(render(Wrapper, data, isEditing));
      expected.push(nodes.map((node) => node.name));
    }
    assert.equal(JSON.stringify(data), before);
  }
  for (const [index, result] of inspectHtml(rendered).entries()) {
    assert.deepEqual(result.labels, expected[index]);
    assert.equal(result.status, null);
    assert.equal(result.links, expected[index].length - 1);
  }
});

test('malformed title values are skipped only when a native fallback is usable', () => {
  const rendered = [];
  for (const navigationTitle of [null, {}, { jsonValue: null }, { jsonValue: { value: 123 } },
    { jsonValue: { value: { value: 'Malformed title' } } }]) {
    const data = context();
    data.navigationTitle = navigationTitle;
    data.displayName = 'Native DisplayName';
    data.name = 'lower-priority-item-name';
    freeze(data);
    assert.equal(contextBreadcrumbTrail(data).issue, undefined);
    for (const isEditing of [false, true]) rendered.push(render(Wrapper, data, isEditing));
  }
  for (const result of inspectHtml(rendered)) assert.equal(result.labels.at(-1), 'Native DisplayName');
  for (const [displayName, name] of [[null, undefined], [12, false], [{ value: 'Malformed' }, ['Malformed']], ['', ' \n\t ']]) {
    const data = context();
    delete data.navigationTitle;
    data.displayName = displayName;
    data.name = name;
    assert.equal(contextBreadcrumbTrail(freeze(data)).issue, 'missing-title');
  }
});

test('explicit canonical titles including slugs always win and retain SDK field identity and authored spacing', () => {
  const data = context(), nodes = [...data.ancestors].reverse().concat(data);
  nodes.forEach((node, index) => {
    node.navigationTitle.jsonValue.value = ` explicit-native-slug-${index} `;
    node.displayName = 'Prettier DisplayName';
    node.name = 'different-item-name';
  });
  const before = JSON.stringify(data);
  freeze(data);
  const trail = contextBreadcrumbTrail(data);
  trail.items.forEach((node, index) => {
    assert.equal(node, nodes[index]);
    assert.equal(contextBreadcrumbLabel(node), nodes[index].navigationTitle.jsonValue);
  });
  for (const result of inspectHtml([render(Wrapper, data), render(Wrapper, data, true)])) {
    assert.deepEqual(result.labels, nodes.map((node) => node.navigationTitle.jsonValue.value));
  }
  assert.equal(JSON.stringify(data), before);
});

test('canonical Caption wins over a distinct native Title while both fields retain authored values and metadata', () => {
  const data = context(), nodes = [...data.ancestors].reverse().concat(data);
  nodes.forEach((node, index) => {
    node.navigationTitle.jsonValue.value = ` Caption-Slug_${index} `;
    node.title = nativeTitle(node.id, ` Different Native TITLE ${index} `);
    node.displayName = `DisplayName ${index}`;
    node.name = `item-name-${index}`;
  });
  const captions = nodes.map((node) => node.navigationTitle.jsonValue);
  const titles = nodes.map((node) => node.title.jsonValue);
  const before = JSON.stringify(data);
  freeze(data);
  const trail = contextBreadcrumbTrail(data);
  assert.equal(trail.issue, undefined);
  trail.items.forEach((node, index) => {
    assert.equal(node, nodes[index]);
    assert.equal(contextBreadcrumbLabel(node), captions[index]);
    assert.equal(node.title.jsonValue, titles[index]);
  });
  for (const isEditing of [false, true]) {
    const html = render(Wrapper, data, isEditing);
    const result = inspectHtml([html])[0];
    assert.deepEqual(result.labels, captions.map((field) => field.value));
    assert.doesNotMatch(html, /Different Native TITLE|code\b[^>]*class="scpm"|contenteditable|data-field-id/);
  }
  assert.equal(JSON.stringify(data), before);
});

test('blank, missing and malformed Caption uses native Title ahead of DisplayName and item name in both modes', () => {
  const rendered = [], expected = [];
  for (const navigationTitle of [undefined, null, {}, { jsonValue: null },
    { jsonValue: { value: '' } }, { jsonValue: { value: ' \n\t ' } },
    { jsonValue: { value: 123 } }, { jsonValue: { value: { caption: 'Malformed' } } }]) {
    const data = context(), nodes = [...data.ancestors].reverse().concat(data);
    nodes.forEach((node, index) => {
      if (navigationTitle === undefined) delete node.navigationTitle;
      else node.navigationTitle = navigationTitle;
      node.title = nativeTitle(node.id, ` Native-Title_${index} MiXeD Case `);
      node.displayName = `DisplayName ${index}`;
      node.name = `item-name-${index}`;
    });
    const titles = nodes.map((node) => node.title.jsonValue);
    const before = JSON.stringify(data);
    freeze(data);
    const trail = contextBreadcrumbTrail(data);
    assert.equal(trail.issue, undefined);
    trail.items.forEach((node, index) => {
      assert.equal(node, nodes[index]);
      assert.equal(contextBreadcrumbLabel(node), titles[index]);
      if (navigationTitle === undefined) assert.ok(!Object.hasOwn(node, 'navigationTitle'));
      else assert.equal(node.navigationTitle, navigationTitle);
    });
    for (const isEditing of [false, true]) {
      rendered.push(render(Wrapper, data, isEditing));
      expected.push(titles.map((field) => field.value));
    }
    assert.equal(JSON.stringify(data), before);
  }
  for (const [index, result] of inspectHtml(rendered).entries()) {
    assert.deepEqual(result.labels, expected[index]);
    assert.equal(result.status, null);
    assert.equal(result.links, expected[index].length - 1);
    assert.equal(result.currentTag, 'span');
    assert.equal(result.currentLinks, 0);
  }
});

test('blank, missing and malformed native Title falls through to exact DisplayName or item name', () => {
  const rendered = [], expected = [];
  for (const title of [undefined, null, {}, { jsonValue: null },
    { jsonValue: { value: '' } }, { jsonValue: { value: ' \n\t ' } },
    { jsonValue: { value: 123 } }, { jsonValue: { value: { title: 'Malformed' } } }]) {
    for (const source of ['displayName', 'name']) {
      const data = context(), nodes = [...data.ancestors].reverse().concat(data);
      nodes.forEach((node, index) => {
        node.navigationTitle.jsonValue.value = ' \t ';
        if (title === undefined) delete node.title;
        else node.title = title;
        node.displayName = source === 'displayName' ? ` Native DisplayName ${index} ` : ' \n\t ';
        node.name = ` Native-Item_Name_${index} `;
      });
      const before = JSON.stringify(data);
      freeze(data);
      assert.equal(contextBreadcrumbTrail(data).issue, undefined);
      for (const isEditing of [false, true]) {
        rendered.push(render(Wrapper, data, isEditing));
        expected.push(nodes.map((node) => node[source]));
      }
      assert.equal(JSON.stringify(data), before);
    }
    const missing = context();
    delete missing.navigationTitle;
    missing.title = title;
    missing.displayName = ' \t ';
    missing.name = null;
    assert.equal(contextBreadcrumbTrail(freeze(missing)).issue, 'missing-title');
  }
  for (const [index, result] of inspectHtml(rendered).entries()) {
    assert.deepEqual(result.labels, expected[index]);
    assert.equal(result.status, null);
    assert.equal(result.links, expected[index].length - 1);
  }
});

test('external, protocol-relative and service URLs are rejected rather than becoming clickable ancestors', () => {
  for (const url of ['https://unverified.example/about', '//unverified.example/about', 'javascript:alert(1)',
    '/api/private', '/sitecore/shell', '/account', '/about\\other', '/about\nother',
    '/login?next=/about', '/portal#section', '/api?query=example', '/about/../login', '/about/%2e%2e/login']) {
    const data = context(); data.ancestors[0].url.path = url;
    delete data.ancestors[0].navigationTitle;
    data.ancestors[0].name = 'native-item-fallback';
    assert.equal(contextBreadcrumbTrail(data).issue, 'invalid-url', url);
    assert.equal(inspectHtml([render(Wrapper, data)])[0].links, 0);
  }
  for (const url of ['/about?section=company#team', '/about/../about?section=company#team']) {
    const data = context(); data.ancestors[0].url.path = url;
    const before = JSON.stringify(data);
    assert.equal(contextBreadcrumbTrail(data).issue, undefined, url);
    const html = render(Wrapper, data);
    assert.ok(html.includes(`href="${url}"`), url);
    assert.equal(inspectHtml([html])[0].links, data.ancestors.length);
    assert.equal(JSON.stringify(data), before);
  }
});

test('absent context, foreign trees and empty collections never prompt for a datasource or create a fake trail', () => {
  assert.equal(contextBreadcrumbTrail(undefined).issue, 'missing-context');
  const data = context(); data.path = '/sitecore/content/unrelated/Home/page';
  assert.equal(contextBreadcrumbTrail(data).issue, 'outside-site');
  const empty = context(); empty.ancestors = [];
  assert.equal(contextBreadcrumbTrail(empty).issue, 'incomplete-chain');
  const html = render(Wrapper, undefined, true);
  assert.match(html, /needs complete native page titles, ancestors, and links/);
  assert.doesNotMatch(html, /Add a datasource|<a\b/);
});

test('source labels are escaped and rendering identifiers preserve the fixed source navigation classes', () => {
  const data = context(); data.navigationTitle.jsonValue.value = 'Authored <script>alert(1)</script> & title';
  const html = render(Wrapper, data, false, { RenderingIdentifier: 'native-breadcrumbs', theme: 'negative', columns: '4' });
  assert.match(html, /id="native-breadcrumbs"/);
  assert.match(html, /class="azl-breadcrumb l-container"/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.doesNotMatch(html, /<script>|t-bg-negative|columns/);
});

test('native DisplayName and item-name fallbacks remain escaped through the installed SDK in both modes', () => {
  const rendered = [], expected = [];
  for (const source of ['displayName', 'name']) {
    const data = context(), nodes = [...data.ancestors].reverse().concat(data);
    nodes.forEach((node, index) => {
      node.navigationTitle.jsonValue.value = '';
      node[source] = ` Native <script>alert(${index})</script> & "label" `;
    });
    const before = JSON.stringify(data);
    freeze(data);
    for (const isEditing of [false, true]) {
      const html = render(Wrapper, data, isEditing);
      assert.match(html, /&lt;script&gt;alert/);
      assert.match(html, /&amp;/);
      assert.doesNotMatch(html, /<script>|code\b[^>]*class="scpm"|contenteditable|data-field-id/);
      rendered.push(html);
      expected.push(nodes.map((node) => node[source]));
    }
    assert.equal(JSON.stringify(data), before);
  }
  for (const [index, result] of inspectHtml(rendered).entries()) assert.deepEqual(result.labels, expected[index]);
});

test('the documented context-only query and source component leave the datasource-driven Ann contract unchanged', () => {
  const query = fs.readFileSync(path.join(directory, 'allianz-context-breadcrumbs.graphql'), 'utf8');
  const ast = parse(query), variables = [];
  visit(ast, { VariableDefinition(node) { variables.push(node.variable.name.value); } });
  assert.deepEqual(variables, ['contextItem', 'language']);
  const fragment = ast.definitions.find((node) => node.kind === 'FragmentDefinition');
  assert.equal(fragment.typeCondition.name.value, 'Item');
  assert.deepEqual(fragment.selectionSet.selections.map((node) => (node.alias ?? node.name).value),
    ['id', 'path', 'navigationTitle', 'title', 'displayName', 'name', 'url']);
  for (const [alias, guid] of [['navigationTitle', '4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8'],
    ['title', '6c7fab7b-a9c2-4b26-838a-830bdc49fe00']]) {
    const field = fragment.selectionSet.selections.find((node) => node.alias?.value === alias);
    assert.equal(field.name.value, 'field');
    assert.deepEqual(field.arguments.map((argument) => [argument.name.value, argument.value.value]), [['name', guid]]);
    assert.deepEqual(field.selectionSet.selections.map((node) => node.name.value), ['jsonValue']);
  }
  for (const source of ['displayName', 'name']) {
    const field = fragment.selectionSet.selections.find((node) => node.name.value === source);
    assert.equal(field.alias, undefined);
    assert.deepEqual(field.arguments, []);
    assert.equal(field.selectionSet, undefined);
  }
  assert.match(query, /ancestors\s*\{/);
  assert.match(query, /navigationTitle: field\(name: "4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8"\)/);
  assert.match(query, /title: field\(name: "6c7fab7b-a9c2-4b26-838a-830bdc49fe00"\)/);
  assert.doesNotMatch(query, /field\(name: "(?:NavigationTitle|navigationTitle|Title|title)"\)/);
  assert.doesNotMatch(query, /\$datasource|hasLayout/);
  const component = fs.readFileSync(path.join(directory, 'AllianzContextBreadcrumbs.tsx'), 'utf8');
  assert.doesNotMatch(component, /withDatasourceCheck|data\.datasource|safeLink/);
  assert.match(fs.readFileSync(path.join(sourceRoot, 'components/allianz-breadcrumbs/AllianzBreadcrumbs.tsx'), 'utf8'), /data\?\.datasource\?\.primaryNav/);
});

test('all ancestor and current captions are read-only in Pages while native fields stay intact', () => {
  const data = context(), before = JSON.stringify(data);
  const html = render(Wrapper, data, true);
  assert.doesNotMatch(html, /code\b[^>]*class="scpm"|contenteditable|data-field-id/);
  const result = inspectHtml([html])[0];
  assert.deepEqual(result.labels, rows[0].labels);
  assert.equal(result.links, rows[0].labels.length - 1);
  assert.equal(result.currentTag, 'span');
  assert.equal(result.currentLinks, 0);
  assert.equal(JSON.stringify(data), before);
  const { Text } = require('@sitecore-content-sdk/nextjs');
  const OwningPageField = () => React.createElement(Text, { field: data.navigationTitle.jsonValue, editable: true });
  assert.match(render(OwningPageField, data, true), /code\b[^>]*class="scpm"/);
});

test('fallback captions are read-only in Pages while each blank owning NavigationTitle stays independently editable', () => {
  const data = context(), nodes = [...data.ancestors].reverse().concat(data);
  const fields = nodes.map((node) => node.navigationTitle.jsonValue);
  nodes.forEach((node, index) => {
    node.navigationTitle.jsonValue.value = ' \t ';
    if (index % 2) node.name = `item-name-${index}`;
    else node.displayName = `DisplayName ${index}`;
  });
  const before = JSON.stringify(data);
  freeze(data);
  const html = render(Wrapper, data, true);
  assert.doesNotMatch(html, /code\b[^>]*class="scpm"|contenteditable|data-field-id/);
  assert.ok(!html.includes('4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8'));
  const result = inspectHtml([html])[0];
  assert.deepEqual(result.labels, nodes.map((node) => node.displayName ?? node.name));
  assert.equal(result.links, nodes.length - 1);
  assert.equal(result.currentTag, 'span');
  assert.equal(result.currentLinks, 0);
  const { Text } = require('@sitecore-content-sdk/nextjs');
  nodes.forEach((node, index) => {
    assert.equal(node.navigationTitle.jsonValue, fields[index]);
    const OwningPageField = () => React.createElement(Text, { field: node.navigationTitle.jsonValue, editable: true });
    assert.match(render(OwningPageField, data, true), /code\b[^>]*class="scpm"/);
  });
  assert.equal(JSON.stringify(data), before);
});

test('native Title fallback is escaped and read-only while owning Caption and Title remain independently editable', () => {
  const data = context(), nodes = [...data.ancestors].reverse().concat(data);
  nodes.forEach((node, index) => {
    node.navigationTitle.jsonValue.value = ' \t ';
    node.title = nativeTitle(node.id, ` Native <script>alert(${index})</script> & "TITLE" `);
    node.displayName = `DisplayName ${index}`;
    node.name = `item-name-${index}`;
  });
  const captions = nodes.map((node) => node.navigationTitle.jsonValue);
  const titles = nodes.map((node) => node.title.jsonValue);
  const before = JSON.stringify(data);
  freeze(data);
  for (const isEditing of [false, true]) {
    const html = render(Wrapper, data, isEditing);
    assert.match(html, /&lt;script&gt;alert/);
    assert.match(html, /&amp;/);
    assert.doesNotMatch(html, /<script>|code\b[^>]*class="scpm"|contenteditable|data-field-id/);
    assert.ok(!html.includes('4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8'));
    assert.ok(!html.includes('6c7fab7b-a9c2-4b26-838a-830bdc49fe00'));
    const result = inspectHtml([html])[0];
    assert.deepEqual(result.labels, titles.map((field) => field.value));
    assert.equal(result.links, nodes.length - 1);
    assert.equal(result.currentTag, 'span');
    assert.equal(result.currentLinks, 0);
  }
  const { Text } = require('@sitecore-content-sdk/nextjs');
  nodes.forEach((node, index) => {
    assert.equal(node.navigationTitle.jsonValue, captions[index]);
    assert.equal(node.title.jsonValue, titles[index]);
    assert.equal(contextBreadcrumbLabel(node), titles[index]);
    for (const field of [captions[index], titles[index]]) {
      const OwningPageField = () => React.createElement(Text, { field, editable: true });
      const html = render(OwningPageField, data, true);
      assert.match(html, /code\b[^>]*class="scpm"/);
      assert.ok(html.includes(field.metadata.fieldId));
      assert.ok(html.includes(field.metadata.itemId));
    }
  });
  assert.equal(JSON.stringify(data), before);
});
