import { assertWysiwygCanvas } from '../../allianz-card-grid/__tests__/wysiwyg-assertions.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadSource, render } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../../..');
const appRoot = path.resolve(sourceRoot, '..');
const taskRoot = path.resolve(appRoot, '../../..');
const prep = path.join(taskRoot, 'preparation/rila-scoped-correction-v1');
const filename = path.join(here, '../AllianzRichText.tsx');
const baselineFilename = path.join(prep, 'baseline/AllianzRichText.tsx');
const Candidate = loadSource(filename);
const Baseline = loadSource(baselineFilename);
const native = JSON.parse(fs.readFileSync(path.join(prep, 'native-intake/extracted/NATIVE-READBACK-20261012.json')));
const placements = JSON.parse(fs.readFileSync(path.join(prep, 'CURRENT-17-BODY-PLACEMENT-MAP.json')));
const originalSource = JSON.parse(fs.readFileSync(path.join(prep, 'native-intake/extracted/SOURCE-DOM-20261012.json'))).main;
const primitives = JSON.parse(fs.readFileSync(path.join(prep, 'rich-text/SOURCE-DECORATIVE-SVG-PRIMITIVES.json')));
const fields = ['heading', 'subheading', 'body', 'primaryLink'];
const roles = [
  [2, 'RilaIntroduction', 'xl', 'center', 'transparent', null],
  [4, 'RilaContractIntroduction', null, 'center', 'blue-soft', 'h2'],
  [5, 'RilaExplained', 'xl', 'center', 'transparent', 'h2'],
  [8, 'RilaRiskDisclosure', 'sm', 'left', 'transparent', null],
  [9, 'RilaSeriesIntroduction', 'xl', 'center', 'blue-soft', 'h2'],
  [10, 'RilaSolutionHeading', 'lg', 'center', 'blue-soft', 'h3'],
  [12, 'RilaSolutionHeading', 'lg', 'center', 'blue-soft', 'h3'],
  [15, 'RilaExploreIntroduction', null, 'center', 'green-soft', 'h2'],
  [17, 'RilaDisclosures', null, null, null, null],
];
const names = [...new Set(roles.map(([, name]) => name))];
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const envelope = row => {
  const placement = placements.find(item => item.index === row);
  const item = native.data.find(item => item.id === placement.datasourceId);
  return Object.fromEntries(fields.map(name => {
    const field = item.fields.find(field => field.label.trim() === `${name} field`);
    assert.ok(field);
    return [name, { jsonValue: {
      value: name === 'primaryLink' ? { href: field.value } : field.value,
      // Fixture-only metadata exercises SDK editing; no metadata is added to CMS or app content.
      metadata: { itemId: item.id, fieldId: `test-only-rila-${name}`,
        fieldType: name === 'primaryLink' ? 'General Link' : name === 'heading' ? 'Single-Line Text' : 'Rich Text' },
    } }];
  }));
};
const envelopes = roles.map(([row]) => freeze(envelope(row)));
const markup = index => render(Candidate[roles[index][1]], envelopes[index], false,
  placements.find(item => item.index === roles[index][0]).parameters);
const hrefs = html => [...html.matchAll(/\bhref="([^"]*)"/g)].map(match => match[1]);

const require = createRequire(path.join(appRoot, 'package.json'));
const sdk = require('@sitecore-content-sdk/nextjs');
const React = require('react');
const ts = require('typescript');
const calls = [];
const instrumented = new Module(filename);
instrumented.filename = filename;
instrumented.paths = Module._nodeModulePaths(appRoot);
instrumented.require = specifier => {
  if (specifier === '@sitecore-content-sdk/nextjs') return {
    ...sdk,
    ...Object.fromEntries(['Text', 'RichText', 'Link'].map(name => [name, props => {
      calls.push({ name, field: props.field, editable: props.editable });
      return React.createElement(sdk[name], props);
    }])),
  };
  if (specifier.endsWith('.css')) return {};
  if (/^(components|lib)\//.test(specifier)) {
    const base = path.join(sourceRoot, specifier);
    return loadSource([base, `${base}.ts`, `${base}.tsx`].find(file => fs.existsSync(file)));
  }
  return require(specifier);
};
instrumented._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);

