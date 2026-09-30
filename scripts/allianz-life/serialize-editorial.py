#!/usr/bin/env python3
"""Prepare narrowly scoped private editorial SCS and gate native CLI application.

This is separate from structural deployItems and the media importer. Preparation
is local only. Native updates are reviewable but cannot be executed here: SCS has
no atomic revision compare-and-swap. The optional writer accepts creates only,
uses a temporary CreateOnly module, and never records success before readback.
"""
from __future__ import annotations

import argparse
import copy
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import os
import re
import subprocess
import uuid
import xml.etree.ElementTree as ET

SCRIPT_ROOT = Path(__file__).resolve().parent
REPO = SCRIPT_ROOT.parents[1]
SITE_ROOT = "/sitecore/content/Allianz/allianz-life"
MEDIA_ROOT = "/sitecore/media library/Project/Allianz Life"
PROJECT_ID = "7f3XlRhEqdT8l8FrbjQync"
ENVIRONMENT_ID = "56W3hhEUAQ5GLwsHAehRhe"
NAMESPACE = "AllianzLife.Editorial"
TEMPLATE = "ab86861a-6030-46c5-b394-e8f99e8b87db"
SECTION = "e269fbb5-3750-427a-9149-7aa950b49301"
FIELD = "455a3e98-a627-4b40-8035-e683a0331ac7"
BASE = "12c33f3f-86c5-43a5-aeb4-5598cec45116"
TYPE = "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
SHARED = "be351a73-fcb0-4213-93fa-c302d8ab4f51"
UNVERSIONED = "39847666-389d-409b-95bd-f2016f11eed5"
REVISION = "8cdc337e-a112-42fb-bbb4-4143751e123f"
FINAL_LAYOUT = "04bf00db-f5fb-41f7-8ab7-22408372a981"
SHARED_LAYOUT = "f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e"
DEFAULT_DEVICE = "fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3"
ZERO = "00000000-0000-0000-0000-000000000000"
GUID = re.compile(r"\{?([0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})\}?")
FORBIDDEN_HTML = re.compile(r"<\s*(script|style|form|iframe|object|embed|html|head|body)\b|\bon\w+\s*=|javascript\s*:", re.I)
SENSITIVE = re.compile(r"security|password|secret|token|api.?key", re.I)
# No migrated authentication cache or live target binding is available here.
# Preparation/finalization are offline. Enabling a writer requires a separately
# reviewed integration that verifies the CLI alias against the actual target.
NATIVE_EXECUTION_ENABLED = False


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPT_ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


planner = load_module("editorial_planner", "import-planner.py")
snapshot_parser = load_module("editorial_snapshot", "native-snapshot.py")


def guid(value: str) -> str:
    return str(uuid.UUID(str(value).strip("{}")))


def checksum(value) -> str:
    return planner.checksum(value)


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def timestamp(value: str) -> datetime:
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("Snapshot capture time must include its UTC offset")
    return result.astimezone(timezone.utc)


def safe_path(path: str) -> None:
    if not isinstance(path, str) or not path.startswith("/") or path.endswith("/"):
        raise ValueError("Native item path must be absolute and canonical")
    if any(part in ("", ".", "..") for part in path.split("/")[1:]) or any(c in path for c in "\\\x00\r\n"):
        raise ValueError("Unsafe native item path")


def allowed_editorial(path: str, site_root: str = SITE_ROOT) -> bool:
    safe_path(path)
    return any(planner.inside(path, site_root + "/" + root) for root in ("Home", "Data", "Presentation"))


def field_value(value):
    return value["value"] if isinstance(value, dict) and set(value) == {"value", "blobId"} else value


def native_fields(raw: dict) -> dict:
    return {guid(f["ID"]): str(f.get("Value", "")) for f in raw.get("SharedFields", [])}


