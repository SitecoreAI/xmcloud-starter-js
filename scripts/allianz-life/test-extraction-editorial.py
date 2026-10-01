"""Source-evidenced editorial extraction regressions.

Full captured pages remain the evidence for ordered labels, destinations, native
identities and stale review flags. No output fixtures/manifests are regenerated.
"""
import copy
import importlib.util
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('allianz_editorial_extract', Path(__file__).with_name('extract_public_content.py'))
extract = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = extract
spec.loader.exec_module(extract)

# Reviewed missing labels from the source captures referenced by each route's
# sourceHtml, including the masked Ventures LinkedIn omission found 2026-10-01.
# Destinations are the approved bundled/public URLs, with external links inert.
EXPECTED_ADDITIONAL_LINKS = {'/about/newsroom': [('More press releases',
                      '/about/newsroom/2026-Press-Releases',
                      '/about/newsroom/2026-press-releases')],
 '/about/ventures': [('Follow us on LinkedIn',
                      'https://www.linkedin.com/company/allianzlifeventures/',
                      '#demo-unavailable')],
 '/about/ventures/team': [('Connect with Collin on LinkedIn',
                           'https://www.linkedin.com/in/collin-bhojwani/',
                           '#demo-unavailable'),
                          ('Connect with Ron on LinkedIn',
                           'https://www.linkedin.com/in/rongonen/',
                           '#demo-unavailable'),
                          ('Connect with Taylor on LinkedIn',
                           'https://www.linkedin.com/in/taylor-sieverling',
                           '#demo-unavailable'),
                          ('Connect with Clay on LinkedIn',
                           'https://www.linkedin.com/in/clay-bottensek/',
                           '#demo-unavailable')],
 '/for-financial-professionals/allianz-center-for-the-future-of-retirement': [('5 reasons for financial '
                                                                               'professionals to call their '
                                                                               'clients about retirement plans '
                                                                               'right now',
                                                                               '/for-financial-professionals/allianz-center-for-the-future-of-retirement/5-reasons-for-financial-professionals-to-call-their-clients-right-now',
                                                                               '/for-financial-professionals/allianz-center-for-the-future-of-retirement/5-reasons-for-financial-professionals-to-call-their-clients-right-now'),
                                                                              ('How to help clients prepare for a '
                                                                               'longer-lasting retirement',
                                                                               '/for-financial-professionals/resources/help-clients-prepare-for-retirement',
                                                                               '/for-financial-professionals/resources/help-clients-prepare-for-retirement'),
                                                                              ('Download our Weatherproofing '
                                                                               'Retirement Fact Sheet (PDF)',
                                                                               '/-/media/Files/Global/documents/2024/08/20/10/27/EXT-1084.pdf',
                                                                               '/allianz-assets/fa95db7a73140458-EXT-1084.pdf'),
                                                                              ('Download our Weatherproofing '
                                                                               'Retirement Client Brochure (PDF)',
                                                                               '/-/media/Files/Global/documents/2024/08/20/10/37/EXT-1085-A.pdf',
                                                                               '/allianz-assets/7b12582da3534de1-EXT-1085-A.pdf'),
                                                                              ('See more articles',
                                                                               '/for-financial-professionals/resources',
                                                                               '/for-financial-professionals/resources')],
 '/for-financial-professionals/allianz-center-for-the-future-of-retirement/asian-americans-may-need-to-protect-rainy-day-funds-from-extreme-weather': [('Download '
                                                                                                                                                        'our '
                                                                                                                                                        'Weatherproofing '
                                                                                                                                                        'Retirement '
                                                                                                                                                        'Client '
                                                                                                                                                        'Brochure '
                                                                                                                                                        '(PDF)',
                                                                                                                                                        '/-/media/Files/Global/documents/2024/08/20/10/37/EXT-1085-A.pdf',
                                                                                                                                                        '/allianz-assets/7b12582da3534de1-EXT-1085-A.pdf'),
                                                                                                                                                       ('Share '
                                                                                                                                                        'this '
                                                                                                                                                        '10-step '
                                                                                                                                                        'checklist '
                                                                                                                                                        'with '
                                                                                                                                                        'clients '
                                                                                                                                                        '(PDF)',
                                                                                                                                                        '/-/media/Files/Global/documents/2025/08/29/05/52/ENT-4045-N.pdf',
                                                                                                                                                        '/allianz-assets/6adad18482f30983-ENT-4045-N.pdf')],
 '/for-financial-professionals/allianz-center-for-the-future-of-retirement/black-americans-may-underestimate-the-risk-of-extreme-weather-on-their-financial-future': [('Download '
                                                                                                                                                                       'our '
                                                                                                                                                                       'Weatherproofing '
                                                                                                                                                                       'Retirement '
                                                                                                                                                                       'Client '
                                                                                                                                                                       'Brochure '
                                                                                                                                                                       '(PDF)',
                                                                                                                                                                       '/-/media/Files/Global/documents/2024/08/20/10/37/EXT-1085-A.pdf',
                                                                                                                                                                       '/allianz-assets/7b12582da3534de1-EXT-1085-A.pdf'),
                                                                                                                                                                      ('Share '
                                                                                                                                                                       'this '
                                                                                                                                                                       '10-step '
                                                                                                                                                                       'checklist '
                                                                                                                                                                       'with '
                                                                                                                                                                       'clients '
                                                                                                                                                                       '(PDF)',
                                                                                                                                                                       '/-/media/Files/Global/documents/2025/08/29/05/52/ENT-4045-N.pdf',
                                                                                                                                                                       '/allianz-assets/6adad18482f30983-ENT-4045-N.pdf')],
 '/for-financial-professionals/allianz-center-for-the-future-of-retirement/hispanic-americans-may-move-to-reduce-the-risk-of-extreme-weather': [('Download '
                                                                                                                                                 'our '
                                                                                                                                                 'Weatherproofing '
                                                                                                                                                 'Retirement '
                                                                                                                                                 'Client '
                                                                                                                                                 'Brochure '
                                                                                                                                                 '(PDF)',
                                                                                                                                                 '/-/media/Files/Global/documents/2024/08/20/10/37/EXT-1085-A.pdf',
                                                                                                                                                 '/allianz-assets/7b12582da3534de1-EXT-1085-A.pdf'),
                                                                                                                                                ('Share '
                                                                                                                                                 'this '
                                                                                                                                                 '10-step '
                                                                                                                                                 'checklist '
                                                                                                                                                 'with '
                                                                                                                                                 'clients '
                                                                                                                                                 '(PDF)',
                                                                                                                                                 '/-/media/Files/Global/documents/2025/08/29/05/52/ENT-4045-N.pdf',
                                                                                                                                                 '/allianz-assets/6adad18482f30983-ENT-4045-N.pdf')],
 '/for-financial-professionals/grow-your-business-in-multicultural-markets': [('Share this 10-step checklist with '
                                                                               'clients (PDF)',
                                                                               '/-/media/Files/Global/documents/2025/08/29/05/52/ENT-4045-N.pdf',
                                                                               '/allianz-assets/6adad18482f30983-ENT-4045-N.pdf')],
 '/for-financial-professionals/resources/3-reasons-to-talk-to-your-clients-about-the-weather': [('Download our '
                                                                                                 'Weatherproofing '
                                                                                                 'Retirement '
                                                                                                 'Client Brochure '
                                                                                                 '(PDF)',
                                                                                                 '/-/media/Files/Global/documents/2024/08/20/10/37/EXT-1085-A.pdf',
                                                                                                 '/allianz-assets/7b12582da3534de1-EXT-1085-A.pdf')],
 '/legal-and-obligations': [('Download our Vendor Code of conduct',
                             '/-/media/Files/Allianz/PDFs/about/Vendor-Code-of-Conduct.pdf',
                             '/allianz-assets/25508e290a16ffec-Vendor-Code-of-Conduct.pdf')],
 '/what-we-offer/annuities/fixed-index-annuities/accumulation-advantage-5': [('Download the brochure insert (PDF)',
                                                                              '/-/media/Files/Global/documents/2026/03/30/15/16/AAA5-001-B.pdf',
                                                                              '/allianz-assets/b1df43e091f51ef8-AAA5-001-B.pdf')],
 '/what-we-offer/annuities/fixed-index-annuities/accumulation-advantage-7': [('Download the brochure insert (PDF)',
                                                                              '/-/media/Files/Global/documents/2023/11/10/18/35/AAA7-001-B.pdf',
                                                                              '/allianz-assets/092fb1f722495e45-AAA7-001-B.pdf')],
 '/what-we-offer/annuities/fixed-index-annuities/accumulation-advantage-plus': [('Download the brochure insert '
                                                                                 '(PDF)',
                                                                                 '/-/media/Files/Global/documents/2024/03/11/10/27/AAAPL-001-B.pdf',
                                                                                 '/allianz-assets/3fbe67f421a6b9a2-AAAPL-001-B.pdf')],
 '/what-we-offer/annuities/fixed-index-annuities/lifetime-income-plus': [('Explore our ecosystem (PDF)',
                                                                          '/-/media/Files/Global/documents/2024/01/18/15/49/LIA-163.pdf',
                                                                          '/allianz-assets/511c3cde9a52be95-LIA-163.pdf')],
 '/what-we-offer/annuities/fixed-index-annuities/lifetime-income-plus/insights-and-education': [('View all '
                                                                                                 'resources',
                                                                                                 '/what-we-offer/annuities/fixed-index-annuities/lifetime-income-plus/insights-and-education/resources',
                                                                                                 '/what-we-offer/annuities/fixed-index-annuities/lifetime-income-plus/insights-and-education/resources')],
 '/what-we-offer/annuities/fixed-index-annuities/my-lifetime-income-plus/getting-started': [('Explore our '
                                                                                             'glossary',
                                                                                             '/what-we-offer/annuities/fixed-index-annuities/my-lifetime-income-plus/glossary',
                                                                                             '/what-we-offer/annuities/fixed-index-annuities/my-lifetime-income-plus/glossary')],
 '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-income-adv': [('Try our Define Your '
                                                                                            'Downside risk tool',
                                                                                            '/what-we-offer/annuities/registered-index-linked-annuities/define-your-downside',
                                                                                            '#demo-unavailable'),
                                                                                           ('See our current '
                                                                                            'rates',
                                                                                            '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-income-adv/rila-rates-center-iadv',
                                                                                            '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-income-adv/rila-rates-center-iadv'),
                                                                                           ('Download the Income '
                                                                                            'Benefit rider '
                                                                                            'brochure',
                                                                                            '/-/media/Files/Global/documents/2023/04/01/18/04/IAIP-002.pdf',
                                                                                            '/allianz-assets/8c277407473932a9-IAIP-002.pdf')],
 '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus': [('Try our Define Your '
                                                                                      'Downside risk tool',
                                                                                      '/what-we-offer/annuities/registered-index-linked-annuities/define-your-downside',
                                                                                      '#demo-unavailable'),
                                                                                     ('See our current rates',
                                                                                      '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus/rila-rates-center-ixap',
                                                                                      '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus/rila-rates-center-ixap')],
 '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-income': [('Try our Define Your '
                                                                                             'Downside risk tool',
                                                                                             '/what-we-offer/annuities/registered-index-linked-annuities/define-your-downside',
                                                                                             '#demo-unavailable'),
                                                                                            ('See our current '
                                                                                             'rates',
                                                                                             '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-income/rila-rates-center-iaip',
                                                                                             '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-income/rila-rates-center-iaip'),
                                                                                            ('Download the Income '
                                                                                             'Benefit rider '
                                                                                             'brochure',
                                                                                             '/-/media/Files/Global/documents/2023/04/01/18/04/IAIP-002.pdf',
                                                                                             '/allianz-assets/8c277407473932a9-IAIP-002.pdf')],
 '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-nf': [('Try our Define Your '
                                                                                         'Downside risk tool',
                                                                                         '/what-we-offer/annuities/registered-index-linked-annuities/define-your-downside',
                                                                                         '#demo-unavailable'),
                                                                                        ('See our current rates',
                                                                                         '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-nf/rila-rates-center-infp',
                                                                                         '#demo-unavailable')],
 '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-select-income': [('Try our '
                                                                                                    'Define Your '
                                                                                                    'Downside '
                                                                                                    'risk tool',
                                                                                                    '/what-we-offer/annuities/registered-index-linked-annuities/define-your-downside',
                                                                                                    '#demo-unavailable'),
                                                                                                   ('See our '
                                                                                                    'current '
                                                                                                    'rates',
                                                                                                    '/what-we-offer/annuities/registered-index-linked-annuities/rila-rates-center',
                                                                                                    '#demo-unavailable'),
                                                                                                   ('Download the '
                                                                                                    'Income '
                                                                                                    'Benefit '
                                                                                                    'rider II '
                                                                                                    'brochure '
                                                                                                    '(PDF)',
                                                                                                    '/-/media/Files/Global/documents/2026/02/19/16/39/IASI-002.pdf',
                                                                                                    '/allianz-assets/7b709fe5f247c0d1-IASI-002.pdf')],
 '/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator': [('Download product brochure '
                                                                                    '(PDF)',
                                                                                    '/-/media/Files/Global/documents/2024/06/21/18/02/M-8119.pdf',
                                                                                    '/allianz-assets/1c562b88e17c4bb1-M-8119.pdf')],
 '/what-we-offer/life-insurance/retirement-planning': [('Explore Allianz Life Accumulator® Indexed Universal Life '
                                                        'Insurance Policy',
                                                        '/what-we-offer/Life-Insurance/Indexed-Universal-Life/Allianz-Life-Accumulator',
                                                        '/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator')],
 '/why-allianz/community': [('Download an overview of the community impact report (PDF)',
                             '/-/media/Files/Allianz/PDFs/community-impact-report-overview.pdf',
                             '/allianz-assets/4ac6c04a9ce75ca0-community-impact-report-overview.pdf')],
 '/why-allianz/sustainability': [('See how we are securing a more sustainable future (PDF)',
                                  '/-/media/Files/Allianz/PDFs/community-impact-report-overview.pdf',
                                  '/allianz-assets/4ac6c04a9ce75ca0-community-impact-report-overview.pdf')]}

