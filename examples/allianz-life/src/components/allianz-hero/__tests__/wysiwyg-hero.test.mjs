import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, metadata } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const field = (name, value, type = 'Rich Text') => ({ jsonValue: { value, metadata: metadata(name, type) } });
const datasource = () => ({
  heading: field('heading', 'Our commitment to you and your clients'),
  eyebrow: field('eyebrow', ''), body: field('body', ''),
  primaryLink: field('primary', { href: '', text: '' }, 'General Link'),
  secondaryLink: field('secondary', { href: '', text: '' }, 'General Link'),
  desktopImage: field('desktop', { src: '/desktop.jpg', width: '2000', height: '800', alt: 'Desktop handshake' }, 'Image'),
  mobileImage: field('mobile', { src: '/mobile.jpg', width: '704', height: '800', alt: 'Mobile handshake' }, 'Image'),
});
const visual = (html) => html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '');
const variants = [
  ['Default', { layout: 'home', showLogin: '1' }], ['Default', { layout: 'stage' }],
  ['Editorial', {}], ['LifeStrategy', {}], ['FixedProduct', {}], ['RilaHero', {}], ['IapHero', {}],
];

for (const [variant, params] of variants) test(`${variant} ${params.layout ?? ''}: one responsive hero and no optional canvas artifacts`, () => {
  const data = datasource(), before = JSON.stringify(data);
  const visitor = render(Hero[variant], data, false, params);
  const editing = render(Hero[variant], data, true, params);
  assert.equal((editing.match(/<img\b/g) ?? []).length, 1);
  assert.match(editing, /<source media="\(max-width: 703px\)" srcSet="\/mobile.jpg"/);
  assert.doesNotMatch(editing, /Mobile image|scEmptyImage|\[No text in field\]|test-(?:body|eyebrow|primary|secondary|mobile)-field/);
  assert.match(editing, /test-desktop-field/);
  assert.match(editing, /test-heading-field/);
  assert.equal(visual(editing), visitor);
  // Both original native fields remain available to the content-field editor.
  assert.equal(JSON.stringify(data), before);
  assert.equal(data.mobileImage.jsonValue.metadata.fieldId, 'test-mobile-field');
  assert.equal(data.mobileImage.jsonValue.value.src, '/mobile.jpg');
});

for (const [variant, params] of variants) test(`${variant} ${params.layout ?? ''}: cleared optional fields do not create empty chrome`, () => {
  const data = datasource();
  data.heading.jsonValue.value = '';
  data.desktopImage.jsonValue.value = {};
  data.mobileImage.jsonValue.value = {};
  const before = JSON.stringify(data);
  const editing = render(Hero[variant], data, true, params);
  assert.doesNotMatch(editing, /Mobile image|scEmptyImage|\[No text in field\]|<img\b|<source\b|chrometype="field"/);
  assert.equal(visual(editing), render(Hero[variant], data, false, params));
  assert.equal(JSON.stringify(data), before);
});
