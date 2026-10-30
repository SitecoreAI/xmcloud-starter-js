import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadSource, sourceRoot, render, nativeField, metadata } from '../../product-hero/__tests__/sdk-test-helper.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(directory, 'new-york-home.source.json'), 'utf8'));
const source = fs.readFileSync(path.join(directory, 'new-york-home.source.html'), 'utf8');
const filename = path.join(sourceRoot, 'components/allianz-legacy-card-grid/AllianzLegacyCardGrid.tsx');
const variants = loadSource(filename);
const params = { columns: '2', breakpoint: 'sm', headingLevel: 'h3', alignment: 'left', region: 'content', RenderingIdentifier: 'TEST-ONLY-GRID-RENDERING' };
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const withoutChrome = (html) => html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '');
const escapeHTML = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const linkField = (value, itemId) => ({ jsonValue: { value, metadata: { fieldId: 'native-link', fieldType: 'General Link', itemId } } });
function dataFor(value) {
  return {
    ...(value.heading !== undefined ? { heading: nativeField('heading', value.heading, 'TEST-ONLY-GRID-NOT-A-CMS-ID') } : {}),
    children: { results: value.cards.map((card) => ({
      id: card.id,
      heading: nativeField('heading', card.heading, card.id),
      body: nativeField('body', card.body, card.id),
      ...(card.image ? { image: nativeField('image', card.image, card.id) } : {}),
      ...(card.icon ? { icon: nativeField('icon', card.icon, card.id) } : {}),
      ...(card.link ? { link: linkField(card.link, card.id) } : {}),
    })) },
  };
}
function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}
function anchorContracts(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
    text: match[2].replace(/<[^>]+>/g, '').trim(),
    href: match[1].match(/\bhref="([^"]*)"/)?.[1] ?? null,
    ariaLabel: match[1].match(/\baria-label="([^"]*)"/)?.[1] ?? null,
    target: match[1].match(/\btarget="([^"]*)"/)?.[1] ?? null,
  }));
}

