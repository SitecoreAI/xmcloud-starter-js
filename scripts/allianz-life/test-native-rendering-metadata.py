"""Bounded metadata reconciliation checks; no native connection or writes."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location("metadata_structure", Path(__file__).with_name("generate-structure.py"))
structure = importlib.util.module_from_spec(spec)
spec.loader.exec_module(structure)
metadata = structure.native_metadata
_prepare_spec = importlib.util.spec_from_file_location("metadata_prepare_import", Path(__file__).with_name("prepare-import.py"))
prepare = importlib.util.module_from_spec(_prepare_spec)
_prepare_spec.loader.exec_module(prepare)

INACTIVE_IDS = {
    "c4fbfd1b-2fc0-5af5-85c1-babc12ff56da", "174739e5-3388-56d9-aae2-dff5ae409184",
    "b642c279-575f-576f-b2c4-761765954a99", "8f61ab55-3f41-577c-b53a-09fa61875e81",
    "abe2558a-1b20-5412-b72c-ed9008b0ba27", "afe940ac-70ed-526e-bfe0-a4c317a94c1d",
    "1488a5d6-eca0-5b80-b83c-c018e5d769d1", "8297f8f3-5aba-5bc1-bdad-b0ef2e6fbd8d",
}


class NativeRenderingMetadataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = metadata.load_model()
        cls.values, cls.module = structure.generate()
        cls.by_id = {row["ID"]: row for row in cls.values}

    def test_scope_is_exact_and_inactive_fields_are_not_invented(self):
        records = self.model["records"]
        self.assertEqual(len(records), 20)
        self.assertEqual(sum(row["nameEvidenceKind"] == "verified-same-ID-rename" for row in records), 19)
        self.assertEqual(sum("displayName" in row for row in records), 7)
        self.assertEqual(sum("icon" in row for row in records), 9)
        self.assertFalse(INACTIVE_IDS & {row["itemId"] for row in records})
        for item_id in INACTIVE_IDS:
            row = {"ID": item_id, "version": 0, "unknownField": None}
            self.assertIs(metadata.apply(row, self.model), row)
            self.assertEqual(row, {"ID": item_id, "version": 0, "unknownField": None})

    def test_paths_change_after_identity_generation_and_bindings_stay_technical(self):
        for record in self.model["records"]:
            row = self.by_id[record["itemId"]]
            self.assertEqual(structure.identifier(record["historicalPath"]), row["ID"])
            self.assertNotEqual(structure.identifier(record["currentPath"]), row["ID"])
            self.assertEqual(row["Path"], record["currentPath"])
            self.assertEqual(row["Parent"], record["parentId"])
            self.assertEqual(row["Template"], record["templateId"])
            self.assertNotIn("Allianz", row["Path"].rsplit("/", 1)[1])
            self.assertNotIn("Legacy", row["Path"].rsplit("/", 1)[1])
            fields = {field["Hint"]: field["Value"] for field in row["SharedFields"]}
            self.assertEqual(fields["componentName"], record["technicalComponentName"])
            self.assertIn("query " + record["technicalComponentName"] + "Query", fields["ComponentQuery"])

    def test_apply_is_idempotent_and_preserves_unowned_fields(self):
        row = copy.deepcopy(self.by_id[self.model["records"][0]["itemId"]])
        row["VersionedFields"].append({"ID": "unknown-native-field", "Hint": "Unowned", "Value": "deliberate blank and unknown preserved"})
        row["unexposedNativeValue"] = None
        snapshot = copy.deepcopy(row)
        self.assertEqual(metadata.apply(row, self.model), snapshot)
        self.assertEqual(row, snapshot)

    def test_wrong_identity_or_technical_binding_fails_closed(self):
        record = self.model["records"][0]
        for key in ("Parent", "Template", "Path"):
            row = copy.deepcopy(self.by_id[record["itemId"]])
            row[key] = "unverified"
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "source identity"):
                metadata.apply(row, self.model)
        row = copy.deepcopy(self.by_id[record["itemId"]])
        next(field for field in row["SharedFields"] if field["ID"] == metadata.COMPONENT_NAME_ID)["Value"] = "Accordion"
        with self.assertRaisesRegex(ValueError, "technical binding mismatch"):
            metadata.apply(row, self.model)

    def test_unobserved_values_and_wrong_storage_are_rejected(self):
        for record in self.model["records"]:
            for key, section, field_id in (("icon", "SharedFields", metadata.ICON_ID), ("displayName", "UnversionedFields", metadata.DISPLAY_NAME_ID)):
                if key not in record:
                    continue
                with self.subTest(item=record["itemId"], field=key):
                    row = copy.deepcopy(self.by_id[record["itemId"]])
                    field = next(field for field in row[section] if field["ID"] == field_id)
                    field["Value"] = "unreviewed"
                    with self.assertRaisesRegex(ValueError, "unreviewed source value"):
                        metadata.apply(row, self.model)
                    row[section].remove(field)
                    with self.assertRaisesRegex(ValueError, "one existing native metadata field"):
                        metadata.apply(row, self.model)
                    row[section].append(field)
                    row["VersionedFields"].append(copy.deepcopy(field))
                    with self.assertRaisesRegex(ValueError, "unverified storage"):
                        metadata.apply(row, self.model)

    def test_changed_or_missing_evidence_registry_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "model.json"
            with self.assertRaises(FileNotFoundError):
                metadata.load_model(path)
            for key, value in (("sourceCommit", "unreviewed"), ("records", [])):
                candidate = copy.deepcopy(self.model)
                candidate[key] = value
                path.write_text(json.dumps(candidate))
                with self.assertRaisesRegex(ValueError, "reviewed evidence capture"):
                    metadata.load_model(path)

    def test_historical_storage_is_rejected_without_deleting_or_renaming_it(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            record = self.model["records"][0]
            old = root / "allianz.renderings/Allianz Life" / (record["historicalPath"].rsplit("/", 1)[1] + ".yml")
            old.parent.mkdir(parents=True)
            old.write_text("preserve this source file")
            with self.assertRaisesRegex(ValueError, "reviewed same-ID file rename"):
                metadata.require_canonical_storage(root, self.model)
            self.assertEqual(old.read_text(), "preserve this source file")
            self.assertEqual(len(list(root.rglob("*.yml"))), 1)

    def builder(self):
        return prepare.Builder({"routes": {}}, {"siteRoot": prepare.SITE_ROOT}, {"items": []}, [], [], [])

    def test_import_layout_and_toolbox_use_technical_bindings_after_rename(self):
        builder = self.builder()
        for record in self.model["records"]:
            component = {"componentName": record["technicalComponentName"], "fields": {"data": {"datasource": {}}}, "params": {}}
            xml = ET.fromstring(builder.layout([component], prepare.SITE_ROOT + "/Home", "https://www.allianzlife.com/", "/"))
            self.assertEqual(xml.find("./d/r").get("{s}id"), prepare.brace(record["itemId"]))
        builder.inspect_native_authoring()
        self.assertEqual(set(builder.native_authoring["componentRenderingIds"]), set(builder.contract["components"]))
        for name, identifier in builder.native_authoring["componentRenderingIds"].items():
            self.assertEqual(identifier, builder.renderings_by_component[name]["ID"])

    def test_shell_accepts_only_exact_reviewed_historical_or_current_path_for_same_id(self):
        builder = self.builder()
        builder.presentation_bindings = {"inheritedLayout": {"defaultDeviceId": prepare.DEFAULT_DEVICE, "verified": True}}
        for record in self.model["records"]:
            for path in (record["historicalPath"], record["currentPath"]):
                xml = ET.fromstring(builder.native_shell_layout("synthetic-shell", {"id": record["itemId"], "path": path}, "00000000-0000-4000-8000-000000000001", "headless-header"))
                self.assertEqual(xml.find("./d/r").get("{s}id"), prepare.brace(record["itemId"]))
            for renderer in ({"id": record["itemId"], "path": record["currentPath"] + "-wrong"}, {"id": "00000000-0000-4000-8000-000000000002", "path": record["currentPath"]}):
                with self.assertRaisesRegex(ValueError, "differs from applied project structure"):
                    builder.native_shell_layout("synthetic-shell", renderer, "00000000-0000-4000-8000-000000000001", "headless-header")

    def test_headless_variant_names_remain_technical_and_ambiguous_bindings_fail(self):
        for record in self.model["records"]:
            row = self.by_id[record["itemId"]]
            self.assertEqual(prepare.rendering_component_name(row), record["technicalComponentName"])
            with self.assertRaisesRegex(ValueError, "Ambiguous"):
                prepare.rendering_indexes([row, copy.deepcopy(row)])
            other = copy.deepcopy(row)
            other["ID"] = "00000000-0000-4000-8000-000000000003"
            with self.assertRaisesRegex(ValueError, "Ambiguous"):
                prepare.rendering_indexes([row, other])
            for value in ("", None):
                invalid = copy.deepcopy(row)
                next(field for field in invalid["SharedFields"] if field["ID"] == prepare.COMPONENT_NAME_FIELD)["Value"] = value
                with self.assertRaisesRegex(ValueError, "nonempty shared technical"):
                    prepare.rendering_component_name(invalid)

    def test_regeneration_has_one_file_per_identity_and_no_stale_names(self):
        files = list((structure.OUTPUT / "items").rglob("*.yml"))
        self.assertEqual(len(files), 491)
        ids = [json.loads(next(line for line in path.read_text().splitlines() if line.startswith("ID: ")).split(": ", 1)[1]) for path in files]
        self.assertEqual(len(set(ids)), 491)
        metadata.require_canonical_storage(structure.OUTPUT / "items", self.model)
        for record in self.model["records"]:
            path = structure.OUTPUT / "items/allianz.renderings/Allianz Life" / (record["currentPath"].rsplit("/", 1)[1] + ".yml")
            self.assertIn('ID: "' + record["itemId"] + '"', path.read_text())


if __name__ == "__main__":
    unittest.main()
