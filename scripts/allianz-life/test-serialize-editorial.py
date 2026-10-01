"""Offline synthetic native-editorial regressions; never invoke a cloud CLI.

These fixtures describe fictional items only. Local file tests use temporary
/tmp paths and mock the public-checkout output gate. No credentials are read.
"""
import copy
from datetime import datetime, timedelta, timezone
import importlib.util
import hashlib
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


class NativeValueCodecTests(unittest.TestCase):
    """Physical wire regressions only; these fixtures do not prove native apply."""
    def setUp(self):
        self.schema = schema_fixture()

    def item(self, value):
        storage = editorial.empty_storage()
        storage["enVersions"]["1"][fid("author-field")] = value
        return {"ID": fid("codec-item"), "Parent": fid("home"), "Template": fid("home-template"), "Path": native.SITE_ROOT + "/Home/Offline Codec", "storage": storage}

    def test_complex_values_use_physical_literal_blocks_with_explicit_wire_lf(self):
        values = [
            'A "quoted" heading', '<p class="copy">Public text &amp; detail</p>',
            '<image mediaid="{00000000-0000-0000-0000-000000000000}" />',
            '<link linktype="anchor" anchor="section" />', '{"heading":"Public"}',
            "first\nsecond", "first\nsecond\n", r"literal\n is text", r"folder\file",
            "left\tright", '\nValue: "This is literal content"\n',
        ]
        for logical in values:
            with self.subTest(logical=logical):
                contract = editorial.value_codec.value_contract(logical)
                expected = logical if logical.endswith("\n") else logical + "\n"
                self.assertEqual(expected, contract["expectedSerializedWireValue"])
                self.assertEqual("observed-literal-block", contract["style"])
                self.assertEqual(None if logical == expected else "exactly-one-appended-LF", contract["allowedNativeClipDifference"])
                self.assertFalse(contract["nativeWriteVerified"])
                raw = editorial.serialize_item(self.item(logical), self.schema)
                self.assertIn("      Value: |\n", raw)
                self.assertNotIn("Value: " + json.dumps(logical, ensure_ascii=False), raw)
                parsed = native.normalize_item(native.parse_scs(raw))
                self.assertEqual(expected, parsed["fields"][fid("author-field")])
                self.assertEqual(hashlib.sha256(logical.encode()).hexdigest(), contract["sourceLogicalSha256"])
                self.assertEqual(hashlib.sha256(expected.encode()).hexdigest(), contract["expectedWireSha256"])

    def test_safe_quotes_preserve_nonempty_unicode_spaces_and_string_types(self):
        for logical in ("false", "1", "20260930", "# headline", " café 😀 中文 ", " leading space "):
            with self.subTest(logical=logical):
                contract = editorial.value_codec.value_contract(logical)
                self.assertEqual(logical, contract["expectedSerializedWireValue"])
                self.assertEqual("simple-double-quoted-no-escapes", contract["style"])
                raw = editorial.serialize_item(self.item(logical), self.schema)
                self.assertIn("Value: " + json.dumps(logical, ensure_ascii=False), raw)
                self.assertEqual(logical, native.normalize_item(native.parse_scs(raw))["fields"][fid("author-field")])

    def test_empty_values_are_omitted_in_all_create_storage_scopes_but_versions_remain(self):
        item = self.item("")
        item["storage"]["shared"][fid("shared-field")] = ""
        item["storage"]["enUnversioned"][fid("unversioned-field")] = ""
        item["storage"]["enVersions"]["2"] = {fid("title-field"): ""}
        item["storage"]["otherLanguages"] = {"fr": {"unversioned": {fid("unversioned-field"): ""}, "versions": {"3": {fid("author-field"): ""}}}}
        original = copy.deepcopy(item)
        raw = editorial.serialize_item(item, self.schema)
        self.assertNotIn('Value: ""', raw)
        self.assertNotIn("Fields:", raw)
        self.assertIn("  - Version: 1\n", raw)
        parsed = native.normalize_item(native.parse_scs(raw))
        self.assertEqual(editorial.wire_storage(item["storage"], omit_empty=True), editorial.preserved_storage(parsed))
        self.assertEqual(original, item)
        with self.assertRaisesRegex(ValueError, "must be omitted"):
            editorial.value_codec.value_lines("", 6)
        with self.assertRaisesRegex(ValueError, "Unsafe empty quoted"):
            editorial.value_codec.validate_tokens('  Value: ""\n')
        editorial.value_codec.validate_tokens("  Value:\n")

    def test_unproved_control_lines_whitespace_and_trailing_lfs_fail_closed(self):
        for logical in ("line\r\n", "line\x00", "line\b", "line\f", "line\x1b", "line\u0085", "line\u2028", "line\u2029", "line\n\n", "line\n  \nlast", "line\n\t\nlast", "\ud800"):
            with self.subTest(logical=repr(logical)):
                with self.assertRaises(ValueError):
                    editorial.serialize_item(self.item(logical), self.schema)

    def test_native_tokens_reject_json_escapes_unproved_chomping_and_folding(self):
        for token in ('"escaped\\n"', '"escaped\\"quote"', '"escaped\\\\path"', "|-", "|+", ">", ">-", ">+"):
            with self.subTest(token=token):
                with self.assertRaises(ValueError):
                    editorial.value_codec.validate_tokens("  Value: " + token + "\n")
        editorial.value_codec.validate_tokens('  Value: |\n    Value: "literal\\n"\n- ID: "next"\n  Value: "safe"\n')

    def test_escaped_headers_fail_closed(self):
        item = self.item("Safe")
        item["Path"] += ' "Quoted"'
        with self.assertRaisesRegex(ValueError, "identity/header"):
            editorial.serialize_item(item, self.schema)

    def test_all_storage_locations_and_blob_metadata_have_explicit_wire_values(self):
        item = self.item('<p class="copy">English</p>')
        item["storage"]["shared"][fid("shared-field")] = 'Shared "quote"'
        item["storage"]["enUnversioned"][fid("unversioned-field")] = "First\nSecond"
        item["storage"]["enVersions"]["2"] = {fid("author-field"): {"value": r"literal\bytes", "blobId": fid("blob")}}
        item["storage"]["otherLanguages"] = {"fr": {"unversioned": {fid("unversioned-field"): '<p lang="fr">Bonjour</p>'}, "versions": {"3": {fid("author-field"): "Français\nSuite\n"}}}}
        original = copy.deepcopy(item)
        parsed = native.normalize_item(native.parse_scs(editorial.serialize_item(item, self.schema)))
        self.assertEqual(editorial.wire_storage(item["storage"]), editorial.preserved_storage(parsed))
        self.assertEqual(fid("blob"), parsed["storage"]["enVersions"]["2"][fid("author-field")]["blobId"])
        self.assertEqual(original, item)


