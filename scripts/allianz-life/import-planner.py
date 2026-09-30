#!/usr/bin/env python3
"""Plan non-destructive Allianz imports from local evidence; never contact a server.

Input manifest, snapshot, and prior ledger files are explicit. A write adapter must
apply these operations through a verified native API with revision preconditions.
No credentials, delete operation, or guessed authoring API are implemented here.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, urlunsplit
import uuid

NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "https://www.allianzlife.com/sitecoreai-demo")
TARGET_KEYS = ("projectId", "environmentId", "siteId", "siteRoot", "mediaRoot")
FORBIDDEN_FIELD = re.compile(r"security|password|secret|token|api.?key", re.I)
SOURCE_HOST = "www.allianzlife.com"
BUILTIN_IMPORT_FIELDS = {"04bf00db-f5fb-41f7-8ab7-22408372a981", "f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e"}


def approved_native_field_ids() -> set[str]:
    manifest_path = Path(__file__).resolve().parents[2] / "authoring/allianz-life/structure-manifest.json"
    if not manifest_path.exists():
        return set()
    definitions = json.loads(manifest_path.read_text()).get("items", [])
    return {item["ID"].lower() for item in definitions if item["Template"].lower() == "455a3e98-a627-4b40-8035-e683a0331ac7"} | BUILTIN_IMPORT_FIELDS


def canonical_source(value: str) -> str:
    parts = urlsplit(value)
    if parts.scheme != "https" or parts.netloc.lower() != SOURCE_HOST:
        raise ValueError("Source must use HTTPS on www.allianzlife.com")
    if parts.username or parts.password:
        raise ValueError("Credentials are not permitted in a source URL")
    # Preserve source path casing; marketing queries and fragment are not identity.
    return urlunsplit(("https", SOURCE_HOST, parts.path or "/", "", ""))


def item_id(key: str) -> str:
    return str(uuid.uuid5(NAMESPACE, key))


def checksum(value: object) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def inside(path: str, root: str) -> bool:
    return path == root or path.startswith(root.rstrip("/") + "/")


def validate_target(target: dict, snapshot_target: dict) -> None:
    for key in TARGET_KEYS:
        value = target.get(key)
        if not value or value != snapshot_target.get(key):
            raise ValueError(f"Missing or mismatched verified target: {key}")
    for key in ("projectId", "environmentId"):
        if not re.fullmatch(r"[A-Za-z0-9_-]{6,128}", target[key]):
            raise ValueError("Unexpected opaque SitecoreAI target identity")
    uuid.UUID(target["siteId"])
    site_root = target["siteRoot"]
    if not isinstance(site_root, str) or site_root.casefold() != "/sitecore/content/Allianz/allianz-life".casefold():
        raise ValueError("Site root must identify the verified Allianz/allianz-life site")
    if target["mediaRoot"] != "/sitecore/media library/Project/Allianz Life":
        raise ValueError("Unexpected media import root")


def plan(manifest: dict, snapshot: dict, ledger: dict | None = None, allow_incomplete_preview: bool = False) -> dict:
    target = manifest.get("target", {})
    validate_target(target, snapshot.get("target", {}))
    if manifest.get("language") != "en":
        raise ValueError("This import is limited to public English content")
    incomplete = manifest.get("readyForImport") is False
    if incomplete and not allow_incomplete_preview:
        raise ValueError("Manifest contains unresolved content/media/schema exceptions; only an explicit incomplete preview can be planned")
    previous = ledger or {}
    if previous and previous.get("target") != target:
        raise ValueError("Import ledger belongs to a different target")
    current_items = snapshot.get("items", [])
    by_id = {str(uuid.UUID(i["id"])): i for i in current_items}
    by_path = {i["path"]: i for i in current_items}
    if len(by_id) != len(current_items) or len(by_path) != len(current_items):
        raise ValueError("Snapshot contains duplicate identities")
    prior_items = previous.get("items", {})
    records = manifest.get("items", [])
    bindings = manifest.get("bindings", {})
    if bindings != snapshot.get("bindings", {}):
        raise ValueError("Native identity bindings are not independently verified in the snapshot")
    if len(set(bindings.values())) != len(bindings):
        raise ValueError("Native identity bindings must be one-to-one")
    for key, value in bindings.items():
        identifier = str(uuid.UUID(value))
        if identifier not in by_id:
            raise ValueError("A native identity binding points to an item absent from the verified snapshot")
    planned_ids: set[str] = set()
    planned_paths: set[str] = set()
    operations, conflicts, unchanged = [], [], []
    approved_fields = approved_native_field_ids()

    for record in records:
        key, path = record["key"], record["path"]
        identifier = str(uuid.UUID(bindings[key])) if key in bindings else item_id(key)
        if record.get("id") and record["id"].lower() != identifier:
            raise ValueError(f"Unexpected deterministic ID for {key}")
        if identifier in planned_ids or path in planned_paths:
            raise ValueError("Manifest contains duplicate keys or paths")
        planned_ids.add(identifier)
        planned_paths.add(path)
        is_media = record.get("kind") == "media"
        root = target["mediaRoot"] if is_media else target["siteRoot"]
        if not inside(path, root) or ".." in path.split("/"):
            raise ValueError(f"Item escapes its allowed import root: {path}")
        if not is_media and inside(path, target["siteRoot"] + "/Settings"):
            raise ValueError("Native site settings require a separately reviewed bootstrap")
        if record.get("access") != "public" or record.get("language", "en") != "en":
            raise ValueError("Source record is not verified public English content")
        canonical_source(record["sourceUrl"])
        fields = copy.deepcopy(record.get("fields", {}))
        if any(FORBIDDEN_FIELD.search(name) for name in fields):
            raise ValueError("Import cannot change credentials, security, or permissions")
        for name in fields:
            if re.fullmatch(r"[0-9a-fA-F-]{36}", name) and name.lower() not in approved_fields:
                raise ValueError("Native field GUID is outside the approved Allianz contract")
        uuid.UUID(record["templateId"])
        existing = by_id.get(identifier)
        occupant = by_path.get(path)
        if occupant and str(uuid.UUID(occupant["id"])) != identifier:
            conflicts.append({"key": key, "path": path, "reason": "path-identity-collision"})
            continue
        if not existing:
            operations.append({
                "action": "create", "key": key, "id": identifier, "path": path,
                "templateId": record["templateId"], "language": "en", "fields": fields,
                "binary": copy.deepcopy(record.get("binary")),
                "precondition": {"itemAbsent": True, "pathAbsent": True},
            })
            continue
        if existing.get("path") != path or existing.get("templateId", "").lower() != record["templateId"].lower():
            conflicts.append({"key": key, "path": path, "reason": "existing-identity-or-template-change"})
            continue
        saved = prior_items.get(identifier, {})
        current_fields = existing.get("fields", {})
        prior_fields = saved.get("fields", {})
        changes = {}
        field_conflicts = []
        for name, desired in fields.items():
            present = name in current_fields
            current = current_fields.get(name)
            if present and current == desired:
                continue
            # Existing items without a successful ledger are never silently adopted.
            if name not in prior_fields or not present or current != prior_fields[name]:
                field_conflicts.append(name)
            else:
                changes[name] = desired
        binary = record.get("binary")
        if binary and binary != existing.get("binary"):
            if not saved.get("binary") or existing.get("binary") != saved["binary"]:
                field_conflicts.append("[media binary]")
        else:
            binary = None
        if field_conflicts:
            conflicts.append({"key": key, "path": path, "reason": "author-edit-or-unadopted-field", "fields": field_conflicts})
            # Atomic per-item: never partially update a conflicted datasource.
            continue
        if changes or binary:
            if not existing.get("revision"):
                conflicts.append({"key": key, "path": path, "reason": "missing-revision-precondition"})
                continue
            operations.append({
                "action": "update", "key": key, "id": identifier, "path": path,
                "language": "en", "fields": changes, "binary": copy.deepcopy(binary),
                "precondition": {"revision": existing["revision"]},
            })
        else:
            unchanged.append(identifier)
    # Removed source records become reports; no delete operation exists.
    orphans = sorted(set(prior_items) - planned_ids)
    return {
        "mode": "dry-run", "target": target, "manifestSha256": checksum(manifest),
        "snapshotSha256": checksum(snapshot), "operations": operations,
        "conflicts": conflicts, "unchangedIds": unchanged, "reportedOrphanIds": orphans,
        "applyReady": not conflicts and not incomplete,
        "limitations": ["No remote writer configured", "Live apply requires verified native API and revision checks", "No delete or permission changes"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--ledger", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--allow-incomplete-preview", action="store_true", help="Preview only: keep applyReady false when source/model exceptions remain")
    args = parser.parse_args()
    report = plan(json.loads(args.manifest.read_text()), json.loads(args.snapshot.read_text()), json.loads(args.ledger.read_text()) if args.ledger else None, args.allow_incomplete_preview)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"mode": report["mode"], "operations": len(report["operations"]), "conflicts": len(report["conflicts"]), "unchanged": len(report["unchangedIds"]), "reportedOrphans": len(report["reportedOrphanIds"])}))


if __name__ == "__main__":
    main()
