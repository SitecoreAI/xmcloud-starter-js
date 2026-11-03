import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const feature = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.resolve(feature, '../../../../public');
const manifest = JSON.parse(fs.readFileSync(path.join(feature, 'source-assets.json')));
const bytes = (name) => fs.readFileSync(path.join(publicRoot, name));
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');
const pins = {
  script: 'ef767f7073bbbd3efc683f83a86d23e1160935f30f41c434f84a45c8629096ee',
  stylesheet: '86c03fde62194e1561937c2600915ff7c6d98a1941df3925abf86d2d03c0a11d',
  'dx-index-advantage-xlsx.xlsx': '4d33b801c8dd3377277b8acd6d94a912e3d331ee386dfffb68cf7785aa58d34f',
  'iva.xlsx': 'd2c601cff456fa40adaa6dbf606374fcd331ddc3c809cac30ef3d626b6e2fae7',
};

test('one Plus Strategy engine, original layout CSS and both workbooks retain source byte identity', () => {
  assert.equal(manifest.preset.key, 'strategy-plus');
  assert.equal(manifest.preset.nativeSchemaKey, 'rila-strategy-plus-source');
  for (const asset of manifest.assets) {
    const payload = bytes(asset.localPath);
    assert.equal(payload.length, asset.bytes, asset.localPath);
    assert.equal(sha(payload), asset.sha256, asset.localPath);
  }
  const original = manifest.assets.filter((asset) => !asset.reusedExistingAsset);
  assert.equal(original.length, 4);
  for (const asset of original) assert.equal(asset.sha256, pins[asset.kind === 'workbook' ? path.basename(asset.localPath) : asset.kind]);
});

test('unchanged source bootstrap mounts the Strategy model and reads only its two configured workbooks', () => {
  const source = bytes(manifest.preset.script).toString('utf8');
  assert.ok(source.includes('document.getElementById("dx-index-advantage")'));
  assert.match(source, /index-advantage-plus-m24/);
  const workbooks = manifest.assets.filter((asset) => asset.kind === 'workbook');
  for (const workbook of workbooks) assert.ok(source.includes(workbook.sourcePath));
  assert.deepEqual(manifest.networkContract.bootstrap.map((entry) => entry.path), workbooks.map((asset) => asset.localPath));
  assert.ok(manifest.networkContract.bootstrap.every((entry) => entry.method === 'GET'));
  assert.equal(manifest.networkContract.identifiedFinancialInputRequestBody, null);
});

test('the exact Strategy CSS has only inline SVG resources and reuses existing pinned base fonts', () => {
  const stylesheet = manifest.assets.find((asset) => asset.kind === 'stylesheet' && !asset.reusedExistingAsset);
  const text = bytes(stylesheet.localPath).toString('utf8');
  const urls = [...text.matchAll(/url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^)]*))\s*\)/g)].map((match) => match[1] ?? match[2] ?? match[3]);
  assert.equal(urls.length, 48);
  assert.equal(new Set(urls).size, 37);
  assert.ok(urls.every((url) => url.startsWith('data:image/svg+xml')));
  assert.doesNotMatch(text, /@import|@font-face/i);
  const fonts = new Set(manifest.assets.filter((asset) => asset.kind === 'font').map((asset) => asset.localPath));
  assert.equal(fonts.size, 18);
  const base = bytes('/allianz-assets/lifetime-income/base.css').toString('utf8');
  for (const match of base.matchAll(/url\(\s*["']?([^\)"']+)/g)) {
    if (match[1].startsWith('data:')) continue;
    const url = new URL(match[1], 'https://demo.invalid/allianz-assets/lifetime-income/base.css');
    assert.equal(url.origin, 'https://demo.invalid');
    assert.ok(fonts.has(url.pathname), url.pathname);
  }
});

test('the frame remains inert until the existing parent installs guards; only exact local assets load', () => {
  const preset = manifest.preset;
  const html = bytes(preset.framePath).toString('utf8');
  assert.match(html, /<main id="allianz-calculator-frame" inert data-source-preset="strategy-plus">/);
  assert.ok(html.includes('<div id="dx-index-advantage"></div>'));
  assert.deepEqual([...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]), [preset.script]);
  assert.deepEqual([...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]), preset.styles);
  assert.doesNotMatch(html, /https?:|<form|<iframe|on(?:click|load|submit)=|fetch\(|XMLHttpRequest/);
});
