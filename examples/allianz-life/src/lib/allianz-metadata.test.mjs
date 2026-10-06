import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const filename = fileURLToPath(new URL('./allianz-metadata.ts', import.meta.url));
const compiled = new Module(filename);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(fileURLToPath(new URL('.', import.meta.url)));
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { allianzMetadata } = compiled.exports;
const native = allianzMetadata({ pageTitle: { value: ' Native title ' }, metaDescription: { value: 'Native description' }, Title: { value: 'Scaffold title' }, metadataDescription: { value: 'Scaffold description' } });
assert.equal(native.title, 'Native title');
assert.equal(native.description, 'Native description');
assert.equal(native.openGraphTitle, 'Native title');
assert.equal(native.openGraphDescription, 'Native description');
assert.equal(allianzMetadata({ Title: { value: 'Fixture title' } }).title, 'Fixture title');
assert.equal(allianzMetadata({ pageTitle: { value: ' ' }, Title: { value: 'Scaffold title' } }).title, 'Scaffold title');
assert.equal(allianzMetadata({ metaDescription: { value: 'SEO' }, ogDescription: { value: 'Social' } }).openGraphDescription, 'Social');
assert.deepEqual(allianzMetadata(), { title: 'Page', description: '', openGraphTitle: 'Page', openGraphDescription: '' });
console.log('8 native-schema metadata assertions passed.');

test('stock archive metadata takes precedence over the generic content title', () => {
  const metadata = allianzMetadata({
    Title: { value: 'press-release-archive-2024' },
    baseMetadataTitle: { value: ' 2024 Press Releases | Allianz Life ' },
    baseMetadataDescription: { value: ' Browse 2024 press releases from Allianz Life. ' },
  });
  assert.deepEqual(metadata, {
    title: '2024 Press Releases | Allianz Life',
    description: 'Browse 2024 press releases from Allianz Life.',
    openGraphTitle: '2024 Press Releases | Allianz Life',
    openGraphDescription: 'Browse 2024 press releases from Allianz Life.',
  });
});

test('custom metadata and Open Graph fields preserve precedence over stock fields', () => {
  const metadata = allianzMetadata({
    pageTitle: { value: ' Custom title ' },
    metaDescription: { value: ' Custom description ' },
    metadataDescription: { value: 'Existing description fallback' },
    Title: { value: 'Content title' },
    baseMetadataTitle: { value: 'Stock title' },
    baseMetadataDescription: { value: 'Stock description' },
    ogTitle: { value: ' Custom social title ' },
    ogDescription: { value: ' Custom social description ' },
    baseOgTitle: { value: 'Stock social title' },
    baseOgDescription: { value: 'Stock social description' },
  });
  assert.deepEqual(metadata, {
    title: 'Custom title',
    description: 'Custom description',
    openGraphTitle: 'Custom social title',
    openGraphDescription: 'Custom social description',
  });
});

test('the existing metadataDescription fallback still precedes stock description', () => {
  assert.equal(allianzMetadata({
    metaDescription: { value: ' ' },
    metadataDescription: { value: ' Existing description ' },
    baseMetadataDescription: { value: 'Stock description' },
  }).description, 'Existing description');
});

test('stock metadata description precedes either Open Graph fallback', () => {
  const metadata = allianzMetadata({
    baseMetadataDescription: { value: 'Stock description' },
    ogDescription: { value: 'Custom social description' },
    baseOgDescription: { value: 'Stock social description' },
  });
  assert.equal(metadata.description, 'Stock description');
  assert.equal(metadata.openGraphDescription, 'Custom social description');
});

test('stock Open Graph fields are used before generic metadata fallbacks', () => {
  const metadata = allianzMetadata({
    pageTitle: { value: 'Page title' },
    metaDescription: { value: 'Page description' },
    baseOgTitle: { value: ' Stock social title ' },
    baseOgDescription: { value: ' Stock social description ' },
  });
  assert.deepEqual(metadata, {
    title: 'Page title',
    description: 'Page description',
    openGraphTitle: 'Stock social title',
    openGraphDescription: 'Stock social description',
  });
});

test('custom Open Graph description preserves precedence over its stock counterpart', () => {
  const metadata = allianzMetadata({
    ogDescription: { value: 'Custom social description' },
    baseOgDescription: { value: 'Stock social description' },
  });
  assert.equal(metadata.description, 'Custom social description');
  assert.equal(metadata.openGraphDescription, 'Custom social description');
});

test('stock Open Graph description is the last description fallback', () => {
  const metadata = allianzMetadata({ baseOgDescription: { value: ' Stock social description ' } });
  assert.equal(metadata.description, 'Stock social description');
  assert.equal(metadata.openGraphDescription, 'Stock social description');
});

test('empty and non-string custom fields allow the stock metadata fallbacks', () => {
  const metadata = allianzMetadata({
    pageTitle: { value: ' \n ' },
    metaDescription: { value: 42 },
    metadataDescription: { value: false },
    ogTitle: { value: {} },
    ogDescription: { value: null },
    baseMetadataTitle: { value: 'Stock title' },
    baseMetadataDescription: { value: 'Stock description' },
    baseOgTitle: { value: 'Stock social title' },
    baseOgDescription: { value: 'Stock social description' },
  });
  assert.deepEqual(metadata, {
    title: 'Stock title',
    description: 'Stock description',
    openGraphTitle: 'Stock social title',
    openGraphDescription: 'Stock social description',
  });
});

test('empty and non-string stock fields retain the existing generic fallbacks', () => {
  const metadata = allianzMetadata({
    Title: { value: 'Content title' },
    baseMetadataTitle: { value: 42 },
    baseMetadataDescription: { value: ' ' },
    baseOgTitle: { value: false },
    baseOgDescription: { value: {} },
  });
  assert.deepEqual(metadata, {
    title: 'Content title',
    description: '',
    openGraphTitle: 'Content title',
    openGraphDescription: '',
  });
});

test('blank native archive metadata never guesses a title or description from a headline', () => {
  assert.deepEqual(allianzMetadata({
    baseMetadataTitle: { value: '' },
    baseMetadataDescription: { value: '' },
    baseOgTitle: { value: '' },
    baseOgDescription: { value: '' },
    headline: { value: 'A page headline is not metadata' },
    pageSummary: { value: 'A page summary is not metadata' },
  }), { title: 'Page', description: '', openGraphTitle: 'Page', openGraphDescription: '' });
});