class Schema:
    """Field membership/storage derived from observed native SCS and structure."""

    def __init__(self, items: list[dict]):
        self.items = {}
        for raw in items:
            item = copy.deepcopy(raw)
            for key in ("ID", "Parent", "Template"):
                item[key] = guid(item[key])
            old = self.items.get(item["ID"])
            if old and any(old[k] != item[k] for k in ("Parent", "Template", "Path")):
                raise ValueError("Native schema has contradictory identities")
            if old and native_fields(old) != native_fields(item):
                raise ValueError("Native schema has contradictory template fields")
            self.items[item["ID"]] = item
        self.templates = {i: row for i, row in self.items.items() if row["Template"] == TEMPLATE}
        self.fields, self.direct = {}, {}
        for identifier, row in self.items.items():
            if row["Template"] != FIELD:
                continue
            # Standard Values for the *Template field* meta-template is an
            # instance of FIELD too. It is not an editorial field definition.
            if row["Parent"] == FIELD and row["Path"].endswith("/__Standard Values"):
                continue
            section = self.items.get(row["Parent"], {})
            if section.get("Template") != SECTION or section.get("Parent") not in self.templates:
                raise ValueError("Native field is missing its observed owning template")
            values = native_fields(row)
            if TYPE not in values:
                raise ValueError("Native field Type must be observed, not guessed")
            shared, unversioned = values.get(SHARED, "") == "1", values.get(UNVERSIONED, "") == "1"
            # The captured platform schema contains unrelated fields with both
            # flags set. Retain them as evidence, but refuse to write them until
            # their effective storage has been independently established.
            storage = "ambiguous" if shared and unversioned else "shared" if shared else "enUnversioned" if unversioned else "versioned"
            self.fields[identifier] = {"hint": row["Path"].rsplit("/", 1)[-1], "type": values[TYPE], "storage": storage, "templateId": section["Parent"]}
            self.direct.setdefault(section["Parent"], set()).add(identifier)
        self.cache = {}

    @classmethod
    def from_files(cls, native_path: Path, structure_path: Path, scaffold_snapshot: dict | None = None):
        parser = load_module("editorial_native_snapshot", "native-snapshot.py")
        native = json.loads(native_path.read_text())
        target = native.get("target", {})
        if target.get("projectId") != PROJECT_ID or target.get("environmentId") != ENVIRONMENT_ID:
            raise ValueError("Schema was not captured from the preserved target")
        items = []
        for row in native["items"]:
            path = (native_path.parent / row["file"]).resolve()
            if not path.is_relative_to(native_path.parent.resolve()):
                raise ValueError("Native schema file escaped its evidence directory")
            items.append(parser.read_scs(path))
        structure = json.loads(structure_path.read_text())
        if scaffold_snapshot is not None:
            parser.verify_snapshot(scaffold_snapshot)
            items.extend(parser.template_evidence(scaffold_snapshot).values())
        items.extend(structure["items"])
        return cls(items)

    def inherited_fields(self, template_id: str, visiting=None) -> set[str]:
        template_id = guid(template_id)
        if template_id in self.cache:
            return self.cache[template_id]
        visiting = set(visiting or ())
        if template_id in visiting:
            raise ValueError("Template inheritance cycle")
        row = self.templates.get(template_id)
        if not row:
            raise ValueError(f"Unresolved native base template: {template_id}")
        visiting.add(template_id)
        values = native_fields(row)
        result = set(self.direct.get(template_id, set()))
        for match in GUID.finditer(values.get(BASE, "")):
            base = guid(match.group(1))
            if base != ZERO:
                result.update(self.inherited_fields(base, visiting))
        self.cache[template_id] = result
        return result

    def field(self, template_id: str, identifier: str) -> dict:
        identifier = guid(identifier)
        if identifier not in self.inherited_fields(template_id):
            raise ValueError(f"Field is not in the observed inherited template schema: {identifier}")
        result = self.fields[identifier]
        if result["storage"] == "ambiguous":
            raise ValueError("Native field storage is ambiguous; independent storage evidence is required")
        if SENSITIVE.search(result["hint"]):
            raise ValueError("Editorial import cannot write security or credentials")
        return result


def validate_snapshot(manifest: dict, snapshot: dict) -> tuple[dict, dict]:
    target = manifest.get("target", {})
    planner.validate_target(target, snapshot.get("target", {}))
    if target["projectId"] != PROJECT_ID or target["environmentId"] != ENVIRONMENT_ID:
        raise ValueError("Editorial import is limited to the preserved project and environment")
    if manifest.get("language") != "en":
        raise ValueError("Only public English content is authorized")
    by_id, by_path = snapshot_parser.verify_snapshot(snapshot)
    if manifest.get("bindings", {}) != snapshot.get("bindings", {}):
        raise ValueError("Scaffold bindings must be independently verified in the snapshot")
    for key, identifier in manifest.get("bindings", {}).items():
        if guid(identifier) not in by_id:
            raise ValueError("Scaffold binding is absent from native snapshot")
    if len({guid(v) for v in manifest.get("bindings", {}).values()}) != len(manifest.get("bindings", {})):
        raise ValueError("Native identity bindings must be one-to-one")
    return by_id, by_path


def bind_native_scaffold(manifest: dict, snapshot: dict) -> dict:
    """Bind actual scaffold UUIDs locally without adopting fields or templates.

    Home's desired template remains explicit. If the native Home has another
    template, build_plan reports a separate migration prerequisite and refuses
    application. This helper never invents a site UUID or a successful baseline.
    """
    snapshot_parser.verify_snapshot(snapshot)
    result = copy.deepcopy(manifest)
    target = result.get("target", {})
    native_target = snapshot["target"]
    for key in planner.TARGET_KEYS:
        if key != "siteId" and target.get(key) != native_target.get(key):
            raise ValueError("Candidate target differs from the actual native scaffold")
    if target.get("siteId") not in (None, "", native_target["siteId"]):
        raise ValueError("Candidate already names another native content Site UUID")
    result["target"] = copy.deepcopy(native_target)
    bindings = copy.deepcopy(snapshot.get("bindings", {}))
    home_id = guid(snapshot["scaffold"]["home"]["id"])
    if bindings.get("page:/", home_id) != home_id:
        raise ValueError("Home key binding differs from actual scaffold Home UUID")
    bindings["page:/"] = home_id
    if snapshot.get("bindings", {}) != bindings:
        raise ValueError("Capture must explicitly bind page:/ to the actual native Home")
    if result.get("bindings") and result["bindings"] != bindings:
        raise ValueError("Candidate bindings differ from independent native readback")
    result["bindings"] = bindings
    seen_home = False
    for record in result.get("items", []):
        if record["key"] in bindings:
            record["id"] = guid(bindings[record["key"]])
        if record["key"] == "page:/":
            if record["path"] != native_target["siteRoot"] + "/Home":
                raise ValueError("Home candidate has the wrong canonical native path")
            seen_home = True
    if not seen_home:
        raise ValueError("Candidate manifest lacks its explicit Home record")
    result["nativeBindingEvidence"] = {
        "snapshotSha256": checksum(snapshot), "capturedAt": snapshot["capturedAt"],
        "homeId": home_id, "nativeHomeTemplateId": guid(snapshot["scaffold"]["home"]["templateId"]),
        "fieldAdoption": False, "remoteWrites": 0,
    }
    return result


def captured_path(snapshot: dict, path: str) -> bool:
    scopes = snapshot["completeScopes"]
    return path in scopes.get("exactPaths", []) or any(planner.inside(path, scope) for scope in scopes.get("subtrees", []))


