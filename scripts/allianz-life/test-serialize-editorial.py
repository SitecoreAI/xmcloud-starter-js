"""Offline synthetic native-editorial regressions; never invoke a cloud CLI.

These fixtures describe fictional items only. Local file tests use temporary
/tmp paths and mock the public-checkout output gate. No credentials are read.
"""
import copy
from datetime import datetime, timedelta, timezone
import importlib.util
import json
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from unittest.mock import patch

sys.dont_write_bytecode = True


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


editorial = load("editorial_test_subject", "serialize-editorial.py")
fixtures = load("explicitly_synthetic_native_fixtures", "test-native-snapshot.py")
native = editorial.snapshot_parser
fid = fixtures.fictional_id


def field_item(identifier, name, kind, *, shared=False, unversioned=False):
    return {"ID": identifier, "Parent": fid("common-section"), "Template": editorial.FIELD, "Path": "/sitecore/templates/Project/Synthetic/Common/Content/" + name, "SharedFields": [{"ID": editorial.TYPE, "Value": kind}, {"ID": editorial.SHARED, "Value": "1" if shared else ""}, {"ID": editorial.UNVERSIONED, "Value": "1" if unversioned else ""}]}


def schema_fixture():
    common = {"ID": fid("common-template"), "Parent": fid("templates"), "Template": editorial.TEMPLATE, "Path": "/sitecore/templates/Project/Synthetic/Common", "SharedFields": []}
    section = {"ID": fid("common-section"), "Parent": common["ID"], "Template": editorial.SECTION, "Path": common["Path"] + "/Content", "SharedFields": []}
    rows = [common, section]
    for name in ("home-template", "folder-template", "alternate-home-template", "site-definition-template"):
        rows.append({"ID": fid(name), "Parent": fid("templates"), "Template": editorial.TEMPLATE, "Path": "/sitecore/templates/Project/Synthetic/" + name, "SharedFields": [{"ID": editorial.BASE, "Value": fid("common-template")}]})
    rows.extend([field_item(fid("title-field"), "title", "Single-Line Text"), field_item(fid("author-field"), "authorCopy", "Rich Text"), field_item(fid("shared-field"), "sharedTitle", "Single-Line Text", shared=True), field_item(fid("unversioned-field"), "displayTitle", "Single-Line Text", unversioned=True), field_item(fid("image-field"), "image", "Image"), field_item(fid("link-field"), "link", "General Link"), field_item(fid("items-field"), "items", "Treelist"), field_item(editorial.FINAL_LAYOUT, "__Final Renderings", "Layout"), field_item(editorial.REVISION, "__Revision", "Single-Line Text")])
    return editorial.Schema(rows)


def change_item(snapshot, identifier, *, fields=None, template=None, parent=None, version=None, revision=None, other=None):
    """Explicitly simulate new fictional SCS evidence, not a real tenant edit."""
    result = copy.deepcopy(snapshot)
    index = next(i for i, item in enumerate(result["items"]) if item["id"] == identifier)
    row = native.parse_scs(result["items"][index]["rawScs"])
    if template:
        row["Template"] = template
    if parent:
        row["Parent"] = parent
    en = next(language for language in row["Languages"] if language["Language"] == "en")
    if fields is not None:
        en["Versions"][0]["Fields"] = [{"ID": key, "Value": value} for key, value in fields.items()]
    if version:
        en["Versions"][0]["Version"] = version
    if revision:
        en["Versions"][0].setdefault("Fields", []).append({"ID": editorial.REVISION, "Value": revision})
    if other is not None:
        row["Languages"] = [en] + other
    raw = fixtures.scs(row)
    result["items"][index] = native.normalize_item(native.parse_scs(raw), raw)
    return result


class EditorialTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="offline-editorial-test-", dir="/tmp")
        self.root = Path(self.directory.name)
        self.snapshot, _, _ = fixtures.fixture(self.root)
        self.snapshot["capturedAt"] = editorial.now()
        self.schema = schema_fixture()
        def record(key, path, template, fields):
            return {"key": key, "id": editorial.planner.item_id(key), "path": native.SITE_ROOT + path, "templateId": template, "sourceUrl": "https://www.allianzlife.com/", "kind": "editorial", "access": "public", "language": "en", "fields": fields}
        self.manifest = {"target": copy.deepcopy(self.snapshot["target"]), "language": "en", "bindings": {"page:/": fid("home")}, "items": [record("page:/", "/Home", fid("home-template"), {}), record("page:/:data", "/Home/Data", fid("folder-template"), {}), record("page:/:body", "/Home/Data/Synthetic Body", fid("home-template"), {fid("title-field"): "Synthetic public heading"})], "exceptions": []}
        self.manifest["items"][0]["id"] = fid("home")

    def tearDown(self):
        self.directory.cleanup()

    def plan(self, manifest=None, snapshot=None, ledger=None):
        return editorial.build_plan(manifest or self.manifest, snapshot or self.snapshot, self.schema, ["/"], ledger)

    def post_for(self, plan):
        post = copy.deepcopy(self.snapshot)
        for operation in plan["operations"]:
            row = copy.deepcopy(operation["native"])
            row["storage"]["enVersions"][str(operation["selectedVersion"])][editorial.REVISION] = fid(operation["id"] + ":result-revision")
            raw = editorial.serialize_item(row, self.schema)
            post["items"].append(native.normalize_item(native.parse_scs(raw), raw))
        post["items"].sort(key=lambda row: row["path"])
        post["capturedAt"] = editorial.now()
        return post

    def receipt_for(self, plan):
        return {"target": plan["target"], "planSha256": plan["planSha256"], "operationIds": [operation["id"] for operation in plan["operations"]], "status": "native-readback-pulled-awaiting-verification", "writeCompletedAt": "2026-09-29T00:00:00Z", "readbackCompletedAt": "2026-09-29T00:00:01Z"}

    def write_batch(self, plan=None):
        output = self.root / "batch"
        with patch.object(editorial, "private_output", side_effect=lambda path: Path(path).resolve()):
            written = editorial.write_plan(plan or self.plan(), self.schema, output)
        return output, written

    def verify_batch(self, output):
        with patch.object(editorial, "private_output", side_effect=lambda path: Path(path).resolve()):
            return editorial.verified_batch(output)

    def test_local_create_plan_preserves_home_identity(self):
        plan = self.plan()
        self.assertEqual(2, len(plan["operations"]))
        self.assertEqual([fid("home")], plan["unchangedIds"])
        self.assertTrue(plan["createApplyReady"])
        self.assertFalse(plan["nativeExecutionEnabled"])
        self.assertEqual(0, plan["remoteWrites"])
        self.assertTrue(all(operation["action"] == "create" for operation in plan["operations"]))

    def test_missing_or_invalid_site_uuid_fails_closed(self):
        for value in (None, "not-a-guid", fid("wrong-site")):
            manifest = copy.deepcopy(self.manifest)
            manifest["target"]["siteId"] = value
            with self.assertRaises(ValueError):
                self.plan(manifest=manifest)

    def test_bind_native_injects_only_actual_site_home_identity(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["target"]["siteId"] = None
        manifest["bindings"] = {}
        manifest["items"][0]["id"] = editorial.planner.item_id("page:/")
        bound = editorial.bind_native_scaffold(manifest, self.snapshot)
        self.assertEqual(fid("site"), bound["target"]["siteId"])
        self.assertEqual(fid("home"), bound["items"][0]["id"])
        self.assertEqual(fid("home-template"), bound["items"][0]["templateId"])
        self.assertFalse(bound["nativeBindingEvidence"]["fieldAdoption"])
        self.assertIsNone(manifest["target"]["siteId"])

    def test_binding_requires_independent_home_key_and_rejects_other_targets(self):
        snapshot = copy.deepcopy(self.snapshot)
        snapshot["bindings"] = {}
        with self.assertRaisesRegex(ValueError, "explicitly bind"):
            editorial.bind_native_scaffold(self.manifest, snapshot)
        manifest = copy.deepcopy(self.manifest)
        manifest["target"]["environmentId"] = "other-environment"
        with self.assertRaises(ValueError):
            editorial.bind_native_scaffold(manifest, self.snapshot)

    def test_home_template_migration_is_reported_without_replacement(self):
        root = self.root / "alternate"
        root.mkdir()
        snapshot, _, _ = fixtures.fixture(root, home_template=fid("alternate-home-template"))
        plan = self.plan(snapshot=snapshot)
        self.assertEqual("native-home-template-migration-required", plan["conflicts"][0]["reason"])
        self.assertFalse(plan["createApplyReady"])
        self.assertNotIn(fid("home"), [operation["id"] for operation in plan["operations"]])
        self.assertEqual(fid("alternate-home-template"), snapshot["scaffold"]["home"]["templateId"])

    def test_unadopted_home_fields_are_conflicts(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][0]["fields"] = {fid("title-field"): "New imported title"}
        plan = self.plan(manifest=manifest)
        self.assertEqual("author-edit-or-unadopted-field", plan["conflicts"][0]["reason"])
        self.assertFalse(plan["createApplyReady"])

    def test_revision_checked_safe_update_preserves_unowned_languages_versions(self):
        revision = fid("before-revision")
        snapshot = change_item(self.snapshot, fid("home"), fields={fid("title-field"): "Old import", fid("author-field"): "Keep authored text", editorial.REVISION: revision}, other=[{"Language": "fr", "Fields": [{"ID": fid("unversioned-field"), "Value": "bonjour"}], "Versions": []}])
        home = next(row for row in snapshot["items"] if row["id"] == fid("home"))
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][0]["fields"] = {fid("title-field"): "New import"}
        ledger = {"target": manifest["target"], "items": {fid("home"): {"fields": {fid("title-field"): "Old import"}}}}
        plan = self.plan(manifest, snapshot, ledger)
        operation = next(row for row in plan["operations"] if row["id"] == fid("home"))
        self.assertEqual("update", operation["action"])
        self.assertEqual(revision, operation["precondition"]["revision"])
        self.assertEqual("Keep authored text", operation["native"]["storage"]["enVersions"]["1"][fid("author-field")])
        self.assertEqual(home["languages"]["fr"], operation["native"]["storage"]["otherLanguages"]["fr"])
        self.assertFalse(plan["createApplyReady"])
        text = editorial.serialize_item(operation["native"], self.schema)
        parsed = native.normalize_item(native.parse_scs(text))
        self.assertEqual({}, parsed["languages"]["fr"]["versions"])

    def test_author_edit_blocks_entire_home_update(self):
        snapshot = change_item(self.snapshot, fid("home"), fields={fid("title-field"): "Author edited", editorial.REVISION: fid("edit-revision")})
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][0]["fields"] = {fid("title-field"): "New import", fid("author-field"): "Another change"}
        ledger = {"target": manifest["target"], "items": {fid("home"): {"fields": {fid("title-field"): "Old import", fid("author-field"): "Old body"}}}}
        plan = self.plan(manifest, snapshot, ledger)
        self.assertNotIn(fid("home"), [operation["id"] for operation in plan["operations"]])
        self.assertEqual("author-edit-or-unadopted-field", plan["conflicts"][0]["reason"])

    def test_missing_revision_blocks_update(self):
        snapshot = change_item(self.snapshot, fid("home"), fields={fid("title-field"): "Old import"})
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][0]["fields"] = {fid("title-field"): "New import"}
        ledger = {"target": manifest["target"], "items": {fid("home"): {"fields": {fid("title-field"): "Old import"}}}}
        self.assertEqual("missing-revision-precondition", self.plan(manifest, snapshot, ledger)["conflicts"][0]["reason"])

    def test_create_absence_requires_complete_scope(self):
        snapshot = copy.deepcopy(self.snapshot)
        snapshot["completeScopes"] = {"exactPaths": [item["path"] for item in snapshot["items"]], "subtrees": []}
        with self.assertRaisesRegex(ValueError, "prove create path absence"):
            self.plan(snapshot=snapshot)

    def test_exact_isolated_modules_and_restrictive_file_permissions(self):
        output, plan = self.write_batch()
        verified, module = self.verify_batch(output)
        self.assertEqual(plan, verified)
        self.assertEqual("items", module["items"]["path"])
        self.assertEqual(len(plan["operations"]), len(module["items"]["includes"]))
        self.assertTrue(all(include["scope"] == "SingleItem" and include["allowedPushOperations"] == "CreateOnly" for include in module["items"]["includes"]))
        for path in output.rglob("*"):
            if path.is_file():
                self.assertEqual(0o600, stat.S_IMODE(path.stat().st_mode))

    def test_existing_batch_is_not_overwritten(self):
        output, _ = self.write_batch()
        with patch.object(editorial, "private_output", return_value=output):
            with self.assertRaisesRegex(ValueError, "already exists"):
                editorial.write_plan(self.plan(), self.schema, output)

    def test_plan_hash_covers_file_and_module_hash_metadata(self):
        output, plan = self.write_batch()
        plan["fileSha256"][next(iter(plan["fileSha256"]))] = "0" * 64
        (output / "plan.json").write_text(json.dumps(plan))
        with self.assertRaisesRegex(ValueError, "plan changed"):
            self.verify_batch(output)

    def test_unreviewed_extra_files_and_broad_modules_are_rejected(self):
        output, _ = self.write_batch()
        extra = output / "items" / "extra.yml"
        extra.write_text("unreviewed")
        with self.assertRaisesRegex(ValueError, "extra native"):
            self.verify_batch(output)
        extra.unlink()
        module_path = output / (editorial.NAMESPACE + ".module.json")
        module = json.loads(module_path.read_text())
        module["items"]["includes"][0]["scope"] = "ItemAndDescendants"
        module_path.write_text(json.dumps(module))
        with self.assertRaisesRegex(ValueError, "module changed"):
            self.verify_batch(output)

    def test_live_preconditions_cover_scaffold_and_unchanged_dependencies(self):
        plan = self.plan()
        editorial.check_fresh(plan, self.snapshot)
        changed = change_item(self.snapshot, fid("home"), fields={editorial.REVISION: fid("later-revision")})
        with self.assertRaisesRegex(ValueError, "dependency changed"):
            editorial.check_fresh(plan, changed)
        changed = copy.deepcopy(self.snapshot)
        changed["scaffold"]["home"]["id"] = fid("wrong-home")
        with self.assertRaises(ValueError):
            editorial.check_fresh(plan, changed)

    def test_stale_and_future_captures_are_rejected(self):
        plan = self.plan()
        for delta in (-121, 20):
            snapshot = copy.deepcopy(self.snapshot)
            snapshot["capturedAt"] = (datetime.now(timezone.utc) + timedelta(seconds=delta)).isoformat()
            with self.assertRaisesRegex(ValueError, "stale or future"):
                editorial.check_fresh(plan, snapshot)

    def test_native_execution_is_disabled_before_any_subprocess(self):
        with patch.object(editorial.subprocess, "run", side_effect=AssertionError("No external process is permitted")) as run:
            with self.assertRaisesRegex(ValueError, "execution is disabled"):
                editorial.apply_creates(self.root / "unprepared", {}, {})
            run.assert_not_called()

    def test_successful_readback_is_required_before_ledger_ownership(self):
        plan = self.plan()
        post = self.post_for(plan)
        receipt = self.receipt_for(plan)
        ledger = editorial.finalize_ledger(plan, post, receipt)
        self.assertEqual("native-readback-verified", ledger["status"])
        self.assertEqual(2, len(ledger["items"]))
        self.assertNotIn(fid("home"), ledger["items"])
        receipt["status"] = "write-started-unverified"
        with self.assertRaises(ValueError):
            editorial.finalize_ledger(plan, post, receipt)

    def test_readback_wrong_value_version_parent_and_time_are_rejected(self):
        plan = self.plan()
        post = self.post_for(plan)
        operation = next(row for row in plan["operations"] if row["fields"])
        changes = [change_item(post, operation["id"], fields={fid("title-field"): "Wrong", editorial.REVISION: fid("wrong-result")}), change_item(post, operation["id"], version=2), change_item(post, operation["id"], parent=fid("wrong-parent"))]
        stale = copy.deepcopy(post)
        stale["capturedAt"] = "2026-09-28T00:00:00Z"
        changes.append(stale)
        for changed in changes:
            with self.assertRaises(ValueError):
                editorial.finalize_ledger(plan, changed, self.receipt_for(plan))

    def test_repeat_after_verified_readback_is_idempotent(self):
        plan = self.plan()
        post = self.post_for(plan)
        ledger = editorial.finalize_ledger(plan, post, self.receipt_for(plan))
        repeated = self.plan(snapshot=post, ledger=ledger)
        self.assertEqual([], repeated["operations"])
        self.assertEqual([], repeated["conflicts"])
        self.assertFalse(repeated["createApplyReady"])

    def test_unselected_prior_items_are_not_reported_as_orphans(self):
        ledger = {"target": self.manifest["target"], "items": {fid("previous-other-route"): {"fields": {}}}}
        plan = self.plan(ledger=ledger)
        self.assertEqual([], plan["reportedOrphanIds"])
        self.assertEqual([fid("previous-other-route")], plan["priorItemsOutsideSelectedScope"])

    def test_sensitive_and_ambiguous_fields_are_not_writable(self):
        self.schema.fields[fid("title-field")]["hint"] = "API key"
        with self.assertRaisesRegex(ValueError, "credentials"):
            self.plan()
        self.schema.fields[fid("title-field")]["hint"] = "title"
        self.schema.fields[fid("title-field")]["storage"] = "ambiguous"
        with self.assertRaisesRegex(ValueError, "storage is ambiguous"):
            self.plan()

    def test_unresolved_and_external_links_are_rejected(self):
        for value in ('<link linktype="external" url="https://invalid.example/" />', '<link linktype="internal" id="{' + fid("missing-reference") + '}" />'):
            manifest = copy.deepcopy(self.manifest)
            manifest["items"][-1]["fields"][fid("link-field")] = value
            with self.assertRaises(ValueError):
                self.plan(manifest=manifest)

    def test_xml_executable_content_and_wrong_layout_renderer_are_rejected(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][-1]["fields"][fid("author-field")] = '<p onclick="danger()">text</p>'
        with self.assertRaisesRegex(ValueError, "executable"):
            self.plan(manifest=manifest)
        manifest["items"][-1]["fields"] = {editorial.FINAL_LAYOUT: '<r xmlns:s="s"><d id="{' + editorial.DEFAULT_DEVICE + '}"><r s:id="{' + fid("unverified-renderer") + '}" /></d></r>'}
        with self.assertRaisesRegex(ValueError, "rendering escapes"):
            self.plan(manifest=manifest)

    def test_template_field_standard_values_is_not_a_field_definition(self):
        rows = list(self.schema.items.values())
        rows.append({"ID": fid("field-standard-values"), "Parent": editorial.FIELD, "Template": editorial.FIELD, "Path": "/sitecore/templates/System/Templates/Template field/__Standard Values", "SharedFields": []})
        result = editorial.Schema(rows)
        self.assertNotIn(fid("field-standard-values"), result.fields)

    def test_private_output_rejects_public_and_symlink_destinations(self):
        with self.assertRaises(ValueError):
            editorial.private_output(self.root / "public", repo=self.root)
        directory = self.root / ".sitecore/allianz-editorial"
        directory.mkdir(parents=True)
        link = directory / "link"
        link.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symbolic"):
            editorial.private_output(link / "batch", repo=self.root)


