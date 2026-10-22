import assert from 'node:assert/strict';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import Module from 'node:module';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { sourceDestinationLinkField, restoreSourceDestinationLinkProps, restoreSourceDestinationRichText } =
  loadSource(path.join(sourceRoot, 'lib/allianz-source-destinations.ts'));
const { isSourceDestinationRichTextHref } = loadSource(path.join(sourceRoot, 'lib/allianz-source-destinations.ts'));
const { safeNewsroomRichText } = loadSource(path.join(sourceRoot, 'components/legal-disclosures/newsroom-grey.links.props.ts'));
const { safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { Default: RichText } = loadSource(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx'));
const { Default: Navigation, FixedTabs } = loadSource(path.join(sourceRoot, 'components/allianz-product-navigation/AllianzProductNavigation.tsx'));
const CardGrid = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const origin = 'https://www.allianzlife.com';
const linkPairs = [
  ['5b186c88-36a6-4df8-b910-0187d1bd7101', '/for-financial-professionals/Life-Sales-Tools/flexible-estate-planning-materials'],
  ['143dd9d8-760c-4ac5-8959-1c534360e51c', '/for-financial-professionals/Life-Sales-Tools/key-employee-compensation-materials'],
  ['5d51bc88-7cc8-4f15-9ed7-2598ee011858', '/for-financial-professionals/Life-Sales-Tools/essential-concepts'],
  ['b95a8d69-1735-4b27-8c57-e7bc71106800', '/what-we-offer/annuities/fixed-index-annuities/Benefit-Control-Plus/Rates'],
  ['6976acdf-f6d1-420d-a805-13e46b79fe4d', '/what-we-offer/annuities/fixed-index-annuities/Accumulation-Advantage-plus/Rates'],
];
const richPairs = [
  ['c4f12d3c-2db1-4cc9-8dbc-1b6683ecf133', '/what-we-offer/Index-Lock'],
  ['fdedde9b-e382-46ea-b007-7164baecbf47', '/for-financial-professionals/Life-Sales-Tools/life-advanced-markets-turnkey-programs'],
];
const ratesDatasources = ['CACFB676-BE20-46FE-8AFE-37E15CEE5269', 'EE094E0A-E561-4C49-8E8C-2A5F8F16AC6A'];
const otherOwner = '00000000-0000-0000-0000-000000000999';
const link = (href, properties = {}) => ({ value: { href, text: 'Source destination', linktype: 'external', ...properties },
  metadata: { itemId: 'original-native-owner', fieldId: 'original-native-link', fieldType: 'General Link' },
  editable: '<a data-native-editing="true">Original native editing chrome</a>' });
const rich = (value) => ({ value, metadata: { itemId: 'original-native-owner', fieldId: 'original-native-body', fieldType: 'Rich Text' },
  editable: '<p data-native-editing="true">Original native editing chrome</p>' });
const field = (name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: 'native-sdk-owner', fieldId: name, fieldType: type } } });
const freeze = (value) => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const decode = (value) => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'");
const anchors = (html) => [...html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/gs)].map((match) => ({
  href: decode(match[1].match(/\bhref="([^"]*)"/)?.[1] ?? ''), attributes: match[1],
  text: match[2].replace(/<code\b[^>]*>.*?<\/code>/gs, '').replace(/<[^>]+>/g, '').trim(),
}));
const metadata = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/gs)]
  .map((match) => JSON.parse(decode(match[1])));