def xml(value: str, root: str) -> ET.Element:
    if "<!" in value:
        raise ValueError("XML declarations, entities and doctypes are forbidden")
    node = ET.fromstring(value)
    if node.tag != root:
        raise ValueError("Native field XML root differs from its field type")
    return node


def references(record: dict, schema: Schema, site_root: str = SITE_ROOT) -> tuple[set[str], set[str]]:
    ids, paths = set(), set()
    for field_id, value in record.get("fields", {}).items():
        definition = schema.field(record["templateId"], field_id)
        if not isinstance(value, str):
            raise ValueError("Native field values must be strings")
        kind = definition["type"].casefold()
        if value == "":
            continue
        if kind in ("image", "file", "general link"):
            node = xml(value, {"image": "image", "file": "file", "general link": "link"}[kind])
            if kind == "general link":
                link_type = node.get("linktype")
                if link_type not in ("internal", "media", "anchor") or node.get("url") or node.get("target", "") not in ("", "_self"):
                    raise ValueError("External/authenticated link is not permitted in native editorial import")
                if link_type == "anchor":
                    continue
                identifier = node.get("id")
            else:
                identifier = node.get("mediaid")
            if not identifier:
                raise ValueError("Native image/file/link has no item reference")
            ids.add(guid(identifier))
        elif kind in ("treelist", "treelistex", "multiroot treelist", "multilist", "droplink", "droptree", "grouped droplink", "internal link"):
            for value_id in value.split("|"):
                if value_id.strip():
                    ids.add(guid(value_id.strip()))
        elif kind == "layout":
            node = xml(value, "r")
            for device in node.findall("d"):
                if guid(device.get("id", "")) != DEFAULT_DEVICE:
                    raise ValueError("Unverified native layout device")
                for rendering in device.findall("r"):
                    renderer = rendering.get("{s}id")
                    if renderer:
                        renderer_id = guid(renderer)
                        schema_item = schema.items.get(renderer_id, {})
                        if not schema_item.get("Path", "").startswith("/sitecore/layout/Renderings/Project/Allianz Life/"):
                            raise ValueError("Layout rendering escapes the verified Allianz structural renderings")
                    datasource = rendering.get("{s}ds", "")
                    if datasource.startswith("local:/"):
                        paths.add(record["path"] + datasource[len("local:"):])
                    elif datasource.startswith("/"):
                        if not allowed_editorial(datasource, site_root):
                            raise ValueError("Layout datasource escapes the Allianz site")
                        paths.add(datasource)
                    elif datasource:
                        ids.add(guid(datasource))
        elif kind == "rich text" and FORBIDDEN_HTML.search(value):
            raise ValueError("Unsafe executable or composite Rich Text content")
    return ids, paths


def dependency_closure(manifest: dict, snapshot: dict, schema: Schema, routes: list[str], include_keys=()) -> list[dict]:
    by_id, by_path = validate_snapshot(manifest, snapshot)
    site_root = manifest["target"]["siteRoot"]
    records, paths, keys = {}, {}, {}
    bindings = manifest.get("bindings", {})
    for record in manifest.get("items", []):
        identifier = guid(record["id"])
        key, path = record["key"], record["path"]
        if identifier != guid(bindings.get(key, planner.item_id(key))):
            raise ValueError("Candidate identity is neither deterministic nor a verified native binding")
        if identifier in records or path.casefold() in paths or key in keys:
            raise ValueError("Candidate records contain a duplicate identity, key or path")
        if not allowed_editorial(path, site_root) or record.get("kind", "editorial") != "editorial":
            raise ValueError("Editorial candidates escape Home/Data/Presentation, or include media")
        if record.get("access") != "public" or record.get("language", "en") != "en":
            raise ValueError("Editorial source is not public English")
        planner.canonical_source(record["sourceUrl"])
        records[identifier], paths[path.casefold()], keys[key] = record, identifier, identifier
    pending = []
    for route in routes:
        if not route.startswith("/") or "?" in route or "#" in route:
            raise ValueError("Select explicit canonical route paths")
        key = "page:" + (route.rstrip("/") or "/")
        if key not in keys:
            raise ValueError(f"Selected source route was not inventoried: {route}")
        page = records[keys[key]]
        pending.append(keys[key])
        # Page-local children belong to this page; child pages are dependencies
        # only when explicitly selected or linked, rather than all Home descendants.
        pending.extend(identifier for identifier, row in records.items() if planner.inside(row["path"], page["path"] + "/Data"))
    for key in include_keys:
        if key not in keys:
            raise ValueError("Explicit shared/presentation dependency key is missing")
        pending.append(keys[key])
    selected = set()
    while pending:
        identifier = pending.pop()
        if identifier in selected or identifier not in records:
            continue
        record = records[identifier]
        selected.add(identifier)
        # Child datasource entries are intrinsic to their parent component.
        pending.extend(i for i, row in records.items() if row["path"].rsplit("/", 1)[0].casefold() == record["path"].casefold() and not row["key"].startswith("page:"))
        parent_path = record["path"].rsplit("/", 1)[0]
        if parent_path.casefold() in paths:
            pending.append(paths[parent_path.casefold()])
        elif parent_path.casefold() not in by_path:
            raise ValueError(f"Missing actual native or candidate parent: {parent_path}")
        ref_ids, ref_paths = references(record, schema, site_root)
        for ref_path in ref_paths:
            safe_path(ref_path)
            ref = paths.get(ref_path.casefold())
            if ref:
                pending.append(ref)
            elif ref_path.casefold() not in by_path:
                raise ValueError(f"Unresolved local datasource: {ref_path}")
        for ref in ref_ids:
            if ref in records:
                pending.append(ref)
            elif ref not in by_id:
                raise ValueError(f"Reference has not been imported/read back: {ref}")
            elif not (allowed_editorial(by_id[ref]["path"], site_root) or planner.inside(by_id[ref]["path"], MEDIA_ROOT)):
                raise ValueError("Item reference escapes the isolated Allianz content/media scope")
    result = [records[i] for i in selected]
    return sorted(result, key=lambda row: (row["path"].count("/"), row["path"].casefold()))


