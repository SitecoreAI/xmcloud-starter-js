import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { component, contract, render, wire, field, editingIds, sourceRoot } from './runtime.mjs';
import { assertSourceWitness, sourceWitnessEvidence } from '../../newsroom-company-profile/__tests__/source-witness-hash.mjs';

const { Default, Overlay, NewsroomShort } = component('company-hero', 'CompanyHero');
const { companyHeroFields } = contract('company-hero');
const source = fs.readFileSync(new URL('./newsroom-short.source.html', import.meta.url), 'utf8');
const data = {
  heading: field('short-heading', 'Single-Line Text', /<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/.exec(source)[1]),
  subtitle: field('short-subtitle', 'Rich Text', /<p\b[^>]*>\s*([\s\S]*?)\s*<\/p>/.exec(source)[1]),
  image: field('short-image', 'Image', { src: /\ssrc="([^"]*)"/.exec(source)[1], alt: /\salt="([^"]*)"/.exec(source)[1] }),
};

test('NewsroomShort matches the canonical short-cover hero and keeps the existing default alias', () => {
  assertSourceWitness(source, sourceWitnessEvidence.hero);
  assert.equal(Default, Overlay);
  const html = render(NewsroomShort, data);
  assert.match(html, /l-container-full-width allianz-newsroom-short-hero/);
  assert.match(html, /c-image c-stage__image--cover c-stage__image--short/);
  assert.match(html, /<h1 class="c-heading c-hero__headline u-text-center">Allianz Life newsroom<\/h1>/);
  assert.match(html, /<p class="h4 c-heading c-hero__subHeadline u-text-center">News releases, research studies, interview resources, and more<\/p>/);
  assert.equal((html.match(/<picture/g) ?? []).length, (source.match(/<picture/g) ?? []).length);
  assert.match(html, /alt=""/);
  assert.ok(html.includes(`src="${data.image.jsonValue.value.src}"`));
  assert.doesNotMatch(html, /m-hero-overlay|<source/);
  assert.equal(render(NewsroomShort, wire(data)), html);
  assert.equal(render(NewsroomShort, data, false, { theme: 'green', alignment: 'left', headingLevel: 'h3', imageHeight: 'large' }), html);
  assert.match(render(Overlay, data), /c-hero m-hero-overlay allianz-company-hero/);
  assert.match(render(NewsroomShort, data, false, { RenderingIdentifier: 'newsroom-hero' }), /id="newsroom-hero"/);
  const css = fs.readFileSync(path.join(sourceRoot, 'components/company-hero/NewsroomShort.css'), 'utf8');
  assert.match(css, /@media \(min-width: 992px\)/);
  assert.match(css, /max-height: 300px/);
});

test('NewsroomShort retains clears and native edit metadata, and does not nest Rich Text paragraphs', () => {
  const cleared = { ...data, heading: field('short-heading', 'Single-Line Text', ''), subtitle: field('short-subtitle', 'Rich Text', ''),
    image: field('short-image', 'Image', {}), body: data.subtitle, desktopImage: data.image };
  assert.deepEqual(editingIds(render(NewsroomShort, cleared, true)), ['short-heading', 'short-image', 'short-subtitle']);
  assert.doesNotMatch(render(NewsroomShort, cleared), /Allianz Life newsroom|News releases|<img|<h1/);
  const projected = companyHeroFields(wire(cleared));
  assert.equal(projected.heading.jsonValue, cleared.heading.jsonValue);
  assert.equal(projected.subtitle.jsonValue, cleared.subtitle.jsonValue);
  assert.equal(projected.image.jsonValue, cleared.image.jsonValue);
  const block = { ...data, subtitle: field('short-html', 'Rich Text', '<p>Authored <strong>subtitle</strong> remains intact.</p>') };
  assert.match(render(NewsroomShort, block), /<div class="h4 c-heading c-hero__subHeadline u-text-center"><p>Authored <strong>subtitle<\/strong> remains intact\.<\/p><\/div>/);
  assert.match(render(NewsroomShort, undefined), /Add a datasource for Company Hero/);
});