function render(Component, datasource, { mode = 'normal', params = {}, currentId } = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en',
      ...(mode === 'missing' ? {} : { mode: mode === 'unknown' ? {}
        : { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' } }),
      layout: { sitecore: { context: {}, route: { name: 'Source destinations', itemId: currentId, fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params,
    fields: { data: { datasource, contextItem: { id: currentId } } },
  })));
}

function withContentMode(mode, run) {
  const previousNode = process.env.NODE_ENV, previousMode = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  process.env.NODE_ENV = 'test'; process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
  try { return run(); } finally {
    if (previousNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNode;
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE; else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = previousMode;
  }
}

test('only the five exact source General Link owner/path pairs project to the official absolute destination', () => {
  for (const [owner, destination] of linkPairs) {
    for (const href of [destination, `${origin}${destination}`]) {
      const input = freeze(link(href, { title: 'Original title', class: 'native-class', target: '_self', rel: 'author',
        ariaLabel: 'Original accessible caption' }));
      const before = JSON.stringify(input), output = sourceDestinationLinkField(input, false, owner);
      assert.ok(output);
      assert.notEqual(output, input); assert.notEqual(output.value, input.value);
      assert.equal(output.value.href, `${origin}${destination}`);
      for (const key of ['text', 'linktype', 'title', 'class', 'target', 'rel', 'ariaLabel']) assert.equal(output.value[key], input.value[key]);
      assert.equal(output.metadata, input.metadata); assert.equal(output.editable, input.editable);
      assert.equal(JSON.stringify(input), before);
    }
    for (const [differentOwner] of linkPairs.filter(([id]) => id !== owner)) {
      assert.equal(sourceDestinationLinkField(link(destination), false, differentOwner), undefined);
    }
    for (const [richOwner] of richPairs) assert.equal(sourceDestinationLinkField(link(destination), false, richOwner), undefined);
  }
});

test('native owner identity accepts canonical GUID formats but never malformed, absent, or inferred IDs', () => {
  const [owner, destination] = linkPairs[0], input = link(destination);
  for (const id of [owner, owner.toUpperCase(), `{${owner.toUpperCase()}}`, owner.replaceAll('-', ''), `{${owner.replaceAll('-', '')}}`]) {
    assert.equal(sourceDestinationLinkField(input, false, id)?.value.href, `${origin}${destination}`);
  }
  for (const id of [undefined, null, '', 42, {}, otherOwner, ` ${owner}`, `${owner} `, `{${owner}`, `${owner}}`, `${owner}-extra`]) {
    assert.equal(sourceDestinationLinkField(input, false, id), undefined, String(id));
  }
  assert.equal(sourceDestinationLinkField({ ...input, metadata: { ...input.metadata, itemId: owner } }, false, undefined), undefined,
    'field metadata cannot silently replace the explicit native owner contract');
});

test('source projections preserve encoded query order and fragments while splitting native Link attributes', () => {
  for (const [owner, destination] of linkPairs) {
    const input = freeze(link(`${destination}?tag=one&tag=two&q=a%23b#href-section`, {
      querystring: '?native=one&data=c%26d', anchor: '#native-section', target: '_blank', rel: 'author',
    }));
    const output = sourceDestinationLinkField(input, false, owner);
    assert.equal(output.value.href, `${origin}${destination}`);
    assert.equal(output.value.querystring, 'tag=one&tag=two&q=a%23b&native=one&data=c%26d');
    assert.equal(output.value.anchor, 'native-section');
    assert.equal(output.value.target, '_blank'); assert.equal(output.value.rel, 'author');
    assert.equal(output.metadata, input.metadata);
    assert.equal(sourceDestinationLinkField(link(`${destination}?q=one#href-section`, { querystring: 'q=one' }), false, owner).value.querystring, 'q=one');
    assert.equal(sourceDestinationLinkField(link(`${destination}#href-section`), false, owner).value.anchor, 'href-section');
  }
});

test('cleared, native replacements, unavailable markers and nonvisitor modes never qualify for Link restoration', () => {
  const [owner, destination] = linkPairs[0];
  for (const input of [undefined, {}, { value: {} }, link(''), link('#service-unavailable'), link(`${destination}#demo-unavailable`),
    link(`${destination}#SERVICE-UNAVAILABLE`), link(destination, { anchor: '#service-unavailable' }),
    link(destination, { anchor: 'demo-unavailable' }), link(destination, { linktype: 'internal' }),
    link(destination, { linktype: 'media' }), link(destination, { linktype: 'anchor' }),
    link(destination, { id: '{A-NATIVE-TARGET-REPLACEMENT}' }), link(destination, { linktype: undefined, id: otherOwner })]) {
    assert.equal(sourceDestinationLinkField(input, false, owner), undefined);
  }
  for (const isEditing of [true, undefined, null, 0, 'false']) assert.equal(sourceDestinationLinkField(link(destination), isEditing, owner), undefined);
  for (const linktype of [undefined, '', 'EXTERNAL']) {
    assert.equal(sourceDestinationLinkField(link(destination, { linktype }), false, owner)?.value.href, `${origin}${destination}`);
  }
});

test('exact source paths reject case changes, auth services, alternate origins and parser-normalized lookalikes', () => {
  for (const [owner, destination] of linkPairs) {
    for (const href of [destination.toLowerCase(), `${destination}/`, `${destination}/extra`, ` ${destination}`,
      destination.replace('/for-', '/%66or-').replace('/what-', '/%77hat-'), `${origin}${destination}`.replace('https:', 'http:'),
      `${origin}:443${destination}`, `${origin.replace('www.', '')}${destination}`,
      `https://WWW.allianzlife.com${destination}`, `//www.allianzlife.com${destination}`,
      `https://elsewhere.example${destination}`, `https://www.allianzlife.com.evil.example${destination}`,
      `https://user:password@www.allianzlife.com${destination}`, `/other/..${destination}`, destination.replaceAll('/', '//'),
      '/Login', '/secured', '/Registration', '/new-york/Registration', '/-/media/Project/Allianz-Life/Documents/source.pdf']) {
      assert.equal(sourceDestinationLinkField(link(href), false, owner), undefined, href);
    }
  }
});

test('Link props restore raw authored attributes after ordinary fallback and recompute new-tab protection', () => withContentMode('fixture', () => {
  const [owner, destination] = linkPairs[3];
  for (const [target, authoredRel, expectedRel] of [['_blank', 'author', 'author noopener noreferrer'],
    ['_BLANK', 'author NoOpener', 'author NoOpener noreferrer'], ['_self', 'author', 'author'], [undefined, undefined, undefined]]) {
    const input = freeze(link(destination, { target, rel: authoredRel }));
    const props = freeze({ ...safeLinkRenderProps(input), 'aria-label': 'Existing props', className: 'existing-class' });
    const output = restoreSourceDestinationLinkProps(props, input, false, owner);
    assert.equal(output.field.value.href, `${origin}${destination}`);
    assert.equal(output.field.value.target, target); assert.equal(output.rel, expectedRel);
    assert.equal(output.className, props.className); assert.equal(output['aria-label'], props['aria-label']);
    assert.equal(output.field.metadata, input.metadata); assert.notEqual(output, props);
    assert.equal(restoreSourceDestinationLinkProps(props, input, true, owner), props);
    assert.equal(restoreSourceDestinationLinkProps(props, input, false, otherOwner), props);
  }
}));

test('the two Rich Text source owners alter only matching href bases and preserve every other authored byte', () => {
  for (const [owner, destination] of richPairs) {
    for (const quote of ['"', "'", '']) for (const href of [destination, `${origin}${destination}`]) {
      const html = `<p class="copy">Before <a class='native' href=${quote}${href}?tag=one&amp;tag=two#section${quote} title="Original > title" target="_blank" rel="author">Authored <strong>caption</strong></a> after.</p>`;
      const input = freeze(rich(html)), output = restoreSourceDestinationRichText(input, false, owner);
      assert.ok(output); assert.equal(output.value, html.replace(`href=${quote}${href}`, `href=${quote}${origin}${destination}`));
      assert.equal(output.metadata, input.metadata); assert.equal(output.editable, input.editable);
      assert.equal(input.value, html);
      if (href.startsWith('https:')) assert.equal(output, input, 'an already absolute source body keeps its identity');
      else assert.notEqual(output, input);
    }
  }
});

test('Rich Text href recognition respects quoted attribute contents, data attributes, case and greater-than signs', () => {
  const [owner, destination] = richPairs[0];
  const body = `<p data-href="${destination}">Unchanged data</p><a title='literal href="${destination}"' href="/unchanged">Keep</a><a data-href="${destination}">Keep too</a><A title="Authored > title" HREF = '${destination}?x=1&amp;y=2#details' data-info="unchanged">Restore</A>`;
  const output = restoreSourceDestinationRichText(rich(body), false, owner);
  assert.equal(output.value, body.replace(`HREF = '${destination}`, `HREF = '${origin}${destination}`));
  assert.equal((output.value.match(/https:\/\/www\.allianzlife\.com/g) ?? []).length, 1);
});

test('editor, cleared, wrong-owner, native-media, auth and unavailable Rich Text values retain original field identity', () => {
  for (const [owner, destination] of richPairs) {
    const input = freeze(rich(`<p><a href="${destination}">Source</a></p>`));
    for (const mode of [true, undefined, null]) assert.equal(restoreSourceDestinationRichText(input, mode, owner), input);
    for (const wrongOwner of [undefined, otherOwner, ...linkPairs.map(([id]) => id), ...richPairs.filter(([id]) => id !== owner).map(([id]) => id)]) {
      assert.equal(restoreSourceDestinationRichText(input, false, wrongOwner), input);
    }
    for (const href of [destination.toLowerCase(), `${destination}/`, `https://user:password@www.allianzlife.com${destination}`,
      `https://elsewhere.example${destination}`, `//www.allianzlife.com${destination}`, `${destination}#service-unavailable`,
      `${destination}#DEMO-UNAVAILABLE`, '/Login', '/secured', '/Registration', '/-/media/Project/Allianz-Life/Documents/native.pdf']) {
      const untouched = freeze(rich(`<p><a href="${href}">Keep original</a></p>`));
      assert.equal(restoreSourceDestinationRichText(untouched, false, owner), untouched, href);
    }
    const empty = freeze(rich(''));
    assert.equal(restoreSourceDestinationRichText(empty, false, owner), empty);
    assert.equal(restoreSourceDestinationRichText(undefined, false, owner), undefined);
  }
});

test('actual SDK RichText.Default restores both source owners only in visitor and Preview body fields', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const [owner, destination] of richPairs) for (const layout of ['introduction', 'rich-text', 'disclosures']) {
      const body = `<p>Source <a href="${destination}?view=public&amp;q=a%23b#section" target="_blank" rel="author">Exact source <strong>caption</strong></a>.</p>`;
      const data = freeze({ id: owner, heading: field('sdk-heading', 'Original heading'), body: field('sdk-body', body, 'Rich Text'),
        subheading: field('sdk-subheading', `<a href="${destination}">Separate field remains local</a>`, 'Rich Text') });
      const before = JSON.stringify(data);
      for (const mode of ['normal', 'preview']) {
        const html = render(RichText, data, { mode, params: { layout, RenderingIdentifier: 'native-rich-text' } });
        assert.match(html, /id="native-rich-text"/);
        const restored = anchors(html).find(({ text }) => text === 'Exact source caption');
        assert.equal(restored?.href, `${origin}${destination}?view=public&q=a%23b#section`);
        assert.match(restored.attributes, /target="_blank" rel="author"/);
        if (layout === 'introduction') assert.equal(anchors(html).find(({ text }) => text === 'Separate field remains local').href, destination);
        assert.deepEqual(metadata(html), []);
      }
      const editor = render(RichText, data, { mode: 'editing', params: { layout } });
      assert.ok(editor.includes(body));
      assert.equal(metadata(editor).some(({ fieldId }) => fieldId === 'sdk-body'), true);
      assert.equal(anchors(editor).find(({ text }) => text === 'Exact source caption').href, `${destination}?view=public&q=a%23b#section`);
      assert.equal(JSON.stringify(data), before);
    }
  });
});

