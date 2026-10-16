import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadSource } from '../../executive-biography/__tests__/sdk-test-helper.mjs';
import { baselineSource, compile, filename, fixture, freeze, params, renderSDK, sourceRoot } from './optional-icons-fixture.mjs';

const Components = compile(fs.readFileSync(filename, 'utf8'));
const Baseline = compile(baselineSource());
const { bodyDownloadLinkGlyphs } = loadSource(path.join(sourceRoot, 'lib/body-download-link-glyphs.ts'));
const sha = value => createHash('sha256').update(value).digest('hex');
// Two exact Body values and field metadata captured on 2026-10-16. These are
// portable test inputs, not proof of later native bindings or browser acceptance.
const NATIVE_BODIES = [
  {
    "ownerId": "CFD8B1EADC3E4ED5859C1A040D45A168",
    "bodySHA256": "98cef8dfdd8b6761336220290ee1045c1e41f7718b1855d8f55020ccab9aaee9",
    "field": {
      "metadata": {
        "datasource": {
          "id": "{CFD8B1EA-DC3E-4ED5-859C-1A040D45A168}",
          "language": "en",
          "revision": "8fd9c104-91cf-4fd5-b389-db7e59fb24bb",
          "version": 1
        },
        "title": "body",
        "fieldId": "{1ABE9416-1EE9-515A-9CAB-D32FA59D52DF}",
        "fieldType": "Rich Text",
        "rawValue": "<p><a class=\"a-link\" href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/e03e7d2478bc40a18790461977c353aa?v=3d1480f4\" target=\"_blank\" aria-label=\"Download product brochure (PDF)\">\r\n\r\n\t\t\t\t\t\t\t\t\t\t\t<span aria-hidden=\"true\" class=\"a-link__icon\">\r\n\t\t\t\t\t\t\t\t\t\t\t\t\r\n\t\t\t\t\t\t\t\t\t\t\t</span>\r\n\r\n\t\t\t\t\t\t\t\t\t\t<span class=\"a-link__text\">Download product brochure (PDF)</span>\r\n\t\t\t\t\t\t\t\t\t</a></p>"
      },
      "value": "<p><a class=\"a-link\" href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/e03e7d2478bc40a18790461977c353aa?v=3d1480f4\" target=\"_blank\" aria-label=\"Download product brochure (PDF)\">\r\n\r\n\t\t\t\t\t\t\t\t\t\t\t<span aria-hidden=\"true\" class=\"a-link__icon\">\r\n\t\t\t\t\t\t\t\t\t\t\t\t\r\n\t\t\t\t\t\t\t\t\t\t\t</span>\r\n\r\n\t\t\t\t\t\t\t\t\t\t<span class=\"a-link__text\">Download product brochure (PDF)</span>\r\n\t\t\t\t\t\t\t\t\t</a></p>"
    }
  },
  {
    "ownerId": "420B69CE900E4A16832BFDFA58C3AAC8",
    "bodySHA256": "6a58b4ddf0c21c1c4a2d020c03a6209713656ce8f942e73fc27cfbe2f91f5e80",
    "field": {
      "metadata": {
        "datasource": {
          "id": "{420B69CE-900E-4A16-832B-FDFA58C3AAC8}",
          "language": "en",
          "revision": "b4b2fbd1-8d08-4fd6-8463-b91d49fe8e7b",
          "version": 1
        },
        "title": "body",
        "fieldId": "{1ABE9416-1EE9-515A-9CAB-D32FA59D52DF}",
        "fieldType": "Rich Text",
        "rawValue": "<p>Each indexed allocation is a combination of an external market index and a formula for crediting your interest, called a crediting method. We offer a variety of allocation options, including some with bonus potential. </p>\r\n<p>You will potentially receive interest based on positive changes in the index(es) you’ve selected, subject to the crediting method. Crediting methods include caps (an upper limit on how much interest you can receive) and/or participation rates (the percentage of an index return that will be credited to your policy). </p>\r\n<div class=\"tileLink\">\r\n<p> <a class=\"a-link\" href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/238c3d57567b4d0a966211bbbe719f59?v=ff5941c1\" target=\"_blank\" aria-label=\"More about our crediting methods (PDF)\"> <span aria-hidden=\"true\" class=\"a-link__icon\">\r\n\r\n</span> <span class=\"a-link__text\">More about our crediting methods (PDF)</span> </a> </p>\r\n</div>\r\n<p>Caps and/or participation rates will vary depending on the option selected; ask your financial professional for the current options.</p>\r\n\t\t\t\t"
      },
      "value": "<p>Each indexed allocation is a combination of an external market index and a formula for crediting your interest, called a crediting method. We offer a variety of allocation options, including some with bonus potential. </p>\r\n<p>You will potentially receive interest based on positive changes in the index(es) you’ve selected, subject to the crediting method. Crediting methods include caps (an upper limit on how much interest you can receive) and/or participation rates (the percentage of an index return that will be credited to your policy). </p>\r\n<div class=\"tileLink\">\r\n<p> <a class=\"a-link\" href=\"https://thlt-demo.sitecoresandbox.cloud/api/public/content/238c3d57567b4d0a966211bbbe719f59?v=ff5941c1\" target=\"_blank\" aria-label=\"More about our crediting methods (PDF)\"> <span aria-hidden=\"true\" class=\"a-link__icon\">\r\n\r\n</span> <span class=\"a-link__text\">More about our crediting methods (PDF)</span> </a> </p>\r\n</div>\r\n<p>Caps and/or participation rates will vary depending on the option selected; ask your financial professional for the current options.</p>\r\n\t\t\t\t"
    }
  }
];
const SOURCE_PATH_SHA256 = '0c64a1ca1ea4f731cc5db370e9812ab9078cc839f246d02c8a434a9c1dbdd233';
const svgTags = html => html.match(/<svg\b[\s\S]*?<\/svg>/g) ?? [];
const removeGlyph = html => html.replace(/<svg\b[\s\S]*?<\/svg>/g, '');
const nativeData = record => ({ ...fixture({ iconState: 'missing' }), id: record.ownerId, body: { jsonValue: structuredClone(record.field) } });
const htmlField = value => ({ value, metadata: { itemId: 'synthetic-body-owner', fieldId: 'synthetic-body', fieldType: 'Rich Text' } });
const iconSlot = ' <span aria-hidden="true" class="a-link__icon">\r\n\t </span> ';
const anchor = (inside = iconSlot, attributes = 'class="a-link" href="/about"') => `<a ${attributes}>${inside}<span class="a-link__text">Authored label</span></a>`;

