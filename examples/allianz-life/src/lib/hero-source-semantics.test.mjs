import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, field, metadata, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { safeEditorialRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial.ts'));
const { allianzLinkField } = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
const Legal = loadSource(path.join(sourceRoot, 'components/legal-disclosures/LegalDisclosures.tsx'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Link } = require('@sitecore-content-sdk/nextjs');
const image = { src: '/hero.jpg', width: '2368', height: '600' };
const nativeImage = (value, name) => ({ jsonValue: { value, metadata: metadata(name, 'Image') } });
const datasource = value => ({ desktopImage: nativeImage(value, 'desktop'),
  mobileImage: nativeImage({ src: '/mobile.jpg', alt: 'Mobile authored description' }, 'mobile'), heading: field('Hero heading') });
const heroImg = html => (html.match(/<img\b[^>]*class="c-image__img c-hero__image"[^>]*>/g) || [])[0];
const layouts = [['default', 'Default', {}], ['home', 'Default', { layout: 'home' }], ['editorial', 'Editorial', {}]];

for (const [label, variant, params] of layouts) {
  test(`${label} Hero explicitly renders blank or missing alt and preserves authored descriptions`, () => {
    for (const [value, expected] of [
      [image, ''], [{ ...image, alt: '' }, ''], [{ ...image, alt: null }, ''],
      [{ ...image, alt: 'Clients planning retirement' }, 'Clients planning retirement'],
      [{ ...image, alt: 'A "quote" & <symbol>' }, 'A &quot;quote&quot; &amp; &lt;symbol&gt;'],
    ]) {
      const data = datasource(value), before = JSON.stringify(data);
      const html = render(Hero[variant], data, false, params), img = heroImg(html);
      assert.ok(img.includes(`alt="${expected}"`));
      assert.match(img, /width="2368"/);
      assert.match(img, /height="600"/);
      assert.match(img, /src="\/hero.jpg"/);
      assert.match(html, /<source media="\(max-width: 703px\)" srcSet="\/mobile.jpg"\/>/);
      assert.equal(JSON.stringify(data), before);
    }
  });
  test(`${label} Hero preserves desktop/mobile editing metadata and populated descriptions`, () => {
    for (const value of [image, { ...image, alt: 'Authored desktop description' }]) {
      const data = datasource(value), before = JSON.stringify(data);
      const html = render(Hero[variant], data, true, params);
      for (const name of ['desktop', 'mobile']) assert.ok(html.includes(`test-${name}-field`));
      assert.ok(heroImg(html).includes(`alt="${value.alt ?? ''}"`));
      assert.match(html, /alt="Mobile authored description"/);
      assert.equal(JSON.stringify(data), before);
    }
  });
  test(`${label} Hero preserves empty native editor placeholders and suppresses absent public images`, () => {
    const data = { desktopImage: nativeImage({}, 'desktop'), mobileImage: nativeImage({}, 'mobile') };
    assert.doesNotMatch(render(Hero[variant], data, false, params), /<img\b/);
    const html = render(Hero[variant], data, true, params);
    for (const name of ['desktop', 'mobile']) assert.ok(html.includes(`test-${name}-field`));
    assert.equal((html.match(/class="scEmptyImage/g) || []).length, 2);
    for (const missing of [{}, undefined]) assert.doesNotMatch(render(Hero[variant], missing, false, params), /<img\b/);
  });
}

function withMode(mode, run) {
  const node = process.env.NODE_ENV, content = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
  try { run(); } finally {
    if (node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = node;
    if (content === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE; else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = content;
  }
}
const link = (href, attributes = {}) => ({ value: { href, text: 'Allianz Life', ...attributes }, metadata: metadata('source-link', 'General Link') });
const outputHref = (input) => renderToStaticMarkup(React.createElement(Link, { ...safeLinkRenderProps(input), editable: false }))
  .match(/href="([^"]*)"/)?.[1].replaceAll('&amp;', '&');

for (const mode of ['fixture', 'connected']) {
  test(`${mode}: only the exact bare public hostname root becomes the demo home`, () => withMode(mode, () => {
    for (const href of ['www.allianzlife.com', 'www.allianzlife.com/', 'WWW.AllianzLife.COM']) {
      const input = link(href), before = JSON.stringify(input), output = safeLink(input);
      assert.equal(output.value.href, '/');
      assert.equal(outputHref(input), '/');
      assert.strictEqual(output.metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
    }
    for (const href of ['www.allianzlife.com.evil.example', 'www.allianzlife.com@evil.example', 'www.allianzlife.com:443',
      'www.allianzlife.com/about', 'www.allianzlife.com//evil.example', '/www.allianzlife.com', 'allianzlife.com']) {
      assert.notEqual(safeLink(link(href)).value.href, '/', href);
    }
  }));
  test(`${mode}: bare home URL preserves combined and native query/fragment rules in the real SDK`, () => withMode(mode, () => {
    assert.equal(outputHref(link('www.allianzlife.com?tag=one&tag=two&q=a%23b&term=c%26d#overview')), '/?tag=one&tag=two&q=a%23b&term=c%26d#overview');
    assert.equal(outputHref(link('www.allianzlife.com/?existing=1#captured', { querystring: '?native=2', anchor: '#native' })), '/?existing=1&native=2#native');
    assert.equal(outputHref(link('www.allianzlife.com?q=a%23b', { querystring: 'q=a%23b', anchor: 'details' })), '/?q=a%23b#details');
    assert.equal(outputHref(link('www.allianzlife.com#section')), '/#section');
    for (const href of ['www.allianzlife.com#service-unavailable', 'www.allianzlife.com/#demo-unavailable']) {
      assert.equal(outputHref(link(href, { querystring: 'private=1', target: '_blank' })), '#service-unavailable');
    }
  }));
  test(`${mode}: lookalike origins, unsafe protocols and restricted paths retain the service policy`, () => withMode(mode, () => {
    for (const href of ['https://www.allianzlife.com.evil.example/', 'https://www.allianzlife.com@evil.example/',
      '//evil.example/', 'https://evil.example/www.allianzlife.com', 'http://www.allianzlife.com/',
      'https://user:password@www.allianzlife.com/', 'javascript:alert(1)', 'data:text/html,blocked',
      'mailto:service@example.invalid', 'tel:12345', '/login', '/api/private', '/%2flogin', '/%5clogin']) {
      assert.equal(outputHref(link(href, { querystring: 'private=1', anchor: 'old', target: '_blank' })), '#service-unavailable', href);
    }
    assert.equal(outputHref(link('https://www.allianzlife.com/')), '/');
    assert.equal(outputHref(link('/about?view=public#overview')), '/about?view=public#overview');
    assert.equal(outputHref(link('#section')), '#section');
    assert.equal(outputHref(link('?q=a%23b#section')), '?q=a%23b#section');
  }));
  test(`${mode}: source legal HTML normalizes only href while preserving text, metadata and editor identity`, () => withMode(mode, () => {
    const value = '<p>Issued by Allianz Life. <a href="www.allianzlife.com">www.allianzlife.com</a></p>';
    const input = { value, metadata: metadata('legal-body', 'Rich Text') }, before = JSON.stringify(input);
    const output = safeEditorialRichText(input, false);
    assert.equal(output.value, value.replace('href="www.allianzlife.com"', 'href="/"'));
    assert.strictEqual(output.metadata, input.metadata);
    assert.strictEqual(safeEditorialRichText(input, true), input);
    assert.equal(JSON.stringify(input), before);
    const generalLink = link('www.allianzlife.com');
    assert.strictEqual(allianzLinkField(generalLink, true), generalLink);
    assert.equal(allianzLinkField(generalLink, false).value.href, '/');
    const attrs = { value: '<a target="_blank" rel="author" href="www.allianzlife.com/?a=1&amp;a=2#part">Site</a>' };
    const normal = safeEditorialRichText(attrs, false).value;
    assert.match(normal, /href="\/\?a=1&amp;a=2#part"/);
    assert.match(normal, /target="_blank"/);
    assert.match(normal, /rel="author noopener noreferrer"/);
  }));
}

test('LegalDisclosures Faq real SDK output keeps native bare URL in editor and maps visitor output home', () => withMode('connected', () => {
  const input = { body: { jsonValue: { value: '<p><a href="www.allianzlife.com">www.allianzlife.com</a></p>', metadata: metadata('legal-body', 'Rich Text') } } };
  const before = JSON.stringify(input);
  assert.match(render(Legal.Faq, input), /href="\/">www.allianzlife.com<\/a>/);
  const editor = render(Legal.Faq, input, true);
  assert.match(editor, /href="www.allianzlife.com">www.allianzlife.com<\/a>/);
  assert.match(editor, /test-legal-body-field/);
  assert.equal(JSON.stringify(input), before);
}));
