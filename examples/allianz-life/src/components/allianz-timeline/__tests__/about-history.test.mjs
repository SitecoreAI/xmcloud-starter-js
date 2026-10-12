import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { component, loadSource, render, sourceRoot } from '../../press-release-archive/__tests__/runtime.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const sdk = require('@sitecore-content-sdk/nextjs');
const postcss = require('postcss');
const { AboutHistory } = component('allianz-timeline', 'AllianzTimeline');
// Bounded public SDK fixture projected from the saved About history placement.
// IDs and values are test inputs, not native acceptance evidence.
// Independent source expectations were extracted from SOURCE-CONTENT-LAYOUT.json
// SHA-256: 2b6ae774cb44d98542546bc93a37855b9fa6d6c7c200e453470e713cb48c54be.
const source = {
  "introduction": {
    "heading": {
      "text": "Company history – keeping promises for more than a century"
    }
  },
  "entries": [
    {
      "date": "1896",
      "body": {
        "text": "Henry M. Little forms North American Casualty in Minneapolis. Through a series of mergers and acquisitions, the company would become Allianz Life."
      }
    },
    {
      "date": "1912",
      "body": {
        "text": "North American Casualty merges with North American Life Association to form North American Life and Casualty."
      }
    },
    {
      "date": "1971",
      "body": {
        "text": "MONY Life insurance Co. acquires North American Life and Casualty."
      }
    },
    {
      "date": "1979",
      "body": {
        "text": "North American Life and Casualty joins the German conglomerate Allianz SE through an acquisition."
      }
    },
    {
      "date": "1993",
      "body": {
        "text": "The company changes its name to Allianz Life Insurance Company of North America."
      }
    },
    {
      "date": "2000",
      "body": {
        "text": "Allianz Life becomes the #1 carrier of fixed index annuities in the United States. 1"
      }
    },
    {
      "date": "2001",
      "body": {
        "text": "Allianz Life moves into its new headquarters at 5701 Golden Hills Drive, Golden Valley, Minn."
      }
    },
    {
      "date": "2011",
      "body": {
        "text": "Fortune Magazine names Allianz Life one of the 100 Best Companies to Work For for the first time."
      }
    },
    {
      "date": "2013",
      "body": {
        "text": "Assets under management exceed $100 billion."
      }
    },
    {
      "date": "2017",
      "body": {
        "text": "Allianz Life becomes the title sponsor of Major League Soccer’s Minnesota United FC stadium, Allianz Field®, in the Midway neighborhood of St. Paul."
      }
    },
    {
      "date": "2020",
      "body": {
        "text": "Allianz Investment Management LLC, a registered investment adviser and wholly owned subsidiary of Allianz Life, launches an exchange-traded fund (ETF) product line."
      }
    },
    {
      "date": "2020",
      "body": {
        "text": "Allianz Life launches Allianz Advisory Solutions, expanding its service for advisors."
      }
    },
    {
      "date": "2021",
      "body": {
        "text": "Allianz begins an eight-year worldwide partnership with the Olympic and Paralympic Movements."
      }
    },
    {
      "date": "2021",
      "body": {
        "text": "Jasmine Jirele is named president and CEO, succeeding Walter White."
      }
    },
    {
      "date": "2022",
      "body": {
        "text": "Allianz Life enters the defined contribution market with its Allianz Lifetime Income+® Annuity for employer-sponsored plans."
      }
    },
    {
      "date": "2023",
      "body": {
        "text": "AllianzIM’s suite of ETFs exceeds $1 billion in assets."
      }
    },
    {
      "date": "2025",
      "body": {
        "text": "Allianz extends its Worldwide Olympic and Paralympic Partnership through 2032."
      }
    }
  ],
  "blankSpacerCount": 16
};
const data = {
  "id": "26AC89DEAD6142B787619D620719AC1A",
  "heading": {
    "jsonValue": {
      "value": "Company history – keeping promises for more than a century"
    }
  },
  "body": {
    "jsonValue": {
      "value": ""
    }
  },
  "children": {
    "total": 17,
    "pageInfo": {
      "hasNext": false
    },
    "results": [
      {
        "id": "81903F900CA945CB9155E38B4F4C27AF",
        "date": {
          "jsonValue": {
            "value": "1896"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Henry M. Little forms North American Casualty in Minneapolis. Through a series of mergers and acquisitions, the company would become Allianz Life.<br />"
          }
        }
      },
      {
        "id": "DB9F34C152674FB0A09627DAEFD7851B",
        "date": {
          "jsonValue": {
            "value": "1912"
          }
        },
        "body": {
          "jsonValue": {
            "value": "North American Casualty merges with North American Life Association to form North American Life and Casualty.<br />"
          }
        }
      },
      {
        "id": "EE28D44861FF4E5A90A94E5A74F93D46",
        "date": {
          "jsonValue": {
            "value": "1971"
          }
        },
        "body": {
          "jsonValue": {
            "value": "MONY Life insurance Co. acquires North American Life and Casualty.<br />"
          }
        }
      },
      {
        "id": "2487E581D8E640F3866D9347435BACBD",
        "date": {
          "jsonValue": {
            "value": "1979"
          }
        },
        "body": {
          "jsonValue": {
            "value": "North American Life and Casualty joins the German conglomerate Allianz SE through an acquisition.<br />"
          }
        }
      },
      {
        "id": "5F0F5969A0014CB4A8CF9934F4D45027",
        "date": {
          "jsonValue": {
            "value": "1993"
          }
        },
        "body": {
          "jsonValue": {
            "value": "The company changes its name to Allianz Life Insurance Company of North America.<br />"
          }
        }
      },
      {
        "id": "6612B4A19E404634A65610D90C4E93E1",
        "date": {
          "jsonValue": {
            "value": "2000"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Allianz Life becomes the #1 carrier of fixed index annuities in the United States.<sup>1</sup><br />"
          }
        }
      },
      {
        "id": "AB628059E14844DFBB6BA5591340A568",
        "date": {
          "jsonValue": {
            "value": "2001"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Allianz Life moves into its new headquarters at 5701 Golden Hills Drive, Golden Valley, Minn.<br />"
          }
        }
      },
      {
        "id": "23D2BF74864540DC83A3BFDBE916C87C",
        "date": {
          "jsonValue": {
            "value": "2011"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Fortune Magazine names Allianz Life one of the 100 Best Companies to Work For for the first time.<br />"
          }
        }
      },
      {
        "id": "B07763A872544E679258DD996140C80B",
        "date": {
          "jsonValue": {
            "value": "2013"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Assets under management exceed $100 billion.<br />"
          }
        }
      },
      {
        "id": "06B15375D8664E5ABAA1C8C73C747BD1",
        "date": {
          "jsonValue": {
            "value": "2017"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Allianz Life becomes the title sponsor of Major League Soccer’s Minnesota United FC stadium, Allianz Field®, in the Midway neighborhood of St. Paul.<br />"
          }
        }
      },
      {
        "id": "2B5A0FB0215C40C2914837EE076E2A03",
        "date": {
          "jsonValue": {
            "value": "2020"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Allianz Investment Management LLC, a registered investment adviser and wholly owned subsidiary of Allianz Life, launches an exchange-traded fund (ETF) product line.<br />"
          }
        }
      },
      {
        "id": "0E595135E74F480C9C7720276B646139",
        "date": {
          "jsonValue": {
            "value": "2020"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Allianz Life launches Allianz Advisory Solutions, expanding its service for advisors.<br />"
          }
        }
      },
      {
        "id": "1075FDCE08B045A7B4F53EB8F387F101",
        "date": {
          "jsonValue": {
            "value": "2021"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Allianz begins an eight-year worldwide partnership with the Olympic and Paralympic Movements.<br />"
          }
        }
      },
      {
        "id": "CF9B1C6F15A9488BAFA4A070FDE73F31",
        "date": {
          "jsonValue": {
            "value": "2021"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Jasmine Jirele is named president and CEO, succeeding Walter White.<br />"
          }
        }
      },
      {
        "id": "2B817C6E4D6848D9AEDE9A9F8CA5B71B",
        "date": {
          "jsonValue": {
            "value": "2022"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Allianz Life enters the defined contribution market with its Allianz Lifetime Income+® Annuity for employer-sponsored plans.<br />"
          }
        }
      },
      {
        "id": "F5C20D21F56B479FAED91367EEF36E7F",
        "date": {
          "jsonValue": {
            "value": "2023"
          }
        },
        "body": {
          "jsonValue": {
            "value": "AllianzIM’s suite of ETFs exceeds $1 billion in assets.<br />"
          }
        }
      },
      {
        "id": "08A5F7B766DA48B18C67A2DCFFCE7AFA",
        "date": {
          "jsonValue": {
            "value": "2025"
          }
        },
        "body": {
          "jsonValue": {
            "value": "Allianz extends its Worldwide Olympic and Paralympic Partnership through 2032.<br />"
          }
        }
      }
    ]
  }
};

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
freeze(data);
const plain = value => String(value).replace(/<[^>]*>/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
  .replace(/&#([0-9]+);/g, (_, value) => String.fromCodePoint(Number(value)))
  .replace(/&(nbsp|amp|quot|apos|reg|trade);/g, (_, name) => ({ nbsp: ' ', amp: '&', quot: '"', apos: "'", reg: '®', trade: '™' })[name])
  .replace(/\s+/g, ' ').trim();
const table = html => {
  const found = html.match(/<table class="allianz-about-history-table">([\s\S]*?)<\/table>/);
  assert.ok(found, 'native entries use the dedicated source table');
  return [...found[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)]
    .map(row => [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(cell => cell[1]));
};
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
const selected = value => [value.heading?.jsonValue, value.body?.jsonValue,
  ...(value.children?.results ?? []).flatMap(row => [row.date?.jsonValue, row.body?.jsonValue])].filter(Boolean);

test('bounded 17 native history entries retain the source order, repeated years, superscript and three-cell spacer structure', () => {
  const before = JSON.stringify(data);
  const html = render(AboutHistory, data);
  const rows = table(html);
  assert.equal(data.children.total, 17);
  assert.equal(data.children.pageInfo.hasNext, false);
  assert.equal(data.children.results.length, source.entries.length);
  assert.equal(rows.length, 33);
  assert.ok(rows.every(row => row.length === 3));
  assert.equal((html.match(/allianz-about-history-spacer/g) ?? []).length, source.blankSpacerCount);
  assert.equal((html.match(/<strong>/g) ?? []).length, 17);
  assert.deepEqual(rows.filter((_, index) => index % 2 === 0).map(row => plain(row[0])), source.entries.map(row => row.date));
  assert.deepEqual(rows.filter((_, index) => index % 2 === 0).map(row => plain(row[2])), source.entries.map(row => row.body.text));
  assert.ok(rows.every(row => plain(row[1]) === ''));
  assert.ok(rows.filter((_, index) => index % 2 === 1).every(row => row.every(cell => plain(cell) === '')));
  assert.equal(rows.filter(row => plain(row[0]) === '2020').length, 2);
  assert.equal(rows.filter(row => plain(row[0]) === '2021').length, 2);
  assert.match(html, /<sup>1<\/sup>/);
  assert.ok(html.includes(`<h2>${source.introduction.heading.text}</h2>`));
  assert.equal((html.match(/<h2>/g) ?? []).length, 1);
  assert.match(html, /l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12/);
  assert.match(html, /<table class="table" aria-hidden="true"><\/table>/);
  assert.doesNotMatch(html, /<th\b|244\.5|allianz-timeline"|<h3|<img\b|<a\b/);
  assert.deepEqual(markers(html), []);
  assert.equal(JSON.stringify(data), before);
});

test('fixed source presentation ignores historic design parameters and renders changed native values without generating date HTML', () => {
  const changed = structuredClone(data);
  changed.heading.jsonValue.value = 'Authored history heading';
  changed.body.jsonValue.value = '<p>Authored root body exactly once.</p>';
  changed.children.results[0].date.jsonValue.value = 'Authored <em>date</em>';
  changed.children.results[0].body.jsonValue.value = '<p>Authored <strong>event</strong> exactly once.</p>';
  freeze(changed);
  const html = render(AboutHistory, changed);
  assert.equal(render(AboutHistory, changed, false, { theme: 'red-soft', columns: '4', alignment: 'right',
    headingLevel: 'h1', spacing: 'xl', paddingTop: 'none', marginBottom: 'none' }), html);
  assert.match(html, /l-container--full-width t-bg-blue-soft axlTileCollection allianz-about-history/);
  assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
  assert.match(html, /tileContent u-text-center/);
  assert.match(html, /l-grid__row u-margin-bottom-lg u-padding-top-lg/);
  assert.equal((html.match(/Authored root body exactly once\./g) ?? []).length, 1);
  assert.equal((html.match(/Authored <strong>event<\/strong> exactly once\./g) ?? []).length, 1);
  assert.match(html, /<strong>Authored &lt;em&gt;date&lt;\/em&gt;<\/strong>/);
  assert.doesNotMatch(html, /<em>date<\/em>|<h1|padding-top-xl/);
  assert.match(render(AboutHistory, data, false, { RenderingIdentifier: 'native-history' }), /id="native-history"/);
});

test('real SDK editing retains all 36 selected cleared fields once without recreating source content or optional fields', () => {
  // Explicit test-only authoring metadata; no fixture ID is native-readback evidence.
  const cleared = structuredClone(data);
  for (const [index, field] of selected(cleared).entries()) {
    field.value = '';
    field.metadata = { itemId: `test-only-history-owner-${index}`, fieldId: `test-only-history-field-${index}`,
      fieldType: index === 1 || index > 1 && index % 2 === 1 ? 'Rich Text' : 'Single-Line Text', fixtureOnly: true };
  }
  freeze(cleared);
  const before = JSON.stringify(cleared);
  const editing = render(AboutHistory, cleared, true);
  assert.equal(selected(cleared).length, 36);
  assert.deepEqual(markers(editing).map(row => row.fieldId).sort(), selected(cleared).map(field => field.metadata.fieldId).sort());
  assert.equal(table(editing).length, 33);
  assert.doesNotMatch(editing, /keeping promises|Henry M\. Little|scEmptyImage|<h3|<img\b|<a\b/);
  const visitor = render(AboutHistory, cleared);
  assert.deepEqual(markers(visitor), []);
  assert.doesNotMatch(visitor, /\[No text in field\]|keeping promises|Henry M\. Little/);
  assert.equal(JSON.stringify(cleared), before);
});

test('the variant passes every original selected SDK field object once with the actual editing flag', () => {
  const filename = path.join(sourceRoot, 'components/allianz-timeline/AllianzTimeline.tsx');
  const consumed = [];
  const capture = props => { consumed.push(props); return null; };
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = compiled.require.bind(compiled);
  compiled.require = name => {
    if (name === '@sitecore-content-sdk/nextjs') return { ...sdk, Text: capture, RichText: capture };
    if (name.endsWith('.css')) return {};
    if (/^(lib|components)\//.test(name)) {
      const local = path.join(sourceRoot, name);
      const found = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate));
      return loadSource(found);
    }
    return originalRequire(name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  for (const editing of [false, true]) {
    consumed.length = 0;
    render(compiled.exports.AboutHistory, data, editing);
    const expected = selected(data).filter(field => editing || plain(field.value));
    assert.equal(consumed.length, expected.length);
    for (const field of expected) assert.equal(consumed.filter(props => props.field === field).length, 1);
    assert.ok(consumed.every(props => props.editable === editing && expected.includes(props.field)));
  }
});

test('native child removal or missing fields never cause historical entries or values to be fabricated', () => {
  const subset = structuredClone(data);
  subset.children = { total: 2, pageInfo: { hasNext: false }, results: subset.children.results.slice(0, 2) };
  delete subset.heading;
  delete subset.body;
  delete subset.children.results[0].date;
  delete subset.children.results[0].body;
  freeze(subset);
  const editing = render(AboutHistory, subset, true);
  assert.equal(table(editing).length, 3);
  assert.deepEqual(markers(editing), []);
  assert.doesNotMatch(editing, /1896|Henry M\. Little|keeping promises/);
  assert.match(render(AboutHistory, undefined), /Add a datasource for AllianzTimeline/);
});

test('original Default bytes remain unchanged and new alignment rules stay scoped without the captured offset', () => {
  const current = fs.readFileSync(path.join(sourceRoot, 'components/allianz-timeline/AllianzTimeline.tsx'));
  assert.equal(createHash('sha256').update(current.subarray(0, 2032)).digest('hex'),
    '88ca97ba3f89e7b3856da64761480d59f146e6a01ec253d1abcca4339614841e');
  const css = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'components/allianz-timeline/AboutHistory.css'), 'utf8'));
  css.walkRules(rule => {
    assert.ok(rule.selectors.every(selector => selector.startsWith('.allianz-about-history ')));
    rule.walkDecls(decl => assert.ok(['margin-left', 'margin-right', 'text-align'].includes(decl.prop)));
  });
  assert.doesNotMatch(css.toString(), /244\.5|position:|overflow:|width:|padding:|allianz-timeline/);
});
