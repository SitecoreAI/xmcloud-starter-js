"""Offline native composition tests; synthetic fixtures never become readback.

Run without arguments for portable safety tests. Set ALLIANZ_COMPOSE_EVIDENCE to
the private discovery directory to additionally exercise real captured evidence.
No network, authoring writes, credentials or application packages are used.
"""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from urllib.parse import quote

spec = importlib.util.spec_from_file_location("prepare_compose_test", Path(__file__).with_name("prepare-import.py"))
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)
native, editorial = prepare.composition_modules()


def identifier(number):
    return f"00000000-0000-4000-8000-{number:012d}"


def row(number, path, fields=None, parent=1, template=2):
    fields = fields or {}
    raw = {"ID": identifier(number), "Parent": identifier(parent), "Template": identifier(template), "Path": path, "SharedFields": [{"ID": key, "Hint": key, "Value": value} for key, value in fields.items()]}
    return {"id": raw["ID"], "parentId": raw["Parent"], "templateId": raw["Template"], "path": path, "rawSCS": raw, "fieldStorage": [{"id": key, "hint": key, "value": value, "storage": "shared", "language": None, "version": None} for key, value in fields.items()]}


def synthetic_audit_capture():
    """Only a fictional local fixture; no capture/success provenance claims."""
    mnp = "/sitecore/content/industry-verticals/mnp"
    site = "/sitecore/content/allianz/allianz-life"
    mapping = quote("{" + identifier(2).upper() + "}=" + quote("{" + identifier(4).upper() + "}", safe=""), safe="")
    rows = [row(3, mnp + "/Home"), row(4, mnp + "/Presentation/Page Designs/Default", {"0966b999-0d0e-4278-acc9-9da69d461fe6": prepare.brace(identifier(5)) + "|" + prepare.brace(identifier(6))}), row(7, mnp + "/Presentation/Page Designs", {"ba1f60d6-3deb-40cc-bb61-eec772279ee1": mapping})]
    for number, name in ((5, "Header"), (6, "Footer")):
        r = row(number, mnp + "/Presentation/Partial Designs/" + name, {"55faae90-3bba-4f7f-96fe-13c3f40055ff": name.lower(), "f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e": '<r xmlns:s="s"><d id="{' + prepare.DEFAULT_DEVICE.upper() + '}"><r uid="{' + identifier(70).upper() + '}" s:ph="headless-' + name.lower() + '" /></d></r>'})
        r["templateId"] = r["rawSCS"]["Template"] = "fd2059fd-6043-4dfe-8c04-e2437ce87634"
        rows.append(r)
    roots = ["/sitecore/system/Settings/Foundation/Experience Accelerator/Editing/DatasourceBehaviour", "/sitecore/system/Settings/Foundation/Experience Accelerator/Local Datasources/Enums/Data Source Selection Behavior"]
    for number, path, value in ((8, roots[0], "AutoNameStoreUnderPage"), (10, roots[1], "DoNotCopy")):
        rows.append(row(number, path))
        rows.append(row(number + 1, path + "/" + value, {"f917c951-1f75-4d62-b14a-bc6888d7eeca": value}, parent=number))
    rows.extend([row(12, site + "/Home"), row(13, site + "/Presentation/Placeholder Settings/Partial Design")])
    return {"snapshot": {"target": {"siteRoot": site}, "items": rows}, "manifestSha256": "fictional-local-test-only", "snapshotSha256": "fictional-local-test-only", "verifiedFileCount": 0, "requestedReadScopes": [{"path": site + "/Presentation", "scope": "ItemAndDescendants"}]}


