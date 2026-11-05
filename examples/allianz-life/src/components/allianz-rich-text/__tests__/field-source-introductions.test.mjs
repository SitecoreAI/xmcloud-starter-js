import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { compile, filename, fixture, field, params, renderSDK, metadata, imageTags, attribute, freeze, require, sourceRoot } from './optional-icons-fixture.mjs';
import { loadSource } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

// These three marketing bodies match the bounded native-field read; metadata is
// synthetic test metadata, not proof of a saved binding or native Preview QA.
const cases = [
  { name: 'FieldEventsIntroduction', owner: '616BF02E-EA4E-4746-B9E9-8383E6EAE1E1',
    presentation: 'events', icon: '/allianz-assets/596d403151346a0c.svg', alt: 'Date Forward',
    heading: 'Events at Allianz Field®', body: '<span id="events"></span>' },
  { name: 'FieldGlobalStadiumsIntroduction', owner: 'D1DF6FA9-4906-41B8-8888-C176F8DA3926',
    presentation: 'global-stadiums', icon: '/allianz-ui/about-overview/game.svg', alt: 'Game',
    heading: 'Meet our global family of stadiums', body: '<span id="global"></span><p>Allianz Field® is just one of eight Allianz® stadiums around the world. But ours may boast the coldest game-day temperature (3 degrees Fahrenheit at the USMNT World Cup Qualifier on February 1, 2022).</p><p><a href="#demo-unavailable">Learn about all eight stadiums</a></p>' },
  { name: 'FieldAboutIntroduction', owner: '1290E8A0-4763-4F61-88C1-76792943E779',
    presentation: 'about', icon: '/allianz-ui/about-overview/information.svg', alt: 'Information',
    heading: 'Get to know Allianz', body: '<p>Our full name is Allianz Life Insurance Company of North America, but you can call us Allianz. We’re best known as an innovator in financial services, and an employer of choice in the Twin Cities and beyond.</p>' },
];
const source = fs.readFileSync(filename, 'utf8');
const components = compile(source);
const makeData = spec => {
  const data = fixture({ owner: spec.owner, iconState: 'cleared' });
  data.heading = field(spec.owner, 'heading', spec.heading);
  data.subheading = field(spec.owner, 'subheading', '', 'Rich Text');
  data.body = field(spec.owner, 'body', spec.body, 'Rich Text');
  data.primaryLink = field(spec.owner, 'primaryLink', { href: '', text: '' }, 'General Link');
  return data;
};

