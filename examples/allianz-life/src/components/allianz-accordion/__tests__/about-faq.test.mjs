import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const ts = require('typescript');
const filename = path.join(sourceRoot, 'components/allianz-accordion/AllianzAccordion.tsx');
const Accordion = loadSource(filename);
// Captured About Us native FAQ public copy, 2026-10-11. Source HTML:
// ff97d1623247439379ffcacc1a2098416299eb9097d958a8e86b77d5834e8273.
// Answers retain the source's duplicated RILA phrase and verified absolute links.
const captured = {
  "id": "5F0E4966940E4C3EB85EEB4B34951FC6",
  "heading": {
    "jsonValue": {
      "value": "Frequently asked questions"
    }
  },
  "primaryLink": {
    "jsonValue": {
      "value": {
        "href": ""
      }
    }
  },
  "children": {
    "total": 3,
    "pageInfo": {
      "hasNext": false,
      "endCursor": "Mw=="
    },
    "results": [
      {
        "id": "5683F1F585B3444F8A3FA2FC1382D939",
        "heading": {
          "jsonValue": {
            "value": "Is Allianz Life a financially stable company?"
          }
        },
        "body": {
          "jsonValue": {
            "value": "<p>Yes. Allianz Life Insurance Company of North America has been trusted since 1896 to help millions of Americans prepare for financial uncertainties and retirement. The company’s financial strength is consistently affirmed by all three major international ratings agencies: </p>\r\n<p>A.M. Best rating of A+ (superior) 2<sup>nd</sup> highest of 16 possible ratings – affirmed March 2026 </p>\r\n<p>Moody’s rating of Aa3, 4th highest of 21 possible ratings – affirmed September 2023 and most recently affirmed September 2025 </p>\r\n<p>Standard &amp; Poor’s rating of AA (very strong), 3<sup>rd</sup> highest of 16 possible ratings – affirmed March 2026</p>\r\n<p>The independent ratings shown are based on an analysis of financial results and an evaluation of management objectives, strategies, and risk management programs. The ratings do not pertain to the variable option(s), which fluctuate with market conditions. The ratings do not indicate approval by the analysts and are subject to change.</p>"
          }
        },
        "link": {
          "jsonValue": {
            "value": {
              "href": ""
            }
          }
        }
      },
      {
        "id": "4A782B1602294CA482C4300081C4FAD6",
        "heading": {
          "jsonValue": {
            "value": "What types of annuities and life insurance does Allianz Life offer?"
          }
        },
        "body": {
          "jsonValue": {
            "value": "<p>Allianz Life offers a range of products designed to help you prepare for a more confident retirement: </p>\r\n<ul>\r\n    <li><a href=\"https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities\">Fixed index annuities (FIAs)</a> – Help you accumulate assets for retirement based on a fixed rate or the performance of a market index, with principal protection from market losses and guaranteed lifetime income. </li>\r\n    <li><a href=\"https://www.allianzlife.com/what-we-offer/annuities/registered-index-linked-annuities\">Registered index-linked annuities (RILAs)</a> – Offer higher growth potential based on the performance of a market index, offering varying levels of protection, offering varying levels of protection, accumulation potential, and payout options.</li>\r\n    <li><a href=\"https://www.allianzlife.com/what-we-offer/Life-Insurance/Indexed-Universal-Life\">Indexed universal life insurance (IUL)</a> – Provides death benefit protection that is generally paid to beneficiaries income-tax-free, and the potential to build accumulation based on a fixed rate or the performance of a market index.</li>\r\n</ul>"
          }
        },
        "link": {
          "jsonValue": {
            "value": {
              "href": ""
            }
          }
        }
      },
      {
        "id": "1D79824BC7B04BF9A630C1BA068931F6",
        "heading": {
          "jsonValue": {
            "value": "Who owns Allianz Life?"
          }
        },
        "body": {
          "jsonValue": {
            "value": "<p>Allianz Life Insurance Company of North America is part of the global family of Allianz companies. The parent company, <strong>Allianz SE</strong>, is a global financial services group headquartered in Munich, Germany, and was founded in 1890. With more than 97 million customers, today Allianz SE is one of the largest companies, insurers, and asset managers in the world.</p>"
          }
        },
        "link": {
          "jsonValue": {
            "value": {
              "href": ""
            }
          }
        }
      }
    ]
  }
};
const questionFacts = [
  'Is Allianz Life a financially stable company?',
  'What types of annuities and life insurance does Allianz Life offer?',
  'Who owns Allianz Life?',
];
const fixture = () => {
  const data = structuredClone(captured);
  const metadata = (fieldId, itemId, fieldType = 'Single-Line Text') => ({
    fieldId: `test-only-about-${fieldId}`, itemId, fieldType, fixtureOnly: true,
  });
  data.heading.jsonValue.metadata = metadata('heading', 'test-only-root');
  data.children.results.forEach((entry, index) => {
    entry.heading.jsonValue.metadata = metadata('question', `test-only-entry-${index}`);
    entry.body.jsonValue.metadata = metadata('answer', `test-only-entry-${index}`, 'Rich Text');
  });
  return data;
};
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
const staleParams = { RenderingIdentifier: 'native-about-faq', theme: 'green-soft',
  headingLevel: 'h6', container: 'row', spacing: 'sm', marginBottom: 'xl', paddingTop: 'sm', paddingBottom: 'sm' };