FIA = '/what-we-offer/annuities/fixed-index-annuities/'
RILA = '/what-we-offer/annuities/registered-index-linked-annuities/'
MVA_SECTIONS = {
    FIA + '222': 7, FIA + '222-plus': 9, FIA + '360': 7,
    FIA + 'accumulation-advantage': 8, FIA + 'accumulation-advantage-5': 8,
    FIA + 'accumulation-advantage-7': 7, FIA + 'accumulation-advantage-classic': 9,
    FIA + 'accumulation-advantage-plus': 9, FIA + 'benefit-control': 7,
    FIA + 'benefit-control-plus': 9, FIA + 'core-income-7': 8,
    FIA + 'essential-income-7': 8, FIA + 'retirement-foundation-adv': 6,
    RILA + 'index-advantage-income-adv': 7,
}
NEW_FOOTERS = {
    '/for-financial-professionals/allianz-center-for-the-future-of-retirement': 4,
    FIA + 'lifetime-income-plus': 10,
    RILA + 'index-advantage-income-adv': 5,
    RILA + 'index-advantage-plus-income': 5,
    RILA + 'index-advantage-plus-select-income': 6,
    '/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator': 2,
}
BIO_SUBHEADINGS = {
    '/about/subject-matter-experts/charles-champagne': 'Head of ETF Strategy Allianz Investment Management LLC',
    '/about/subject-matter-experts/kelly-lavigne': 'Vice President, Head of Annuity Advanced Markets Allianz Life Insurance Company of North America',
}


