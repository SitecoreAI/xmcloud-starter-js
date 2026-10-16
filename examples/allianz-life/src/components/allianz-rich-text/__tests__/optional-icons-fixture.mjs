import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { loadSource, sourceRoot, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

export { sourceRoot, require };
export const here = path.dirname(fileURLToPath(import.meta.url));
export const filename = path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx');
export const LIST_URL = 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/5c1c69973d934b1cb5525bc3f42b0df0?v=729b203e';
export const INFORMATION_URL = 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/4b64afa0fa0a4f7f87a12e01f2de3ca0?v=cba3d72e';
export const ICON_FIELD_ID = '97E10D8C-DFEA-4CD1-8D34-6573D5F0FED7';
// User-supplied owner identities are transport fixtures. All content is synthetic;
// these objects are not captured native DTOs or proof of saved CMS bindings.
export const OWNERS = { benefits: '1605592A-DB14-40F5-AD43-BC8BD39855A5',
  features: '556BEBDF-1D9E-4489-A6F0-0FA6B573D739', allocation: '5B34205A-E732-481F-8095-634134322B88',
  questions: 'DADE857E-4A99-45FB-BF5D-1E7C8FCC4EA0' };
export const field = (owner, name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: name === 'icon' ? ICON_FIELD_ID : `fixture-${name}`, fieldType, fixtureOnly: true } } });
export function fixture({ owner = OWNERS.benefits, src = LIST_URL, iconState = 'filled' } = {}) {
  const data = { id: owner,
    heading: field(owner, 'heading', owner === OWNERS.questions ? 'Questions' : 'Complete fixture heading'),
    subheading: field(owner, 'subheading', '<p>Complete <em>fixture subheading</em>.</p>', 'Rich Text'),
    body: field(owner, 'body', '<a name="video"></a><a name="allocation-options"></a><h3>Common questions:</h3><p>Complete fixture body with <strong>authored formatting</strong>, <a href="#video">video</a>, and <a href="#allocation-options">allocation options</a>.</p>', 'Rich Text'),
    primaryLink: field(owner, 'primaryLink', { href: '/about', text: 'Complete fixture primary link', linktype: 'internal',
      target: '_blank', querystring: 'source=fixture&value=one', anchor: 'fixture-details', rel: 'author-token', 'aria-label': 'Authored fixture label' }, 'General Link'),
    icon: field(owner, 'icon', { src, alt: '', width: '36', height: '18', title: 'Authored icon title' }, 'Image') };
  if (iconState === 'missing') delete data.icon;
  else if (iconState === 'undefined') data.icon = undefined;
  else if (iconState === 'undefined-json') data.icon = { jsonValue: undefined };
  else if (iconState === 'undefined-value') data.icon.jsonValue.value = undefined;
  else if (iconState === 'cleared') data.icon.jsonValue.value = {};
  else if (iconState === 'empty-src') data.icon.jsonValue.value.src = '';
  return data;
}
export const params = (override = {}) => ({ layout: 'stacked', theme: 'transparent', alignment: 'center',
  headingLevel: 'h2', spacing: 'none', RenderingIdentifier: 'fixture-rich-text', ...override });
export function compile(source, { observe } = {}) {
  const React = require('react'), sdk = require('@sitecore-content-sdk/nextjs'), ts = require('typescript');
  const compiled = new Module(filename); compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = specifier => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs' && observe) return { ...sdk,
      ...Object.fromEntries(['Text', 'RichText', 'Image', 'Link'].map(name => [name, props => {
        observe.push({ name, ...props }); return React.createElement(sdk[name], props);
      }])) };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return loadSource(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return compiled.exports;
}
export function baselineSource() {
  const manifest = JSON.parse(fs.readFileSync(path.join(here, 'optional-icons.baseline.json'), 'utf8'));
  const bytes = gunzipSync(fs.readFileSync(path.join(here, manifest.sourceFixture)));
  if (bytes.length !== manifest.uncompressedBytes || createHash('sha256').update(bytes).digest('hex') !== manifest.uncompressedSha256)
    throw new Error('Portable complete v6 RichText oracle failed its byte-integrity check');
  return bytes.toString('utf8');
}
export function renderSDK(Component, data, input = params(), mode = 'normal', extraProps = {}) {
  const React = require('react'), { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
  return require('react-dom/server').renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Synthetic optional icon fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { ...extraProps, fields: data === undefined ? undefined : { data: { datasource: data } }, params: input })));
}
export const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
export const metadata = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/gs)].map(match => JSON.parse(decode(match[1])));
export const imageTags = html => [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
export const attribute = (tag, name) => decode(tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? '');
export const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

export function localFixtureMarkup() {
  const components = compile(fs.readFileSync(filename, 'utf8')), baseline = compile(baselineSource());
  const cases = [
    ['default-list', components.Default, fixture(), params()],
    ['default-information', components.Default, fixture({ owner: OWNERS.features, src: INFORMATION_URL }), params()],
    ['brand-list', components.BrandIcon, fixture({ owner: OWNERS.allocation }), params()],
    ['brand-information', components.BrandIcon, fixture({ owner: OWNERS.questions, src: INFORMATION_URL }), params()],
    ...['missing', 'cleared'].flatMap(iconState => [
      [`default-${iconState}`, components.Default, fixture({ iconState }), params()],
      [`brand-${iconState}`, components.BrandIcon, fixture({ iconState }), params()],
      [`baseline-${iconState}`, baseline.Default, fixture({ iconState }), params()],
    ]),
    ...['rich-text', 'disclosures'].flatMap(layout => [
      [`default-${layout}`, components.Default, fixture(), params({ layout })],
      [`brand-${layout}`, components.BrandIcon, fixture(), params({ layout })],
    ]),
  ];
  return '<p class="fixture-notice">LOCAL INSTALLED-SDK FIXTURE: synthetic content with supplied owner identities and verified public asset URLs. No saved native binding or browser acceptance is asserted.</p>' +
    cases.map(([name, Component, data, input]) => `<section data-optional-case="${name}"><h2 class="fixture-label">${name}</h2><div data-optional-render>${renderSDK(Component, data, input)}</div></section>`).join('\n');
}
