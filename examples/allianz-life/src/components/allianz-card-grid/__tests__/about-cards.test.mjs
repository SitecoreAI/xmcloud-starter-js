import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Components = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
const attrs = (html, tag, name) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, 'g'))].map(match => decode(match[1]));
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(decode(match[1])));
const field = (owner, name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: `${owner}-${name}`, fieldType: type } } });
const urls = ['https://www.allianzlife.com/about/executives', 'https://www.allianzlife.com/about/newsroom', 'https://www.allianzlife.com/why-allianz/culture'];
const affiliates = ['https://www.agcs.allianz.com/global-offices/united-states.html', 'https://www.allianzworldwidepartners.com/usa/', 'https://www.allianz-trade.com/en_US.html', 'https://www.pimco.com/us/en'];
const parentBody = '<p>Complete native parent body with <sup>2</sup> reference.</p>' + affiliates.map((url, index) => `<p style="margin-left: 40px;"><a rel="noopener noreferrer" href="${url}" target="_blank">Native affiliate ${index}</a></p>`).join('');
function fixture(parent = false) {
  const root = 'test-only-about-root';
  return { heading: field(root, 'heading', 'UNUSED-ROOT-HEADING'), body: field(root, 'body', 'UNUSED-ROOT-BODY', 'Rich Text'),
    subheading: field(root, 'subheading', 'UNUSED-ROOT-SUBHEADING'), primaryLink: field(root, 'primaryLink', { href: '/unused-root-link' }, 'General Link'),
    children: { results: Array.from({ length: parent ? 1 : 3 }, (_, index) => {
      const owner = `test-only-about-card-${index}`;
      return { id: owner, fieldCollection: [
        { name: 'Heading', ...field(owner, 'heading', parent ? 'UNUSED-CARD-HEADING' : `Native teaser ${index}`) },
        { name: 'Body', ...field(owner, 'body', parent ? parentBody : `<p>Complete native teaser ${index} <strong>body</strong>.</p>`, 'Rich Text') },
        { name: 'Image', ...field(owner, 'image', { src: `/test-only-about/card-${index}.jpg`, alt: ' ', width: parent ? '832' : '704', height: parent ? '944' : '350' }, 'Image') },
        { name: 'Link', ...field(owner, 'link', { href: parent ? '/unused-parent-link' : urls[index], text: `Native teaser ${index}`, linktype: parent ? 'internal' : 'external', target: '', querystring: '', anchor: '' }, 'General Link') },
        { name: 'Subheading', ...field(owner, 'subheading', 'UNUSED-CARD-SUBHEADING') },
        { name: 'Icon', ...field(owner, 'icon', { src: '/unused-card-icon.svg' }, 'Image') },
        { name: 'Links', jsonValue: [] },
      ] };
    }) } };
}
const childField = (data, index, name) => data.children.results[index].fieldCollection.find(value => value.name === name).jsonValue;

test('AboutParentCompany retains original body/affiliate links and portrait after the content in both modes', () => {
  const data = fixture(true), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Components.AboutParentCompany, data, editing, { theme: 'green-soft', layout: 'image-right', splitRatio: '50:50', columns: '4' });
    assert.ok(html.includes('t-bg-transparent axlTileCollection allianz-about-parent-company'));
    assert.ok(html.includes('m-axlTile match-height tile--6633 -is--split t-bg-transparent u-margin-bottom-xl'));
    assert.ok(html.includes('tileContent u-text-left'));
    assert.ok(html.includes('tileBody u-font-size-md'));
    assert.ok(html.includes(parentBody));
    assert.deepEqual(attrs(html, 'a', 'href'), affiliates);
    assert.deepEqual(attrs(html, 'a', 'target'), Array(4).fill('_blank'));
    assert.deepEqual(attrs(html, 'a', 'rel'), Array(4).fill('noopener noreferrer'));
    assert.deepEqual(attrs(html, 'img', 'alt'), [' ']);
    assert.ok(html.indexOf('tileSubGrid__content') < html.indexOf('class="tileImage"'));
    assert.doesNotMatch(html, /UNUSED|unused-|<h[1-6]\b|m-card__footer/);
  }
  const actual = markers(render(Components.AboutParentCompany, data, true));
  assert.equal(actual.length, 2);
  for (const name of ['Body', 'Image']) assert.equal(actual.filter(value => value.fieldId === childField(data, 0, name).metadata.fieldId).length, 1);
  assert.equal(JSON.stringify(data), before);
});