class NativeWireGateTests(unittest.TestCase):
    setUp = EditorialTests.setUp
    tearDown = EditorialTests.tearDown
    plan = EditorialTests.plan
    post_for = EditorialTests.post_for
    receipt_for = EditorialTests.receipt_for
    write_batch = EditorialTests.write_batch
    verify_batch = EditorialTests.verify_batch

    def complex_plan(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][-1]["fields"] = {fid("author-field"): '<p class="copy">Public "quoted" text</p>\nSecond line'}
        return manifest, self.plan(manifest=manifest)

    def test_plan_discloses_source_and_wire_differences_without_claiming_native_proof(self):
        manifest, plan = self.complex_plan()
        operation = next(row for row in plan["operations"] if row["fields"])
        logical = manifest["items"][-1]["fields"][fid("author-field")]
        self.assertEqual(logical, operation["fields"][fid("author-field")])
        contract = operation["nativeValueContracts"][fid("author-field")]
        self.assertEqual(logical, contract["sourceLogicalValue"])
        self.assertEqual(logical + "\n", contract["expectedSerializedWireValue"])
        self.assertEqual(logical + "\n", operation["native"]["storage"]["enVersions"]["1"][fid("author-field")])
        self.assertEqual(1, len(plan["nativeValueWireDifferences"]))
        self.assertFalse(contract["nativeWriteVerified"])
        self.assertFalse(plan["nativeExecutionEnabled"])
        self.assertEqual(0, plan["remoteWrites"])
        output, written = self.write_batch(plan)
        verified, _ = self.verify_batch(output)
        self.assertEqual(written, verified)

    def test_exact_wire_readback_owns_wire_and_logical_values_and_repeat_is_idempotent(self):
        manifest, plan = self.complex_plan()
        post = self.post_for(plan)
        ledger = editorial.finalize_ledger(plan, post, self.receipt_for(plan))
        operation = next(row for row in plan["operations"] if row["fields"])
        owned = ledger["items"][operation["id"]]
        logical = operation["fields"][fid("author-field")]
        self.assertEqual(logical, owned["sourceLogicalFields"][fid("author-field")])
        self.assertEqual(logical + "\n", owned["fields"][fid("author-field")])
        repeated = self.plan(manifest=manifest, snapshot=post, ledger=ledger)
        self.assertEqual([], repeated["operations"])
        self.assertEqual([], repeated["conflicts"])
        self.assertEqual(1, len(repeated["nativeValueWireDifferences"]))
        self.assertEqual(logical, repeated["sourceValueContracts"][0]["fields"][fid("author-field")]["sourceLogicalValue"])

    def test_missing_extra_or_literal_escaped_newlines_in_readback_are_rejected(self):
        _, plan = self.complex_plan()
        post = self.post_for(plan)
        operation = next(row for row in plan["operations"] if row["fields"])
        logical = operation["fields"][fid("author-field")]
        escaped = logical.replace('"', '\\"').replace("\n", "\\n") + "\n"
        for wrong in (logical, logical + "\n\n", escaped):
            with self.subTest(value=repr(wrong)):
                changed = change_item(post, operation["id"], fields={fid("author-field"): wrong, editorial.REVISION: fid("result-revision")})
                with self.assertRaisesRegex(ValueError, "did not round-trip"):
                    editorial.finalize_ledger(plan, changed, self.receipt_for(plan))

    def test_python_roundtrip_cannot_validate_old_json_escaped_payload_even_with_updated_hashes(self):
        _, plan = self.complex_plan()
        output, written = self.write_batch(plan)
        operation = next(row for row in written["operations"] if row["fields"])
        filename = next(name for name in written["fileSha256"] if operation["path"].rsplit("/", 1)[-1] in name)
        # The old synthetic writer JSON-escapes Value, yet our Python reader
        # produces the expected wire storage. Native CLI does not do that.
        raw = fixtures.scs(native.parse_scs((output / filename).read_text()))
        self.assertEqual(operation["native"]["storage"], editorial.preserved_storage(native.normalize_item(native.parse_scs(raw))))
        (output / filename).write_text(raw)
        written["fileSha256"][filename] = hashlib.sha256(raw.encode()).hexdigest()
        written["planSha256"] = editorial.checksum({k: v for k, v in written.items() if k != "planSha256"})
        (output / "plan.json").write_text(json.dumps(written))
        with self.assertRaisesRegex(ValueError, "JSON-escaped native Value"):
            self.verify_batch(output)

    def test_inconsistent_logical_wire_contract_is_rejected_even_with_review_hash_recomputed(self):
        _, plan = self.complex_plan()
        output, written = self.write_batch(plan)
        operation = next(row for row in written["operations"] if row["fields"])
        operation["nativeValueContracts"][fid("author-field")]["allowedNativeClipDifference"] = None
        written["planSha256"] = editorial.checksum({k: v for k, v in written.items() if k != "planSha256"})
        (output / "plan.json").write_text(json.dumps(written))
        with self.assertRaisesRegex(ValueError, "wire contract changed"):
            self.verify_batch(output)

    def test_legacy_plan_requires_regeneration_before_files_are_written(self):
        plan = self.plan()
        del plan["nativeValueEncoding"]
        with self.assertRaisesRegex(ValueError, "regenerated"):
            self.write_batch(plan)
        self.assertFalse((self.root / "batch").exists())

    def test_unowned_complex_value_without_final_lf_cannot_be_silently_changed(self):
        snapshot = change_item(self.snapshot, fid("home"), fields={fid("title-field"): "Old import", fid("author-field"): '<p class="authored">Keep exact text</p>', editorial.REVISION: fid("before-revision")})
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][0]["fields"] = {fid("title-field"): "New import"}
        ledger = {"target": manifest["target"], "items": {fid("home"): {"fields": {fid("title-field"): "Old import"}}}}
        with self.assertRaisesRegex(ValueError, "JSON-escaped native Value"):
            self.plan(manifest, snapshot, ledger)

    def test_update_preserves_exact_complex_unowned_values_in_other_versions_and_languages(self):
        self.schema = editorial.Schema([*self.schema.items.values(), field_item(fid("audit-field"), "__Updated by", "Single-Line Text")])
        snapshot = change_item(self.snapshot, fid("home"), fields={fid("title-field"): "Old import", fid("author-field"): '<p class="authored">Keep exact text</p>\n', editorial.REVISION: fid("before-revision")}, other=[{"Language": "fr", "Fields": [{"ID": fid("unversioned-field"), "Value": 'Bonjour "ami"\n'}], "Versions": [{"Version": 3, "Fields": [{"ID": fid("author-field"), "Value": r"French\literal" + "\n"}]}]}])
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][0]["fields"] = {fid("title-field"): 'New "import"'}
        # Retain a synthetic observed literal-block source document, rather
        # than using the historical JSON-escaping fixture writer as format proof.
        index = next(i for i, row in enumerate(snapshot["items"]) if row["id"] == fid("home"))
        home = snapshot["items"][index]
        stored = editorial.preserved_storage(home)
        stored["enVersions"]["1"][fid("audit-field")] = r"sitecore\fictional-author" + "\n"
        stored["enVersions"]["2"] = {fid("title-field"): "Old import", fid("author-field"): r"Retained\literal" + "\n", editorial.REVISION: fid("version-two-revision")}
        home_raw = editorial.serialize_item({"ID": home["id"], "Parent": home["parentId"], "Template": home["templateId"], "Path": home["path"], "storage": stored}, self.schema)
        snapshot["items"][index] = native.normalize_item(native.parse_scs(home_raw), home_raw, 1)
        ledger = {"target": manifest["target"], "items": {fid("home"): {"fields": {fid("title-field"): "Old import"}}}}
        plan = self.plan(manifest, snapshot, ledger)
        operation = next(row for row in plan["operations"] if row["id"] == fid("home"))
        raw = editorial.serialize_item(operation["native"], self.schema)
        self.assertEqual(operation["native"]["storage"], editorial.preserved_storage(native.normalize_item(native.parse_scs(raw))))
        original_spans = editorial.original_field_spans(home_raw)
        actual_spans = editorial.original_field_spans(raw)
        for location, fields in original_spans.items():
            for field_id, span in fields.items():
                if location == "enVersions:1" and field_id == fid("title-field"):
                    continue
                self.assertEqual(span, actual_spans[location][field_id])
        tampered = copy.deepcopy(operation)
        tampered["native"]["storage"]["otherLanguages"]["fr"]["unversioned"][fid("unversioned-field")] = 'Changed "authored"\n'
        with self.assertRaisesRegex(ValueError, "unowned original value"):
            editorial.verified_operation_wire_fields(tampered)
        tampered = copy.deepcopy(operation)
        tampered["native"]["managedFieldLocations"]["otherLanguages:fr:unversioned"] = [fid("unversioned-field")]
        with self.assertRaisesRegex(ValueError, "original raw spans must be retained"):
            editorial.verified_operation_wire_fields(tampered)
        # Build a synthetic replacement readback, preserving the existing item
        # instead of appending a duplicate native identity.
        post = copy.deepcopy(snapshot)
        result_row = copy.deepcopy(operation["native"])
        result_row["storage"]["enVersions"]["1"][editorial.REVISION] = fid("after-revision")
        result_row.pop("preservedNativeSource")
        result_row.pop("managedFieldLocations")
        result_raw = editorial.serialize_item(result_row, self.schema)
        post["items"][index] = native.normalize_item(native.parse_scs(result_raw), result_raw, 1)
        for created in plan["operations"]:
            if created["action"] == "create":
                row = copy.deepcopy(created["native"])
                row["storage"]["enVersions"]["1"][editorial.REVISION] = fid(created["id"] + ":revision")
                created_raw = editorial.serialize_item(row, self.schema)
                post["items"].append(native.normalize_item(native.parse_scs(created_raw), created_raw))
        post["capturedAt"] = editorial.now()
        editorial.finalize_ledger(plan, post, self.receipt_for(plan), ledger)
        altered = change_item(post, fid("home"), other=[{"Language": "fr", "Fields": [{"ID": fid("unversioned-field"), "Value": 'Bonjour "ami"\n\n'}], "Versions": [{"Version": 3, "Fields": [{"ID": fid("author-field"), "Value": r"French\literal" + "\n"}]}]}])
        altered["items"][index] = native.normalize_item(native.parse_scs(altered["items"][index]["rawScs"]), altered["items"][index]["rawScs"], 1)
        with self.assertRaisesRegex(ValueError, "unowned language/version"):
            editorial.finalize_ledger(plan, altered, self.receipt_for(plan), ledger)

    def test_existing_json_escaped_complex_native_fields_fail_closed_before_update_plan(self):
        snapshot = change_item(self.snapshot, fid("home"), fields={fid("title-field"): "Old import", fid("author-field"): r"native\audit" + "\n", editorial.REVISION: fid("before-revision")})
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][0]["fields"] = {fid("title-field"): "New import"}
        ledger = {"target": manifest["target"], "items": {fid("home"): {"fields": {fid("title-field"): "Old import"}}}}
        with self.assertRaisesRegex(ValueError, "JSON-escaped native Value"):
            self.plan(manifest, snapshot, ledger)


