import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const candidate = path.resolve(here, '../../..');
const publicRoot = path.join(candidate, 'public');
const manifest = JSON.parse(fs.readFileSync(path.join(publicRoot, 'allianz-assets/rmd/source-manifest.json'), 'utf8'));
const sha = (raw) => createHash('sha256').update(raw).digest('hex');

test('every copied or shared production asset has exact length and hash provenance', () => {
  for (const asset of manifest.assets) {
    const raw = fs.readFileSync(path.join(publicRoot, asset.path));
    assert.equal(raw.length, asset.bytes, asset.path);
    assert.equal(sha(raw), asset.sha256, asset.path);
  }
  const script = manifest.assets.find((a) => a.path === 'allianz-assets/rmd/source-widget.js');
  const workbook = manifest.assets.find((a) => a.path === manifest.workbookStaticPath.slice(1));
  assert.equal(script.sha256, 'daf17233b58dc5a574bd134425405176b117d0855e69bcc85ce263a792659f81');
  assert.equal(script.originalSourceSha256, '0d195538ca3475370af505e9191dfd6bbd8a016aa37c6033ce84fea22e9d2f17');
  assert.equal(manifest.calculationLogicAndWorkbookUnmodified, true);
  assert.equal(manifest.engineAndWorkbookUnmodified, false);
  assert.equal(workbook.sha256, '49d0b4ebd9f78d9beafa7ff50a047c1bca2e1340c32c9e7e05626841880769a5');
});

test('production document preserves source wrapper and installs boundary before original runtime', () => {
  const html = fs.readFileSync(path.join(publicRoot, 'allianz-assets/rmd/index.html'), 'utf8');
  assert.match(html, /l-grid l-grid--max-width.*l-grid__row u-padding-bottom-xl.*l-grid__column-medium-12.*o-richTextEditor__wrapper.*dx-required-minimum-distribution-general-ed/s);
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(scripts, ['/allianz-assets/rmd/static-workbook-boundary.js', '/allianz-assets/rmd/source-widget.js']);
  assert.match(html, /connect-src 'self'/); assert.match(html, /form-action 'none'/); assert.match(html, /frame-src 'none'/);
  assert.doesNotMatch(html, /overflow\s*:\s*(?:hidden|clip)/);
});

test('owned production integration contains no QA clock, synthetic fixture, exposed debug globals or calculation endpoint', () => {
  const files = ['public/allianz-assets/rmd/index.html', 'public/allianz-assets/rmd/static-workbook-boundary.js',
    'src/components/allianz-calculator/RequiredMinimumDistribution.tsx', 'src/components/allianz-calculator/rmd-frame.ts'];
  for (const name of files) {
    const source = fs.readFileSync(path.join(candidate, name), 'utf8');
    assert.doesNotMatch(source, /\/qa\/|fixed-clock|clock-context|__RMD_|1953|1963|1964|100000|api\/calculate|Settings\.now|global\.Date\s*=/, name);
  }
});

test('the native source mount and readiness marker agree across the production document and loader', () => {
  const html = fs.readFileSync(path.join(publicRoot, 'allianz-assets/rmd/index.html'), 'utf8');
  const source = fs.readFileSync(path.join(publicRoot, 'allianz-assets/rmd/source-widget.js'), 'utf8');
  const boundary = fs.readFileSync(path.join(publicRoot, 'allianz-assets/rmd/static-workbook-boundary.js'), 'utf8');
  const observer = fs.readFileSync(path.join(candidate, 'src/components/allianz-calculator/rmd-frame.ts'), 'utf8');
  assert.ok(html.includes('id="' + manifest.sourceMountId + '"'));
  assert.ok(source.includes('getElementById("' + manifest.sourceMountId + '")'));
  for (const text of [html, boundary, observer]) assert.ok(text.includes('allianz-rmd-frame'));
  for (const text of [boundary, observer]) assert.ok(text.includes('data-rmd-static-load'));
});
