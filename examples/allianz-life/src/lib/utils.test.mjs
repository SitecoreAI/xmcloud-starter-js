import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const helperFile = path.join(sourceRoot, 'lib/utils.ts');
const metadataFile = path.join(sourceRoot, 'lib/allianz-metadata.ts');
const routeFile = path.join(sourceRoot, 'app/[site]/[locale]/[[...path]]/page.tsx');

/** Only synthetic environment values and explicitly supplied imports enter the VM. */
function loadSource(filename, env, imports = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    process: { env: { ...env } },
    require(specifier) {
      assert.ok(Object.hasOwn(imports, specifier), `Unexpected import: ${specifier}`);
      return imports[specifier];
    },
  }, { filename });
  return module.exports;
}

function metadataHarness(env) {
  const helpers = loadSource(helperFile, env);
  const metadata = loadSource(metadataFile, env);
  const reads = [];
  const unused = () => { throw new Error('This metadata check must not render a page or call a client'); };
  const imports = {
    'react/jsx-runtime': { jsx: unused, jsxs: unused },
    'next/navigation': { notFound: unused },
    '@sitecore-content-sdk/nextjs': {},
    '.sitecore/sites.json': [],
    'src/i18n/routing': { routing: { locales: ['en'] } },
    'sitecore.config': { defaultSite: 'allianz-life' },
    'src/lib/sitecore-client': { getData: unused, getComponentData: unused },
    'src/Layout': unused,
    '.sitecore/component-map': new Map(),
    'src/Providers': unused,
    'next-intl': { NextIntlClientProvider: unused },
    'next-intl/server': { setRequestLocale: unused },
    'lib/utils': helpers,
    'lib/allianz-metadata': metadata,
    'lib/allianz-automatic-components': { enrichAllianzComponentMap: unused },
    'lib/allianz-page-loader': {
      async loadAllianzPage(...args) {
        reads.push(args);
        return { page: { layout: { sitecore: { route: { fields: {
          pageTitle: { value: 'Native metadata title' },
          metaDescription: { value: 'Native metadata description' },
        } } } } } };
      },
    },
  };
  return { ...loadSource(routeFile, env, imports), reads };
}

const deploymentHost = 'allianz-preview.synthetic.invalid';
const deploymentOrigin = `https://${deploymentHost}`;
const previewEnvironment = {
  NODE_ENV: 'production', VERCEL_ENV: 'preview', VERCEL_URL: deploymentHost,
};

test('a production-built preview falls back to its exact HTTPS deployment origin', () => {
  const { getBaseUrl } = loadSource(helperFile, previewEnvironment);
  assert.equal(getBaseUrl(), deploymentOrigin);
  assert.equal(getBaseUrl(null), deploymentOrigin);
  assert.equal(getBaseUrl(''), deploymentOrigin);
});

test('configured site origin retains precedence over base and deployment origins', () => {
  const { getBaseUrl } = loadSource(helperFile, {
    ...previewEnvironment,
    NEXT_PUBLIC_SITE_URL: 'https://site.synthetic.invalid',
    NEXT_PUBLIC_BASE_URL: 'https://base.synthetic.invalid',
  });
  assert.equal(getBaseUrl(), 'https://site.synthetic.invalid');
});

test('configured base origin retains precedence when the site origin is unset or empty', () => {
  for (const site of [undefined, '']) {
    const env = { ...previewEnvironment, NEXT_PUBLIC_BASE_URL: 'https://base.synthetic.invalid' };
    if (site !== undefined) env.NEXT_PUBLIC_SITE_URL = site;
    assert.equal(loadSource(helperFile, env).getBaseUrl(), 'https://base.synthetic.invalid');
  }
});

test('explicit host retains priority and its existing development/production protocols', () => {
  for (const [mode, protocol] of [['development', 'http'], ['production', 'https'], ['test', 'https']]) {
    const { getBaseUrl } = loadSource(helperFile, {
      ...previewEnvironment,
      NODE_ENV: mode,
      NEXT_PUBLIC_SITE_URL: 'https://site.synthetic.invalid',
      NEXT_PUBLIC_BASE_URL: 'https://base.synthetic.invalid',
    });
    assert.equal(getBaseUrl('host.synthetic.invalid:4012'), `${protocol}://host.synthetic.invalid:4012`);
  }
});

test('local builds retain localhost when all origin settings are absent or empty', () => {
  for (const mode of ['development', 'production', 'test']) {
    for (const origins of [{}, { NEXT_PUBLIC_SITE_URL: '', NEXT_PUBLIC_BASE_URL: '', VERCEL_URL: '' }]) {
      assert.equal(loadSource(helperFile, { NODE_ENV: mode, ...origins }).getBaseUrl(), 'http://localhost:3000');
    }
  }
});

test('branch and production aliases do not substitute for the exact deployment hostname', () => {
  const { getBaseUrl } = loadSource(helperFile, {
    NODE_ENV: 'production', VERCEL_ENV: 'preview',
    VERCEL_BRANCH_URL: 'branch.synthetic.invalid',
    VERCEL_PROJECT_PRODUCTION_URL: 'production.synthetic.invalid',
  });
  assert.equal(getBaseUrl(), 'http://localhost:3000');
});

test('getFullUrl composes root and nested paths using the selected origin', () => {
  const { getFullUrl } = loadSource(helperFile, previewEnvironment);
  assert.equal(getFullUrl(''), `${deploymentOrigin}/`);
  assert.equal(getFullUrl('/'), `${deploymentOrigin}/`);
  assert.equal(getFullUrl('about/ventures/team'), `${deploymentOrigin}/about/ventures/team`);
  assert.equal(getFullUrl('/about/ventures/team'), `${deploymentOrigin}/about/ventures/team`);
  assert.equal(getFullUrl('contact-us', 'host.synthetic.invalid'), 'https://host.synthetic.invalid/contact-us');
});

const originCases = [
  ['deployment fallback', previewEnvironment, deploymentOrigin],
  ['configured site', { ...previewEnvironment, NEXT_PUBLIC_SITE_URL: 'https://site.synthetic.invalid' }, 'https://site.synthetic.invalid'],
  ['configured base', { ...previewEnvironment, NEXT_PUBLIC_BASE_URL: 'https://base.synthetic.invalid' }, 'https://base.synthetic.invalid'],
  ['local fallback', { NODE_ENV: 'development' }, 'http://localhost:3000'],
];

for (const [originName, env, origin] of originCases) {
  for (const segments of [[], ['about', 'ventures', 'team']]) {
    const publicPath = segments.length ? `/${segments.join('/')}` : '';
    test(`actual generateMetadata uses ${originName} for canonical and OG on ${publicPath || '/'}`, async () => {
      const harness = metadataHarness(env);
      const metadata = await harness.generateMetadata({
        params: Promise.resolve({ site: 'allianz-life', locale: 'en', path: segments }),
      });
      assert.equal(metadata.alternates.canonical, `${origin}${publicPath}`);
      assert.equal(metadata.openGraph.url, `${origin}${publicPath}`);
      assert.equal(metadata.title, 'Native metadata title');
      assert.equal(metadata.description, 'Native metadata description');
      assert.deepEqual(harness.reads, [['allianz-life', 'en', ...segments]]);
      assert.doesNotMatch(metadata.alternates.canonical, /\/allianz-life\/en(?:\/|$)/);
    });
  }
}
