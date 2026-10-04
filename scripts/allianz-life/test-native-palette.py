"""Offline palette evidence, malformed-input and regeneration regressions."""
from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


palette = load_module("allianz_palette_tests", "native-palette.py")
structure = load_module("allianz_structure_palette_tests", "generate-structure.py")
NON_MAIN_ITEMS_SHA256 = "f4c94b449922ff8257c1eef7a3670b3ee34285bda0facf758869cddce9ed7c24"


class NativePaletteTests(unittest.TestCase):
    def setUp(self):
        self.model = palette.load_model()

    def load_candidate(self, candidate):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "model.json"
            path.write_text(json.dumps(candidate))
            return palette.load_model(path)

    def test_missing_and_invalid_json_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "missing.json"
            with self.assertRaisesRegex(ValueError, "Missing or malformed"):
                palette.load_model(path)
            path.write_text("{ malformed")
            with self.assertRaisesRegex(ValueError, "Missing or malformed"):
                palette.load_model(path)

    def test_missing_projection_never_falls_back_to_old_main(self):
        with patch.object(structure.native_palette, "load_model", side_effect=ValueError("Missing projection")):
            with self.assertRaisesRegex(ValueError, "Missing projection"):
                structure.generate()

    def test_malformed_scope_identity_storage_and_capture_fail_closed(self):
        candidates = []
        candidate = copy.deepcopy(self.model); candidate["schemaVersion"] = None; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["fieldValueSha256"] = None; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["sectionInventory"][0] = None; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["deployable"] = True; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["items"].pop(); candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["items"][0]["ID"] = candidate["items"][1]["ID"]; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["items"][0]["Path"] += "/Moved"; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["items"][0]["UnversionedFields"] = candidate["items"][0]["SharedFields"]; candidate["items"][0]["SharedFields"] = []; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["items"][0]["SharedFields"][0]["Value"] = ""; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["items"][0]["SharedFields"][0]["Value"] = candidate["items"][0]["SharedFields"][0]["Value"].lower(); candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["sectionInventory"][0]["captureOrder"] = 1; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["rendererInventory"][0]["technicalComponentName"] = "ChangedCompanyProfile"; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["sitePaletteInventory"] = []; candidates.append(candidate)
        for candidate in candidates:
            with self.subTest(candidate=candidates.index(candidate)), self.assertRaises(ValueError):
                self.load_candidate(candidate)

    def test_captured_raw_main_order_keeps_unresolved_references(self):
        main = next(row for row in self.model["items"] if row["ID"] == palette.MAIN_ID)
        raw = main["SharedFields"][0]["Value"]
        self.assertEqual(raw.split("|")[:40], self.model["originalMainRawReferences"])
        ids = palette.reference_ids(raw)
        active = {row["componentId"] for row in self.model["sitePaletteInventory"]}
        self.assertEqual(len(ids), 67)
        self.assertEqual(len(set(ids) & active), 59)
        self.assertEqual(len(set(ids) - active), 8)
        candidate = copy.deepcopy(self.model)
        candidate_main = next(row for row in candidate["items"] if row["ID"] == palette.MAIN_ID)
        parts = raw.split("|"); parts[0], parts[1] = parts[1], parts[0]
        candidate_main["SharedFields"][0]["Value"] = "|".join(parts)
        with self.assertRaises(ValueError):
            self.load_candidate(candidate)

    def test_reversed_inventory_arrays_fail_ordered_capture_provenance(self):
        for key in ("rendererInventory", "sitePaletteInventory", "resolvedMainControls"):
            candidate = copy.deepcopy(self.model)
            candidate[key].reverse()
            with self.subTest(inventory=key), self.assertRaisesRegex(ValueError, "records/order differ from captured provenance"):
                self.load_candidate(candidate)

    def test_all_inventory_identity_guids_are_validated(self):
        fields = {
            "sectionInventory": ("itemId", "parentId", "templateId"),
            "rendererInventory": ("itemId", "templateId", "displayNameFieldId"),
            "sitePaletteInventory": ("componentId",),
            "resolvedMainControls": ("renderingId",),
        }
        for key, names in fields.items():
            for name in names:
                candidate = copy.deepcopy(self.model)
                candidate[key][0][name] = "malformed-guid"
                with self.subTest(inventory=key, field=name), self.assertRaisesRegex(ValueError, "Malformed inventory GUID"):
                    self.load_candidate(candidate)

    def test_invented_renderer_paths_templates_and_metadata_fail(self):
        mutations = [
            ("nativePath", "/sitecore/layout/Renderings/Invented/About Allianz Life", "native path/name"),
            ("nativePath", palette.RENDERING_ROOT + "/../About Allianz Life", "native path/name"),
            ("templateId", "00000000-0000-0000-0000-000000000001", "template or display-field identity"),
            ("displayNameFieldId", "00000000-0000-0000-0000-000000000001", "template or display-field identity"),
            ("nativeVersionObserved", "-1", "native renderer version"),
            ("inCurrentSitePalette", "yes", "inventory boolean"),
        ]
        for field, value, message in mutations:
            candidate = copy.deepcopy(self.model)
            candidate["rendererInventory"][0][field] = value
            with self.subTest(field=field, value=value), self.assertRaisesRegex(ValueError, message):
                self.load_candidate(candidate)
        candidate = copy.deepcopy(self.model)
        candidate["rendererInventory"][0]["nativeItemName"] = "Invented Rendering"
        candidate["rendererInventory"][0]["nativePath"] = palette.RENDERING_ROOT + "/Invented Rendering"
        candidate["sitePaletteInventory"] = [
            {**row, "knownProjectNativePath": palette.RENDERING_ROOT + "/Invented Rendering"} if row["componentId"] == palette.COMPANY_ID else row
            for row in candidate["sitePaletteInventory"]
        ]
        with self.assertRaisesRegex(ValueError, "records/order differ from captured provenance"):
            self.load_candidate(candidate)

    def test_nonprojected_section_storage_and_all_record_schemas_are_guarded(self):
        candidate = copy.deepcopy(self.model)
        section = next(row for row in candidate["sectionInventory"] if not row["includedInVerifiedDeltaProjection"])
        section["storage"] = "unversioned"
        with self.assertRaisesRegex(ValueError, "section storage/projection ownership"):
            self.load_candidate(candidate)
        candidate = copy.deepcopy(self.model)
        candidate["sectionInventory"][0]["captureOrder"] = False
        with self.assertRaisesRegex(ValueError, "section identity/order"):
            self.load_candidate(candidate)
        for key in ("sectionInventory", "rendererInventory", "sitePaletteInventory", "resolvedMainControls"):
            candidate = copy.deepcopy(self.model)
            candidate[key][0]["inventedMetadata"] = "not captured"
            with self.subTest(inventory=key), self.assertRaisesRegex(ValueError, "record schema"):
                self.load_candidate(candidate)

    def test_claimed_hash_or_source_metadata_cannot_reauthorize_changed_capture(self):
        candidate = copy.deepcopy(self.model)
        candidate["rendererInventory"].reverse()
        candidate["inventoryProvenance"]["arrays"]["rendererInventory"]["orderedSha256"] = palette.ordered_fingerprint(candidate["rendererInventory"])
        with self.assertRaisesRegex(ValueError, "provenance differs from the verified source capture"):
            self.load_candidate(candidate)
        candidates = []
        candidate = copy.deepcopy(self.model); candidate["sourceEvidence"]["sha256"] = "0" * 64; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["observedAtUtc"] = "2026-10-04T07:00:00+00:00"; candidates.append(candidate)
        candidate = copy.deepcopy(self.model); candidate["inventoryProvenance"]["arrays"]["sitePaletteInventory"]["sourceFileSha256"] = "0" * 64; candidates.append(candidate)
        for candidate in candidates:
            with self.assertRaisesRegex(ValueError, "provenance differs from the verified source capture"):
                self.load_candidate(candidate)

    def test_historical_generator_changes_exactly_main_field_and_no_identity(self):
        rows, module = structure.generate()
        other_rows = [row for row in rows if row["ID"] != palette.MAIN_ID]
        digest = hashlib.sha256(json.dumps(other_rows, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        self.assertEqual(digest, NON_MAIN_ITEMS_SHA256)
        self.assertEqual(len(rows), 491)
        self.assertEqual(len({row["ID"] for row in rows}), 491)
        actual = next(row for row in rows if row["ID"] == palette.MAIN_ID)
        expected = next(row for row in self.model["items"] if row["ID"] == palette.MAIN_ID)
        for key in ("ID", "Parent", "Template", "Path"):
            self.assertEqual(actual[key], expected[key])
        self.assertEqual(actual["UnversionedFields"], [])
        self.assertEqual(actual["VersionedFields"], [])
        self.assertEqual(actual["SharedFields"], [{"ID": structure.FIELD["PlaceholderKey"], "Hint": "Placeholder Key", "Value": "headless-main"}, expected["SharedFields"][0]])
        self.assertEqual(module["namespace"], "Project.AllianzLife.Structure")
        second, second_module = structure.generate()
        self.assertEqual(second, rows)
        self.assertEqual(second_module, module)

    def test_field_snapshots_round_trip_and_have_no_module(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            palette.write_snapshots(self.model, structure.serialize, root)
            first = {str(path.relative_to(root)): path.read_bytes() for path in root.rglob("*.yml")}
            palette.write_snapshots(palette.load_model(), structure.serialize, root)
            self.assertEqual(first, {str(path.relative_to(root)): path.read_bytes() for path in root.rglob("*.yml")})
            self.assertEqual(len(first), 9)
            self.assertEqual(list(root.rglob("*.module.json")), [])
            for row in self.model["items"]:
                text = (root / palette.snapshot_path(row)).read_text()
                fields = row["SharedFields"] or row["UnversionedFields"]
                # The native projection has exactly one single-line string per
                # item. Decode the independently JSON-quoted YAML scalar.
                values = [json.loads(line.split("Value: ", 1)[1]) for line in text.splitlines() if "Value: " in line]
                self.assertEqual(values, [field["Value"] for field in fields])
                for key in ("ID", "Parent", "Template", "Path"):
                    line = next(line for line in text.splitlines() if line.startswith(key + ": "))
                    self.assertEqual(json.loads(line.split(": ", 1)[1]), row[key])
                if row["ID"] == palette.COMPANY_ID:
                    self.assertIn("Languages:\n- Language: en\n  Fields:\n", text)
                    self.assertNotIn("SharedFields:", text)

    def test_incomplete_dependencies_are_listed_without_active_claims(self):
        rows, _ = structure.generate()
        report = palette.dependency_report(self.model, rows)
        self.assertFalse(report["deployable"])
        self.assertEqual(report["referenceTargetCount"], 79)
        self.assertEqual(report["missingHistoricalDefinitionCount"], 52)
        self.assertEqual(len(report["missingHistoricalDefinitions"]), 52)
        self.assertEqual(len(report["mainUnresolvedActiveReferenceIds"]), 8)
        self.assertTrue(all(not row["completeCurrentNativeSerializationVerified"] for row in report["referenceTargetsInCapturedOrder"]))
        self.assertNotIn("a184a054-a4c3-5298-8682-254d098f6cf4", {row["ID"] for row in self.model["items"]})

    def test_baseline_guard_rejects_missing_or_changed_existing_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaisesRegex(ValueError, "Missing baseline file"):
                palette.verify_source_baselines(self.model, root)
            path = root / "scripts/allianz-life/generate-structure.py"
            path.parent.mkdir(parents=True); path.write_text("changed")
            with self.assertRaisesRegex(ValueError, "Source baseline changed"):
                palette.verify_source_baselines(self.model, root)
        candidate = copy.deepcopy(self.model)
        candidate["historicalSourceBaseline"]["commit"] = "different"
        with self.assertRaisesRegex(ValueError, "unexpected exact source baselines"):
            palette.verify_source_baselines(candidate, Path("/tmp"))
        candidate["historicalSourceBaseline"] = None
        with self.assertRaisesRegex(ValueError, "unexpected exact source baselines"):
            palette.verify_source_baselines(candidate, Path("/tmp"))


if __name__ == "__main__":
    unittest.main()
