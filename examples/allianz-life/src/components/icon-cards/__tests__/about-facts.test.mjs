import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const filename = path.join(sourceRoot, 'components/icon-cards/IconCards.tsx');
const { AboutFacts } = loadSource(filename);
// Bounded current About native public values/order; non-Image schema markers below are test-only,
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
// Exact six Content Hub bindings from the parent saved/reopened ledger.
// These are test inputs, not renderer fallbacks or native/browser acceptance.
const TRANSPORT = [
  {
    "assetId": 124926,
    "src": "https://thlt-demo.sitecoresandbox.cloud/api/public/content/c8eb843c9f2f4fde96270c76a65bad1e?v=99e1a8e8",
    "alt": "Heart"
  },
  {
    "assetId": 125251,
    "src": "https://thlt-demo.sitecoresandbox.cloud/api/public/content/f604959bef2b404da3469d2f9ae151ce?v=8583f9c6",
    "alt": "Receive"
  },
  {
    "assetId": 125011,
    "src": "https://thlt-demo.sitecoresandbox.cloud/api/public/content/e7e73ed8387e4d8498bac0f5a8dcccbf?v=ea39d35b",
    "alt": "Minnesota"
  },
  {
    "assetId": 125024,
    "src": "https://thlt-demo.sitecoresandbox.cloud/api/public/content/ef9c3fbf925942cc9ada49c0493d4514?v=3eb35032",
    "alt": "Portfolio"
  },
  {
    "assetId": 125278,
    "src": "https://thlt-demo.sitecoresandbox.cloud/api/public/content/b76c48eec8534e2db69375f40d36f776?v=bfec6e37",
    "alt": "Game"
  },
  {
    "assetId": 125306,
    "src": "https://thlt-demo.sitecoresandbox.cloud/api/public/content/05b657e171274f668ca65651c0661938?v=7be34f64",
    "alt": "titleIconDetailedGlobe"
  }
];
const ICON_FIELD_ID = '4B67CB30-A8F1-46B8-8E0D-09D0F230A444';
const field = (owner, name, value, fieldType) => ({ value, metadata: { itemId: owner,
  fieldId: `${owner}-${name}-test-only`, fieldType, testOnly: true } });