def empty_storage() -> dict:
    return {"shared": {}, "enUnversioned": {}, "enVersions": {"1": {}}, "otherLanguages": {}}


def preserved_storage(item: dict) -> dict:
    value = copy.deepcopy(item.get("storage"))
    if not isinstance(value, dict) or not all(key in value for key in ("shared", "enUnversioned", "enVersions")):
        raise ValueError("Updates require a complete raw storage snapshot, not flattened fields")
    # Snapshot producer also retains arbitrary native language storage. Never
    # drop a language/version merely because this import owns only English.
    value.setdefault("otherLanguages", {})
    if item.get("languages") and not value["otherLanguages"]:
        value["otherLanguages"] = copy.deepcopy({k: v for k, v in item["languages"].items() if k != "en"})
    return value


def set_native_field(storage: dict, definition: dict, identifier: str, value: str, version: int) -> None:
    bucket = definition["storage"]
    if bucket == "versioned":
        storage["enVersions"].setdefault(str(version), {})[identifier] = value
    else:
        storage[bucket][identifier] = value


def field_lines(values: dict, schema: Schema, indent="") -> list[str]:
    result = []
    for identifier, value in sorted(values.items()):
        identifier = guid(identifier)
        definition = schema.fields.get(identifier)
        if not definition:
            raise ValueError("Snapshot includes a field absent from the captured schema")
        result.extend([indent + "- ID: " + json.dumps(identifier), indent + "  Hint: " + json.dumps(definition["hint"])])
        if isinstance(value, dict):
            if set(value) != {"value", "blobId"}:
                raise ValueError("Unknown snapshot attachment metadata")
            result.append(indent + "  BlobID: " + json.dumps(guid(value["blobId"])))
            value = value["value"]
        if not isinstance(value, str):
            raise ValueError("Native preserved field value is not a string")
        # JSON strings are valid YAML and preserve newlines/trailing whitespace.
        result.append(indent + "  Value: " + json.dumps(value, ensure_ascii=False))
    return result


def serialize_item(item: dict, schema: Schema) -> str:
    storage = item["storage"]
    lines = ["---"] + [key + ": " + json.dumps(item[key]) for key in ("ID", "Parent", "Template", "Path")]
    if storage["shared"]:
        lines.append("SharedFields:")
        lines.extend(field_lines(storage["shared"], schema))
    languages = {"en": {"unversioned": storage["enUnversioned"], "versions": storage["enVersions"]}}
    languages.update(storage.get("otherLanguages", {}))
    lines.append("Languages:")
    for language, values in sorted(languages.items()):
        lines.append("- Language: " + json.dumps(language))
        if values.get("unversioned"):
            lines.append("  Fields:")
            lines.extend(field_lines(values["unversioned"], schema, "  "))
        lines.append("  Versions:")
        for version, fields in sorted(values.get("versions", {}).items(), key=lambda row: int(row[0])):
            if int(version) < 1:
                raise ValueError("Native version numbers must be positive")
            lines.append("  - Version: " + str(int(version)))
            if fields:
                lines.append("    Fields:")
                lines.extend(field_lines(fields, schema, "    "))
    return "\n".join(lines) + "\n"


