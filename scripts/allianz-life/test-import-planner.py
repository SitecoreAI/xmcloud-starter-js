"""Meaningful import safety checks, using a fictional local snapshot only."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("import_planner", Path(__file__).with_name("import-planner.py"))
planner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(planner)


class ImportSafetyTests(unittest.TestCase):
    def setUp(self):
        self.target = {"projectId": "00000000-0000-4000-8000-000000000001", "environmentId": "00000000-0000-4000-8000-000000000002", "siteId": "00000000-0000-4000-8000-000000000003", "siteRoot": "/sitecore/content/Allianz/allianz-life", "mediaRoot": "/sitecore/media library/Project/Allianz Life"}
        self.record = {"key": "page:/what-we-offer/annuities:hero", "path": self.target["siteRoot"] + "/Home/what-we-offer/annuities/Data/Hero", "templateId": "00000000-0000-4000-8000-000000000004", "sourceUrl": "https://www.allianzlife.com/what-we-offer/annuities", "access": "public", "fields": {"title": "Annuities"}}
        self.identifier = planner.item_id(self.record["key"])
        self.manifest = {"target": self.target, "language": "en", "items": [self.record]}
        self.snapshot = {"target": self.target, "items": []}

    def existing(self, title="Old imported title"):
        self.snapshot["items"] = [{"id": self.identifier, "path": self.record["path"], "templateId": self.record["templateId"], "fields": {"title": title, "authorOnly": "Keep me"}, "revision": "revision-1"}]
        return {"target": self.target, "items": {self.identifier: {"fields": {"title": "Old imported title"}}}}

    def test_create_and_repeat_are_idempotent(self):
        first = planner.plan(self.manifest, self.snapshot)
        self.assertEqual(["create"], [op["action"] for op in first["operations"]])
        ledger = self.existing("Annuities")
        self.assertEqual([], planner.plan(self.manifest, self.snapshot, ledger)["operations"])

    def test_author_edit_blocks_all_item_fields(self):
        ledger = self.existing("Author-approved copy")
        result = planner.plan(self.manifest, self.snapshot, ledger)
        self.assertEqual([], result["operations"])
        self.assertEqual(["title"], result["conflicts"][0]["fields"])

    def test_safe_update_carries_revision_and_preserves_unowned_fields(self):
        ledger = self.existing()
        result = planner.plan(self.manifest, self.snapshot, ledger)
        self.assertEqual({"title": "Annuities"}, result["operations"][0]["fields"])
        self.assertEqual({"revision": "revision-1"}, result["operations"][0]["precondition"])
        self.assertNotIn("authorOnly", result["operations"][0]["fields"])

    def test_removed_source_is_orphan_report_without_delete(self):
        ledger = self.existing()
        self.manifest["items"] = []
        result = planner.plan(self.manifest, self.snapshot, ledger)
        self.assertEqual([], result["operations"])
        self.assertEqual([self.identifier], result["reportedOrphanIds"])

    def test_wrong_environment_is_rejected(self):
        self.snapshot = copy.deepcopy(self.snapshot)
        self.snapshot["target"]["environmentId"] = "00000000-0000-4000-8000-000000000099"
        with self.assertRaises(ValueError):
            planner.plan(self.manifest, self.snapshot)

    def test_external_source_and_security_fields_are_rejected(self):
        self.record["sourceUrl"] = "https://www.example.com/page"
        with self.assertRaises(ValueError):
            planner.plan(self.manifest, self.snapshot)
        self.record["sourceUrl"] = "https://www.allianzlife.com/page"
        self.record["fields"]["__Security"] = "not allowed"
        with self.assertRaises(ValueError):
            planner.plan(self.manifest, self.snapshot)

    def test_path_collision_is_conflict(self):
        self.snapshot["items"] = [{"id": "00000000-0000-4000-8000-000000000005", "path": self.record["path"]}]
        self.assertEqual("path-identity-collision", planner.plan(self.manifest, self.snapshot)["conflicts"][0]["reason"])

    def test_incomplete_manifest_is_preview_only(self):
        self.manifest["readyForImport"] = False
        with self.assertRaises(ValueError):
            planner.plan(self.manifest, self.snapshot)
        self.assertFalse(planner.plan(self.manifest, self.snapshot, allow_incomplete_preview=True)["applyReady"])

    def test_native_binding_requires_independent_snapshot_and_keeps_identity(self):
        native_id = "00000000-0000-4000-8000-000000000077"
        self.manifest["bindings"] = {self.record["key"]: native_id}
        with self.assertRaises(ValueError):
            planner.plan(self.manifest, self.snapshot)
        self.snapshot["bindings"] = dict(self.manifest["bindings"])
        with self.assertRaises(ValueError):
            planner.plan(self.manifest, self.snapshot)
        self.record["id"] = native_id
        self.snapshot["items"] = [{"id": native_id, "path": self.record["path"], "templateId": self.record["templateId"], "fields": {"title": "Annuities"}, "revision": "native-revision-1"}]
        result = planner.plan(self.manifest, self.snapshot)
        self.assertEqual([], result["operations"])
        self.assertEqual([native_id], result["unchangedIds"])


if __name__ == "__main__":
    unittest.main()
