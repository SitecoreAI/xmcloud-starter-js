import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compile, filename, field, metadata, params, renderSDK } from './optional-icons-fixture.mjs';
const component = compile(fs.readFileSync(filename, 'utf8')).Default;
const owner = 'C4048FF2-67EC-4D98-9D2A-95B28C2D64A2';
const uid = '57532C33-7E0F-5DFA-8BC9-793E493C6FA1';
const data = { id: owner, heading: field(owner, 'heading', 'Retirement Income Calculator') };
const render = (input = data, renderingUID = uid, mode = 'normal') => renderSDK(component, input,
  params({ layout: 'plain', headingLevel: 'h2' }), mode, { rendering: { uid: renderingUID } });
test('exact calculator title has one h1 and retained h2 style in all modes', () => {
  for (const mode of ['normal', 'preview', 'editing']) {
    const before = JSON.stringify(data), html = render(data, uid, mode);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /<h1[^>]*class="h2"/);
    assert.match(html, /Retirement Income Calculator/);
    assert.equal(JSON.stringify(data), before);
    if (mode === 'editing') assert.ok(metadata(html).length, 'native authored field metadata retained');
  }
});
test('other owner or placement keeps authored level and canonical GUID forms match', () => {
  assert.doesNotMatch(render({ ...data, id: 'other-owner' }), /<h1\b/);
  assert.doesNotMatch(render(data, 'other-rendering'), /<h1\b/);
  assert.match(render({ ...data, id: '{' + owner.toLowerCase() + '}' }, '{' + uid.toLowerCase() + '}'), /<h1\b/);
});
test('empty optional title creates no h1', () => {
  assert.doesNotMatch(render({ ...data, heading: field(owner, 'heading', '') }), /<h1\b/);
});
