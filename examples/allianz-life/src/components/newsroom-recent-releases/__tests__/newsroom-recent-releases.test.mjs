import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { component, contract, field, render, links, editingIds } from '../../press-release-archive/__tests__/runtime.mjs';
import { collected, evidence, release, normalize } from '../../press-release-archive/__tests__/release-fixtures.mjs';
const { Default } = component('newsroom-recent-releases', 'NewsroomRecentReleases');
const { newsroomRecentReleasesFields } = contract('newsroom-recent-releases');
const data = {
  heading: field('recent-heading', 'Single-Line Text', evidence.seeds.recent.heading),
  releases: { targetItems: evidence.recent.map(release) },
  moreLink: field('more-link', 'General Link', { href: '/about/newsroom/2026-press-releases', text: 'More press releases', linktype: 'internal' }),
};

test('six canonical recent cards have whole-card native URLs, title/date/summary and arrow link', () => {
  const html = render(Default, data);
  const source = fs.readFileSync(new URL('./newsroom-recent-releases.source.html', import.meta.url), 'utf8');
  assert.equal((html.match(/class="m-card"/g) ?? []).length, 6);
  assert.deepEqual(links(html), [...evidence.recent.map((row) => row.route), '/about/newsroom/2026-press-releases']);
  assert.match(html, /o-cards o-cards__col3/);
  assert.match(html, /<h2>Recent Allianz Life news releases<\/h2>/);
  for (const row of evidence.recent) {
    assert.ok(normalize(html).includes(normalize(row.title)));
    assert.ok(normalize(html).includes(normalize(row.snippet)));
    assert.ok(normalize(source).includes(normalize(row.title)));
    const [year, month, day] = row.dateIso.split('-');
    assert.ok(html.includes(`Date: ${month}/${day}/${year}`));
    assert.ok(html.includes(`dateTime="${row.dateIso}"`));
  }
  assert.match(html, /class="a-link"/);
  assert.match(html, /class="a-link__icon"/);
  assert.doesNotMatch(html, /<img|<button|m-axlButton/);
  assert.equal(render(Default, collected({ ...data, releases: { targetItems: data.releases.targetItems.map(collected) } })), html);
  assert.equal(render(Default, data, false, { theme: 'blue', columns: '1', layout: 'list', headingLevel: 'h1' }), html);
});

test('root and article clears remain editable, external more link stays inert', () => {
  const empty = { heading: field('recent-heading', 'Single-Line Text', ''), moreLink: field('more-link', 'General Link', { href: '', text: '' }), releases: { targetItems: [] },
    fieldCollection: [{ name: 'heading', jsonValue: data.heading.jsonValue }, { name: 'moreLink', jsonValue: data.moreLink.jsonValue }] };
  assert.deepEqual(editingIds(render(Default, empty, true)), ['more-link', 'recent-heading']);
  assert.equal(newsroomRecentReleasesFields(empty).moreLink.jsonValue, empty.moreLink.jsonValue);
  assert.equal(links(render(Default, empty)).length, 0);
  const external = { ...empty, moreLink: field('more-link', 'General Link', { href: 'https://www.linkedin.com/company/allianz-life', text: 'Authored link' }) };
  assert.deepEqual(links(render(Default, external)), ['#service-unavailable']);
  assert.deepEqual(links(render(Default, external, true)), ['https://www.linkedin.com/company/allianz-life']);
});

test('author-selected ordered references have no six-card runtime cap or date sorting', () => {
  const rows = evidence.years[0].rows;
  const selected = [rows[11], rows[10], ...rows.filter((_, index) => ![10, 11].includes(index))].map(release);
  assert.deepEqual(links(render(Default, { ...data, releases: { targetItems: selected }, moreLink: undefined })), selected.map((item) => item.parent.parent.url.path));
  assert.equal(selected.length, 32);
});

test('whole-card title links never wrap native summary anchors, which remain independently actionable', () => {
  const selected = { ...data.releases.targetItems[0], summary: field('summary-links', 'Rich Text',
    '<p>See <a href="/about/subject-matter-experts" class="source-inline">our <strong>experts</strong></a> and <a href="https://www.linkedin.com/company/allianz-life" target="_blank" rel="noopener noreferrer">LinkedIn</a>.</p>') };
  const edited = { ...data, releases: { targetItems: [selected] } };
  for (const editable of [false, true]) {
    const html = render(Default, edited, editable);
    let depth = 0;
    for (const tag of html.matchAll(/<\/?a\b[^>]*>/gi)) {
      if (tag[0].startsWith('</')) depth -= 1;
      else { assert.equal(depth, 0, 'an authored summary anchor must not be inside a card anchor'); depth += 1; }
      assert.ok(depth >= 0);
    }
    assert.equal(depth, 0);
    assert.deepEqual(links(html), [selected.parent.parent.url.path, '/about/subject-matter-experts',
      editable ? 'https://www.linkedin.com/company/allianz-life' : '#service-unavailable', '/about/newsroom/2026-press-releases']);
    assert.match(html, /class="source-inline"[^>]*>our <strong>experts<\/strong>/);
    assert.match(html, /<article class="m-card">/);
    assert.match(html, /<div class="m-card__header"><h4><a\b/);
    assert.equal(html.includes('m-card__title-link--stretched'), !editable);
    if (editable) assert.ok(editingIds(html).includes('summary-links'));
  }
  const css = fs.readFileSync(new URL('../NewsroomRecentReleases.css', import.meta.url), 'utf8');
  assert.match(css, /m-card__title-link--stretched::after[\s\S]*?inset: 0;[\s\S]*?z-index: 1/);
  assert.match(css, /m-card__body a[^}]*z-index: 2/);
  assert.equal(selected.summary.jsonValue.value.includes('target="_blank"'), true);
});
