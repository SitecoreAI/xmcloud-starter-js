import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(path.join(sourceRoot, '../package.json'));
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sdk = require('@sitecore-content-sdk/nextjs');
// Use the installed Placeholder implementation, not a second copy of its normalization.
const { getSXAParams } = require(path.join(path.dirname(require.resolve('@sitecore-content-sdk/react')),
  'components/Placeholder/placeholder-utils.js'));
const modules = new Map();
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename))
    .concat(Module._nodeModulePaths(path.dirname(sourceRoot)));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`]
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return loadSource(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const Introduction = loadSource(path.join(sourceRoot,
  'components/product-introduction/ProductIntroduction.tsx'));
const variants = ['Default', 'Blue', 'FixedIndexOverview', 'Plain', 'ProductGroup'];
const componentMap = new Map([['ProductIntroduction', Introduction]]);
const heading = 'Native introduction heading';
const body = '<p>A source paragraph with <a href="/about">a local link</a> and <strong>retained emphasis</strong>.</p>';
function field(name, value) {
  return { jsonValue: { value, metadata: {
    itemId: '11111111-1111-4111-8111-111111111111',
    fieldId: name === 'heading' ? '22222222-2222-4222-8222-222222222222'
      : '33333333-3333-4333-8333-333333333333',
    fieldType: name === 'heading' ? 'Single-Line Text' : 'Rich Text',
  } } };
}
function datasource(headingValue = heading, bodyValue = body) {
  return { id: '11111111-1111-4111-8111-111111111111',
    heading: field('heading', headingValue), body: field('body', bodyValue) };
}
function input(editing, params = {}, data = datasource()) {
  return {
    params: { RenderingIdentifier: 'introduction-test', ...params },
    fields: { data: { datasource: data } },
    rendering: { uid: '44444444-4444-4444-8444-444444444444', componentName: 'ProductIntroduction' },
    page: { mode: { isEditing: editing, isNormal: !editing, isPreview: false },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: {
        name: 'Introduction test', fields: {}, placeholders: {},
      } } } },
  };
}
function render(variant, props) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: props.page, api: {}, componentMap, loadImportMap: async () => ({}),
  }, React.createElement(Introduction[variant], props)));
}
function classTokens(html, predicate) {
  const matches = [...html.matchAll(/\bclass="([^"]*)"/g)]
    .map((match) => match[1].split(/\s+/).filter(Boolean));
  return matches.filter(predicate);
}
function rootTokens(html) {
  const tag = html.match(/<div\b(?=[^>]*\bid="introduction-test")[^>]*>/)?.[0];
  assert.ok(tag, 'The native RenderingIdentifier must remain on its component wrapper');
  return tag.match(/\bclass="([^"]*)"/)[1].split(/\s+/).filter(Boolean);
}
function contentTokens(html) {
  const contents = classTokens(html, (tokens) => tokens.includes('tileContent'));
  assert.equal(contents.length, 1, 'Each variant must keep one source content wrapper');
  return contents[0];
}
function helper(params) {
  return loadSource(path.join(sourceRoot, 'lib/product-introduction-styles.ts'))
    .getProductIntroductionStyles(params);
}

// Frozen with these same synthetic props on deployed a363d555, before the styling repair.
const BASELINE_HASHES = {
  "Default:visitor": "9be26d42d3eb4e50e629a521dcf6fb2e27fb94f677ec1fdd47c7875db82db0ac",
  "Default:editing": "b9792c500845a2d067bc29134ba2ff53e352fb022e3bffc9a6c9f1f230c63a22",
  "Blue:visitor": "1ceca1b2705e21426618f168d2d98549e5a7c30715969a95764d763f82449b5d",
  "Blue:editing": "ac7f8ca543babce25282f56b1b98705b415c13d8cda97bc97c055a461da1f897",
  "FixedIndexOverview:visitor": "0206af46b95d4e3196b250606e00cd1dc1c415eb7f38773e3c2897050728695b",
  "FixedIndexOverview:editing": "344bec71fd683eb8ae3d8887f78fb5a5e47a24c81e5dc8c166b8a9df0c44f7db",
  "Plain:visitor": "13c124cdd540b96c78380bfcd792b1702a819a2721e0c8dcac3eef7f9b09ef99",
  "Plain:editing": "ba1becddb95543e8b3157edc2084d81e8fdc4952f1adb6a50d43fba798596e84",
  "ProductGroup:visitor": "22ff7a1f28c9c737171e28e56e08177ed5dc19275580711c7c4b8e0609b0b27c",
  "ProductGroup:editing": "ad19d6aa5819634499742a505c8290f7bd0a4986c637427c9ab920ec1a45dca9"
};

for (const variant of variants) {
  for (const editing of [false, true]) {
    const mode = editing ? 'editing' : 'visitor';
    test(`${variant} preserves exact parameterless ${mode} markup from a363d555`, () => {
      const html = render(variant, input(editing));
      assert.equal(createHash('sha256').update(html).digest('hex'), BASELINE_HASHES[`${variant}:${mode}`]);
      assert.ok(contentTokens(html).includes('u-text-center'));
      assert.doesNotMatch(html, /<h1\b/);
    });
    for (const alignment of ['left', 'center', 'right']) {
      test(`${variant} native alignment ${alignment} affects the inner ${mode} content`, () => {
        const props = input(editing, { styles: `position-${alignment} custom-introduction-style` });
        const before = JSON.stringify(props);
        const html = render(variant, props);
        assert.ok(rootTokens(html).includes(`position-${alignment}`));
        assert.ok(rootTokens(html).includes('custom-introduction-style'));
        const tokens = contentTokens(html);
        assert.deepEqual(tokens.filter((token) => /^u-text-(left|center|right)$/.test(token)),
          [`u-text-${alignment}`], 'An inner !important default must not defeat the selected alignment');
        assert.equal(JSON.stringify(props), before, 'Native fields, metadata and rendering props are immutable');
        assert.ok(html.includes(body), 'Stored Rich Text, emphasis and its local link must stay unchanged');
        if (variant !== 'Plain') assert.ok(html.includes(heading));
        if (editing) assert.match(html, /22222222-2222-4222-8222-222222222222|33333333-3333-4333-8333-333333333333/);
      });
    }
    test(`${variant} restores centered ${mode} defaults after clearing styles`, () => {
      const cleared = render(variant, input(editing, { styles: '' }));
      assert.equal(cleared, render(variant, input(editing)));
      assert.ok(contentTokens(cleared).includes('u-text-center'));
    });
    test(`${variant} keeps cleared native fields empty in ${mode} mode`, () => {
      const html = render(variant, input(editing, { styles: 'position-left' }, datasource('', '')));
      assert.doesNotMatch(html, /Native introduction heading|source paragraph|\[No text in field\]/);
      assert.ok(rootTokens(html).includes('position-left'));
    });
    test(`${variant} retains its missing datasource fallback in ${mode} mode`, () => {
      const props = input(editing, { styles: 'position-right' });
      props.fields = {};
      const html = render(variant, props);
      assert.match(html, /Add a datasource for Product Introduction/);
      assert.doesNotMatch(html, /Native introduction heading|source paragraph/);
    });
  }
}

test('installed SDK normalizes string Styles/GridParameters before component rendering', () => {
  const normalized = getSXAParams({ componentName: 'ProductIntroduction', params: {
    GridParameters: 'col-12', Styles: 'position-left custom-introduction-style',
  } });
  assert.equal(normalized.styles, 'col-12 position-left custom-introduction-style');
  for (const variant of variants) {
    const html = render(variant, input(false, normalized));
    for (const token of ['col-12', 'position-left', 'custom-introduction-style']) assert.ok(rootTokens(html).includes(token));
    assert.ok(contentTokens(html).includes('u-text-left'));
  }
});

test('installed SDK detailed rendering params retain style Value.value and grid value', () => {
  const normalized = getSXAParams({ componentName: 'ProductIntroduction', params: {
    GridParameters: { value: 'col-12' }, Styles: { Value: { value: 'position-right custom-introduction-style' } },
  } });
  assert.equal(normalized.styles, 'col-12 position-right custom-introduction-style');
  for (const variant of variants) {
    const html = render(variant, input(true, normalized));
    assert.ok(rootTokens(html).includes('custom-introduction-style'));
    assert.ok(contentTokens(html).includes('u-text-right'));
  }
});

test('styles normalized to empty do not revive a raw Styles or CSSStyles value', () => {
  const normalized = getSXAParams({ componentName: 'ProductIntroduction', params: {
    GridParameters: { Value: { value: '' } }, Styles: { Value: { value: '' } },
  } });
  assert.equal(normalized, undefined);
  for (const variant of variants) {
    const html = render(variant, input(false, {
      Styles: 'position-left', CSSStyles: 'position-right', styles: '',
    }));
    assert.deepEqual(contentTokens(html).filter((token) => /^u-text-(left|center|right)$/.test(token)), ['u-text-center']);
    assert.ok(!rootTokens(html).some((token) => /^position-(left|right)$/.test(token)));
  }
});

test('normalization preserves valid styling tokens and removes duplicates', () => {
  const params = { styles: '  position-left custom-introduction-style  custom-introduction-style\ncol-12\tposition-left ' };
  const before = JSON.stringify(params);
  const result = helper(params);
  assert.deepEqual(result.wrapperStyles.split(/\s+/), ['position-left', 'custom-introduction-style', 'col-12']);
  assert.equal(result.contentAlignmentClass, 'u-text-left');
  assert.equal(JSON.stringify(params), before);
});

test('conflicting native alignment choices safely retain the centered default', () => {
  for (const styles of ['position-left position-right', 'position-center position-left', 'position-right position-center']) {
    const result = helper({ styles: `${styles} custom-introduction-style` });
    assert.equal(result.contentAlignmentClass, 'u-text-center');
    assert.equal(result.wrapperStyles, 'custom-introduction-style');
    for (const variant of variants) {
      const html = render(variant, input(false, { styles }));
      assert.deepEqual(contentTokens(html).filter((token) => /^u-text-(left|center|right)$/.test(token)), ['u-text-center']);
      assert.ok(!rootTokens(html).some((token) => /^position-(left|center|right)$/.test(token)));
    }
  }
});

test('raw unresolved style identifiers never become CSS classes or alignment overrides', () => {
  // The letter-leading UUID would otherwise be a syntactically valid CSS token.
  for (const id of ['6B3C3F54-9B3A-465A-8F15-B8EC0485B4CA', 'abcdefab-cdef-4abc-8def-abcdefabcdef']) {
    for (const raw of [id, `{${id}}`, `%7B${id}%7D`]) {
      const normalized = getSXAParams({ componentName: 'ProductIntroduction', params: { Styles: raw } });
      const result = helper(normalized);
      assert.equal(result.wrapperStyles, '');
      assert.equal(result.contentAlignmentClass, 'u-text-center');
      for (const variant of variants) assert.ok(!render(variant, input(false, normalized)).includes(id));
    }
  }
});

test('malformed class syntax cannot create attributes, markup or an arbitrary class expression', () => {
  const malformed = 'position-left" onclick="test-injected() <svg/onload=test-injected()> foo:bar a{b} data-x=bad';
  const result = helper({ styles: malformed });
  assert.equal(result.wrapperStyles, '');
  assert.equal(result.contentAlignmentClass, 'u-text-center');
  for (const variant of variants) {
    const html = render(variant, input(false, { styles: malformed }));
    assert.doesNotMatch(html, /test-injected|onclick=|onload=|foo:bar|a\{b\}|data-x=bad/);
  }
});

test('missing or unexpected normalized style values keep the public default', () => {
  for (const params of [undefined, {}, { styles: null }, { styles: 9 }, { styles: {} }, { styles: [] }]) {
    assert.deepEqual(helper(params), { wrapperStyles: '', contentAlignmentClass: 'u-text-center' });
  }
});