test('both captured PDF bodies receive one exact source glyph without changing a single existing byte or field', () => {
  assert.equal(NATIVE_BODIES.length, 2);
  for (const record of NATIVE_BODIES) {
    const field = freeze(structuredClone(record.field)), before = JSON.stringify(field);
    assert.equal(sha(field.value), record.bodySHA256);
    const projected = bodyDownloadLinkGlyphs(field, false);
    assert.notEqual(projected, field); assert.equal(projected.metadata, field.metadata);
    assert.equal(removeGlyph(projected.value), field.value);
    const icons = svgTags(projected.value); assert.equal(icons.length, 1);
    assert.match(icons[0], /viewBox="0 0 24 24"/); assert.match(icons[0], /fill-rule="evenodd"/);
    assert.match(icons[0], /aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(icons[0], /<title|<desc|\bid=|aria-labelledby|aria-describedby/);
    assert.equal(sha(icons[0].match(/\bd="([^"]+)"/)[1]), SOURCE_PATH_SHA256);
    assert.equal(JSON.stringify(field), before);
    assert.equal(bodyDownloadLinkGlyphs(projected, false), projected, 'Populated SVG must never be duplicated');
  }
});

test('the complete variant preserves Default layout, all other fields, anchor attributes and inputs', () => {
  for (const record of NATIVE_BODIES) {
    const data = freeze(nativeData(record)), before = JSON.stringify(data);
    for (const layout of ['plain', 'rich-text', 'disclosures']) {
      const input = params({ layout, alignment: 'left', headingLevel: 'h3', theme: 'blue-soft' });
      const html = renderSDK(Components.BodyDownloadLinks, data, input);
      assert.equal(svgTags(html).length, 1);
      assert.equal(removeGlyph(html), renderSDK(Components.Default, data, input));
      assert.equal(html, renderSDK(Components.Default, data, input, 'normal', { bodyDownloadLinks: true }));
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('editing passes the original Body object, value and native authoring metadata to the SDK', () => {
  const observed = [], instrumented = compile(fs.readFileSync(filename, 'utf8'), { observe: observed });
  for (const record of NATIVE_BODIES) {
    const data = freeze(nativeData(record)), field = data.body.jsonValue, before = JSON.stringify(data);
    observed.length = 0;
    const html = renderSDK(instrumented.BodyDownloadLinks, data, params(), 'editing');
    const bodyCalls = observed.filter(call => call.field === field);
    assert.equal(bodyCalls.length, 1); assert.equal(bodyCalls[0].editable, true);
    assert.equal(bodyCalls[0].field.metadata, field.metadata);
    assert.equal(bodyDownloadLinkGlyphs(field, true), field);
    assert.equal(bodyDownloadLinkGlyphs(field, undefined), field);
    assert.equal(html, renderSDK(Components.Default, data, params(), 'editing'));
    assert.ok(html.toLowerCase().includes(field.metadata.fieldId.toLowerCase()));
    assert.equal(svgTags(html).length, 0); assert.equal(JSON.stringify(data), before);
  }
});

test('ordinary links, populated or nonblank slots, ambiguous slots and malformed markup stay unchanged', () => {
  const unchanged = [
    '<p>Ordinary Body.</p>', '<a href="/about">Ordinary link</a>',
    anchor(iconSlot, 'class="other-link" href="/about"'),
    anchor(iconSlot, 'class="a-link-lookalike" href="/about"'),
    anchor('<span class="a-link__icon" aria-hidden="false"> </span>'),
    anchor('<span class="a-link__icon"> </span>'),
    anchor('<span class="other-icon" aria-hidden="true"> </span>'),
    anchor('<span class="a-link__icon" aria-hidden="true">Label</span>'),
    anchor('<span class="a-link__icon" aria-hidden="true">&nbsp;</span>'),
    anchor('<span class="a-link__icon" aria-hidden="true"><!-- retained comment --></span>'),
    anchor('<span class="a-link__icon" aria-hidden="true"><svg viewBox="0 0 1 1"><path d="M0 0"/></svg></span>'),
    anchor('<span class="a-link__icon" aria-hidden="true"><img src="/authored.svg"/></span>'),
    anchor(iconSlot + iconSlot), anchor(`<b>${iconSlot}</b>`),
    iconSlot + '<a class="a-link" href="/about">No authored icon slot</a>',
    `<div title='${anchor()}'>Quoted markup</div>`, `<!-- ${anchor()} -->`,
    ...['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes',
      'noscript', 'plaintext', 'template', 'listing'].flatMap(tag => [
      `<${tag}>${anchor()}</${tag}>`,
      `${anchor()}<${tag.toUpperCase()} data-note="retained">${anchor()}</${tag.toUpperCase()}>${anchor()}`,
    ]),
    anchor(iconSlot, 'class="a-link" class="a-link" href="/about"'),
    '<a class="a-link"><span class="a-link__icon" aria-hidden="true"> </a></span>',
    anchor().replace('</a>', ''), anchor().replace('</a>', '<a>nested</a></a>'),
  ];
  for (const value of unchanged) {
    const field = freeze(htmlField(value));
    assert.equal(bodyDownloadLinkGlyphs(field, false), field, value);
  }
  for (const field of [undefined, htmlField(''), htmlField('   '), { value: undefined }]) {
    assert.equal(bodyDownloadLinkGlyphs(field, false), field);
  }
});

test('quoted attributes, class tokens and multiple independent source anchors preserve every original byte', () => {
  const first = anchor(iconSlot, `href='/about?value=one>two' data-note='href="javascript:alert(1)"' class='other a-link source'`);
  const second = anchor(iconSlot, 'CLASS=a-link HREF=/why-allianz');
  const field = freeze(htmlField(`<p>${first}</p><br/><p>${second}</p>`));
  const projected = bodyDownloadLinkGlyphs(field, false);
  assert.equal(svgTags(projected.value).length, 2);
  assert.equal(removeGlyph(projected.value), field.value);
});

test('link safety and the existing source-destination overlay retain their exact previous behavior', () => {
  for (const sourceDestination of [false, true]) {
    const data = fixture({ iconState: 'missing' });
    data.body = { jsonValue: htmlField(anchor(iconSlot, 'class="a-link" href="javascript:alert(1)" target="_blank" rel="author"')) };
    data.primaryLink.jsonValue.value.href = 'javascript:alert(1)';
    if (sourceDestination) {
      data.id = 'fdedde9b-e382-46ea-b007-7164baecbf47';
      data.body.jsonValue.value = anchor(iconSlot, 'class="a-link" href="/for-financial-professionals/Life-Sales-Tools/life-advanced-markets-turnkey-programs?source=body#details" target="_blank" rel="author"');
    }
    freeze(data); const before = JSON.stringify(data);
    const html = renderSDK(Components.BodyDownloadLinks, data);
    assert.equal(removeGlyph(html), renderSDK(Components.Default, data));
    assert.match(html, /href="#service-unavailable"/, 'Existing primary General Link policy remains applied');
    if (sourceDestination) assert.match(html, /href="https:\/\/www\.allianzlife\.com\/for-financial-professionals\/Life-Sales-Tools\/life-advanced-markets-turnkey-programs\?source=body#details"/);
    assert.equal(renderSDK(Components.BodyDownloadLinks, data, params(), 'editing'), renderSDK(Components.Default, data, params(), 'editing'));
    assert.equal(JSON.stringify(data), before);
  }
});

test('Default stays byte-identical to the portable pre-change oracle without opting into the new variant', () => {
  for (const record of NATIVE_BODIES) for (const mode of ['normal', 'preview', 'editing']) {
    const data = freeze(nativeData(record));
    for (const layout of ['plain', 'rich-text', 'disclosures']) {
      const input = params({ layout });
      assert.equal(renderSDK(Components.Default, data, input, mode), renderSDK(Baseline.Default, data, input, mode));
    }
  }
  assert.equal(renderSDK(Components.BodyDownloadLinks, undefined), renderSDK(Components.Default, undefined));
});
