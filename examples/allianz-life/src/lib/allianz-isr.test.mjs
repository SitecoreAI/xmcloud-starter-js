import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { getAppPageStaticInfo } = require('next/dist/build/analysis/get-page-static-info');
const loadConfig = require('next/dist/server/config').default;
const { PHASE_PRODUCTION_BUILD } = require('next/constants');
const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const route = '/[site]/[locale]/[[...path]]/page';
const routeFile = path.join(appRoot, 'src/app', `${route}.tsx`);
const productionConfig = loadConfig(PHASE_PRODUCTION_BUILD, appRoot, { silent: true });

async function staticInfo(pageFilePath = routeFile, page = route) {
  return getAppPageStaticInfo({
    pageFilePath, page, nextConfig: await productionConfig, isDev: false,
  });
}

test('Next recognizes the CMS page as a server page with static paths and 60-second ISR', async () => {
  const info = await staticInfo();
  assert.equal(info.type, 'app');
  assert.equal(info.rsc, 'server');
  assert.equal(info.generateStaticParams, true);
  assert.equal(info.hadUnsupportedValue, false);
  assert.equal(info.config.revalidate, 60);
  assert.notEqual(info.config.dynamic, 'force-dynamic');
});

test('removing the revalidation export restores Next\'s unspecified revalidation default', async (t) => {
  const source = await readFile(routeFile, 'utf8');
  const withoutRevalidation = source.replace(/^export const revalidate = 60;\r?\n/m, '');
  assert.notEqual(withoutRevalidation, source, 'the control must remove the real page export');
  const directory = await mkdtemp(path.join(tmpdir(), 'allianz-isr-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const controlFile = path.join(directory, 'page.tsx');
  await writeFile(controlFile, withoutRevalidation);
  const info = await staticInfo(controlFile);
  assert.equal(info.config.revalidate, undefined);
  assert.equal(info.generateStaticParams, true);
  assert.equal(info.rsc, 'server');
  assert.equal(info.hadUnsupportedValue, false);
});

test('the production config and inherited layouts support standard Node ISR', async () => {
  const config = await productionConfig;
  assert.equal(config.cacheComponents, false, 'route revalidate requires Cache Components to be disabled');
  assert.notEqual(config.output, 'export', 'static export cannot regenerate pages');
  for (const page of ['/layout', '/[site]/layout', route]) {
    const info = await staticInfo(path.join(appRoot, 'src/app', `${page}.tsx`), page);
    assert.equal(info.runtime ?? 'nodejs', 'nodejs', `${page} must retain the Node runtime`);
    assert.notEqual(info.config?.dynamic, 'force-dynamic', `${page} must allow prerendering`);
    assert.notEqual(info.config?.revalidate, 0, `${page} must retain cached route output`);
    assert.ok(!['force-no-store', 'default-no-store', 'only-no-store'].includes(info.config?.fetchCache),
      `${page} must not force uncached CMS reads`);
  }
});
