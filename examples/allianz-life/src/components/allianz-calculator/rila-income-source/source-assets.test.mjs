import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const feature = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.resolve(feature, '../../../../public');
const manifest = JSON.parse(fs.readFileSync(path.join(feature, 'source-assets.json'), 'utf8'));
const bytes = (localPath) => fs.readFileSync(path.join(publicRoot, localPath));
const sha = (payload) => createHash('sha256').update(payload).digest('hex');
const scriptPins = {
  'income-adv': '9f68a239bd4406f7530d7ad0d7980c38ba25b251670a2240710f4c318c72bf12',
  'plus-income': 'ad55c962d1e4110bc756e0e01a23d5d8fb2bb727719369d24ac2b00e3d4a9a56',
  'plus-select-income': 'abc1166e09f5ca66ca29b1e98f3a70ea5a19026fc8d61eac38878265a8317739',
};
const workbookPins = {
  'income-adv': '6ff88db102fa977f262119c64e4e5341c16d71f383bc180199216bcf40260878',
  'plus-income': 'f0c02e5b7f63f9b5292b1cf0611a753355a888b0656b08ffbd989ddf709cecc0',
  'plus-select-income': '6ff88db102fa977f262119c64e4e5341c16d71f383bc180199216bcf40260878',
};
const cssPins = {
  '/allianz-assets/lifetime-income/base.css': '11de986b98b0afc9c4cd391d4b1072ff19d65c00567b70f5ded193fffe9f8c3f',
  '/allianz-assets/rila-income/income-adv.css': '05ecaf27ef9be3f4e85a1d1b0b1e9005fb6a35859f0db01b0d6c8ea9e6e2eace',
  '/allianz-assets/rila-income/plus-income.css': '16bb71f66d9f535895df1ff56840f4833994874ea612064269c9f2d749c5cc97',
  '/allianz-assets/rila-income/plus-select-income.css': '70bb664674c50afebfeff430de7a7e25cfd370aa070868171a508745bd88a3b3',
};

function zipNames(buffer) {
  const entries = [];
  for (let offset = 0; offset + 46 <= buffer.length; offset++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    entries.push(buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'));
    offset += 45 + nameLength + extraLength + commentLength;
  }
  return entries;
}

test('the three explicit presets retain distinct original binaries and two workbook payloads', () => {
  assert.deepEqual(manifest.presets.map((p) => p.key), Object.keys(scriptPins));
  assert.equal(new Set(manifest.presets.map((p) => sha(bytes(p.script)))).size, 3);
  assert.equal(new Set(manifest.presets.map((p) => sha(bytes(p.workbookLocalPath)))).size, 2);
  assert.equal(manifest.presets.length, 3);
  for (const preset of manifest.presets) {
    assert.equal(sha(bytes(preset.script)), scriptPins[preset.key]);
    assert.equal(sha(bytes(preset.workbookLocalPath)), workbookPins[preset.key]);
    assert.equal(preset.workbookLocalPath, preset.workbookRequestPath,
      'unchanged source requests must resolve directly to exact static aliases');
  }
});

test('all pinned assets, including reused fonts and CSS, preserve exact byte identity', () => {
  assert.equal(manifest.assets.length, 28);
  assert.equal(manifest.assets.filter((a) => a.kind === 'font').length, 18);
  for (const asset of manifest.assets) {
    assert.ok(asset.localPath.startsWith('/') && !asset.localPath.startsWith('//'));
    assert.doesNotMatch(asset.localPath, /[?#]|\.\./);
    const payload = bytes(asset.localPath);
    assert.equal(payload.length, asset.bytes, asset.localPath);
    assert.equal(sha(payload), asset.sha256, asset.localPath);
  }
  for (const [localPath, expected] of Object.entries(cssPins)) {
    assert.equal(sha(bytes(localPath)), expected, localPath);
  }
});

test('each original bootstrap retains its native mount, product and single configured workbook', () => {
  for (const preset of manifest.presets) {
    const source = bytes(preset.script).toString('utf8');
    const configurations = [...source.matchAll(/production:!0,appVersion:"([^"]+)",apiUrl:"([^"]+\.xlsx)"/g)];
    assert.equal(configurations.length, 1, preset.key);
    assert.equal(configurations[0][1], `index-advantage-${preset.key}`);
    assert.equal(configurations[0][2], preset.workbookRequestPath);
    assert.equal(preset.mountId, 'dx-income-index-advantage');
    assert.ok(source.includes(`document.getElementById("${preset.mountId}")`));
    assert.match(source.slice(-1400), /\.data\.get\(\)/);
    const network = manifest.networkContract.bootstrap.filter((row) => row.preset === preset.key);
    assert.deepEqual(network.map(({ method, path: requestPath }) => [method, requestPath]),
      [['GET', preset.workbookRequestPath]]);
  }
});

test('the pinned workbook files contain ordinary XLSX parts, with no macro project', () => {
  for (const preset of manifest.presets) {
    const names = zipNames(bytes(preset.workbookLocalPath));
    assert.ok(names.includes('[Content_Types].xml'), preset.key);
    assert.ok(names.includes('xl/workbook.xml'), preset.key);
    assert.ok(names.some((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)), preset.key);
    assert.equal(names.some((name) => /vbaproject\.bin$/i.test(name)), false, preset.key);
  }
});

test('all stylesheet URL dependencies are existing same-origin pinned font files', () => {
  const fontPaths = new Set(manifest.assets.filter((a) => a.kind === 'font').map((a) => a.localPath));
  for (const stylesheet of manifest.assets.filter((a) => a.kind === 'stylesheet')) {
    const text = bytes(stylesheet.localPath).toString('utf8');
    for (const match of text.matchAll(/url\(\s*["']?([^\)"']+)/g)) {
      const value = match[1];
      if (value.startsWith('data:') || value.startsWith('#')) continue;
      const resolved = new URL(value, `https://demo.invalid${stylesheet.localPath}`);
      assert.equal(resolved.origin, 'https://demo.invalid');
      assert.equal(resolved.search, '');
      assert.equal(resolved.hash, '');
      assert.ok(fontPaths.has(resolved.pathname), resolved.pathname);
    }
  }
});

test('each static document loads only its exact local preset and remains inert until parent policy', () => {
  for (const preset of manifest.presets) {
    const html = bytes(preset.framePath).toString('utf8');
    assert.match(html, /<main id="allianz-calculator-frame" inert /);
    assert.ok(html.includes(`data-source-preset="${preset.framePresetId}"`));
    assert.ok(html.includes(`<div id="${preset.mountId}"></div>`));
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(scripts, [preset.script]);
    const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(styles, preset.styles);
    assert.doesNotMatch(html, /https?:|<form|<iframe|on(?:click|load|submit)=|fetch\(|XMLHttpRequest/);
  }
});