class PortableCompositionTests(unittest.TestCase):
    def test_managed_host_deployment_does_not_replay_native_modules(self):
        build = json.loads((prepare.REPO / "xmcloud.build.json").read_text())
        # Keeping the explicit property is essential: omission packages every
        # sitecore.json module as IAR during authoring deployment.
        self.assertEqual({"modules": []}, build["deployItems"])
        host = build["renderingHosts"]["allianz-life"]
        self.assertTrue(host["enabled"])
        self.assertEqual("./examples/allianz-life", host["path"])
        self.assertEqual("sxa", host["type"])
        self.assertEqual("npm", host["packageManager"])
        self.assertEqual(("build", "next:start"), (host["buildCommand"], host["runCommand"]))

    def test_blueprint_discloses_exact_logical_and_native_wire_values(self):
        field_id = identifier(91)
        class BlueprintSchema:
            def field(self, template, identifier):
                return {"type": "Rich Text", "storage": "versioned"}
        storage = editorial.empty_storage()
        storage["enVersions"]["1"][field_id] = '<p>Original "quoted" content</p>'
        item = {"Template": identifier(92), "storage": storage}
        contract = prepare.blueprint_wire_contract(item, editorial, BlueprintSchema())
        value = contract["fieldContracts"][0]
        self.assertEqual(storage["enVersions"]["1"][field_id], value["sourceLogicalValue"])
        self.assertEqual(storage["enVersions"]["1"][field_id] + "\n", value["expectedSerializedWireValue"])
        self.assertEqual("enVersions", value["storageBucket"])
        self.assertEqual("1", value["version"])
        self.assertEqual(prepare.planner.checksum(editorial.wire_storage(storage)), contract["expectedSerializedWireStorageSha256"])
        self.assertFalse(contract["actualNativeReadbackVerified"])
        self.assertFalse(contract["typedJsonValueVerified"])
        self.assertEqual('<p>Original "quoted" content</p>', item["storage"]["enVersions"]["1"][field_id])

    def test_mapping_is_double_encoded_and_selected_in_header_footer_order(self):
        audit = prepare.audit_native_composition(synthetic_audit_capture())
        self.assertEqual(identifier(4), audit["mnp"]["mappingDecoded"][identifier(2)])
        self.assertEqual([identifier(5), identifier(6)], audit["mnp"]["defaultPageDesign"]["partialIds"])
        self.assertFalse(audit["nativeCreationSideEffectsProven"])

    def test_raw_layout_deltas_are_not_marked_effective(self):
        audit = prepare.audit_native_composition(synthetic_audit_capture())
        for partial in audit["mnp"]["partials"]:
            self.assertFalse(partial["layouts"][0]["effectiveMergedLayout"])

    def test_enum_values_are_literal_values_and_unknown_mnp_scope_is_preserved(self):
        audit = prepare.audit_native_composition(synthetic_audit_capture())
        self.assertEqual("AutoNameStoreUnderPage", audit["datasourceEnums"]["nonReusableDatasourceBehaviour"][0]["value"])
        self.assertEqual("DoNotCopy", audit["datasourceEnums"]["globalDatasourceSelectionBehaviour"][0]["value"])
        self.assertFalse(audit["mnp"]["generatedPartialPlaceholderSubtreeCaptured"])
        self.assertFalse(audit["allianz"]["siteEditingItemPresent"])

    def test_unproved_allianz_subtree_absence_is_rejected(self):
        capture = synthetic_audit_capture(); capture["requestedReadScopes"] = []
        with self.assertRaisesRegex(ValueError, "full-subtree"):
            prepare.audit_native_composition(capture)

    def test_mapping_mismatch_is_rejected(self):
        capture = synthetic_audit_capture()
        capture["snapshot"]["items"][0]["templateId"] = identifier(90)
        with self.assertRaisesRegex(ValueError, "mapped Default"):
            prepare.audit_native_composition(capture)

    def test_partial_order_change_is_rejected(self):
        capture = synthetic_audit_capture()
        capture["snapshot"]["items"][1]["rawSCS"]["SharedFields"][0]["Value"] = prepare.brace(identifier(6)) + "|" + prepare.brace(identifier(5))
        with self.assertRaisesRegex(ValueError, "partial order"):
            prepare.audit_native_composition(capture)

    def test_existing_generated_placeholder_is_preserved_as_observed(self):
        capture = synthetic_audit_capture(); site = capture["snapshot"]["target"]["siteRoot"]
        capture["snapshot"]["items"].append(row(99, site + "/Presentation/Placeholder Settings/Partial Design/Existing native child", parent=13))
        audit = prepare.audit_native_composition(capture)
        self.assertEqual(identifier(99), audit["allianz"]["capturedGeneratedPlaceholderChildren"][0]["id"])

    def test_private_output_cannot_enter_repository(self):
        with self.assertRaisesRegex(ValueError, "outside the repository"):
            prepare.write_native_home_composition(prepare.REPO / "compose-test-output", {}, {}, None)

    def test_manifest_traversal_and_duplicates_are_rejected(self):
        for paths in (("../escape.json",), ("dummy.json", "dummy.json")):
            with self.subTest(paths=paths), tempfile.TemporaryDirectory() as directory:
                root = Path(directory); (root / "dummy.json").write_text("{}")
                digest = hashlib.sha256(b"{}").hexdigest()
                manifest = {"target": {"projectId": native.PROJECT_ID, "environmentId": native.ENVIRONMENT_ID, "siteRoot": "/sitecore/content/allianz/allianz-life"}, "remoteWrites": 0, "credentialsExported": False, "files": [{"path": p, "bytes": 2, "sha256": digest} for p in paths]}
                (root / "capture-manifest.json").write_text(json.dumps(manifest))
                with self.assertRaisesRegex(ValueError, "Unsafe or duplicate"):
                    prepare.verify_bootstrap_capture(root)

    def test_capture_wrong_target_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "capture-manifest.json").write_text(json.dumps({"target": {"projectId": "wrong"}}))
            with self.assertRaisesRegex(ValueError, "another native target"):
                prepare.verify_bootstrap_capture(root)


