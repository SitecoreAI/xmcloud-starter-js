import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Components = loadSource(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx'));
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(decode(match[1])));
const field = (name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: 'test-only-about-root', fieldId: `test-only-${name}`, fieldType: type } } });
const disclosureBody = [
  '<p><sup>1</sup> Native first footnote.</p>', '<p><sup>2</sup> Native second footnote.</p>', '<hr />',
  ...Array.from({ length: 8 }, (_, index) => `<p>Complete native disclosure paragraph ${index + 3}.</p>`),
].join('');
const fixture = () => ({
  heading: field('heading', 'Native plain heading'), body: field('body', '<p>Complete native <em>introduction</em>.</p>', 'Rich Text'),
  subheading: field('subheading', 'UNUSED-SUBHEADING', 'Rich Text'),
  primaryLink: field('primaryLink', { href: '/unused-link', text: 'UNUSED-LINK' }, 'General Link'),
  image: field('image', { src: '/unused-image.png' }, 'Image'), icon: field('icon', { src: '/unused-icon.svg' }, 'Image'),
});
const variants = [
  { name: 'AboutSectionHeading', theme: 'transparent', active: ['heading'], information: false },
  { name: 'AboutInformationHeading', theme: 'green-soft', active: ['heading', 'body'], information: true },
  { name: 'AboutDisclosures', theme: 'grey-muted', active: ['body'], information: false },
];
for (const variant of variants) {
  test(`${variant.name} uses fixed source presentation and the original native fields in both modes`, () => {
    const data = fixture();
    if (variant.name === 'AboutDisclosures') data.body.jsonValue.value = disclosureBody;
    const before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(Components[variant.name], data, editing, { theme: 'purple-soft', headingLevel: 'h5', alignment: 'left',
        layout: 'rich-text', spacing: 'xl', RenderingIdentifier: 'native-about-section' });
      assert.ok(html.includes(`t-bg-${variant.theme}`));
      assert.ok(html.includes('id="native-about-section"'));
      assert.doesNotMatch(html, /UNUSED|unused-|purple-soft|<h5/);
      assert.equal((html.match(/<h2\b/g) ?? []).length, variant.active.includes('heading') ? 1 : 0);
      if (variant.active.includes('body')) assert.ok(html.includes(data.body.jsonValue.value));
      else assert.ok(!html.includes(data.body.jsonValue.value));
      assert.equal(html.includes('/allianz-ui/about-overview/information.svg'), variant.information);
      if (variant.name === 'AboutDisclosures') {
        assert.equal((html.match(/<p>/g) ?? []).length, 10);
        assert.equal((html.match(/<sup>/g) ?? []).length, 2);
        assert.equal((html.match(/<hr\s*\/?\s*>/g) ?? []).length, 1);
        assert.ok(html.includes('tileContent u-text-left'));
        assert.doesNotMatch(html, /a-axlDisclosures|content-body disclosure/);
      } else {
        assert.ok(html.includes('tileContent u-text-center'));
        assert.ok(html.includes('l-grid__row u-margin-bottom-lg u-padding-top-lg'));
      }
    }
    assert.equal(JSON.stringify(data), before);
  });
  test(`${variant.name} exposes each source-owned native SDK field once and no inactive surfaces`, () => {
    const data = fixture(), before = JSON.stringify(data), actual = markers(render(Components[variant.name], data, true));
    assert.equal(actual.length, variant.active.length);
    for (const name of variant.active) {
      const metadata = data[name].jsonValue.metadata;
      assert.equal(actual.filter(value => value.itemId === metadata.itemId && value.fieldId === metadata.fieldId).length, 1);
    }
    assert.equal(JSON.stringify(data), before);
  });
  test(`${variant.name} preserves real cleared author fields without inventing missing values`, () => {
    const data = fixture();
    for (const name of variant.active) data[name].jsonValue.value = '';
    const before = JSON.stringify(data);
    assert.equal(markers(render(Components[variant.name], data, true)).length, variant.active.length);
    assert.equal(markers(render(Components[variant.name], data, false)).length, 0);
    assert.equal(JSON.stringify(data), before);
    for (const name of variant.active) delete data[name];
    assert.equal(markers(render(Components[variant.name], data, true)).length, 0);
    assert.ok(render(Components[variant.name], undefined).includes('AllianzRichText'));
  });
}

test('Information glyph preserves its source accessible name and precedes the header directly', () => {
  const html = render(Components.AboutInformationHeading, fixture());
  assert.match(html, /tileContent u-text-center"><div class="tileIcon t-bg-primary-brand t-icon-primary-white"><img[^>]*alt="Information"[^>]*\/><\/div><header>/);
  assert.doesNotMatch(html, /aria-hidden="true"|unused-icon/);
});

test('About Information CSS retains source white glyph size at the source medium breakpoint', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-rich-text/AllianzAboutHeadings.css'), 'utf8');
  assert.match(css, /\.allianz-about-heading \.tileIcon > \.allianz-about-information-glyph\s*\{[^}]*width: 26px;[^}]*height: auto;[^}]*filter: brightness\(0\) invert\(1\);/);
  assert.match(css, /@media \(min-width: 704px\)[\s\S]*width: 40px;/);
  assert.equal((css.match(/\.allianz-about-heading/g) ?? []).length, 2);
});
