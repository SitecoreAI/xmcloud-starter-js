import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { require, sourceRoot, loadSource, render } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { ComponentPropsContext } = require('@sitecore-content-sdk/nextjs');
const { Default } = loadSource(path.join(sourceRoot, 'components/ventures-team/VenturesTeam.tsx'));
const uid = 'test-ventures-team';
const field = (value, name, itemId = 'test-listing-page') => ({ jsonValue: { value, metadata: {
  fieldId: `test-${name}-field`, itemId, fieldType: typeof value === 'object' ? 'Image' : 'Single-Line Text',
} } });
const text = (html) => html.replace(/<[^>]*>/g, '').replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
const count = (html, re) => [...html.matchAll(re)].length;
const definitions = [
  {
    pageId: '28D33103-FDC6-42C5-A621-A1496E3B907E', biographyId: 'A5352B71-3311-4DFB-8A5B-001AF2F9B2A3',
    slug: 'collin-bhojwani', name: 'Collin Bhojwani', role: 'Head of Allianz Life Ventures',
    summary: 'Collin leads the Ventures program, shaping investment strategy and forging partnerships that advance the long‑term priorities of Allianz Life.',
    focus: ['Investment strategy and portfolio direction', 'Partnerships aligned to enterprise priorities', 'Founder support and long‑term value creation'],
    bioLabel: "View Collin's bio", social: 'https://www.linkedin.com/in/collin-bhojwani/',
    portrait: { src: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/3382a990da5c4fc2a5f874398e9a0290?v=c84d72f7', alt: 'collin bhojwani', width: '768', height: '960' },
  },
  {
    pageId: '663C4CEA-343B-4050-A2A4-174CC8DB9933', biographyId: 'C0A932D8-9F09-49F8-B825-EF0B87AA1D5E',
    slug: 'ron-gonen', name: 'Ron Gonen', role: 'Managing Director',
    summary: 'Ron sources and evaluates new investment opportunities while supporting portfolio companies with strategic guidance and venture experience.',
    focus: ['Deal sourcing and evaluation', 'Portfolio support and growth strategy', 'Market and technology insights'],
    bioLabel: "View Ron's bio", social: 'https://www.linkedin.com/in/rongonen/',
    portrait: { src: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/9dde33e00c044699bed91ef3323b3681?v=8057c8f9', alt: 'ron gonen', width: '768', height: '960' },
  },
  {
    pageId: '04CE0ACF-6EE6-4770-ACE5-AB2052243D7C', biographyId: 'EDB4DA37-AA2D-42B4-90C7-8CB8AD7FE812',
    slug: 'taylor-sieverling', name: 'Taylor Sieverling', role: 'Senior Analyst',
    summary: 'Taylor supports sourcing, analysis, and portfolio management, helping assess emerging technologies and new market opportunities.',
    focus: ['Deal sourcing and evaluation', 'Financial and strategic analysis', 'Portfolio monitoring and reporting'],
    bioLabel: "View Taylor's bio", social: 'https://www.linkedin.com/in/taylor-sieverling',
    portrait: { src: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/17c1d4bb13db448ba905ce9b4b44887c?v=67379090', alt: '', width: '768', height: '960' },
  },
  {
    pageId: '241A667E-C7BE-4863-A694-34D56790264C', biographyId: '80DB5A2A-730E-45B4-BFF7-69B7395BA304',
    slug: 'clay-bottensek', name: 'Clay Bottensek', role: 'Ventures Analyst',
    summary: 'Clay supports Ventures investment activities, helping source and evaluate innovative startups and emerging technologies.',
    focus: ['Insurtech, fintech, and AI startups', 'Venture capital market and technology trends', 'Early-stage company evaluation and due diligence'],
    bioLabel: 'View Clay’s bio', social: 'https://www.linkedin.com/in/clay-bottensek/', portrait: {},
  },
];
function fixture() {
  return { complete: true, status: 'ready', items: definitions.map((person) => ({
    pageId: person.pageId, biographyId: person.biographyId, href: `/about/ventures/${person.slug}`,
    name: field(person.name, 'name', person.biographyId), role: field(person.role, 'listing-role', person.pageId), roleFormat: 'text',
    portrait: field({ ...person.portrait }, 'portrait', person.biographyId),
    summary: field(`<p>${person.summary}</p>`, 'listing-summary', person.pageId),
    focus: field(`<p>Focus areas:</p><ul>${person.focus.map((item) => `<li>${item}</li>`).join('')}</ul>`, 'listing-focus', person.pageId),
    bioLinkText: field(person.bioLabel, 'bio-label', person.pageId),
    socialLink: field({ href: person.social, text: `Connect with ${person.name.split(' ')[0]} on LinkedIn`, target: '_blank', linktype: 'external' }, 'social-link', person.pageId),
  })) };
}
const Wrapper = ({ fields, params }) => {
  const input = fields?.data?.datasource;
  return React.createElement(ComponentPropsContext, { value: input?.componentProps ?? {
    [uid]: { automaticVenturesTeam: input?.automatic },
  } }, React.createElement(Default, { rendering: { uid, componentName: 'VenturesTeam' }, params,
    fields: input?.missingDatasource ? undefined : { data: { datasource: { id: 'test-team-datasource' } } },
  }));
};
const renderTeam = (automatic, editing = false, extra = {}) => render(Wrapper, { automatic, ...extra }, editing);

test('the four source profiles keep exact listing copy, focus, native biography routes, three portraits and source heading order', () => {
  const input = fixture(), before = JSON.stringify(input);
  for (const editing of [false, true]) {
    const html = renderTeam(input, editing), plain = text(html);
    assert.equal(count(html, /<article\b/g), 4);
    assert.equal(count(html, /<h3\b/g), 4);
    assert.equal(count(html, /<h4\b/g), 4);
    assert.equal(count(html, /<img\b/g), 3);
    assert.equal(count(html, /<li>/g), 12);
    assert.equal(count(html, /class="tileLink"/g), 8);
    let previous = -1;
    for (const person of definitions) {
      const pos = plain.indexOf(person.name);
      assert.ok(pos > previous); previous = pos;
      for (const copy of [person.role, person.summary, 'Focus areas:', ...person.focus, person.bioLabel]) assert.ok(plain.includes(copy), copy);
      assert.ok(html.includes(`href="/about/ventures/${person.slug}"`));
      if (person.portrait.src) assert.ok(html.includes(`src="${person.portrait.src.replaceAll('&', '&amp;')}"`));
    }
    const articles = [...html.matchAll(/<article\b[^]*?<\/article>/g)].map((match) => match[0]);
    for (const [index, article] of articles.entries()) {
      if (index < 3) assert.ok(article.indexOf('class="tileContent') < article.indexOf('class="tileImage'), 'text precedes image in DOM');
      assert.equal(article.includes('-is--flipped'), index === 0 || index === 2);
    }
    assert.match(articles[3], /-no--image/);
    assert.doesNotMatch(articles[3], /tile--6633|tileImage|<img\b/);
    assert.doesNotMatch(html, /data-sc-field-id=|chrometype="field"|test-name-field/);
    assert.equal(JSON.stringify(input), before);
  }
});

test('all source LinkedIn destinations remain disabled in visitor and editing output', () => {
  for (const editing of [false, true]) {
    const html = renderTeam(fixture(), editing);
    assert.equal(count(html, /<button\b[^>]*disabled=""[^>]*aria-disabled="true"/g), 4);
    assert.equal(count(html, /title="This service is unavailable"/g), 4);
    assert.equal(count(html, /<a\b/g), 4);
    assert.doesNotMatch(html, /href="https:\/\/www\.linkedin\.com|target="_blank"|href="#service-unavailable"/);
  }
});

test('shared roles retain native HTML, overrides are plain text and hidden roles produce no fallback', () => {
  const input = fixture();
  input.items = input.items.slice(0, 1);
  const person = input.items[0];
  person.role = field('<div>Managing Director</div><div>Allianz Life Ventures</div>', 'canonical-role', person.biographyId);
  person.roleFormat = 'rich-text';
  const html = renderTeam(input);
  assert.match(html, /role="heading" aria-level="4"/);
  assert.match(html, /<div>Managing Director<\/div><div>Allianz Life Ventures<\/div>/);
  assert.doesNotMatch(html, /<h4>/);
  person.role = field('<em>New listing role</em>', 'listing-role', person.pageId);
  person.roleFormat = 'text';
  assert.match(renderTeam(input), /<h4>&lt;em&gt;New listing role&lt;\/em&gt;<\/h4>/);
  delete person.role;
  const hidden = renderTeam(input);
  assert.doesNotMatch(hidden, /Managing Director|New listing role|<h4>|aria-level="4"/);
});

test('canonical name and portrait edits and listing-only edits propagate without stale profiles or input mutation', () => {
  const input = fixture(), person = input.items[0];
  const first = renderTeam(input);
  person.name.jsonValue.value = 'Updated Collin';
  person.portrait.jsonValue.value = { src: '/updated-portrait.png', alt: 'Updated portrait' };
  person.role.jsonValue.value = 'Updated listing role';
  person.summary.jsonValue.value = '<p>Updated listing summary</p>';
  person.focus.jsonValue.value = '<p>Updated focus</p><ul><li>New focus item</li></ul>';
  const before = JSON.stringify(input), next = renderTeam(input);
  assert.notEqual(next, first);
  for (const value of ['Updated Collin', '/updated-portrait.png', 'Updated listing role', 'Updated listing summary', 'New focus item']) assert.ok(next.includes(value));
  assert.ok(!next.includes(definitions[0].summary));
  assert.equal(JSON.stringify(input), before);
});

test('cleared authorable controls stay hidden and restore exactly in both modes', () => {
  const input = fixture(); input.items = input.items.slice(0, 1);
  const original = structuredClone(input), populated = renderTeam(input);
  const person = input.items[0];
  for (const key of ['name', 'role', 'summary', 'focus', 'bioLinkText']) person[key].jsonValue.value = '';
  person.portrait.jsonValue.value = {};
  person.socialLink.jsonValue.value = {};
  const before = JSON.stringify(input);
  for (const editing of [false, true]) {
    const html = renderTeam(input, editing);
    assert.doesNotMatch(html, /<h3|<h4|<img|<footer|<a\b|<button\b|Focus areas:|Head of Allianz Life Ventures|View Collin/);
    assert.match(html, /-no--image/);
  }
  assert.equal(JSON.stringify(input), before);
  input.items = original.items;
  assert.equal(renderTeam(input), populated);
});

test('incomplete and mismatched rendering data render one unavailable state without partial rows; intentional empty selection stays empty', () => {
  const complete = fixture();
  for (const automatic of [undefined, { ...complete, complete: false, status: 'unavailable' }]) {
    const html = renderTeam(automatic);
    assert.match(html, /The Ventures team is temporarily unavailable/);
    assert.doesNotMatch(html, /<article|<h3|Collin Bhojwani/);
  }
  assert.match(renderTeam(complete, false, { componentProps: { otherUid: { automaticVenturesTeam: complete } } }), /temporarily unavailable/);
  const empty = renderTeam({ complete: true, status: 'ready', items: [] });
  assert.doesNotMatch(empty, /temporarily unavailable|<article|<h3/);
  assert.match(renderTeam(complete, false, { missingDatasource: true }), /Add a datasource for Ventures Team/);
  assert.match(renderTeam(complete, true), /Edit those pages and their Ventures team listing fields/);
});

test('source CSS supplies the 704px 66/33 layout and the listing adds scoped 16px CTA spacing', () => {
  const source = fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8');
  assert.match(source, /\.m-axlTile\.-is--split\{flex-direction:column\}/);
  assert.match(source, /@media \(min-width:704px\)\{\.m-axlTile\.-is--split\{flex-direction:row\}/);
  assert.match(source, /\.m-axlTile\.-is--split\.-is--flipped\{flex-direction:row-reverse\}/);
  assert.match(source, /\.tile--6633 \.tileContent\{width:66\.666%\}/);
  assert.match(source, /\.tile--6633 \.tileImage\{width:33\.333%\}/);
  const local = fs.readFileSync(path.join(sourceRoot, 'components/ventures-team/VenturesTeam.css'), 'utf8');
  assert.match(local, /\.ventures-team \.ventures-team__profile footer \.tileLink \+ \.tileLink\s*\{\s*margin: 16px 0 0;/);
});