test('nine admitted controls retain exact native body HTML and current hrefs', () => {
  assert.equal(roles.length, 9);
  for (let index = 0; index < roles.length; index++) {
    const body = envelopes[index].body.jsonValue.value;
    const html = markup(index);
    if (body) assert.ok(html.includes(body), `${roles[index][1]} complete body`);
    assert.deepEqual(hrefs(html), hrefs(body));
    const heading = envelopes[index].heading.jsonValue.value;
    if (heading) assert.ok(html.includes(heading));
  }
  assert.ok(markup(2).includes('<span id="video"></span>'));
  assert.ok(markup(1).includes('<footer><div class="tileLink"><p><a '));
  assert.equal((markup(8).match(/data-demo-disabled="true"/g) ?? []).length, 2,
    'Current native phone links are preserved; correction belongs to native scope, not component rewriting');
});

test('finite roles have the source heading, tile, body-size and spacing structure', () => {
  roles.forEach(([, name, size, alignment, theme, heading], index) => {
    const html = markup(index);
    if (theme) assert.ok(html.includes(`t-bg-${theme}`), name);
    if (alignment) assert.ok(html.includes(`tileContent u-text-${alignment}`), name);
    if (size) assert.ok(html.includes(`tileBody u-font-size-${size}`), name);
    const tags = [...html.matchAll(/<(h[1-6])\b/g)].map(match => match[1]);
    assert.deepEqual(tags, heading ? [heading] : [], name);
    if (name === 'RilaContractIntroduction' || name === 'RilaExploreIntroduction') {
      assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
      assert.match(html, /l-grid__row u-margin-bottom-lg u-padding-top-lg/);
    } else if (name !== 'RilaDisclosures') {
      assert.match(html, /m-axlTile match-height -is--stacked t-bg-transparent/);
      assert.doesNotMatch(html, /u-padding|u-margin/);
    }
  });
  assert.match(markup(7), /<h2><span>Explore another Allianz® annuity option<\/span><br\/><\/h2>/);
  assert.match(markup(8), /a-axlDisclosures allianz-rila-disclosures/);
  assert.match(markup(8), /l-grid__column"><div class="row"><div class="col-md-12 content-body disclosure/);
});