const nodes = (element, predicate) => {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(child => nodes(child, predicate));
  return [...(predicate(element) ? [element] : []), ...nodes(element.props?.children, predicate)];
};
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(Object.getOwnPropertyDescriptors(value)).forEach(descriptor => {
      if ('value' in descriptor) freeze(descriptor.value);
    });
    Object.freeze(value);
  }
  return value;
};
function hookHarness() {
  let instance = 'one', editing = false;
  const states = new Map();
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(sourceRoot));
  compiled.require = specifier => {
    if (specifier === 'react') return { ...React, useId: () => `instance-${instance}`, useState: () => {
      const key = instance;
      return [states.get(key) ?? [], update => {
        assert.equal(typeof update, 'function', 'Disclosure updates must compose with current state');
        states.set(key, update(states.get(key) ?? []));
      }];
    } };
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk,
      useSitecore: () => ({ page: { mode: { isEditing: editing } } }) };
    if (specifier.endsWith('.css')) return {};
    const local = /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) return loadSource([`${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate)));
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  return { draw: data => compiled.exports.AboutFaq({ params: staleParams, fields: { data: { datasource: data } } }),
    setInstance: value => { instance = value; }, setEditing: value => { editing = value; } };
}

test('AboutFaq retains source centered introduction, row spacing and three native button/span questions', () => {
  const data = fixture(), before = JSON.stringify(data);
  const html = render(Accordion.AboutFaq, data, false, staleParams);
  assert.match(html, /^<div class="l-container--full-width t-bg-transparent axlTileCollection" id="native-about-faq">/);
  assert.equal((html.match(/class="l-grid l-grid--max-width"/g) ?? []).length, 1);
  assert.ok(html.includes('class="l-grid__row u-margin-bottom-lg u-padding-top-lg"'));
  assert.ok(html.includes('class="m-axlIntroductionBlock -is--stacked -no--image"'));
  assert.ok(html.includes('class="tileContent u-text-center"'));
  assert.ok(html.includes('<div class="tileHeading"><h2>Frequently asked questions</h2></div>'));
  assert.ok(html.includes('class="tileSubHeading"></div>'));
  assert.ok(html.includes('class="l-grid__row u-padding-bottom-xl"'));
  assert.ok(html.includes('class="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md"'));
  assert.ok(html.includes('class="c-accordion js-accordion c-accordion--light"'));
  assert.equal((html.match(/<button /g) ?? []).length, 3);
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 3);
  assert.equal((html.match(/hidden=""/g) ?? []).length, 3);
  assert.deepEqual(data.children.results.map(entry => entry.heading.jsonValue.value), questionFacts);
  questionFacts.forEach(question => assert.ok(html.includes(`<span class="c-accordion__item-title">${question}</span>`)));
  assert.doesNotMatch(html, /<h3|role="heading"|t-bg-green-soft|u-padding-top-sm|u-padding-bottom-sm|<img|<a name=/);
  assert.equal(JSON.stringify(data), before);
});

test('AboutFaq preserves exact authored answer HTML, duplicate source copy and absolute product links', () => {
  const data = freeze(fixture()), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Accordion.AboutFaq, data, editing, staleParams);
    assert.equal((html.match(/offering varying levels of protection/g) ?? []).length, 2);
    const links = [...html.matchAll(/<a href="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(links, [
      'https://www.allianzlife.com/what-we-offer/annuities/fixed-index-annuities',
      'https://www.allianzlife.com/what-we-offer/annuities/registered-index-linked-annuities',
      'https://www.allianzlife.com/what-we-offer/Life-Insurance/Indexed-Universal-Life',
    ]);
    assert.ok(html.includes('<strong>Allianz SE</strong>'));
    assert.ok(html.includes('affirmed March 2026'));
    assert.ok(html.includes('September 2023 and most recently affirmed September 2025'));
    assert.ok(html.includes('The ratings do not indicate approval by the analysts and are subject to change.'));
  }
  assert.equal(JSON.stringify(data), before);
});

test('installed SDK retains populated title and answer editing metadata without forcing panels open', () => {
  const data = fixture(), before = JSON.stringify(data);
  const visitor = render(Accordion.AboutFaq, data, false, staleParams);
  assert.equal(markers(visitor).length, 0);
  const html = render(Accordion.AboutFaq, data, true, staleParams), actual = markers(html);
  const expected = [data.heading.jsonValue.metadata,
    ...data.children.results.flatMap(entry => [entry.heading.jsonValue.metadata, entry.body.jsonValue.metadata])];
  assert.equal(actual.length, 7);
  for (const owner of expected) assert.equal(actual.filter(marker => marker.itemId === owner.itemId && marker.fieldId === owner.fieldId).length, 1);
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 3);
  assert.equal((html.match(/hidden=""/g) ?? []).length, 3);
  assert.equal(JSON.stringify(data), before);
});

test('every SDK field retains its exact original object and metadata with frozen input and unused throwing getters', () => {
  const data = fixture();
  for (const key of ['body', 'subheading', 'primaryLink', 'secondaryLink', 'desktopImage', 'mobileImage']) {
    Object.defineProperty(data, key, { get() { throw new Error(`Unused root ${key} accessed`); }, configurable: false });
  }
  for (const entry of data.children.results) {
    for (const key of ['link', 'image', 'icon', 'subheading']) {
      Object.defineProperty(entry, key, { get() { throw new Error(`Unused child ${key} accessed`); }, configurable: false });
    }
  }
  freeze(data);
  const original = [data.heading.jsonValue, ...data.children.results.flatMap(entry => [entry.heading.jsonValue, entry.body.jsonValue])];
  const harness = hookHarness();
  for (const editing of [false, true]) {
    harness.setEditing(editing);
    const leaves = nodes(harness.draw(data), node => node.type === sdk.Text || node.type === sdk.RichText);
    assert.equal(leaves.length, 7);
    assert.deepEqual(leaves.map(node => node.props.field), original);
    leaves.forEach((leaf, index) => {
      assert.equal(leaf.props.field, original[index]);
      assert.equal(leaf.props.editable, editing);
    });
    assert.equal(leaves[0].props.tag, 'h2');
    assert.deepEqual(leaves.filter(leaf => leaf.type === sdk.Text).slice(1).map(leaf => leaf.props.tag), ['span', 'span', 'span']);
  }
});

test('cleared optional fields stay off canvas and changed copy is never replaced with captured source text', () => {
  const data = fixture();
  data.heading.jsonValue.value = '';
  data.children.results[0].heading.jsonValue.value = '';
  data.children.results[0].body.jsonValue.value = '';
  data.children.results[1].heading.jsonValue.value = 'Authored replacement question';
  data.children.results[1].body.jsonValue.value = '<p>Authored replacement answer</p>';
  const before = JSON.stringify(data);
  const visitor = render(Accordion.AboutFaq, data), editing = render(Accordion.AboutFaq, data, true);
  assert.doesNotMatch(visitor, /<h2|Frequently asked questions|Is Allianz Life a financially stable company|What types of annuities/);
  assert.ok(visitor.includes('Authored replacement question'));
  assert.ok(visitor.includes('<p>Authored replacement answer</p>'));
  assert.equal(markers(editing).length, 4);
  assert.doesNotMatch(editing, /\[No text in field\]/);
  assert.equal(JSON.stringify(data), before);
});

test('duplicate native entry IDs and simultaneous AboutFaq instances retain unique trigger/panel associations', () => {
  const data = fixture();
  data.children.results.forEach(entry => { entry.id = 'shared-native-id'; });
  const all = () => React.createElement(React.Fragment, null,
    ...['first', 'second'].map(key => React.createElement(Accordion.AboutFaq, {
      key, params: {}, fields: { data: { datasource: data } },
    })));
  const html = render(all, {});
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids).size, 12);
  const buttons = [...html.matchAll(/<button id="([^"]+)"[^>]*type="button"[^>]*aria-controls="([^"]+)"/g)];
  assert.equal(buttons.length, 6);
  for (const [, trigger, panel] of buttons) assert.ok(html.includes(`id="${panel}" role="region" aria-labelledby="${trigger}"`));
  assert.doesNotMatch(html, /id="accordion[1-4]"|titleIconCaretDown|role="heading"/);
});

test('rapid pointer handlers compose state, toggle each panel reversibly and isolate separate instances', () => {
  const harness = hookHarness(), data = fixture();
  data.children.results.forEach(entry => { entry.id = 'shared-native-id'; });
  const buttons = () => nodes(harness.draw(data), node => node.type === 'button');
  const expanded = () => buttons().map(button => button.props['aria-expanded']);
  assert.deepEqual(expanded(), [false, false, false]);
  const firstFrame = buttons();
  firstFrame[0].props.onClick();
  firstFrame[1].props.onClick();
  assert.deepEqual(expanded(), [true, true, false]);
  buttons()[0].props.onClick();
  assert.deepEqual(expanded(), [false, true, false]);
  buttons()[2].props.onClick();
  assert.deepEqual(expanded(), [false, true, true]);
  harness.setInstance('two');
  assert.deepEqual(expanded(), [false, false, false]);
  buttons()[0].props.onClick();
  assert.deepEqual(expanded(), [true, false, false]);
  harness.setInstance('one');
  assert.deepEqual(expanded(), [false, true, true]);
  const tree = harness.draw(data);
  buttons().forEach(button => {
    const panel = nodes(tree, node => node.props?.id === button.props['aria-controls'])[0];
    assert.equal(panel.props.hidden, !button.props['aria-expanded']);
    assert.equal(panel.props['aria-labelledby'], button.props.id);
    assert.equal(button.props.type, 'button');
    assert.equal(button.props.role, undefined);
  });
  harness.setEditing(true);
  assert.deepEqual(expanded(), [false, true, true]);
  buttons()[0].props.onClick();
  assert.deepEqual(expanded(), [true, true, true]);
  buttons()[0].props.onClick();
  harness.setEditing(false);
  assert.deepEqual(expanded(), [false, true, true]);
});

test('missing datasource uses native fallback while absent children and heading never invent FAQ copy', () => {
  for (const editing of [false, true]) {
    const html = render(Accordion.AboutFaq, undefined, editing);
    assert.match(html, /allianz-missing-data/);
    assert.match(html, /AllianzAccordion/);
    assert.doesNotMatch(html, /Frequently asked questions|axlTileCollection|<button/);
    const empty = render(Accordion.AboutFaq, {}, editing);
    assert.doesNotMatch(empty, /<h2|<button|Who owns Allianz/);
  }
});