test('actual SDK RichText.Default leaves wrong-owner bodies and cleared fields available through Content without canvas controls', () => {
  const [, destination] = richPairs[0];
  const data = { id: otherOwner, body: field('sdk-unrelated-body', `<a href="${destination}">Unrelated owner</a>`, 'Rich Text') };
  assert.equal(anchors(render(RichText, data, { params: { layout: 'rich-text' } }))[0].href, destination);
  data.id = richPairs[0][0]; data.body.jsonValue.value = '';
  assert.deepEqual(metadata(render(RichText, data, { mode: 'editing', params: { layout: 'rich-text' } })), []);
  assert.deepEqual(anchors(render(RichText, data, { params: { layout: 'rich-text' } })), []);
});

function navigationData(index, attributes = {}) {
  const [owner, destination] = linkPairs[index + 3];
  return { id: ratesDatasources[index], primaryNav: { targetItems: [
    { id: 'native-product-title', title: field('product-title', 'Product title'), link: field('product-link', { href: '/what-we-offer/annuities', text: 'Product title' }, 'General Link') },
    { id: 'native-overview', title: field('overview-title', 'Overview'), link: field('overview-link', { href: '/what-we-offer', text: 'Overview', id: otherOwner, linktype: 'internal' }, 'General Link') },
    { id: owner, title: field('rates-title', 'Rates'), link: field('rates-link', { href: destination, text: 'Rates', linktype: 'external', ...attributes }, 'General Link') },
  ] } };
}

test('actual SDK FixedTabs restores both Rates links with native query, target, rel and labels in the matching datasource only', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const index of [0, 1]) {
      const [, destination] = linkPairs[index + 3];
      const data = freeze(navigationData(index, { querystring: 'tag=one&tag=two&q=a%23b', anchor: 'rates', target: '_blank',
        rel: 'author', title: 'Original rates title', ariaLabel: 'Native Rates label' }));
      const before = JSON.stringify(data);
      for (const mode of ['normal', 'preview']) {
        const html = render(FixedTabs, data, { mode, currentId: otherOwner, params: { RenderingIdentifier: 'native-product-navigation' } });
        const rates = anchors(html).find(({ text }) => text === 'Rates');
        assert.equal(rates.href, `${origin}${destination}?tag=one&tag=two&q=a%23b#rates`);
        assert.match(rates.attributes, /target="_blank"/); assert.match(rates.attributes, /rel="author noopener noreferrer"/);
        assert.match(rates.attributes, /title="Original rates title"/); assert.match(rates.attributes, /aria-label="Native Rates label"/);
        assert.match(html, /id="native-product-navigation"/);
        assert.deepEqual(anchors(html).map(({ text }) => text), ['Product title', 'Overview', 'Rates']);
        assert.match(anchors(html).find(({ text }) => text === 'Overview').attributes, /aria-current="page"/);
        assert.deepEqual(metadata(html), []);
      }
      const original = data.primaryNav.targetItems[2].link.jsonValue;
      const expectedEditor = safeLinkRenderProps(original).field.value;
      const editor = render(FixedTabs, data, { mode: 'editing' });
      const rates = anchors(editor).find(({ text }) => text === 'Rates');
      assert.equal(rates.href, `${expectedEditor.href}${expectedEditor.querystring ? `?${expectedEditor.querystring}` : ''}${expectedEditor.anchor ? `#${expectedEditor.anchor}` : ''}`);
      assert.equal(metadata(editor).some(({ fieldId }) => fieldId === 'rates-link'), true);
      assert.match(editor, /aria-expanded="false"/);
      assert.doesNotMatch(editor, /<button\b[^>]*disabled=/);
      assert.equal(JSON.stringify(data), before);
    }
  });
});

