import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { here, sourceRoot, require, loadSource, render, field, metadata } from './sdk-test-helper.mjs';

const { parse } = require('graphql');
const postcss = require('postcss');
const components = {
  ExecutiveBiography: loadSource(path.join(sourceRoot, 'components/executive-biography/ExecutiveBiography.tsx')),
  ExpertBiography: loadSource(path.join(sourceRoot, 'components/expert-biography/ExpertBiography.tsx')),
  BiographyDisclosures: loadSource(path.join(sourceRoot, 'components/biography-disclosures/BiographyDisclosures.tsx')),
  LegalDisclosures: loadSource(path.join(sourceRoot, 'components/legal-disclosures/LegalDisclosures.tsx')),
};
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json'), 'utf8'));
const records = manifest.records;
const componentFor = (record) => components[record.rendering][record.variant];
const capture = (record) => Buffer.from(record.fragmentBase64, 'base64').toString('utf8');
const specs = [
  ['ExecutiveBiography', 'executive-biography', { name: 'Single-Line Text', role: 'Rich Text', portrait: 'Image', biography: 'Rich Text', portraitLink: 'General Link' }],
  ['ExpertBiography', 'expert-biography', { name: 'Single-Line Text', role: 'Rich Text', focus: 'Rich Text', portrait: 'Image', biography: 'Rich Text', downloadLink: 'General Link' }],
  ['BiographyDisclosures', 'biography-disclosures', { body: 'Rich Text' }],
];
function skeleton(kind, source) {
  const result = spawnSync('python3', [path.join(here, 'source_contract.py'), 'skeleton', kind], { input: source, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('all 41 captures independently match the minimal source fields and source families', () => {
  const result = spawnSync('python3', [path.join(here, 'source_contract.py')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(manifest.coverage, { routes: 41, executives: 8, experts: 29, ventures: 4,
    sourcePortraitsPresent: 37, intentionallyAbsentPortraits: 4, biographyDisclosureSections: 3,
    legalDisclosuresPopulated: 29, legalDisclosuresBlank: 12 });
});

test('the real SDK preserves every recovered biography shell, heading tag, optional portrait and source content order', () => {
  for (const record of records) {
    const fields = record.exactSourceFieldValues;
    const before = JSON.stringify(fields);
    const html = render(componentFor(record), fields);
    assert.deepEqual(skeleton(record.rendering, html), skeleton(record.rendering, capture(record)), record.route);
    assert.equal(JSON.stringify(fields), before, record.route);
    assert.ok(html.includes(fields.name.jsonValue.value.replaceAll('&', '&amp;')), record.route);
  }
});

test('every exact role, focus, biography and grey/legal HTML value survives the SDK without runtime normalization', () => {
  for (const record of records) {
    const fields = record.exactSourceFieldValues;
    const html = render(componentFor(record), fields);
    for (const name of ['role', 'focus', 'biography']) {
      if (fields[name]) assert.ok(html.includes(fields[name].jsonValue.value), `${record.route}: ${name}`);
    }
    for (const data of record.biographyDisclosures) {
      const grey = render(components.BiographyDisclosures.Default, data);
      assert.ok(grey.includes(data.body.jsonValue.value), record.route);
      assert.deepEqual(skeleton('BiographyDisclosures', grey), skeleton('BiographyDisclosures', capture(record)), record.route);
    }
    const legal = render(components.LegalDisclosures.Default, record.legalDisclosures);
    assert.ok(legal.includes(record.legalDisclosures.body.jsonValue.value), record.route);
    assert.deepEqual(skeleton('LegalDisclosures', legal), skeleton('LegalDisclosures', capture(record)), record.route);
  }
});

test('all 33 PDF links preserve source destination, target, label and exact download glyph', () => {
  for (const record of records.filter((entry) => entry.rendering === 'ExpertBiography')) {
    const html = render(componentFor(record), record.exactSourceFieldValues);
    const link = record.exactSourceFieldValues.downloadLink.jsonValue.value;
    assert.ok(html.includes(`href="${link.href}"`), record.route);
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    assert.ok(html.includes('aria-label="Download bio"'), record.route);
    assert.ok(html.includes('<span class="a-link__text">Download bio</span>'), record.route);
    assert.ok(html.includes(`d="${capture(record).match(/<path[^>]*\bd="([^"]+)"/)[1]}"`), record.route);
  }
});

test('every intentional source portrait absence stays absent and all public source image references stay distinct from native DAM evidence', () => {
  const absent = [];
  for (const record of records) {
    const html = render(componentFor(record), record.exactSourceFieldValues);
    if (!record.sourcePortrait) {
      absent.push(record.route);
      assert.doesNotMatch(html, /class="tileImage"|<img\b|<picture\b/);
      assert.deepEqual(record.exactSourceFieldValues.portrait.jsonValue.value, {});
      assert.equal(record.portraitState, 'intentionally absent in source');
    } else {
      assert.match(record.portraitState, /native DAM mapping unverified/);
      assert.match(record.sourcePortrait.src, /^\/-\/media\//);
      assert.match(html, /<img\b/);
      if (record.rendering === 'ExpertBiography') assert.match(html, /sizes="100vw" class="c-image__img c-teaser__image-img"/);
      else assert.match(html, /style="(?:width:768px;)?max-width:100%;height:auto"/);
    }
    assert.equal(Object.hasOwn(record.exactSourceFieldValues, 'id'), false);
  }
  assert.deepEqual(absent, [
    '/about/subject-matter-experts/benjamin-thomason', '/about/subject-matter-experts/jeng-chiu',
    '/about/subject-matter-experts/paul-cahill', '/about/ventures/clay-bottensek',
  ]);
});

test('all source typography, grid, blue/grey background and responsive rules are already present in the shared runtime stylesheet', () => {
  const expected = JSON.parse(fs.readFileSync(path.join(here, 'source-style-rules.json'), 'utf8'));
  const stylesheet = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8'));
  const runtime = [];
  stylesheet.walkRules((rule) => {
    const context = [];
    for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
      if (parent.type === 'atrule') context.unshift({ name: parent.name, params: parent.params });
    }
    runtime.push(JSON.stringify({ selector: rule.selector, declarations: rule.nodes.filter((node) => node.type === 'decl')
      .map((node) => ({ prop: node.prop, value: node.value, important: node.important ?? false })), context }));
  });
  for (const rule of expected) assert.ok(runtime.includes(JSON.stringify(rule)), `${JSON.stringify(rule.context)} ${rule.selector}`);
  assert.equal(expected.length, 87);
  assert.ok(expected.some((rule) => rule.selector.includes('tile--6633') && rule.declarations.some((decl) => decl.value === '33.333%')));
  assert.ok(expected.some((rule) => rule.context.some((entry) => entry.params.includes('max-width:703px'))));
});

test('purpose queries fetch only true named native fields as complete SDK jsonValue objects', () => {
  for (const [name, directory, fields] of specs) {
    const operation = parse(fs.readFileSync(path.join(sourceRoot, `components/${directory}/${directory}.graphql`), 'utf8')).definitions[0];
    assert.equal(operation.name.value, `${name}Data`);
    assert.deepEqual(operation.variableDefinitions.map((entry) => entry.variable.name.value), ['datasource', 'language']);
    const datasource = operation.selectionSet.selections[0];
    assert.equal(datasource.alias.value, 'datasource');
    assert.equal(datasource.name.value, 'item');
    assert.deepEqual(datasource.arguments.map((entry) => [entry.name.value, entry.value.name.value]), [['path', 'datasource'], ['language', 'language']]);
    assert.deepEqual(datasource.selectionSet.selections.map((entry) => entry.alias?.value || entry.name.value), ['id', ...Object.keys(fields)]);
    for (const entry of datasource.selectionSet.selections.slice(1)) {
      assert.equal(entry.name.value, 'field');
      assert.deepEqual(entry.arguments.map((argument) => [argument.name.value, argument.value.value]), [['name', entry.alias.value]]);
      assert.deepEqual(entry.selectionSet.selections.map((selection) => selection.name.value), ['jsonValue']);
    }
  }
});

test('each cleared native field retains its own real SDK metadata without borrowing generic content', () => {
  for (const [name, , fields] of specs) {
    const data = {};
    for (const [fieldName, type] of Object.entries(fields)) {
      data[fieldName] = { jsonValue: { value: ['Image', 'General Link'].includes(type) ? {} : '', metadata: metadata(fieldName, type) } };
    }
    data.heading = field('Generic heading cannot substitute');
    data.body = name === 'BiographyDisclosures' ? data.body : field('<p>Generic body cannot substitute</p>');
    data.children = { results: [{ heading: field('Generic child cannot substitute') }] };
    const before = JSON.stringify(data);
    const html = render(components[name].Default, data, true).replaceAll('&quot;', '"');
    for (const fieldName of Object.keys(fields).filter((entry) => name !== 'ExecutiveBiography' || entry !== 'portraitLink')) assert.ok(html.includes(`"fieldId":"test-${fieldName}-field"`), `${name}.${fieldName}`);
    assert.ok(html.includes('"itemId":"test-biography-item"'));
    assert.equal(JSON.stringify(data), before);
    const normal = render(components[name].Default, data);
    assert.doesNotMatch(normal, /Generic|data-sc-field|\[No text in field\]|Headshot|Download bio|Background:|Education, certifications/);
    if (name === 'ExpertBiography') assert.match(normal, /<h3>Focused on:<\/h3>/);
  }
});

test('each executive fixed variant preserves blank-field SDK editing metadata', () => {
  const record = records.find((entry) => entry.variant === 'LinkedPortrait');
  for (const variant of ['Default', 'Extended', 'Contained', 'ChiefExecutive', 'LinkedPortrait']) {
    const data = structuredClone(record.exactSourceFieldValues);
    for (const [name, type] of Object.entries(specs[0][2])) data[name].jsonValue = { value: ['Image', 'General Link'].includes(type) ? {} : '', metadata: metadata(name, type) };
    const html = render(components.ExecutiveBiography[variant], data, true).replaceAll('&quot;', '"');
    for (const name of ['name', 'role', 'portrait', 'biography']) assert.ok(html.includes(`"fieldId":"test-${name}-field"`), `${variant}.${name}`);
    if (variant === 'LinkedPortrait') assert.ok(html.includes('"fieldId":"test-portraitLink-field"'));
  }
});

test('clearing individual role, focus, biography and portrait values leaves other source fields independent', () => {
  const record = records.find((entry) => entry.rendering === 'ExpertBiography' && entry.sourcePortrait);
  for (const name of ['name', 'role', 'focus', 'portrait', 'biography', 'downloadLink']) {
    const data = structuredClone(record.exactSourceFieldValues);
    data[name] = field(['portrait', 'downloadLink'].includes(name) ? {} : '');
    const html = render(componentFor(record), data);
    for (const other of ['role', 'focus', 'biography']) {
      if (other !== name) assert.ok(html.includes(data[other].jsonValue.value), `${name} clearing keeps ${other}`);
    }
    if (name === 'portrait') assert.doesNotMatch(html, /<img\b|class="tileImage"/);
    if (name === 'downloadLink') assert.doesNotMatch(html, /class="a-link"|Download bio|<svg\b/);
  }
});

test('a linked executive portrait never exposes a URL label when the image is cleared', () => {
  const record = records.find((entry) => entry.variant === 'LinkedPortrait');
  const data = structuredClone(record.exactSourceFieldValues);
  const original = render(componentFor(record), data);
  assert.match(original, /<a href="[^" ]+"[^>]*><img\b/);
  data.portrait = field({});
  const cleared = render(componentFor(record), data);
  assert.doesNotMatch(cleared, /<a\b|<img\b|tile-azl-luca-gallo/);
  data.portrait = record.exactSourceFieldValues.portrait;
  data.portraitLink = field({});
  assert.match(render(componentFor(record), data), /<img\b/);
  assert.doesNotMatch(render(componentFor(record), data), /<a\b/);
});

test('the native download General Link keeps fragments, query strings and metadata without inventing a default destination', () => {
  const record = records.find((entry) => entry.rendering === 'ExpertBiography');
  const href = (value) => {
    const data = { ...record.exactSourceFieldValues, downloadLink: { jsonValue: { value, metadata: metadata('downloadLink', 'General Link') } } };
    const before = JSON.stringify(data);
    const html = render(componentFor(record), data);
    assert.equal(JSON.stringify(data), before);
    return html.match(/class="a-link"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="a-link"/)?.slice(1).find(Boolean)?.replaceAll('&amp;', '&');
  };
  assert.equal(href({ href: '/-/media/Files/Allianz/PDFs/about/bio/adam-brown.pdf?existing=1#source', querystring: '?native=2', anchor: '#native', text: 'Read bio' }), '/-/media/Files/Allianz/PDFs/about/bio/adam-brown.pdf?existing=1&native=2#native');
  assert.equal(href({ href: 'javascript:alert(1)', text: 'Unsafe' }), undefined);
  assert.equal(href({ href: '', text: '' }), undefined);
});

test('name text is escaped and semantic biography formatting is preserved without generic layout fields', () => {
  const record = records.find((entry) => entry.rendering === 'ExpertBiography');
  const data = { ...record.exactSourceFieldValues, name: field('Name <script>alert(1)</script>'),
    biography: field('<h3>Expertise:</h3><p style="text-align: left;"><strong>Authored experience</strong></p><ul><li>Membership</li></ul>') };
  const html = render(componentFor(record), data);
  assert.ok(html.includes('Name &lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes(data.biography.jsonValue.value));
  assert.doesNotMatch(html, /<p[^>]*><h3/);
});

test('generic rendering parameters cannot redesign any biography purpose', () => {
  const params = { theme: 'negative', layout: 'stacked', headingLevel: 'h6', spacing: 'none', columns: '4', imageSide: 'left' };
  for (const record of records) {
    const Component = componentFor(record);
    assert.equal(render(Component, record.exactSourceFieldValues), render(Component, record.exactSourceFieldValues, false, params));
    assert.match(render(Component, record.exactSourceFieldValues, false, { RenderingIdentifier: 'author-id' }), /id="author-id"/);
  }
  assert.equal(render(components.BiographyDisclosures.Default, { body: field('<p>Disclosure</p>') }), render(components.BiographyDisclosures.Default, { body: field('<p>Disclosure</p>') }, false, params));
});

test('missing datasource stays distinct from a deliberately cleared purpose', () => {
  for (const name of ['ExecutiveBiography', 'ExpertBiography', 'BiographyDisclosures']) {
    assert.match(render(components[name].Default, undefined), /role="status">Add a datasource/);
    assert.doesNotMatch(render(components[name].Default, {}), /Add a datasource/);
  }
});

test('media navigation is limited to 33 receipt-backed public PDFs and the one source linked portrait; unverified native/local/original-service URLs stay unavailable', () => {
  const { biographyLinkField } = loadSource(path.join(sourceRoot, 'components/expert-biography/expert-biography.props.ts'));
  for (const record of records.filter((entry) => entry.rendering === 'ExpertBiography')) {
    const original = { ...record.exactSourceFieldValues.downloadLink.jsonValue, metadata: metadata('downloadLink', 'General Link') };
    const before = JSON.stringify(original);
    const allowed = biographyLinkField(original, false);
    assert.equal(allowed.value.href, original.value.href);
    assert.equal(allowed.value.target, '_blank');
    assert.equal(allowed.metadata, original.metadata);
    assert.equal(biographyLinkField(original, true), original);
    assert.equal(JSON.stringify(original), before);
    assert.equal(record.sourceDocumentEvidence.http_status, 200);
    assert.equal(record.sourceDocumentEvidence.detected_type, 'pdf');
    assert.equal(record.sourceDocumentEvidence.nativeDeliveryState, 'unverified');
  }
  const example = records.find((entry) => entry.rendering === 'ExpertBiography').exactSourceFieldValues.downloadLink.jsonValue.value.href;
  for (const href of [
    `https://unverified.example${example}`, '//www.allianzlife.com' + example,
    'https://www.allianzlife.com/login', 'https://www.allianzlife.com/account',
    'http://www.allianzlife.com' + example, 'https://user:secret@www.allianzlife.com' + example,
    '/-/media/Files/Allianz/PDFs/about/bio/unverified.pdf', '/allianz-assets/unverified.pdf',
    'https://unverified-native-dam.example/media/portrait.jpg', '#service-unavailable',
  ]) {
    const original = { value: { href, text: 'Authored caption', target: '_blank', querystring: 'q=one', anchor: 'section' }, metadata: metadata('downloadLink', 'General Link') };
    const before = JSON.stringify(original);
    const blocked = biographyLinkField(original, false);
    assert.equal(blocked.value.href, '', href);
    assert.equal(blocked.value.querystring, '');
    assert.equal(blocked.value.anchor, '');
    assert.equal(blocked.metadata, original.metadata);
    assert.equal(biographyLinkField(original, true), original);
    assert.equal(JSON.stringify(original), before);
  }
  const linked = records.find((entry) => entry.variant === 'LinkedPortrait');
  const sourceLink = linked.exactSourceFieldValues.portraitLink.jsonValue;
  assert.equal(biographyLinkField(sourceLink, false, 'portrait').value.href, sourceLink.value.href);
  assert.equal(biographyLinkField(sourceLink, false, 'document').value.href, '');
  assert.equal(linked.sourceLinkedPortraitEvidence.http_status, 200);
  assert.equal(linked.sourceLinkedPortraitEvidence.detected_type, 'jpeg');
  assert.equal(linked.sourceLinkedPortraitEvidence.nativeDeliveryState, 'unverified');
});

test('ordinary P/two-P native roles and recovered DIV/SPAN roles stay valid, exact and independently editable in every fixed variant', () => {
  const variants = [
    ['expert', components.ExpertBiography.Default, 'h5', '5'],
    ...['Default', 'Extended', 'Contained', 'ChiefExecutive', 'LinkedPortrait'].map((variant) => [
      variant, components.ExecutiveBiography[variant], variant === 'ChiefExecutive' ? 'h2' : 'h4', variant === 'ChiefExecutive' ? '2' : '4',
    ]),
  ];
  const recovered = records.filter((record) => /<(?:div|span)\b/i.test(record.exactSourceFieldValues.role.jsonValue.value));
  assert.equal(recovered.length, 16);
  const values = ['<p>Role<br />Second line</p>', '<p>Role with <strong>emphasis</strong></p><p>Second line</p>',
    recovered.find((record) => /<span\b/i.test(record.exactSourceFieldValues.role.jsonValue.value)).exactSourceFieldValues.role.jsonValue.value,
    recovered.find((record) => record.exactSourceFieldValues.role.jsonValue.value.startsWith('<div>')).exactSourceFieldValues.role.jsonValue.value, ''];
  for (const [variant, Component, typography, level] of variants) {
    for (const value of values) {
      const role = { value, metadata: metadata('role', 'Rich Text') };
      const data = { role: { jsonValue: role } };
      const before = JSON.stringify(data);
      for (const editing of [false, true]) {
        const html = render(Component, data, editing);
        assert.equal(JSON.stringify(data), before, `${variant}: native metadata and exact value`);
        assert.ok(html.includes(value), `${variant}: exact role contents`);
        if (editing) assert.ok(html.replaceAll('&quot;', '"').includes('"fieldId":"test-role-field"'), variant);
        if (!value && !editing) {
          assert.doesNotMatch(html, /(?:executive|expert)-biography-role/);
          continue;
        }
        const result = spawnSync('python3', [path.join(here, 'source_contract.py'), 'role'], { input: html, encoding: 'utf8' });
        assert.equal(result.status, 0, `${variant}: ${result.stderr}`);
        const wrapper = JSON.parse(result.stdout);
        assert.equal(wrapper.tag, 'div');
        assert.equal(wrapper.role, 'heading');
        assert.equal(wrapper.ariaLevel, level);
        assert.deepEqual(wrapper.class.split(' '), [typography, `${variant === 'expert' ? 'expert' : 'executive'}-biography-role`]);
        if (value.startsWith('<p>')) assert.deepEqual(wrapper.directChildren, value.includes('</p><p>') ? ['p', 'p'] : ['p']);
        assert.doesNotMatch(html, /<h[245][^>]*><(?:p|div)\b/);
      }
    }
  }
});

test('block-safe role wrappers retain exact source responsive aliases and only add scoped source margins/direct editor-P resets', () => {
  const sourceRules = JSON.parse(fs.readFileSync(path.join(here, 'source-style-rules.json'), 'utf8'));
  for (const typography of ['h2', 'h4', 'h5']) {
    const aliases = sourceRules.filter((rule) => rule.selector === `.${typography},${typography}`);
    assert.ok(aliases.length >= 2, `${typography}: same source tag and class typography at base/responsive sizes`);
    assert.ok(aliases.every((rule) => rule.declarations.some((decl) => decl.prop === 'font-size') && rule.declarations.some((decl) => decl.prop === 'line-height')));
  }
  for (const [directory, filename, purpose, expectedMargin] of [
    ['executive-biography', 'ExecutiveBiography.css', 'executive', '0 0 24px'],
    ['expert-biography', 'ExpertBiography.css', 'expert', '24px 0'],
  ]) {
    const root = postcss.parse(fs.readFileSync(path.join(sourceRoot, `components/${directory}/${filename}`), 'utf8'));
    const rules = root.nodes.filter((node) => node.type === 'rule');
    assert.equal(rules.length, 2);
    assert.deepEqual(rules.map((rule) => rule.selector), [`.${directory} .${purpose}-biography-role`, `.${directory} .${purpose}-biography-role > p`]);
    assert.deepEqual(rules.map((rule) => rule.nodes.map((node) => [node.prop, node.value])), [[['margin', expectedMargin]], [['margin', '0']]]);
  }
  const sourceHeadingMargins = sourceRules.find((rule) => rule.selector.includes('.m-axlIntroductionBlock .tileSubHeading h2') && rule.selector.includes('.m-axlIntroductionBlock .tileSubHeading h4') && rule.declarations.some((decl) => decl.prop === 'margin'));
  assert.ok(sourceHeadingMargins.declarations.some((decl) => decl.prop === 'margin' && decl.value === '0 0 24px'));
});
