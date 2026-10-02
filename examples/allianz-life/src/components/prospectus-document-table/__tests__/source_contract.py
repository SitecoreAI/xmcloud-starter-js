#!/usr/bin/env python3
"""Independent public-source DOM oracle. Captures are test-only, never runtime data."""
import hashlib
import html
import base64
import json
import re
import sys
import tarfile
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
COMPONENTS = HERE.parent.parent
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())

@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    content: list = field(default_factory=list)
    parent: object = None
    start: int = 0
    end: int = 0
    def children(self): return [n for n in self.content if isinstance(n, Node)]
    def descendants(self):
        for n in self.children():
            yield n
            yield from n.descendants()
    def has(self, css): return css in self.attrs.get('class', '').split()
    def find(self, tag=None, css=None, id=None):
        return next((n for n in self.descendants() if (tag is None or n.tag == tag)
                     and (css is None or n.has(css)) and (id is None or n.attrs.get('id') == id)), None)
    def text(self):
        return re.sub(r'\s+', ' ', ' '.join(n.text() if isinstance(n, Node) else n for n in self.content)).strip()

class DOM(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.offsets = [0] + [m.end() for m in re.finditer('\n', source)]
        self.root = Node('root'); self.stack = [self.root]
        self.feed(source)
    def source_offset(self):
        line, column = self.getpos(); return self.offsets[line-1] + column
    def handle_starttag(self, tag, attrs):
        n = Node(tag, {k: v or '' for k, v in attrs}, parent=self.stack[-1], start=self.source_offset())
        self.stack[-1].content.append(n)
        if tag not in VOID: self.stack.append(n)
        else: n.end = self.source_offset() + len(self.get_starttag_text())
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack[-1].end = self.source_offset() + len(self.get_starttag_text()); self.stack.pop()
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack[i].end = self.source.find('>', self.source_offset()) + 1
                self.stack = self.stack[:i]; break
    def handle_data(self, value): self.stack[-1].content.append(value)

def digest(value): return hashlib.sha256(value.encode()).hexdigest()
def outer(node, source): return source[node.start:node.end]
def inner(node, source): return source[source.find('>', node.start)+1:source.rfind('</', node.start, node.end)]
def native(value): return {'jsonValue': {'value': value}}
def display_copy(node, source):
    # Indentation is HTML formatting; source nonbreaking spaces are real copy
    # that can affect the archived revision column's width and must survive.
    return re.sub(r'[ \t\r\n\f]+', ' ', html.unescape(inner(node, source))).strip(' \t\r\n\f')
def link(node):
    return native({'href': node.attrs.get('href', ''), 'text': node.text(),
                   'target': node.attrs.get('target', ''), 'linktype': 'external'
                   if node.attrs.get('href', '').startswith('http') else 'internal'})
def tables(root): return [n for n in root.descendants() if n.tag == 'table' and n.has('table-striped')]
def body_rows(table): return table.find(tag='tbody').children()
def table_fields(table, source):
    rows = []
    for row in body_rows(table):
        cells = row.children()
        anchor = cells[0].find(tag='a')
        note = cells[0].find(tag='p')
        assert not note.children(), 'The source contract note must remain plain copy'
        rows.append({'documentLink': link(anchor), 'contractNote': native(html.unescape(inner(note, source))),
                     'revisionDate': native(display_copy(cells[1], source)), 'fileSize': native(display_copy(cells[2], source))})
    return {'documents': {'targetItems': rows}}
def clean_outline(node):
    # Navigation deliberately uses the app's existing safe adapter. SDK editing
    # chrome is tested independently; fixed table design is compared directly.
    return [node.tag, ' '.join(node.attrs.get('class', '').split()),
            [clean_outline(n) for n in node.children() if n.tag not in {'title', 'desc'}]]

def capture(archive, fixture):
    fixture_routes = json.loads(Path(fixture).read_text())['routes']
    records = []
    with tarfile.open(archive) as tar:
        inventory = json.load(tar.extractfile('discovery/public-site/canonical_inventory.json'))
        by_url = {r['url'].lower(): r for r in inventory}
        for route, candidate in fixture_routes.items():
            if candidate['archetype'] != 'Document / disclosure library': continue
            item = by_url['https://www.allianzlife.com' + route]
            archive_path = 'discovery/public-site/' + item['html_file']
            source = tar.extractfile(archive_path).read().decode()
            root = DOM(source).root
            content = root.find(id='content-body')
            modern = content is None
            section = root.find(css='axlTileCollection') if modern else content
            fragment = outer(section, source)
            filename = route.strip('/').replace('/', '--') + '.source.html'
            capture_dir = HERE / 'captures'; capture_dir.mkdir(exist_ok=True)
            (capture_dir / filename).write_bytes(fragment.replace('\r\n', '\n').encode('utf-8'))
            record = {'route': route, 'sourceUrl': item['url'], 'archiveFile': archive_path,
                      'archiveSha256': digest(source), 'captureFile': 'captures/' + filename,
                      'captureSha256': digest(fragment),
                      'captureBase64': base64.b64encode(fragment.encode('utf-8')).decode('ascii'),
                      'captureLfSha256': digest(fragment.replace('\r\n', '\n')), 'sections': [],
                      'sourceCandidateKeys': [c['sourceKey'] for c in candidate['components']],
                      'remainingSections': ['Page heading', 'Legal disclosures']}
            striped = tables(section)
            if striped and len(striped[0].find(tag='thead').find(tag='tr').children()) == 1:
                assert len(striped) == 2
                assert [t.find(tag='th').text() for t in striped] == ['Current Products', 'Past Products']
                fields = {name: {'targetItems': [{'productLink': link(row.find(tag='a'))}
                                                for row in body_rows(table)]}
                          for name, table in zip(['currentProducts', 'pastProducts'], striped)}
                record['family'] = 'product-directory'
                record['sections'].append({'component': 'ProspectusProductDirectory', 'directory': 'prospectus-product-directory',
                    'variant': 'Default', 'sourceFieldValues': fields})
            elif striped:
                assert len(striped) == 1
                table = striped[0]
                labels = [c.text() for c in table.find(tag='thead').find(tag='tr').children()]
                product = table.attrs.get('id') == 'prospectusTable'
                assert labels == ['Description' if product else 'Description / Name', 'Revision Date', 'Size']
                record['family'] = 'product-prospectus' if product else 'directory-prospectus'
                record['sections'].append({'component': 'ProspectusDocumentTable', 'directory': 'prospectus-document-table',
                    'variant': 'Product' if product else 'Embedded' if route.endswith(('past-prospectus-allianz-index-advantage-new-york', '/prospectuses/index-advantage-plus-select-income')) else 'Default', 'sourceColumnLabels': labels,
                    'sourceFieldValues': table_fields(table, source)})
                if product: record['remainingSections'].extend(['Product navigation', 'Next steps and mock product contact form'])
                if route.endswith('past-prospectus-allianz-index-advantage-new-york'):
                    record['remainingSections'].append('Archived contract notice and nested pre-content host')
                if route.endswith('/prospectuses/index-advantage-plus-select-income'):
                    record['remainingSections'].append('Embedded page-heading and disclosure host')
            else:
                record['family'] = 'modern-shareholder-access' if modern else 'new-york-shareholder-access'
                anchor = section.find(css='tileLink').find(tag='a') if modern else section.find(css='pre-content').find(tag='a')
                fields = {'reportsLink': link(anchor)}
                if modern:
                    fields['heading'] = native(section.find(css='tileHeading').find(tag='h1').text())
                    fields['reportsLink']['jsonValue']['value']['text'] = anchor.find(css='a-link__text').text()
                record['sections'].append({'component': 'ShareholderReportAccess', 'directory': 'shareholder-report-access',
                    'variant': 'Default' if modern else 'NewYork', 'sourceFieldValues': fields})
                if modern: record['remainingSections'] = ['Legal disclosures']
            if content:
                pre = content.find(css='pre-content')
                if pre and pre.text() and not pre.find(tag='table') and record['family'] != 'new-york-shareholder-access':
                    record['sections'].insert(0, {'component': 'ProspectusIntroduction', 'directory': 'prospectus-introduction',
                        'variant': 'Default', 'sourceFieldValues': {'introductoryCopy': native(inner(pre, source))}})
                if pre and pre.find(tag='table'):
                    notice = next(n for n in pre.children() if n.tag == 'p')
                    record['sections'].insert(0, {'component': 'ProspectusIntroduction', 'directory': 'prospectus-introduction',
                        'variant': 'ArchivedContractNotice', 'sourceFieldValues': {'contractNotice': native(notice.text())}})
                for node in content.children():
                    if node.tag == 'p' and node.text():
                        record['sections'].insert(0, {'component': 'ProspectusIntroduction', 'directory': 'prospectus-introduction',
                            'variant': 'ContractNotice', 'sourceFieldValues': {'contractNotice': native(node.text())}})
            records.append(record)
    assert len(records) == 30
    counts = {family: sum(r['family'] == family for r in records) for family in sorted({r['family'] for r in records})}
    manifest = {'schemaVersion': 1, 'scope': 'Public-source contracts and SDK render witnesses only. No native item, template, row ID, DAM mapping, asset delivery, route adoption or browser acceptance is claimed.',
                'coverage': {'routes': len(records), 'families': counts}, 'records': records,
                'captureEncoding': {
                    'rawWitness': 'captureBase64 retains original raw UTF-8 fragment bytes verified by captureSha256; archiveSha256 is unchanged',
                    'readableCapture': 'captureFile allows only LF/CRLF checkout conversion under captureLfSha256; exact source field values are verified against the raw witness'}}
    (HERE / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest['coverage']))

