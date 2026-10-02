import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../../..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const modules = new Map();
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return loadSource(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
function render(Component, datasource, isEditing = false, params = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Prospectuses', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: datasource === undefined ? undefined : { data: { datasource } } })));
}
function editableField(name, value, type = 'Single-Line Text') {
  // Explicitly synthetic test metadata, never an import/native identity claim.
  return { jsonValue: { value, metadata: { fieldId: `test-${name}`, fieldType: type, itemId: 'test-document-row' } } };
}
function metadata(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((m) => JSON.parse(m[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
}
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json')));
const components = new Map();
function component(section) {
  if (!components.has(section.directory)) components.set(section.directory,
    loadSource(path.join(sourceRoot, `components/${section.directory}/${section.component}.tsx`)));
  return components.get(section.directory)[section.variant];
}
const documentTable = component({ directory: 'prospectus-document-table', component: 'ProspectusDocumentTable', variant: 'Default' });

test('all 30 source routes match the independent captured DOM oracle through the installed SDK', () => {
  assert.deepEqual(manifest.coverage, { routes: 30, families: {
    'directory-prospectus': 20, 'modern-shareholder-access': 1, 'new-york-shareholder-access': 1,
    'product-directory': 2, 'product-prospectus': 6,
  } });
  const output = {};
  for (const record of manifest.records) for (const section of record.sections) {
    const before = JSON.stringify(section.sourceFieldValues);
    output[`${record.route}:${section.component}`] = render(component(section), section.sourceFieldValues);
    assert.equal(JSON.stringify(section.sourceFieldValues), before);
  }
  for (const mode of ['verify', 'verify-lf', 'verify-crlf']) {
    const result = spawnSync('python3', [path.join(here, 'source_contract.py'), mode], {
      input: JSON.stringify(output), encoding: 'utf8', maxBuffer: 3_000_000,
    });
    assert.equal(result.status, 0, `${mode}: ${result.stderr || result.stdout}`);
    assert.match(result.stdout, /30 source-route contracts match/);
  }
});

test('readable captures allow only LF/CRLF conversion while raw hashes and exact source fields stay intact', () => {
  const result = spawnSync('python3', [path.join(here, 'source_contract.py'), 'line-endings'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /30 raw witnesses survive LF and CRLF checkouts; content normalization rejected/);
});

test('native document fields retain complete metadata in editing, including four independently cleared fields', () => {
  for (const empty of [false, true]) {
    const row = {
      documentLink: editableField('documentLink', empty ? { href: '', text: '' } : {
        href: 'https://vpx.broadridge.com/GetContract1.asp?doctype=usp&cid=allianzmft&fid=018817882',
        text: 'Authored prospectus', target: '_blank',
      }, 'General Link'),
      contractNote: editableField('contractNote', empty ? '' : 'For contracts issued after 4/29/2013'),
      revisionDate: editableField('revisionDate', empty ? '' : '5/1/2026'),
      fileSize: editableField('fileSize', empty ? '' : '403KB'),
    };
    const datasource = { documents: { targetItems: [row] } };
    const before = JSON.stringify(datasource);
    const html = render(documentTable, datasource, true);
    assert.deepEqual(metadata(html), Object.values(row).map((f) => f.jsonValue.metadata));
    assert.equal(JSON.stringify(datasource), before);
    assert.match(html, /<th>Description \/ Name<\/th><th>Revision Date<\/th><th>Size<\/th>/);
    if (!empty) assert.match(html, /vpx\.broadridge\.com/);
    const normal = render(documentTable, datasource);
    assert.deepEqual(metadata(normal), []);
    assert.doesNotMatch(normal, /\[No text|\[No link|vpx\.broadridge\.com/);
    if (empty) assert.match(normal, /<td><p><\/p><\/td><td><\/td><td><\/td>/);
  }
});

test('document records keep ordering, duplicates, and empty dates and sizes; missing records stay empty', () => {
  const sample = manifest.records.find((record) => record.route.endsWith('/prospectuses/allianz-vision'));
  const rows = sample.sections[0].sourceFieldValues.documents.targetItems;
  assert.equal(rows.length, 7);
  const html = render(documentTable, { documents: { targetItems: [...rows].reverse() } });
  const earlier = html.indexOf('For contracts issued on or prior to 4/26/2013');
  const later = html.indexOf('For contracts issued on or after 4/29/2013');
  assert.ok(earlier >= 0 && earlier < later);
  assert.equal((html.match(/<td><\/td>/g) ?? []).length, 7);
  assert.match(render(documentTable, {}), /<tbody><\/tbody>/);
  assert.match(render(documentTable, undefined), /Add a datasource for Prospectus document table/);
  const archived = manifest.records.find((record) => record.route.includes('/past-prospectus-'));
  const archivedRows = archived.sections.find((section) => section.component === 'ProspectusDocumentTable').sourceFieldValues.documents.targetItems;
  assert.equal((archivedRows[1].revisionDate.jsonValue.value.match(/\u00a0/g) ?? []).length, 7);
  assert.ok(render(documentTable, { documents: { targetItems: archivedRows } }).includes(archivedRows[1].revisionDate.jsonValue.value));
});

test('safe document navigation keeps the existing bounded adapter and field objects unchanged', () => {
  const { prospectusLinkField } = loadSource(path.join(sourceRoot, 'components/prospectus-document-table/prospectus-document-table.props.ts'));
  for (const href of ['javascript:alert(1)', 'https://host.example/prospectus.pdf', '/sitecore/api/secret', 'https://contenthub.example/document.pdf']) {
    const field = editableField('documentLink', { href, text: 'Document' }, 'General Link').jsonValue;
    const snapshot = JSON.stringify(field);
    const publicField = prospectusLinkField(field, false);
    assert.equal(publicField.value.href, '#service-unavailable');
    assert.deepEqual(publicField.metadata, field.metadata);
    assert.equal(prospectusLinkField(field, true), field);
    assert.equal(JSON.stringify(field), snapshot);
  }
  const cleared = editableField('documentLink', { href: '' }, 'General Link').jsonValue;
  assert.equal(prospectusLinkField(cleared, false), cleared);
  assert.equal(prospectusLinkField(cleared, true), cleared);
  const local = editableField('documentLink', { href: '/allianz-assets/example.pdf', text: 'Example' }, 'General Link').jsonValue;
  assert.equal(prospectusLinkField(local, false).value.href, '/allianz-assets/example.pdf');
});

test('connected mode cannot expand the document inventory boundary to unverified same-origin PDFs', () => {
  const { prospectusLinkField } = loadSource(path.join(sourceRoot, 'components/prospectus-document-table/prospectus-document-table.props.ts'));
  const beforeMode = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  try {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
    for (const href of ['/-/media/Files/not-in-inventory.pdf', 'https://www.allianzlife.com/unverified-document.pdf']) {
      const field = editableField('documentLink', { href, text: 'Unverified document', target: '_blank',
        querystring: 'download=1', anchor: 'page-2' }, 'General Link').jsonValue;
      const before = JSON.stringify(field);
      const normal = prospectusLinkField(field, false);
      assert.equal(normal.value.href, '#service-unavailable');
      assert.equal(normal.value.querystring, '');
      assert.equal(normal.value.anchor, '');
      assert.equal(normal.value.target, '');
      assert.deepEqual(normal.metadata, field.metadata);
      assert.equal(prospectusLinkField(field, true), field);
      assert.equal(JSON.stringify(field), before);
      const row = { documentLink: { jsonValue: field } };
      assert.doesNotMatch(render(documentTable, { documents: { targetItems: [row] } }), /not-in-inventory|unverified-document/);
      assert.deepEqual(metadata(render(documentTable, { documents: { targetItems: [row] } }, true)), [field.metadata]);
    }
  } finally {
    if (beforeMode === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = beforeMode;
  }
});

test('all six captured supplement links preserve their exact source new-tab or same-tab behavior', () => {
  const { prospectusLinkField } = loadSource(path.join(sourceRoot, 'components/prospectus-document-table/prospectus-document-table.props.ts'));
  const { localDocumentHref } = loadSource(path.join(sourceRoot, 'components/allianz-document-list/allianz-document-list.props.ts'));
  const supplements = manifest.records.flatMap((record) => record.sections
    .filter((section) => section.component === 'ProspectusDocumentTable')
    .flatMap((section) => section.sourceFieldValues.documents.targetItems
      .filter((row) => row.documentLink.jsonValue.value.href.startsWith('/-/media/'))
      .map((row) => ({ route: record.route, row }))));
  assert.equal(supplements.length, 6);
  for (const { route, row } of supplements) {
    const original = row.documentLink.jsonValue;
    const field = editableField('documentLink', original.value, 'General Link').jsonValue;
    const before = JSON.stringify(field);
    const expectedTarget = route.includes('/registered-index-linked-annuities/') ? '' : '_blank';
    assert.equal(original.value.target, expectedTarget);
    const normal = prospectusLinkField(field, false);
    assert.equal(normal.value.href, localDocumentHref(original.value.href));
    assert.equal(normal.value.target, expectedTarget);
    assert.deepEqual(normal.metadata, field.metadata);
    assert.equal(prospectusLinkField(field, true), field);
    assert.equal(JSON.stringify(field), before);
    const html = render(documentTable, { documents: { targetItems: [{ ...row, documentLink: { jsonValue: field } }] } });
    assert.ok(html.includes(`target="${expectedTarget}"`), route);
    assert.equal(html.includes('rel="noopener noreferrer"'), expectedTarget === '_blank', route);
  }
});

test('approved captured documents preserve encoded href suffixes and native query/anchor merge ordering', () => {
  const { prospectusLinkField } = loadSource(path.join(sourceRoot, 'components/prospectus-document-table/prospectus-document-table.props.ts'));
  const record = manifest.records.find((item) => item.route.endsWith('/prospectuses/allianz-index-advantage-plus-income'));
  const row = record.sections.find((section) => section.component === 'ProspectusDocumentTable').sourceFieldValues.documents.targetItems
    .find((item) => item.documentLink.jsonValue.value.href.startsWith('/-/media/'));
  const sourceHref = row.documentLink.jsonValue.value.href;
  const expectedLocal = '/allianz-assets/5feb237344a4d4f7-IAIP-Supplement.pdf';
  const cases = [
    { suffix: '?campaign=first&campaign=second&encoded=a%23b#page-2', querystring: '?native=1&campaign=third', anchor: '',
      expectedQuery: 'campaign=first&campaign=second&encoded=a%23b&native=1&campaign=third', expectedAnchor: 'page-2' },
    { suffix: '?campaign=first&campaign=second#source-page', querystring: '?campaign=first&campaign=second', anchor: '#native-page',
      expectedQuery: 'campaign=first&campaign=second', expectedAnchor: 'native-page' },
    { suffix: '#page-3', querystring: '?download=1', anchor: '', expectedQuery: 'download=1', expectedAnchor: 'page-3' },
    { suffix: '', querystring: '?native=1&native=2', anchor: '#native-only', expectedQuery: 'native=1&native=2', expectedAnchor: 'native-only' },
  ];
  for (const origin of ['', 'https://www.allianzlife.com']) for (const sample of cases) {
    const field = editableField('documentLink', { ...row.documentLink.jsonValue.value,
      href: `${origin}${sourceHref}${sample.suffix}`, querystring: sample.querystring, anchor: sample.anchor }, 'General Link').jsonValue;
    const before = JSON.stringify(field);
    const normal = prospectusLinkField(field, false);
    assert.equal(normal.value.href, expectedLocal);
    assert.equal(normal.value.querystring, sample.expectedQuery);
    assert.equal(normal.value.anchor, sample.expectedAnchor);
    assert.equal(normal.value.target, '_blank');
    assert.deepEqual(normal.metadata, field.metadata);
    assert.equal(prospectusLinkField(field, true), field);
    assert.equal(JSON.stringify(field), before);
    const html = render(documentTable, { documents: { targetItems: [{ documentLink: { jsonValue: field } }] } });
    const expectedHref = `${expectedLocal}?${sample.expectedQuery}#${sample.expectedAnchor}`.replaceAll('&', '&amp;');
    assert.ok(html.includes(`href="${expectedHref}"`), html);
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  }
  const unavailable = editableField('documentLink', { ...row.documentLink.jsonValue.value,
    href: `${sourceHref}#service-unavailable` }, 'General Link').jsonValue;
  assert.equal(prospectusLinkField(unavailable, false).value.href, '#service-unavailable');
  assert.equal(prospectusLinkField(unavailable, false).value.target, '');
});

test('directory, introduction and shareholder fields emit real editing chrome after clearing', () => {
  const cases = [
    [{ directory: 'prospectus-product-directory', component: 'ProspectusProductDirectory', variant: 'Default' },
      { currentProducts: { targetItems: [{ productLink: editableField('productLink', { href: '' }, 'General Link') }] }, pastProducts: { targetItems: [] } }, ['productLink']],
    [{ directory: 'prospectus-introduction', component: 'ProspectusIntroduction', variant: 'Default' },
      { introductoryCopy: editableField('introductoryCopy', '', 'Rich Text') }, ['introductoryCopy']],
    [{ directory: 'prospectus-introduction', component: 'ProspectusIntroduction', variant: 'ContractNotice' },
      { contractNotice: editableField('contractNotice', '') }, ['contractNotice']],
    [{ directory: 'prospectus-introduction', component: 'ProspectusIntroduction', variant: 'ArchivedContractNotice' },
      { contractNotice: editableField('contractNotice', '') }, ['contractNotice']],
    [{ directory: 'shareholder-report-access', component: 'ShareholderReportAccess', variant: 'Default' },
      { heading: editableField('heading', ''), reportsLink: editableField('reportsLink', { href: '', text: '' }, 'General Link') }, ['heading', 'reportsLink']],
    [{ directory: 'shareholder-report-access', component: 'ShareholderReportAccess', variant: 'NewYork' },
      { reportsLink: editableField('reportsLink', { href: '', text: '' }, 'General Link') }, ['reportsLink']],
  ];
  for (const [section, datasource, names] of cases) {
    const Component = component(section);
    const before = JSON.stringify(datasource);
    assert.deepEqual(metadata(render(Component, datasource, true)).map((m) => m.fieldId), names.map((n) => `test-${n}`));
    assert.equal(JSON.stringify(datasource), before);
    assert.doesNotMatch(render(Component, datasource), /\[No text|\[No link|View Reports|Authored prospectus/);
    assert.match(render(Component, undefined), /Add a datasource/);
  }
});

test('populated native-style introductions and text notices create valid source paragraph structure', () => {
  const tableContract = JSON.parse(fs.readFileSync(path.join(here, '../author-contract.json')));
  assert.equal(tableContract.documentRecordFields.find((field) => field.name === 'contractNote').type, 'Single-Line Text');
  const introContract = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'components/prospectus-introduction/author-contract.json')));
  assert.equal(introContract.authorFields.find((field) => field.name === 'introductoryCopy').type, 'Rich Text');
  assert.equal(introContract.authorFields.find((field) => field.name === 'contractNotice').type, 'Single-Line Text');
  const intro = component({ directory: 'prospectus-introduction', component: 'ProspectusIntroduction', variant: 'Default' });
  const richText = { introductoryCopy: editableField('introductoryCopy', '<p><strong>Saved eligibility notice</strong></p><p>Second paragraph.</p>', 'Rich Text') };
  const richBefore = JSON.stringify(richText);
  const richHtml = render(intro, richText);
  assert.match(richHtml, /class="col-md-12 content-body pre-content"><p><strong>Saved eligibility notice<\/strong><\/p><p>Second paragraph\.<\/p>/);
  assert.doesNotMatch(richHtml, /<p[^>]*>\s*<p/);
  assert.deepEqual(metadata(render(intro, richText, true)), [richText.introductoryCopy.jsonValue.metadata]);
  assert.equal(JSON.stringify(richText), richBefore);

  const note = editableField('contractNote', 'Saved <note> with & symbol');
  const row = { contractNote: note };
  const rowBefore = JSON.stringify(row);
  const rowHtml = render(documentTable, { documents: { targetItems: [row] } });
  assert.match(rowHtml, /<p>Saved &lt;note&gt; with &amp; symbol<\/p>/);
  assert.doesNotMatch(rowHtml, /<p[^>]*>\s*<p|<note>/);
  assert.deepEqual(metadata(render(documentTable, { documents: { targetItems: [row] } }, true)), [note.jsonValue.metadata]);
  assert.equal(JSON.stringify(row), rowBefore);
  assert.match(render(documentTable, { documents: { targetItems: [{ contractNote: editableField('contractNote', '\u00a0') }] } }), /<p>\u00a0<\/p>/);

  for (const [variant, bold] of [['ContractNotice', true], ['ArchivedContractNotice', false]]) {
    const noticeComponent = component({ directory: 'prospectus-introduction', component: 'ProspectusIntroduction', variant });
    const notice = { contractNotice: editableField('contractNotice', 'Saved contract eligibility notice') };
    const before = JSON.stringify(notice);
    const html = render(noticeComponent, notice);
    assert.equal((html.match(/<p[ >]/g) ?? []).length, 1);
    assert.equal(html.includes('<strong>'), bold);
    assert.doesNotMatch(html, /<p[^>]*>\s*<p/);
    assert.deepEqual(metadata(render(noticeComponent, notice, true)), [notice.contractNotice.jsonValue.metadata]);
    assert.equal(JSON.stringify(notice), before);
    const literalMarkup = { contractNotice: editableField('contractNotice', '<p><strong>Literal text</strong></p>') };
    assert.match(render(noticeComponent, literalMarkup), /&lt;p&gt;&lt;strong&gt;Literal text&lt;\/strong&gt;&lt;\/p&gt;/);
  }
});

test('unknown style parameters do not change the fixed source layout', () => {
  for (const record of manifest.records) for (const section of record.sections) {
    const Component = component(section);
    assert.equal(render(Component, section.sourceFieldValues), render(Component, section.sourceFieldValues, false, {
      theme: 'red-soft', layout: 'slider', columns: '6', headingLevel: 'h6', alignment: 'right', spacing: 'xl',
    }));
  }
});

test('GraphQL contracts request exact purpose fields and complete jsonValue objects', () => {
  const { parse } = require('graphql');
  const fieldsByDirectory = {
    'prospectus-document-table': ['documents', 'documentLink', 'contractNote', 'revisionDate', 'fileSize'],
    'prospectus-product-directory': ['currentProducts', 'pastProducts', 'productLink'],
    'prospectus-introduction': ['introductoryCopy', 'contractNotice'],
    'shareholder-report-access': ['heading', 'reportsLink'],
  };
  for (const [directory, expectedFields] of Object.entries(fieldsByDirectory)) {
    const source = fs.readFileSync(path.join(sourceRoot, `components/${directory}/${directory}.graphql`), 'utf8');
    assert.doesNotThrow(() => parse(source));
    assert.deepEqual([...new Set([...source.matchAll(/field\(name: "([^"]+)"\)/g)].map((m) => m[1]))].sort(), [...expectedFields].sort());
    assert.doesNotMatch(source, /descriptionLabel|fileSizeLabel|revisionDateLabel|theme|headingLevel|sourceHtml/);
  }
});

test('captured source stylesheet supplies the fixed striped table and report gateway rules', () => {
  const legacy = fs.readFileSync(path.join(sourceRoot, '../public/allianz-legacy-assets/legacy-style.css'), 'utf8');
  const modern = fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8');
  for (const rule of ['.allianz-legacy .table-striped>tbody>tr>td{background-color:#fff}',
    '.allianz-legacy .table-striped>tbody>tr:nth-child(odd)>td{background-color:#f7f7f7}',
    '.allianz-legacy .table>tbody>tr:first-child>td,.allianz-legacy .table>thead>tr>th{border-top:1px solid #bbb}']) assert.ok(legacy.includes(rule), rule);
  for (const selector of ['.m-axlIntroductionBlock', '.a-link__icon', '.u-padding-top-lg', '.l-grid--max-width']) assert.ok(modern.includes(selector), selector);
});
