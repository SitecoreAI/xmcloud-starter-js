import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider, ComponentPropsContext } = require('@sitecore-content-sdk/nextjs');
const field = (name, value, fieldType = 'Single-Line Text') => ({ jsonValue: {
  value, metadata: { fieldId: name, itemId: 'canvas-test-owner', fieldType },
} });
const connection = (results) => ({ total: results.length,
  pageInfo: { hasNext: false, endCursor: results.at(-1)?.id ?? null }, results });
const people = { complete: true, items: [], groups: [], unassigned: [], missingOrder: 0 };
const releases = { complete: true, status: 'ready', items: [], missingDates: 0, missingSources: 0 };
export const cases = [
  { name: 'Product Type Choices', file: 'product-type-choices/ProductTypeChoices.tsx',
    data: { children: connection([]) }, fields: [], forbidden: /Add a product type choice/ },
  ...['Default', 'TwoUpFinal', 'ThreeUp'].map((variant) => ({ name: `Product Benefits ${variant}`,
    file: 'product-benefits/ProductBenefits.tsx', variant, data: { children: connection([]) }, fields: [],
    forbidden: /Add a benefit child/ })),
  { name: 'Executive Directory', file: 'executive-directory/ExecutiveDirectory.tsx', data: {},
    automatic: { automaticPeople: people }, fields: [], forbidden: /Edit those pages to update/ },
  { name: 'Expert Directory', file: 'expert-directory/ExpertDirectory.tsx', data: {},
    automatic: { automaticPeople: { ...people, groups: [{ id: 'empty-category',
      heading: field('empty-category-heading', 'Empty category'),
      introduction: field('empty-category-intro', '<p>Empty introduction.</p>', 'Rich Text'), items: [] }] } },
    fields: [], forbidden: /Edit each expert biography|Empty category|Empty introduction/ },
  { name: 'Ventures Team', file: 'ventures-team/VenturesTeam.tsx', data: {},
    automatic: { automaticVenturesTeam: { complete: true, status: 'ready', items: [] } }, fields: [],
    forbidden: /Edit those pages and their Ventures team listing/ },
  { name: 'Press Release Archive', file: 'press-release-archive/PressReleaseArchive.tsx',
    data: { heading: field('archive-heading', 'Archive heading') }, automatic: { automaticReleases: releases },
    fields: ['archive-heading'], forbidden: /Add press release pages/ },
  { name: 'Recent Releases', file: 'newsroom-recent-releases/NewsroomRecentReleases.tsx',
    data: { heading: field('recent-heading', 'Recent heading') }, automatic: { automaticReleases: releases },
    fields: ['recent-heading'], forbidden: /Add dated press release pages/ },
  { name: 'Public Relations', file: 'newsroom-public-relations/NewsroomPublicRelations.tsx',
    data: { heading: field('pr-heading', 'Public relations'), intro: field('pr-intro', '<p>Authored introduction.</p>', 'Rich Text'),
      contactReferences: { targetItems: [] } }, fields: ['pr-heading', 'pr-intro'], forbidden: /Select the media contacts/ },
  { name: 'Prospectus Product Directory', file: 'prospectus-product-directory/ProspectusProductDirectory.tsx',
    data: { currentHeading: field('current-heading', 'Current'), pastHeading: field('past-heading', 'Past') },
    automatic: { automaticProducts: { complete: true, status: 'ready', items: [] } },
    fields: ['current-heading', 'past-heading'], forbidden: /Set a child prospectus page/ },
  { name: 'Featured Update', file: 'newsroom-featured-update/NewsroomFeaturedUpdate.tsx',
    data: { label: field('feature-label', 'Latest update'), body: field('feature-body', '<p>Authored feature.</p>', 'Rich Text'),
      release: null }, fields: ['feature-label', 'feature-body'], forbidden: /Select the featured news release/ },
];

export function renderCase(record, editing, Component) {
  const View = Component ?? loadSource(path.join(sourceRoot, 'components', record.file))[record.variant ?? 'Default'];
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: editing, isNormal: !editing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Canvas regression', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(ComponentPropsContext, { value: { 'canvas-test': record.automatic ?? {} } },
    React.createElement(View, { params: {}, rendering: { uid: 'canvas-test' }, fields: { data: { datasource: record.data } } }))));
}
const metadata = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

for (const record of cases) {
  test(`${record.name} healthy or intentionally empty canvas matches normal layout without instructions`, () => {
    const snapshot = JSON.stringify(record);
    const normal = renderCase(record, false), editing = renderCase(record, true);
    assert.doesNotMatch(editing, record.forbidden);
    assert.equal(editing.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, ''), normal);
    assert.deepEqual(metadata(editing).map((entry) => entry.fieldId).sort(), [...record.fields].sort());
    assert.deepEqual(metadata(normal), []);
    assert.doesNotMatch(editing, /No text in field|scEmptyImage/);
    assert.equal(JSON.stringify(record), snapshot);
  });
}

test('empty expert categories stay out of alternating populated sections without changing field metadata', () => {
  const record = structuredClone(cases.find((entry) => entry.name === 'Expert Directory'));
  record.automatic.automaticPeople.groups.push({ id: 'populated-category',
    heading: field('category-heading', 'Populated category'), introduction: field('category-intro', '<p>Category introduction.</p>', 'Rich Text'),
    items: [{ pageId: 'person-page', href: '/about/expert', name: field('name', 'Expert name'),
      role: field('role', '<p>Expert role</p>', 'Rich Text'), directorySummary: field('summary', '<p>Expert summary.</p>', 'Rich Text') }] });
  const editing = renderCase(record, true), normal = renderCase(record, false);
  assert.doesNotMatch(editing, /Empty category|Empty introduction|Edit each expert biography/);
  assert.match(editing, /Populated category/);
  assert.match(editing, /t-bg-grey-soft/);
  assert.deepEqual(metadata(editing).map((entry) => entry.fieldId).sort(), ['category-heading', 'category-intro']);
  // The pre-existing stretched hit area is omitted in editing so authors can select the card.
  assert.equal(editing.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '')
    .replace('class="people-directory__link"', 'class="people-directory__link people-directory__link--stretched"'), normal);
});

test('actual load failures and source-quality warnings remain visible', () => {
  for (const name of ['Executive Directory', 'Expert Directory', 'Ventures Team', 'Press Release Archive', 'Recent Releases', 'Prospectus Product Directory']) {
    const record = { ...cases.find((entry) => entry.name === name), automatic: {} };
    for (const editing of [false, true]) assert.match(renderCase(record, editing), /temporarily unavailable|could not load completely/);
  }
  for (const name of ['Product Type Choices', 'Product Benefits Default']) {
    const record = { ...cases.find((entry) => entry.name === name), data: { children: { results: [] } } };
    assert.match(renderCase(record, true), /could not load every/);
  }
  const pr = { ...cases.find((entry) => entry.name === 'Public Relations'),
    data: { contactReferences: { targetItems: [null] } } };
  assert.match(renderCase(pr, true), /media contact references have not loaded completely/);
  for (const name of ['Executive Directory', 'Expert Directory']) {
    const record = { ...cases.find((entry) => entry.name === name),
      automatic: { automaticPeople: { ...people, missingOrder: 1, unassigned: name === 'Expert Directory' ? [{}] : [] } } };
    assert.match(renderCase(record, true), /Some biographies have no directory order/);
    if (name === 'Expert Directory') assert.match(renderCase(record, true), /need a directory category/);
  }
});