def capture_source(record, checkout_bytes=None):
    raw = base64.b64decode(record['captureBase64'], validate=True)
    assert hashlib.sha256(raw).hexdigest() == record['captureSha256'], 'Raw fragment digest mismatch'
    source = raw.decode('utf-8')
    checkout = (HERE / record['captureFile']).read_bytes() if checkout_bytes is None else checkout_bytes
    readable = checkout.decode('utf-8').replace('\r\n', '\n')
    canonical = source.replace('\r\n', '\n')
    assert digest(readable) == record['captureLfSha256'] and readable == canonical, 'Readable capture changed beyond LF/CRLF conversion'
    return source

def check_line_endings():
    manifest = json.loads((HERE / 'manifest.json').read_text())
    for record in manifest['records']:
        source = capture_source(record)
        canonical = source.replace('\r\n', '\n')
        for checkout in [canonical, canonical.replace('\n', '\r\n')]:
            assert capture_source(record, checkout.encode('utf-8')) == source
        for mutation in [canonical + 'unexpected content', ' ' + canonical, canonical.replace('\n', '\r')]:
            try: capture_source(record, mutation.encode('utf-8'))
            except AssertionError: pass
            else: raise AssertionError('Non-EOL capture mutation was accepted')
    print('30 raw witnesses survive LF and CRLF checkouts; content normalization rejected')