for (const spec of cases) {
  test(`${spec.name}: actual native Body and fixed glyph survive normal/Preview/Editing without mutation`, () => {
    for (const mode of ['normal', 'preview', 'editing']) {
      const data = freeze(makeData(spec));
      const before = JSON.stringify(data), observed = [];
      const Component = compile(source, { observe: observed })[spec.name];
      const html = renderSDK(Component, data, params(), mode);
      const image = imageTags(html);
      assert.equal(image.length, 1);
      assert.equal(attribute(image[0], 'src'), spec.icon);
      assert.equal(attribute(image[0], 'alt'), spec.alt);
      assert.equal(observed.filter(call => call.name === 'Image').length, 0, 'fallback is never fabricated as SDK ImageField');
      assert.equal(observed.find(call => call.name === 'Text').field, data.heading.jsonValue);
      assert.equal(observed.find(call => call.name === 'RichText').field, data.body.jsonValue);
      assert.equal(observed.find(call => call.name === 'RichText').editable, mode === 'editing');
      assert.ok(html.includes(spec.body), 'full native Body remains present, including nonvisual anchors');
      assert.ok(html.includes(`data-allianz-field-introduction="${spec.presentation}"`));
      if (spec.presentation === 'events') assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
      else assert.match(html, /m-axlTile match-height -is--stacked t-bg-transparent/);
      if (mode === 'editing') {
        const chrome = metadata(html);
        assert.ok(chrome.some(item => item.fieldId === 'fixture-heading' && item.itemId === spec.owner));
        assert.ok(chrome.some(item => item.fieldId === 'fixture-body' && item.itemId === spec.owner));
        assert.ok(!chrome.some(item => item.fieldType === 'Image'), 'static glyph has no counterfeit CMS chrome');
      }
      assert.equal(JSON.stringify(data), before);
    }
  });

  test(`${spec.name}: missing and cleared native Icon use source fallback`, () => {
    for (const state of ['missing', 'undefined', 'undefined-json', 'undefined-value', 'cleared', 'empty-src', 'null-value', 'null-src']) {
      const data = fixture({ owner: spec.owner, iconState: state });
      if (state === 'null-value') data.icon.jsonValue.value = null;
      if (state === 'null-src') data.icon.jsonValue.value.src = null;
      freeze(data);
      for (const mode of ['normal', 'preview', 'editing']) {
        const images = imageTags(renderSDK(components[spec.name], data, params(), mode));
        assert.equal(images.length, 1, state);
        assert.equal(attribute(images[0], 'src'), spec.icon, state);
      }
    }
  });

  test(`${spec.name}: populated native fields retain SDK identity, metadata, title and editability`, () => {
    for (const mode of ['normal', 'preview', 'editing']) {
      const data = freeze(fixture({ owner: spec.owner }));
      const before = JSON.stringify(data), observed = [];
      const html = renderSDK(compile(source, { observe: observed })[spec.name], data, params({ headingLevel: 'h3', alignment: 'left' }), mode);
      const imageCall = observed.find(call => call.name === 'Image');
      assert.equal(imageCall.field, data.icon.jsonValue);
      assert.equal(imageCall.editable, mode === 'editing');
      assert.equal(attribute(imageTags(html)[0], 'src'), data.icon.jsonValue.value.src);
      assert.match(html, /Authored icon title/);
      assert.ok(html.includes('<h3'));
      assert.match(html, /u-text-left/);
      for (const [name, fieldName] of [['Text', 'heading'], ['RichText', 'subheading'], ['RichText', 'body']]) {
        assert.ok(observed.some(call => call.name === name && call.field === data[fieldName].jsonValue));
      }
      const link = observed.find(call => call.name === 'Link');
      assert.equal(link.field.metadata, data.primaryLink.jsonValue.metadata);
      if (mode === 'editing') {
        assert.equal(link.field, data.primaryLink.jsonValue);
        assert.ok(metadata(html).some(item => item.fieldId === data.icon.jsonValue.metadata.fieldId));
      }
      assert.equal(JSON.stringify(data), before);
    }
  });

  test(`${spec.name}: malformed populated Icon never activates SDK Image or fallback`, () => {
    const malformedValues = [false, 0, 'invalid-record', [], { src: false }, { src: 0 }, { src: 42 }, { src: {} }, { src: [] }, { src: '   ' }];
    const assignments = malformedValues.map(value => data => { data.icon.jsonValue.value = value; });
    for (const value of [false, 0, 'invalid-container', []]) {
      assignments.push(data => { data.icon = value; });
      assignments.push(data => { data.icon.jsonValue = value; });
    }
    for (const assign of assignments) {
      const data = makeData(spec), observed = [];
      assign(data);
      freeze(data);
      const before = JSON.stringify(data);
      for (const mode of ['normal', 'preview', 'editing']) {
        const html = renderSDK(compile(source, { observe: observed })[spec.name], data, params(), mode);
        assert.equal(imageTags(html).length, 0, 'malformed native Icon fails closed');
        assert.equal(observed.filter(call => call.name === 'Image').length, 0);
        assert.ok(html.includes(spec.body));
      }
      assert.equal(JSON.stringify(data), before);
    }
  });

  test(`${spec.name}: datasource absence and empty content remain safe`, () => {
    for (const mode of ['normal', 'preview', 'editing']) {
      const html = renderSDK(components[spec.name], undefined, params(), mode);
      assert.match(html, /AllianzRichText/);
      assert.equal(imageTags(html).length, 0);
      const data = makeData(spec);
      for (const key of ['heading', 'subheading', 'body']) data[key].jsonValue.value = '';
      const empty = renderSDK(components[spec.name], freeze(data), params(), mode);
      assert.equal((empty.match(/<h[1-6]\b/g) ?? []).length, 0);
      assert.equal((empty.match(/<a\b/g) ?? []).length, 0);
    }
  });

  test(`${spec.name}: native primary-link rejection and demo containment stay unchanged`, () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,no', '//unregistered.example/escape', 'https://unregistered.example/escape', '/Login', '#demo-unavailable']) {
      const data = makeData(spec);
      data.primaryLink = field(spec.owner, 'primaryLink', { href, text: 'Authored label', target: '_blank' }, 'General Link');
      const before = JSON.stringify(data);
      for (const mode of ['normal', 'preview']) {
        const html = renderSDK(components[spec.name], freeze(data), params(), mode);
        const linkTag = [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]).at(-1);
        assert.ok(['#', '#service-unavailable'].includes(attribute(linkTag, 'href')), href);
        assert.notEqual(attribute(linkTag, 'target'), '_blank');
      }
      assert.equal(JSON.stringify(data), before);
    }
    const data = makeData(spec);
    data.body = field(spec.owner, 'body', '<p><a href="https://www.allianzlife.com/Contact-Us" target="_blank">Contact</a> <a href="https://www.allianzlife.com/Login">Account</a></p>', 'Rich Text');
    const html = renderSDK(components[spec.name], freeze(data));
    assert.doesNotMatch(html, /href="https:\/\/www\.allianzlife\.com/);
    assert.match(html, /href="\/contact-us"/i);
    assert.match(html, /href="#"/);
  });
}

test('shared glyph helper exposes only six fixed vectors and fails closed for unknown runtime kinds', () => {
  const { AllianzFieldGlyph } = loadSource(path.join(sourceRoot, 'lib/allianz-field-glyph.tsx'));
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  const paths = {
    connect: '/allianz-assets/4e90bfa982a5c809.svg', home: '/allianz-assets/2e3cd2d4635d2e9a.svg',
    globe: '/allianz-assets/01be54a5db39aebe.svg', 'date-forward': '/allianz-assets/596d403151346a0c.svg',
    game: '/allianz-ui/about-overview/game.svg', information: '/allianz-ui/about-overview/information.svg',
  };
  for (const [kind, src] of Object.entries(paths)) {
    const html = renderToStaticMarkup(React.createElement(AllianzFieldGlyph, { kind, className: 'code-owned-class' }));
    assert.equal(attribute(imageTags(html)[0], 'src'), src);
    assert.equal(attribute(imageTags(html)[0], 'class'), 'code-owned-class');
    assert.ok(attribute(imageTags(html)[0], 'alt').length > 0);
    assert.ok(fs.existsSync(path.join(sourceRoot, '../public', src)));
  }
  for (const kind of ['unknown', '__proto__', 'constructor', '', undefined, null]) {
    assert.equal(renderToStaticMarkup(React.createElement(AllianzFieldGlyph, { kind })), '');
  }
});