test('AboutTeaserCards preserves three full native anchors, H4s, bodies, images and empty source ARIA in both modes', () => {
  const data = fixture(), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Components.AboutTeaserCards, data, editing, { theme: 'purple-soft', columns: '4', layout: 'image-left', headingLevel: 'h2' });
    assert.ok(html.includes('t-bg-green-soft allianz-about-teaser-cards'));
    assert.ok(html.includes('o-cards o-cards__col3'));
    assert.ok(html.includes('l-grid__row u-margin-bottom-xl'));
    assert.equal((html.match(/class="m-card"/g) ?? []).length, 3);
    assert.equal((html.match(/<h4\b/g) ?? []).length, 3);
    assert.deepEqual(attrs(html, 'a', 'href'), editing ? urls : ['/about/executives', '/about/newsroom', urls[2]]);
    assert.deepEqual(attrs(html, 'a', 'aria-label'), []);
    assert.deepEqual(attrs(html, 'img', 'alt'), Array(3).fill(' '));
    for (let index = 0; index < 3; index++) assert.ok(html.includes(childField(data, index, 'Body').value));
    assert.doesNotMatch(html, /UNUSED|unused-|m-card__footer|cardCategory|<h2\b|<iframe\b/);
  }
  const actual = markers(render(Components.AboutTeaserCards, data, true));
  assert.equal(actual.length, 12);
  for (let index = 0; index < 3; index++) for (const name of ['Heading', 'Body', 'Image', 'Link']) {
    const metadata = childField(data, index, name).metadata;
    assert.equal(actual.filter(value => value.itemId === metadata.itemId && value.fieldId === metadata.fieldId).length, 1);
  }
  assert.equal(JSON.stringify(data), before);
});

test('AboutTeaserCards keeps editable source target/ARIA while verified visitor pages stay local and same-tab', () => {
  const data = fixture(), link = childField(data, 0, 'Link');
  Object.assign(link.value, { target: '_blank', 'aria-label': 'Explicit native author label' });
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Components.AboutTeaserCards, data, editing);
    assert.ok(attrs(html, 'a', 'href').includes(editing ? urls[0] : '/about/executives'));
    assert.ok(attrs(html, 'a', 'aria-label').includes('Explicit native author label'));
    if (editing) assert.ok(attrs(html, 'a', 'target').includes('_blank'));
    else {
      assert.ok(attrs(html, 'a', 'target').includes(''));
      assert.ok(!attrs(html, 'a', 'rel').includes('noopener noreferrer'));
    }
  }
  assert.equal(JSON.stringify(data), before);
});

test('About teaser cleared fields remain absent on the canvas with original metadata retained in content fields, without invented visitor actions', () => {
  const data = fixture();
  for (let index = 0; index < 3; index++) {
    for (const name of ['Heading', 'Body']) childField(data, index, name).value = '';
    childField(data, index, 'Image').value = { src: '', alt: ' ' };
    childField(data, index, 'Link').value = { href: '' };
  }
  const before = JSON.stringify(data);
  assert.equal(markers(render(Components.AboutTeaserCards, data, true)).length, 0);
  assert.deepEqual(attrs(render(Components.AboutTeaserCards, data), 'a', 'href'), []);
  assert.deepEqual(attrs(render(Components.AboutTeaserCards, data), 'img', 'src'), []);
  assert.equal(JSON.stringify(data), before);
});

test('About parent cleared body/image stay absent on the canvas and missing ones stay missing', () => {
  const data = fixture(true);
  childField(data, 0, 'Body').value = '';
  childField(data, 0, 'Image').value = { src: '', alt: '' };
  const before = JSON.stringify(data);
  assert.equal(markers(render(Components.AboutParentCompany, data, true)).length, 0);
  assert.equal(JSON.stringify(data), before);
  data.children.results[0].fieldCollection = data.children.results[0].fieldCollection.filter(value => !['Body', 'Image'].includes(value.name));
  assert.equal(markers(render(Components.AboutParentCompany, data, true)).length, 0);
});

test('About variants accept normal named SDK fields and serialized fieldCollection without mutation', () => {
  for (const parent of [false, true]) {
    const data = fixture(parent), named = structuredClone(data);
    named.children.results = named.children.results.map(card => ({ id: card.id,
      ...Object.fromEntries(card.fieldCollection.filter(value => value.name !== 'Links').map(value => [value.name[0].toLowerCase() + value.name.slice(1), { jsonValue: value.jsonValue }])) }));
    for (const editing of [false, true]) assert.equal(render(Components[parent ? 'AboutParentCompany' : 'AboutTeaserCards'], data, editing), render(Components[parent ? 'AboutParentCompany' : 'AboutTeaserCards'], named, editing));
  }
});

test('About variants handle missing datasource and empty children without source fallbacks', () => {
  for (const name of ['AboutParentCompany', 'AboutTeaserCards']) {
    assert.ok(render(Components[name], undefined).includes('AllianzCardGrid'));
    const data = fixture(); delete data.children;
    assert.doesNotMatch(render(Components[name], data, true), /<h4\b|<img\b|kind="open"/);
  }
});

test('About parent CSS matches source content-first stacking and the medium 6633 ratio only in scoped selectors', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzAboutCards.css'), 'utf8');
  assert.match(css, /\.allianz-about-parent-company \.tile--6633 > \.tileContent,[\s\S]*\.allianz-about-parent-company \.tile--6633 > \.tileImage\s*\{\s*width: 100%;/);
  assert.match(css, /@media \(min-width: 704px\)[\s\S]*\.tileContent\s*\{\s*width: 66\.666%;[\s\S]*\.tileImage\s*\{\s*width: 33\.333%;/);
  assert.doesNotMatch(css, /50%|992px|\.allianz-life/);
});
