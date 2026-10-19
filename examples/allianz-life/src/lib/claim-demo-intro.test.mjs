import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, metadata, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { Default: LegacyRichText } = loadSource(path.join(sourceRoot, 'components/allianz-legacy-rich-text/AllianzLegacyRichText.tsx'));
const { Default: AllianzForm } = loadSource(path.join(sourceRoot, 'components/allianz-form/AllianzForm.tsx'));
const { getFixturePage, fixtureContent } = loadSource(path.join(sourceRoot, 'lib/allianz-page.ts'));
const { migrationFormCopy, MIGRATION_FORMS } = loadSource(path.join(sourceRoot, 'components/allianz-form/migration-form-config.props.ts'));
const { claimDemoIntroBody, isClaimDemoPage, CLAIM_DEMO_INTRO } = loadSource(path.join(sourceRoot, 'lib/claim-demo-intro.ts'));
const routes = ['/report-a-death', '/new-york/report-a-death'];
const sourceFiles = ['../content/native-content.json', '../content/public-route-index.json', '../source-asset-bundle.json'];
const sourceBytes = sourceFiles.map((file) => [path.join(sourceRoot, file), fs.readFileSync(path.join(sourceRoot, file))]);
const pins = {
  '/report-a-death': {
    bundled: [570, 'edb4b3f2b9ca5815e9d3044ae639fb0afa453a2cee006f791ccc1e911b0a7149'],
    native: [544, 'db5431c9805071312d5a8a4fb6a6ba24bebf6d29c44f9de4d74e56e3f1032c82'],
  },
  '/new-york/report-a-death': {
    bundled: [571, '22e3ba6cee1f18628d503b32cde8bce3151b137c45da55027e6ec85c52b21fa7'],
    native: [545, '9de8d3018fb8c42db04b3c7b11d037eaff2ca3dfb0fce106776570556af0b5c1'],
  },
};
const nativeDatasourceIds = {
  '/report-a-death': 'D656CE4C-8610-477E-855A-814EEC38C2D4',
  '/new-york/report-a-death': 'BC19AFE3-A707-46A8-A9BD-4268CFF251F8',
};
const introBlock = (route) => fixtureContent.routes[route].components.find((block) =>
  block.componentName === 'AllianzLegacyRichText' && block.provenance?.ordinal === 1);
const routeFields = (route) => getFixturePage(route.slice(1).split('/')).layout.sitecore.route.fields;
const valueFor = (route, variant) => {
  const value = introBlock(route).fields.data.datasource.body.jsonValue.value;
  // The retained native readback omits only this captured disabled-link attribute.
  return variant === 'native' ? value.replace(' data-demo-disabled="true"', '') : value;
};

function renderIntro(route, variant, mode) {
  const page = getFixturePage(route.slice(1).split('/'));
  page.layout.sitecore.context.itemPath = variant === 'native'
    ? `/sitecore/content/allianz/allianz-life/Home${route}` : route;
  page.mode = { ...page.mode, isEditing: mode === 'editing', isNormal: mode === 'visitor', isPreview: mode === 'preview' };
  const block = introBlock(route);
  const data = structuredClone(block.fields.data.datasource);
  if (variant === 'native') data.id = nativeDatasourceIds[route];
  const value = valueFor(route, variant);
  data.body.jsonValue = { value, editable: value, metadata: metadata('claim-intro', 'Rich Text') };
  const before = JSON.stringify(data);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(LegacyRichText, { params: block.params, fields: { data: { datasource: data } } })));
  assert.equal(JSON.stringify(data), before, 'Rendering must not mutate authored fields or SDK metadata');
  return { html, value };
}

test('four retained body signatures match bundled captures and native readback evidence', () => {
  for (const route of routes) for (const variant of ['bundled', 'native']) {
    const value = valueFor(route, variant);
    assert.deepEqual([Buffer.byteLength(value), createHash('sha256').update(value).digest('hex')], pins[route][variant]);
  }
});

for (const route of routes) for (const variant of ['bundled', 'native']) for (const mode of ['visitor', 'preview', 'editing']) {
  test(`real SDK ${mode}: ${route} ${variant} intro preserves its intended content boundary`, () => {
    const { html, value } = renderIntro(route, variant, mode);
    if (mode === 'editing') {
      assert.ok(html.includes(value));
      assert.match(html, /test-claim-intro-field/);
      assert.ok(!html.includes(CLAIM_DEMO_INTRO));
    } else {
      assert.ok(html.includes(CLAIM_DEMO_INTRO));
      assert.doesNotMatch(html, /Once submitted|Please use this form to notify|register or log in|test-claim-intro-field/);
      assert.match(html, /content-body pre-content/);
    }
  });
}