def verify(payload, checkout_style=None):
    manifest = json.loads((HERE / 'manifest.json').read_text())
    assert len(manifest['records']) == 30
    for record in manifest['records']:
        checkout = None
        if checkout_style:
            canonical = (HERE / record['captureFile']).read_bytes().decode('utf-8').replace('\r\n', '\n')
            checkout = (canonical.replace('\n', '\r\n') if checkout_style == 'crlf' else canonical).encode('utf-8')
        source = capture_source(record, checkout)
        root = DOM(source).root
        for section in record['sections']:
            key = record['route'] + ':' + section['component']
            actual = DOM(payload[key]).root
            if section['component'] == 'ProspectusDocumentTable':
                expected_table, actual_table = tables(root)[0], tables(actual)[0]
                assert clean_outline(expected_table) == clean_outline(actual_table), key
                assert [n.text() for n in expected_table.find(tag='thead').find(tag='tr').children()] == [n.text() for n in actual_table.find(tag='thead').find(tag='tr').children()], key
                assert table_fields(expected_table, source) == section['sourceFieldValues'], key
                for expected_row, actual_row in zip(body_rows(expected_table), body_rows(actual_table)):
                    assert [n.text() for n in expected_row.children()] == [n.text() for n in actual_row.children()], key
                    source_link, actual_link = expected_row.find(tag='a'), actual_row.find(tag='a')
                    if actual_link.attrs.get('href', '').startswith('/allianz-assets/'):
                        assert source_link.attrs.get('target', '') == actual_link.attrs.get('target', ''), key
                    for column in [1, 2]:
                        assert display_copy(expected_row.children()[column], source) == display_copy(actual_row.children()[column], payload[key]), key
                assert expected_table.attrs.get('id') == actual_table.attrs.get('id'), key
            elif section['component'] == 'ProspectusProductDirectory':
                assert len(tables(actual)) == 2, key
                expected_fields = {name: {'targetItems': [{'productLink': link(row.find(tag='a'))}
                    for row in body_rows(table)]} for name, table in zip(['currentProducts', 'pastProducts'], tables(root))}
                assert expected_fields == section['sourceFieldValues'], key
                for expected_table, actual_table in zip(tables(root), tables(actual)):
                    assert clean_outline(expected_table) == clean_outline(actual_table), key
                    assert expected_table.text() == actual_table.text(), key
            elif section['component'] == 'ShareholderReportAccess':
                if section['variant'] == 'Default':
                    expected = root.find(css='axlTileCollection'); rendered = actual.find(css='axlTileCollection')
                    source_link = link(expected.find(css='tileLink').find(tag='a'))
                    source_link['jsonValue']['value']['text'] = expected.find(css='a-link__text').text()
                    assert section['sourceFieldValues'] == {'heading': native(expected.find(css='tileHeading').find(tag='h1').text()), 'reportsLink': source_link}, key
                    assert clean_outline(expected) == clean_outline(rendered), key
                    assert expected.find(css='tileHeading').text() == rendered.find(css='tileHeading').text(), key
                    assert expected.find(css='a-link__text').text() == rendered.find(css='a-link__text').text(), key
                    assert expected.find(tag='path').attrs['d'] == rendered.find(tag='path').attrs['d'], key
                else:
                    assert section['sourceFieldValues'] == {'reportsLink': link(root.find(css='pre-content').find(tag='a'))}, key
                    assert root.find(css='pre-content').text() == actual.find(css='pre-content').text(), key
            else:
                if section['variant'] == 'Default':
                    copy = section['sourceFieldValues']['introductoryCopy']['jsonValue']['value']
                    source_copy = inner(root.find(css='pre-content'), source)
                    assert copy == source_copy, key
                    expected = DOM(copy).root
                    target = actual.find(css='pre-content')
                    assert expected.text() == target.text(), key
                    assert [clean_outline(n) for n in expected.children()] == [clean_outline(n) for n in target.children()], key
                else:
                    copy = section['sourceFieldValues']['contractNotice']['jsonValue']['value']
                    content = root.find(id='content-body')
                    pre = content.find(css='pre-content')
                    source_node = pre.find(tag='p') if pre and pre.find(tag='table') else next(n for n in content.children() if n.tag == 'p')
                    assert copy == source_node.text(), key
                    target = actual.find(tag='p')
                    assert source_node.text() == target.text(), key
                    assert clean_outline(source_node) == clean_outline(target), key
    print('30 source-route contracts match real SDK output')

if __name__ == '__main__':
    if sys.argv[1] == 'capture': capture(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == 'line-endings': check_line_endings()
    else: verify(json.load(sys.stdin), 'lf' if sys.argv[1] == 'verify-lf' else 'crlf' if sys.argv[1] == 'verify-crlf' else None)