test('Default navigation and mismatched FixedTabs datasource keep the existing link fallback', () => withContentMode('fixture', () => {
  for (const index of [0, 1]) {
    const data = navigationData(index), original = data.primaryNav.targetItems[2].link.jsonValue;
    const expected = safeLinkRenderProps(original).field.value.href;
    assert.equal(anchors(render(Navigation, data)).find(({ text }) => text === 'Rates').href, expected);
    for (const datasourceId of [otherOwner, ratesDatasources[1 - index], undefined]) {
      assert.equal(anchors(render(FixedTabs, { ...data, id: datasourceId })).find(({ text }) => text === 'Rates').href, expected);
    }
    for (const value of [{ href: '' }, { href: '/Login', linktype: 'external' },
      { href: linkPairs[index + 3][1], linktype: 'internal', id: otherOwner },
      { href: linkPairs[index + 3][1], linktype: 'media', id: otherOwner }]) {
      const replacement = navigationData(index); replacement.primaryNav.targetItems[2].link.jsonValue.value = value;
      const html = render(FixedTabs, replacement);
      assert.equal(anchors(html).find(({ text }) => text === 'Rates')?.href ?? '', safeLinkRenderProps({ value }).field.value.href);
    }
  }
}));

test('missing or malformed FixedTabs datasource identities never admit Advanced Markets link-owner exceptions', () => withContentMode('fixture', () => {
  for (const [owner, destination] of linkPairs.slice(0, 3)) {
    for (const datasourceId of [undefined, null, '', 'malformed-native-id', `{${ratesDatasources[0]}`, otherOwner, ratesDatasources[0]]) {
      const data = navigationData(0);
      data.id = datasourceId;
      data.primaryNav.targetItems[2].id = owner;
      data.primaryNav.targetItems[2].link.jsonValue.value = { href: destination, text: 'Rates', linktype: 'external', target: '_blank' };
      const before = JSON.stringify(data), expected = safeLinkRenderProps(data.primaryNav.targetItems[2].link.jsonValue);
      for (const mode of ['normal', 'preview', 'editing']) {
        const rates = anchors(render(FixedTabs, data, { mode })).find(({ text }) => text === 'Rates');
        assert.equal(rates.href, expected.field.value.href, `${owner}: ${String(datasourceId)} ${mode}`);
        assert.notEqual(rates.href, `${origin}${destination}`);
      }
      assert.equal(JSON.stringify(data), before);
    }
  }
  for (const index of [0, 1]) for (const datasourceId of [undefined, null, '', 'malformed-native-id', `{${ratesDatasources[index]}`]) {
    const data = navigationData(index); data.id = datasourceId;
    const expected = safeLinkRenderProps(data.primaryNav.targetItems[2].link.jsonValue).field.value.href;
    assert.equal(anchors(render(FixedTabs, data)).find(({ text }) => text === 'Rates').href, expected);
  }
}));

test('actual SDK callers never enable source projection when editing mode is missing or unknown', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const mode of ['unknown', 'missing']) {
      for (const [owner, destination] of richPairs) for (const layout of ['introduction', 'rich-text']) {
        const data = freeze({ id: owner, body: field('unknown-mode-body', `<p><a href="${destination}">Keep native destination</a></p>`, 'Rich Text') });
        const before = JSON.stringify(data), html = render(RichText, data, { mode, params: { layout } });
        assert.equal(anchors(html).find(({ text }) => text === 'Keep native destination').href, destination);
        assert.deepEqual(metadata(html), []);
        assert.equal(JSON.stringify(data), before);
      }
      for (const index of [0, 1]) {
        const data = freeze(navigationData(index));
        const before = JSON.stringify(data), expected = safeLinkRenderProps(data.primaryNav.targetItems[2].link.jsonValue).field.value.href;
        const rates = anchors(render(FixedTabs, data, { mode })).find(({ text }) => text === 'Rates');
        assert.equal(rates.href, expected);
        assert.notEqual(rates.href, `${origin}${linkPairs[index + 3][1]}`);
        assert.equal(JSON.stringify(data), before);
      }
    }
  });
});

const cardDatasources = { index: '68F5EEA4-E83F-46E2-AADF-B4D244AA8230', advanced: '0B2C3B00-9523-45B1-89E7-32B1B9BBD34A' };
const cardLayouts = ['list', 'cards', 'stacked'];
const cardParams = (layout) => ({ layout, columns: '3', theme: 'transparent', headingLevel: 'h3', RenderingIdentifier: 'native-card-grid' });
const cardField = (owner, name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: `source-card-${name}`, fieldType: type } } });
const wireCard = (card) => ({ id: card.id, fieldCollection: Object.entries(card).filter(([name]) => name !== 'id')
  .map(([name, value]) => ({ name, jsonValue: value.jsonValue })) });
const hrefAttributes = (html) => [...html.matchAll(/<a\b([^>]*)>/g)].map((match) => ({
  href: decode(match[1].match(/\bhref="([^"]*)"/)?.[1] ?? ''), attributes: match[1],
}));
function indexCardData(asFieldCollection = true) {
  const [owner, destination] = richPairs[0];
  const card = { id: owner,
    heading: cardField(owner, 'heading', 'Index source card'),
    body: cardField(owner, 'body', `<p>Native <a href="${destination}?tag=one&amp;tag=two&amp;q=a%23b#details" target="_blank" rel="author">Index Lock details</a> with <strong>original formatting</strong>.</p>`, 'Rich Text'),
    link: cardField(owner, 'link', { href: '/about', text: 'Original card link', linktype: 'internal' }, 'General Link'),
  };
  return { id: cardDatasources.index, children: { results: [asFieldCollection ? wireCard(card) : card] } };
}
function advancedCardData(asFieldCollection = true, properties = {}) {
  const cards = linkPairs.slice(0, 3).map(([owner, destination], index) => ({ id: owner,
    heading: cardField(owner, 'heading', `Advanced source card ${index + 1}`),
    body: cardField(owner, 'body', `<p>Original source copy ${index + 1}.</p>`, 'Rich Text'),
    link: cardField(owner, 'link', { href: destination, text: `Advanced scalar link ${index + 1}`, linktype: 'external',
      target: '_blank', rel: 'author', querystring: 'tag=one&tag=two&q=a%23b', anchor: 'materials',
      title: `Native source title ${index + 1}`, ...properties }, 'General Link'),
  }));
  return { id: cardDatasources.advanced, children: { results: asFieldCollection ? cards.map(wireCard) : cards } };
}
const collectionField = (card, name) => card.fieldCollection.find((entry) => entry.name === name).jsonValue;
const renderedLinkHref = (value) => `${value.href}${value.querystring ? `?${value.querystring}` : ''}${value.anchor ? `#${value.anchor}` : ''}`;