const fixture = () => ({ id: CURRENT.id, title: { jsonValue: field(CURRENT.id, 'title', CURRENT.title, 'Single-Line Text') },
  children: { total: 6, pageInfo: { hasNext: false, endCursor: CURRENT.cards.at(-1).id }, results: CURRENT.cards.map(card => ({
    id: card.id, fieldCollection: [
      { name: 'Title', jsonValue: field(card.id, 'title', card.title, 'Single-Line Text') },
      { name: 'Text', jsonValue: field(card.id, 'text', card.text, 'Rich Text') },
      { name: 'Icon', jsonValue: { value: {}, metadata: { itemId: card.id, fieldId: ICON_FIELD_ID, fieldType: 'Image' } } },
    ],
  })) } });
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
const attrs = (html, tag, name) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, 'g'))].map(match => decode(match[1]));
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(decode(match[1])));
const deepFreeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
const nativeFields = data => [data.title.jsonValue, ...data.children.results.flatMap(card => card.fieldCollection.filter(entry => ['Title','Text','Icon'].includes(entry.name)).map(entry => entry.jsonValue))];
const nativeIcons = data => data.children.results.map(card => card.icon?.jsonValue ?? card.fieldCollection.find(entry => entry.name === 'Icon')?.jsonValue);
const filledFixture = () => {
  const data = fixture();
  nativeIcons(data).forEach((icon, index) => { icon.value = { src: TRANSPORT[index].src, alt: TRANSPORT[index].alt, width: 24, height: 24 }; });
  return data;
};
function instrumented() {
  const React = require('react'), sdk = require('@sitecore-content-sdk/nextjs'), ts = require('typescript'), observed = [];
  const compiled = new Module(filename); compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = specifier => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, ...Object.fromEntries(['Text', 'RichText', 'Image'].map(name => [name, props => {
      observed.push({ name, field: props.field, editable: props.editable, props }); return React.createElement(sdk[name], props);
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

test('AboutFacts explicit cleared fixture retains six native Title/Text values in source3+3 order and fixed presentation', () => {
  const data = deepFreeze(fixture()), before = JSON.stringify(data);
  const html = render(AboutFacts, data, false, { RenderingIdentifier: 'about-facts', columns: '1', theme: 'blue-soft', headingLevel: 'h1' });
  assert.match(html, /id="about-facts"/); assert.match(html, /t-bg-transparent axlTileCollection allianz-icon-cards allianz-about-facts/);
  assert.equal((html.match(/class="l-grid__row match-height-row"/g) || []).length, 2);
  assert.equal((html.match(/class="l-grid__column-medium-4"/g) || []).length, 6);
  assert.equal((html.match(/<h2\b/g) || []).length, 1); assert.equal((html.match(/<h3\b/g) || []).length, 6);
  let offset = 0;
  for (const card of CURRENT.cards) { const next = html.indexOf(card.title, offset); assert.ok(next >= offset); offset = next + card.title.length; assert.ok(html.includes(card.text)); }
  assert.deepEqual(attrs(html, 'img', 'src'), [], 'this explicit cleared-field fixture supplies no replacement images');
  assert.doesNotMatch(html, /allianz-ui\/about-overview|allianz-about-fact-glyph/);
  assert.equal(markers(html).length, 0); assert.doesNotMatch(html, /<h1\b|t-bg-blue-soft|tileLink/);
  assert.equal(JSON.stringify(data), before);
});

test('AboutFacts SDK receives each original title/text/icon object once after authoring without copying fields', () => {
  const { components, observed } = instrumented(), data = deepFreeze(filledFixture()), original = nativeFields(data), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    observed.length = 0; const html = render(components.AboutFacts, data, editing);
    assert.equal(observed.length, 19); assert.equal(observed.filter(value => value.name === 'Image').length, 6);
    for (const field of original) { const calls = observed.filter(value => value.field === field); assert.equal(calls.length, 1); assert.equal(calls[0].editable, editing); }
    const author = markers(html); assert.equal(author.length, editing ? 19 : 0);
    for (const field of editing ? original : []) assert.equal(author.filter(marker => marker.itemId === field.metadata.itemId && marker.fieldId === field.metadata.fieldId).length, 1);
    assert.equal(JSON.stringify(data), before);
  }
});

test('AboutFacts consumes the six parent saved/reopened Content Hub URLs and exact source alts through native SDK Image', () => {
  const data = deepFreeze(filledFixture()), icons = nativeIcons(data), { components, observed } = instrumented();
  for (const editing of [false, true]) {
    observed.length = 0;
    const html = render(components.AboutFacts, data, editing), images = observed.filter(value => value.name === 'Image');
    assert.deepEqual(attrs(html, 'img', 'src'), icons.map(icon => icon.value.src));
    assert.deepEqual(attrs(html, 'img', 'alt'), icons.map(icon => icon.value.alt));
    assert.deepEqual(attrs(html, 'img', 'class'), Array(6).fill('allianz-about-fact-glyph'));
    assert.deepEqual(attrs(html, 'img', 'width'), Array(6).fill('24'));
    assert.deepEqual(attrs(html, 'img', 'height'), Array(6).fill('24'));
    for (const [index, image] of images.entries()) {
      assert.equal(image.field, icons[index]); assert.equal(image.editable, editing);
      assert.equal(image.props.alt, undefined); assert.equal(image.props['aria-hidden'], undefined);
    }
    for (const tag of html.matchAll(/<img\b[^>]*>/g)) assert.doesNotMatch(tag[0], /aria-hidden|\bhidden=|role="presentation"/);
    assert.doesNotMatch(html, /allianz-ui\/about-overview|mask-image|<svg/);
    assert.equal(markers(html).length, editing ? 19 : 0);
  }
  assert.equal(new Set(TRANSPORT.map(item => item.src)).size, 6);
  assert.deepEqual(TRANSPORT.map(item => item.alt), LABELS);
  assert.equal(TRANSPORT[5].alt, 'titleIconDetailedGlobe');
});

test('cleared and absent native fields stay off the canvas without synthetic editors', () => {
  const data = fixture(); data.title.jsonValue.value = ''; data.children.results[0].fieldCollection[0].jsonValue.value = '';
  data.children.results[0].fieldCollection[1].jsonValue.value = '';
  assert.equal(markers(render(AboutFacts, data, true)).length, 10);
  assert.equal((render(AboutFacts, data).match(/<h3\b/g) || []).length, 5);
  assert.equal(attrs(render(AboutFacts, data), 'img', 'src').length, 0);
  data.children.results[0].fieldCollection = [];
  assert.equal(markers(render(AboutFacts, data, true)).length, 10);
});

test('AboutFacts authored Image fields follow their card owners through reorder rather than fixed positions', () => {
  const data = filledFixture(); data.children.results.reverse(); data.children.results[0].fieldCollection[0].jsonValue.value = 'An authored title';
  const html = render(AboutFacts, data);
  assert.ok(html.indexOf('An authored title') < html.indexOf('Allianz Field'));
  assert.deepEqual(attrs(html, 'img', 'src'), [...TRANSPORT].reverse().map(item => item.src));
  assert.deepEqual(attrs(html, 'img', 'alt'), nativeIcons(data).map(icon => icon.value.alt));
  assert.equal(markers(render(AboutFacts, data, true)).length, 19);
});

test('blank and absent Icon fields create no canvas editors and never borrow source assets', () => {
  const data = fixture(), before = JSON.stringify(data), { components, observed } = instrumented();
  for (const editing of [false, true]) {
    observed.length = 0; const html = render(components.AboutFacts, data, editing);
    assert.equal(observed.filter(value => value.name === 'Image').length, 0);
    assert.equal(markers(html).length, editing ? 13 : 0);
    assert.doesNotMatch(html, /allianz-ui\/about-overview|https:\/\/thlt-demo/);
  }
  assert.equal(JSON.stringify(data), before);
  for (const card of data.children.results) card.fieldCollection = card.fieldCollection.filter(entry => entry.name !== 'Icon');
  assert.equal(markers(render(AboutFacts, data, true)).length, 13);
  assert.equal(attrs(render(AboutFacts, data), 'img', 'src').length, 0);
});

test('canonical Icon clears override stale populated fieldCollection without mutation or positional fallback', () => {
  const data = filledFixture(), first = data.children.results[0], stale = first.fieldCollection.find(entry => entry.name === 'Icon').jsonValue;
  first.icon = { jsonValue: field(first.id, 'cleared-icon', {}, 'Image') };
  const canonical = first.icon.jsonValue, before = JSON.stringify(data), { components, observed } = instrumented();
  for (const editing of [false, true]) {
    observed.length = 0; const html = render(components.AboutFacts, deepFreeze(data), editing);
    const images = observed.filter(value => value.name === 'Image');
    assert.equal(images.some(value => value.field === stale), false);
    assert.equal(images.some(value => value.field === canonical), false);
    assert.deepEqual(attrs(render(AboutFacts, data), 'img', 'src'), TRANSPORT.slice(1).map(item => item.src));
    assert.equal(markers(html).length, editing ? 18 : 0);
    assert.equal(JSON.stringify(data), before);
  }
  const absent = filledFixture(); absent.children.results[0].icon = { jsonValue: undefined };
  assert.equal(markers(render(AboutFacts, absent, true)).length, 18);
  assert.deepEqual(attrs(render(AboutFacts, absent), 'img', 'src'), TRANSPORT.slice(1).map(item => item.src));
});

test('native blank authored alt remains blank and does not regain a fixed source label', () => {
  const data = filledFixture(); nativeIcons(data)[0].value.alt = '';
  assert.equal(attrs(render(AboutFacts, data), 'img', 'alt')[0], '');
  assert.equal(LABELS.includes(attrs(render(AboutFacts, data), 'img', 'alt')[0]), false);
});

test('AboutFacts refuses incomplete or extra collections instead of partial UI or copied source fallback', () => {
  for (const data of [undefined, {}, { children: { results: [] } }, ...[5,7].map(size => {
    const value = fixture(); value.children.results = size === 5 ? value.children.results.slice(0,5) : [...value.children.results, value.children.results[0]]; return value;
  })]) {
    for (const editing of [false,true]) { const html = render(AboutFacts, data, editing); assert.doesNotMatch(html, /allianz-about-fact-glyph|Key company facts|Our name/); }
  }
});

test('retained source witnesses and scoped source gray26/40 CSS stay unchanged while runtime icons are author fields', () => {
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

test('Default and AboutFacts keep populated canvas structure equal to normal output apart from SDK metadata', () => {
  const { components } = instrumented();
  for (const Component of [components.Default, components.AboutFacts]) {
    const data = deepFreeze(filledFixture()), before = JSON.stringify(data);
    const normal = render(Component, data), editing = render(Component, data, true);
    assert.equal(editing.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, ''), normal);
    assert.equal(markers(editing).length, 19);
    assert.doesNotMatch(editing, /No text in field|scEmptyImage/);
    assert.equal(JSON.stringify(data), before);
  }
});
