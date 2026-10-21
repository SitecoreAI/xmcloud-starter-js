import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { compile, filename, metadata, params, renderSDK, require } from './optional-icons-fixture.mjs';

const React = require('react');
const sdkFilename = path.join(path.dirname(require.resolve('@sitecore-content-sdk/nextjs')), 'components/RichText.js');
const observed = [];
const Components = compile(fs.readFileSync(filename, 'utf8'), { observe: observed });
// Reuse the captured native field, including its relative href and blank target.
// Its dated identity is fixture evidence, not proof of a current CMS binding.
const arrowTests = fs.readFileSync(new URL('./body-arrow-links.test.mjs', import.meta.url), 'utf8');
const nativeArrowField = JSON.parse(arrowTests.match(/const NATIVE_BODY = ([\s\S]*?);\nconst OWNER/)[1]);
const nativeArrow = () => ({ id: nativeArrowField.metadata.datasource.id,
  body: { jsonValue: structuredClone(nativeArrowField) } });

function bodyRender(variant, data, mode, layout = 'plain') {
  observed.length = 0;
  const html = renderSDK(Components[variant], data, params({ layout }), mode);
  const calls = observed.filter(({ name }) => name === 'RichText');
  assert.equal(calls.length, 1, 'the body-only input must produce one SDK RichText');
  return { html, props: calls[0] };
}

// No DOM runtime is installed. Only DOM selection, refs/effect scheduling and
// router hooks are mocked. The unmodified installed SDK module executes its own
// effect, prefetch logic and listener callback; Node EventTarget dispatches clicks.
// This is unit coverage, not browser hydration or native Page Builder acceptance.
function mountSdk(props, routerKind = 'app') {
  const effects = [], queries = [], prefetches = [], pushes = [];
  class Anchor extends EventTarget {
    constructor(href, target) {
      super();
      this.rawHref = href;
      this.href = new URL(href, 'https://routing-unit.invalid').href;
      this.pathname = new URL(this.href).pathname;
      this.target = target;
      this.attached = [];
    }
    addEventListener(type, listener, options) {
      this.attached.push(type);
      super.addEventListener(type, listener, options);
    }
  }
  const anchors = [...props.field.value.matchAll(/<a\b([^>]*)>/gi)].map(([, attributes]) => {
    const attribute = (name) => attributes.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1] ?? '';
    return new Anchor(attribute('href'), attribute('target'));
  });
  const root = { querySelectorAll(selector) {
    queries.push(selector);
    // Deliberately limited adapter for the SDK default and the empty selection.
    if (selector === ':not(*)') return [];
    assert.equal(selector, 'a[href^="/"]', 'unsupported selector in the DOM adapter');
    return anchors.filter(({ rawHref }) => rawHref.startsWith('/'));
  } };
  const router = { prefetch: (...args) => prefetches.push(args), push: (...args) => pushes.push(args) };
  const sdkModule = new Module(sdkFilename);
  sdkModule.filename = sdkFilename;
  sdkModule.paths = Module._nodeModulePaths(path.dirname(sdkFilename));
  const nativeRequire = sdkModule.require.bind(sdkModule);
  sdkModule.require = (specifier) => {
    if (specifier === 'react') return { ...React,
      useRef: () => ({ current: root }), useEffect: (effect) => effects.push(effect) };
    if (specifier === 'next/compat/router') return { useRouter: () => routerKind === 'pages' ? router : null };
    if (specifier === 'next/navigation') return { useRouter: () => routerKind === 'app' ? router : null };
    return nativeRequire(specifier);
  };
  sdkModule._compile(fs.readFileSync(sdkFilename, 'utf8'), sdkFilename);
  sdkModule.exports.RichText(props);
  assert.equal(effects.length, 1, 'exercise the installed SDK routing effect');
  effects.forEach((effect) => effect());
  return { anchors, queries, prefetches, pushes,
    click(index = 0) {
      const event = new Event('click', { cancelable: true });
      anchors[index].dispatchEvent(event);
      return event;
    } };
}