@unittest.skipUnless(os.environ.get("ALLIANZ_COMPOSE_EVIDENCE"), "Set ALLIANZ_COMPOSE_EVIDENCE for private actual-readback integration checks")
class ActualReadbackCompositionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.discovery = Path(os.environ["ALLIANZ_COMPOSE_EVIDENCE"])
        cls.private = cls.discovery / "model/native-bound-private"
        cls.capture_root = cls.discovery / "native-bootstrap-capture/allianz-native-bootstrap"
        cls.capture = prepare.verify_bootstrap_capture(cls.capture_root)
        cls.scaffold = json.loads((cls.private / "native-scaffold-snapshot.json").read_text())
        cls.manifest = json.loads((cls.private / "import-candidates-bound.json").read_text())
        cls.schema = editorial.Schema.from_files(cls.discovery / "model/schema-reference-root/target-schema.json", prepare.REPO / "authoring/allianz-life/structure-manifest.json", cls.scaffold)
        cls.plan = prepare.build_native_home_composition(cls.manifest, cls.scaffold, cls.schema, cls.capture)

    def test_full_capture_per_file_integrity_and_actual_mnp_mapping(self):
        self.assertEqual(139, self.capture["verifiedFileCount"])
        audit = prepare.audit_native_composition(self.capture)
        self.assertEqual("609a2d66-e81c-4b92-976e-8e05bd9f3d31", audit["mnp"]["defaultPageDesign"]["id"])
        self.assertEqual(8, len(audit["mnp"]["capturedNestedPlaceholders"]))

    def test_minimal_exact_native_shell_and_no_fictional_writes(self):
        plan = self.plan
        self.assertEqual(127, len(plan["createBlueprints"]))
        self.assertEqual(3, plan["summary"]["nativeShellCreates"])
        self.assertEqual([], plan["minimalShell"]["generatedPlaceholderWrites"])
        self.assertEqual([], plan["minimalShell"]["settingsWrites"])
        self.assertFalse(plan["applyReady"]); self.assertFalse(plan["executable"])
        self.assertFalse(any("/Global" in r["path"] for r in plan["createBlueprints"]))

    def test_linked_routes_stay_outside_scope_and_all_media_is_explicit(self):
        self.assertEqual(52, len(self.plan["linkedPagesOutsideWriteScope"]))
        self.assertEqual(19, len(self.plan["requiredMediaReadbacks"]))
        self.assertFalse(any(r["key"].startswith("page:") for r in self.plan["createBlueprints"]))

    def test_home_baseline_retains_ten_fields_and_adopts_only_absent_fields(self):
        baseline = self.plan["homeBaseline"]
        self.assertEqual("ba1d1e48-5d3b-47ac-913b-ac4e1a39e6a8", baseline["id"])
        self.assertEqual(10, baseline["retainedStoredFieldCount"])
        self.assertEqual(12, len(baseline["newManagedFields"]))
        self.assertTrue(all(f["before"] == {"stored": False} for f in baseline["newManagedFields"]))
        self.assertFalse(baseline["baselineEstablished"])
        self.assertFalse(baseline["atomicRevisionCompareAndSwapAvailable"])

    def test_richtext_requires_exact_two_creates_and_fenced_toolbox_merge(self):
        prerequisites = self.plan["authoringPrerequisites"]
        self.assertEqual(11, len(prerequisites["desiredFullBootstrapItems"]))
        self.assertEqual(2, len(prerequisites["nextDeltaAfterPriorBootstrapReadback"]["createItems"]))
        self.assertTrue(prerequisites["nextDeltaAfterPriorBootstrapReadback"]["toolboxMerge"]["requiresFreshNativeRevisionAndRawHash"])
        self.assertFalse(prerequisites["nextDeltaAfterPriorBootstrapReadback"]["toolboxMerge"]["observedPostPriorStage"])

    def test_changed_home_between_captures_is_rejected(self):
        capture = copy.deepcopy(self.capture)
        home = next(r for r in capture["snapshot"]["items"] if r["path"].endswith("allianz-life/Home"))
        home["sourceSha256"] = "changed"
        with self.assertRaisesRegex(ValueError, "Home changed"):
            prepare.build_native_home_composition(self.manifest, self.scaffold, self.schema, capture)

    def test_desired_scs_roundtrips_and_all_parents_and_local_references_resolve(self):
        ids = {r["id"] for r in self.plan["createBlueprints"]}
        ids.update(r["id"] for r in self.scaffold["items"])
        paths = {r["path"].casefold() for r in self.plan["createBlueprints"]}
        for operation in self.plan["createBlueprints"]:
            parsed = native.parse_scs(editorial.serialize_item(operation["native"], self.schema))
            self.assertEqual(operation["id"], parsed["ID"])
            self.assertIn(operation["parentId"], ids)
            for path in operation["localDatasourcePaths"]:
                self.assertIn(path.casefold(), paths)


if __name__ == "__main__":
    unittest.main()
