import assert from 'node:assert/strict';
import test from 'node:test';
import { component, contract, fixture, witness, render, wire, field, editingIds } from './runtime.mjs';
const { Overlay } = component('company-hero', 'CompanyHero');
const { companyHeroFields } = contract('company-hero');
const data = fixture('company-hero').datasources[0];

test('Company Hero preserves actual native text, overlay/h1 design and one-picture source contract', () => {
  const html = render(Overlay, data);
  assert.match(html, /class="l-container-full-width c-hero m-hero-overlay allianz-company-hero"/);
  assert.match(html, /<h1 class="c-heading c-hero__headline u-text-center">Why Allianz<\/h1>/);
  assert.match(html, /<p class="h4 c-heading c-hero__subHeadline u-text-center">Our mission is simple: We secure your future\.<\/p>/);
  assert.equal((witness('company-hero').match(/<picture/g) ?? []).length, 1);
  assert.equal((witness('company-hero').match(/<source/g) ?? []).length, 0);
  assert.doesNotMatch(html, /<img|<picture|Login/); // The receipt's DAM values are still blank.
  assert.equal(render(Overlay, wire(data)), html);
  assert.equal(render(Overlay, data, false, { theme: 'green-soft', alignment: 'left', headingLevel: 'h3', spacing: 'xl' }), html);
});

test('Company Hero canonical clears suppress historical fallback while SDK metadata and authored HTML survive', () => {
  const native = { ...data, heading: field('hero-heading', 'Single-Line Text', ''), subtitle: field('hero-subtitle', 'Rich Text', ''),
    image: field('hero-image', 'Image', {}) };
  assert.deepEqual(editingIds(render(Overlay, native, true)), ['hero-heading', 'hero-image', 'hero-subtitle']);
  assert.doesNotMatch(render(Overlay, native), /Why Allianz|Our mission|<img/);
  const source = { ...data, subtitle: field('hero-html', 'Rich Text', '<p>Keep <strong>authored</strong> HTML.</p>') };
  assert.match(render(Overlay, source), /<div class="h4 c-heading c-hero__subHeadline u-text-center"><p>Keep <strong>authored<\/strong> HTML\.<\/p><\/div>/);
  const projected = companyHeroFields(wire(native));
  assert.equal(projected.subtitle.jsonValue, native.subtitle.jsonValue);
  assert.equal(projected.image.jsonValue, native.image.jsonValue);
  assert.match(render(Overlay, data, false, { RenderingIdentifier: 'company-hero-id' }), /id="company-hero-id"/);
});
