"""Portable structural safety checks with temporary files and no native writes.

The real generator supplies the local contract. Captured tenant manifests,
authentication and a Sitecore installation are not required; CLI execution is
mocked and checked for its exact read-only serialization command.
"""
from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("structure_validator", Path(__file__).with_name("validate-structure.py"))
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class StructureSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix="allianz-structure-safety-")
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.repo = Path(cls.temporary.name)
        cls.root = cls.repo / "authoring/allianz-life"
        cls.items = cls.root / "items"
        cls.items.mkdir(parents=True)
        cls.entries, cls.module = validator.generator.generate()
        for index, entry in enumerate(cls.entries):
            (cls.items / f"{index:04d}.yml").write_text(validator.generator.serialize(entry))

    def setUp(self):
        self.entries = copy.deepcopy(type(self).entries)
        self.module = copy.deepcopy(type(self).module)
        self.build = {"deployItems": {"modules": []}}
        self.native_config = {"modules": ["authoring/allianz-life/**/*.module.json"]}
        self.target = {
            "projectId": "7f3XlRhEqdT8l8FrbjQync",
            "environmentId": "56W3hhEUAQ5GLwsHAehRhe",
            "organizationId": "org_JypIqqJsbEly6gh2",
            "projectName": "thlt-allianz-demo",
            "organizationName": "Sales Engineer 2",
        }
        self.write_contract()
        self.write_json("xmcloud.build.json", self.build)
        self.write_json("sitecore.json", self.native_config)
        self.repo_patch = patch.object(validator, "REPO", self.repo)
        self.repo_patch.start()
        self.addCleanup(self.repo_patch.stop)
        # Accidental process execution fails every test, including validation
        # paths that are supposed to fail before any optional CLI invocation.
        self.process_patch = patch.object(validator.subprocess, "run", side_effect=AssertionError("Unexpected process execution"))
        self.process = self.process_patch.start()
        self.addCleanup(self.process_patch.stop)

    def write_json(self, relative, value):
        (self.repo / relative).write_text(json.dumps(value))

    def write_contract(self):
        self.write_json("authoring/allianz-life/structure-manifest.json", {"items": self.entries})
        self.write_json("authoring/allianz-life/Project.AllianzLife.Structure.module.json", self.module)

    def schema(self):
        return {"target": self.target, "items": []}

    def test_explicit_empty_deployment_modules_preserve_local_only_report(self):
        report = validator.validate(target_schema=self.schema())
        self.assertEqual("local-structure-valid", report["status"])
        self.assertEqual(len(self.entries), report["itemCount"])
        self.assertEqual({"status": "not-run"}, report["cli"])
        self.assertEqual(0, report["remoteWrites"])
        self.assertFalse(report["deployReady"])
        self.assertFalse(report["tenantRuntimeVerified"])
        self.assertTrue(report["unresolvedTenantDependencies"])
        self.process.assert_not_called()

    def test_missing_or_malformed_deployment_modules_fail_closed(self):
        for build in ({}, {"deployItems": {}}, {"deployItems": None}, {"deployItems": {"modules": None}}, {"deployItems": {"modules": ""}}, {"deployItems": {"modules": {}}}):
            with self.subTest(build=build):
                self.write_json("xmcloud.build.json", build)
                with self.assertRaisesRegex(ValueError, "explicitly disable item deployment"):
                    validator.validate(with_cli=True)
        self.process.assert_not_called()

    def test_any_native_deployment_module_is_rejected(self):
        for modules in (["Project.AllianzLife.Structure"], ["*"], ["Project.AllianzLife.Editorial"], ["Project.AllianzLife.Structure", "Other.Module"]):
            with self.subTest(modules=modules):
                self.write_json("xmcloud.build.json", {"deployItems": {"modules": modules}})
                with self.assertRaisesRegex(ValueError, "explicitly disable item deployment"):
                    validator.validate(with_cli=True)
        self.process.assert_not_called()

    def test_mutable_display_names_do_not_gate_preserved_ids(self):
        for names in ({"projectName": "thlt-mnp-demo", "organizationName": "Sales Engineer 2"}, {"projectName": "thlt-allianz-demo", "organizationName": "Renamed organization"}, {}):
            with self.subTest(names=names):
                self.target.pop("projectName", None)
                self.target.pop("organizationName", None)
                self.target.update(names)
                self.assertEqual("local-structure-valid", validator.validate(target_schema=self.schema())["status"])

    def test_exact_preserved_project_and_environment_are_required(self):
        for key in ("projectId", "environmentId"):
            for value in ("other-target", None, ""):
                with self.subTest(key=key, value=value):
                    schema = self.schema()
                    schema["target"] = {**self.target, key: value, "projectName": "thlt-mnp-demo", "organizationName": "Sales Engineer 2"}
                    with self.assertRaisesRegex(ValueError, "verified preserved project/environment"):
                        validator.validate(target_schema=schema)
            schema = self.schema()
            schema["target"] = {name: value for name, value in self.target.items() if name != key}
            with self.subTest(missing=key), self.assertRaisesRegex(ValueError, "verified preserved project/environment"):
                validator.validate(target_schema=schema)

    def test_organization_id_is_exact_when_exposed(self):
        for value in ("other-organization", None, ""):
            with self.subTest(value=value):
                self.target["organizationId"] = value
                with self.assertRaisesRegex(ValueError, "verified preserved project/environment"):
                    validator.validate(target_schema=self.schema())

    def test_organization_id_may_be_absent_from_schema_capture(self):
        del self.target["organizationId"]
        self.assertEqual("local-structure-valid", validator.validate(target_schema=self.schema())["status"])

    def test_supplied_schema_without_target_identity_is_rejected(self):
        for schema in ({}, {"target": {}}, {"target": None}, {"target": []}):
            with self.subTest(schema=schema), self.assertRaisesRegex(ValueError, "verified preserved project/environment"):
                validator.validate(target_schema=schema)

    def test_only_verified_schema_items_resolve_tenant_dependencies(self):
        report = validator.validate()
        dependency = report["unresolvedTenantDependencies"][0]
        schema = self.schema()
        schema["items"] = [{"id": dependency.upper()}]
        resolved_report = validator.validate(target_schema=schema)
        self.assertEqual(set(report["unresolvedTenantDependencies"]) - {dependency}, set(resolved_report["unresolvedTenantDependencies"]))
        self.assertFalse(resolved_report["deployReady"])
        self.assertFalse(resolved_report["tenantRuntimeVerified"])

    def test_scoped_scs_validation_is_read_only(self):
        self.process.side_effect = None
        self.process.return_value = subprocess.CompletedProcess([], 0, "No errors were detected.\n", "")
        report = validator.validate(with_cli=True, target_schema=self.schema())
        self.process.assert_called_once_with(["dotnet", "sitecore", "ser", "validate", "--include", "Project.AllianzLife.Structure"], cwd=self.repo, capture_output=True, text=True)
        self.assertEqual("passed", report["cli"]["status"])
        self.assertTrue(report["cli"]["readOnly"])
        self.assertEqual(0, report["remoteWrites"])
        self.assertFalse(report["deployReady"])

    def test_failed_or_ambiguous_cli_validation_is_rejected(self):
        self.process.side_effect = None
        for returncode, stdout, stderr in ((1, "", "Serialization error"), (0, "No items validated", "")):
            with self.subTest(returncode=returncode, stdout=stdout):
                self.process.return_value = subprocess.CompletedProcess([], returncode, stdout, stderr)
                with self.assertRaisesRegex(ValueError, "Pinned Sitecore CLI serialization validation failed"):
                    validator.validate(with_cli=True)

    def test_structure_contract_cannot_be_changed_silently(self):
        self.entries[0]["Path"] = "/sitecore/content/allianz/allianz-life/Home"
        self.write_contract()
        with self.assertRaisesRegex(ValueError, "differs from its explicit source contract"):
            validator.validate()

    def test_structural_roots_and_create_update_scope_stay_enforced(self):
        for key, value, error in (("path", "/sitecore/content/allianz/allianz-life", "exact structural roots"), ("scope", "SingleItem", "unexpected operation or scope"), ("allowedPushOperations", "CreateUpdateAndDelete", "unexpected operation or scope")):
            with self.subTest(key=key):
                module = copy.deepcopy(type(self).module)
                module["items"]["includes"][0][key] = value
                self.write_json("authoring/allianz-life/Project.AllianzLife.Structure.module.json", module)
                # A changed generator contract must not bypass independent
                # root/scope checks merely by matching the stored module.
                with patch.object(validator.generator, "generate", return_value=(self.entries, module)):
                    with self.assertRaisesRegex(ValueError, error):
                        validator.validate()

    def test_missing_structural_yaml_is_rejected(self):
        original = self.items / "0000.yml"
        temporary = original.with_suffix(".missing")
        original.rename(temporary)
        try:
            with self.assertRaisesRegex(ValueError, "Stale or missing structural YAML files"):
                validator.validate()
        finally:
            temporary.rename(original)

    def test_structural_module_remains_callable_by_scoped_cli(self):
        self.write_json("sitecore.json", {"modules": []})
        with self.assertRaisesRegex(ValueError, "not callable from sitecore.json"):
            validator.validate()


if __name__ == "__main__":
    unittest.main()
