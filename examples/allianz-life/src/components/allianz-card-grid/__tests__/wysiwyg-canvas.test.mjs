import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, render, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const RichText = loadSource(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx'));
const field = (name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: 'test-wysiwyg-owner', fieldId: `test-wysiwyg-${name}`, fieldType } } });
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
const fieldIDs = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(decode(match[1])).fieldId).sort();
const fixture = () => ({
  id: 'test-wysiwyg-root', heading: field('root-heading', ''), subheading: field('root-subheading', '', 'Rich Text'),
  body: field('root-body', '', 'Rich Text'), primaryLink: field('root-link', {}, 'General Link'),
  children: { results: [{ id: 'test-wysiwyg-card', heading: field('heading', 'Saved heading'),
    subheading: field('subheading', '', 'Rich Text'), body: field('body', '<p>Saved body.</p>', 'Rich Text'),
    image: field('image', { src: '/test-wysiwyg-main.jpg', alt: 'Saved cover' }, 'Image'),
    icon: field('icon', {}, 'Image'), alphanumeral: field('number', ''),
    link: field('link', {}, 'General Link'), theme: field('theme', 'transparent'),
    headingLevel: field('heading-level', 'h3') }] },
});
const noExtraCanvas = html => assert.doesNotMatch(html,
  /Additional content fields|allianz-editorial-card-field|\[No (?:text|image) in field\]|Add a link/);

for (const layout of ['stacked', 'cards', 'list']) {
  test(`Default ${layout} omits empty optional SDK canvas fields while retaining populated copy`, () => {
    const data = fixture(), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(Cards.Default, data, editing, { layout, columns: '1', headingLevel: 'h3' });
      noExtraCanvas(html); assert.match(html, /Saved heading/); assert.match(html, /Saved body/);
      const expected = editing ? ['test-wysiwyg-heading', 'test-wysiwyg-body'] : [];
      if (editing && layout !== 'list') expected.push('test-wysiwyg-image');
      assert.deepEqual(fieldIDs(html), expected.sort());
    }
    assert.equal(JSON.stringify(data), before, 'Content fields and metadata remain unchanged');
  });
}

test('Editorial image split has one source image and no separate editing appendix for empty optional fields', () => {
  const data = fixture(), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Cards.EditorialTiles, data, editing, { layout: 'image-right', splitRatio: '67:33', columns: '1' });
    noExtraCanvas(html); assert.match(html, /tile--6633 -is--flipped -is--split/);
    assert.equal((html.match(/<img\b/g) ?? []).length, 1);
    assert.deepEqual(fieldIDs(html), editing ? ['test-wysiwyg-body', 'test-wysiwyg-heading', 'test-wysiwyg-image'] : []);
  }
  assert.equal(JSON.stringify(data), before);
});

test('Editorial populated fields keep their original native editing identity exactly once', () => {
  const data = fixture(), card = data.children.results[0];
  card.icon.jsonValue.value = { src: '/test-wysiwyg-icon.svg', alt: 'Saved icon' };
  card.alphanumeral.jsonValue.value = '3'; card.subheading.jsonValue.value = '<p>Saved subheading.</p>';
  card.link.jsonValue.value = { href: '/saved-destination', text: 'Saved action', linktype: 'internal' };
  const before = JSON.stringify(data);
  const html = render(Cards.EditorialTiles, data, true, { layout: 'image-right', splitRatio: '67:33', columns: '1' });
  noExtraCanvas(html);
  assert.deepEqual(fieldIDs(html), ['body', 'heading', 'icon', 'image', 'link', 'number', 'subheading'].map(name => `test-wysiwyg-${name}`).sort());
  assert.equal((html.match(/<img\b/g) ?? []).length, 2, 'Each populated source image occurs once');
  assert.equal(JSON.stringify(data), before);
});

for (const variant of ['AA5Questions', 'BenefitControlPlusQuestions', 'EssentialIncome7Questions', 'RetirementFoundationAdvQuestions', 'Allianz360Questions']) {
  test(`${variant} does not add an empty editing-only link to a copy card`, () => {
    const data = fixture(), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(Cards[variant], data, editing);
      noExtraCanvas(html); assert.match(html, /Saved heading/); assert.match(html, /Saved body/);
      assert.ok(!fieldIDs(html).includes('test-wysiwyg-link'));
    }
    assert.equal(JSON.stringify(data), before);
  });
}

test('About Information preserves its source circle without adding an empty editing-only Image', () => {
  const data = { heading: field('heading', 'Saved heading'), body: field('body', '<p>Saved body.</p>', 'Rich Text'),
    icon: field('icon', {}, 'Image') }, before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(RichText.AboutInformationHeading, data, editing);
    noExtraCanvas(html); assert.doesNotMatch(html, /<img\b/); assert.match(html, /tileIcon t-bg-primary-brand t-icon-primary-white/);
    assert.deepEqual(fieldIDs(html), editing ? ['test-wysiwyg-body', 'test-wysiwyg-heading'] : []);
  }
  assert.equal(JSON.stringify(data), before);
});

const withoutFieldChrome = html => html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '');
for (const variant of ['FixedMvaReference', 'EssentialIncome7MvaReference', 'RetirementFoundationAdvMvaReference', 'CoreIncome7MvaReference']) {
  test(`${variant} uses the same snapshot typography in editing with one original native heading field`, () => {
    const data = { heading: field('heading', 'Current MVA reference rate: 2.35% as of 01/02/2000'),
      body: field('body', '<p>Saved reference explanation.</p>', 'Rich Text') }, before = JSON.stringify(data);
    const normal = render(RichText[variant], data, false), editing = render(RichText[variant], data, true);
    assert.match(normal, /<small class="blue">Current MVA reference rate: <\/small><span testid="currentMVARate">2.35<\/span>% <small>as of <span testid="currentMVARateEffectiveDate">01\/02\/2000<\/span><\/small>/);
    assert.equal(withoutFieldChrome(editing), normal);
    assert.deepEqual(fieldIDs(editing), ['test-wysiwyg-body', 'test-wysiwyg-heading']);
    assert.deepEqual(fieldIDs(normal), []); assert.equal(JSON.stringify(data), before);
    data.heading.jsonValue.value = 'New authored snapshot without the old sentence shape';
    const arbitrary = render(RichText[variant], data, true);
    assert.match(arbitrary, /New authored snapshot without the old sentence shape/);
    assert.doesNotMatch(arbitrary, /currentMVARate/);
    assert.deepEqual(fieldIDs(arbitrary), ['test-wysiwyg-body', 'test-wysiwyg-heading']);
  });
}
