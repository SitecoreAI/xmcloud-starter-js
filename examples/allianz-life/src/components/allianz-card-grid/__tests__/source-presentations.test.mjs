import { assertWysiwygCanvas } from './wysiwyg-assertions.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadSource, render, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const fixtureBytes = fs.readFileSync(new URL('./source-presentations.fixture.json', import.meta.url));
const fixture = JSON.parse(fixtureBytes);
const sha = value => createHash('sha256').update(value).digest('hex');
const freeze = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };
const data = record => structuredClone(record.rendering.fields.data.datasource);
const markup = (name, datasource, record, editing = false, params = record.rendering.params) => render(Cards[name], datasource, editing, params);
const image = (value, owner = 'proposed-root-owner') => ({ jsonValue: { value, metadata: { datasource: { id: owner, language: 'en', revision: 'proposed-fixture-revision', version: 1 }, fieldId: 'test-proposed-root-icon-field', fieldType: 'Image', title: 'Heading icon' } } });
const populated = { src: '/test-proposed-root-heading-icon.svg?version=original', alt: '', width: '24', height: '24' };
const oldVariants = Object.entries(Cards).filter(([name, component]) => typeof component === 'function' && !['SourceDownloadLinks', 'HeadingIcon', 'BrandHeadingIcon', 'ProfessionalContactPrompt'].includes(name));
const iconSpans = html => html.match(/<span class="a-link__icon" aria-hidden="true">[\s\S]*?<\/span>/g) || [];
const withoutFooterIcons = html => html.replace(/<span class="a-link__icon" aria-hidden="true">[\s\S]*?<\/span>/g, '');
const withoutHeadingGraft = html => html.replace(/<link rel="preload" as="image" href="\/test-proposed-root-heading-icon\.svg\?version=original"\/>/, '').replace(/<div class="tileIcon [^"]*" data-allianz-card-grid-heading-icon="(?:gray|brand)">[\s\S]*?<\/div>/, '').replace(/<header>(<div class="tileHeading"><h2>[\s\S]*?<\/h2><\/div>(?:<div class="tileSubHeading">[\s\S]*?<\/div>)?)<\/header>/, '$1');
// These two captured Bodies are the only historical fixture href changes under
// the shared inert-contact policy. Keep the fixture and its genuine old hashes.
const questionBodyWitnesses = [
  { owner: 'F2EB8499721849489EDE2E82DE10BD72', sha256: '5399db1d9eb7e2b664b52680ba1e2e22d3841d51a337d86bea431a48757a5c85',
    visitor: '<p>We can help answer your questions about submitting new business or put you in touch with our Underwriting and New Business Teams.</p> <p>Life Case Design Team, <a href="#service-unavailable">800.950.7372, option 1</a></p>' },
  { owner: 'C1E50B54E2B54DE48F07B2AC2784F956', sha256: '26123f755b10ce285c655e6f7559f997d7225a3a1cbf4d2fb5c26c36e02db1d9',
    visitor: '<p>We can help answer any questions related to inforce business.</p> <p>Contact Center, <a href="#service-unavailable"> 800.950.7372, option 3</a></p>' },
];

