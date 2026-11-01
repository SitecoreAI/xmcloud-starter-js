import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, render, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const { allianzCardFields } = loadSource(path.join(sourceRoot, 'lib/allianz-card-fields.ts'));
const products = [['RilaAccumulationProducts', 2], ['RilaIncomeProducts', 3]];
const altCases = [['absent', undefined], ['empty', ''], ['authored', 'Authored RILA portrait']];
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
};

function datasource(count, alt) {
  return {
    children: { results: Array.from({ length: count }, (_, index) => ({
      id: `test-rila-card-${index}`,
      fieldCollection: [
        { name: 'heading', jsonValue: { value: `Retained product ${index}` } },
        { name: 'body', jsonValue: { value: '<p>Retained synthetic body.</p>' } },
        { name: 'image', jsonValue: {
          value: { src: `/test-rila-card-${index}.jpg`, width: '512', height: '350',
            ...(alt === undefined ? {} : { alt }) },
          metadata: {
            datasource: { id: `test-rila-card-${index}`, language: 'en', revision: 'test-revision', version: 1 },
            fieldId: `test-rila-image-field-${index}`, fieldType: 'Image',
          },
        } },
      ],
    })) },
  };
}

function imageTags(markup) {
  return markup.match(/<img\b[^>]*>/g) ?? [];
}

for (const [variant, count] of products) {
  for (const [state, alt] of altCases) {
    for (const editing of [false, true]) {
      test(`${variant}: ${state} alt reaches SDK image in ${editing ? 'editing' : 'visitor'} mode`, () => {
        const data = freeze(datasource(count, alt)), before = JSON.stringify(data);
        const markup = render(Cards[variant], data, editing, { RenderingIdentifier: 'test-rila-products' });
        const images = imageTags(markup);
        assert.equal(images.length, count);
        for (const [index, tag] of images.entries()) {
          // Presence is essential: img.alt is also empty when the attribute is absent.
          assert.match(tag, /\salt="[^"]*"/);
          assert.equal(/\salt="([^"]*)"/.exec(tag)[1], alt ?? '');
          assert.ok(tag.includes(`src="/test-rila-card-${index}.jpg"`));
          assert.match(tag, /width="512"/);
          assert.match(tag, /height="350"/);
          assert.match(tag, /class="c-image__img c-teaser__image-img"/);
          const card = data.children.results[index];
          const field = card.fieldCollection.find(field => field.name === 'image').jsonValue;
          assert.strictEqual(allianzCardFields(card).image.jsonValue, field);
          if (editing) assert.ok(markup.includes(field.metadata.fieldId));
        }
        assert.equal(JSON.stringify(data), before);
      });
    }
  }

  test(`${variant}: a cleared visitor image stays omitted`, () => {
    for (const value of [{ src: '', alt: '' }, {}]) {
      const data = datasource(1);
      data.children.results[0].fieldCollection.find(field => field.name === 'image').jsonValue.value = value;
      freeze(data);
      const before = JSON.stringify(data);
      const markup = render(Cards[variant], data, false);
      assert.equal(imageTags(markup).length, 0);
      assert.match(markup, /Retained product 0/);
      assert.equal(JSON.stringify(data), before);
    }
  });
}

for (const [variant, count] of [['RilaBenefits', 3], ['RilaSupport', 2]]) {
  test(`${variant}: product image fields do not alter the glyph-only row`, () => {
    for (const editing of [false, true]) {
      const withoutImages = datasource(count);
      for (const card of withoutImages.children.results) {
        card.fieldCollection = card.fieldCollection.filter(field => field.name !== 'image');
      }
      freeze(withoutImages);
      const expected = render(Cards[variant], withoutImages, editing);
      assert.equal(imageTags(expected).length, 0);
      assert.equal((expected.match(/<svg\b/g) ?? []).length, count);
      for (const [, alt] of altCases) {
        const withImages = freeze(datasource(count, alt)), before = JSON.stringify(withImages);
        assert.equal(render(Cards[variant], withImages, editing), expected);
        assert.equal(JSON.stringify(withImages), before);
      }
    }
  });
}
