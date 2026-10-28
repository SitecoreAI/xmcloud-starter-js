import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { resolveAppRoot, resolveDependenciesRoot } from './runtime-paths.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const deps = resolveDependenciesRoot();
const require = createRequire(path.join(deps, 'package.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const esbuild = require('esbuild');
const source = JSON.parse(fs.readFileSync(new URL('./life-stage-icons.source.json', import.meta.url)));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'life-stage-icons-test-'));
const compiled = path.join(temporary, 'icons.cjs');
await esbuild.build({
  entryPoints: [path.join(directory, 'LifeInsuranceStageIcon.tsx')], bundle: true,
  platform: 'node', format: 'cjs', outfile: compiled, jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], nodePaths: [deps], logLevel: 'silent',
});
const { Module } = require('node:module');
const bundle = new Module(compiled);
bundle.filename = compiled;
bundle.paths = [deps];
bundle._compile(fs.readFileSync(compiled, 'utf8'), compiled);
const { LifeInsuranceStageIcon } = bundle.exports;
const render = props => renderToStaticMarkup(React.createElement(LifeInsuranceStageIcon, props));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const geometryDigest = paths => digest(JSON.stringify(paths.map(value => value.replace(/[\s,]/g, ''))));
const pathsFrom = html => [...html.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)].map(match => match[1]);
const attributesFrom = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));

// Independently recorded from the verified source components, rather than inferred from asset filenames.
const expected = [
  ['PeopleLove', 'Icon People Love', 'Love', 'f9ac4bbeab4fcc8a112ff8630c3188729d2e7a06066e2e0ec273e952af91da97'],
  ['DollarSign', 'Icon Dollar Sign', 'Dollar amount', '24ab9c0557b948083f0ee007b1af06d1493daa8e15103b01cf8d465c0db94989'],
  ['HandsAndCoins', 'Icon Hands And Coins', 'Payment', '1d1bff997d1427a6960d8c565bbd6f450d8ea38ff00e9b0548b83c7ff80f292e'],
  ['MoneyExchange', 'Icon MoneyExchange', 'Exchange currency', '86e77b0bca051345a714e48cd8a9095703d161d092ab18837c6a2905ea262235'],
  ['Badge', 'Icon Badge', 'Badge', '42b2d31103d1b90455bc80e043cac41e5ca0596a86f615cb565521fac9733d59'],
];

for (const [stageIndex, [name, title, description, geometry]] of expected.entries()) {
  test(`${name}: source SVG wrapper, accessible IDs, child order and geometry are exact`, () => {
    const html = render({ stageIndex });
    const opening = html.match(/^<svg\b[^>]*>/)?.[0];
    assert.ok(opening);
    assert.deepEqual(attributesFrom(opening), {
      xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24',
      preserveAspectRatio: 'xMidYMid meet', role: 'img',
      'aria-labelledby': `titleIcon${name}`, 'aria-describedby': `descIcon${name}`,
    });
    assert.ok(html.includes(`<title id="titleIcon${name}">${title}</title><desc id="descIcon${name}">${description}</desc><path `));
    const paths = pathsFrom(html);
    assert.equal(paths.length, 1);
    assert.equal(geometryDigest(paths), geometry);
    assert.match(html, /<path d="[^"]*"><\/path><\/svg>$/);
    const local = fs.readFileSync(path.join(resolveAppRoot(), source.icons[stageIndex].localAsset), 'utf8');
    assert.equal(digest(local), source.icons[stageIndex].localFileSHA256);
    assert.deepEqual(paths, pathsFrom(local), 'Inline path data must match the existing original asset exactly.');
  });
}

test('the source icoName, title and description overrides preserve IDs, escaping and explicit empty values', () => {
  const html = render({ stageIndex: 0, icoName: 'private-about', title: 'A&B <title>', description: '"Description"' });
  assert.match(html, /aria-labelledby="titleIconprivate-about" aria-describedby="descIconprivate-about"/);
  assert.ok(html.includes('<title id="titleIconprivate-about">A&amp;B &lt;title&gt;</title>'));
  assert.ok(html.includes('<desc id="descIconprivate-about">&quot;Description&quot;</desc>'));
  const empty = render({ stageIndex: 4, icoName: '', title: '', description: '' });
  assert.ok(empty.includes('<title id="titleIcon"></title><desc id="descIcon"></desc>'));
});

test('unknown sizing/style/ARIA props are not forwarded, preserving source CSS fill inheritance', () => {
  const props = { stageIndex: 1, svgClass: 'unexpected', className: 'unexpected', width: 99,
    height: 99, fill: 'red', style: { fill: 'red' }, 'aria-hidden': true, labelBy: 'unexpected' };
  assert.equal(render(props), render({ stageIndex: 1 }));
  assert.ok(!render(props).includes('href=') && !render(props).includes('<image'));
});

test('all five default icon title/description IDs are unique in a single source stage menu', () => {
  const html = expected.map((_, stageIndex) => render({ stageIndex })).join('');
  const ids = [...html.matchAll(/\bid="([^"]*)"/g)].map(match => match[1]);
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
});

test('retained source CSS supplies dimensions and normal, hover, active and focus fills without icon overrides', () => {
  const css = fs.readFileSync(new URL('./source-app.css', import.meta.url), 'utf8');
  const rules = [
    '.axl-tab-list-button .axl-tab-list-icon{flex:0 1 auto;width:36px;height:36px;fill:#006192}',
    '.axl-tab-list-button:hover .axl-tab-list-icon svg{fill:#006192;transition:all .1s ease-in-out}',
    '.axl-tab-list-button:focus .axl-tab-list-icon svg{fill:#fff;transition:all .1s ease-in-out}',
    '.axl-tab-layout .axl-tab-list .axl-tab-list-item.--is-active .axl-tab-list-button .axl-tab-list-icon svg{fill:#fff;transition:all .1s ease-in-out}',
  ];
  for (const rule of rules) assert.ok(css.includes(rule), `Missing source style mapping: ${rule}`);
  for (let stageIndex = 0; stageIndex < 5; stageIndex++) {
    const opening = render({ stageIndex }).match(/^<svg\b[^>]*>/)[0];
    assert.ok(!/\b(?:width|height|fill|style|class)=/.test(opening));
  }
});

test('bounded wrapper provenance retains the exact verified source expression and identifies unused labelBy', () => {
  assert.equal(source.source.sha256, '75aa6f4d5c0dd662839844b490f99ab1534a24c8330f81b1c5cfd31a9d7371d7');
  assert.deepEqual(source.wrapper.offsets, [1145101, 1145487]);
  assert.equal(digest(source.wrapper.sourceExpression), '2de51d4f59a49dfc1bd59c490f8870c38dff42882fdff79dce0b93d370011160');
  assert.equal(source.wrapper.unusedProp, 'labelBy');
});

test.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
