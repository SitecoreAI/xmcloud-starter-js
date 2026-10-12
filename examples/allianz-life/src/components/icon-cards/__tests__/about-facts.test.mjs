import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const filename = path.join(sourceRoot, 'components/icon-cards/IconCards.tsx');
const { AboutFacts } = loadSource(filename);
// Bounded current About native public values/order; schema markers below are test-only,
// not a CMS write, source fallback or authenticated-editor acceptance claim.
const CURRENT = {
  "id": "00276504079F4B50A26579D6E332A56C",
  "title": "Key company facts",
  "cards": [
    {
      "id": "B34055C95EE0445ABB7BE9B2EEC5A8CD",
      "title": "Our name",
      "text": "<p>Our name is pronounced \"AH‑Lee‑Ahnz.\"</p>"
    },
    {
      "id": "4DD4FC6DA3E84F21B1897D381C78EC61",
      "title": "Our customers",
      "text": "<p>We’ve been helping Americans prepare for their financial futures since 1896.</p>"
    },
    {
      "id": "BB21B046DFB248E5BDD2DDD38DE2B879",
      "title": "Company headquarters",
      "text": "<p>Allianz Life is headquartered in Minneapolis.</p>"
    },
    {
      "id": "F1F7C28667534D808F256BD1CAD282C9",
      "title": "What we do",
      "text": "<p>We help people address risk in their portfolios with both fixed and registered index-linked annuities, life insurance, AllianzIM ETFs, and other products.</p>"
    },
    {
      "id": "1D9A201715074BD6B797728B943B9AE6",
      "title": "Allianz Field®",
      "text": "<p>We are the proud sponsor of <a rel=\"noopener noreferrer\" href=\"https://www.mnufc.com/stadium/\" target=\"_blank\">Allianz Field</a>®, home of the Minnesota United FC in St. Paul.</p>"
    },
    {
      "id": "222DE77DB13C4AFA9ADC01A267F56328",
      "title": "Who we are",
      "text": "<p>We are a wholly owned subsidiary of <a rel=\"noopener noreferrer\" href=\"https://www.allianz.com/en.html\" target=\"_blank\">Allianz SE</a>, a global financial services group based in Munich, Germany.</p>"
    }
  ]
};
const GLYPHS = ['heart', 'receive', 'minnesota', 'portfolio', 'game', 'detailed-globe'];
const LABELS = ['Heart', 'Receive', 'Minnesota', 'Portfolio', 'Game', 'titleIconDetailedGlobe'];
const SVG_SHA = ["0fae4fea0bfd862fea76d21101e1f291ef7c2f192e1b46e00e1110b7200645ca", "050c523ee20e98a52e343ec7415368a7ba0dfec96b21502c6a5dcfa0c9563929", "fab1f0d9586afbe76efac74603273355b8ebd3f59c4bbc5a447f516595bda3d6", "36e9bb9f63df6e7d02767de9577af2b5539511e0b962ec4639ae5b54cd2a611a", "06eebad4c441a134e07aca07ede349b88aebf238604080b9f41fcb0fd134eeee", "049fc8ff866cdcdb6936159b61f23dfff5a8a5139b4f3b66c3a86baf239e5b56"];
const field = (owner, name, value, fieldType) => ({ value, metadata: { itemId: owner,
  fieldId: `${owner}-${name}-test-only`, fieldType, testOnly: true } });
const fixture = () => ({ id: CURRENT.id, title: { jsonValue: field(CURRENT.id, 'title', CURRENT.title, 'Single-Line Text') },
  children: { total: 6, pageInfo: { hasNext: false, endCursor: CURRENT.cards.at(-1).id }, results: CURRENT.cards.map(card => ({
    id: card.id, fieldCollection: [
      { name: 'Title', jsonValue: field(card.id, 'title', card.title, 'Single-Line Text') },
      { name: 'Text', jsonValue: field(card.id, 'text', card.text, 'Rich Text') },
      { name: 'Icon', jsonValue: { value: {}, metadata: { itemId: card.id, fieldId: 'blank-native-icon-test-only', fieldType: 'Image' } } },
    ],
  })) } });
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
const attrs = (html, tag, name) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, 'g'))].map(match => decode(match[1]));
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(decode(match[1])));
const deepFreeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
const nativeFields = data => [data.title.jsonValue, ...data.children.results.flatMap(card => card.fieldCollection.filter(entry => ['Title','Text'].includes(entry.name)).map(entry => entry.jsonValue))];
function instrumented() {
  const React = require('react'), sdk = require('@sitecore-content-sdk/nextjs'), ts = require('typescript'), observed = [];
  const compiled = new Module(filename); compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = specifier => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, ...Object.fromEntries(['Text', 'RichText', 'Image'].map(name => [name, props => {
      observed.push({ name, field: props.field, editable: props.editable }); return React.createElement(sdk[name], props);
    }])) };
    if (/^(components|lib)\//.test(specifier)) {
      const base = path.join(sourceRoot, specifier), local = [base, base + '.ts', base + '.tsx'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (local) return loadSource(local);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return { components: compiled.exports, observed };
}

test('AboutFacts retains six existing native Title/Text values in source3+3 order and fixed source presentation', () => {
  const data = deepFreeze(fixture()), before = JSON.stringify(data);
  const html = render(AboutFacts, data, false, { RenderingIdentifier: 'about-facts', columns: '1', theme: 'blue-soft', headingLevel: 'h1' });
  assert.match(html, /id="about-facts"/); assert.match(html, /t-bg-transparent axlTileCollection allianz-icon-cards allianz-about-facts/);
  assert.equal((html.match(/class="l-grid__row match-height-row"/g) || []).length, 2);
  assert.equal((html.match(/class="l-grid__column-medium-4"/g) || []).length, 6);
  assert.equal((html.match(/<h2\b/g) || []).length, 1); assert.equal((html.match(/<h3\b/g) || []).length, 6);
  let offset = 0;
  for (const card of CURRENT.cards) { const next = html.indexOf(card.title, offset); assert.ok(next >= offset); offset = next + card.title.length; assert.ok(html.includes(card.text)); }
  assert.deepEqual(attrs(html, 'img', 'src'), GLYPHS.map(name => `/allianz-ui/about-overview/${name}.svg`));
  assert.deepEqual(attrs(html, 'img', 'alt'), LABELS);
  assert.equal(markers(html).length, 0); assert.doesNotMatch(html, /<h1\b|t-bg-blue-soft|tileLink/);
  assert.equal(JSON.stringify(data), before);
});

test('AboutFacts SDK receives each original rootTitle/childTitle/Text object once in visitor and editor', () => {
  const { components, observed } = instrumented(), data = deepFreeze(fixture()), original = nativeFields(data), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    observed.length = 0; const html = render(components.AboutFacts, data, editing);
    assert.equal(observed.length, 13); assert.equal(observed.filter(value => value.name === 'Image').length, 0);
    for (const field of original) { const calls = observed.filter(value => value.field === field); assert.equal(calls.length, 1); assert.equal(calls[0].editable, editing); }
    const author = markers(html); assert.equal(author.length, editing ? 13 : 0);
    for (const field of editing ? original : []) assert.equal(author.filter(marker => marker.itemId === field.metadata.itemId && marker.fieldId === field.metadata.fieldId).length, 1);
    assert.equal(JSON.stringify(data), before);
  }
});

