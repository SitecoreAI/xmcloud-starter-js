"""Offline spacing regression; source and node identities remain intact."""
import importlib.util
from pathlib import Path
import sys
import unittest

spec = importlib.util.spec_from_file_location('allianz_extract', Path(__file__).with_name('extract_public_content.py'))
extract = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = extract
spec.loader.exec_module(extract)


class RowSpacingTests(unittest.TestCase):
    def test_title_and_accordion_rows_do_not_share_spacing(self):
        dom = extract.DOM('''<section class="t-bg-transparent"><div class="l-grid">
          <div class="l-grid__row u-padding-top-lg u-margin-bottom-lg"><article class="intro"><h2>Title</h2></article></div>
          <div class="l-grid__row u-padding-bottom-xl"><div class="l-grid"><div class="l-grid__row justify-content-center"><div class="c-accordion"></div></div></div></div>
        </div></section>''').root
        section = dom.find('section')
        intro = extract.component_row_params(section, section.find(css='intro'))
        accordion = extract.component_row_params(section, section.find(css='c-accordion'))
        self.assertEqual((intro['paddingTop'], intro['paddingBottom'], intro['marginBottom']), ('lg', 'none', 'lg'))
        self.assertEqual((accordion['paddingTop'], accordion['paddingBottom'], accordion['marginBottom']), ('none', 'xl', 'none'))
        self.assertEqual(accordion['spacing'], 'none')

    def test_no_row_does_not_invent_padding(self):
        section = extract.DOM('<section class="t-bg-blue-soft"><div class="c-accordion"></div></section>').root.find('section')
        value = extract.component_row_params(section, section.find(css='c-accordion'))
        self.assertEqual(value['theme'], 'blue-soft')
        self.assertEqual([value[k] for k in ('paddingTop', 'paddingBottom', 'marginBottom', 'spacing')], ['none'] * 4)


if __name__ == '__main__':
    unittest.main()
