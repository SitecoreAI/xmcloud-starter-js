#!/usr/bin/env python3
"""Prepare private, create-only native SCS media YAML; never contact Sitecore.

This uses the BlobID + base64 SharedFields format already present in the starter
repository's serialized public media. Verify one item by native push/pull and
SHA256 before applying the remaining reviewed media. Output must remain outside
the repository deploy module glob; binaries are never structural IAR content.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import uuid

SCRIPT_ROOT = Path(__file__).resolve().parent
REPO = SCRIPT_ROOT.parents[1]
spec = importlib.util.spec_from_file_location("planner", SCRIPT_ROOT / "import-planner.py")
planner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(planner)
MEDIA_ROOT = "/sitecore/media library/Project/Allianz Life"
FIELDS = {
    "Blob": "40e50ed9-ba07-4702-992e-a912738d32dc",
    "Mime Type": "6f47a0a5-9c94-4b48-abeb-42d38def6054",
    "Size": "6954b7c7-2487-423f-8600-436cb3b6dc0e",
    "Extension": "c06867fe-9a43-4c7d-b739-48780492d06f",
    "Alt": "65885c44-8fcd-4a7f-94f1-ee63703fe193",
    "Width": "22eac599-f13b-4607-a89d-c091763a467d",
    "Height": "de2ca9e4-c117-4c8a-a139-1ff4b199d15a",
}


def dump_item(item: dict) -> str:
    lines = ["---"] + [key + ": " + json.dumps(item[key]) for key in ("ID", "Parent", "Template", "Path")]
    if item.get("SharedFields"):
        lines.append("SharedFields:")
        for field in item["SharedFields"]:
            lines.extend(['- ID: "' + field["ID"] + '"', "  Hint: " + field["Hint"]])
            if field.get("BlobID"):
                lines.append('  BlobID: "' + field["BlobID"] + '"')
            lines.append("  Value: " + json.dumps(field["Value"], ensure_ascii=False))
    return "\n".join(lines) + "\n"


def prepare(manifest: dict, snapshot: dict, schema: dict, output: Path, limit: int | None = None) -> dict:
    if output.resolve().is_relative_to(REPO.resolve()):
        raise ValueError("Private media output must be outside the public repository")
    target = manifest["target"]
    if target.get("projectId") != "7f3XlRhEqdT8l8FrbjQync" or target.get("environmentId") != "56W3hhEUAQ5GLwsHAehRhe" or target.get("mediaRoot") != MEDIA_ROOT:
        raise ValueError("Media target is not the verified preserved project/environment")
    if any(snapshot.get("target", {}).get(key) != target.get(key) for key in ("projectId", "environmentId", "mediaRoot")):
        raise ValueError("Media snapshot belongs to a different target")
    by_path = {item["path"]: item for item in snapshot.get("items", [])}
    parent = by_path.get("/sitecore/media library/Project")
    if not parent:
        raise ValueError("Read-only native Project media parent metadata is required")
    native = {item["path"]: item for item in schema["items"]}
    folder_template = native.get("/sitecore/templates/System/Media/Media folder", {}).get("id")
    if not folder_template or not set(FIELDS.values()).issubset({item["id"] for item in schema["items"]}):
        raise ValueError("Media templates/fields must resolve from the verified tenant schema")
    values = []
    ids = {"/sitecore/media library/Project": parent["id"]}
    for path in (MEDIA_ROOT, MEDIA_ROOT + "/Images", MEDIA_ROOT + "/Documents"):
        existing = by_path.get(path)
        identifier = existing["id"] if existing else planner.item_id("media-folder:" + path)
        ids[path] = identifier
        values.append({"ID": identifier, "Parent": ids[path.rsplit("/", 1)[0]], "Template": folder_template, "Path": path, "SharedFields": []})
    candidates = manifest.get("mediaUploads", [])
    # Pilot the smallest genuine binary for cheap round-trip verification.
    candidates = sorted(candidates, key=lambda item: (item["binary"]["bytes"], item["path"]))
    if limit is not None:
        candidates = candidates[:limit]
    verify = []
    for record in candidates:
        planner.canonical_source(record["sourceUrl"])
        if not planner.inside(record["path"], MEDIA_ROOT) or record.get("access") != "public":
            raise ValueError("Media escapes its authorized public import root")
        existing = by_path.get(record["path"])
        if existing and existing["id"].lower() != record["id"].lower():
            raise ValueError("Media path/identity collision requires review")
        if record["id"].lower() != planner.item_id(record["key"]):
            raise ValueError("Unexpected deterministic media identity")
        binary = record["binary"]
        path = Path(binary["localPath"])
        if not path.is_absolute():
            path = REPO / path
        content = path.read_bytes()
        digest = hashlib.sha256(content).hexdigest()
        if digest != binary["sha256"] or len(content) != binary["bytes"]:
            raise ValueError("Local binary changed after the reviewed source manifest")
        blob_id = planner.item_id("blob:sha256:" + digest)
        fields = [{"ID": FIELDS["Blob"], "Hint": "Blob", "BlobID": blob_id, "Value": base64.b64encode(content).decode("ascii")}]
        for name, value in (("Mime Type", binary["mimeType"]), ("Size", len(content)), ("Extension", path.suffix.lstrip(".")), ("Width", binary.get("width")), ("Height", binary.get("height"))):
            if value is not None:
                fields.append({"ID": FIELDS[name], "Hint": name, "Value": str(value)})
        values.append({"ID": record["id"], "Parent": ids[record["path"].rsplit("/", 1)[0]], "Template": record["templateId"], "Path": record["path"], "SharedFields": fields})
        verify.append({"id": record["id"], "path": record["path"], "blobId": blob_id, "sha256": digest, "bytes": len(content), "sourceUrl": record["sourceUrl"], "sourceAliases": record.get("sourceAliases", [])})
    output.mkdir(parents=True, exist_ok=True)
    for value in values:
        relative = value["Path"][len(MEDIA_ROOT.rsplit("/", 1)[0]) + 1:] + ".yml"
        destination = output / "items/allianz.media" / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(dump_item(value))
    module = {"namespace": "AllianzLife.EditorialMedia", "description": "Private reviewed create-only media import, excluded from deployItems IAR.", "items": {"path": "items", "includes": [{"name": "allianz.media", "path": MEDIA_ROOT, "scope": "ItemAndDescendants", "allowedPushOperations": "CreateOnly"}]}}
    (output / "AllianzLife.EditorialMedia.module.json").write_text(json.dumps(module, indent=2) + "\n")
    report = {"mode": "local-private-media-serialization", "target": target, "namespace": module["namespace"], "itemCount": len(values), "mediaCount": len(verify), "totalBytes": sum(item["bytes"] for item in verify), "operations": "CreateOnly; existing fields/binaries skipped", "readbackVerification": verify, "remoteWrites": 0, "nativeRoundTripVerified": False, "applyPrerequisites": ["Copy reviewed directory to ignored .sitecore/allianz-media and temporarily include exact module", "Native CLI validate + push --what-if -n dev --include AllianzLife.EditorialMedia", "Verify only intended media root create operations, then root executes push without --what-if", "Narrow native pull of pilot item, decode Blob Value and compare SHA256", "Remove temporary module registration; never add this module to deployItems"]}
    (output / "media-serialization-report.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--snapshot", required=True, type=Path)
    parser.add_argument("--schema", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    result = prepare(json.loads(args.manifest.read_text()), json.loads(args.snapshot.read_text()), json.loads(args.schema.read_text()), args.output, args.limit)
    print(json.dumps({key: result[key] for key in ("mode", "itemCount", "mediaCount", "totalBytes", "remoteWrites")}))


if __name__ == "__main__":
    main()