def build_plan(manifest: dict, snapshot: dict, schema: Schema, routes: list[str], ledger=None, include_keys=()) -> dict:
    by_id, by_path = validate_snapshot(manifest, snapshot)
    selected = dependency_closure(manifest, snapshot, schema, routes, include_keys)
    previous = ledger or {}
    if previous and previous.get("target") != manifest["target"]:
        raise ValueError("Ledger belongs to another target")
    prior_items = previous.get("items", {})
    all_paths = {row["path"].casefold(): guid(row["id"]) for row in selected}
    all_paths.update({key: guid(row["id"]) for key, row in by_path.items()})
    operations, conflicts, unchanged = [], [], []
    selected_keys = {row["key"] for row in selected}
    exceptions = [e for e in manifest.get("exceptions", []) if e.get("key") == "target" or any(e.get("key", "") == key or e.get("key", "").startswith(key + ":") for key in selected_keys)]
    for record in selected:
        identifier, path, template_id = guid(record["id"]), record["path"], guid(record["templateId"])
        fields = {guid(k): v for k, v in record.get("fields", {}).items()}
        for field_id, storage in record.get("fieldStorage", {}).items():
            if guid(field_id) not in fields or schema.field(template_id, field_id)["storage"] != storage:
                raise ValueError("Candidate field storage claim differs from observed native schema")
        if any(SENSITIVE.search(schema.field(template_id, k)["hint"]) for k in fields):
            raise ValueError("Forbidden editorial field")
        parent_id = all_paths.get(path.rsplit("/", 1)[0].casefold())
        if not parent_id:
            raise ValueError("Actual parent identity is required")
        existing = by_id.get(identifier)
        occupant = by_path.get(path.casefold())
        if occupant and guid(occupant["id"]) != identifier:
            conflicts.append({"key": record["key"], "path": path, "reason": "path-identity-collision"})
            continue
        if not existing:
            if not captured_path(snapshot, path):
                raise ValueError("A complete native capture must prove create path absence")
            action, changes, version, storage = "create", fields, 1, empty_storage()
            precondition = {"itemAbsent": True, "pathAbsent": True}
        else:
            if existing["path"] != path or guid(existing["templateId"]) != template_id or guid(existing["parentId"]) != parent_id:
                reason = "native-home-template-migration-required" if record["key"] == "page:/" and guid(existing["templateId"]) != template_id else "existing-identity-template-or-parent-change"
                conflicts.append({"key": record["key"], "path": path, "reason": reason, "nativeTemplateId": guid(existing["templateId"]), "desiredTemplateId": template_id})
                continue
            current = {guid(k): v for k, v in existing.get("fields", {}).items()}
            saved = prior_items.get(identifier, {}).get("fields", {})
            changes, edited = {}, []
            for field_id, desired in fields.items():
                if field_id in current and current[field_id] == desired:
                    continue
                if field_id not in saved or field_id not in current or current[field_id] != saved[field_id]:
                    edited.append(field_id)
                else:
                    changes[field_id] = desired
            if edited:
                conflicts.append({"key": record["key"], "path": path, "reason": "author-edit-or-unadopted-field", "fields": edited})
                continue
            if not changes:
                unchanged.append(identifier)
                continue
            if not existing.get("revision"):
                conflicts.append({"key": record["key"], "path": path, "reason": "missing-revision-precondition"})
                continue
            guid(existing["revision"])
            action, version, storage = "update", int(existing["selectedVersion"]), preserved_storage(existing)
            precondition = {"revision": existing["revision"], "itemSha256": checksum(existing)}
        for field_id, value in changes.items():
            set_native_field(storage, schema.field(template_id, field_id), field_id, value, version)
        native = {"ID": identifier, "Parent": parent_id, "Template": template_id, "Path": path, "storage": storage}
        operations.append({"action": action, "key": record["key"], "id": identifier, "path": path, "templateId": template_id, "parentId": parent_id, "language": "en", "selectedVersion": version, "fields": changes, "precondition": precondition, "native": native})
    # All existing dependencies, including parents, linked media and unchanged
    # scaffold items, must stay identical through review and live preflight.
    dependencies = {identifier: {k: copy.deepcopy(row[k]) for k in ("id", "path", "templateId", "parentId", "selectedVersion", "revision", "storage", "languages")} for identifier, row in by_id.items()}
    report = {"schemaVersion": 1, "mode": "local-private-editorial-plan", "target": manifest["target"], "bindings": manifest.get("bindings", {}), "manifestSha256": checksum(manifest), "snapshotSha256": checksum(snapshot), "schemaSha256": checksum(schema.items), "capturedAt": snapshot["capturedAt"], "routes": routes, "includeKeys": list(include_keys), "selectedItemCount": len(selected), "operations": operations, "conflicts": conflicts, "sourceExceptions": exceptions, "unchangedIds": unchanged, "dependencyPreconditions": dependencies, "scaffoldPreconditions": copy.deepcopy(snapshot["scaffold"]), "reportedOrphanIds": [], "priorItemsOutsideSelectedScope": sorted(set(prior_items) - {guid(i["id"]) for i in selected}), "createApplyReady": not conflicts and not exceptions and bool(operations) and all(o["action"] == "create" for o in operations), "nativeExecutionEnabled": NATIVE_EXECUTION_ENABLED, "atomicRevisionPreconditions": False, "remoteWrites": 0, "limitations": ["SCS offers no atomic revision compare-and-swap; update execution is disabled", "Native execution is disabled until the live CLI alias/target integration is separately verified", "Existing items/fields are never silently adopted; native Home template migration is separate", "CreateOnly execution still requires a fresh complete snapshot and verified native readback", "No delete, Settings, users, roles, permission changes or publication"]}
    report["planSha256"] = checksum(report)
    return report


def private_output(output: Path, repo: Path = REPO) -> Path:
    if any(path.is_symlink() for path in (output, *output.parents)):
        raise ValueError("Private editorial storage cannot contain symbolic links")
    resolved = output.resolve()
    private_root = (repo / ".sitecore/allianz-editorial").resolve()
    if resolved == private_root or not resolved.is_relative_to(private_root):
        raise ValueError("Output must be a dedicated ignored .sitecore/allianz-editorial/<batch> directory")
    check = subprocess.run(["git", "check-ignore", "--quiet", str(resolved / "plan.json")], cwd=repo, capture_output=True)
    if check.returncode != 0:
        raise ValueError("Private editorial output is not Git-ignored")
    return resolved