test('actual SDK Default CardGrid restores only the resolved Index body owner in list, cards and stacked query shapes', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const layout of cardLayouts) {
      const wire = freeze(indexCardData()), named = freeze(indexCardData(false));
      const before = JSON.stringify(wire), originalBody = collectionField(wire.children.results[0], 'body');
      for (const mode of ['normal', 'preview']) {
        const html = render(CardGrid.Default, wire, { mode, params: cardParams(layout) });
        assert.ok(html.includes(`href="${origin}${richPairs[0][1]}?tag=one&amp;tag=two&amp;q=a%23b#details" target="_blank" rel="author"`));
        assert.match(html, /Index Lock details<\/a> with <strong>original formatting<\/strong>/);
        assert.equal(hrefAttributes(html).filter(({ href }) => href.startsWith(`${origin}${richPairs[0][1]}`)).length, 1);
        assert.ok(hrefAttributes(html).some(({ href }) => href === '/about'), 'the separate scalar link keeps its ordinary native destination');
        assert.equal(html, render(CardGrid.Default, named, { mode, params: cardParams(layout) }));
        assert.deepEqual(metadata(html), []);
      }
      const editor = render(CardGrid.Default, wire, { mode: 'editing', params: cardParams(layout) });
      assert.ok(editor.includes(originalBody.value));
      assert.ok(metadata(editor).some(({ itemId, fieldId }) => itemId === richPairs[0][0] && fieldId === 'source-card-body'));
      assert.equal(editor, render(CardGrid.Default, named, { mode: 'editing', params: cardParams(layout) }));
      assert.equal(JSON.stringify(wire), before);
    }
  });
});

test('actual SDK Default CardGrid restores all three Advanced scalar owners with query, hash, target and rel in every branch', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const layout of cardLayouts) {
      const wire = freeze(advancedCardData()), named = freeze(advancedCardData(false)), before = JSON.stringify(wire);
      for (const mode of ['normal', 'preview']) {
        const html = render(CardGrid.Default, wire, { mode, params: cardParams(layout) }), links = hrefAttributes(html);
        assert.equal(links.length, 3);
        for (const [index, [, destination]] of linkPairs.slice(0, 3).entries()) {
          assert.equal(links[index].href, `${origin}${destination}?tag=one&tag=two&q=a%23b#materials`);
          assert.match(links[index].attributes, /target="_blank"/);
          assert.match(links[index].attributes, /rel="author noopener noreferrer"/);
          assert.match(links[index].attributes, new RegExp(`title="Native source title ${index + 1}"`));
        }
        assert.equal(html, render(CardGrid.Default, named, { mode, params: cardParams(layout) }));
        assert.deepEqual(metadata(html), []);
      }
      const editor = render(CardGrid.Default, wire, { mode: 'editing', params: cardParams(layout) }), links = hrefAttributes(editor);
      assert.equal(links.length, 3);
      for (const [index, [owner, destination]] of linkPairs.slice(0, 3).entries()) {
        assert.equal(links[index].href, `${destination}?tag=one&tag=two&q=a%23b#materials`);
        assert.ok(metadata(editor).some(({ itemId, fieldId }) => itemId === owner && fieldId === 'source-card-link'));
      }
      assert.equal(editor, render(CardGrid.Default, named, { mode: 'editing', params: cardParams(layout) }));
      assert.equal(JSON.stringify(wire), before);
    }
  });
});

test('CardGrid scalar fallback uses real card identity and never the generated link key or field metadata as its owner', () => withContentMode('fixture', () => {
  const positive = freeze(advancedCardData());
  const positiveLinks = hrefAttributes(render(CardGrid.Default, positive, { params: cardParams('stacked') }));
  assert.deepEqual(positiveLinks.map(({ href }) => href), linkPairs.slice(0, 3)
    .map(([, destination]) => `${origin}${destination}?tag=one&tag=two&q=a%23b#materials`));
  for (const index of [0, 1, 2]) for (const owner of [otherOwner, `${linkPairs[index][0]}-link`, 'malformed-native-card-id']) {
    const data = advancedCardData(); data.children.results = [data.children.results[index]];
    const original = collectionField(data.children.results[0], 'link');
    data.children.results[0].id = owner;
    const expected = safeLinkRenderProps(original).field.value;
    const links = hrefAttributes(render(CardGrid.Default, data, { params: cardParams('stacked') }));
    assert.equal(links[0].href, renderedLinkHref(expected));
    assert.notEqual(links[0].href, `${origin}${linkPairs[index][1]}?tag=one&tag=two&q=a%23b#materials`);
  }
}));

test('ordered nested CardGrid Links keep their distinct owner context and do not inherit a card scalar exception', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const index of [0, 1, 2]) {
      const data = advancedCardData(); data.children.results = [data.children.results[index]];
      const card = data.children.results[0], nestedId = `00000000-0000-0000-0000-00000000000${index + 1}`;
      const nativeLink = cardField(nestedId, 'nested-link', { href: linkPairs[index][1], text: 'Nested owner link', linktype: 'external', target: '_blank' }, 'General Link').jsonValue;
      card.fieldCollection.push({ name: 'links', jsonValue: [{ id: nestedId, fields: { link: nativeLink } }] });
      freeze(data);
      const before = JSON.stringify(data);
      for (const mode of ['normal', 'preview', 'editing']) {
        const html = render(CardGrid.Default, data, { mode, params: cardParams('stacked') });
        const actual = hrefAttributes(html);
        assert.equal(actual.length, 1);
        const expected = mode === 'editing' ? nativeLink.value : safeLinkRenderProps(nativeLink).field.value;
        assert.equal(actual[0].href, renderedLinkHref(expected));
        assert.notEqual(actual[0].href, `${origin}${linkPairs[index][1]}`);
        assert.match(html, /Nested owner link/);
        assert.doesNotMatch(html, /Advanced scalar link/);
        if (mode === 'editing') assert.ok(metadata(html).some(({ itemId }) => itemId === nestedId));
      }
      assert.equal(JSON.stringify(data), before);
    }
  });
});

