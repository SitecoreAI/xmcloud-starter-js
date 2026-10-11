import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const source = JSON.parse(fs.readFileSync(new URL('./resource-next-steps-source.fixture.json', import.meta.url), 'utf8'));
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
const field = (name, value, type = 'Single-Line Text') => ({ value,
  metadata: { itemId: `test-only-resource-next-${name}`, fieldId: `test-only-resource-next-${name}-field`, fieldType: type } });

test('ResourceNextSteps intrinsically renders the exact source child and three SDK link rows without native linkLayout', () => {
  const card = { id: 'test-only-resource-next-card', fieldCollection: Object.entries(source.card).map(([name, value]) => ({
    name, jsonValue: field(name, ['image', 'icon'].includes(name) ? {} : name === 'link' ? {} : value,
      name === 'body' || name === 'subheading' ? 'Rich Text' : name === 'link' ? 'General Link' : 'Single-Line Text'),
  })), links: { targetItems: [] } };
  const data = { ...Object.fromEntries(Object.entries(source.grid).map(([name, value]) => [name, { jsonValue: field(`grid-${name}`, value) }])), children: { results: [card] } };
  const held = render(Cards.ResourceNextSteps, data);
  assert.equal(held.split('Take the next step').length - 1, 1);
  assert.ok(held.includes('<h2>Take the next step</h2>'));
  assert.ok(held.includes(source.card.body));
  assert.match(held, /t-bg-green-soft/); assert.match(held, /tileContent u-text-center/);
  assert.match(held, /tileBody u-font-size-xl/); assert.doesNotMatch(held, /<footer>/);
  // Destinations are explicit test-only SDK projections, never native bindings.
  card.links.targetItems = [source.link1, source.link2, source.link3].map((item, index) => ({
    id: `test-only-resource-next-nav-${index}`, link: { jsonValue: field(`link-${index}`, { href: `/test-only-resource-next/${index}`, text: item.title }, 'General Link') },
    icon: { jsonValue: field(`icon-${index}`, {}, 'Image') },
  }));
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Cards.ResourceNextSteps, data, editing, { theme: 'transparent', bodySize: 'medium', linkLayout: 'inline' });
    assert.equal(html.split('class="tileLink"').length - 1, 3);
    const arrows = [...html.matchAll(/<span class="a-link__icon" aria-hidden="true">(<svg[^>]*>.*?<\/svg>)<\/span>/g)].map(match => match[1]);
    assert.equal(arrows.length, 3);
    arrows.forEach((svg, index) => {
      assert.ok(svg.includes(`d="${source.sourceArrows[index].pathData}"`));
      assert.match(svg, /focusable="false"/);
      assert.doesNotMatch(svg, /tabindex|aria-label|aria-labelledby|aria-describedby|<title|\bid=|\brole=/i);
    });
    assert.ok(html.includes(source.card.body));
    let previous = -1;
    for (const item of card.links.targetItems) {
      const position = html.indexOf(`>${item.link.jsonValue.value.text}</span>`);
      assert.ok(position > previous); previous = position;
      if (editing) {
        assert.ok(html.includes(item.link.jsonValue.metadata.fieldId));
        assert.ok(html.includes(item.icon.jsonValue.metadata.fieldId));
      }
    }
    if (editing) for (const name of ['heading', 'body']) assert.ok(html.includes(`test-only-resource-next-${name}-field`));
    assert.match(html, /t-bg-green-soft/); assert.match(html, /tileBody u-font-size-xl/);
  }
  assert.equal(JSON.stringify(data), before);
  card.links.targetItems[1].icon.jsonValue.value = { src: '/test-only-resource-next/bound-arrow.svg', alt: '' };
  const bound = render(Cards.ResourceNextSteps, data);
  assert.equal(bound.split(`<path fill-rule="evenodd" d="${source.sourceArrows[0].pathData}"`).length - 1, 2);
  assert.equal(bound.split('src="/test-only-resource-next/bound-arrow.svg"').length - 1, 1);
  assert.match(bound, /<span class="a-link__icon" aria-hidden="true"><img/);
});