test('route, market, source id and classes agree before any captured body can change', () => {
  const enabled = Object.keys(fixtureContent.routes).filter((route) => isClaimDemoPage(routeFields(route), route));
  assert.deepEqual(enabled.sort(), [...routes].sort());
  for (const route of routes) {
    const fields = routeFields(route);
    const field = { value: valueFor(route, 'bundled') };
    for (const key of ['shellFamily', 'legacySharedKey', 'sourceBodyId', 'sourceBodyClasses']) {
      const wrong = { ...fields, [key]: { value: 'different' } };
      assert.equal(isClaimDemoPage(wrong, route), false, `${route}: ${key}`);
      assert.strictEqual(claimDemoIntroBody(field, wrong, route, false), field);
    }
    assert.strictEqual(claimDemoIntroBody(field, undefined, route, false), field);
    const otherMarket = routes.find((candidate) => candidate !== route);
    assert.strictEqual(claimDemoIntroBody(field, routeFields(otherMarket), route, false), field);
    assert.strictEqual(claimDemoIntroBody(field, fields, otherMarket, false), field);
    for (const wrongPath of [undefined, null, '', '/about', `${route}/claim-fail`, `${route}/extra`, `${route}?copy=1`,
      `/other-site/en${route}`, `/allianz-life/fr${route}`, `//example.invalid${route}`,
      `/sitecore/content/other/allianz-life/Home${route}`, `/sitecore/content/allianz/allianz-life/Home/allianz-life/en${route}`]) {
      assert.strictEqual(claimDemoIntroBody(field, fields, wrongPath, false), field, String(wrongPath));
    }
    for (const exactPath of [route, `${route}/`, `/allianz-life/en${route}`, `/sitecore/content/allianz/allianz-life/Home${route}`]) {
      assert.equal(claimDemoIntroBody(field, fields, exactPath, false).value, CLAIM_DEMO_INTRO);
    }
  }
});

test('unknown, changed and cleared bodies retain identity; authoring returns the exact original Field', () => {
  for (const route of routes) {
    const fields = routeFields(route);
    const originalMetadata = Object.freeze(metadata('claim-intro', 'Rich Text'));
    const field = Object.freeze({ value: valueFor(route, 'native'), editable: '<p>Original authoring HTML</p>', metadata: originalMetadata });
    const before = JSON.stringify(field);
    assert.strictEqual(claimDemoIntroBody(field, fields, route, true), field);
    const adapted = claimDemoIntroBody(field, fields, route, false);
    assert.notStrictEqual(adapted, field);
    assert.strictEqual(adapted.metadata, originalMetadata);
    assert.equal(adapted.editable, field.editable);
    assert.equal(adapted.value, CLAIM_DEMO_INTRO);
    assert.equal(JSON.stringify(field), before);
    for (const value of ['', '<p>Updated editorial introduction.</p>', field.value + ' ', field.value.replace('claim form packet', 'claim instructions')]) {
      const changed = { value, metadata: originalMetadata };
      assert.strictEqual(claimDemoIntroBody(changed, fields, route, false), changed);
    }
    assert.strictEqual(claimDemoIntroBody(undefined, fields, route, false), undefined);
    const otherVariant = { value: valueFor(routes.find((candidate) => candidate !== route), 'native') };
    assert.strictEqual(claimDemoIntroBody(otherVariant, fields, route, false), otherVariant);
  }
});

test('exposed datasource identity must be the exact bundled or native intro; omitted id keeps the exact body gate', () => {
  for (const route of routes) {
    const field = { value: valueFor(route, 'native') };
    const fields = routeFields(route);
    const ids = [introBlock(route).dataSource, nativeDatasourceIds[route]];
    for (const id of ids.flatMap((id) => [id, `{${id.toLowerCase()}}`, id.replaceAll('-', '')])) {
      assert.equal(claimDemoIntroBody(field, fields, route, false, id).value, CLAIM_DEMO_INTRO);
    }
    for (const id of [undefined, null, '']) {
      assert.equal(claimDemoIntroBody(field, fields, route, false, id).value, CLAIM_DEMO_INTRO);
    }
    for (const id of ['different', 42, {}, nativeDatasourceIds[routes.find((other) => other !== route)]]) {
      assert.strictEqual(claimDemoIntroBody(field, fields, route, false, id), field);
    }
  }
});

test('both code-owned claim configurations omit secondaryBody and native fields cannot override the truthful fallback', () => {
  const claims = MIGRATION_FORMS.filter((config) => config.schemaKey === 'death-claim');
  assert.deepEqual(claims.flatMap((config) => config.routes).sort(), [...routes].sort());
  for (const config of claims) {
    assert.equal(Object.hasOwn(config.copy, 'secondaryBody'), false);
    assert.equal(migrationFormCopy(config).secondaryBody, undefined);
    const route = config.routes[0];
    const page = getFixturePage(route.slice(1).split('/'));
    page.layout.sitecore.context.itemPath = route;
    page.mode = { ...page.mode, isEditing: false, isNormal: true, isPreview: false };
    const block = fixtureContent.routes[route].components.find((item) => item.componentName === 'AllianzForm');
    const fields = structuredClone(block.fields);
    fields.data.datasource.secondaryBody = { jsonValue: { value: '<p>CMS override: we will mail claim packets.</p>', metadata: metadata('native-secondary', 'Rich Text') } };
    const before = JSON.stringify(fields);
    const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
      page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
    }, React.createElement(AllianzForm, { ...block, fields })));
    assert.match(html, /Use sample contact details to try the review step/);
    assert.match(html, /This demonstration does not contact you or any beneficiary, or mail claim packets/);
    assert.doesNotMatch(html, /CMS override|native-secondary|we will mail claim packets/);
    assert.equal(JSON.stringify(fields), before);
  }
});

test('captured source, route index and asset-bundle bytes remain unchanged', () => {
  for (const [file, bytes] of sourceBytes) assert.ok(fs.readFileSync(file).equals(bytes), file);
});
