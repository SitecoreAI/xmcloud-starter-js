import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url), ts = require('typescript');
const helper = path.resolve(here, '../allianz-legacy-sidebar.props.ts');
const compiled = new Module(helper); compiled.filename = helper;
compiled._compile(ts.transpileModule(fs.readFileSync(helper, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, helper);
const { legacySidebarCurrentPath: resolve } = compiled.exports;
const route = '/new-york/annuities/registered-index-linked-annuities/index-advantage-plus-new-york/video';
const source = `https://www.allianzlife.com${route}`;

test('public and rewritten context semantics stay independent of source URL', () => {
  for (const pathname of [route, `/allianz-life/en${route}`, '/_site_allianz-life/en/rewritten']) {
    assert.equal(resolve(pathname, route, 'https://www.allianzlife.com/other'), route);
  }
  assert.equal(resolve('/new-york/ABOUT/'), '/new-york/about');
  assert.equal(resolve(null, undefined, source), '');
  assert.equal(resolve('/new-york/about', '/api/editing/render'), '/new-york/about');
});

test('exact native transport recovers source identity without requiring editor mode', () => {
  for (const transport of ['/api/editing/render', '/api/editing/render/']) {
    for (const context of [undefined, '/api/editing/render', '/sitecore/content/allianz/Home', '/']) {
      assert.equal(resolve(transport, context, source), route);
    }
  }
  assert.equal(resolve('/api/editing/render', '/new-york/about', undefined), '/new-york/about');
  assert.equal(resolve('/api/editing/render', undefined, undefined), '');
});

test('untrusted, malformed and internal route identities never create an active page', () => {
  const badSources = [undefined, null, 1, {}, '', 'javascript:alert(1)', 'http://www.allianzlife.com/new-york',
    'https://allianzlife.com/new-york', 'https://www.allianzlife.com.evil.test/new-york',
    'https://user@www.allianzlife.com/new-york', 'https://www.allianzlife.com:444/new-york',
    'https://www.allianzlife.com/new-york?next=/about', 'https://www.allianzlife.com/new-york#video',
    'https://www.allianzlife.com/api/editing/render', 'https://www.allianzlife.com/sitecore/content',
    'https://www.allianzlife.com/new-york%2fabout', 'https://www.allianzlife.com/new-york%5cabout',
    'https://www.allianzlife.com/%2e%2e/new-york', 'https://www.allianzlife.com//new-york',
    ' https://www.allianzlife.com/new-york', 'https://www.allianzlife.com/new-york ',
    'https://www.allianzlife.com/x/../new-york', 'https://www.allianzlife.com/x/./new-york',
    'https://www.allianzlife.com/new-york\\n'];
  for (const source of badSources) assert.equal(resolve('/api/editing/render', undefined, source), '', String(source));
  for (const value of ['//evil.test/new-york', '/sitecore/content', '/api/editing/render', '/_next/data',
    '/_site_allianz-life/en/rewritten', '/new-york?x=1', '/new-york#video', '/new-york/../about',
    '/new-york%2fabout', '/new-york\\about', '/new york', 1, {}, null]) {
    assert.equal(resolve(null, value), '', String(value));
  }
  assert.equal(resolve('/api/editing/render-other', undefined, source), '');
});

test('sidebar margin repair is confined to its stable owner and vertical axes', () => {
  const css = fs.readFileSync(path.resolve(here, '../../../assets/allianz-native-overrides.css'), 'utf8');
  const block = css.match(/\.allianz-legacy \.allianz-legacy-sidebar \.left-nav li\s*\{([^}]+)\}/);
  assert.ok(block); assert.match(block[1], /margin-top:\s*0 !important/); assert.match(block[1], /margin-bottom:\s*0 !important/);
  assert.doesNotMatch(block[1], /height|padding|margin-left|margin-right|display|position/);
});
