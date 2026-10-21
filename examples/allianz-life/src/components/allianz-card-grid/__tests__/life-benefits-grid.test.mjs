import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const filename = path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx');
const Cards = loadSource(filename);
// Exact captured public copy; serializer shape/metadata below are test fixtures, not native-write evidence.
const BENEFITS = [
  {
    "heading": "Protection",
    "body": "\r\n\t\t\t\t\tThe death benefit to your beneficiaries is generally income-tax-free. It can help cover funeral costs, pay medical bills or a mortgage, and even replace lost income.\r\n\t\t\t\t",
    "glyph": "secure"
  },
  {
    "heading": "Tax deferral",
    "body": "\r\n\t\t\t\t\tYour policy’s accumulation value grows tax-deferred – that leaves more money in your policy to take advantage of future compounding.\r\n\t\t\t\t",
    "glyph": "savings"
  },
  {
    "heading": "Opportunity to earn interest",
    "body": "\r\n\t\t\t\t\tYour policy can earn interest based on positive growth of an <a href=\"/what-we-offer/Index-options\">external index</a>, or by receiving fixed interest – and you're protected from loss if the market drops (although certain fees and expenses will reduce policy values).\r\n\t\t\t\t",
    "glyph": "line-graph"
  },
  {
    "heading": "Flexibility",
    "body": "\r\n\t\t\t\t\tAs long as your policy is properly funded, you can pay premiums when you want and access your available cash value to spend however you’d like, using policy loans and withdrawals.<sup>¹</sup>\r\n\t\t\t\t",
    "glyph": "shapes"
  }
];
const RESOURCE_GROUPS = [
  [
    {
      "heading": "Additional college funding",
      "body": "\r\n\r\n\r\n<p>With college costs continuing to rise, it's never too early for parents or grandparents to consider opportunities for possible funding. See how IUL can be part of the solution.</p>\t\t\t",
      "href": "/what-we-offer/Life-Insurance/College-Funding",
      "src": "/-/media/Feature/Card/Allianz-Life/card-azl-college-funding.jpg",
      "alt": "card-azl-college-funding"
    },
    {
      "heading": "Supplementing retirement funds",
      "body": "\r\n\r\n\r\n<p>Inflation can chip away at the buying power of your retirement income. Learn how the accumulation potential of IUL can be a source for supplemental money in retirement.</p>\t\t\t",
      "href": "/what-we-offer/Life-Insurance/Retirement-planning",
      "src": "/-/media/Feature/Card/Allianz-Life/card-azl-retirement-funds.jpg",
      "alt": "card-azl-retirement-funds"
    },
    {
      "heading": "Owning a business",
      "body": "\r\n\r\n\r\n<p>See how IUL can help address business concerns such as attracting and retaining key employees, buy-sell agreements, and succession planning (particularly for family businesses).</p>\t\t\t",
      "href": "https://www.allianzlife.com/what-we-offer/Life-Insurance/strategies-for-business-owners",
      "src": "/-/media/Feature/Card/Allianz-Life/card-azl-business-owner.jpg",
      "alt": "card-azl-business-owner"
    },
    {
      "heading": "Estate planning strategies",
      "body": "\r\n\r\n\r\n<p>Discover how IUL can help create a legacy through the death benefit, reduce taxes, protect assets from creditors, avoid family strife, and even help keep a business in the family.</p>\t\t\t",
      "href": "/what-we-offer/Life-Insurance/Flexible-estate-planning-strategies",
      "src": "/-/media/Feature/Card/Allianz-Life/card-azl-estate-planning.jpg",
      "alt": "card-azl-estate-planning"
    }
  ],
  [
    {
      "heading": "Frequently Asked Questions/FAQ",
      "body": "\r\n\r\n\r\n<p>Get answers about how indexed universal life insurance works, why you may need coverage, and the application process.</p>\t\t\t",
      "href": "/what-we-offer/Life-Insurance/Indexed-Universal-Life/Allianz-Life-Accumulator/frequently-asked-questions",
      "src": "/-/media/Feature/Card/Allianz-Life/card-azl-about-fiul-faq.jpg",
      "alt": "card-azl-about-fiul-faq"
    },
    {
      "heading": "Allianz Life Accumulator™ Indexed Universal Life Insurance Policy",
      "body": "\r\n\r\n\r\n<p>See what sets our indexed universal life insurance apart from competitive policies – and how you can customize it to your needs.</p>\t\t\t",
      "href": "/what-we-offer/Life-Insurance/Indexed-Universal-Life/Allianz-Life-Accumulator",
      "src": "/-/media/Feature/Card/Allianz-Life/card-azl-about-fiul-lpplus.jpg",
      "alt": "card-azl-about-fiul-lpplus"
    }
  ]
];