test('projected editing native relative arrow does not prefetch or attach routing listeners in any Default layout', () => {
  for (const layout of ['plain', 'rich-text', 'disclosures']) {
    const data = nativeArrow(), before = JSON.stringify(data);
    const { html, props } = bodyRender('BodyArrowLinks', data, 'editing', layout);
    const mounted = mountSdk(props);
    assert.equal(mounted.anchors.length, 1);
    assert.match(mounted.anchors[0].rawHref, /^\/for-financial-professionals\//);
    assert.deepEqual(mounted.prefetches, []);
    assert.deepEqual(mounted.anchors[0].attached, []);
    assert.equal(mounted.click().defaultPrevented, false);
    assert.deepEqual(mounted.pushes, []);
    assert.deepEqual(metadata(html), metadata(renderSDK(Components.Default, data, params({ layout }), 'editing')),
      'retain the ordinary SDK serialization of the original outer native field');
    assert.equal(JSON.stringify(data), before);
  }
});

test('unguarded installed SDK control exposes the native relative-arrow routing regression', () => {
  const { props } = bodyRender('BodyArrowLinks', nativeArrow(), 'editing');
  const unguarded = { ...props };
  delete unguarded.internalLinksSelector;
  const mounted = mountSdk(unguarded);
  assert.equal(mounted.prefetches.length, 1);
  assert.deepEqual(mounted.anchors[0].attached, ['click']);
  assert.equal(mounted.click().defaultPrevented, true);
  assert.deepEqual(mounted.pushes, [[mounted.anchors[0].href]]);
});

test('ordinary native editing retains its original SDK editing behavior without routing effects', () => {
  const data = nativeArrow();
  const { html, props } = bodyRender('Default', data, 'editing');
  const mounted = mountSdk(props);
  assert.deepEqual(mounted.queries, []);
  assert.deepEqual(mounted.prefetches, []);
  assert.deepEqual(mounted.anchors[0].attached, []);
  assert.equal(mounted.click().defaultPrevented, false);
  assert.deepEqual(mounted.pushes, []);
  assert.equal(props.field, data.body.jsonValue);
  assert.deepEqual(metadata(html).map(({ fieldId }) => fieldId), [data.body.jsonValue.metadata.fieldId]);
});

// The captured arrow owner restores an absolute official href for visitors.
// Unscoped synthetic relative links provide the routing-positive controls.
for (const variant of ['Default', 'BodyArrowLinks', 'BodyDownloadLinks']) {
  for (const mode of ['normal', 'preview']) for (const routerKind of ['app', 'pages']) {
    test(`${variant}: ${mode} preserves ${routerKind} router prefetch and click handling for relative links`, () => {
      const value = variant === 'BodyDownloadLinks'
        ? '<p><a class="a-link" href="/about"><span class="a-link__icon" aria-hidden="true"></span><span class="a-link__text">About</span></a></p>'
        : '<a href="/about" target="">About</a>';
      const data = { id: 'synthetic-routing-owner', body: { jsonValue: { value } } };
      const { props } = bodyRender(variant, data, mode);
      const mounted = mountSdk(props, routerKind);
      assert.deepEqual(mounted.prefetches, routerKind === 'app' ? [['/about']] : [['/about', undefined, { locale: false }]]);
      assert.deepEqual(mounted.anchors[0].attached, ['click']);
      assert.equal(mounted.click().defaultPrevented, true);
      assert.deepEqual(mounted.pushes, routerKind === 'app'
        ? [[mounted.anchors[0].href]] : [[mounted.anchors[0].href, mounted.anchors[0].href, { locale: false }]]);
    });
  }
}

test('projected editing download links also suppress routing for a synthetic relative nonblank-target input', () => {
  const value = '<p><a class="a-link" href="/about" target="_self"><span class="a-link__icon" aria-hidden="true"></span><span class="a-link__text">About</span></a></p>';
  const data = { id: 'synthetic-routing-owner', body: { jsonValue: { value,
    metadata: { itemId: 'synthetic-routing-owner', fieldId: 'synthetic-body', fieldType: 'Rich Text' } } } };
  const { props } = bodyRender('BodyDownloadLinks', data, 'editing');
  const mounted = mountSdk(props);
  assert.deepEqual(mounted.prefetches, []);
  assert.deepEqual(mounted.anchors[0].attached, []);
  assert.equal(mounted.click().defaultPrevented, false);
  assert.deepEqual(mounted.pushes, []);
});
