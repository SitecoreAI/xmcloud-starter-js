import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import { sourceRoot } from './runtime.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { generateMap } = require('@sitecore-content-sdk/nextjs/tools');
const appRoot = path.dirname(sourceRoot);

/** Read only literal component-map settings; do not load sitecore config/env. */
function normalMapSettings() {
  const filename = path.join(appRoot, 'sitecore.cli.config.ts');
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  let componentMap;
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'componentMap') componentMap = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(componentMap && ts.isObjectLiteralExpression(componentMap), 'Actual CLI componentMap settings must be present');
  const settings = {};
  for (const property of componentMap.properties) {
    assert.ok(ts.isPropertyAssignment(property), 'Component map regression must use explicit configuration properties');
    const name = property.name.getText(source);
    if (ts.isArrayLiteralExpression(property.initializer)) {
      settings[name] = property.initializer.elements.map((element) => {
        assert.ok(ts.isStringLiteral(element), 'Component map paths/excludes must remain inspectable literals');
        return element.text;
      });
    } else if (property.initializer.kind === ts.SyntaxKind.TrueKeyword || property.initializer.kind === ts.SyntaxKind.FalseKeyword) {
      settings[name] = property.initializer.kind === ts.SyntaxKind.TrueKeyword;
    } else {
      assert.fail(`Unsupported component map setting ${name}; update the regression to preserve actual SDK conventions`);
    }
  }
  assert.equal(settings.includeVariants, undefined, 'Exercise the normal SDK default, without a variants override');
  return settings;
}

test('normal installed SDK map generation emits six new newsroom renderings and excludes internal record/helpers', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'allianz-newsroom-normal-map-'));
  const oldWorkingDirectory = process.cwd();
  const generatedDirectory = path.relative(appRoot, temporary);
  const expected = ['NewsroomCallout', 'NewsroomCompanyProfile', 'NewsroomFeaturedUpdate',
    'NewsroomPublicRelations', 'NewsroomRecentReleases', 'PressReleaseArchive'].sort();
  const oldNames = ['MediaContact.dev', 'newsroom-public-relations.links', 'newsroom-company-profile.links', 'newsroom-grey.links'];
  const internalFiles = [
    'components/media-contact/media-contact-record.props.tsx',
    'components/newsroom-public-relations/newsroom-public-relations.links.props.ts',
    'components/newsroom-company-profile/newsroom-company-profile.links.props.ts',
    'components/legal-disclosures/newsroom-grey.links.props.ts',
  ];
  const baseline = ['component-map.ts', 'component-map.client.ts'].map((filename) => {
    const target = path.join(appRoot, '.sitecore', filename);
    return fs.existsSync(target) ? fs.readFileSync(target) : undefined;
  });
  const previousDebug = console.debug;
  try {
    process.chdir(appRoot);
    // SDK registration diagnostics are routine; generator behavior stays real.
    console.debug = () => {};
    const settings = normalMapSettings();
    // Do not override includeVariants: exercise the normal installed SDK default.
    generateMap({ ...settings, destination: generatedDirectory });
    for (const filename of ['component-map.ts', 'component-map.client.ts']) {
      const generated = fs.readFileSync(path.join(temporary, filename), 'utf8');
      const entries = [...generated.matchAll(/^\s*\['([^']+)',/gm)].map((match) => match[1]);
      // NewsroomReturn existed before this migration and retains its registration.
      const newsroomEntries = entries.filter((name) => name !== 'NewsroomReturn' &&
        /^Newsroom|^PressReleaseArchive$|^MediaContact|^media-contact-record|^newsroom-|^newsroomGrey/i.test(name));
      assert.deepEqual(newsroomEntries.sort(), expected, `${filename} must register exactly the six new rendering purposes`);
      assert.ok(entries.includes('CompanyHero') && entries.includes('LegalDisclosures') && entries.includes('NewsroomReturn'),
        'Reused and existing newsroom component registrations must remain present');
      for (const name of oldNames) assert.ok(!generated.includes(name), `${filename} must exclude old helper candidate ${name}`);
      for (const relative of internalFiles) {
        assert.ok(fs.existsSync(path.join(sourceRoot, relative)), `Internal field/record helper ${relative} must remain available to imports`);
        assert.ok(!generated.includes(path.basename(relative)), `${filename} must exclude ${relative}`);
      }
    }
    for (const [index, filename] of ['component-map.ts', 'component-map.client.ts'].entries()) {
      const target = path.join(appRoot, '.sitecore', filename);
      const after = fs.existsSync(target) ? fs.readFileSync(target) : undefined;
      assert.deepEqual(after, baseline[index], 'Regression must not change the real generated map');
    }
  } finally {
    console.debug = previousDebug;
    process.chdir(oldWorkingDirectory);
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