test('CardGrid restoration is closed for unknown SDK modes, unrelated datasources, wrong owners and changed source paths', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    // The inert Body policy closes unavailable fixture routes without granting
    // the owner-specific absolute source projection. Connected safe paths stay.
    const unapprovedHref = (href) => contentMode === 'fixture' ? '#service-unavailable' : href;
    for (const layout of cardLayouts) {
      for (const mode of ['unknown', 'missing']) {
        const indexData = freeze(indexCardData()), advanced = freeze(advancedCardData());
        assert.ok(hrefAttributes(render(CardGrid.Default, indexData, { mode, params: cardParams(layout) }))
          .some(({ href }) => href === `${richPairs[0][1]}?tag=one&tag=two&q=a%23b#details`));
        const actual = hrefAttributes(render(CardGrid.Default, advanced, { mode, params: cardParams(layout) }));
        assert.deepEqual(actual.map(({ href }) => href), advanced.children.results.map((card) =>
          renderedLinkHref(safeLinkRenderProps(collectionField(card, 'link')).field.value)));
      }
      for (const datasourceId of [undefined, null, '', otherOwner, 'bad-native-id', cardDatasources.index]) {
        const advanced = advancedCardData(); advanced.id = datasourceId;
        assert.deepEqual(hrefAttributes(render(CardGrid.Default, advanced, { params: cardParams(layout) })).map(({ href }) => href),
          advanced.children.results.map((card) => renderedLinkHref(safeLinkRenderProps(collectionField(card, 'link')).field.value)));
      }
      for (const datasourceId of [undefined, null, '', otherOwner, 'bad-native-id', cardDatasources.advanced]) {
        const indexData = indexCardData(); indexData.id = datasourceId;
        const links = hrefAttributes(render(CardGrid.Default, indexData, { params: cardParams(layout) }));
        assert.ok(links.some(({ href }) => href === unapprovedHref(`${richPairs[0][1]}?tag=one&tag=two&q=a%23b#details`)));
        assert.ok(!links.some(({ href }) => href.startsWith(`${origin}${richPairs[0][1]}`)));
      }
      const wrongIndexOwner = indexCardData(); wrongIndexOwner.children.results[0].id = otherOwner;
      const wrongOwnerLinks = hrefAttributes(render(CardGrid.Default, wrongIndexOwner, { params: cardParams(layout) }));
      assert.ok(wrongOwnerLinks.some(({ href }) => href === unapprovedHref(`${richPairs[0][1]}?tag=one&tag=two&q=a%23b#details`)));
      assert.ok(!wrongOwnerLinks.some(({ href }) => href.startsWith(`${origin}${richPairs[0][1]}`)));
      const wrongIndexPath = indexCardData();
      collectionField(wrongIndexPath.children.results[0], 'body').value = `<a href="${richPairs[0][1].toLowerCase()}">Changed source path</a>`;
      const wrongPathLinks = hrefAttributes(render(CardGrid.Default, wrongIndexPath, { params: cardParams(layout) }));
      assert.ok(wrongPathLinks.some(({ href }) => href === unapprovedHref(richPairs[0][1].toLowerCase())));
      assert.ok(!wrongPathLinks.some(({ href }) => href.startsWith(`${origin}${richPairs[0][1]}`)));
      for (const value of [{ href: linkPairs[0][1].toLowerCase(), linktype: 'external' },
        { href: linkPairs[1][1], linktype: 'external' }, { href: '/Login', linktype: 'external' },
        { href: linkPairs[0][1], linktype: 'internal', id: otherOwner },
        { href: linkPairs[0][1], linktype: 'media', id: otherOwner },
        { href: linkPairs[0][1], linktype: 'external', id: otherOwner }]) {
        const advanced = advancedCardData(); advanced.children.results = [advanced.children.results[0]];
        collectionField(advanced.children.results[0], 'link').value = value;
        assert.equal(hrefAttributes(render(CardGrid.Default, advanced, { params: cardParams(layout) }))[0].href,
          renderedLinkHref(safeLinkRenderProps({ value }).field.value));
      }
    }
  });
});

test('canonical CardGrid author clears override stale fieldCollection and leave no empty native canvas controls', () => {
  for (const layout of cardLayouts) {
    const indexData = indexCardData(), indexCard = indexData.children.results[0];
    indexCard.body = cardField(indexCard.id, 'body', '', 'Rich Text');
    freeze(indexData);
    for (const mode of ['normal', 'preview', 'editing']) {
      const html = render(CardGrid.Default, indexData, { mode, params: cardParams(layout) });
      assert.doesNotMatch(html, /Index-Lock|Index Lock details|original formatting/);
      if (mode === 'editing') assert.ok(!metadata(html).some(({ fieldId }) => fieldId === 'source-card-body'));
    }
    const advanced = advancedCardData();
    for (const card of advanced.children.results) card.link = cardField(card.id, 'link', {}, 'General Link');
    freeze(advanced);
    for (const mode of ['normal', 'preview', 'editing']) {
      const html = render(CardGrid.Default, advanced, { mode, params: cardParams(layout) });
      assert.equal(hrefAttributes(html).filter(({ href }) => href).length, 0);
      assert.doesNotMatch(html, /flexible-estate-planning-materials|key-employee-compensation-materials|essential-concepts/);
      if (mode === 'editing') {
        for (const [owner] of linkPairs.slice(0, 3)) assert.ok(!metadata(html).some(({ itemId, fieldId }) => itemId === owner && fieldId === 'source-card-link'));
      }
    }
  }
});

test('other exported variants sharing the private CardGrid never opt into the new source-owner projections', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const name of ['SustainabilityPillars', 'SustainabilityRelated', 'RilaPromotion', 'FaqHelp', 'FaqProfessional', 'FixedProductFeatures']) {
      for (const data of [indexCardData(), advancedCardData()]) {
        freeze(data);
        const before = JSON.stringify(data), unrelated = { ...data, id: otherOwner };
        for (const mode of ['normal', 'preview', 'editing', 'unknown', 'missing']) {
          const params = cardParams('stacked');
          assert.equal(render(CardGrid[name], data, { mode, params }), render(CardGrid[name], unrelated, { mode, params }), `${name}: ${mode}`);
        }
        assert.equal(JSON.stringify(data), before);
      }
    }
  });
});

