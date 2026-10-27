import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const publicRoot = fileURLToPath(new URL('../../../public/', import.meta.url));
const assets = path.join(publicRoot, 'allianz-assets/lifetime-income');
const digest = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('financial engine, workbook and styles remain the verified official bytes', () => {
  for (const [relative, expected] of [
    ['allianz-assets/lifetime-income/widget.js', 'b967b34b0549cac8bce19ac625881a5184f1ae7c151c51bd31ab8b770efb368f'],
    ['~/Media/Files/Global/ToolShed/dx-allianz-in-plan-annuity/dx-allianz-in-plan-annuity-xlsx.xlsx', '944cd27387c27229e7e1f861ad14d73c0a7a2df77c85c3b6f82cb021feb465a5'],
    ['allianz-assets/lifetime-income/widget.css', '7c01e98677f3c40f4ce62700a54e7127f1ede9577c7e1541da0a5df5c34811a1'],
    ['allianz-assets/lifetime-income/base.css', '11de986b98b0afc9c4cd391d4b1072ff19d65c00567b70f5ded193fffe9f8c3f'],
  ]) assert.equal(digest(path.join(publicRoot, relative)), expected, relative);
});

test('every original font dependency is served locally and matches its source manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(assets, 'source-manifest.json'), 'utf8'));
  for (const asset of manifest.assets) assert.equal(digest(path.join(publicRoot, asset.path)), asset.sha256, asset.path);
  const css = fs.readFileSync(path.join(assets, 'base.css'), 'utf8');
  const fonts = Array.from(css.matchAll(/url\((\/fonts\/[^)]+)\)/g), (m) => m[1]);
  assert.ok(fonts.length >= 18);
  for (const font of fonts) assert.ok(fs.existsSync(path.join(publicRoot, font)), font);
});

test('the isolated document loads local source assets with the exact original mount identity', () => {
  const html = fs.readFileSync(path.join(assets, 'index.html'), 'utf8');
  assert.match(html, /id="dx-allianz-in-plan-annuity"/);
  assert.match(html, /id="allianz-calculator-frame"/);
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
  assert.doesNotMatch(html, /https?:|<iframe|onload=|eval\(/);
  for (const match of html.matchAll(/(?:href|src)="([^\"]+)"/g)) assert.ok(fs.existsSync(path.join(assets, match[1])), match[1]);
});
