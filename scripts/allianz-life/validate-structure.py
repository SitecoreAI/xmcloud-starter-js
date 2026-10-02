#!/usr/bin/env python3
"""Check Allianz structural boundaries and optionally run pinned SCS validation.

The generated generic GraphQL syntax requires published tenant schema validation
and a real Pages/Edge check; local YAML validation does not establish that result.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import uuid

spec = importlib.util.spec_from_file_location("structure_generator", Path(__file__).with_name("generate-structure.py"))
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
REPO = generator.REPO
PROJECT_ID = "7f3XlRhEqdT8l8FrbjQync"
ENVIRONMENT_ID = "56W3hhEUAQ5GLwsHAehRhe"
ORGANIZATION_ID = "org_JypIqqJsbEly6gh2"


def validate(with_cli: bool = False, target_schema: dict | None = None) -> dict:
    root = REPO / "authoring/allianz-life"
    expected, expected_module = generator.generate()
    manifest = json.loads((root / "structure-manifest.json").read_text())
    module = json.loads((root / "Project.AllianzLife.Structure.module.json").read_text())
    if manifest["items"] != expected or module != expected_module:
        raise ValueError("Generated structure differs from its explicit source contract")
    if module["namespace"] != "Project.AllianzLife.Structure":
        raise ValueError("Unexpected module namespace")
    includes = module["items"]["includes"]
    approved_roots = {value[0] for value in generator.ROOTS.values()}
    if {include["path"] for include in includes} != approved_roots:
        raise ValueError("Serialization includes are not the exact structural roots")
    for include in includes:
        if include["allowedPushOperations"] != "CreateAndUpdate" or include["scope"] != "ItemAndDescendants":
            raise ValueError("Structural SCS module permits an unexpected operation or scope")
    if any("/content/" in path or "/media library/" in path for path in approved_roots):
        raise ValueError("Editorial or media content cannot enter structural IAR")
    entries = manifest["items"]
    by_id = {entry["ID"]: entry for entry in entries}
    if len(by_id) != len(entries):
        raise ValueError("Duplicate item IDs")
    external_refs = set()
    query_count = 0
    for entry in entries:
        for key in ("ID", "Parent", "Template"):
            uuid.UUID(entry[key])
        if not any(entry["Path"] == root_path or entry["Path"].startswith(root_path + "/") for root_path in approved_roots):
            raise ValueError("Serialized item escapes structural roots")
        for key in ("Parent", "Template"):
            if entry[key] not in by_id:
                external_refs.add(entry[key])
        if any(value["ID"].lower() == "19a69332-a23e-4e70-8d16-b2640cb24cc8" for value in entry["VersionedFields"]):
            raise ValueError("Native template-field Title must use unversioned storage")
        for value in entry["SharedFields"] + entry.get("UnversionedFields", []) + entry["VersionedFields"]:
            uuid.UUID(value["ID"])
            if value["ID"] not in by_id:
                external_refs.add(value["ID"])
            if value["Hint"] in ("__Base template", "__Standard values", "__Masters", "Allowed Controls", "Parameters Template"):
                for reference in re.findall(r"\{([0-9A-Fa-f-]{36})\}", value["Value"]):
                    if reference.lower() not in by_id:
                        external_refs.add(reference.lower())
            if value["Hint"] == "ComponentQuery":
                query_count += 1
                query = value["Value"]
                if query.count("{") != query.count("}") or "datasource: item(path: $datasource, language: $language)" not in query:
                    raise ValueError("Malformed or unexpected native component query")
                if any(token in query.lower() for token in ("mutation", "password", "secret", "token")):
                    raise ValueError("Component query contains a forbidden operation or field")
        if entry["Path"].endswith("/$name") and entry["Template"] not in by_id:
            raise ValueError("Datasource branch prototype does not use an Allianz native template")
    yaml_files = list((root / "items").rglob("*.yml"))
    if len(yaml_files) != len(entries):
        raise ValueError("Stale or missing structural YAML files")
    native_config = json.loads((REPO / "sitecore.json").read_text())
    if "authoring/allianz-life/**/*.module.json" not in native_config["modules"]:
        raise ValueError("Allianz structure is not callable from sitecore.json")
    build = json.loads((REPO / "xmcloud.build.json").read_text())
    deploy_items = build.get("deployItems")
    if not isinstance(deploy_items, dict) or deploy_items.get("modules") != []:
        raise ValueError("Managed host build must explicitly disable item deployment with deployItems.modules = []")
    cli_result = {"status": "not-run"}
    if with_cli:
        result = subprocess.run(["dotnet", "sitecore", "ser", "validate", "--include", "Project.AllianzLife.Structure"], cwd=REPO, capture_output=True, text=True)
        if result.returncode or "No errors were detected." not in result.stdout:
            raise ValueError("Pinned Sitecore CLI serialization validation failed: " + (result.stderr or result.stdout))
        cli_result = {"status": "passed", "command": "dotnet sitecore ser validate --include Project.AllianzLife.Structure", "version": "6.0.23", "readOnly": True, "output": result.stdout.strip()}
    resolved = set()
    if target_schema is not None:
        target = target_schema.get("target", {})
        # Display names can change in place; schema evidence must stay bound to
        # the preserved project's stable identities instead.
        if not isinstance(target, dict) or target.get("projectId") != PROJECT_ID or target.get("environmentId") != ENVIRONMENT_ID:
            raise ValueError("Target schema was not read from the verified preserved project/environment")
        if "organizationId" in target and target["organizationId"] != ORGANIZATION_ID:
            raise ValueError("Target schema was not read from the verified preserved project/environment")
        resolved = {item["id"].lower() for item in target_schema.get("items", [])}
    unresolved = sorted(external_refs - resolved)
    return {"status": "local-structure-valid", "namespace": module["namespace"], "itemCount": len(entries), "componentQueries": query_count, "structuralRoots": sorted(approved_roots), "cli": cli_result, "unresolvedTenantDependencies": unresolved, "tenantRuntimeVerified": False, "deployReady": False, "remainingGates": ["Read all platform dependencies from the verified target environment", "Native site bootstrap and page-local datasource Editing settings", "Published tenant GraphQL schema/query validation", "Pages field edit/publish and branch-clone verification"], "remoteWrites": 0}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--with-cli", action="store_true")
    parser.add_argument("--target-schema", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        report = validate(args.with_cli, json.loads(args.target_schema.read_text()) if args.target_schema else None)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ("status", "itemCount", "componentQueries", "deployReady", "remoteWrites")}))


if __name__ == "__main__":
    main()