test('AboutFacts fixed UI never reads native blank or filled Icon fields and preserves input identities', () => {
  const data = fixture();
  for (const card of data.children.results) {
    const icon = card.fieldCollection.find(entry => entry.name === 'Icon');
    Object.defineProperty(icon, 'jsonValue', { enumerable: true, get: () => { throw new Error('Unused native Icon read'); } });
  }
  for (const editing of [false, true]) {
    const html = render(AboutFacts, data, editing); assert.equal(attrs(html, 'img', 'src').length, 6);
    assert.equal(markers(html).length, editing ? 13 : 0);
  }
});

test('cleared supported native fields stay editable and absent fields create no synthetic editors', () => {
  const data = fixture(); data.title.jsonValue.value = ''; data.children.results[0].fieldCollection[0].jsonValue.value = '';
  data.children.results[0].fieldCollection[1].jsonValue.value = '';
  assert.equal(markers(render(AboutFacts, data, true)).length, 13);
  assert.equal((render(AboutFacts, data).match(/<h3\b/g) || []).length, 5);
  assert.equal(attrs(render(AboutFacts, data), 'img', 'src').length, 6);
  data.children.results[0].fieldCollection = [];
  assert.equal(markers(render(AboutFacts, data, true)).length, 11);
});

test('AboutFacts preserves authored child order while its six source glyphs stay positional', () => {
  const data = fixture(); data.children.results.reverse(); data.children.results[0].fieldCollection[0].jsonValue.value = 'An authored title';
  const html = render(AboutFacts, data);
  assert.ok(html.indexOf('An authored title') < html.indexOf('Allianz Field'));
  assert.deepEqual(attrs(html, 'img', 'src'), GLYPHS.map(name => `/allianz-ui/about-overview/${name}.svg`));
  assert.equal(markers(render(AboutFacts, data, true)).length, 13);
});

test('AboutFacts refuses incomplete or extra collections instead of partial UI or copied source fallback', () => {
  for (const data of [undefined, {}, { children: { results: [] } }, ...[5,7].map(size => {
    const value = fixture(); value.children.results = size === 5 ? value.children.results.slice(0,5) : [...value.children.results, value.children.results[0]]; return value;
  })]) {
    for (const editing of [false,true]) { const html = render(AboutFacts, data, editing); assert.doesNotMatch(html, /allianz-about-fact-glyph|Key company facts|Our name/); }
  }
});

test('AboutFacts glyph bytes and scoped source gray26/40 CSS retain exact source geometry', () => {
  for (const [index,name] of GLYPHS.entries()) {
    const svg = fs.readFileSync(path.resolve(sourceRoot, '../public/allianz-ui/about-overview', name + '.svg'));
    assert.equal(createHash('sha256').update(svg).digest('hex'), SVG_SHA[index]);
    assert.match(svg.toString(), /viewBox="0 0 24 24"/); assert.doesNotMatch(svg.toString(), /<script|<foreignObject/);
  }
  const css = fs.readFileSync(path.join(sourceRoot, 'components/icon-cards/IconCards.css'), 'utf8');
  const tree = require('postcss').parse(css); const widths = [];
  tree.walkRules(rule => assert.ok(rule.selector.startsWith('.allianz-icon-cards ')));
  tree.walkDecls('width', declaration => widths.push(declaration.value)); assert.deepEqual(widths, ['26px','40px']);
  assert.match(css,/min-width: 704px/); assert.match(css,/brightness\(0\) invert\(23\.5294%\)/);
});

test('AboutFacts appends its finite export while the complete prior IconCards source byte prefix stays unchanged', () => {
  const source = fs.readFileSync(filename); const mark = Buffer.from("\r\n/** About's fixed UI glyphs");
  const end = source.indexOf(mark); assert.ok(end > 0);
  assert.equal(createHash('sha256').update(source.subarray(0,end)).digest('hex'), 'bef103d4172e27aafcdf443853df76910dcc140282bf4409ec36f9c53a6aa9fe');
});
