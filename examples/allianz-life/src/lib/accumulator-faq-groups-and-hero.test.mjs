import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, field, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const ts = require('typescript');
const filename = path.join(sourceRoot, 'components/allianz-accordion/AllianzAccordion.tsx');
const Accordion = loadSource(filename);
const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
// Fresh public FAQ source, 2026-10-11: d4cab4f65d0c6231d3a41be8b4f4d8ab346f714c4640752f45be5796a4e53332.
// These presentation and question facts are independent of native IDs and runtime code.
const groups = [
  {
    "anchor": "GeneralLifeInsuranceQuestions",
    "heading": "General life insurance questions",
    "questions": [
      "How do I know if I need life insurance?",
      "Do I need life insurance if I don’t have dependents or a partner?",
      "What if I already have a policy through work?",
      "How much life insurance do I need?"
    ]
  },
  {
    "anchor": "about-indexed-universal-life",
    "heading": "Indexed universal life insurance questions",
    "questions": [
      "What is indexed universal life (IUL) insurance?",
      "How does an IUL insurance policy build accumulation potential?",
      "What is indexed interest?",
      "What does a crediting method include?",
      "What is fixed interest?",
      "What allocation options should I consider?",
      "What are my options for accessing the cash value of my policy?"
    ]
  },
  {
    "anchor": "applying-for-life-insurance",
    "heading": "Applying for life insurance",
    "questions": [
      "What is underwriting?",
      "How do I purchase an indexed universal life insurance policy from Allianz?"
    ]
  }
];
const baseline = {
  "data": {
    "heading": {
      "jsonValue": {
        "value": "Native title",
        "metadata": {
          "fieldId": "test-heading-field",
          "fieldType": "Rich Text",
          "itemId": "test-biography-item"
        }
      }
    },
    "body": {
      "jsonValue": {
        "value": "Native subtitle",
        "metadata": {
          "fieldId": "test-body-field",
          "fieldType": "Rich Text",
          "itemId": "test-biography-item"
        }
      }
    },
    "primaryLink": {
      "jsonValue": {
        "value": {
          "href": "#native",
          "text": "Native link"
        },
        "metadata": {
          "fieldId": "test-link-field",
          "fieldType": "General Link",
          "itemId": "test-biography-item"
        }
      }
    },
    "desktopImage": {
      "jsonValue": {
        "value": {
          "src": "/desktop.jpg",
          "alt": "Authored"
        },
        "metadata": {
          "fieldId": "test-desktop-field",
          "fieldType": "Image",
          "itemId": "test-biography-item"
        }
      }
    },
    "mobileImage": {
      "jsonValue": {
        "value": {
          "src": "/mobile.jpg",
          "alt": "Mobile"
        },
        "metadata": {
          "fieldId": "test-mobile-field",
          "fieldType": "Image",
          "itemId": "test-biography-item"
        }
      }
    },
    "children": {
      "results": [
        {
          "id": "shared",
          "heading": {
            "jsonValue": {
              "value": "Native question"
            }
          },
          "body": {
            "jsonValue": {
              "value": "<p>Native answer</p>"
            }
          }
        }
      ]
    }
  },
  "params": {
    "RenderingIdentifier": "regression",
    "theme": "green-soft",
    "heroTheme": "life",
    "container": "row",
    "sourceWidth": "full",
    "marginBottom": "xl"
  },
  "hashes": {
    "Accordion.Default": [
      "8b6b2a8f01c9725cadf295b15ec063a3e4e51d5d5ab59ed6b230dba2d70a3b95",
      "1931af276583881ec51e614997b114b4d5f90ddd7b767e16e88ad15161d1c5a4"
    ],
    "Accordion.FaqRow": [
      "594b1b76872abf7d36e3fae8414efb9b7168105913b25abf4ff503e0fb43fef8",
      "239adda5bbfdb5d084e042772b17ba25d8ac8c8e886b93f08cf904af6900c217"
    ],
    "Accordion.Transcript": [
      "ce31c843dd723e72d308f3b29e3c2b1f574e55b6a3c218ea53b34719e1a9d7fe",
      "abd709709a7d50ed972a7cd7125950c27cb6dcd1c9e23bb61a3d2fad960aa2dd"
    ],
    "Hero.Default": [
      "67ff9a85fad2589d5b6185cdf53b4bf2e75997354622b6c8b8f59a40b2b91741",
      "c9ded48ff3d354771e402ed5e4c26077b7b58d121fe5cf37d6e081530367fc7e"
    ],
    "Hero.FixedFaq": [
      "24db59e9411cdf862f6e0665f05466e8ee5ac7830ed97f38bb98357624f439d3",
      "1279559724b0ac522245bbe4663f43a46a4fbd7360af367341ddb328a919f71a"
    ],
    "Hero.Editorial": [
      "819fa9011ebf8abb07e2ea8f616c888c0d0a00bef0f876233327235d5a70cc3a",
      "8813d38a7aa9798ae8be3bbb94d11dcc795ed9471c9f49ae156101b5569f7b39"
    ],
    "Hero.LifeStrategy": [
      "f7d035a3e770261132244bf1485dbc8f1d86f46d92d19badacd4717b58b7aeff",
      "309a2637204d2eb6f360985e8a18c606123f33b2a52dc05215b129a2523ecc5c"
    ],
    "Hero.TitleOnly": [
      "7b4a0b55aaed76967ce459feaae07e497ebc377a4c435780fde981009568d45a",
      "b81671acf211de79e299b4f905794abc8286c1fbfc489e74167d649caec7f7f7"
    ]
  }
};
const native = (name, value, itemId, fieldType = 'Single-Line Text') => ({ jsonValue: {
  value, metadata: { fieldId: `native-${name}`, itemId, fieldType },
} });
const model = (group, duplicateIds = false) => ({
  heading: native('heading', group.heading, `root-${group.anchor}`),
  body: native('body', '<p>Unused root body</p>', `root-${group.anchor}`, 'Rich Text'),
  primaryLink: native('primaryLink', { href: '#unused', text: 'Unused link' }, `root-${group.anchor}`, 'General Link'),
  children: { results: group.questions.map((question, index) => ({
    id: duplicateIds ? 'repeated-native-id' : `${group.anchor}-${index}`,
    heading: native('heading', question, `${group.anchor}-${index}`),
    body: native('body', `<p>Authored answer ${index + 1}</p>`, `${group.anchor}-${index}`, 'Rich Text'),
  })) },
});
const params = (group) => ({ RenderingIdentifier: group.anchor,
  theme: 'injected', paddingTop: 'xl', marginBottom: 'sm', spacing: 'xl' });
