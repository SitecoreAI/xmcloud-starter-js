"""Offline regression fixtures only: no fixture describes real tenant items.

All entity UUIDs are generated in an explicitly fictional namespace. The fixed
target selector and public platform template constants are validation inputs,
not evidence that any cloud site or item exists. Files are written only to /tmp.
"""
import copy
import importlib.util
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
import uuid

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("native_snapshot_tests_subject", Path(__file__).with_name("native-snapshot.py"))
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


def fictional_id(label):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "https://invalid.example/offline-native-tests/" + label))


def document(identifier, path, parent, template, *, shared=None, unversioned=None, versions=None, other=None):
    def fields(values):
        return [{"ID": key, "Hint": "Synthetic field", "Value": value} for key, value in (values or {}).items()]
    value = {"ID": identifier, "Parent": parent, "Template": template, "Path": path}
    if shared:
        value["SharedFields"] = fields(shared)
    value["Languages"] = [{"Language": "en", "Fields": fields(unversioned), "Versions": [{"Version": int(version), "Fields": fields(values)} for version, values in (versions if versions is not None else {"1": {native.REVISION_ID: fictional_id(identifier + ":revision")}}).items()]}]
    value["Languages"].extend(other or [])
    return value


def scs(value):
    lines = ["---"] + [key + ": " + json.dumps(value[key]) for key in ("ID", "Parent", "Template", "Path")]
    def emit(fields, indent):
        for field in fields:
            lines.append(indent + "- ID: " + json.dumps(field["ID"]))
            for key in ("Hint", "BlobID", "Value"):
                if key in field:
                    lines.append(indent + "  " + key + ": " + json.dumps(field[key], ensure_ascii=False))
    if value.get("SharedFields"):
        lines.append("SharedFields:")
        emit(value["SharedFields"], "")
    lines.append("Languages:")
    for language in value.get("Languages", []):
        lines.append("- Language: " + json.dumps(language["Language"]))
        if language.get("Fields"):
            lines.append("  Fields:")
            emit(language["Fields"], "  ")
        lines.append("  Versions:")
        for version in language.get("Versions", []):
            lines.append("  - Version: " + str(version["Version"]))
            if version.get("Fields"):
                lines.append("    Fields:")
                emit(version["Fields"], "    ")
    return "\n".join(lines) + "\n"


def fixture(root, *, home_template=None, extra=None):
    identifiers = {role: fictional_id(role) for role in (*native.SCAFFOLD_PATHS, "siteDefinition")}
    scaffold, rows = {}, []
    for role, path in native.SCAFFOLD_PATHS.items():
        template = native.SITE_TEMPLATE if role == "site" else (home_template or fictional_id("home-template")) if role == "home" else fictional_id("folder-template")
        parent = fictional_id("collection") if role == "site" else identifiers["site"]
        row = document(identifiers[role], path, parent, template)
        scaffold[role] = {"id": identifiers[role], "path": path, "templateId": template, "parentId": parent}
        rows.append(row)
    path = native.SITE_ROOT + "/Settings/Synthetic site definition"
    template = fictional_id("site-definition-template")
    rows.append(document(identifiers["siteDefinition"], path, identifiers["settings"], template))
    scaffold["siteDefinition"] = {"id": identifiers["siteDefinition"], "path": path, "templateId": template, "parentId": identifiers["settings"]}
    rows.extend(extra or [])
    files = []
    for index, row in enumerate(rows):
        path = root / (str(index) + ".yml")
        path.write_text(scs(row), encoding="utf-8")
        files.append(path)
    capture = {"target": {"projectId": native.PROJECT_ID, "environmentId": native.ENVIRONMENT_ID, "siteId": identifiers["site"], "siteRoot": native.SITE_ROOT, "mediaRoot": native.MEDIA_ROOT}, "capturedAt": "2026-09-30T00:00:00Z", "captureMode": "sitecore-cli-readback", "captureSucceeded": True, "completeScopes": {"exactPaths": [], "subtrees": [native.SITE_ROOT]}, "scaffold": scaffold, "keyBindings": {"page:/": "home"}}
    return native.build_snapshot(files, capture), capture, files


class NativeSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="offline-native-test-", dir="/tmp")
        self.root = Path(self.directory.name)
        self.snapshot, self.capture, self.files = fixture(self.root)

    def tearDown(self):
        self.directory.cleanup()

    def test_successful_explicit_capture_and_home_binding(self):
        by_id, by_path = native.verify_snapshot(self.snapshot)
        self.assertEqual(6, len(by_id))
        self.assertEqual(fictional_id("home"), self.snapshot["bindings"]["page:/"])
        self.assertEqual(fictional_id("site"), self.snapshot["target"]["siteId"])
        self.assertIn(native.SITE_ROOT.casefold(), by_path)

    def test_native_branch_id_is_a_literal_guid_not_an_unknown_key(self):
        raw = self.snapshot['items'][0]['rawScs']
        branch = fictional_id('native-branch-origin')
        raw = raw.replace('Languages:', 'BranchID: "' + branch + '"\nLanguages:', 1)
        self.assertEqual(native.parse_scs(raw)['BranchID'], branch)
        with self.assertRaises(ValueError):
            native.parse_scs(raw.replace(branch, '*unsafeAlias'))

    def test_missing_site_id_is_not_invented(self):
        self.capture["target"]["siteId"] = None
        with self.assertRaisesRegex(ValueError, "GUID"):
            native.build_snapshot(self.files, self.capture)

    def test_wrong_target_and_unsuccessful_capture_are_rejected(self):
        for field, wrong in (("environmentId", "unapproved-environment"), ("siteId", fictional_id("wrong-site"))):
            capture = copy.deepcopy(self.capture)
            capture["target"][field] = wrong
            with self.assertRaises(ValueError):
                native.build_snapshot(self.files, capture)
        self.capture["captureSucceeded"] = False
        with self.assertRaises(ValueError):
            native.build_snapshot(self.files, self.capture)

    def test_scaffold_requires_all_actual_identities(self):
        for role in self.capture["scaffold"]:
            capture = copy.deepcopy(self.capture)
            del capture["scaffold"][role]
            with self.assertRaises(ValueError):
                native.build_snapshot(self.files, capture)

    def test_scaffold_path_template_and_parent_are_checked(self):
        for field, wrong in (("path", native.SITE_ROOT + "/Wrong"), ("templateId", fictional_id("wrong-template")), ("parentId", fictional_id("wrong-parent"))):
            capture = copy.deepcopy(self.capture)
            capture["scaffold"]["home"][field] = wrong
            with self.assertRaises(ValueError):
                native.build_snapshot(self.files, capture)

    def test_missing_scope_root_and_out_of_scope_items_are_rejected(self):
        capture = copy.deepcopy(self.capture)
        capture["completeScopes"]["subtrees"].append(native.MEDIA_ROOT)
        with self.assertRaisesRegex(ValueError, "root"):
            native.build_snapshot(self.files, capture)
        capture = copy.deepcopy(self.capture)
        capture["completeScopes"]["subtrees"] = [native.SITE_ROOT + "/Home"]
        with self.assertRaisesRegex(ValueError, "outside"):
            native.build_snapshot(self.files, capture)

    def test_case_collisions_are_rejected(self):
        row = document(fictional_id("duplicate-home"), native.SITE_ROOT + "/home", fictional_id("site"), fictional_id("home-template"))
        path = self.root / "duplicate.yml"
        path.write_text(scs(row))
        with self.assertRaisesRegex(ValueError, "duplicate"):
            native.build_snapshot(self.files + [path], self.capture)

    def test_forged_normalized_values_and_raw_hash_are_rejected(self):
        for field, value in (("revision", fictional_id("wrong-revision")), ("rawScsSha256", "0" * 64), ("fields", {})):
            snapshot = copy.deepcopy(self.snapshot)
            snapshot["items"][0][field] = value
            with self.assertRaisesRegex(ValueError, "original"):
                native.verify_snapshot(snapshot)

    def test_inline_hash_scalar_retains_observed_literal(self):
        text = scs(document(fictional_id("hash-item"), native.SITE_ROOT + "/Home", fictional_id("site"), fictional_id("home-template"), shared={fictional_id("hash-field"): "Hashtag (must start with #)"}))
        text = text.replace('"Hashtag (must start with #)"', 'Hashtag (must start with #)')
        self.assertEqual("Hashtag (must start with #)", native.parse_scs(text)["SharedFields"][0]["Value"])

    def test_string_scalars_and_block_chomping_remain_exact(self):
        row = document(fictional_id("strings"), native.SITE_ROOT + "/Home", fictional_id("site"), fictional_id("home-template"), shared={fictional_id("string-field"): "false"})
        text = scs(row).replace('Value: "false"', 'Value: false')
        self.assertEqual("false", native.parse_scs(text)["SharedFields"][0]["Value"])
        for token, expected in (("|-", "line"), ("|", "line\n"), ("|+", "line\n")):
            value = native.parse_scs(text.replace("Value: false", "Value: " + token + "\n    line"))["SharedFields"][0]["Value"]
            self.assertEqual(expected, value)

    def test_all_languages_versions_and_blob_metadata_survive(self):
        field = fictional_id("multi-field")
        row = document(fictional_id("multilingual"), native.SITE_ROOT + "/Data/Synthetic", fictional_id("data"), fictional_id("home-template"), versions={"1": {field: "first"}, "2": {field: "second", native.REVISION_ID: fictional_id("second-revision")}}, other=[{"Language": "fr", "Fields": [{"ID": fictional_id("unv"), "Value": "bonjour"}], "Versions": []}])
        row["SharedFields"] = [{"ID": fictional_id("blob"), "Hint": "Blob", "Value": "YWJj", "BlobID": fictional_id("blob-id")}]
        item = native.normalize_item(native.parse_scs(scs(row)))
        self.assertEqual(2, item["selectedVersion"])
        self.assertEqual("first", item["storage"]["enVersions"]["1"][field])
        self.assertEqual({}, item["languages"]["fr"]["versions"])
        self.assertEqual(fictional_id("blob-id"), item["storage"]["shared"][fictional_id("blob")]["blobId"])

    def test_selected_versions_are_canonical_and_must_exist(self):
        self.capture["selectedVersions"] = {fictional_id("home").upper(): 1}
        native.build_snapshot(self.files, self.capture)
        self.capture["selectedVersions"] = {fictional_id("missing"): 1}
        with self.assertRaisesRegex(ValueError, "absent"):
            native.build_snapshot(self.files, self.capture)
        with self.assertRaises(ValueError):
            native.normalize_item(native.read_scs(self.files[0]), selected_version=True)

    def test_duplicate_field_and_cross_storage_collision_are_rejected(self):
        row = native.read_scs(self.files[0])
        repeated = {"ID": fictional_id("repeated"), "Value": "one"}
        row["SharedFields"] = [repeated, copy.deepcopy(repeated)]
        with self.assertRaises(ValueError):
            native.parse_scs(scs(row))
        row["SharedFields"] = [repeated]
        row["Languages"][0]["Fields"] = [repeated]
        with self.assertRaises(ValueError):
            native.normalize_item(row)

    def test_noncanonical_paths_and_credentials_are_rejected(self):
        for path in (native.SITE_ROOT + "/../Other", native.SITE_ROOT + "/Bad\nPath", native.SITE_ROOT + "/Trailing/", "/sitecore//Other"):
            with self.assertRaises(ValueError):
                native.valid_path(path)
        row = native.read_scs(self.files[0])
        row["SharedFields"] = [{"ID": fictional_id("credential"), "Hint": "API key", "Value": "synthetic-not-a-secret"}]
        with self.assertRaisesRegex(ValueError, "credential"):
            native.normalize_item(row)

    def test_private_symlink_paths_are_rejected(self):
        target = self.root / "directory"
        target.mkdir()
        link = self.root / "link"
        link.symlink_to(target, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symbolic"):
            native.require_private(link / "output.json")

    def test_second_document_and_yaml_aliases_are_rejected(self):
        text = self.files[0].read_text()
        with self.assertRaises(ValueError):
            native.parse_scs(text + "---\nID: \"" + fictional_id("other") + "\"\n")
        with self.assertRaises(ValueError):
            native.parse_scs(text.replace("Language: \"en\"", "Language: *alias"))

    def test_provenance_hash_preserves_original_bom_and_crlf_bytes(self):
        original = b"\xef\xbb\xbf" + self.files[0].read_bytes().replace(b"\n", b"\r\n")
        self.files[0].write_bytes(original)
        snapshot = native.build_snapshot(self.files, self.capture)
        item = next(row for row in snapshot["items"] if row["id"] == fictional_id("site"))
        self.assertEqual(hashlib.sha256(original).hexdigest(), item["rawScsSha256"])
        self.assertTrue(item["rawScs"].startswith("\ufeff"))
        self.assertIn("\r\n", item["rawScs"])
        native.verify_snapshot(snapshot)


if __name__ == "__main__":
    unittest.main()