// Exact native Body read in the supported Content Editor on 2026-10-22.
// Native field ID/metadata were not captured; any added metadata below is
// explicitly diagnostic, while the Body value/hash and card owner are actual.
const actualTeamsBody = "<p><strong>Calvin Walls</strong><br /> Sales support for Brian Landwer</p> <p>Phone: <a href=\"tel:763-765-6598\">763.765.6598</a></p> <a href=\"mailto:calvin.walls@allianzlife.com\"> Email Calvin Walls </a> <p><strong>States covered:<br /> </strong>AK, AR, AZ, CA, CO, HI, IA, ID, Northern IL, KS, MI, MN, MO, MT, ND, NE, NM, NV, OK, OR, SD, TX, UT, WA, WI, WY</p>";
const actualTeamsBodySHA256 = 'ca8864e2a2d4fc64f814d8052e0f7d4dc8f68ffc222721e1d96d24dac06c0d71';
for (const contentMode of ['fixture', 'connected']) for (const mode of ['normal', 'preview', 'editing']) {
  test(`exact native Teams Body keeps contact services inert in ${contentMode}/${mode}`, () => withContentMode(contentMode, () => {
    assert.equal(crypto.createHash('sha256').update(actualTeamsBody).digest('hex'), actualTeamsBodySHA256);
    for (const layout of cardLayouts) for (const asFieldCollection of [false, true]) for (const withDiagnosticMetadata of [false, true]) {
      const original = withDiagnosticMetadata
        ? cardField('973A3CD9-BF90-4F2E-A8EA-39E7CE329831', 'diagnostic-Teams-body', actualTeamsBody, 'Rich Text')
        : { jsonValue: { value: actualTeamsBody } };
      const card = { id: '973A3CD9-BF90-4F2E-A8EA-39E7CE329831', body: original };
      const data = freeze({ id: 'A39679A6-2610-4D76-BF57-F3C8B1DABC85',
        children: { results: [asFieldCollection ? wireCard(card) : card] } });
      const before = JSON.stringify(data);
      const html = render(CardGrid.Default, data, { mode, params: cardParams(layout) });
      const links = anchors(html);
      assert.deepEqual(links.map(({ href }) => href), mode === 'editing'
        ? ['tel:763-765-6598', 'mailto:calvin.walls@allianzlife.com']
        : ['#service-unavailable', '#service-unavailable']);
      assert.match(html, /Calvin Walls/); assert.match(html, /Sales support for Brian Landwer/);
      assert.match(html, /States covered/);
      if (mode === 'editing') {
        assert.ok(html.includes(actualTeamsBody));
        if (withDiagnosticMetadata) assert.ok(metadata(html).some(({ itemId, fieldId }) =>
          itemId === card.id && fieldId === 'source-card-diagnostic-Teams-body'));
      } else assert.doesNotMatch(html, /href="(?:tel:|mailto:)/);
      assert.equal(JSON.stringify(data), before);
    }
  }));
}


test('raw Rich Text decision reuses both existing owner/path pairs without normalization', () => {
  for (const [owner, destination] of richPairs) {
    for (const href of [destination, `${origin}${destination}`, `${destination}?tag=one&amp;tag=two#details`]) {
      for (const id of [owner, owner.toUpperCase(), `{${owner.toUpperCase()}}`, owner.replaceAll('-', '')]) {
        assert.equal(isSourceDestinationRichTextHref(href, id), true);
      }
    }
    for (const href of [destination.toLowerCase(), destination.replace('/', '&#47;'), destination.replace('/', '%2F'),
      `${origin}:443${destination}`, `${origin.replace('www.', 'WWW.')}${destination}`, `${origin.replace('https:', 'http:')}${destination}`,
      `https://user:password@www.allianzlife.com${destination}`, `${destination}/`, ` ${destination}`, `${destination}#demo-unavailable`]) {
      assert.equal(isSourceDestinationRichTextHref(href, owner), false, href);
    }
    for (const id of [undefined, null, '', otherOwner, ` ${owner}`, `{${owner}`, linkPairs[0][0]]) {
      assert.equal(isSourceDestinationRichTextHref(destination, id), false);
    }
  }
});

test('opt-in Rich Text selector receives distinct raw and decoded attributes without changing Set behavior', () => {
  const value = '<p><a title="href=wrong > value" data-href="/masked" HREF="&#47;Login" TARGET="_blank" rel="author">Login</a></p>';
  const input = freeze({ value, metadata: { itemId: 'diagnostic-owner', fieldId: 'diagnostic-body', fieldType: 'Rich Text' } });
  const calls = [];
  const result = safeNewsroomRichText(input, false, (decodedHref, rawHref) => {
    calls.push({ decodedHref, rawHref }); return decodedHref === '/Login';
  });
  assert.deepEqual(calls, [{ decodedHref: '/Login', rawHref: '&#47;Login' }]);
  const expected = '<p><a title="href=wrong > value" data-href="/masked" href="#service-unavailable" target="" rel="author">Login</a></p>';
  assert.equal(result.value, expected);
  assert.equal(safeNewsroomRichText(input, false, new Set(['/Login'])).value, expected);
  assert.equal(safeNewsroomRichText(input, false, new Set(['&#47;Login'])), input);
  assert.equal(result.metadata, input.metadata); assert.equal(input.value, value);
  assert.equal(safeNewsroomRichText(input, false, () => false), input);
});

test('omitted and Set Rich Text filters retain the existing target and href policy exactly', () => {
  const value = '<a href="/about" target="_blank" rel="author">About</a> <a href="/Login" target="_blank">Login</a>';
  const input = freeze({ value, metadata: { itemId: 'diagnostic-owner', fieldId: 'diagnostic-body', fieldType: 'Rich Text' } });
  assert.equal(safeNewsroomRichText(input, false).value,
    '<a href="/about" target="" rel="author">About</a> <a href="#service-unavailable" target="">Login</a>');
  assert.equal(safeNewsroomRichText(input, false, new Set(['/Login'])).value,
    '<a href="/about" target="_blank" rel="author">About</a> <a href="#service-unavailable" target="">Login</a>');
  assert.equal(safeNewsroomRichText(input, true), input);
  assert.equal(safeNewsroomRichText(input, true, new Set(['/Login'])), input);
});

test('editing, metadata-only and clear Rich Text fields never call the opt-in selector', () => {
  const fail = () => { throw new Error('Selector must not run on native editing or empty fields'); };
  for (const input of [undefined, { value: '' }, { metadata: { itemId: 'diagnostic-only' } }]) {
    assert.equal(safeNewsroomRichText(input, false, fail), input);
    assert.equal(safeNewsroomRichText(input, true, fail), input);
  }
  const input = freeze({ value: actualTeamsBody, metadata: { itemId: 'diagnostic-only' } });
  assert.equal(safeNewsroomRichText(input, true, fail), input);
});

test('approved source href protection is per anchor and also covers already-absolute source values', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const layout of cardLayouts) for (const absolute of [false, true]) for (const mode of ['normal', 'preview', 'editing']) {
      const data = indexCardData(), card = data.children.results[0];
      const original = collectionField(card, 'body');
      original.value = `<p><a data-control="source" href="${absolute ? origin : ''}${richPairs[0][1]}?tag=one&amp;tag=two#details" target="_blank" rel="author">Source control</a> <a data-control="phone" href="tel:763-765-6598" target="_blank">Phone control</a> <a data-control="email" href="mailto:calvin.walls@allianzlife.com">Email control</a></p>`;
      freeze(data); const before = JSON.stringify(data);
      const html = render(CardGrid.Default, data, { mode, params: cardParams(layout) });
      const links = hrefAttributes(html), source = links.find(({ attributes }) => attributes.includes('data-control="source"'));
      assert.equal(source.href, `${mode === 'editing' ? absolute ? origin : '' : origin}${richPairs[0][1]}?tag=one&tag=two#details`);
      assert.match(source.attributes, /target="_blank" rel="author"/);
      assert.deepEqual(links.filter(({ attributes }) => /data-control="(?:phone|email)"/.test(attributes)).map(({ href }) => href), mode === 'editing'
        ? ['tel:763-765-6598', 'mailto:calvin.walls@allianzlife.com'] : ['#service-unavailable', '#service-unavailable']);
      if (mode === 'editing') assert.ok(html.includes(original.value));
      assert.equal(JSON.stringify(data), before);
    }
  });
});

