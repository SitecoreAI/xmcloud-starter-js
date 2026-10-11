import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, field, metadata } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const nativeImage = (value, name) => ({ jsonValue: { value, metadata: metadata(name, 'Image') } });

// Exact text and background intent from the sealed three-route source packet.
const strategies = [
  { heading: 'Help college happen with life insurance', body: '', theme: 'product-life' },
  { heading: 'Flexible estate planning strategies', body: 'Indexed universal life (IUL) insurance can play an important role', theme: 'product-life' },
  { heading: 'Supplementing income during retirement', body: 'How indexed universal life (IUL) insurance can play a role' },
];

test('LifeStrategy renders source title/subtitle semantics and finite life background intent', () => {
  for (const { heading, body, theme } of strategies) {
    const data = { heading: field(heading), body: field(body), primaryLink: field(''), secondaryLink: field('') };
    const before = JSON.stringify(data);
    const html = render(Hero.LifeStrategy, data, false, { heroTheme: 'life', theme, RenderingIdentifier: 'native-hero' });
    assert.match(html, /id="native-hero"/);
    assert.match(html, /c-hero__theme--life/);
    assert.equal(html.includes('t-bg-product-life'), theme === 'product-life');
    if (!theme) assert.doesNotMatch(html, /t-bg-/);
    assert.ok(html.includes(`<h1 class="c-heading c-hero__headline u-text-center">${heading}</h1>`));
    if (body) assert.ok(html.includes(`<p class="h4 c-heading c-hero__subHeadline u-text-center">${body}</p>`));
    else assert.doesNotMatch(html, /c-hero__subHeadline/);
    assert.doesNotMatch(html, /<img\b|<a\b/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('LifeStrategy preserves native desktop/mobile images and editing identity without copying fields', () => {
  const data = {
    heading: { jsonValue: { value: '<p>Authored title</p>', metadata: metadata('heading', 'Rich Text') } },
    body: { jsonValue: { value: '<p>Authored subtitle</p>', metadata: metadata('body', 'Rich Text') } },
    desktopImage: nativeImage({ src: '/desktop.jpg', width: '2368', height: '600', alt: '' }, 'desktop'),
    mobileImage: nativeImage({ src: '/mobile.jpg', alt: 'Mobile authored alt' }, 'mobile'),
  };
  const before = JSON.stringify(data);
  const params = { heroTheme: 'life', theme: 'product-life' };
  const visitor = render(Hero.LifeStrategy, data, false, params);
  assert.match(visitor, /role="heading" aria-level="1"/);
  assert.doesNotMatch(visitor, /<h1[^>]*><p/);
  assert.match(visitor, /<div class="h4 c-heading c-hero__subHeadline u-text-center"><p>Authored subtitle<\/p><\/div>/);
  assert.match(visitor, /<source media="\(max-width: 703px\)" srcSet="\/mobile.jpg"\/>/);
  const img = visitor.match(/<img\b[^>]*>/)?.[0] ?? '';
  for (const attribute of ['src="/desktop.jpg"', 'alt=""', 'width="2368"', 'height="600"']) assert.ok(img.includes(attribute));
  const editor = render(Hero.LifeStrategy, data, true, params);
  for (const name of ['heading', 'body', 'desktop', 'mobile']) assert.ok(editor.includes(`test-${name}-field`));
  assert.match(editor, /alt="Mobile authored alt"/);
  assert.equal(JSON.stringify(data), before);
});

test('LifeStrategy leaves empty native fields editable and rejects raw theme class injection', () => {
  const empty = { heading: field(''), body: field(''), desktopImage: nativeImage({}, 'desktop'), mobileImage: nativeImage({}, 'mobile') };
  const visitor = render(Hero.LifeStrategy, empty);
  assert.doesNotMatch(visitor, /c-hero__headline|c-hero__subHeadline|<img\b/);
  const editor = render(Hero.LifeStrategy, empty, true);
  for (const name of ['desktop', 'mobile']) assert.ok(editor.includes(`test-${name}-field`));
  for (const theme of ['product-life injected-class', 'product-fixed', 'product-life" onclick="blocked']) {
    const html = render(Hero.LifeStrategy, { heading: field('Title') }, false, { theme, heroTheme: 'life injected-class' });
    assert.match(html, /t-bg-transparent/);
    assert.doesNotMatch(html, /injected-class|onclick|t-bg-product-|c-hero__theme--/);
  }
  assert.match(render(Hero.LifeStrategy, undefined), /AllianzHero/);
});

test('existing Hero variants retain their exact real-SDK visitor and editor output', () => {
  const data = {
    heading: field('<span>Authored title</span>'), body: field('Authored subtitle'),
    desktopImage: nativeImage({ src: '/desktop.jpg', alt: '', width: '2368', height: '600' }, 'desktop'),
    mobileImage: nativeImage({ src: '/mobile.jpg', alt: 'Mobile authored alt' }, 'mobile'),
  };
  const baselines = {
    Default: ['4505e9fa044814d4b9eb5b0b42dc66edfe434496272742cb9304a915f66807c7', '88b5b99129b2d6e13ea819b07aff3452706727b35f8a887c74fd0cad9d40a14f'],
    Editorial: ['bae657181e863d219dec845c8933b6e0a1fd66733eed089a273d3dd2f71a4e79', '99fa90c03a714336ff47223c0c0a02a2e7e51bd5febb7f4432dc073a75256a17'],
    FixedFaq: ['ce2fad09f0e925e2e413779377f5d0a8b8bae3b2220191a65a7accb096906bc7', 'ce2fad09f0e925e2e413779377f5d0a8b8bae3b2220191a65a7accb096906bc7'],
  };
  for (const [variant, hashes] of Object.entries(baselines)) {
    for (const [index, isEditing] of [false, true].entries()) {
      const html = render(Hero[variant], data, isEditing, { heroTheme: 'life', theme: 'green-soft', RenderingIdentifier: 'native-hero' });
      // Authoring thumbnails scale proportionally; all other native SDK markup stays fixed.
      const preservedOutput = isEditing ? html.replaceAll('max-width:240px;height:auto', 'max-width:240px') : html;
      assert.equal(createHash('sha256').update(preservedOutput).digest('hex'), hashes[index]);
    }
  }
});
