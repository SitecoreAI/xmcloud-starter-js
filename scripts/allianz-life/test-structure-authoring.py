"""Offline rendering metadata regressions; native Pages acceptance is separate."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location(
    'allianz_structure_authoring', Path(__file__).with_name('generate-structure.py')
)
structure = importlib.util.module_from_spec(spec)
spec.loader.exec_module(structure)

DISPLAY_NAME_ID = 'b5e02ad9-d56f-4c41-a065-a133db87bdeb'
ICON_ID = '06d5295c-ed2f-4a54-9bf2-26228d113318'
THUMBNAIL_ID = 'c7c26117-dbb1-42b2-ab5e-f7223845cca3'

# Pins all 28 rendering IDs, parents, templates, paths, datasource/parameter
# contracts and storage. The one reviewed query change is CardGrid's complete
# first:40 field collection, accepted by native Preview. Field-value/editing
# browser acceptance is a separate gate. Further contract changes need review.
REVIEWED_RENDERING_CONTRACT_SHA256 = (
    'c9267d443d4a5cd88ab9e4cf4063e8d07f0c618fb3e7af7c8eba2f724f777f09'
)

# Only these exact native paths were verified in schema-reference-root/items.
VERIFIED_NATIVE_ICONS = {
    'Office/32x32/layout.png',
    'Office/32x32/photo_landscape.png',
    'Applications/32x32/text_rich_colored.png',
    'Imaging/32x32/grid.png',
    'Office/32x32/barrel.png',
    'Office/32x32/link.png',
    'Office/32x32/floppy_disks.png',
    'Office/32x32/signpost.png',
    'Applications/16x16/form_blue.png',
    'Office/32x32/magnifying_glass.png',
    'Office/32x32/document_text.png',
    'Office/32x32/movie.png',
    'Office/32x32/calendar_clock.png',
    'Business/16x16/line-chart.png',
    'Business/16x16/index_view.png',
    'Office/32x32/tools.png',
    'Business/32x32/table_edit.png',
}


class RenderingAuthoringTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.values, _ = structure.generate()
        cls.renderings = [
            row for row in cls.values
            if row['Template'] == structure.PLATFORM['JsonRendering']
        ]

    def test_all_renderings_have_english_version_one_and_unversioned_display_name(self):
        self.assertEqual(structure.FIELD['DisplayName'], DISPLAY_NAME_ID)
        self.assertEqual(len(self.renderings), 28)
        for row in self.renderings:
            name = row['Path'].rsplit('/', 1)[-1]
            with self.subTest(component=name):
                self.assertEqual(row['UnversionedFields'], [{
                    'ID': DISPLAY_NAME_ID,
                    'Hint': '__Display name',
                    'Value': structure.RENDERING_AUTHORING[name]['displayName'],
                }])
                self.assertEqual(row['VersionedFields'], [])
                self.assertNotIn(DISPLAY_NAME_ID, {
                    field['ID'] for field in row['SharedFields']
                })
                shared_yaml, marker, language_yaml = structure.serialize(row).partition(
                    '\nLanguages:\n'
                )
                self.assertTrue(marker)
                self.assertTrue(language_yaml.startswith('- Language: en\n  Fields:\n'))
                language_fields, versions_marker, versions = language_yaml.partition(
                    '  Versions:\n'
                )
                self.assertTrue(versions_marker)
                self.assertIn('  - ID: "' + DISPLAY_NAME_ID + '"\n', language_fields)
                self.assertNotIn(DISPLAY_NAME_ID, shared_yaml)
                self.assertEqual(versions, '  - Version: 1\n')

    def test_reviewed_non_authoring_rendering_contract_is_pinned(self):
        original = copy.deepcopy(self.renderings)
        for row in original:
            row['SharedFields'] = [
                field for field in row['SharedFields'] if field['ID'] != ICON_ID
            ]
            row['UnversionedFields'] = [
                field for field in row['UnversionedFields']
                if field['ID'] != DISPLAY_NAME_ID
            ]
        payload = json.dumps(original, sort_keys=True, separators=(',', ':')).encode()
        self.assertEqual(
            hashlib.sha256(payload).hexdigest(), REVIEWED_RENDERING_CONTRACT_SHA256
        )
        self.assertEqual(len(self.values), 491)

    def test_icons_use_shared_storage_and_captured_native_paths(self):
        self.assertEqual(structure.FIELD['Icon'], ICON_ID)
        for row in self.renderings:
            with self.subTest(path=row['Path']):
                icons = [field for field in row['SharedFields'] if field['ID'] == ICON_ID]
                self.assertEqual(len(icons), 1)
                self.assertEqual(icons[0]['Hint'], '__Icon')
                self.assertIn(icons[0]['Value'], VERIFIED_NATIVE_ICONS)
                language_fields = row['UnversionedFields'] + row['VersionedFields']
                self.assertNotIn(ICON_ID, {field['ID'] for field in language_fields})
                self.assertNotIn(THUMBNAIL_ID, {
                    field['ID'] for field in row['SharedFields'] + language_fields
                })

    def test_catalog_covers_every_renderer_with_clear_names_and_logical_groups(self):
        catalog = structure.RENDERING_AUTHORING
        self.assertEqual(set(catalog), set(structure.COMPONENTS))
        self.assertEqual(len({row['displayName'] for row in catalog.values()}), 28)
        expected_groups = {
            'Page content', 'Navigation', 'Product content', 'Forms and tools',
            'Media', 'Legacy content',
        }
        self.assertEqual({row['group'] for row in catalog.values()}, expected_groups)
        for name, row in catalog.items():
            with self.subTest(component=name):
                self.assertNotIn('Allianz', row['displayName'])
                self.assertTrue(row['displayName'].strip())
                self.assertEqual(name.startswith('AllianzLegacy'), row['group'] == 'Legacy content')
                self.assertIn(row['icon'], VERIFIED_NATIVE_ICONS)
                self.assertNotIn('thumbnail', row)
        self.assertEqual(catalog['AllianzCTA']['displayName'], 'Call to Action')
        self.assertEqual(catalog['AllianzRichText']['displayName'], 'Rich Text')
        self.assertEqual(catalog['AllianzLegacyPageHeader']['displayName'], 'Legacy Page Header')


if __name__ == '__main__':
    unittest.main()