class NativePresentationCandidateTests(unittest.TestCase):
    """Synthetic content composed with read-only observed template bindings."""
    @classmethod
    def setUpClass(cls):
        cls.prepare = load("prepare_native_presentation_tests", "prepare-import.py")
        discovery = editorial.REPO.parents[1]
        cls.registry = json.loads((discovery / "model/presentation-bindings.json").read_text())
        cls.schema_index = json.loads((discovery / "model/schema-reference-root/target-schema.json").read_text())
        cls.schema = editorial.Schema.from_files(discovery / "model/schema-reference-root/target-schema.json", editorial.REPO / "authoring/allianz-life/structure-manifest.json")
        # The current project pages inherit the independently read-back native
        # scaffold Page. Load its captured generated schema without changing or
        # treating the synthetic content below as native execution evidence.
        capture_root = discovery / 'native-scaffold-capture/allianz-native-scaffold/items/native.allianz.generated.templates'
        generated = [native.read_scs(path) for path in capture_root.rglob('*.yml')]
        cls.schema = editorial.Schema(list(cls.schema.items.values()) + generated)

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="offline-shell-test-", dir="/tmp")
        self.root = Path(self.directory.name)
        registry = self.registry
        extra = [fixtures.document(fid("partial-library"), native.SITE_ROOT + "/Presentation/Partial Designs", fid("presentation"), registry["nativeTemplates"]["partialDesignsLibrary"]["id"].lower()), fixtures.document(fid("page-library"), native.SITE_ROOT + "/Presentation/Page Designs", fid("presentation"), registry["nativeTemplates"]["pageDesignsLibrary"]["id"].lower())]
        self.snapshot, _, _ = fixtures.fixture(self.root, extra=extra)
        self.snapshot["bindings"].update({"presentation:partial-designs-library": fid("partial-library"), "presentation:page-designs-library": fid("page-library")})
        self.content = {"routes": {"/": {"sourceUrl": "https://www.allianzlife.com/", "title": "Explicit synthetic offline page", "archetype": "Home", "components": [], "shellFamily": "modern"}}, "shared": {"header": {"componentName": "AllianzHeader", "fields": {"data": {"datasource": {}}}}, "footer": {"componentName": "AllianzFooter", "fields": {"data": {"datasource": {}}}}}}
        self.target = {"projectId": native.PROJECT_ID, "environmentId": native.ENVIRONMENT_ID, "siteId": None}

    def tearDown(self):
        self.directory.cleanup()

    def build(self, *, registry=None, snapshot=None, content=None):
        return self.prepare.Builder(content or self.content, self.target, self.schema_index, [], [], [], registry or self.registry, snapshot or self.snapshot).build()

    def test_native_shell_reuses_actual_libraries_and_references_real_composition(self):
        report = self.build()
        records = {row["key"]: row for row in report["items"]}
        self.assertEqual(fid("home"), records["page:/"]["id"])
        self.assertEqual(fid("partial-library"), records["presentation:partial-designs-library"]["id"])
        self.assertEqual(fid("page-library"), records["presentation:page-designs-library"]["id"])
        layout_field = self.registry["inheritedLayout"]["sharedRenderingsFieldId"].lower()
        signature_field = self.registry["nativeFields"]["signature"]["id"].lower()
        ids = []
        for label in ("header", "footer"):
            partial = records["presentation:shell:modern:" + label]
            ids.append(partial["id"])
            self.assertEqual("shared", partial["fieldStorage"][layout_field])
            self.assertEqual("shared", partial["fieldStorage"][signature_field])
            layout = ET.fromstring(partial["fields"][layout_field])
            device = layout.find("d")
            rendering = device.find("r")
            self.assertEqual(self.prepare.brace(self.registry["inheritedLayout"]["layoutId"]), device.get("l"))
            self.assertEqual(self.prepare.brace(self.registry["projectRenderings"][label]["id"]), rendering.get("{s}id"))
            self.assertEqual(self.prepare.brace(records["shared:modern:" + label]["id"]), rendering.get("{s}ds"))
            self.assertEqual("headless-" + label, rendering.get("{s}ph"))
        design = records["presentation:page-design:modern"]
        partials_field = self.registry["nativeFields"]["partialDesigns"]["id"].lower()
        self.assertEqual("|".join(self.prepare.brace(value) for value in ids), design["fields"][partials_field])
        page_field = self.registry["nativeFields"]["pageDesignAssignment"]["id"].lower()
        self.assertEqual(self.prepare.brace(design["id"]), records["page:/"]["fields"][page_field])
        self.assertEqual("shared", records["page:/"]["fieldStorage"][page_field])
        for row in report["items"]:
            for field, storage in row.get("fieldStorage", {}).items():
                self.assertEqual(storage, self.schema.field(row["templateId"], field)["storage"])

    def test_multiroot_design_dependencies_pull_partials_and_global_data(self):
        report = self.build()
        selected = editorial.dependency_closure(report, self.snapshot, self.schema, ["/"])
        keys = {row["key"] for row in selected}
        self.assertTrue({"presentation:page-design:modern", "presentation:shell:modern:header", "presentation:shell:modern:footer", "shared:modern:header", "shared:modern:footer"}.issubset(keys))

    def test_missing_generated_placeholders_remain_apply_blockers(self):
        report = self.build()
        gates = [row for row in report["exceptions"] if row["reason"] == "native-generated-partial-placeholder-readback-required"]
        self.assertEqual(2, len(gates))
        self.assertFalse(report["readyForImport"])
        plan = editorial.build_plan(report, self.snapshot, self.schema, ["/"])
        self.assertFalse(plan["createApplyReady"])
        self.assertEqual(2, len([row for row in plan["sourceExceptions"] if row["reason"] == "native-generated-partial-placeholder-readback-required"]))
        self.assertFalse(report["nativePresentation"]["partialPlaceholderGenerationVerified"])

    def test_scaffold_library_is_never_recreated_under_a_deterministic_guid(self):
        snapshot = copy.deepcopy(self.snapshot)
        del snapshot["bindings"]["presentation:partial-designs-library"]
        report = self.build(snapshot=snapshot)
        self.assertNotIn("presentation:partial-designs-library", {row["key"] for row in report["items"]})
        self.assertTrue(any(row["reason"] == "native-scaffold-key-binding-required" for row in report["exceptions"]))

    def test_legacy_family_uses_matching_pair_and_separate_page_design(self):
        content = copy.deepcopy(self.content)
        content["shared"]["legacyShared"] = {"new-york": {"header": {"componentName": "AllianzLegacyHeader", "fields": {"data": {"datasource": {}}}}, "footer": {"componentName": "AllianzLegacyFooter", "fields": {"data": {"datasource": {}}}}}}
        content["routes"]["/"].update({"shellFamily": "legacy", "legacySharedKey": "new-york"})
        report = self.build(content=content)
        records = {row["key"]: row for row in report["items"]}
        field = self.registry["nativeFields"]["pageDesignAssignment"]["id"].lower()
        self.assertEqual(self.prepare.brace(records["presentation:page-design:legacy-new-york"]["id"]), records["page:/"]["fields"][field])
        layout_field = self.registry["inheritedLayout"]["sharedRenderingsFieldId"].lower()
        for label, renderer in (("header", "legacyHeader"), ("footer", "legacyFooter")):
            layout = ET.fromstring(records["presentation:shell:legacy-new-york:" + label]["fields"][layout_field])
            self.assertEqual(self.prepare.brace(self.registry["projectRenderings"][renderer]["id"]), layout.find("d/r").get("{s}id"))

    def test_registry_target_or_template_identity_mismatch_fails_closed(self):
        registry = copy.deepcopy(self.registry)
        registry["provenance"]["target"]["environmentId"] = "other-environment"
        with self.assertRaises(ValueError):
            self.build(registry=registry)
        registry = copy.deepcopy(self.registry)
        registry["nativeTemplates"]["partialDesign"]["id"] = fid("unobserved-template")
        report = self.build(registry=registry)
        self.assertTrue(any(row["reason"] == "unresolved-verified-presentation-template" for row in report["exceptions"]))

    def test_candidate_storage_claim_cannot_override_native_shared_flags(self):
        report = self.build()
        design = next(row for row in report["items"] if row["key"] == "presentation:page-design:modern")
        design["fieldStorage"][next(iter(design["fieldStorage"]))] = "versioned"
        with self.assertRaisesRegex(ValueError, "storage claim differs"):
            editorial.build_plan(report, self.snapshot, self.schema, ["/"])

    def test_toolbox_variants_and_local_datasource_gates_use_observed_bindings(self):
        report = self.build()
        authoring = report["nativeAuthoring"]
        self.assertEqual("715ae6c0-71c8-4744-ab4f-65362d20ad65", authoring["renderingsListField"]["id"])
        self.assertEqual("49c111d0-6867-4798-a724-1f103166e6e9", authoring["headlessVariantsTemplate"]["id"])
        self.assertEqual("4d50cdae-c2d9-4de8-b080-8f992bfb1b55", authoring["defaultVariantTemplate"]["id"])
        self.assertEqual(28, len(authoring["missingToolboxComponents"]))
        self.assertEqual(28, len(authoring["missingDefaultVariants"]))
        reasons = {row["reason"] for row in report["exceptions"]}
        self.assertTrue({"native-available-renderings-toolbox-readback-required", "native-default-headless-variants-readback-required", "native-page-local-datasource-configuration-readback-required"}.issubset(reasons))
        self.assertFalse(authoring["pageLocalDatasourceConfigurationVerified"])

    def test_actual_variant_group_and_default_are_recognized_without_mutation(self):
        snapshot = copy.deepcopy(self.snapshot)
        group_path = native.SITE_ROOT + "/Presentation/Headless Variants/AllianzHeader"
        group = fixtures.document(fid("header-variant-group"), group_path, fid("variant-root"), "49c111d0-6867-4798-a724-1f103166e6e9")
        default = fixtures.document(fid("header-default-variant"), group_path + "/Default", fid("header-variant-group"), "4d50cdae-c2d9-4de8-b080-8f992bfb1b55")
        for row in (group, default):
            raw = fixtures.scs(row)
            snapshot["items"].append(native.normalize_item(native.parse_scs(raw), raw))
        original = copy.deepcopy(snapshot)
        report = self.build(snapshot=snapshot)
        self.assertNotIn("AllianzHeader", report["nativeAuthoring"]["missingDefaultVariants"])
        self.assertEqual(original, snapshot)


if __name__ == "__main__":
    unittest.main()
