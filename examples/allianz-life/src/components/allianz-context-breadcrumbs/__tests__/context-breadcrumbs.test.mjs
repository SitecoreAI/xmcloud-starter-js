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
const { contextBreadcrumbTrail } = loadSource(path.join(directory, 'allianz-context-breadcrumbs.props.ts'));
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
function context(row = rows[0]) {
  const segments = row.route.slice(1).split('/');
  const ancestors = row.labels.slice(0, -1).map((title, index) => item(`ancestor-${index}`,
    index ? `${home}/${segments.slice(0, index).join('/')}` : home, title,
    index ? `/${segments.slice(0, index).join('/')}` : '/'));
  return { ...item(row.pageId, home + row.route, row.labels.at(-1), row.route), ancestors: ancestors.reverse() };
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
    const data = context(); mutate(data);
    assert.equal(contextBreadcrumbTrail(data).issue, 'incomplete-chain');
    const result = inspectHtml([render(Wrapper, data)])[0];
    assert.equal(result.status, 'Breadcrumb navigation is temporarily unavailable.');
    assert.equal(result.links, 0);
  }
});

test('blank required labels stay editable, while normal mode never invents a label from the route or item ID', () => {
  const data = context();
  data.navigationTitle.jsonValue.value = '';
  assert.equal(contextBreadcrumbTrail(data).issue, 'missing-title');
  assert.equal(contextBreadcrumbTrail(data, true).issue, undefined);
  const html = render(Wrapper, data, true);
  assert.match(html, /code\b[^>]*class="scpm"/);
  assert.ok(html.includes('4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8'));
  assert.doesNotMatch(html, /needs complete native page titles/);
  const missing = context(); delete missing.navigationTitle;
  assert.equal(contextBreadcrumbTrail(missing, true).issue, 'missing-title');
});

test('external, protocol-relative and service URLs are rejected rather than becoming clickable ancestors', () => {
  for (const url of ['https://unverified.example/about', '//unverified.example/about', 'javascript:alert(1)',
    '/api/private', '/sitecore/shell', '/account', '/about\\other', '/about\nother',
    '/login?next=/about', '/portal#section', '/api?query=example', '/about/../login', '/about/%2e%2e/login']) {
    const data = context(); data.ancestors[0].url.path = url;
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

test('the documented context-only query and source component leave the datasource-driven Ann contract unchanged', () => {
  const query = fs.readFileSync(path.join(directory, 'allianz-context-breadcrumbs.graphql'), 'utf8');
  const ast = parse(query), variables = [];
  visit(ast, { VariableDefinition(node) { variables.push(node.variable.name.value); } });
  assert.deepEqual(variables, ['contextItem', 'language']);
  assert.match(query, /ancestors\s*\{/);
  assert.match(query, /navigationTitle: field\(name: "4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8"\)/);
  assert.doesNotMatch(query, /field\(name: "NavigationTitle"\)/);
  assert.doesNotMatch(query, /\$datasource|hasLayout/);
  const component = fs.readFileSync(path.join(directory, 'AllianzContextBreadcrumbs.tsx'), 'utf8');
  assert.doesNotMatch(component, /withDatasourceCheck|data\.datasource|safeLink/);
  assert.match(fs.readFileSync(path.join(sourceRoot, 'components/allianz-breadcrumbs/AllianzBreadcrumbs.tsx'), 'utf8'), /data\?\.datasource\?\.primaryNav/);
});
