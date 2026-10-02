import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { component, contract, fixture, witness, render, wire, field, editingIds, links, decode, sourceRoot } from '../../company-hero/__tests__/runtime.mjs';
const { Default } = component('offerings-prompt', 'OfferingsPrompt');
const { offeringsPromptFields } = contract('offerings-prompt');
const evidence = fixture('offerings-prompt');
const data = evidence.canonicalMigrationPreview;

test('offerings renders preserved migrated root content with fixed green h2/h5 and primary button', () => {
  const html = render(Default, data);
  const original = evidence.datasources[0].children.results[0];
  assert.equal(data.heading.jsonValue.value, original.heading.jsonValue.value);
  assert.equal(data.body.jsonValue.value, original.subheading.jsonValue.value);
  assert.deepEqual(data.icon, original.icon);
  assert.deepEqual(data.link, original.link);
  assert.match(html, /t-bg-green-soft axlTileCollection allianz-offerings-prompt/);
  assert.match(html, /<h2>What can we do for you\?<\/h2>/);
  assert.match(html, /<h5>See how our life insurance and annuities/);
  assert.match(html, /class="m-axlButton m-axlButton--primary"/);
  assert.deepEqual(links(html), ['/what-we-offer']);
  assert.equal(render(Default, wire(data)), html);
  assert.ok(witness('offerings-prompt').includes('What can we do for you?'));
  assert.doesNotMatch(html, /a-link__icon|<img|mask-image/);
  assert.equal(render(Default, data, false, { theme: 'white', columns: '3', style: 'arrow', headingLevel: 'h1' }), html);
});

test('offerings four root fields retain clears and SDK metadata without borrowing historical child data', () => {
  const root = { ...evidence.datasources[0], heading: field('prompt-heading', 'Single-Line Text', ''), body: field('prompt-body', 'Rich Text', ''),
    icon: field('prompt-icon', 'Image', {}), link: field('prompt-link', 'General Link', { href: '', text: '' }) };
  assert.deepEqual(editingIds(render(Default, root, true)), ['prompt-body', 'prompt-heading', 'prompt-icon', 'prompt-link']);
  assert.doesNotMatch(render(Default, root), /What can we|See how|href=|<img/);
  assert.equal(offeringsPromptFields(wire(root)).link.jsonValue, root.link.jsonValue);
  const missing = { id: root.id, children: root.children };
  assert.equal(offeringsPromptFields(missing).heading, undefined);
  assert.doesNotMatch(render(Default, missing), /What can we|See how|href=|<img/);
  const external = { ...root, heading: field('prompt-heading', 'Single-Line Text', 'Heading'), link: field('prompt-link', 'General Link', {
    href: 'https://careers.allianz.com/us/en/allianz-us-life', text: 'Authored external', target: '_blank' }) };
  assert.deepEqual(links(render(Default, external)), ['#service-unavailable']);
  assert.deepEqual(links(render(Default, external, true)), ['https://careers.allianz.com/us/en/allianz-us-life']);
  assert.match(decode(render(Default, external, true)), /"fieldId":"prompt-link"/);
  assert.equal(render(Default, { ...data, children: { total: 10 } }), render(Default, data));
});

test('offerings runtime/query carry no native identity logic or child projection', () => {
  const props = fs.readFileSync(path.join(sourceRoot, 'components/offerings-prompt/offerings-prompt.props.ts'), 'utf8');
  const query = fs.readFileSync(path.join(sourceRoot, 'components/offerings-prompt/offerings-prompt.graphql'), 'utf8');
  assert.doesNotMatch(props, /31377e86|22c00cc1|existingOfferings|children|fallback/);
  assert.doesNotMatch(query, /children|31377e86|22c00cc1/);
});
