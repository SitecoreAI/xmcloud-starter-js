import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { here, sourceRoot, require, loadSource, render, field, metadata } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const postcss = require('postcss');
const executive = loadSource(path.join(sourceRoot, 'components/executive-biography/ExecutiveBiography.tsx'));
const expert = loadSource(path.join(sourceRoot, 'components/expert-biography/ExpertBiography.tsx'));
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json'), 'utf8'));
const variants = [
  ...['Default', 'Extended', 'Contained', 'ChiefExecutive', 'LinkedPortrait'].map((variant) => ({
    label: `ExecutiveBiography.${variant}`,
    Component: executive[variant],
    sourcePortrait: manifest.records.find((record) => record.rendering === 'ExecutiveBiography' && record.variant === variant).sourcePortrait,
  })),
  { label: 'ExpertBiography.Default', Component: expert.Default },
];
const nativeSrc = 'https://dam.example.test/adam-brown.jpg?native=1';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function attributes(html) {
  const img = html.match(/<img\b[^>]*>/)?.[0];
  assert.ok(img, 'the real SDK rendered the native portrait');
  return Object.fromEntries([...img.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]));
}

function nativeData(alt) {
  const value = { src: nativeSrc, width: '768', height: '960', title: 'Native DAM portrait', 'data-media-id': 'native-adam-brown' };
  if (alt !== undefined) value.alt = alt;
  return freeze({ portrait: { jsonValue: { value, metadata: metadata('portrait', 'Image') } } });
}

test('every biography variant uses the real SDK native portrait without dropping dimensions, attributes or metadata', () => {
  for (const { label, Component } of variants) {
    for (const alt of [undefined, '', 'Adam Brown, Chief Actuary']) {
      for (const editing of [false, true]) {
        const data = nativeData(alt);
        const before = JSON.stringify(data);
        const html = render(Component, data, editing);
        const attrs = attributes(html);
        assert.equal(attrs.src.replaceAll('&amp;', '&'), nativeSrc, label);
        assert.equal(attrs.width, '768', label);
        assert.equal(attrs.height, '960', label);
        assert.equal(attrs.title, 'Native DAM portrait', label);
        assert.equal(attrs['data-media-id'], 'native-adam-brown', label);
        assert.equal(attrs.alt, alt ?? '', `${label}: blank/missing alt is explicit; authored alt survives`);
        if (editing) assert.ok(html.replaceAll('&quot;', '"').includes('"fieldId":"test-portrait-field"'), label);
        assert.equal(JSON.stringify(data), before, `${label}: native field stays unchanged`);
      }
    }
  }
});

test('executive portraits override the native fixed height while preserving each source variant width and maximum width', () => {
  for (const { label, Component, sourcePortrait } of variants.filter((variant) => variant.sourcePortrait)) {
    for (const editing of [false, true]) {
      const attrs = attributes(render(Component, nativeData(undefined), editing));
      const style = Object.fromEntries(attrs.style.split(';').map((declaration) => declaration.split(':')));
      assert.equal(style.height, 'auto', `${label}: a 352px constrained portrait must not retain its 960px native height`);
      assert.equal(style['max-width'], '100%', label);
      assert.equal(style.width, /(?:^|;)\s*width:\s*768px/.test(sourcePortrait.style) ? '768px' : undefined, label);
      assert.equal(attrs.height, '960', `${label}: full SDK field dimensions are still present`);
    }
  }
});

test('expert portraits retain the captured source responsive cover geometry', () => {
  const attrs = attributes(render(expert.Default, nativeData(undefined)));
  assert.equal(attrs.class, 'c-image__img c-teaser__image-img');
  assert.equal(attrs.sizes, '100vw');
  assert.equal(attrs.style, undefined, 'the captured source classes remain responsible for expert tile cover layout');
  const rules = JSON.parse(fs.readFileSync(path.join(here, 'source-style-rules.json'), 'utf8'));
  const source = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8'));
  for (const selector of ['.c-image__img', '.m-axlTile .tileImage picture .c-image__img', '.m-axlTile .tileImage picture .c-teaser__image-img']) {
    for (const expected of rules.filter((rule) => rule.selector === selector)) {
      const matched = [];
      source.walkRules(selector, (rule) => {
        const context = [];
        for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
          if (parent.type === 'atrule') context.unshift({ name: parent.name, params: parent.params });
        }
        if (JSON.stringify(context) === JSON.stringify(expected.context)) matched.push(rule);
      });
      assert.ok(matched.some((rule) => expected.declarations.every((decl) => rule.nodes.some((node) => node.prop === decl.prop && node.value === decl.value))), selector);
    }
  }
  assert.ok(rules.some((rule) => rule.selector === '.c-image__img' && rule.declarations.some((decl) => decl.prop === 'object-fit' && decl.value === 'cover')));
  assert.ok(rules.some((rule) => rule.selector === '.m-axlTile .tileImage picture .c-image__img' && rule.context.some((entry) => entry.params.includes('max-width:703px')) && rule.declarations.some((decl) => decl.prop === 'height' && decl.value === 'auto')));
});

test('intentional source portrait absence and CMS-cleared portraits stay absent in normal mode', () => {
  for (const { label, Component } of variants) {
    for (const data of [{}, { portrait: field({}) }]) {
      const before = JSON.stringify(data);
      assert.doesNotMatch(render(Component, data), /<img\b|<picture\b|class="tileImage"/, label);
      assert.equal(JSON.stringify(data), before, label);
    }
  }
  const absent = manifest.records.filter((record) => !record.sourcePortrait);
  assert.equal(absent.length, 4);
  for (const record of absent) {
    const Component = record.rendering === 'ExpertBiography' ? expert[record.variant] : executive[record.variant];
    assert.doesNotMatch(render(Component, record.exactSourceFieldValues), /<img\b|<picture\b|class="tileImage"/, record.route);
  }
});

test('cleared portraits retain their own real SDK editing metadata without a source fallback', () => {
  for (const { label, Component } of variants) {
    const data = freeze({ portrait: { jsonValue: { value: {}, metadata: metadata('portrait', 'Image') } } });
    const before = JSON.stringify(data);
    const html = render(Component, data, true);
    assert.ok(html.replaceAll('&quot;', '"').includes('"fieldId":"test-portrait-field"'), label);
    const attrs = attributes(html);
    assert.match(attrs.class, /\bscEmptyImage\b/, `${label}: cleared field keeps the SDK editing placeholder`);
    assert.match(attrs.src, /^data:image\/svg\+xml,/, `${label}: the editor placeholder is not a source portrait fallback`);
    assert.ok(!html.includes(nativeSrc), label);
    assert.equal(JSON.stringify(data), before, label);
  }
});