const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
const attrs = (html, tag, name) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, 'g'))].map(match => decode(match[1]));
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(decode(match[1])));
const field = (owner, name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: `${owner}-${name}`, fieldType: type, fixtureOnly: true } } });
const deepFreeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};
const childField = (data, index, name) => data.children.results[index].fieldCollection.find(field => field.name === name).jsonValue;
function fixture(source, images = false) {
  const root = 'test-only-life-overview-root';
  return { id: root, heading: field(root, 'heading', 'UNUSED-ROOT-HEADING'),
    body: field(root, 'body', '<p>UNUSED-ROOT-BODY</p>', 'Rich Text'),
    subheading: field(root, 'subheading', 'UNUSED-ROOT-SUBHEADING', 'Rich Text'),
    primaryLink: field(root, 'primaryLink', { href: '/unused-root-link', text: 'UNUSED-ROOT-LINK' }, 'General Link'),
    image: field(root, 'image', { src: '/unused-root-image.svg' }, 'Image'),
    children: { results: source.map((card, index) => {
      const owner = `test-only-life-overview-card-${index}`;
      return { id: owner, fieldCollection: [
        { name: 'Heading', ...field(owner, 'heading', card.heading) },
        { name: 'Body', ...field(owner, 'body', card.body, 'Rich Text') },
        { name: 'Image', ...field(owner, 'image', images ? { src: card.src, alt: card.alt, width: '1200', height: '800' } : { src: '/unused-card-image.svg' }, 'Image') },
        { name: 'Link', ...field(owner, 'link', images ? { href: card.href, text: 'Unused whole-card scalar text', linktype: card.href.startsWith('https:') ? 'external' : 'internal', target: '' } : { href: '/unused-card-link', text: 'UNUSED-CARD-LINK' }, 'General Link') },
        { name: 'Subheading', ...field(owner, 'subheading', 'UNUSED-CARD-SUBHEADING', 'Rich Text') },
        { name: 'Icon', ...field(owner, 'icon', { src: '/unused-card-icon.svg' }, 'Image') },
        { name: 'Alphanumeral', ...field(owner, 'alphanumeral', 'UNUSED-CARD-NUMERAL') },
        { name: 'HeadingLevel', ...field(owner, 'headingLevel', 'h2') },
        { name: 'Theme', ...field(owner, 'theme', 'UNUSED-CARD-THEME') },
      ] };
    }) } };
}
function named(data) {
  const clone = structuredClone(data);
  clone.children.results = clone.children.results.map(card => ({ id: card.id,
    ...Object.fromEntries(card.fieldCollection.map(entry => [entry.name[0].toLowerCase() + entry.name.slice(1), { jsonValue: entry.jsonValue }])) }));
  return clone;
}
function unusedGetters(data, active, serialized) {
  const fail = name => () => { throw new Error('Unused native field read: ' + name); };
  for (const name of ['heading', 'body', 'subheading', 'primaryLink', 'image', 'icon', 'links'])
    Object.defineProperty(data, name, { enumerable: true, get: fail('root.' + name) });
  for (const card of data.children.results) {
    if (serialized) {
      for (const entry of card.fieldCollection.filter(entry => !active.includes(entry.name.toLowerCase())))
        Object.defineProperty(entry, 'jsonValue', { enumerable: true, get: fail('child.' + entry.name) });
    } else {
      for (const name of ['subheading', 'icon', 'iconTheme', 'alphanumeral', 'headingLevel', 'theme', 'links', ...(!active.includes('image') ? ['image', 'link'] : [])])
        Object.defineProperty(card, name, { enumerable: true, get: fail('child.' + name) });
    }
  }
  return data;
}
function instrumented() {
  const React = require('react'), sdk = require('@sitecore-content-sdk/nextjs'), ts = require('typescript'), observed = [];
  const compiled = new Module(filename); compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = specifier => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, ...Object.fromEntries(['Text', 'RichText', 'Image', 'Link'].map(name => [name, props => {
      observed.push({ name, field: props.field }); return React.createElement(sdk[name], props);
    }])) };
    const base = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (base) {
      const local = [base, base + '.ts', base + '.tsx'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (local) return loadSource(local);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return { components: compiled.exports, observed };
}

test('Benefits retains source column-first pairs, H4 headings, complete copy, index link and footnote', () => {
  const data = deepFreeze(fixture(BENEFITS));
  for (const editing of [false, true]) {
    const html = render(Cards.LifeBenefitsGrid, data, editing, { RenderingIdentifier: 'native-benefit-rendering', columns: '4', theme: 'blue-soft', headingLevel: 'h2' });
    assert.ok(html.includes('id="native-benefit-rendering"'));
    assert.ok(html.includes('l-grid__row match-height-row u-margin-bottom-xl'));
    assert.equal((html.match(/class="l-grid__column-medium-6"/g) || []).length, 2);
    assert.equal((html.match(/m-axlTile match-height -is--flipped -is--stacked t-bg-transparent/g) || []).length, 4);
    assert.equal((html.match(/<h4\b/g) || []).length, 4);
    const columns = [...html.matchAll(/class="l-grid__column-medium-6"/g)].map(match => match.index);
    const heads = BENEFITS.map(card => html.indexOf(card.heading, columns[0]));
    assert.ok(columns[0] < heads[0] && heads[0] < heads[1] && heads[1] < columns[1] && columns[1] < heads[2] && heads[2] < heads[3]);
    for (const card of BENEFITS) assert.ok(html.includes(card.body));
    assert.deepEqual(attrs(html, 'a', 'href'), ['/what-we-offer/Index-options']);
    assert.match(html, /<sup>¹<\/sup>/);
    assert.doesNotMatch(html, /UNUSED-|unused-card|unused-root|<h2\b|<footer\b/);
  }
});
test('Benefits fixed glyphs are decorative and retain exact recovered source bytes', () => {
  const expected = {
    secure: 'bfd66e85ade7cdae7b5a02ebe48b280f713af5920c1a0f464eadfb2dfa5023f0',
    savings: 'f8d23e25b3ef3306232cb15128b5f9649f6150f52747a7b8f4c02947dc46f0d6',
    'line-graph': '3a9430ed139acf2154b00215d85da225560a4e4577b012ddbee8ab059bb6916e',
    shapes: '4a4b11b352cf1b3cea4764100ab6d83a2252615ba20d8e6bd428f7d0b3809d8b',
  };
  const html = render(Cards.LifeBenefitsGrid, fixture(BENEFITS));
  assert.deepEqual(attrs(html, 'img', 'src'), BENEFITS.map(card => '/allianz-ui/life-overview/' + card.glyph + '.svg'));
  assert.deepEqual(attrs(html, 'img', 'alt'), ['', '', '', '']);
  assert.deepEqual(attrs(html, 'img', 'aria-hidden'), ['true', 'true', 'true', 'true']);
  for (const [name, digest] of Object.entries(expected))
    assert.equal(createHash('sha256').update(fs.readFileSync(path.resolve(sourceRoot, '../public/allianz-ui/life-overview', name + '.svg'))).digest('hex'), digest);
});
test('Benefits only its eight active fields each receive one SDK marker', () => {
  const data = deepFreeze(fixture(BENEFITS)), expected = data.children.results.flatMap(card => card.fieldCollection.slice(0, 2).map(entry => entry.jsonValue));
  const author = markers(render(Cards.LifeBenefitsGrid, data, true)); assert.equal(author.length, 8);
  for (const value of expected) assert.equal(author.filter(marker => marker.itemId === value.metadata.itemId && marker.fieldId === value.metadata.fieldId).length, 1);
  assert.equal(markers(render(Cards.LifeBenefitsGrid, data)).length, 0);
});
test('Benefits author props preserve exact original field identity and metadata', () => {
  const { components, observed } = instrumented(), data = deepFreeze(fixture(BENEFITS)), before = JSON.stringify(data);
  render(components.LifeBenefitsGrid, data, true);
  assert.equal(observed.length, 8);
  for (let index = 0; index < 4; index++) for (const name of ['Heading', 'Body'])
    assert.equal(observed.filter(item => item.field === childField(data, index, name)).length, 1);
  assert.equal(JSON.stringify(data), before);
});
test('Benefits ignores filled unused named and serialized fields without reading getters', () => {
  for (const serialized of [false, true]) for (const editing of [false, true]) {
    const data = unusedGetters(serialized ? fixture(BENEFITS) : named(fixture(BENEFITS)), ['heading', 'body'], serialized);
    assert.doesNotThrow(() => render(Cards.LifeBenefitsGrid, data, editing));
  }
});
test('Benefits both native serializer and named wrappers retain the same output', () => {
  const data = fixture(BENEFITS);
  for (const editing of [false, true]) assert.equal(render(Cards.LifeBenefitsGrid, data, editing), render(Cards.LifeBenefitsGrid, named(data), editing));
});
test('Benefits glyph mapping stays positional when authors change titles and reorder children', () => {
  const data = fixture(BENEFITS); data.children.results.reverse(); childField(data, 0, 'Heading').value = 'An authored benefit title';
  const html = render(Cards.LifeBenefitsGrid, data);
  assert.ok(html.indexOf('An authored benefit title') < html.indexOf('Opportunity to earn interest'));
  assert.deepEqual(attrs(html, 'img', 'src'), BENEFITS.map(card => '/allianz-ui/life-overview/' + card.glyph + '.svg'));
  assert.doesNotMatch(html, /<h2\b/);
});
test('Benefits cleared active fields stay absent from the canvas while absent fields create no synthetic controls', () => {
  const data = fixture(BENEFITS); childField(data, 0, 'Heading').value = ''; childField(data, 0, 'Body').value = '';
  assert.equal((render(Cards.LifeBenefitsGrid, data).match(/<h4\b/g) || []).length, 3);
  assert.equal(markers(render(Cards.LifeBenefitsGrid, data, true)).length, 6);
  data.children.results[0].fieldCollection = [];
  assert.equal(markers(render(Cards.LifeBenefitsGrid, data, true)).length, 6);
});
test('Benefits rejects missing or non-four-child data without partial fixed-icon output', () => {
  for (const data of [undefined, {}, fixture([]), fixture(BENEFITS.slice(0, 3)), fixture([...BENEFITS, BENEFITS[0]])])
    for (const editing of [false, true]) {
      const html = render(Cards.LifeBenefitsGrid, data, editing);
      assert.ok(html.includes('AllianzCardGrid')); assert.doesNotMatch(html, /allianz-life-benefit-glyph/);
    }
});
test('Benefits scoped glyph CSS retains recovered source breakpoint, geometry and grey ink', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzLifeBenefitsGrid.css'), 'utf8');
  const parsed = require('postcss').parse(css); parsed.walkRules(rule => assert.ok(rule.selector.startsWith('.allianz-life-benefits-grid ')));
  const widths = []; parsed.walkDecls('width', declaration => widths.push(declaration.value)); assert.deepEqual(widths, ['26px', '40px']);
  assert.match(css, /min-width: 704px/); assert.match(css, /height: auto/); assert.match(css, /brightness\(0\) invert\(23\.5294%\)/);
  assert.doesNotMatch(css, /\.l-grid|\.m-card|display:|color:/);
});