test('five native fixtures retain their historical oracle with only two witnessed inert-contact href changes', () => {
  assert.equal(fixture.records.length, 5);
  assert.equal(sha(fixtureBytes), 'd237fa5d04bccb25b88ddfa9583476ea5b1a3498e510295ca4980ea7ab4d30c7');
  assert.equal(fixture.beforeSourceSHA256, 'bf03e2e3f0e0639233a43756f44590873d30d660571dee22d9b6c1cd19e6036b');
  for (const record of fixture.records) {
    const original = freeze(data(record)), before = JSON.stringify(original);
    assert.equal(original.children.results.length, record.children);
    const visitor = markup('Default', original, record, false);
    let editing = markup('Default', original, record, true);
    let historicalVisitor = visitor;
    if (record.key === 'question') {
      assert.equal(original.children.results.length, questionBodyWitnesses.length);
      assert.equal((visitor.match(/href="#service-unavailable"/g) ?? []).length, 2);
      assert.doesNotMatch(visitor, /href="tel:/);
      assert.equal((editing.match(/href="tel:8009507372"/g) ?? []).length, 2);
      for (const [index, witness] of questionBodyWitnesses.entries()) {
        const card = original.children.results[index];
        const body = card.fieldCollection.find(field => field.name === 'body').jsonValue;
        assert.equal(card.id, witness.owner);
        assert.equal(sha(body.value), witness.sha256);
        assert.equal(body.value, witness.visitor.replace('href="#service-unavailable"', 'href="tel:8009507372"'));
        assert.equal(visitor.split(witness.visitor).length - 1, 1);
        assert.equal(editing.split(body.value).length - 1, 1);
        // Reverse only this proven Body href in the historical-oracle copy.
        // Normalize the same exact difference in the editing comparison only;
        // the original native Body and its SDK metadata remain unchanged.
        historicalVisitor = historicalVisitor.replace(witness.visitor, body.value);
        editing = editing.replace(body.value, witness.visitor);
      }
    }
    assert.equal(sha(historicalVisitor), record.beforeDefault.visitor, record.key);
    if (record.key === 'download' || record.key === 'document') {
      // The existing demo link policy intentionally disables this visitor service;
      // editing keeps its genuine native URL. Check that bounded difference before
      // comparing all remaining visible markup and original field metadata.
      const visitorAnchors = visitor.match(/<a\b[^>]*>/g), editorAnchors = editing.match(/<a\b[^>]*>/g);
      const className = record.key === 'download' ? 'a-link' : 'm-card';
      assert.equal(visitorAnchors.length, original.children.results.length);
      assert.equal(editorAnchors.length, visitorAnchors.length);
      for (const [index, card] of original.children.results.entries()) {
        const nativeLink = card.fieldCollection.find(field => field.name === 'link').jsonValue;
        assert.equal(visitorAnchors[index], `<a href="#service-unavailable" class="${className}" title="This service is unavailable" target="">`);
        assert.equal(editorAnchors[index], `<a href="${nativeLink.value.href}" class="${className}" target="_blank" rel="noopener noreferrer">`);
        editing = editing.replace(editorAnchors[index], visitorAnchors[index]);
      }
    }
    // Existing native/visitor link projections may retain the official origin
    // or use its identical local path. Permit only that exact origin difference;
    // every visitor href is pinned by the old hash or exact contact witnesses above.
    const visitorLinks = visitor.match(/<a\b[^>]*>/g) ?? [], editorLinks = editing.match(/<a\b[^>]*>/g) ?? [];
    assert.equal(editorLinks.length, visitorLinks.length);
    for (const [index, editorLink] of editorLinks.entries()) {
      const visitorHref = visitorLinks[index].match(/\bhref="([^"]*)"/)[1], editorHref = editorLink.match(/\bhref="([^"]*)"/)[1];
      if (visitorHref === editorHref) continue;
      const sourceOrigin = 'https://www.allianzlife.com';
      assert.ok(visitorHref.startsWith(`${sourceOrigin}/`) || editorHref.startsWith(`${sourceOrigin}/`));
      assert.equal(visitorHref.replace(sourceOrigin, ''), editorHref.replace(sourceOrigin, ''), `${record.key}: exact source path`);
      editing = editing.replace(editorLink, editorLink.replace(`href="${editorHref}"`, `href="${visitorHref}"`));
    }
    assertWysiwygCanvas(visitor, editing, original, record.key);
    assert.equal(JSON.stringify(original), before);
  }
});

test('SourceDownloadLinks changes only the complete native scalar footer glyph, preserving 67:33 image-left markup and all fields', () => {
  const record = fixture.records.find(record => record.key === 'download');
  assert.equal(record.rendering.params.layout, 'image-left'); assert.equal(record.rendering.params.splitRatio, '67:33');
  const original = freeze(data(record)), before = JSON.stringify(original);
  for (const editing of [false, true]) {
    const base = markup('Default', original, record, editing), projected = markup('SourceDownloadLinks', original, record, editing);
    assert.equal(withoutFooterIcons(projected), withoutFooterIcons(base));
    assert.match(projected, /tile--6633 -is--split/); assert.match(projected, /class="tileImage"/);
    const icons = iconSpans(projected); assert.equal(icons.length, 1);
    assert.equal(sha(icons[0].match(/\bd="([^"]+)"/)[1]), fixture.sourceDownload.pathDSHA256);
    assert.match(icons[0], /viewBox="0 0 24 24"/); assert.match(icons[0], /fill-rule="evenodd"/);
    assert.match(icons[0], /aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(icons[0], /<title|<desc|\bid=|aria-labelledby|aria-describedby/);
    if (editing) assert.ok(projected.includes('{4B6075D7-4C7E-53AB-B05E-58B6F4FDD06A}'));
  }
  assert.equal(JSON.stringify(original), before);
});

test('download presentation is an explicit opt-in without destination, label, page or owner inference', () => {
  const record = fixture.records.find(record => record.key === 'download');
  for (const href of ['/about', '/about?source=one#details', 'https://unknown.example/arbitrary', 'javascript:alert(1)']) {
    const original = data(record), child = original.children.results[0];
    child.fieldCollection.find(entry => entry.name === 'link').jsonValue.value = { href, text: 'Arbitrary authored label', linktype: 'external', target: '_blank' };
    freeze(original); const before = JSON.stringify(original);
    for (const editing of [false, true]) {
      const base = markup('Default', original, record, editing), projected = markup('SourceDownloadLinks', original, record, editing);
      assert.equal(withoutFooterIcons(projected), withoutFooterIcons(base));
      assert.equal(sha(iconSpans(projected)[0].match(/\bd="([^"]+)"/)[1]), fixture.sourceDownload.pathDSHA256);
    }
    assert.equal(JSON.stringify(original), before);
  }
});

test('each heading variant grafts one proposed authorable Image before the whole 4/6/4/2-child group and H2 header', () => {
  const groups = fixture.records.filter(record => record.key !== 'download');
  assert.deepEqual(groups.map(record => record.children), [4, 6, 4, 2]);
  for (const record of groups) {
    const original = data(record); original.icon = image({ ...populated, alt: record.key }, original.id);
    freeze(original); const before = JSON.stringify(original);
    const base = markup('Default', original, record);
    const projected = markup(record.proposedVariant, original, record);
    assert.equal((projected.match(/data-allianz-card-grid-heading-icon=/g) || []).length, 1);
    assert.equal((projected.match(/allianz-card-grid-heading-glyph/g) || []).length, 1);
    assert.ok(projected.indexOf('data-allianz-card-grid-heading-icon') < projected.indexOf('<header><div class="tileHeading"><h2>'));
    assert.equal(withoutHeadingGraft(projected), base);
    assert.match(projected, record.proposedVariant === 'BrandHeadingIcon' ? /tileIcon t-bg-primary-brand t-icon-primary-white/ : /tileIcon t-bg-transparent t-icon-primary-black/);
    assert.equal(record.rendering.params.headingLevel, 'h3', 'Group H2 never rewrites child heading parameter');
    assert.equal(JSON.stringify(original), before);
  }
});

test('all existing named variants, including Default and SourceDownloadLinks, ignore a queried root Icon even when populated in editing', () => {
  const record = fixture.records.find(record => record.key === 'download');
  assert.ok(oldVariants.length >= 30);
  for (const [name] of [...oldVariants, ['SourceDownloadLinks', Cards.SourceDownloadLinks]]) {
    for (const editing of [false, true]) {
      const missing = data(record), proposed = data(record); proposed.icon = image(populated);
      freeze(missing); freeze(proposed);
      const before = JSON.stringify(proposed);
      assert.equal(markup(name, proposed, record, editing), markup(name, missing, record, editing), name);
      assert.equal(JSON.stringify(proposed), before);
    }
  }
});

test('root Image omission/clear/restore retains native field authorability without manufacturing visitor chrome', () => {
  const record = fixture.records.find(record => record.key === 'shapes');
  for (const name of ['HeadingIcon', 'BrandHeadingIcon']) {
    for (const state of ['omitted', 'undefined', 'cleared', 'empty-src']) {
      const original = data(record);
      if (state !== 'omitted') original.icon = state === 'undefined' ? { jsonValue: undefined } : image(state === 'cleared' ? {} : { src: '' });
      freeze(original); const before = JSON.stringify(original);
      assert.equal(markup(name, original, record), markup('Default', original, record), name + ':' + state);
      const editing = markup(name, original, record, true);
      if (state === 'omitted' || state === 'undefined') assert.equal(editing, markup('Default', original, record, true));
      else { assert.ok(!editing.includes('test-proposed-root-icon-field')); assert.equal((editing.match(/data-allianz-card-grid-heading-icon=/g) || []).length, 0); }
      assert.equal(JSON.stringify(original), before);
    }
    const original = data(record); original.icon = image({ ...populated, alt: '', width: '17', height: '21' }, 'arbitrary-future-owner');
    freeze(original);
    const editing = markup(name, original, record, true);
    assert.ok(editing.includes('test-proposed-root-icon-field')); assert.ok(editing.includes('arbitrary-future-owner'));
    const visitor = markup(name, original, record);
    assert.match(visitor, /alt=""/); assert.match(visitor, /width="17"/); assert.match(visitor, /height="21"/);
    assert.ok(visitor.includes(populated.src.replace('&', '&amp;')));
  }
});

test('scoped root Image CSS matches source 40/64 wrappers, 26/40 glyphs and exact gray/brand filters', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGridHeadingIcons.css'), 'utf8');
  assert.match(css, /width: 40px;[\s\S]*?height: 40px;/);
  assert.match(css, /width: 26px;[\s\S]*?height: 26px;/);
  assert.match(css, /@media \(min-width: 704px\)[\s\S]*?width: 64px;[\s\S]*?height: 64px;[\s\S]*?width: 40px;/);
  assert.match(css, /data-allianz-card-grid-heading-icon="gray"[\s\S]*?background-color: transparent;[\s\S]*?color: #3c3c3c;/);
  assert.match(css, /filter: brightness\(0\) invert\(23\.5294117647%\);/);
  assert.match(css, /data-allianz-card-grid-heading-icon="brand"[\s\S]*?background-color: #003781;[\s\S]*?color: #fff;/);
  assert.match(css, /filter: brightness\(0\) invert\(1\);/);
  const selectors = css.match(/^\s*\.tileIcon[^\n{]*\{/gm) || [];
  assert.ok(selectors.length >= 7);
  for (const selector of selectors) assert.ok(selector.includes('data-allianz-card-grid-heading-icon'), selector);
});

test('root query adds only the optional Icon alias and retains the original complete native child query', () => {
  const file = path.resolve(sourceRoot, '../../../authoring/allianz-life/items/allianz.renderings/Allianz Life/Card Grid.yml');
  const current = fs.readFileSync(file, 'utf8');
  assert.equal((current.match(/icon: field\(name: "icon"\) \{ jsonValue \}/g) || []).length, 1);
  assert.equal(sha(current.replace('        icon: field(name: "icon") { jsonValue }\n', '')), fixture.originalQuerySHA256);
  assert.match(current, /children\(first: 40\) \{ total pageInfo \{ hasNext endCursor \} results/);
  assert.match(current, /fieldCollection: fields \{ name jsonValue \}/);
});

test('new presentations retain the original missing-datasource fallback', () => {
  for (const name of ['SourceDownloadLinks', 'HeadingIcon', 'BrandHeadingIcon', 'ProfessionalContactPrompt']) for (const editing of [false, true]) assert.equal(render(Cards[name], undefined, editing), render(Cards.Default, undefined, editing));
});