const markers = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

test('LifeFaqGroup preserves the three source headings, 4/7/2 native entries, widths and finite spacing', () => {
  assert.deepEqual(groups.map((group) => group.questions.length), [4, 7, 2]);
  for (const [index, group] of groups.entries()) {
    const data = model(group), before = JSON.stringify(data);
    const html = render(Accordion.LifeFaqGroup, data, false, params(group));
    assert.match(html, new RegExp(`^<div class="${index === 0 ? 'l-container--full-width' : 'l-container'} t-bg-transparent axlTileCollection" id="${group.anchor}">`));
    assert.ok(html.includes(`<a name="${group.anchor}"></a>`));
    assert.equal((html.match(/l-grid--no-gutters-outer/g) ?? []).length, index === 0 ? 0 : 1);
    assert.equal((html.match(/u-margin-bottom-xl/g) ?? []).length, index === 2 ? 1 : 0);
    assert.ok(html.includes('class="l-grid__row u-margin-bottom-lg u-padding-top-lg"'));
    assert.ok(html.includes('class="tileContent u-text-left"'));
    assert.ok(html.includes(`<h2>${group.heading}</h2>`));
    assert.ok(html.includes('class="tileSubHeading"></div>'));
    assert.ok(html.includes('class="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md"'));
    assert.ok(html.includes('class="c-accordion js-accordion c-accordion--light"'));
    assert.equal((html.match(/<button /g) ?? []).length, group.questions.length);
    assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, group.questions.length);
    assert.equal((html.match(/hidden=""/g) ?? []).length, group.questions.length);
    for (const [entryIndex, entry] of data.children.results.entries()) {
      assert.ok(html.includes(entry.heading.jsonValue.value));
      assert.ok(html.includes(`<p>Authored answer ${entryIndex + 1}</p>`));
    }
    assert.doesNotMatch(html, /Unused root body|Unused link|injected|u-margin-bottom-sm/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('LifeFaqGroup owns each root heading and native child heading/body once in real SDK editing', () => {
  let count = 0;
  for (const group of groups) {
    const data = model(group), before = JSON.stringify(data);
    const html = render(Accordion.LifeFaqGroup, data, true, params(group));
    const fields = markers(html);
    count += fields.length;
    assert.deepEqual(fields.filter((marker) => marker.itemId === `root-${group.anchor}`).map((marker) => marker.fieldId), ['native-heading']);
    for (const child of data.children.results) {
      assert.deepEqual(fields.filter((marker) => marker.itemId === child.id).map((marker) => marker.fieldId).sort(), ['native-body', 'native-heading']);
    }
    assert.equal((html.match(/aria-expanded="true"/g) ?? []).length, group.questions.length);
    assert.doesNotMatch(html, /hidden=""|native-primaryLink|Unused root body|Unused link/);
    assert.equal(JSON.stringify(data), before);
  }
  assert.equal(count, 29);
});

test('LifeFaqGroup keeps cleared native fields editable and rejects undeclared anchor presentation', () => {
  const group = groups[0], data = model(group);
  data.heading.jsonValue.value = '';
  data.children.results[0].body.jsonValue.value = '';
  const before = JSON.stringify(data);
  assert.doesNotMatch(render(Accordion.LifeFaqGroup, data, false, params(group)), /<h2/);
  const editing = render(Accordion.LifeFaqGroup, data, true, params(group));
  assert.equal(markers(editing).filter((marker) => marker.itemId === `root-${group.anchor}`).length, 1);
  assert.equal(markers(editing).filter((marker) => marker.itemId === data.children.results[0].id && marker.fieldId === 'native-body').length, 1);
  for (const anchor of [undefined, '', 'generallifeinsurancequestions', 'unknown', 'about-indexed-universal-life injected']) {
    assert.equal(render(Accordion.LifeFaqGroup, data, false, { RenderingIdentifier: anchor }), '');
    assert.match(render(Accordion.LifeFaqGroup, data, true, { RenderingIdentifier: anchor }), /role="status"/);
  }
  assert.match(render(Accordion.LifeFaqGroup, undefined, false, params(group)), /AllianzAccordion/);
  assert.equal(JSON.stringify(data), before);
});

test('all 13 disclosures have unique independent IDs even when native entry IDs repeat across groups', () => {
  const all = () => React.createElement(React.Fragment, null, ...groups.map((group) =>
    React.createElement(Accordion.LifeFaqGroup, { key: group.anchor, params: params(group), fields: { data: { datasource: model(group, true) } } })));
  const html = render(all, {});
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 29);
  assert.equal(new Set(ids).size, 29);
  const buttons = [...html.matchAll(/<button id="([^"]+)"[^>]*aria-controls="([^"]+)"/g)];
  assert.equal(buttons.length, 13);
  for (const [, trigger, panel] of buttons) {
    assert.ok(html.includes(`id="${panel}" role="region" aria-labelledby="${trigger}"`));
  }
  assert.doesNotMatch(html, /role="heading"|id="accordion4"|titleIconCaretDown/);
});

test('native disclosure handlers toggle entries and instances independently through repeated updates', () => {
  let instance = 'one', editing = false;
  const states = new Map();
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(sourceRoot));
  compiled.require = (specifier) => {
    if (specifier === 'react') return { ...React, useId: () => `instance-${instance}`, useState: () => {
      const key = instance;
      return [states.get(key) ?? [], (update) => states.set(key, update(states.get(key) ?? []))];
    } };
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, useSitecore: () => ({ page: { mode: { isEditing: editing } } }) };
    if (specifier.endsWith('.css')) return {};
    const local = /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) return loadSource([`${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate)));
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  const nodes = (element, predicate) => {
    if (!element || typeof element !== 'object') return [];
    if (Array.isArray(element)) return element.flatMap((child) => nodes(child, predicate));
    return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
  };
  const draw = () => compiled.exports.LifeFaqGroup({ params: params(groups[0]), fields: { data: { datasource: model(groups[0], true) } } });
  const buttons = () => nodes(draw(), (element) => element.type === 'button');
  const expanded = () => buttons().map((button) => button.props['aria-expanded']);
  assert.deepEqual(expanded(), [false, false, false, false]);
  buttons()[0].props.onClick();
  assert.deepEqual(expanded(), [true, false, false, false]);
  buttons()[1].props.onClick();
  assert.deepEqual(expanded(), [true, true, false, false]);
  buttons()[0].props.onClick();
  assert.deepEqual(expanded(), [false, true, false, false]);
  instance = 'two';
  assert.deepEqual(expanded(), [false, false, false, false]);
  buttons()[3].props.onClick();
  assert.deepEqual(expanded(), [false, false, false, true]);
  instance = 'one';
  assert.deepEqual(expanded(), [false, true, false, false]);
  const tree = draw(), trigger = buttons()[1];
  assert.ok(nodes(tree, (element) => element.props?.id === trigger.props['aria-controls'])[0].props.hidden === false);
  editing = true;
  assert.deepEqual(expanded(), [true, true, true, true]);
});

const heroData = () => ({
  heading: native('heading', 'Frequently Asked Questions (FAQ)', 'hero', 'Rich Text'),
  body: native('body', '<p>Unused subtitle</p>', 'hero', 'Rich Text'),
  primaryLink: native('primaryLink', { href: '#unused', text: 'Unused primary link' }, 'hero', 'General Link'),
  secondaryLink: native('secondaryLink', { href: '#unused', text: 'Unused secondary link' }, 'hero', 'General Link'),
  desktopImage: native('desktopImage', { src: '/desktop.jpg', alt: 'Unused desktop' }, 'hero', 'Image'),
  mobileImage: native('mobileImage', { src: '/mobile.jpg', alt: 'Unused mobile' }, 'hero', 'Image'),
});

test('LifeFaqTitle preserves source life title and empty picture while optional fields have no visitor/editor surface', () => {
  const data = heroData(), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Hero.LifeFaqTitle, data, editing, { RenderingIdentifier: 'life-faq-title', theme: 'injected', heroTheme: 'fixed' });
    assert.match(html, /^<div class="l-container-full-width t-bg-product-life c-hero__theme--life allianz-editorial-hero" id="life-faq-title">/);
    assert.ok(html.includes('<picture class="c-image c-stage__image--cover c-stage__image--short"></picture>'));
    assert.match(html, /<h1 class="c-heading c-hero__headline u-text-center">/);
    assert.ok(html.includes('Frequently Asked Questions (FAQ)'));
    assert.doesNotMatch(html, /Unused|<img\b|<source\b|<a\b|c-hero__subHeadline|Mobile image|injected/);
    assert.deepEqual(markers(html).map((marker) => marker.fieldId), editing ? ['native-heading'] : []);
  }
  assert.equal(JSON.stringify(data), before);
});

test('LifeFaqTitle supports block RTE titles and cleared authoring without invented content', () => {
  const data = heroData();
  data.heading.jsonValue.value = '<p>Authored FAQ title</p>';
  const block = render(Hero.LifeFaqTitle, data);
  assert.match(block, /role="heading" aria-level="1"/);
  assert.doesNotMatch(block, /<h1[^>]*><p/);
  data.heading.jsonValue.value = '';
  assert.doesNotMatch(render(Hero.LifeFaqTitle, data), /c-hero__headline/);
  assert.deepEqual(markers(render(Hero.LifeFaqTitle, data, true)).map((marker) => marker.fieldId), ['native-heading']);
  assert.match(render(Hero.LifeFaqTitle, undefined), /AllianzHero/);
});

test('all existing Accordion and Hero variants retain exact installed-SDK visitor and editor output', () => {
  for (const [key, hashes] of Object.entries(baseline.hashes)) {
    const [family, variant] = key.split('.');
    for (const [index, editing] of [false, true].entries()) {
      const html = render(({ Accordion, Hero })[family][variant], baseline.data, editing, baseline.params);
      assert.equal(createHash('sha256').update(html).digest('hex'), hashes[index], `${key} editing=${editing}`);
    }
  }
});
