import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, field, metadata } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const image = (value, name) => ({ jsonValue: { value, metadata: metadata(name, 'Image') } });

test('RilaHero freezes product-variable stage while preserving current authored fields', () => {
  const data = { heading: field('Build your future with Allianz® RILAs'), body: field(''),
    desktopImage: image({ src: '/current-cropped.jpg', width: '2000', height: '600', alt: ' ' }, 'desktop'),
    mobileImage: image({ src: '/authored-mobile.jpg', alt: '' }, 'mobile') };
  const before = JSON.stringify(data);
  const html = render(Hero.RilaHero, data, false, { RenderingIdentifier: 'native-rila-hero', theme: 'invalid', heroTheme: 'life', showLogin: '1' });
  assert.match(html, /t-bg-product-variable c-hero__theme--variable/);
  assert.match(html, /id="native-rila-hero"/);
  assert.match(html, /<h1 class="c-heading c-hero__headline u-text-center">Build your future with Allianz® RILAs<\/h1>/);
  assert.match(html, /src="\/current-cropped.jpg"/);
  assert.match(html, /width="2000" height="600"/);
  assert.match(html, /srcSet="\/authored-mobile.jpg"/);
  assert.doesNotMatch(html, /t-bg-invalid|c-hero__theme--life|loginForm|iframe|c-hero__subHeadline/);
  assert.equal(JSON.stringify(data), before);
});

test('RilaHero keeps author fields editable and handles block headings safely', () => {
  const data = { heading: field('<p>Authored heading</p>'), body: field(''),
    desktopImage: image({}, 'desktop'), mobileImage: image({}, 'mobile') };
  const html = render(Hero.RilaHero, data, true, {});
  assert.match(html, /role="heading" aria-level="1"/);
  assert.doesNotMatch(html, /<h1[^>]*><p/);
  for (const name of ['desktop', 'mobile']) assert.ok(html.includes(`test-${name}-field`));
  const cleared = render(Hero.RilaHero, { heading: field(''), body: field(''), desktopImage: image({}, 'desktop') }, false, {});
  assert.doesNotMatch(cleared, /<img|c-hero__headline|c-hero__subHeadline/);
  assert.match(render(Hero.RilaHero, undefined), /AllianzHero/);
});