class EmptyDefaultsAndCanonicalTests(unittest.TestCase):
    """Fictional raw envelopes test gates; no fixture is genuine native evidence."""
    tearDown = EditorialTests.tearDown
    post_for = EditorialTests.post_for
    receipt_for = EditorialTests.receipt_for
    write_batch = EditorialTests.write_batch
    verify_batch = EditorialTests.verify_batch

    def setUp(self):
        EditorialTests.setUp(self)
        self.owner_id = fid("home-template")
        rows = copy.deepcopy(list(self.schema.items.values()))
        owner = next(row for row in rows if row["ID"] == self.owner_id)
        owner["SharedFields"].append({"ID": editorial.STANDARD_VALUES, "Value": fid("direct-standard-values")})
        section = {"ID": fid("direct-section"), "Parent": self.owner_id, "Template": editorial.SECTION, "Path": owner["Path"] + "/Direct Content"}
        rows.append(section)
        direct = []
        for name, kind, shared, unversioned in (("direct-rich", "Rich Text", False, False), ("empty-versioned", "Single-Line Text", False, False), ("empty-shared", "Single-Line Text", True, False), ("empty-unversioned", "Single-Line Text", False, True)):
            field = field_item(fid(name), name, kind, shared=shared, unversioned=unversioned)
            field.update(Parent=section["ID"], Path=section["Path"] + "/" + name)
            rows.append(field)
            direct.append(field)
        self.schema = editorial.Schema(rows)
        # Native flag absence is distinct from attempting a quoted empty Value.
        schema_documents = [owner, section, *direct]
        for field in direct:
            field["SharedFields"] = [row for row in field["SharedFields"] if row["Value"] != ""]
        standard = fixtures.document(fid("direct-standard-values"), owner["Path"] + "/__Standard Values", self.owner_id, self.owner_id)
        self.default_document = standard
        self.default_proof = self.envelope([standard])
        self.schema_proof = self.envelope(schema_documents)

    def envelope(self, documents):
        raw_rows = []
        for document in documents:
            raw = fixtures.scs(document)
            raw_rows.append({"rawScs": raw, "rawScsSha256": hashlib.sha256(raw.encode()).hexdigest()})
        return {"target": copy.deepcopy(self.snapshot["target"]), "capturedAt": editorial.now(), "captureMode": "sitecore-cli-readback", "captureSucceeded": True, "items": raw_rows}

    def empty_plan(self, *, proof=True, defaults=None, schema=None):
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][-1]["fields"] = {fid(name): "" for name in ("empty-versioned", "empty-shared", "empty-unversioned")}
        plan = editorial.build_plan(manifest, self.snapshot, self.schema, ["/"], empty_default_proof=(defaults or self.default_proof) if proof else None, empty_default_schema_proof=(schema or self.schema_proof) if proof else None)
        return manifest, plan

    def rich_plan(self, value='<p class="copy">Exact public text</p>'):
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][-1]["fields"] = {fid("direct-rich"): value, fid("title-field"): "Original title"}
        return manifest, editorial.build_plan(manifest, self.snapshot, self.schema, ["/"])

    def plain_post(self, plan):
        post = self.post_for(plan)
        operation = next(row for row in plan["operations"] if fid("direct-rich") in row["fields"])
        index = next(i for i, row in enumerate(post["items"]) if row["id"] == operation["id"])
        raw = post["items"][index]["rawScs"]
        span = editorial.original_field_spans(raw)["enVersions:1"][fid("direct-rich")]
        prefix = span.split("      Value:", 1)[0]
        plain_span = prefix + "      Value: " + operation["fields"][fid("direct-rich")] + "\n"
        raw = raw.replace(span, plain_span, 1)
        post["items"][index] = native.normalize_item(native.parse_scs(raw), raw, 1)
        return post, operation, index

    def test_create_empty_contract_discloses_omission_and_requires_real_default_proof(self):
        _, plan = self.empty_plan(proof=False)
        self.assertFalse(plan["createApplyReady"])
        self.assertFalse(plan["emptyDefaultProofVerified"])
        self.assertEqual(3, len(plan["requiredEmptyDefaultFields"]))
        operation = next(row for row in plan["operations"] if row["fields"])
        self.assertEqual({fid("empty-versioned"): "", fid("empty-shared"): "", fid("empty-unversioned"): ""}, operation["fields"])
        self.assertEqual(editorial.empty_storage(), operation["native"]["storage"])
        for contract in operation["nativeValueContracts"].values():
            self.assertEqual("omitted-desired-empty", contract["payloadOverride"])
            self.assertEqual(["absent"], contract["acceptedNativeStoredStates"])
            self.assertTrue(contract["requiresEmptyDefaultProof"])
            self.assertFalse(contract["nativeWriteVerified"])
        output, _ = self.write_batch(plan)
        self.verify_batch(output)
        self.assertTrue(all('Value: ""' not in path.read_text() for path in (output / "items").rglob("*.yml")))
        with self.assertRaisesRegex(ValueError, "omission is not verified empty"):
            editorial.finalize_ledger(plan, self.post_for(plan), self.receipt_for(plan))

    def test_omitted_fields_remain_absent_and_ownership_never_claims_stored_empty(self):
        manifest, plan = self.empty_plan()
        self.assertTrue(plan["createApplyReady"])
        self.assertEqual(3, len(plan["emptyDefaultObservations"]))
        post = self.post_for(plan)
        ledger = editorial.finalize_ledger(plan, post, self.receipt_for(plan))
        operation = next(row for row in plan["operations"] if row["fields"])
        owned = ledger["items"][operation["id"]]
        self.assertEqual({}, owned["fields"])
        self.assertEqual(operation["fields"], owned["sourceLogicalFields"])
        self.assertEqual(3, len(owned["omittedDesiredEmptyFields"]))
        self.assertTrue(all(c["nativeStoredState"] == "absent" for c in owned["omittedDesiredEmptyFields"].values()))
        repeated = editorial.build_plan(manifest, post, self.schema, ["/"], ledger, empty_default_proof=self.default_proof, empty_default_schema_proof=self.schema_proof)
        self.assertEqual([], repeated["operations"])
        self.assertEqual([], repeated["conflicts"])
        self.assertEqual(3, len(repeated["omittedDesiredEmptyReuses"]))

    def test_native_stored_empty_quotes_data_or_wrong_scope_are_not_accepted_for_omitted_create(self):
        _, plan = self.empty_plan()
        post = self.post_for(plan)
        operation = next(row for row in plan["operations"] if row["fields"])
        for value in ("", '""', "Nonempty"):
            changed = change_item(post, operation["id"], fields={fid("empty-versioned"): value, editorial.REVISION: fid("empty-result-revision")})
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "must remain absent"):
                editorial.finalize_ledger(plan, changed, self.receipt_for(plan))
        altered = copy.deepcopy(operation)
        altered["native"]["storage"]["shared"][fid("empty-versioned")] = ""
        with self.assertRaisesRegex(ValueError, "omit the entire field"):
            editorial.verified_operation_wire_fields(altered)

    def test_standard_values_stored_bare_empty_is_default_proof_but_not_new_item_storage_proof(self):
        document = copy.deepcopy(self.default_document)
        document["Languages"][0]["Versions"][0]["Fields"].append({"ID": fid("empty-versioned"), "Value": ""})
        proof = self.envelope([document])
        row = proof["items"][0]
        row["rawScs"] = row["rawScs"].replace('Value: ""', "Value:")
        row["rawScsSha256"] = hashlib.sha256(row["rawScs"].encode()).hexdigest()
        _, plan = self.empty_plan(defaults=proof)
        observation = next(row for row in plan["emptyDefaultObservations"] if row["fieldId"] == fid("empty-versioned"))
        self.assertEqual("stored-empty", observation["storedDefaultState"])
        self.assertEqual("", observation["effectiveDefaultValue"])
        self.assertEqual(["absent"], next(row for row in plan["operations"] if row["fields"])["nativeValueContracts"][fid("empty-versioned")]["acceptedNativeStoredStates"])
        with self.assertRaisesRegex(ValueError, "Unsafe empty quoted"):
            self.empty_plan(defaults=self.envelope([document]))

    def test_default_proof_rejects_wrong_target_stale_source_missing_or_nonempty_defaults(self):
        for mutation in ("target", "stale", "missing", "nonempty", "hash", "transport", "synthetic"):
            proof = copy.deepcopy(self.default_proof)
            if mutation == "target": proof["target"]["environmentId"] = "another-environment"
            elif mutation == "stale": proof["capturedAt"] = "2020-01-01T00:00:00Z"
            elif mutation == "missing": proof["items"] = []
            elif mutation == "hash": proof["items"][0]["rawScsSha256"] = "0" * 64
            elif mutation == "transport": proof["captureMode"] = "local-generated"
            elif mutation == "synthetic": proof["syntheticLocalTestOnly"] = True
            else:
                document = copy.deepcopy(self.default_document)
                document["Languages"][0]["Versions"][0]["Fields"].append({"ID": fid("empty-versioned"), "Value": "Not empty"})
                proof = self.envelope([document])
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                self.empty_plan(defaults=proof)

    def test_default_schema_requires_actual_owning_reference_type_storage_and_membership(self):
        for mutation in ("reference", "type", "storage", "membership"):
            proof = copy.deepcopy(self.schema_proof)
            identity = self.owner_id if mutation == "reference" else fid("empty-versioned")
            row = next(row for row in proof["items"] if native.parse_scs(row["rawScs"])["ID"] == identity)
            document = native.parse_scs(row["rawScs"])
            if mutation == "membership": document["Parent"] = fid("another-section")
            elif mutation == "reference": next(f for f in document["SharedFields"] if f["ID"] == editorial.STANDARD_VALUES)["Value"] = fid("another-default")
            elif mutation == "type": next(f for f in document["SharedFields"] if f["ID"] == editorial.TYPE)["Value"] = "Rich Text"
            else: document["SharedFields"].append({"ID": editorial.SHARED, "Value": "1"})
            row["rawScs"] = fixtures.scs(document)
            row["rawScsSha256"] = hashlib.sha256(row["rawScs"].encode()).hexdigest()
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                self.empty_plan(schema=proof)

    def test_inherited_empty_fields_cannot_use_generic_default_assumptions(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][-1]["fields"] = {fid("title-field"): ""}
        with self.assertRaisesRegex(ValueError, "inherited-default assumptions"):
            editorial.build_plan(manifest, self.snapshot, self.schema, ["/"])

    def test_omission_cannot_claim_readiness_by_removing_requirements_or_faking_verified_flag(self):
        _, plan = self.empty_plan(proof=False)
        altered = copy.deepcopy(plan)
        altered["requiredEmptyDefaultFields"] = []
        with self.assertRaisesRegex(ValueError, "exact omitted desired fields"):
            editorial.verify_plan_empty_defaults(altered)
        altered = copy.deepcopy(plan)
        altered["emptyDefaultProofVerified"] = True
        altered["createApplyReady"] = True
        with self.assertRaisesRegex(ValueError, "omission is not verified empty"):
            editorial.verify_plan_empty_defaults(altered)

    def test_omission_is_rejected_in_other_native_languages_too(self):
        _, plan = self.empty_plan()
        post = self.post_for(plan)
        operation = next(row for row in plan["operations"] if row["fields"])
        changed = change_item(post, operation["id"], other=[{"Language": "fr", "Fields": [], "Versions": [{"Version": 1, "Fields": [{"ID": fid("empty-versioned"), "Value": ""}]}]}])
        with self.assertRaisesRegex(ValueError, "must remain absent"):
            editorial.finalize_ledger(plan, changed, self.receipt_for(plan))

    def test_existing_field_clear_stays_blocked_even_if_a_default_proof_exists(self):
        snapshot = change_item(self.snapshot, fid("home"), fields={fid("empty-versioned"): "Before clear", editorial.REVISION: fid("before-clear")})
        manifest = copy.deepcopy(self.manifest)
        manifest["items"][0]["fields"] = {fid("empty-versioned"): ""}
        ledger = {"target": manifest["target"], "items": {fid("home"): {"fields": {fid("empty-versioned"): "Before clear"}}}}
        with self.assertRaisesRegex(ValueError, "Existing-field clears require"):
            editorial.build_plan(manifest, snapshot, self.schema, ["/"], ledger, empty_default_proof=self.default_proof, empty_default_schema_proof=self.schema_proof)

    def test_owned_plain_richtext_readback_binds_actual_value_line_and_item_hash(self):
        manifest, plan = self.rich_plan()
        post, operation, _ = self.plain_post(plan)
        ledger = editorial.finalize_ledger(plan, post, self.receipt_for(plan))
        owned = ledger["items"][operation["id"]]
        logical = operation["fields"][fid("direct-rich")]
        self.assertEqual(logical, owned["fields"][fid("direct-rich")])
        witness = owned["nativeCanonicalValueProofs"][fid("direct-rich")]
        self.assertEqual("observed-owned-richtext-unquoted-single-line-preserves-exact-logical", owned["nativeSerializationDifferences"][fid("direct-rich")])
        self.assertEqual("exact-wire-or-exact-owned-richtext-unquoted-single-line-with-raw-witness", operation["nativeValueContracts"][fid("direct-rich")]["nativeReadbackPolicy"])
        self.assertEqual(hashlib.sha256(logical.encode()).hexdigest(), witness["actualNativeWireSha256"])
        self.assertEqual(hashlib.sha256((witness["canonicalValueLine"] + "\n").encode()).hexdigest(), witness["canonicalValueLineSha256"])
        self.assertNotEqual(witness["actualNativeWireSha256"], witness["introducedWireSha256"])
        repeated = editorial.build_plan(manifest, post, self.schema, ["/"], ledger)
        self.assertEqual([], repeated["operations"])
        self.assertEqual([], repeated["conflicts"])
        self.assertEqual(witness["rawScsSha256"], repeated["sourceValueContracts"][0]["fields"][fid("direct-rich")]["nativeCanonicalValueProof"]["rawScsSha256"])

    def test_plain_richtext_is_preserved_as_unowned_raw_span_during_other_owned_field_update(self):
        manifest, plan = self.rich_plan()
        post, operation, index = self.plain_post(plan)
        ledger = editorial.finalize_ledger(plan, post, self.receipt_for(plan))
        manifest["items"][-1]["fields"][fid("title-field")] = "Updated title"
        update = editorial.build_plan(manifest, post, self.schema, ["/"], ledger)
        operation = next(row for row in update["operations"] if row["id"] == operation["id"])
        original = editorial.original_field_spans(post["items"][index]["rawScs"])["enVersions:1"][fid("direct-rich")]
        raw = editorial.serialize_item(operation["native"], self.schema)
        self.assertEqual(original, editorial.original_field_spans(raw)["enVersions:1"][fid("direct-rich")])
        self.assertEqual(manifest["items"][-1]["fields"][fid("direct-rich")], native.normalize_item(native.parse_scs(raw))["fields"][fid("direct-rich")])
        editorial.verified_operation_wire_fields(operation)

    def test_canonical_exception_rejects_other_types_multiline_quoted_or_duplicate_witnesses(self):
        _, plan = self.rich_plan()
        post, operation, index = self.plain_post(plan)
        for mutation in ("type", "owner", "quoted", "duplicate", "wrong-scope", "multiline"):
            altered_plan, altered_post = copy.deepcopy(plan), copy.deepcopy(post)
            altered_op = next(row for row in altered_plan["operations"] if row["id"] == operation["id"])
            if mutation == "type": altered_op["nativeValueContracts"][fid("direct-rich")]["fieldType"] = "Single-Line Text"
            elif mutation == "owner": altered_op["nativeValueContracts"][fid("direct-rich")]["ownerTemplateId"] = fid("common-template")
            elif mutation == "quoted":
                raw = altered_post["items"][index]["rawScs"]
                logical = altered_op["fields"][fid("direct-rich")]
                raw = raw.replace("Value: " + logical, "Value: " + json.dumps(logical))
                altered_post["items"][index] = native.normalize_item(native.parse_scs(raw), raw, 1)
            else:
                document = native.parse_scs(altered_post["items"][index]["rawScs"])
                field = next(row for row in document["Languages"][0]["Versions"][0]["Fields"] if row["ID"] == fid("direct-rich"))
                if mutation == "duplicate": document["Languages"][0]["Versions"].append({"Version": 2, "Fields": [copy.deepcopy(field)]})
                elif mutation == "wrong-scope":
                    document["SharedFields"] = [copy.deepcopy(field)]
                    document["Languages"][0]["Versions"][0]["Fields"].remove(field)
                else: field["Value"] += "\nextra"
                raw = fixtures.scs(document)
                # Keep this fictional duplicate/wrong-scope witness plain so
                # uniqueness/storage, rather than JSON escaping, is the gate.
                logical = operation["fields"][fid("direct-rich")]
                raw = raw.replace("Value: " + json.dumps(logical), "Value: " + logical)
                altered_post["items"][index] = native.normalize_item(native.parse_scs(raw), raw, 1)
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                editorial.finalize_ledger(altered_plan, altered_post, self.receipt_for(altered_plan))


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
