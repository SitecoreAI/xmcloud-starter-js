"""Offline query bounds do not replace tenant Preview/Delivery validation."""
import importlib.util
import json
from pathlib import Path
import re
import unittest

spec = importlib.util.spec_from_file_location('allianz_structure', Path(__file__).with_name('generate-structure.py'))
structure = importlib.util.module_from_spec(spec)
spec.loader.exec_module(structure)


class QueryContractTests(unittest.TestCase):
    def test_every_children_selection_is_explicitly_bounded(self):
        for name, definition in structure.COMPONENTS.items():
            query = structure.component_query(name, definition)
            self.assertNotRegex(query, r'children\s*\{')
            self.assertNotIn('1000', query)
            self.assertEqual(query.count('{'), query.count('}'))
            if 'children(' in query:
                self.assertIn('total pageInfo { hasNext endCursor }', query)

    def test_source_component_collections_fit_bounds(self):
        data = json.loads((structure.REPO / 'examples/allianz-life/content/native-content.json').read_text())
        for page in data['routes'].values():
            for component in page['components']:
                count = len(component['fields']['data']['datasource'].get('children', {}).get('results', []))
                if count:
                    self.assertGreaterEqual(structure.CHILD_LIMITS[component['componentName']], count)

    def test_header_depth_is_bounded_and_flat_card_links_stay_flat(self):
        header = structure.component_query('AllianzHeader', structure.COMPONENTS['AllianzHeader'])
        self.assertIn('children(first: 16)', header)
        card = structure.component_query('AllianzCardGrid', structure.COMPONENTS['AllianzCardGrid'])
        self.assertIn('children(first: 40)', card)
        self.assertNotIn('children(first: 6)', card)
        self.assertIn('fieldCollection: fields { name jsonValue }', card)
        self.assertNotIn('children(first: 1)', card)
        self.assertNotIn('... on MultilistField', card)

    def test_card_collection_keeps_all_source_fields_in_the_existing_schema(self):
        fields = structure.CHILDREN[structure.COMPONENTS['AllianzCardGrid']['children']]
        self.assertEqual(set(fields), {'heading', 'subheading', 'body', 'image', 'icon',
            'iconTheme', 'link', 'theme', 'headingLevel', 'alphanumeral', 'links'})
        query = structure.component_query('AllianzCardGrid', structure.COMPONENTS['AllianzCardGrid'])
        for name in structure.COMPONENTS['AllianzCardGrid']['fields']:
            self.assertIn(name + ': field(name: "' + name + '") { jsonValue }', query)

    def test_list_layout_is_registered(self):
        self.assertIn('list', structure.PARAMETERS['layout'])

    def test_legacy_home_link_is_a_genuine_editable_field(self):
        self.assertEqual(structure.COMPONENTS['AllianzLegacyHeader']['fields']['link'], 'General Link')
        self.assertIn('link: field(name: "link") { jsonValue }', structure.component_query('AllianzLegacyHeader', structure.COMPONENTS['AllianzLegacyHeader']))

    def test_project_page_preserves_verified_native_scaffold_lineage(self):
        values, _ = structure.generate()
        base = next(row for row in values if row['Path'] == structure.TEMPLATES_ROOT + '/Pages/AllianzPage')
        inheritance = next(field['Value'] for field in base['SharedFields'] if field['Hint'] == '__Base template')
        self.assertEqual(inheritance, structure.brace(structure.PLATFORM['NativeAllianzScaffoldPage']))


if __name__ == '__main__':
    unittest.main()
