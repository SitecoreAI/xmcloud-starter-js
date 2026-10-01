"""Offline source-evidence regressions for recovered editorial fragments."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urlparse

spec = importlib.util.spec_from_file_location('allianz_extract_fragments', Path(__file__).with_name('extract_public_content.py'))
extract = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = extract
spec.loader.exec_module(extract)

RILA = '/what-we-offer/annuities/registered-index-linked-annuities/'
INTRODUCTIONS = {
    RILA + 'index-advantage-income-adv': ('html/569110081b5b9a7c.html', 6),
    RILA + 'index-advantage-plus-select-income': ('html/e07b235156d1a276.html', 7),
}
CASH_EQUIVALENT = {
    '/new-york/annuities/investment-strategies/cash-equivalent': 'html/7dc40f13a05096be.html',
    '/what-we-offer/annuities/investment-strategies/cash-equivalent': 'html/bc4b1d4b09e18817.html',
}
BLOCKED = [RILA + name for name in ('define-your-downside', 'index-advantage-plus-nf/rila-rates-center-infp', 'rila-rates-center')]


def value(fields, name):
    return fields.get(name, {}).get('jsonValue', {}).get('value', '')


class CapturedFragmentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        files = {**CASH_EQUIVALENT, **{path: details[0] for path, details in INTRODUCTIONS.items()}}
        if any(not (extract.ROOT / filename).is_file() for filename in files.values()):
            raise unittest.SkipTest('Authorized public HTML captures are not present in this checkout')
        extract.load_assets()
        extract.DOCUMENT_PATHS.update(urlparse(document['url']).path.lower() for document in json.loads((extract.ROOT / 'document_inventory.json').read_text()))
        cls.contract = json.loads((extract.REPO / 'authoring/allianz-life/content-contract.json').read_text())
        cls.original = json.loads((extract.OUTPUT / 'native-content.json').read_text())['routes']
        cls.routes, cls.gaps, cls.source = {}, {}, {}
        with tempfile.TemporaryDirectory() as directory, patch.object(extract, 'SVG_DIR', Path(directory)):
            for path, filename in files.items():
                row = {'final_url': extract.HOST + path, 'html_file': filename, 'archetype': 'Product detail / guide' if path in INTRODUCTIONS else 'Marketing / topic landing'}
                cls.routes[path], cls.gaps[path] = extract.parse_page(row)
                cls.source[path] = extract.DOM((extract.ROOT / filename).read_text()).root

    def test_introductions_preserve_exact_source_heading_body_and_icon(self):
        for path, (_, index) in INTRODUCTIONS.items():
            with self.subTest(path=path):
                section = self.source[path].find('main').children()[index]
                tile = section.find(css='m-axlTile')
                fragment = next(c for c in self.routes[path]['components'] if c.get('nativeSupplementKey') == f'section:{index}:fragment:0')
                self.assertEqual(fragment['componentName'], 'AllianzCardGrid')
                children = fragment['fields']['data']['datasource']['children']['results']
                self.assertEqual(len(children), 1)
                card = children[0]
                self.assertEqual(value(card, 'heading'), tile.find(css='tileHeading').text())
                self.assertEqual(value(card, 'body'), extract.rich(tile.find(css='tileBody'), extract.HOST + path).strip())
                self.assertEqual(value(card, 'heading'), 'Investor profile and index options')
                self.assertIn('<strong>Explore the chart below', value(card, 'body'))
                svg = extract.raw_svg(tile.find('svg'))
                digest = hashlib.sha256(svg.encode()).hexdigest()[:16]
                self.assertEqual(value(card, 'icon'), {'src': '/allianz-assets/' + digest + '.svg', 'alt': 'Line Graph'})
                self.assertEqual(fragment['provenance']['sourceSection'], index)
                self.assertEqual(fragment['provenance']['sourceHtml'], INTRODUCTIONS[path][0])
                self.assertEqual(fragment['params']['alignment'], 'center')

    def test_fragment_precedes_all_six_unchanged_accordions(self):
        for path, (_, index) in INTRODUCTIONS.items():
            with self.subTest(path=path):
                components = self.routes[path]['components']
                group = [c for c in components if c['sourceKey'].startswith(path + f':section:{index}:')]
                self.assertEqual([c['componentName'] for c in group], ['AllianzCardGrid'] + ['AllianzAccordion'] * 6)
                fragment_key = path + f':section:{index}:fragment:0'
                self.assertEqual(group[0]['uid'], extract.stable(fragment_key))
                self.assertEqual(group[0]['dataSource'], extract.stable(fragment_key + ':datasource'))
                for ordinal, accordion in enumerate(group[1:]):
                    key = path + f':section:{index}:accordion:{ordinal}'
                    self.assertEqual(accordion['uid'], extract.stable(key))
                    self.assertEqual(accordion['dataSource'], extract.stable(key + ':datasource'))
                old = [c for c in self.original[path]['components'] if c['componentName'] != 'AllianzBreadcrumbs' and not c.get('nativeSupplementKey', '').startswith(f'section:{index}:fragment:')]
                old_keys = {c['sourceKey'] for c in old}
                self.assertEqual([(c['sourceKey'], c['uid'], c['dataSource']) for c in components if c['sourceKey'] in old_keys], [(c['sourceKey'], c['uid'], c['dataSource']) for c in old])
                section = self.source[path].find('main').children()[index]
                self.assertEqual(extract.residual_editorial(section, group, extract.HOST + path), {})
                self.assertFalse(any(gap.get('section') == index and 'omitted' in gap['reason'] for gap in self.gaps[path]))

    def test_cash_table_extends_existing_body_after_paragraph(self):
        for path in CASH_EQUIVALENT:
            with self.subTest(path=path):
                components = self.routes[path]['components']
                self.assertEqual(len(components), 5)
                for ordinal, component in enumerate(components):
                    key = path + f':component:{ordinal}'
                    self.assertEqual((component['uid'], component['dataSource']), (extract.stable(key), extract.stable(key + ':datasource')))
                source_table = next(n for n in self.source[path].all('table') if n.attrs.get('id') == 'asset-class')
                self.assertTrue(extract.source_cash_equivalent_table(source_table, extract.HOST + path))
                component = components[2]
                body_field = component['fields']['data']['datasource']['body']
                body = body_field['jsonValue']['value']
                preceding = source_table.parent.find(css='fund-content')
                self.assertTrue(body.startswith(extract.rich(preceding, extract.HOST + path).strip() + '\n<table'))
                self.assertEqual(component['params']['tableTheme'], 'striped')
                table = extract.DOM(body).root.find('table')
                self.assertEqual([cell.text() for cell in table.all('th')], ['Money Manager', 'Investment Option'])
                source_links = [a.text() for a in source_table.all('a') if a.text()]
                self.assertEqual([a.text() for a in table.all('a') if a.text()], source_links)
                self.assertEqual(len(source_links), 7)
                self.assertEqual(len(table.all('tr')), 2)
                self.assertEqual(table.attrs['class'], 'table table-striped')
                self.assertEqual(table.find('img').attrs, {'src': '/allianz-assets/d40db57f71343f08.gif', 'alt': 'BlackRock'})
                self.assertEqual(len(body_field['inlineImages']), 1)
                image = body_field['inlineImages'][0]
                self.assertEqual(image['asset']['status'], 'available')
                self.assertEqual(image['asset']['sha256'], '6ece1173dc9c970a109d1d1b9a8ebd4c7744a58c803f35909a78d5c9b39a45c0')
                self.assertEqual(image['asset']['sourceUrl'], 'https://www.allianzlife.com/-/media/Images/Allianz/Fund-Managers/BlackRock.gif?sc_lang=en')
                self.assertIn('Content Hub', image['deliveryMapping'])
                self.assertIn(image['asset'], extract.find_asset_refs(self.routes[path]))
                self.assertNotIn('data-action=', body)
                self.assertNotIn('<script', body)
                self.assertFalse(any('Unsupported legacy editorial island' in g['reason'] or 'omitted' in g['reason'] for g in self.gaps[path]))

    def test_all_four_fragments_use_existing_native_field_contracts(self):
        for path, route in self.routes.items():
            with self.subTest(path=path):
                self.assertEqual(extract.schema_errors(route, self.contract), [])

    def test_missing_table_logo_stays_an_asset_review_gate(self):
        path = next(iter(CASH_EQUIVALENT))
        table = next(n for n in self.source[path].all('table') if n.attrs.get('id') == 'asset-class')
        with patch.dict(extract.ASSET_BY_PATH, clear=True):
            images = []
            body = extract.rich(table, extract.HOST + path, True, images)
        self.assertNotIn('<img', body)
        self.assertEqual(len(images), 1)
        self.assertEqual(images[0]['asset']['status'], 'missing')
        self.assertEqual(images[0]['jsonValue']['value']['src'], '')
        self.assertEqual(len(extract.find_asset_refs({'body': {'jsonValue': {'value': body}, 'inlineImages': images}})), 1)

    def test_unbundled_logo_and_original_image_attributes_are_not_copied(self):
        path = next(iter(CASH_EQUIVALENT))
        source = '<table><tr><td><a href="#"><img src="/-/media/Images/Allianz/Fund-Managers/BlackRock.gif?sc_lang=en" alt="BlackRock" style="width:99px" onerror="alert(1)"></a></td></tr></table>'
        table = extract.DOM(source).root.find('table')
        images = []
        body = extract.rich(table, extract.HOST + path, True, images)
        self.assertNotIn('onerror', body)
        self.assertNotIn('style=', body)
        self.assertEqual(extract.DOM(body).root.find('img').attrs, {'src': '/allianz-assets/d40db57f71343f08.gif', 'alt': 'BlackRock'})
        self.assertNotIn('<img', extract.rich(table, extract.HOST + path, True))
        with tempfile.TemporaryDirectory() as directory, patch.object(extract, 'REPO', Path(directory)):
            images = []
            self.assertNotIn('<img', extract.rich(table, extract.HOST + path, True, images))
            self.assertEqual(images[0]['asset']['status'], 'missing')

    def test_table_exception_does_not_admit_other_routes(self):
        path = next(iter(CASH_EQUIVALENT))
        table = next(n for n in self.source[path].all('table') if n.attrs.get('id') == 'asset-class')
        self.assertFalse(extract.source_cash_equivalent_table(table, extract.HOST + '/unrelated'))

    def test_recorded_table_logo_hash_mismatch_remains_unavailable(self):
        path = next(iter(CASH_EQUIVALENT))
        source_path = '/-/media/images/allianz/fund-managers/blackrock.gif'
        image = next(n for n in self.source[path].all('table') if n.attrs.get('id') == 'asset-class').find('img')
        selected = {**extract.ASSET_BY_PATH[source_path], 'sha256': '0' * 64}
        with patch.dict(extract.ASSET_BY_PATH, {source_path: selected}):
            result = extract.inline_table_image(image, extract.HOST + path)
        self.assertEqual(result['asset']['status'], 'missing')
        self.assertEqual(result['jsonValue']['value']['src'], '')


class CapturedBlockedLinkTests(unittest.TestCase):
    def test_three_observed403_routes_are_explicitly_unavailable(self):
        captured = json.loads((extract.ROOT / 'blocked_public_candidates.json').read_text())
        canonical = {urlparse(row['final_url']).path.lower().rstrip('/') or '/' for row in json.loads((extract.ROOT / 'canonical_inventory.json').read_text())}
        for path in BLOCKED:
            with self.subTest(path=path):
                self.assertIn(extract.HOST + path, captured)
                self.assertNotIn(path, canonical)
                self.assertEqual(extract.canonical_href(path), ('#demo-unavailable', 'captured blocked public candidate'))
                self.assertEqual(extract.canonical_href(extract.HOST + path + '?example=1#rates')[0], '#demo-unavailable')
                anchor = extract.DOM('<a href="' + path + '">Source label</a>').root.find('a')
                link = extract.link_value(anchor, extract.HOST + '/')
                self.assertEqual(link['jsonValue']['value']['href'], '#demo-unavailable')
                self.assertEqual(link['jsonValue']['value']['text'], 'Source label')
                self.assertEqual(extract.LINK_AUDIT[path]['sourceHref'], path)
                self.assertEqual(extract.LINK_AUDIT[path]['sourceException']['evidence'], 'blocked_public_candidates.json')
                self.assertEqual(link['sourceException']['classification'], 'observed403 public candidate')
                self.assertIn('data-demo-disabled="true"', extract.rich(anchor, extract.HOST + '/', True))

    def test_nearby_recovered_rates_routes_keep_normal_destinations(self):
        for name in ('index-advantage-income-adv/rila-rates-center-iadv', 'index-advantage-plus/rila-rates-center-ixap', 'index-advantage-plus-income/rila-rates-center-iaip'):
            path = RILA + name
            with self.subTest(path=path):
                self.assertEqual(extract.canonical_href(path), (path, 'public same-host'))
                self.assertIsNone(extract.captured_source_exception(path))


if __name__ == '__main__':
    unittest.main()
