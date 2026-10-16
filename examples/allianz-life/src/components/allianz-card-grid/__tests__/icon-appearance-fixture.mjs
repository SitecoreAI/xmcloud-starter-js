import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadSource, sourceRoot, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

export { sourceRoot, require };
export const filename = path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx');
export const here = path.dirname(fileURLToPath(import.meta.url));
export const appearances = ['white-on-black', 'gray-on-transparent'];
// Exact user-provided public URLs, used solely as opaque transport fixtures.
// Order, labels, field IDs and owners below are synthetic and are not CMS bindings.
export const assets = [
  ['list', 'List', 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/5c1c69973d934b1cb5525bc3f42b0df0?v=729b203e'],
  ['puzzle', 'Puzzle', 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/bc513e8a994a4db3b6b2f9c0d93ccd07?v=7af5ab2e'],
  ['handshake', 'Handshake', 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/afafc730c3db4fe29a8daf6d7420e98d?v=df677782'],
  ['secure', 'Secure', 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/6a293a56db604a2192d2f7be717d279a?v=dc0a3d40'],
  ['stocks', 'Stocks', 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/671c7018c11e4b3d8d65212494c44cf0?v=d36fad01'],
  ['calculator', 'Calculator', 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/643571f267404371afe876bf34085a52?v=9dd9835f'],
  ['search-document', 'Search document', 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/b88169fffb934631a9a098548c8fc2a2?v=7c9d6f48'],
  ['governance', 'Governance', 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/783963fcabc44ebab37cb21944e370a2?v=eb3eaf18'],
  ['folder', 'Folder', 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/f22df8ebb45b455fafa3fbcf3bfc725f?v=3bf5cf8e'],
].map(([slug, label, src]) => ({ slug, label, src }));
export const roleAssets = { legal: ['list', 'puzzle', 'handshake', 'governance'],
  privacy: ['secure', 'folder'], resources: ['search-document', 'stocks', 'calculator'] };

export const field = (owner, name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: `fixture-${name}`, fieldType: type, fixtureOnly: true } } });
export const deepFreeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};

export function fixtureData({ collection = false, extras = false, localPrefix, assetKeys, authoredClasses = false } = {}) {
  const selected = assetKeys ? assetKeys.map(slug => assets.find(asset => asset.slug === slug)) : assets.slice(0, 6);
  const cards = selected.map((asset, index) => {
    const owner = `fixture-source-icon-card-${index + 1}`;
    const card = { id: owner,
      heading: field(owner, 'heading', `${asset.label} transport fixture`),
      body: field(owner, 'body', '<p>Local SDK presentation fixture.</p>', 'Rich Text'),
      icon: field(owner, 'icon', { src: localPrefix ? `${localPrefix}${asset.slug}.svg` : asset.src,
        alt: `Authored fixture ${asset.label}`, width: '24', height: '24' }, 'Image'),
      iconTheme: field(owner, 'iconTheme', 'primary-brand'),
      link: field(owner, 'link', { href: '/about', text: 'Original native link', linktype: 'internal',
        querystring: 'tag=one&tag=two', anchor: 'details', target: '_blank' }, 'General Link'),
    };
    if (extras) {
      card.image = field(owner, 'image', { src: '/allianz-assets/fixture-original-card-image.svg', alt: 'Original card image' }, 'Image');
      card.links = { targetItems: [{ id: `${owner}-footer`,
        link: field(`${owner}-footer`, 'footer-link', { href: '/about', text: 'Unchanged footer link', linktype: 'internal', target: '_blank' }, 'General Link'),
        icon: field(`${owner}-footer`, 'footer-icon', { src: '/allianz-assets/fixture-original-footer-icon.svg', alt: 'Original footer icon' }, 'Image'),
      }] };
    }
    if (authoredClasses) card.icon.jsonValue.value.className = `fixture-native-icon-class-${index + 1}`;
    return card;
  });
  return { id: 'fixture-source-icon-collection', children: { results: collection ? cards.map(card => ({
    id: card.id,
    fieldCollection: Object.entries(card).filter(([name]) => name !== 'id').map(([name, value]) => name === 'links'
      ? { name, jsonValue: value.targetItems.map(item => ({ id: item.id, fields: { link: item.link.jsonValue, icon: item.icon.jsonValue } })) }
      : { name, jsonValue: value.jsonValue }),
  })) : cards } };
}

export const params = (iconAppearance, override = {}) => ({ layout: 'stacked', columns: '3', theme: 'transparent',
  alignment: 'center', headingLevel: 'h3', RenderingIdentifier: 'source-icon-fixture',
  ...(iconAppearance === undefined ? {} : { iconAppearance }), ...override });

/** Installed SDK fields/provider remain real; optional probes delegate to them. */
export function compile(source, { observe } = {}) {
  const React = require('react'), sdk = require('@sitecore-content-sdk/nextjs'), ts = require('typescript');
  const compiled = new Module(filename); compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = specifier => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs' && observe) return { ...sdk,
      ...Object.fromEntries(['Text', 'RichText', 'Image', 'Link'].map(name => [name, props => {
        observe.push({ name, ...props }); return React.createElement(sdk[name], props);
      }])),
    };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return loadSource(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}

export function baselineSource() {
  const manifest = JSON.parse(fs.readFileSync(path.join(here, 'icon-appearance.baseline.json'), 'utf8'));
  const bytes = gunzipSync(fs.readFileSync(path.join(here, manifest.sourceFixture)));
  if (bytes.length !== manifest.uncompressedBytes || createHash('sha256').update(bytes).digest('hex') !== manifest.uncompressedSha256) {
    throw new Error('Portable base37 renderer fixture changed');
  }
  return bytes.toString();
}

export function renderSDK(Component, data, renderingParams = params(), mode = 'normal') {
  const React = require('react'), { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
  return require('react-dom/server').renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en',
      mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      layout: { sitecore: { context: {}, route: { name: 'Local icon transport fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: renderingParams, fields: data === undefined ? undefined : { data: { datasource: data } } })));
}

export const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
export const metadata = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/gs)]
  .map(match => JSON.parse(decode(match[1])));
export const imageTags = html => [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
export const attribute = (tag, name) => decode(tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? '');

export function localFixtureHTML({ localPrefix = './assets/' } = {}) {
  const cards = compile(fs.readFileSync(filename, 'utf8'));
  const styles = ['app/globals.css', 'assets/allianz-native-overrides.css',
    'components/allianz-card-grid/AllianzEditorialCards.css', 'components/allianz-card-grid/AllianzCardIcons.css']
    .map(relative => fs.readFileSync(path.join(sourceRoot, relative), 'utf8')).join('\n');
  const sections = Object.entries(roleAssets).flatMap(([role, assetKeys]) => ['Default', 'EditorialStacked'].flatMap(name => appearances.map(appearance => {
    const theme = role === 'resources' ? 'grey-soft' : 'transparent';
    return `<section class="fixture-case" data-fixture-role="${role}" data-fixture-variant="${name}" data-fixture-appearance="${appearance}" data-fixture-theme="${theme}"><h2>${role} transport set — ${name}: ${appearance}; ${theme} frame</h2>${renderSDK(cards[name], fixtureData({ localPrefix, assetKeys }), params(appearance, { theme, columns: String(assetKeys.length), RenderingIdentifier: `${role}-${name}-${appearance}` }))}</section>`;
  }))).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Local source icon presentation fixture</title><link rel="stylesheet" href="/allianz-assets/source-style.css"><link rel="stylesheet" href="/allianz-legacy-assets/legacy-style.css"><style>${styles}\nbody{margin:0}.fixture-notice{padding:20px;background:#fff3ce;color:#222}.fixture-case>h2{padding:24px;margin:0}.fixture-case{padding-bottom:32px;border-bottom:1px solid #ddd}</style></head><body><div class="fixture-notice"><strong>LOCAL SDK FIXTURE ONLY.</strong> The nine public source SVGs are local transport copies. Card labels/order/owners are synthetic. Role groupings are supplied context, not verified native bindings. This proves presentation behavior only; no source-page parity, native browser acceptance, or publication is claimed.</div>${sections}</body></html>`;
}
