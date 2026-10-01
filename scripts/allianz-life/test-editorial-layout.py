"""Native layout identity and shared-patch regressions; no remote writes."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location("editorial_layout_prepare", Path(__file__).with_name("prepare-import.py"))
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


def component(text):
    return {"componentName": "AllianzRichText", "params": {"layout": "plain"}, "fields": {"data": {"datasource": {"heading": {"jsonValue": {"value": text}}}}}}


class EditorialLayoutTests(unittest.TestCase):
    def builder(self):
        return prepare.Builder({"routes": {}}, {"siteRoot": prepare.SITE_ROOT}, {"items": []}, [], [], [])

    def layout(self, components):
        builder = self.builder()
        xml = builder.layout(components, prepare.SITE_ROOT + "/Home/about", "https://www.allianzlife.com/about", "/about")
        return builder, ET.fromstring(xml)

    def test_recovered_footer_preserves_existing_native_datasource_and_rendering_identities(self):
        original = [component("First section"), component("Second section"), component("Third section")]
        before, before_xml = self.layout(original)
        footer = component("Recovered source footer")
        footer["nativeSupplementKey"] = "section:4:footer:0"
        after, after_xml = self.layout([original[0], footer, *original[1:]])
        for key, record in before.records.items():
            self.assertEqual(record, after.records[key])
        old_renderings = before_xml.findall("./d/r")
        new_renderings = after_xml.findall("./d/r")
        for old, new in zip(old_renderings, [new_renderings[0], *new_renderings[2:]]):
            for attr in ("uid", "{s}id", "{s}ds", "{s}ph", "{s}par"):
                self.assertEqual(old.get(attr), new.get(attr))
        self.assertEqual(new_renderings[1].get("uid"), new_renderings[2].get("{p}after").split("'")[1])
        self.assertEqual([], after.exceptions)
        self.assertEqual(4, len(after.records))

    def test_supplement_identity_depends_on_source_marker_not_list_position(self):
        footer = component("Recovered footer")
        footer["nativeSupplementKey"] = "section:7:footer:1"
        first, first_xml = self.layout([footer, component("Section")])
        second, second_xml = self.layout([component("Section"), footer])
        key = next(key for key in first.records if ":supplement:" in key)
        self.assertEqual(first.records[key], second.records[key])
        self.assertEqual(first_xml.find("./d/r").get("uid"), second_xml.findall("./d/r")[1].get("uid"))

    def test_invalid_supplement_cannot_escape_datasource_root_or_shift_existing_records(self):
        for marker in ("../outside", "section:4:footer:0/../../outside", "section:4:footer:"):
            with self.subTest(marker=marker):
                footer = component("Malformed supplement")
                footer["nativeSupplementKey"] = marker
                reference, _ = self.layout([component("Existing")])
                actual, xml = self.layout([footer, component("Existing")])
                self.assertEqual(reference.records, actual.records)
                self.assertEqual(1, len(xml.findall("./d/r")))
                self.assertEqual("invalid-native-supplement-identity", actual.exceptions[0]["reason"])

    def test_source_card_intro_fragment_preserves_existing_controls_and_child_identity(self):
        intro = {"componentName": "AllianzCardGrid", "nativeSupplementKey": "section:6:fragment:0", "params": {"columns": "1"}, "fields": {"data": {"datasource": {"children": {"results": [{"heading": {"jsonValue": {"value": "Investor profile"}}, "body": {"jsonValue": {"value": "<p>Source introduction</p>"}}}]}}}}}
        original = [component("First section"), component("Existing chart collection")]
        before, before_xml = self.layout(original)
        after, after_xml = self.layout([original[0], intro, original[1]])
        for key, record in before.records.items():
            self.assertEqual(record, after.records[key])
        for old, new in zip(before_xml.findall("./d/r"), [after_xml.findall("./d/r")[0], after_xml.findall("./d/r")[2]]):
            for attr in ("uid", "{s}id", "{s}ds", "{s}ph", "{s}par"):
                self.assertEqual(old.get(attr), new.get(attr))
        new_records = [record for key, record in after.records.items() if ":supplement:" in key]
        self.assertEqual(2, len(new_records))
        self.assertEqual(1, len({record["id"] for record in new_records if record["path"].endswith("/Entry 01")}))
        self.assertTrue(any(record["path"].endswith("AllianzCardGrid Section 06 Fragment 00") for record in new_records))
        moved, _ = self.layout([intro, *original])
        for record in new_records:
            self.assertEqual(record, moved.records[record["key"]])
        self.assertEqual([], after.exceptions)

    def test_footer_and_intro_markers_cannot_alias_or_enable_unapproved_components(self):
        footer = component("Source footer")
        footer["nativeSupplementKey"] = "section:6:footer:0"
        fragment = component("Source introduction")
        fragment["nativeSupplementKey"] = "section:6:fragment:0"
        actual, _ = self.layout([footer, fragment])
        self.assertEqual(2, len(actual.records))
        self.assertEqual(2, len({record["id"] for record in actual.records.values()}))
        self.assertEqual(2, len({record["path"] for record in actual.records.values()}))
        invalid = {"componentName": "AllianzHero", "nativeSupplementKey": "section:6:fragment:0", "params": {}, "fields": {"data": {"datasource": {}}}}
        actual, xml = self.layout([invalid])
        self.assertEqual({}, actual.records)
        self.assertEqual([], xml.findall("./d/r"))
        self.assertEqual("invalid-native-supplement-identity", actual.exceptions[0]["reason"])

    def test_duplicate_supplement_is_reported_without_overwriting_first_content(self):
        first = component("Original footer")
        first["nativeSupplementKey"] = "section:4:footer:0"
        duplicate = copy.deepcopy(first)
        duplicate["fields"]["data"]["datasource"]["heading"]["jsonValue"]["value"] = "Conflicting content"
        actual, xml = self.layout([first, duplicate])
        self.assertEqual(1, len(actual.records))
        self.assertEqual(1, len(xml.findall("./d/r")))
        self.assertEqual("invalid-native-supplement-identity", actual.exceptions[0]["reason"])

    def test_shared_partial_uses_native_patch_mode_and_preserves_authored_control(self):
        builder = self.builder()
        builder.presentation_bindings = json.loads((prepare.REPO.parent.parent / "model/presentation-bindings.json").read_text())
        renderer = builder.presentation_bindings["projectRenderings"]["header"]
        datasource = "2b43c4e2-7fe4-5607-a99e-937a9b42adef"
        root = ET.fromstring(builder.native_shell_layout("presentation:shell:modern:header", renderer, datasource, "headless-header"))
        self.assertEqual("1", root.get("{p}p"))
        device = root.find("d")
        self.assertEqual(prepare.brace(prepare.DEFAULT_DEVICE), device.get("id"))
        self.assertIsNone(device.get("l"), "native standard values retain the verified inherited layout")
        rendering = device.find("r")
        self.assertEqual("*", rendering.get("{p}before"))
        self.assertEqual(prepare.brace(renderer["id"]), rendering.get("{s}id"))
        self.assertEqual(prepare.brace(datasource), rendering.get("{s}ds"))
        self.assertEqual("headless-header", rendering.get("{s}ph"))
        self.assertEqual("DynamicPlaceholderId=1", rendering.get("{s}par"))


if __name__ == "__main__":
    unittest.main()