test('Benefits narrow source flex pairs can shrink and wrap full native words without clipping content or changing layout', () => {
  const css = require('postcss').parse(fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzLifeBenefitsGrid.css'), 'utf8'));
  const declarations = selector => {
    const values = {};
    css.walkRules(rule => {
      if (rule.selector.split(',').map(value => value.trim()).includes(selector))
        rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
    });
    return values;
  };
  // The outer flex item must relinquish its automatic min-content clamp;
  // each nested source content box must continue to fit its allocated width.
  for (const name of ['m-axlTile', 'tileContent', 'tileSubGrid__content'])
    assert.equal(declarations(`.allianz-life-benefits-grid .${name}`)['min-width'], '0');
  for (const name of ['tileHeading', 'tileBody'])
    assert.equal(declarations(`.allianz-life-benefits-grid .${name}`)['overflow-wrap'], 'anywhere');
  css.walkRules(rule => {
    for (const selector of rule.selector.split(',')) assert.ok(selector.trim().startsWith('.allianz-life-benefits-grid '));
    rule.walkDecls(declaration => assert.ok(!/^(overflow|overflow-x|white-space|text-overflow|word-break|flex|flex-basis|flex-direction|flex-wrap|display)$/.test(declaration.prop), declaration.toString()));
  });
  const longWord = 'AnUnbrokenNativeAuthoredBenefitWord'.repeat(4);
  const data = fixture(BENEFITS);
  childField(data, 2, 'Heading').value = longWord;
  childField(data, 2, 'Body').value = `<p>${longWord}<a href="/what-we-offer/Index-options">external index</a><sup>¹</sup></p>`;
  deepFreeze(data);
  for (const editing of [false, true]) {
    const html = render(Cards.LifeBenefitsGrid, data, editing);
    assert.equal((html.match(new RegExp(longWord, 'g')) || []).length, 2);
    assert.equal((html.match(/class="l-grid__column-medium-6"/g) || []).length, 2);
    assert.equal((html.match(/m-axlTile match-height -is--flipped -is--stacked t-bg-transparent/g) || []).length, 4);
    assert.deepEqual(attrs(html, 'a', 'href'), ['/what-we-offer/Index-options']);
    assert.match(html, /<sup>¹<\/sup>/);
    assert.equal(markers(html).length, editing ? 8 : 0);
  }
});

for (const [name, source, theme, columns, margin] of [
  ['LifeNeedsCards', RESOURCE_GROUPS[0], 't-bg-transparent', 4, ' u-margin-bottom-xl'],
  ['LifeMoreCards', RESOURCE_GROUPS[1], 't-bg-green-soft', 2, ''],
]) {
  test(`${name} matches its source cards, whole native links, H4, image alt and source-only row spacing`, () => {
    const data = deepFreeze(fixture(source, true));
    for (const editing of [false, true]) {
      const html = render(Cards[name], data, editing, { RenderingIdentifier: 'native-image-card-group', columns: '1', theme: 'blue-soft', headingLevel: 'h2', paddingTop: 'xl', paddingBottom: 'xl' });
      assert.ok(html.includes(`l-container--full-width ${theme} allianz-life-overview-cards`));
      assert.ok(html.includes('id="native-image-card-group"'));
      assert.ok(html.includes(`class="l-grid__row${margin}"`)); assert.ok(html.includes(`o-cards o-cards__col${columns}`));
      assert.equal((html.match(/class="m-card"/g) || []).length, source.length);
      assert.equal((html.match(/<h4\b/g) || []).length, source.length);
      assert.deepEqual(attrs(html, 'a', 'href'), source.map(card => card.href));
      assert.deepEqual(attrs(html, 'img', 'src'), source.map(card => card.src));
      assert.deepEqual(attrs(html, 'img', 'alt'), source.map(card => card.alt));
      assert.equal(attrs(html, 'a', 'aria-label').length, 0);
      for (const card of source) { assert.ok(html.includes(card.body)); assert.ok(html.includes(card.heading)); }
      const anchors = [...html.matchAll(/<a\b[^>]*class="m-card"[^>]*>([\s\S]*?)<\/a>/g)].map(match => match[1]);
      assert.equal(anchors.length, source.length);
      assert.ok(anchors.every(anchor => /<img\b/.test(anchor) && /<h4\b/.test(anchor) && /m-card__body/.test(anchor)));
      assert.doesNotMatch(html, /UNUSED-|unused-|Unused whole-card scalar text|<h2\b|<footer\b|u-padding-|m-card__footer|<video\b/);
    }
  });
  test(`${name} only four active child fields receive one author marker and keep field identity`, () => {
    const { components, observed } = instrumented(), data = deepFreeze(fixture(source, true)), before = JSON.stringify(data);
    const html = render(components[name], data, true), actual = markers(html);
    assert.equal(actual.length, source.length * 4); assert.equal(observed.length, source.length * 4);
    for (let index = 0; index < source.length; index++) for (const fieldName of ['Heading', 'Body', 'Image', 'Link']) {
      const value = childField(data, index, fieldName);
      assert.equal(actual.filter(marker => marker.itemId === value.metadata.itemId && marker.fieldId === value.metadata.fieldId).length, 1);
      assert.equal(observed.filter(item => item.field === value).length, 1);
    }
    assert.equal(JSON.stringify(data), before); assert.equal(markers(render(Cards[name], data)).length, 0);
  });
  test(`${name} root fields and optional child fields stay unread in both serializer forms and modes`, () => {
    for (const serialized of [false, true]) for (const editing of [false, true]) {
      const data = unusedGetters(serialized ? fixture(source, true) : named(fixture(source, true)), ['heading', 'body', 'image', 'link'], serialized);
      assert.doesNotThrow(() => render(Cards[name], data, editing));
    }
  });
  test(`${name} named fields and serializer output remain identical and stable across repeat renders`, () => {
    const data = fixture(source, true);
    for (const editing of [false, true]) {
      const html = render(Cards[name], data, editing);
      assert.equal(render(Cards[name], named(data), editing), html); assert.equal(render(Cards[name], data, editing), html);
    }
  });
  test(`${name} cleared native links/images/text remain available in content fields without synthetic visitor links`, () => {
    const data = fixture(source, true);
    childField(data, 0, 'Link').value = { href: '', text: '' }; childField(data, 0, 'Image').value = {};
    childField(data, 0, 'Heading').value = ''; childField(data, 0, 'Body').value = '';
    const before = JSON.stringify(data), html = render(Cards[name], data);
    assert.equal(attrs(html, 'a', 'href').length, source.length - 1); assert.equal(attrs(html, 'img', 'src').length, source.length - 1);
    assert.equal((html.match(/class="m-card"/g) || []).length, source.length);
    assert.equal(markers(render(Cards[name], data, true)).length, (source.length - 1) * 4); assert.equal(JSON.stringify(data), before);
  });
  test(`${name} does not infer missing active fields or accept the wrong child cardinality`, () => {
    const data = fixture(source, true); data.children.results[0].fieldCollection = [];
    assert.equal(markers(render(Cards[name], data, true)).length, (source.length - 1) * 4);
    for (const invalid of [undefined, {}, fixture(source.slice(0, -1), true), fixture([...source, source[0]], true)]) {
      const html = render(Cards[name], invalid, true);
      assert.ok(html.includes('AllianzCardGrid')); assert.doesNotMatch(html, /allianz-life-overview-cards/);
    }
  });
}
test('whole-card native target/query/anchor/ARIA and approved business URL survive the existing safe-link policy', () => {
  const data = fixture(RESOURCE_GROUPS[0], true), link = childField(data, 0, 'Link');
  Object.assign(link.value, { target: '_blank', querystring: 'source=native', anchor: 'financial-needs', 'aria-label': 'An explicit native label' });
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Cards.LifeNeedsCards, data, editing);
    assert.ok(attrs(html, 'a', 'href').includes(RESOURCE_GROUPS[0][0].href + '?source=native#financial-needs'));
    assert.ok(attrs(html, 'a', 'href').includes('https://www.allianzlife.com/what-we-offer/Life-Insurance/strategies-for-business-owners'));
    assert.ok(attrs(html, 'a', 'aria-label').includes('An explicit native label')); assert.ok(attrs(html, 'a', 'target').includes('_blank'));
  }
  assert.equal(JSON.stringify(data), before);
});
