/** Offline real-SDK render checks; mask pixels still require browser rechecking. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
test('icon hook has a client boundary when a server-rendered Footer imports it', () => {
  const source = fs.readFileSync(new URL('./allianz-field-icon.tsx', import.meta.url), 'utf8');
  assert.match(source, /^['"]use client['"];\s/);
});
const modules = new Map();
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier === 'next/navigation') return { useRouter: () => ({ push() {} }) };
    let local;
    if (specifier.startsWith('.')) local = path.resolve(path.dirname(filename), specifier);
    if (/^(components|lib)\//.test(specifier)) local = path.join(sourceRoot, specifier);
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`, path.join(local, 'index.ts')]
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return loadSource(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const { AllianzFieldIcon, iconFieldLabel, localIconSource, iconImageSource } = loadSource(path.join(sourceRoot, 'lib/allianz-field-icon.tsx'));
const Header = loadSource(path.join(sourceRoot, 'components/allianz-header/AllianzHeader.tsx')).Default;
const Footer = loadSource(path.join(sourceRoot, 'components/allianz-footer/AllianzFooter.tsx')).Default;
const native = JSON.parse(fs.readFileSync(new URL('../../content/native-content.json', import.meta.url), 'utf8'));
const utility = native.shared.header.fields.data.datasource.utilityNav.targetItems;
const social = native.shared.footer.fields.data.datasource.socialNav.targetItems;
const source = utility[0].icon.jsonValue.value.src;

function render(component, props, isEditing = false) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: {
      mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianzlife',
      layout: { sitecore: { context: {}, route: { name: 'Offline icon test', fields: {}, placeholders: {} } } },
    },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(component, props)));
}
const editableField = (id, value) => ({ value, metadata: { fieldId: id, fieldType: 'Image', itemId: 'native-datasource' } });
const decode = (html) => html.replaceAll('&quot;', '"').replaceAll('&amp;', '&');
const nativeOrigin = 'https://xmc-sitecoresaaef4e-thltmnpdemof1fc-devdd6f.sitecorecloud.io';
const nativeRoot = '/-/media/Project/Allianz-Life/Images/';
const nativeNames = ['public-0f406fb22be00338.svg', 'public-fb25410fd3ccc058.svg',
  'public-811053ddb60b15b0.svg', 'public-83bd0829d98bb7e1.svg',
  'public-36e8936157e0ae76.svg', 'public-d065087fbfdd8cf9.svg',
  'public-afbc80b2b0647397.svg'];

test('all seven observed native icon paths retain runtime query values without broadening media access', () => {
  for (const name of nativeNames) {
    const source = `${nativeOrigin}${nativeRoot}${name}?iar=fixture&ttc=fixture&tt=fixture&hash=synthetic-test`;
    assert.equal(iconImageSource(source), source);
  }
  for (const source of [
    `http://${nativeOrigin.slice(8)}${nativeRoot}${nativeNames[0]}`,
    `https://other.sitecorecloud.io${nativeRoot}${nativeNames[0]}`,
    `${nativeOrigin}${nativeRoot}other.svg`,
    `${nativeOrigin}/-/media/other/${nativeNames[0]}`,
    `${nativeOrigin}${nativeRoot}${nativeNames[0]}#fragment`,
    `${nativeOrigin}${nativeRoot}${nativeNames[0]}?redirect=https://other.example`,
    `${nativeOrigin}${nativeRoot}${nativeNames[0]}\n`,
    `${nativeOrigin}${nativeRoot}${nativeNames[0]}?hash=raw\\escape`,
    `https://user:password@${nativeOrigin.slice(8)}${nativeRoot}${nativeNames[0]}`,
  ]) assert.equal(iconImageSource(source), '');
});

test('native visitor masks preserve field identity while editing still uses original SDK Image metadata', () => {
  const source = `${nativeOrigin}${nativeRoot}${nativeNames[0]}?hash=synthetic%22value`;
  const field = editableField('native-media-icon', { src: source, alt: 'Contact' });
  const html = decode(render(AllianzFieldIcon, { field, decorative: true }));
  assert.ok(html.includes(`mask-image:url("${source}")`));
  assert.match(html, /aria-hidden="true"/);
  const editor = decode(render(AllianzFieldIcon, { field }, true));
  assert.match(editor, /<img/);
  assert.match(editor, /"fieldId":"native-media-icon"/);
  assert.equal(field.value.src, source);
  assert.doesNotMatch(editor, /allianz-field-icon|mask-image/);
});

test('only the seven anonymously verified Content Hub SVG Original versions become icon masks', () => {
  const originals = [
    'fdf32cf308024d32a5d4f7897640a846?v=1c161fe0',
    '0750606db65a4f0fb289d3c16fd69025?v=8aff33d0',
    'feea3b26ab3e4c80b2630c011cac2cb4?v=8f3b5986',
    '4b48030ff1ac4191af86fd0f8694b9bd?v=198c687c',
    '90158d4eb83547e09df64e35cf12130f?v=1b4e0470',
    'acfc44f53446417393639f6a0b6bbed1?v=65467624',
    'a63990dc2da8479786f7a566a1e47f6d?v=27653051',
  ].map((path) => `https://thlt-demo.sitecoresandbox.cloud/api/public/content/${path}`);
  for (const source of originals) {
    assert.equal(iconImageSource(source), source);
    const field = editableField('dam-icon', { src: source, alt: 'Verified icon' });
    assert.ok(decode(render(AllianzFieldIcon, { field })).includes(`mask-image:url("${source}")`));
    assert.equal(field.value.src, source);
  }
  for (const source of [
    originals[0].replace('v=1c161fe0', 'v=unknown'),
    originals[0] + '&crop=1', originals[0] + '#fragment',
    'https://thlt-demo.sitecoresandbox.cloud/api/gateway/124854/thumbnail',
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/690ad1caa1dc4c0abc3b456f6674eeda?v=9585e8bc',
  ]) assert.equal(iconImageSource(source), '');
});

test('icon URL validation follows the local single-file policy and rejects CSS injection and unverified connected media', () => {
  for (const item of [...utility, ...social]) {
    const src = item.icon.jsonValue.value.src;
    assert.equal(localIconSource(src), src);
  }
  assert.equal(localIconSource('/allianz-assets/edited-icon.svg'), '/allianz-assets/edited-icon.svg');
  for (const unsafe of [undefined, null, {}, [], '', 1,
    '//other.example/icon.svg', 'https://www.allianzlife.com/allianz-assets/icon.svg',
    'https://edge.sitecorecloud.io/icon.svg', 'https://xmc-demo.sitecore.io/-/media/icon.svg',
    '/-/media/icon.svg', 'data:image/svg+xml,<svg/>', 'javascript:alert(1)',
    '/allianz-assets/../icon.svg', '/allianz-assets/a/../../icon.svg', '/allianz-assets/%2e%2e.svg',
    '/allianz-assets/icon.svg?query=1', '/allianz-assets/icon.svg#fragment',
    '/allianz-assets/icon.svg\n', '/allianz-assets/icon\\.svg', '/allianz-assets/";color:red.svg',
    '/allianz-assets/icon.svg);background:url(https://other.example)',
    '/allianz-assets/ icon.svg', '/allianz-assets/icon.css', '/allianz-legacy-assets/icon.svg']) {
    assert.equal(localIconSource(unsafe), '', `blocked: ${JSON.stringify(unsafe)}`);
  }
});

test('visitor masks retain the original image source and label without changing its field object', () => {
  const field = editableField('native-icon', { src: source, alt: 'Contact' });
  Object.freeze(field.value); Object.freeze(field.metadata); Object.freeze(field);
  const html = decode(render(AllianzFieldIcon, { field }));
  assert.match(html, /class="allianz-field-icon"/);
  assert.match(html, /role="img" aria-label="Contact"/);
  assert.ok(html.includes(`mask-image:url("${source}")`));
  assert.ok(html.includes(`-webkit-mask-image:url("${source}")`));
  assert.doesNotMatch(html, /<img|kind="open"/);
  assert.equal(field.value.src, source);
  const decorative = render(AllianzFieldIcon, { field, decorative: true });
  assert.match(decorative, /aria-hidden="true"/);
  assert.doesNotMatch(decorative, /role="img"|aria-label=/);
  assert.equal(iconFieldLabel({ value: { alt: {} } }, 'Fallback label'), 'Fallback label');
  assert.equal(iconFieldLabel({ value: { alt: '' } }), undefined);
});

test('empty and unsafe visitor fields render no request-bearing icon or invented placeholder', () => {
  for (const field of [undefined, editableField('cleared-icon', {}), editableField('unsafe-icon', { src: 'https://other.example/icon.svg' }), editableField('native-gate', { src: 'https://edge.sitecorecloud.io/icon.svg' })]) {
    assert.equal(render(AllianzFieldIcon, { field }), '');
  }
  assert.equal(render(AllianzFieldIcon, { field: undefined }, true), '');
});

test('actual editing retains real SDK chrome for cleared and changed Image fields', () => {
  const cleared = editableField('cleared-native-icon', {});
  const emptyHtml = decode(render(AllianzFieldIcon, { field: cleared }, true));
  assert.match(emptyHtml, /scEmptyImage/);
  assert.match(emptyHtml, /"fieldId":"cleared-native-icon"/);
  assert.doesNotMatch(emptyHtml, /allianz-field-icon|mask-image/);
  assert.deepEqual(cleared.value, {});
  const editedSource = utility[1].icon.jsonValue.value.src;
  const edited = editableField('changed-native-icon', { src: editedSource, alt: 'Changed icon' });
  const editedHtml = decode(render(AllianzFieldIcon, { field: edited }, true));
  assert.match(editedHtml, /<img/);
  assert.ok(editedHtml.includes(`src="${editedSource}"`));
  assert.match(editedHtml, /"fieldId":"changed-native-icon"/);
  assert.doesNotMatch(editedHtml, /allianz-field-icon|mask-image/);
  const visitorHtml = decode(render(AllianzFieldIcon, { field: edited }));
  assert.ok(visitorHtml.includes(`mask-image:url("${editedSource}")`), 'visitor presentation follows the edited field rather than a fixed icon identity');
});

test('current native Header and Footer render all seven field masks, accessible social names and unchanged logo images', () => {
  const header = decode(render(Header, { ...native.shared.header, params: {} }));
  const footer = decode(render(Footer, { ...native.shared.footer, params: {} }));
  assert.equal((header.match(/class="allianz-field-icon"/g) || []).length, 2);
  assert.equal((footer.match(/class="allianz-field-icon"/g) || []).length, 5);
  for (const item of utility) assert.ok(header.includes(`mask-image:url("${item.icon.jsonValue.value.src}")`));
  for (const item of social) {
    assert.ok(footer.includes(`mask-image:url("${item.icon.jsonValue.value.src}")`));
    assert.ok(footer.includes(`aria-label="${item.title?.jsonValue?.value || item.icon.jsonValue.value.alt || item.link.jsonValue.value.text}"`));
  }
  const logo = native.shared.header.fields.data.datasource.logo.jsonValue.value.src;
  assert.equal((header.match(new RegExp(`<img[^>]*src="${logo}"`, 'g')) || []).length, 2, 'both original responsive logo instances remain SDK Images');
});

test('cleared Header/Footer icon fields remain editable through their actual component occurrences', () => {
  for (const [component, original, collection, id] of [
    [Header, native.shared.header, 'utilityNav', 'header-native-icon'],
    [Footer, native.shared.footer, 'socialNav', 'footer-native-icon'],
  ]) {
    const props = structuredClone(original);
    props.fields.data.datasource[collection].targetItems[0].icon.jsonValue = editableField(id, {});
    const visitor = render(component, props);
    const expectedMasks = collection === 'utilityNav' ? 1 : 4;
    assert.equal((visitor.match(/class="allianz-field-icon"/g) || []).length, expectedMasks);
    const editing = decode(render(component, props, true));
    assert.match(editing, /scEmptyImage/);
    assert.ok(editing.includes(`"fieldId":"${id}"`));
    assert.doesNotMatch(editing, /allianz-field-icon|mask-image/);
  }
});
