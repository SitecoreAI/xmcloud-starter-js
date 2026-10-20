import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { field, loadSource, metadata, render, require, sourceRoot } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { Default: Accordion } = loadSource(path.join(sourceRoot, 'components/allianz-accordion/AllianzAccordion.tsx'));
const answer = (id, heading) => ({ id, heading: field(heading),
  body: { jsonValue: { value: `<p>${heading} answer</p>`, metadata: metadata(id, 'Rich Text') } } });
const datasource = () => ({ children: { results: [answer('shared-first', 'First question'), answer('shared-second', 'Second question')] } });

function pairs(html) {
  const triggers = [...html.matchAll(/<button\b([^>]*)>/g)].map(([, attrs]) => ({
    id: attrs.match(/\bid="([^"]+)"/)?.[1],
    controls: attrs.match(/\baria-controls="([^"]+)"/)?.[1],
  }));
  const panels = [...html.matchAll(/<div\b([^>]*\brole="region"[^>]*)>/g)].map(([, attrs]) => ({
    id: attrs.match(/\bid="([^"]+)"/)?.[1],
    labelledBy: attrs.match(/\baria-labelledby="([^"]+)"/)?.[1],
  }));
  return { triggers, panels };
}

test('two Default instances sharing children have unique, bidirectional disclosure IDs', () => {
  const data = datasource();
  const before = JSON.stringify(data);
  const props = { params: {}, fields: { data: { datasource: data } } };
  const Pair = () => React.createElement(React.Fragment, null,
    React.createElement(Accordion, props), React.createElement(Accordion, props));
  const html = render(Pair, {});
  const { triggers, panels } = pairs(html);
  assert.equal(triggers.length, 4);
  assert.equal(panels.length, 4);
  const ids = [...triggers, ...panels].map(item => item.id);
  assert.ok(ids.every(Boolean));
  assert.equal(new Set(ids).size, 8, 'shared datasource IDs must not collide across component instances');
  for (const trigger of triggers) {
    const target = panels.filter(panel => panel.id === trigger.controls);
    assert.equal(target.length, 1);
    assert.equal(target[0].labelledBy, trigger.id);
  }
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 4);
  assert.equal((html.match(/hidden=""/g) || []).length, 4);
  assert.equal(JSON.stringify(data), before);
});

test('editing keeps all supplied answers open and preserves Sitecore field metadata', () => {
  const data = datasource();
  const before = JSON.stringify(data);
  const html = render(Accordion, data, true);
  const { triggers, panels } = pairs(html);
  assert.equal(triggers.length, 2);
  assert.equal(panels.length, 2);
  assert.equal((html.match(/aria-expanded="true"/g) || []).length, 2);
  assert.doesNotMatch(html, /hidden=""/);
  assert.match(html, /test-shared-first-field/);
  assert.match(html, /test-shared-second-field/);
  assert.equal(JSON.stringify(data), before);
});

test('missing and intentionally empty datasources keep distinct existing output', () => {
  for (const data of [undefined, null]) {
    assert.match(render(Accordion, data), /Add a datasource for AllianzAccordion\./);
  }
  const html = render(Accordion, { children: { results: [] } });
  assert.doesNotMatch(html, /Add a datasource|<button|role="region"/);
  assert.match(html, /c-accordion--light/);
});