def field_value(fields, name):
    return fields.get(name, {}).get('jsonValue', {}).get('value', '')


def rendered_links(route):
    """The existing frontend's finite link-bearing field branches."""
    result = []
    for component in route['components']:
        fields = component['fields']['data']['datasource']
        layout = component['params'].get('layout')
        if component['componentName'] == 'AllianzRichText' and layout not in {'rich-text', 'disclosures'}:
            if field_value(fields, 'primaryLink'):
                result.append(field_value(fields, 'primaryLink'))
        if component['componentName'] != 'AllianzCardGrid':
            continue
        if layout != 'list' and field_value(fields, 'heading') and field_value(fields, 'primaryLink'):
            result.append(field_value(fields, 'primaryLink'))
        for card in fields.get('children', {}).get('results', []):
            links = card.get('links', {}).get('targetItems', [])
            if layout in {'cards', 'list'} or not links:
                result.append(field_value(card, 'link'))
            else:
                result.extend(field_value(link, 'link') for link in links)
    return [(link.get('text', ''), link.get('href', '')) for link in result if isinstance(link, dict) and link.get('text')]


class CapturedEditorialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = json.loads((extract.OUTPUT / 'native-content.json').read_text())['routes']
        cls.contract = json.loads((extract.REPO / 'authoring/allianz-life/content-contract.json').read_text())
        cls.newsrooms = {'/about/newsroom/' + str(year) + '-press-releases' for year in (2024, 2025, 2026)}
        paths = set(EXPECTED_ADDITIONAL_LINKS) | set(MVA_SECTIONS) | set(BIO_SUBHEADINGS) | cls.newsrooms | {
            FIA + '222/rates', '/what-we-offer/annuities/increasing-income-potential', '/',
        }
        if any(not (extract.ROOT / cls.original[path]['sourceHtml']).is_file() for path in paths):
            raise unittest.SkipTest('Authorized public HTML captures are not present in this checkout')
        extract.load_assets()
        cls.regenerated, cls.gaps, cls.source = {}, {}, {}
        with tempfile.TemporaryDirectory() as temporary, patch.object(extract, 'SVG_DIR', Path(temporary)):
            for path in sorted(paths):
                original = cls.original[path]
                row = {'final_url': original['sourceUrl'], 'html_file': original['sourceHtml'],
                       'title': original['title'], 'archetype': original['archetype']}
                route, gaps = extract.parse_page(row)
                cls.regenerated[path] = route
                cls.gaps[path] = gaps + extract.schema_errors(route, cls.contract)
                cls.source[path] = extract.DOM((extract.ROOT / row['html_file']).read_text()).root

    def test_all_43_reviewed_missing_labels_have_source_and_visible_destinations(self):
        self.assertEqual(len(EXPECTED_ADDITIONAL_LINKS), 25)
        self.assertEqual(sum(map(len, EXPECTED_ADDITIONAL_LINKS.values())), 43)
        affected_sections = set()
        for path, expectations in EXPECTED_ADDITIONAL_LINKS.items():
            with self.subTest(path=path):
                original_anchors = [(anchor.text(), anchor.attrs.get('href', ''))
                                    for anchor in self.source[path].find('main').all('a')]
                visible = rendered_links(self.regenerated[path])
                expected_visible = []
                for label, source_href, demo_href in expectations:
                    self.assertIn((label, source_href), original_anchors,
                                  self.original[path]['sourceHtml'])
                    self.assertEqual(visible.count((label, demo_href)), 1)
                    expected_visible.append((label, demo_href))
                self.assertEqual([link for link in visible if link in expected_visible], expected_visible)
                self.assertFalse(any(gap['reason'] in {
                    'Component absent from native contract', 'Extracted native fields absent from template contract',
                    'Child fields absent from native template', 'Rendering parameter requires explicit support',
                } for gap in self.gaps[path]))
                source_expected = [(label, href) for label, href, _ in expectations]
                self.assertEqual([link for link in original_anchors if link in source_expected], source_expected)
                main = self.source[path].find('main')
                for anchor in main.all('a'):
                    if (anchor.text(), anchor.attrs.get('href', '')) in source_expected:
                        section = anchor
                        while section.parent is not main:
                            section = section.parent
                        affected_sections.add((path, main.children().index(section)))
        self.assertEqual(len(affected_sections), 32)

    def test_existing_components_cards_links_and_primary_links_keep_their_identity(self):
        for path in EXPECTED_ADDITIONAL_LINKS:
            regenerated = {component['uid']: component for component in self.regenerated[path]['components']}
            for original in self.original[path]['components']:
                if original['componentName'] == 'AllianzBreadcrumbs':
                    continue
                with self.subTest(path=path, uid=original['uid']):
                    current = regenerated[original['uid']]
                    self.assertEqual(current['dataSource'], original['dataSource'])
                    self.assertEqual(current['sourceKey'], original['sourceKey'])
                    old_fields = original['fields']['data']['datasource']
                    new_fields = current['fields']['data']['datasource']
                    if field_value(old_fields, 'primaryLink') and field_value(old_fields, 'primaryLink').get('href'):
                        self.assertEqual(new_fields['primaryLink']['jsonValue'], old_fields['primaryLink']['jsonValue'])
                    old_cards = old_fields.get('children', {}).get('results', [])
                    new_cards = new_fields.get('children', {}).get('results', [])
                    self.assertEqual([card['id'] for card in new_cards], [card['id'] for card in old_cards])
                    for old_card, new_card in zip(old_cards, new_cards):
                        if 'link' in old_card:
                            self.assertEqual(new_card['link']['jsonValue'], old_card['link']['jsonValue'])
                        new_links = {link['id']: link for link in new_card.get('links', {}).get('targetItems', [])}
                        for link in old_card.get('links', {}).get('targetItems', []):
                            current_link = new_links[link['id']]
                            self.assertEqual(current_link['title'], link['title'])
                            self.assertEqual(current_link['link']['jsonValue'], link['link']['jsonValue'])
                            self.assertEqual(current_link['children'], link['children'])

    def test_captured_team_links_preserve_full_order_including_first_container(self):
        route = self.regenerated['/about/ventures/team']
        for section, person, biography in [(2, 'Collin', "View Collin's bio"), (3, 'Ron', "View Ron's bio"),
                                            (4, 'Taylor', "View Taylor's bio"), (5, 'Clay', 'View Clay’s bio')]:
            grid = next(component for component in route['components'] if component['sourceKey'].endswith(f':section:{section}'))
            card = grid['fields']['data']['datasource']['children']['results'][0]
            self.assertEqual([field_value(link, 'title') for link in card['links']['targetItems']],
                             [biography, f'Connect with {person} on LinkedIn'])
            self.assertEqual(field_value(card, 'link')['text'], biography)
            self.assertEqual(field_value(card['links']['targetItems'][1], 'link')['href'], '#demo-unavailable')

    def test_new_footer_supplements_have_explicit_keys_and_captured_placement(self):
        for path, section in NEW_FOOTERS.items():
            key = path + f':section:{section}:section-link:0'
            supplement = next(component for component in self.regenerated[path]['components']
                              if component.get('nativeSupplementKey') == f'section:{section}:footer:0')
            self.assertEqual(supplement['componentName'], 'AllianzRichText')
            self.assertEqual(supplement['params']['layout'], 'plain')
            self.assertEqual(supplement['sourceKey'], key)
            self.assertEqual(supplement['provenance']['sourceSection'], section)
            self.assertEqual(supplement['provenance']['sourceBlock']['tag'], 'a')
            self.assertIn(field_value(supplement['fields']['data']['datasource'], 'primaryLink')['text'],
                          supplement['provenance']['sourceBlock']['textPreview'])
        self.assertFalse(any(component.get('nativeSupplementKey') for component in self.regenerated['/']['components']))
        home_identity = lambda route: [(component['uid'], component['dataSource']) for component in route['components']]
        self.assertEqual(len(home_identity(self.regenerated['/'])), 8)
        self.assertEqual(home_identity(self.regenerated['/']), home_identity(self.original['/']))

    def test_biography_subheadings_preserve_semantic_word_boundaries(self):
        for path, expected in BIO_SUBHEADINGS.items():
            component = next(component for component in self.regenerated[path]['components'] if component['sourceKey'].endswith(':section:0'))
            fields = component['fields']['data']['datasource']
            subheading = field_value(fields, 'subheading')
            self.assertEqual(re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', ' ', subheading)).strip(), expected)
            self.assertNotIn('StrategyAllianz', subheading)
            self.assertNotIn('MarketsAllianz', subheading)
            self.assertFalse(any(gap.get('section') == 0 for gap in self.gaps[path]))

    def test_twenty_stale_flags_are_resolved_by_supported_source_components(self):
        self.assertEqual(len(self.newsrooms) * 2 + len(MVA_SECTIONS), 20)
        for path in self.newsrooms:
            self.assertEqual(self.gaps[path], [])
            grid = next(component for component in self.regenerated[path]['components'] if component['params'].get('layout') == 'list')
            self.assertTrue(grid['fields']['data']['datasource']['children']['results'])
            self.assertIn('list', self.contract['parameters']['layout'])
        for path, section in MVA_SECTIONS.items():
            prefix = path + f':section:{section}'
            components = [component for component in self.regenerated[path]['components'] if component['sourceKey'].startswith(prefix + ':') or component['sourceKey'] == prefix]
            snapshots = [component for component in components if component['componentName'] == 'AllianzRateSnapshot']
            self.assertEqual(len(snapshots), 1)
            self.assertFalse(any(gap.get('section') == section for gap in self.gaps[path]))
            source_section = self.source[path].find('main').children()[section]
            self.assertEqual(extract.residual_editorial(source_section, components, self.original[path]['sourceUrl']), {})

    def test_real_missing_copy_interactive_and_asset_gaps_still_exist(self):
        path = '/what-we-offer/annuities/increasing-income-potential'
        omissions = [gap for gap in self.gaps[path] if gap.get('section') == 2]
        self.assertEqual(omissions[0]['missingWordCounts'], {'increases': 1, '2': 1})
        self.assertTrue(any('interactive archetype' in gap['reason'].lower() for gap in self.gaps[FIA + '222/rates']))
        for path in EXPECTED_ADDITIONAL_LINKS:
            original_issues = {issue['sourceUrl'] for issue in self.original[path].get('assetIssues', [])}
            current_issues = {issue['sourceUrl'] for issue in extract.find_asset_refs(self.regenerated[path]) if issue['status'] != 'available'}
            # Source-anchor-only document issues are also assembled by build();
            # the component extraction must retain every issue it already owned.
            original_component_issues = {issue['sourceUrl'] for issue in extract.find_asset_refs(self.original[path]) if issue['status'] != 'available'}
            self.assertTrue(original_component_issues <= current_issues)
            self.assertTrue(original_component_issues <= original_issues)


class BoundedSourceTests(unittest.TestCase):
    # Exact captured section fragment: html/569110081b5b9a7c.html, lines 1593–1596.
    MVA = '''<div id="seven-yr-slot" class="well seven-yr-slot">
        <h2><small class="blue">Current MVA reference rate: </small><span testid="currentMVARate">6.57</span> % <small>as of <span testid="currentMVARateEffectiveDate">9/29/2026</span></small></h2>
        <p>Uses the yield of the <span testid="CurrentMVARateIndexName">Bloomberg US Long Corporate Bond Index</span></p>
                    <p testid="HistoricalRatesLink"><a href="/SPA/MVARate/DisplayHistoricalRates?productGuid=5ff40038-9e8d-469f-b98f-1807146f174c">Historical MVA reference rates</a></p>
    </div>'''

    def snapshot(self, source):
        main = extract.DOM('<main><section>' + source + '</section></main>').root.find('main')
        components = extract.supplement_modern_components(main, [], extract.HOST, '/source-fragment')
        return main.children()[0], components

    def test_rate_fixed_phrase_credit_requires_matching_source_rate_date_and_heading(self):
        section, components = self.snapshot(self.MVA)
        self.assertEqual(extract.residual_editorial(section, components, extract.HOST), {})
        for name, value in [('asOf', ''), ('asOf', '9/28/2026'), ('rate', '9.99%'), ('heading', 'Different rate')]:
            changed = copy.deepcopy(components)
            changed[0]['fields']['data']['datasource'][name] = extract.field_value(value)
            missing = extract.residual_editorial(section, changed, extract.HOST)
            self.assertEqual((missing['as'], missing['of']), (1, 1))

    def test_rate_fixed_phrase_does_not_mask_unrelated_missing_copy(self):
        section, components = self.snapshot(self.MVA + '<p>as of</p>')
        self.assertEqual(extract.residual_editorial(section, components, extract.HOST), {'as': 1, 'of': 1})
        changed_source = self.MVA.replace('as of <span', '<span')
        section, components = self.snapshot(changed_source + '<p>as of</p>')
        self.assertEqual(extract.residual_editorial(section, components, extract.HOST), {'as': 1, 'of': 1})

    def test_mva_structural_flag_stays_when_captured_section_has_unmapped_copy(self):
        with tempfile.TemporaryDirectory() as temporary, patch.object(extract, 'ROOT', Path(temporary)):
            source = Path(temporary) / 'source.html'
            source.write_text('<main><section>' + self.MVA + '<div>Unmapped editorial sentence</div></section></main>')
            _, gaps = extract.parse_page({'final_url': extract.HOST + '/source-fragment', 'html_file': source.name})
            self.assertTrue(any(gap['reason'] == 'Unmapped native structural archetype' for gap in gaps))

    def test_nested_link_containers_visit_each_anchor_once_and_keep_old_ids(self):
        # Robustness variant of the captured footer vocabulary; captured page
        # tests above supply the source labels, destinations and ordering oracle.
        source = '<article><div class="m-card__footer"><a href="/first">First</a><div class="tileLink"><a href="/second">Second</a></div></div><div class="tileLink"><a href="/third">Third</a></div></article>'
        fields = extract.tile_fields(extract.DOM(source).root.find('article'), extract.HOST, '/nested-card')
        links = fields['links']['targetItems']
        self.assertEqual([field_value(link, 'title') for link in links], ['First', 'Second', 'Third'])
        self.assertEqual(len({link['id'] for link in links}), 3)
        self.assertEqual(links[1]['id'], extract.stable('/nested-card:link:0'))
        self.assertEqual(field_value(fields, 'link')['href'], '/second')

    def test_inline_emphasis_does_not_gain_false_word_boundaries(self):
        node = extract.DOM('<div class="tileSubHeading"><h5>Retire<strong>ment</strong> planning</h5></div>').root.find(css='tileSubHeading')
        self.assertEqual(extract.rich(node, extract.HOST), '<h5>Retire<strong>ment</strong> planning</h5>')


class SelectedMediaRegressions(unittest.TestCase):
    def test_manifest_order_does_not_retarget_the_verified_home_hero(self):
        # Two different captured byte variants exist for this exact source URL.
        # The current bundled selection is also the applied native Home pilot.
        public = extract.REPO / 'examples/allianz-life/public/allianz-assets'
        self.assertTrue((public / '1bc3618e2f7df6a2.jpg').is_file())
        self.assertTrue((public / '9ecc0a8daa28515d.jpg').is_file())
        with patch.dict(extract.ASSET_BY_PATH, clear=True):
            extract.load_assets()
            selected = extract.ASSET_BY_PATH['/-/media/feature/hero/allianz-life/hero-azl-mountains.jpg']
            self.assertEqual(selected['id'], '1bc3618e2f7df6a2')
            self.assertEqual(selected['sha256'], '0a795c33c59b0d7cb721ea0238882725123d9c6f5fa913c6f77400dd07cc9f2a')
            self.assertEqual(Path(selected['path']), public / '1bc3618e2f7df6a2.jpg')

    def test_recorded_selected_media_hash_mismatch_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            manifest = Path(directory) / 'selected.json'
            manifest.write_text(json.dumps({'assets': [{
                'status': 'available',
                'sourceUrl': 'https://www.allianzlife.com/-/media/Feature/Hero/Allianz-Life/hero-azl-mountains.jpg',
                'demoSrc': '/allianz-assets/1bc3618e2f7df6a2.jpg',
                'sha256': '0' * 64,
            }]}))
            with patch.object(extract, 'BUNDLED_SELECTION', manifest), patch.dict(extract.ASSET_BY_PATH, clear=True):
                with self.assertRaisesRegex(ValueError, 'recorded hash'):
                    extract.load_assets()


if __name__ == '__main__':
    unittest.main()
