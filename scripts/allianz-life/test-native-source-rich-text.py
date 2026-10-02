"""Source-only XHTML regressions; no native content or service writes."""
import importlib.util
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location("source_rich_text", Path(__file__).with_name("prepare-import.py"))
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class NativeSourceRichTextTests(unittest.TestCase):
    def test_disclosure_style_links_keep_copy_markers_titles_and_formatting(self):
        source = ('<p>Allianz disclosure&nbsp;copy.</p>\r\n'
                  '<p><a href="#demo-unavailable" data-demo-disabled="true" title="This service is unavailable">FINRA</a> '
                  '<a data-demo-disabled=\'true\' href="#demo-unavailable" title="Phone">Phone</a> '
                  '<a title="ETF" href="#demo-unavailable"\r\n data-demo-disabled="true">ETF</a></p>')
        expected = source.replace(' data-demo-disabled="true"', '').replace(" data-demo-disabled='true'", '').replace('\r\n data-demo-disabled="true"', '')
        output = prepare.native_source_rich_text(source)
        self.assertEqual(expected, output)
        self.assertEqual(3, output.count('href="#demo-unavailable"'))
        self.assertEqual(prepare.native_source_rich_text(output), output)
        fragment = ET.fromstring('<div>' + output.replace('&nbsp;', '&#160;') + '</div>')
        self.assertEqual(['FINRA', 'Phone', 'ETF'], [a.text for a in fragment.iter('a')])

    def test_unknown_content_and_attributes_are_untouched(self):
        sources = [
            '<p data-demo-disabled="true">Keep this</p>',
            '<a href="/example#demo-unavailable" data-demo-disabled="true">Keep</a>',
            '<a href="#service-unavailable" data-demo-disabled="true">Keep</a>',
            '<a href="#demo-unavailable" data-demo-disabled="false">Keep</a>',
            '<a href="#demo-unavailable" data-demo-disabled="TRUE">Keep</a>',
            '<a href="#demo-unavailable" data-demo-disabled="true" data-demo-disabled="true">Keep</a>',
            '<a href="#demo-unavailable" href="/real" data-demo-disabled="true">Keep</a>',
            '<a data-demo-disabled="true">Keep</a>',
            '<p>Literal data-demo-disabled="true" copy</p>',
            '<a href="#demo-unavailable" title="Literal data-demo-disabled=\'true\' copy">Keep</a>',
            '<a href="&#35;demo-unavailable" data-demo-disabled="true">Keep</a>',
            '<a href="#demo-unavailable" data-demo-disabled="tr&#117;e">Keep</a>',
        ]
        for source in sources:
            with self.subTest(source=source):
                self.assertEqual(source, prepare.native_source_rich_text(source))

    def test_quoted_greater_than_and_unrelated_data_attributes_preserved(self):
        source = '<A title="5 > 3" href="#demo-unavailable" data-other="keep" DATA-DEMO-DISABLED="true">Copy</A>'
        self.assertEqual(source.replace(' DATA-DEMO-DISABLED="true"', ''), prepare.native_source_rich_text(source))

    def test_encoder_uses_source_boundary_after_executable_content_guard(self):
        builder = prepare.Builder.__new__(prepare.Builder)
        builder.exceptions = []
        source = '<p><a href="#demo-unavailable" data-demo-disabled="true">FINRA</a></p>'
        output = builder.encode_field('Rich Text', {'jsonValue': {'value': source}}, 'https://www.allianzlife.com/', 'source-key', 'body')
        self.assertEqual(source.replace(' data-demo-disabled="true"', ''), output)
        self.assertEqual([], builder.exceptions)
        self.assertEqual('', builder.encode_field('Rich Text', '<script>unsafe</script>', 'https://www.allianzlife.com/', 'source-key', 'body'))
        self.assertEqual('unsafe-or-composite-rich-text', builder.exceptions[-1]['reason'])


if __name__ == '__main__':
    unittest.main()