test('retained source owns two plain modules with three same-tab labelled links', () => {
  assert.equal(hash(source), fixture.fragmentSHA256);
  assert.equal((source.match(/class="col-sm-6"/g) ?? []).length, 2);
  assert.equal((source.match(/class="mod"/g) ?? []).length, 2);
  assert.equal((source.match(/<h3>/g) ?? []).length, 2);
  assert.equal((source.match(/<ul class="link-list">/g) ?? []).length, 2);
  assert.equal(anchorContracts(source).length, 3);
  assert.ok(anchorContracts(source).every((link) => link.ariaLabel && link.target === null));
  assert.doesNotMatch(source, /<img|class="content-body|<article/);
});

test('the entire existing Default and Privacy implementation remains byte-identical to e5', () => {
  const code = fs.readFileSync(filename, 'utf8');
  const marker = code.indexOf('\n/** Source home cards retain');
  assert.ok(marker > 0);
  assert.equal(hash(code.slice(0, marker)), fixture.baselineComponentSHA256);
});

for (const isEditing of [false, true]) {
  test(`NewYorkHomeCards preserves source order, body lists and native ownership in ${isEditing ? 'editing' : 'normal'} mode`, () => {
    const data = freeze(dataFor(fixture.cases[0]));
    const before = JSON.stringify(data);
    const html = render(variants.NewYorkHomeCards, data, { isEditing, params });
    const visible = withoutChrome(html);
    assert.match(visible, /^<div class="container-fluid allianz-legacy-card-grid allianz-ny-home-cards" id="TEST-ONLY-GRID-RENDERING">/);
    assert.equal((visible.match(/class="col-sm-6"/g) ?? []).length, 2);
    assert.equal((visible.match(/<div class="mod">/g) ?? []).length, 2);
    assert.equal((visible.match(/<h3>/g) ?? []).length, 2);
    assert.equal((visible.match(/<ul class="link-list">/g) ?? []).length, 2);
    assert.doesNotMatch(visible, /class="[^"]*\bcontent-body\b|<article|<img|class="link"/);
    assert.deepEqual(anchorContracts(visible), anchorContracts(source));
    for (const card of fixture.sourceCards) {
      assert.ok(visible.includes(`<h3>${escapeHTML(card.heading)}</h3>`));
      assert.ok(visible.includes(`<div>${card.body}</div>`));
    }
    assert.ok(visible.indexOf(fixture.sourceCards[0].heading) < visible.indexOf(fixture.sourceCards[1].heading));
    const expected = data.children.results.flatMap((card) => [card.heading.jsonValue.metadata, card.body.jsonValue.metadata]);
    assert.deepEqual(metadata(html), isEditing ? expected : []);
    assert.equal(JSON.stringify(data), before);
  });

  test(`NewYorkHomeCards renders authored values and independently cleared fields in ${isEditing ? 'editing' : 'normal'} mode`, () => {
    const authored = dataFor(fixture.cases[1]);
    const html = render(variants.NewYorkHomeCards, authored, { isEditing, params });
    assert.match(html, /Authored &lt;card&gt; &amp; title/);
    assert.ok(html.includes('<p>Authored <strong>body</strong>.</p>'));
    assert.doesNotMatch(html, /Consumer confidence|Allianz Index Advantage/);
    for (const [heading, body, names] of [
      ['', '<p>Retained body.</p>', ['native-body']],
      ['Retained heading', '', ['native-heading']],
      ['', '', []],
    ]) {
      const clear = dataFor({ cards: [{ id: 'TEST-ONLY-CLEARED-NOT-CMS', heading, body }] });
      const before = JSON.stringify(clear);
      const result = render(variants.NewYorkHomeCards, clear, { isEditing, params });
      assert.equal(/<h3\b/.test(result), Boolean(heading));
      assert.equal(/<p>Retained body/.test(result), Boolean(body));
      assert.doesNotMatch(result, /\[No text in field\]|Consumer confidence|Allianz Index Advantage/);
      assert.deepEqual(metadata(result).map((entry) => entry.fieldId), isEditing ? names : []);
      assert.equal(JSON.stringify(clear), before);
    }
  });

  test(`NewYorkHomeCards retains optional native media, link fields and parameters in ${isEditing ? 'editing' : 'normal'} mode`, () => {
    const value = fixture.cases[3], data = freeze(dataFor(value)), before = JSON.stringify(data);
    const html = render(variants.NewYorkHomeCards, data, { isEditing, params: { ...params, ...value.params } });
    assert.match(html, /class="col-md-3"/);
    assert.match(html, /class="mod icon-with-text text-center"/);
    assert.match(html, /row mod-row no-margin-bottom/);
    assert.match(html, /<h4>Media &lt;card&gt;<\/h4>/);
    assert.match(html, /alt="Authored image"/);
    assert.match(html, /alt="Authored icon"/);
    assert.match(html, /href="\/new-york\/about"/);
    assert.match(html, />Native About<\/a>/);
    if (isEditing) {
      assert.deepEqual(metadata(html).map((entry) => entry.fieldId).sort(), ['native-heading', 'native-image', 'native-icon', 'native-heading', 'native-body', 'native-link'].sort());
      assert.ok(metadata(html).every((entry) => entry.itemId.startsWith('TEST-ONLY-')));
    }
    assert.equal(JSON.stringify(data), before);
  });

  test(`NewYorkHomeCards has safe absent datasource and missing optional field behavior in ${isEditing ? 'editing' : 'normal'} mode`, () => {
    const missing = render(variants.NewYorkHomeCards, undefined, { isEditing, omitFields: true });
    assert.equal(missing, render(variants.Default, undefined, { isEditing, omitFields: true }));
    assert.match(missing, /Add a datasource/);
    const empty = render(variants.NewYorkHomeCards, {}, { isEditing, params });
    assert.doesNotMatch(empty, /<h[1-6]|<p>|<a\b|<img|No text in field|Consumer confidence/);
    assert.deepEqual(metadata(empty), []);
  });
}

test('editing metadata is the only visible source-case difference', () => {
  const data = dataFor(fixture.cases[0]);
  assert.equal(withoutChrome(render(variants.NewYorkHomeCards, data, { isEditing: true, params })),
    render(variants.NewYorkHomeCards, data, { params }));
});

test('native GeneralLink keeps the existing visitor rejection policy', () => {
  const data = dataFor({ cards: [{ id: 'TEST-ONLY-REJECTED-LINK', heading: 'Native card', body: '', link: { href: 'javascript:alert(1)', text: 'Rejected link' } }] });
  const html = render(variants.NewYorkHomeCards, data, { params });
  assert.doesNotMatch(html, /href="javascript:alert/);
  assert.match(html, /href="#service-unavailable"/);
});

for (const name of ['Default', 'Privacy']) {
  test(`${name} preserves all 8 retained actual-SDK legacy outputs`, () => {
    for (const value of fixture.cases) for (const isEditing of [false, true]) {
      const output = render(variants[name], dataFor(value), { isEditing, params: { ...params, ...value.params } });
      assert.equal(hash(output), fixture.legacyActualSDKSSR[name][value.id][isEditing ? 'editing' : 'normal']);
      assert.doesNotMatch(output, /allianz-ny-home-cards/);
    }
  });
}