test('decorative icon paths match fresh source exactly and add no focusable or editable field', () => {
  for (const [index, key] of [[2, 'LightBulb'], [4, 'PeopleConnect']]) {
    const html = markup(index);
    assert.ok(originalSource.includes(primitives[key].path));
    assert.ok(html.includes(`d="${primitives[key].path}"`));
    assert.match(html, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"/);
    assert.doesNotMatch(html, /<img\b|<title\b|aria-labelledby|tabindex/);
  }
});

test('original populated SDK fields remain editable and empty optional fields stay off the canvas without mutation', () => {
  for (let index = 0; index < roles.length; index++) {
    const input = envelopes[index], before = JSON.stringify(input);
    calls.length = 0;
    const html = render(instrumented.exports[roles[index][1]], input, true, {});
    const active = fields.filter(name => { const value = input[name].jsonValue.value; return name === 'primaryLink' ? Boolean(value?.href) : Boolean(value?.trim()); });
    assert.equal(calls.length, active.length, roles[index][1]);
    for (const name of active) {
      const matched = calls.filter(call => call.field === input[name].jsonValue);
      assert.equal(matched.length, 1, `${roles[index][1]} original ${name}`);
      assert.equal(matched[0].editable, true);
      assert.ok(html.includes(`test-only-rila-${name}`));
    }
    assert.equal(JSON.stringify(input), before);
  }
});

test('editing updates, clears, metadata-free native envelopes and absent fields keep the SDK state contract', () => {
  for (const name of names) {
    const updated = structuredClone(envelopes[0]);
    updated.heading.jsonValue.value = 'New native heading';
    updated.subheading.jsonValue.value = '<p>New native subheading</p>';
    updated.body.jsonValue.value = '<p>New native body</p>';
    updated.primaryLink.jsonValue.value = { href: '#native-update', text: 'New native link' };
    const html = render(Candidate[name], freeze(updated), false, {});
    assert.ok(html.includes('New native heading'));
    assert.ok(html.includes('<p>New native subheading</p>'));
    assert.ok(html.includes('<p>New native body</p>'));
    assert.ok(html.includes('href="#native-update"'));
    const cleared = structuredClone(updated);
    fields.forEach(field => { cleared[field].jsonValue.value = field === 'primaryLink' ? { href: '' } : ''; });
    calls.length = 0;
    render(instrumented.exports[name], freeze(cleared), true, {});
    fields.forEach(field => assert.equal(calls.filter(call => call.field === cleared[field].jsonValue).length, 0));
    const withoutMetadata = structuredClone(cleared);
    fields.forEach(field => { delete withoutMetadata[field].jsonValue.metadata; });
    calls.length = 0;
    render(instrumented.exports[name], freeze(withoutMetadata), true, {});
    fields.forEach(field => assert.equal(calls.filter(call => call.field === withoutMetadata[field].jsonValue).length, 0));
    calls.length = 0;
    render(instrumented.exports[name], {}, true, {});
    assert.equal(calls.length, 0, `${name} no synthetic absent fields`);
    assert.match(render(Candidate[name], undefined, false, {}), /AllianzRichText/);
  }
});

test('prior exports retain visitor markup and use the same visible editing canvas', () => {
  const old = Object.keys(Baseline).sort();
  for (const name of [...old, ...names]) assert.equal(typeof Candidate[name], 'function', name);
  for (const name of old) {
    for (const editing of [false, true]) {
      for (const layout of ['plain', 'rich-text', 'disclosures']) {
        const params = { layout, headingLevel: 'h3', alignment: 'left', theme: 'transparent', RenderingIdentifier: 'test-only-retained-id' };
        for (const input of [envelopes[0], envelopes[1], envelopes[8], undefined]) {
          const visitor = render(Candidate[name], input, false, params);
          if (!editing) {
            let expected = render(Baseline[name], input, false, params);
            if (name === 'AboutInformationHeading') {
              // This frozen RILA baseline predates the native optional Icon contract,
              // independently covered by about-variants and optional-icons. These
              // fixtures have no Icon field: retain all other historical DOM exactly.
              expected = expected
                .replace('<link rel="preload" as="image" href="/allianz-ui/about-overview/information.svg"/>', '')
                .replace('<img class="allianz-about-information-glyph" src="/allianz-ui/about-overview/information.svg" alt="Information"/>', '');
              assert.doesNotMatch(visitor, /about-overview\/information\.svg|<img\b/);
            }
            if (name === 'LifeInformationHeading') {
              // This historical baseline predates the yellow-only paint repair.
              // Its transparent parameter resolves to yellow for Information:
              // retain the same 32px gap as internal padding, not an escaped margin.
              expected = expected.replace('l-grid__row u-margin-bottom-lg u-padding-top-lg',
                'l-grid__row u-padding-bottom-lg u-padding-top-lg');
            }
            assert.equal(visitor, expected, `${name}/visitor/${layout}`);
          }
          else assertWysiwygCanvas(visitor, render(Candidate[name], input, true, params), input, `${name}/editing/${layout}`);
        }
      }
    }
  }
});

test('frozen original source stays pinned and installed source retains CRLF line endings', () => {
  const before = fs.readFileSync(baselineFilename);
  const after = fs.readFileSync(filename);
  assert.equal(before.length, 27209);
  assert.equal(createHash('sha256').update(before).digest('hex'), '26802e00d12d4be4cda0e213563c1db1df6445b749a2edbd317f9912f0544ec3');
  // The frozen original source remains pinned above; WYSIWYG intentionally changes its editing branches.
  // Historical visitor outputs remain checked independently in the preceding test.
  assert.equal(after.toString().split('\n').length, after.toString().split('\r\n').length);
  const scope = after.toString().slice(after.toString().indexOf('export const RilaIntroduction'));
  assert.doesNotMatch(scope, /dangerouslySetInnerHTML|usePathname|pathname|document\.|\.replace\(|\.slice\(/);
});
