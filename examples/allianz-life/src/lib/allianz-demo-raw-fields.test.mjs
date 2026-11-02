import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const { safeEditorialRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial.ts'));
const variants = loadSource(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx'));
const field = (value, name = 'body') => ({ jsonValue: { value, metadata: { itemId: 'synthetic-native-owner', fieldId: `synthetic-${name}`, fieldType: 'Rich Text' } } });
const source = 'https://www.allianzlife.com';
const external = '<a href="https://third-party.example.test/original" target="_blank" data-original="yes">Unchanged third party</a>';
const historical = `${source}/SPA/MVARate/DisplayHistoricalRates?productGuid=synthetic-only`;

test('captured rate HTML changes only actual anchor destinations, preserving code, styles, forms and table bytes', () => {
  const scripts = `<script>const original = '<a href="${source}/Rates">literal data</a>'; const calculation = original.length * 2;</script>`
    + `<style>.original::after { content: '<a href="${source}/Rates">'; }</style>`
    + `<textarea name="unchanged"><a href="${source}/Rates">literal input</a></textarea>`
    + `<!-- <a href="${source}/Rates">literal comment</a> -->`
    + `<title><a href="${source}/Rates">literal title</a></title>`
    + `<div data-template='<a href="${source}/Rates">literal attribute</a>'>Original data</div>`;
  const table = '<form action="/unchanged" data-original="yes"><input name="original" value="original-value"><table><tbody><tr><td>Unchanged native text</td></tr></tbody></table></form>';
  const original = field(`${scripts}${table}<a href="${historical}" target="_blank">Historical rates</a>${external}`).jsonValue;
  const result = safeEditorialRichText(original, false, true, () => true);
  assert.equal(result.value, `${scripts}${table}<a href="#" target="">Historical rates</a>${external}`);
  assert.strictEqual(result.metadata, original.metadata);
  assert.strictEqual(safeEditorialRichText(original, true, true, () => true), original);
});

for (const name of ['EssentialIncome7MvaReference', 'RetirementFoundationAdvMvaReference', 'CoreIncome7MvaReference']) {
  test(`${name} contains the observed historical-rate link without changing the native heading or editing field`, () => {
    const data = { id: 'synthetic-mva', heading: field('Unchanged native heading', 'heading'), body: field(`<p><a href="${historical}" target="_blank">Historical MVA reference rates</a></p>${external}`) };
    const before = JSON.stringify(data), visitor = render(variants[name], data, false);
    assert.match(visitor, /href="#" target="">Historical MVA reference rates/);
    assert.ok(visitor.includes('Unchanged native heading')); assert.ok(visitor.includes(external));
    assert.doesNotMatch(visitor, /allianzlife\.com|productGuid/);
    assert.ok(render(variants[name], data, true).includes(historical));
    assert.equal(JSON.stringify(data), before);
  });
}

for (const name of ['IapDisclosures', 'RilaDisclosures', 'IapFootnotes', 'SelectResources', 'SelectRiderBrochure']) {
  test(`${name} contains the observed home, rates and unmapped PDF anchors while keeping other markup`, () => {
    const hrefs = [`${source}/`, `${source}/Rates`, `${source}/-/media/Files/Global/documents/2023/04/01/18/04/RILA-002.pdf`];
    const body = field(hrefs.map((href, index) => `<p><a href="${href}" target="_blank"${index === 2 ? ' download' : ''}>Original caption ${index}</a></p>`).join('') + external);
    const data = { id: 'synthetic-resource', body }, before = JSON.stringify(data);
    const visitor = render(variants[name], data, false);
    assert.match(visitor, /href="\/" target="">Original caption 0/);
    assert.match(visitor, /href="#" target="">Original caption 1/);
    assert.match(visitor, /href="#" target="">Original caption 2/);
    assert.doesNotMatch(visitor, /allianzlife\.com|\sdownload(?:\s|>)/);
    assert.ok(visitor.includes(external));
    const editing = render(variants[name], data, true);
    for (const href of hrefs) assert.ok(editing.includes(href));
    assert.equal(JSON.stringify(data), before);
  });
}

test('native RateTable body, captured table and empty-state fields contain the observed Rates/PDF anchors', () => {
  const { Default } = loadSource(path.join(sourceRoot, 'components/allianz-rate-table/AllianzRateTable.tsx'));
  const body = field(`<p><a href="${source}/what-we-offer/annuities/fixed-index-annuities/Benefit-Control/Rates">Allianz Benefit Control rates</a></p>${external}`);
  const tableBody = field(`<section><a href="${source}/what-we-offer/annuities/fixed-index-annuities/Benefit-Control-Plus/-/media/Files/Allianz/PDFs/FIA%20rates/M-8888.pdf" target="_blank" download>Download Guide to current rates (PDF)</a><table><tbody><tr><td>Original rates text</td></tr></tbody></table></section>`);
  for (const useEmptyState of [false, true]) {
    const data = { id: 'synthetic-table', heading: field('Original heading', 'heading'), body,
      ...(useEmptyState ? { emptyState: tableBody } : { tableBody }) }, before = JSON.stringify(data);
    const visitor = render(Default, data, false);
    assert.match(visitor, /href="#">Allianz Benefit Control rates/);
    assert.match(visitor, /href="#" target="">Download Guide to current rates/);
    assert.ok(visitor.includes('<table><tbody><tr><td>Original rates text</td></tr></tbody></table>'));
    assert.ok(visitor.includes(external));
    assert.doesNotMatch(visitor, /allianzlife\.com|\sdownload(?:\s|>)/);
    assert.match(render(Default, data, true), /allianzlife\.com/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('native RateSnapshot contains its body anchor without modifying rate/date fields or native editing', () => {
  const { Default } = loadSource(path.join(sourceRoot, 'components/allianz-rate-snapshot/AllianzRateSnapshot.tsx'));
  const data = { id: 'synthetic-snapshot', heading: field('Original heading', 'heading'), rate: field('Original value', 'rate'), asOf: field('Original date', 'as-of'), body: field(`<p><a href="${historical}" target="_blank">Historical rates</a></p>`) };
  const before = JSON.stringify(data), visitor = render(Default, data, false);
  assert.match(visitor, /href="#" target="">Historical rates/);
  assert.ok(visitor.includes('Original value')); assert.ok(visitor.includes('Original date'));
  assert.ok(render(Default, data, true).includes(historical));
  assert.equal(JSON.stringify(data), before);
});