def write_private(path: Path, content: str, *, replace=False) -> None:
    """Write local native values restrictively, refusing symlink destinations."""
    if any(part.is_symlink() for part in (path, *path.parents)):
        raise ValueError("Private native output cannot contain symbolic links")
    flags = os.O_WRONLY | os.O_CREAT | (os.O_TRUNC if replace else os.O_EXCL)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(path, flags, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        os.fchmod(stream.fileno(), 0o600)
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())
    directory = os.open(path.parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


def reviewed_module(report: dict) -> dict:
    includes = [{"name": "allianz.editorial." + str(index).zfill(5), "path": operation["path"], "scope": "SingleItem", "allowedPushOperations": "CreateOnly"} for index, operation in enumerate(report["operations"], 1)]
    return {"namespace": NAMESPACE, "description": "Private reviewed Allianz editorial import; updates disabled; excluded from deployItems.", "items": {"path": "items", "includes": includes}}


def write_plan(report: dict, schema: Schema, output: Path) -> dict:
    output = private_output(output)
    if output.exists():
        raise ValueError("Batch directory already exists; inspect its receipt before creating a new batch")
    output.mkdir(parents=True, mode=0o700)
    hashes = {}
    for index, operation in enumerate(report["operations"], 1):
        name = "allianz.editorial." + str(index).zfill(5)
        filename = Path("items") / name / (operation["path"].rsplit("/", 1)[-1] + ".yml")
        destination = output / filename
        destination.parent.mkdir(parents=True, mode=0o700)
        content = serialize_item(operation["native"], schema)
        write_private(destination, content)
        hashes[str(filename)] = hashlib.sha256(content.encode()).hexdigest()
    module = reviewed_module(report)
    write_private(output / (NAMESPACE + ".module.json"), json.dumps(module, indent=2) + "\n")
    report = copy.deepcopy(report)
    report["fileSha256"] = hashes
    report["moduleSha256"] = checksum(module)
    report["planSha256"] = checksum({k: v for k, v in report.items() if k != "planSha256"})
    write_private(output / "plan.json", json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    return report


def check_fresh(plan: dict, snapshot: dict, max_age_seconds=120) -> None:
    by_id, by_path = snapshot_parser.verify_snapshot(snapshot)
    if snapshot.get("target") != plan["target"] or snapshot.get("bindings", {}) != plan["bindings"]:
        raise ValueError("Fresh capture target/bindings changed")
    age = (datetime.now(timezone.utc) - timestamp(snapshot["capturedAt"])).total_seconds()
    if age < -5 or age > max_age_seconds:
        raise ValueError("Live precondition snapshot is stale or future-dated")
    # A fresh capture updates capturedAt/provenance only; compare native item,
    # scaffold, binding and completeness semantics rather than capture time.
    if snapshot["scaffold"] != plan["scaffoldPreconditions"]:
        raise ValueError("Native scaffold changed since review")
    for identifier, expected in plan["dependencyPreconditions"].items():
        actual = by_id.get(identifier)
        if not actual or {k: actual[k] for k in expected} != expected:
            raise ValueError("Native parent, media or unchanged dependency changed since review")
    for operation in plan["operations"]:
        existing = by_id.get(operation["id"])
        if operation["action"] == "create":
            if existing or operation["path"].casefold() in by_path or not captured_path(snapshot, operation["path"]):
                raise ValueError("Create preconditions changed since review")
        elif operation["action"] == "update":
            if not existing or existing.get("revision") != operation["precondition"]["revision"] or checksum(existing) != operation["precondition"]["itemSha256"]:
                raise ValueError("Author/native revision changed since review")
        else:
            raise ValueError("Delete and arbitrary operation types are not supported")


def verified_batch(output: Path) -> tuple[dict, dict]:
    output = private_output(output)
    plan = json.loads((output / "plan.json").read_text())
    unsigned = {k: v for k, v in plan.items() if k != "planSha256"}
    if checksum(unsigned) != plan["planSha256"]:
        raise ValueError("Reviewed plan changed after preparation")
    module = json.loads((output / (NAMESPACE + ".module.json")).read_text())
    if checksum(module) != plan["moduleSha256"] or module != reviewed_module(plan):
        raise ValueError("Private module changed after preparation")
    for filename, digest in plan["fileSha256"].items():
        path = (output / filename).resolve()
        if not path.is_relative_to(output) or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError("Serialized native values changed after preparation")
    expected_files = set()
    for index, operation in enumerate(plan["operations"], 1):
        filename = str(Path("items") / ("allianz.editorial." + str(index).zfill(5)) / (operation["path"].rsplit("/", 1)[-1] + ".yml"))
        expected_files.add(filename)
        path = output / filename
        if path.is_symlink():
            raise ValueError("Serialized item cannot be a symbolic link")
        native = snapshot_parser.read_scs(path)
        normalized = snapshot_parser.normalize_item(native)
        expected_native = operation["native"]
        if any(native[key] != expected_native[key] for key in ("ID", "Parent", "Template", "Path")) or preserved_storage(normalized) != expected_native["storage"]:
            raise ValueError("Serialized item differs from the exact reviewed native operation")
    if set(plan["fileSha256"]) != expected_files or {str(p.relative_to(output)) for p in (output / "items").rglob("*") if p.is_file()} != expected_files:
        raise ValueError("Serialized batch contains omitted or extra native item files")
    expected = [(o["path"], "SingleItem", "CreateOnly") for o in plan["operations"]]
    actual = [(i["path"], i["scope"], i["allowedPushOperations"]) for i in module["items"]["includes"]]
    if expected != actual or any(not allowed_editorial(p, plan["target"]["siteRoot"]) for p, _, _ in actual):
        raise ValueError("CLI module scope differs from the exact reviewed operations")
    return plan, module


def cli_config(output: Path, module: dict, *, readback=False) -> Path:
    root = output / ("readback-cli" if readback else "cli")
    if root.exists():
        raise ValueError("CLI directory exists; do not repeat an uncertain import")
    root.mkdir(mode=0o700)
    # Reuse the already approved local CLI cache by path; never read/copy tokens.
    (root / ".sitecore").symlink_to(REPO / ".sitecore", target_is_directory=True)
    runtime_module = copy.deepcopy(module)
    for include in runtime_module["items"]["includes"]:
        include["allowedPushOperations"] = "CreateOnly"
    runtime_module["items"]["path"] = "../readback-items" if readback else "../items"
    write_private(root / (NAMESPACE + ".module.json"), json.dumps(runtime_module, indent=2) + "\n")
    config = {"modules": [NAMESPACE + ".module.json"], "plugins": ["Sitecore.DevEx.Extensibility.Serialization@6.0.23"], "serialization": {"continueOnItemFailure": False, "excludedFields": [], "removeOrphansForRoles": False, "removeOrphansForUsers": False}, "settings": {"telemetryEnabled": False, "cacheAuthenticationToken": True, "versionComparisonEnabled": True}}
    write_private(root / "sitecore.json", json.dumps(config, indent=2) + "\n")
    return root


def command(args: list[str], output: Path, name: str) -> subprocess.CompletedProcess:
    # No verbose/trace, shell interpolation, credential output or retry loops.
    result = subprocess.run(args, cwd=REPO, capture_output=True, text=True)
    write_private(output / name, result.stdout + result.stderr)
    if result.returncode:
        raise RuntimeError(f"Pinned native CLI {name} failed; inspect private log, do not blindly retry")
    return result


def apply_creates(output: Path, fresh: dict, approval: dict) -> dict:
    if not NATIVE_EXECUTION_ENABLED:
        raise ValueError("Native execution is disabled: a separately reviewed live CLI alias/target binding is required")
    plan, module = verified_batch(output)
    output = private_output(output)
    if (output / "apply-receipt.json").exists():
        raise ValueError("An apply receipt already exists; resolve it before another mutation")
    if not plan["createApplyReady"] or not plan["operations"] or any(o["action"] != "create" for o in plan["operations"]):
        raise ValueError("SCS execution is limited to conflict-free reviewed creates")
    if approval.get("target") != plan["target"] or approval.get("planSha256") != plan["planSha256"] or approval.get("authorizeCreateOnly") is not True:
        raise ValueError("Exact target/plan create-only review authorization is required")
    check_fresh(plan, fresh)
    root = cli_config(output, module)
    pinned = json.loads((REPO / ".config/dotnet-tools.json").read_text())["tools"]["sitecore.cli"]["version"]
    if pinned != "6.0.23":
        raise ValueError("Native CLI version changed from reviewed pin")
    command(["dotnet", "sitecore", "ser", "validate", "-c", str(root)], output, "validate.log")
    preview = command(["dotnet", "sitecore", "ser", "push", "-c", str(root), "-n", "dev", "-i", NAMESPACE, "--what-if"], output, "preview.log")
    found = re.findall(r"^\[master\] \[([A-Z])\] (.+) \(([0-9a-fA-F-]{36})\)\s*$", preview.stdout, re.M)
    expected = {("A", o["path"], o["id"]) for o in plan["operations"]}
    if {(a, p, guid(i)) for a, p, i in found} != expected or len(found) != len(expected):
        raise ValueError("Live CLI preview differs from exact reviewed create operations")
    # Preview can take time: require the provided fresh capture still be recent.
    check_fresh(plan, fresh)
    receipt = {"target": plan["target"], "planSha256": plan["planSha256"], "status": "write-started-unverified", "startedAt": now(), "operationIds": [o["id"] for o in plan["operations"]], "atomicRevisionPreconditions": False, "runtimePushOperations": "CreateOnly"}
    receipt_path = output / "apply-receipt.json"
    write_private(receipt_path, json.dumps(receipt, indent=2) + "\n")
    # Durable receipt precedes mutation; a crash cannot be mistaken for absence.
    try:
        command(["dotnet", "sitecore", "ser", "push", "-c", str(root), "-n", "dev", "-i", NAMESPACE], output, "push.log")
        receipt["status"] = "native-cli-succeeded-awaiting-readback"
        receipt["writeCompletedAt"] = now()
        write_private(receipt_path, json.dumps(receipt, indent=2) + "\n", replace=True)
        readback_root = cli_config(output, module, readback=True)
        command(["dotnet", "sitecore", "ser", "pull", "-c", str(readback_root), "-n", "dev", "-i", NAMESPACE], output, "readback.log")
        receipt["status"] = "native-readback-pulled-awaiting-verification"
        receipt["readbackCompletedAt"] = now()
    except Exception:
        receipt["status"] += "; inspect logs and read back before retry"
        write_private(receipt_path, json.dumps(receipt, indent=2) + "\n", replace=True)
        raise
    write_private(receipt_path, json.dumps(receipt, indent=2) + "\n", replace=True)
    return receipt


def finalize_ledger(plan: dict, post: dict, receipt: dict, prior=None) -> dict:
    by_id, _ = snapshot_parser.verify_snapshot(post)
    if receipt.get("status") != "native-readback-pulled-awaiting-verification" or receipt.get("planSha256") != plan["planSha256"] or receipt.get("target") != plan["target"]:
        raise ValueError("A successful scoped CLI write/readback receipt is required")
    if receipt.get("operationIds") != [operation["id"] for operation in plan["operations"]]:
        raise ValueError("Readback receipt does not cover the exact reviewed operation IDs")
    if post.get("target") != plan["target"] or post.get("bindings", {}) != plan["bindings"]:
        raise ValueError("Post-write readback belongs to another target/binding")
    if timestamp(post["capturedAt"]) < timestamp(receipt["readbackCompletedAt"]):
        raise ValueError("Post-write native capture predates the completed write")
    previous = copy.deepcopy(prior or {"target": plan["target"], "items": {}})
    if previous.get("target") != plan["target"]:
        raise ValueError("Prior ledger belongs to another target")
    for operation in plan["operations"]:
        item = by_id.get(operation["id"])
        if not item or item["path"] != operation["path"] or guid(item["templateId"]) != operation["templateId"] or guid(item["parentId"]) != operation["parentId"]:
            raise ValueError("Native readback identity/template/parent differs from the reviewed item")
        if not item.get("revision"):
            raise ValueError("Native readback must expose the resulting revision")
        guid(item["revision"])
        if item["selectedVersion"] != operation["selectedVersion"]:
            raise ValueError("Native readback selected version differs from the reviewed operation")
        storage = preserved_storage(item)
        for field_id, expected in operation["fields"].items():
            if item["fields"].get(field_id) != expected:
                raise ValueError("Native field value did not round-trip; no successful ledger written")
            expected_storage = operation["native"]["storage"]
            # Verify the exact native storage location, not only flattened value.
            occurrences = []
            for bucket in ("shared", "enUnversioned"):
                if field_id in expected_storage[bucket]:
                    occurrences.append(storage[bucket].get(field_id))
            for version, values in expected_storage["enVersions"].items():
                if field_id in values:
                    occurrences.append(storage["enVersions"].get(version, {}).get(field_id))
            if not occurrences or any(field_value(v) != expected for v in occurrences):
                raise ValueError("Native field storage/version did not round-trip")
        # Every non-owned value in the reviewed native document must survive.
        # Only the written English version's revision may be regenerated. SCS
        # update execution remains disabled; this is also a future adapter gate.
        expected_storage = operation["native"]["storage"]
        for bucket in ("shared", "enUnversioned"):
            for field_id, value in expected_storage[bucket].items():
                if storage[bucket].get(field_id) != value:
                    raise ValueError("Native readback changed an unowned shared/unversioned value")
        for version, values in expected_storage["enVersions"].items():
            for field_id, value in values.items():
                if field_id == REVISION and version == str(operation["selectedVersion"]):
                    continue
                if storage["enVersions"].get(version, {}).get(field_id) != value:
                    raise ValueError("Native readback changed an unowned English version value")
        if storage.get("otherLanguages", {}) != expected_storage.get("otherLanguages", {}):
            raise ValueError("Native readback changed an unowned language/version")
        owned = previous["items"].get(operation["id"], {}).get("fields", {})
        owned.update(operation["fields"])
        previous["items"][operation["id"]] = {"key": operation["key"], "path": operation["path"], "templateId": operation["templateId"], "parentId": operation["parentId"], "fields": owned, "revision": item["revision"], "selectedVersion": item["selectedVersion"], "nativeReadbackSha256": checksum(item)}
    previous.update({"status": "native-readback-verified", "lastPlanSha256": plan["planSha256"], "lastReadbackSha256": checksum(post), "verifiedAt": now()})
    return previous


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    prepare = sub.add_parser("prepare", help="Local selection, validation and private SCS only")
    prepare.add_argument("manifest", type=Path)
    prepare.add_argument("--snapshot", required=True, type=Path)
    prepare.add_argument("--schema", required=True, type=Path)
    prepare.add_argument("--structure", type=Path, default=REPO / "authoring/allianz-life/structure-manifest.json")
    prepare.add_argument("--ledger", type=Path)
    prepare.add_argument("--route", required=True, action="append")
    prepare.add_argument("--include-key", action="append", default=[])
    prepare.add_argument("--output", required=True, type=Path)
    bind = sub.add_parser("bind-native", help="Local manifest binding to independently read-back scaffold UUIDs")
    bind.add_argument("manifest", type=Path)
    bind.add_argument("--snapshot", required=True, type=Path)
    bind.add_argument("--output", required=True, type=Path)
    apply = sub.add_parser("apply-creates", help="Authorized native CLI create-only writes; updates disabled")
    apply.add_argument("batch", type=Path)
    apply.add_argument("--fresh-snapshot", required=True, type=Path)
    apply.add_argument("--approval", required=True, type=Path)
    finish = sub.add_parser("finalize", help="Write successful ownership ledger only after verified native readback")
    finish.add_argument("batch", type=Path)
    finish.add_argument("--post-snapshot", required=True, type=Path)
    finish.add_argument("--prior-ledger", type=Path)
    finish.add_argument("--ledger-output", required=True, type=Path)
    args = parser.parse_args()
    read = lambda p: json.loads(p.read_text())
    if args.command == "prepare":
        snapshot = read(args.snapshot)
        schema = Schema.from_files(args.schema, args.structure, snapshot)
        plan = build_plan(read(args.manifest), snapshot, schema, args.route, read(args.ledger) if args.ledger else None, args.include_key)
        result = write_plan(plan, schema, args.output)
        print(json.dumps({k: result[k] for k in ("mode", "selectedItemCount", "createApplyReady", "remoteWrites")}))
    elif args.command == "bind-native":
        result = bind_native_scaffold(read(args.manifest), read(args.snapshot))
        destination = args.output.resolve()
        private_output(destination.parent)
        destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        write_private(destination, json.dumps(result, indent=2, ensure_ascii=False) + "\n")
        print(json.dumps({"mode": "local-native-binding", "boundKeys": len(result["bindings"]), "fieldAdoption": False, "remoteWrites": 0}))
    elif args.command == "apply-creates":
        result = apply_creates(args.batch, read(args.fresh_snapshot), read(args.approval))
        print(json.dumps({"status": result["status"], "operationCount": len(result["operationIds"])}))
    else:
        batch = private_output(args.batch)
        plan, _ = verified_batch(batch)
        receipt = read(batch / "apply-receipt.json")
        result = finalize_ledger(plan, read(args.post_snapshot), receipt, read(args.prior_ledger) if args.prior_ledger else None)
        destination = args.ledger_output.resolve()
        if not destination.is_relative_to((REPO / ".sitecore/allianz-editorial").resolve()):
            raise ValueError("Ownership ledger must remain in ignored private editorial storage")
        private_output(destination.parent)
        write_private(destination, json.dumps(result, indent=2, ensure_ascii=False) + "\n")
        receipt.update({"status": "native-readback-verified", "verifiedAt": result["verifiedAt"]})
        write_private(batch / "apply-receipt.json", json.dumps(receipt, indent=2) + "\n", replace=True)
        print(json.dumps({"status": result["status"], "ownedItems": len(result["items"])}))


if __name__ == "__main__":
    main()