test('same decoded source href cannot grant approval to an entity-encoded raw sibling', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const layout of cardLayouts) for (const mode of ['normal', 'preview', 'editing']) {
      const data = indexCardData(), card = data.children.results[0], original = collectionField(card, 'body');
      original.value = `<p><a href="${richPairs[0][1]}" data-raw="exact">Exact raw</a> <a href="&#47;what-we-offer/Index-Lock" data-raw="encoded">Encoded raw</a></p>`;
      freeze(data); const before = JSON.stringify(data);
      const html = render(CardGrid.Default, data, { mode, params: cardParams(layout) });
      const links = hrefAttributes(html);
      assert.equal(links.find(({ attributes }) => attributes.includes('data-raw="exact"')).href, `${mode === 'editing' ? '' : origin}${richPairs[0][1]}`);
      const encoded = links.find(({ attributes }) => attributes.includes('data-raw="encoded"'));
      assert.equal(encoded.href, mode !== 'editing' && contentMode === 'fixture' ? '#service-unavailable' : '&#47;what-we-offer/Index-Lock');
      assert.notEqual(encoded.href, `${origin}${richPairs[0][1]}`);
      if (mode === 'editing') assert.ok(html.includes(original.value));
      assert.equal(JSON.stringify(data), before);
    }
  });
});

const sharedBodyWrappers = ['Default', 'SourceDownloadLinks', 'HeadingIcon', 'BrandHeadingIcon', 'SustainabilityPillars', 'RilaPromotion', 'FixedProductFeatures'];
const existingAccountHrefs = ['/Login', '/Login/forgot-username-individual', '/Login/forgot-password-individual'];
const policyTestCardData = (value) => ({ id: 'diagnostic-grid', children: { results: [{ id: 'diagnostic-card',
  heading: cardField('diagnostic-card', 'heading', 'Mounted diagnostic card'),
  body: cardField('diagnostic-card', 'body', value, 'Rich Text') }] } });

test('every actual shared card Body caller keeps contact and account services inert with native editing ownership', () => {
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const name of sharedBodyWrappers) for (const mode of ['normal', 'preview', 'editing']) {
      const value = '<p>Mounted Body control <a href="mailto:service@example.invalid">Email control</a> <a href="tel:12345">Phone control</a> '
        + existingAccountHrefs.map((href, i) => `<a href="${href}" target="_blank">Account control ${i}</a>`).join(' ') + '</p>';
      const data = freeze(policyTestCardData(value)), before = JSON.stringify(data);
      const html = render(CardGrid[name], data, { mode, params: cardParams('stacked') });
      assert.match(html, /Mounted Body control/, `${name} must actually mount the Body`);
      const links = anchors(html).filter(({ text }) => /^(?:Email|Phone|Account) control/.test(text));
      assert.equal(links.length, 5);
      assert.deepEqual(links.map(({ href }) => href), mode === 'editing'
        ? ['mailto:service@example.invalid', 'tel:12345', ...existingAccountHrefs] : Array(5).fill('#service-unavailable'));
      if (mode === 'editing') {
        assert.ok(html.includes(value));
        assert.ok(metadata(html).some(({ fieldId }) => fieldId === 'source-card-body'));
      }
      assert.equal(JSON.stringify(data), before);
    }
  });
});

test('shared card Body policy preserves safe local PDF, internal and approved external anchors byte-for-byte', () => {
  const approved = require(path.join(sourceRoot, 'lib/approved-source-external-links.fixture.json')).entries
    .find(({ url }) => url.startsWith('https:')).url;
  const value = '<p>Mounted safe Body <a href="/about?tag=one&amp;tag=two#details" target="_blank" rel="author">About control</a> '
    + '<a href="/allianz-assets/b049bad91a3e5c1d-ENT-3301-N.pdf" target="_blank" rel="author">Captured PDF control one</a> '
    + '<a href="/allianz-assets/44a80c49282f3293-M-7391.pdf">Captured PDF control two</a> '
    + `<a href="${approved.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}" target="_blank" rel="author">Approved external control</a> `
    + '<a href="#demo-unavailable" target="_blank" rel="author">Existing demo control</a></p>';
  for (const contentMode of ['fixture', 'connected']) withContentMode(contentMode, () => {
    for (const name of sharedBodyWrappers) for (const mode of ['normal', 'preview', 'editing']) {
      const data = freeze(policyTestCardData(value)), before = JSON.stringify(data);
      const html = render(CardGrid[name], data, { mode, params: cardParams('stacked') });
      assert.match(html, /Mounted safe Body/); assert.ok(html.includes(value), `${name}: ${mode} safe Body bytes`);
      assert.equal(JSON.stringify(data), before);
    }
  });
});

test('real SDK RichText receives the original editing Body object through shared CardGrid callers', () => {
  const sdk = require('@sitecore-content-sdk/nextjs'), ts = require('typescript'), observed = [];
  const filename = path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx');
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, RichText: (props) => {
      observed.push(props); return React.createElement(sdk.RichText, props);
    } };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    const resolved = local && [local, `${local}.ts`, `${local}.tsx`]
      .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    return resolved ? /\.tsx?$/.test(resolved) ? loadSource(resolved) : require(resolved) : require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  for (const name of sharedBodyWrappers) for (const asFieldCollection of [false, true]) {
    const data = policyTestCardData(actualTeamsBody), card = data.children.results[0], original = card.body.jsonValue;
    if (asFieldCollection) data.children.results[0] = wireCard(card);
    freeze(data); const before = JSON.stringify(data); observed.length = 0;
    const html = render(compiled.exports[name], data, { mode: 'editing', params: cardParams('stacked') });
    assert.match(html, /Calvin Walls/, `${name} must mount the actual Body`);
    assert.ok(observed.some(({ field, editable }) => field === original && editable === true), name);
    assert.equal(JSON.stringify(data), before);
  }
});
