#!/usr/bin/env python3
"""Validate and serialize captured palette fields without native or release writes.

This model owns nine verified field values. Its inventories preserve observed
identities, raw reference order and unresolved dependencies, not complete items.
No SCS module is emitted; these partial snapshots must never be pushed to CM.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import uuid

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / "authoring/allianz-life/native-palette"
MODEL_PATH = ROOT / "verified-fields.json"
MAIN_ID = "cadb4233-34e7-5b85-b36f-0b8475f4cbd0"
COMPANY_ID = "2e7d5478-7676-440f-b873-ecc3d68bd284"
SECTION_PARENT = "0af6d2f6-7768-43df-bc9c-34da3ae83d3f"
SECTION_TEMPLATE = "76da0a8d-fc7e-42b2-af1e-205b49e43f98"
RENDERINGS_FIELD = "715ae6c0-71c8-4744-ab4f-65362d20ad65"
ALLOWED_FIELD = "e391b526-d0c5-439d-803e-17512eae6222"
DISPLAY_FIELD = "b5e02ad9-d56f-4c41-a065-a133db87bdeb"
SECTION_ROOT = "/sitecore/content/allianz/allianz-life/Presentation/Available Renderings"
SECTION_IDS = {
    "c3a08376-6399-48b8-903a-d0376671c8f3": "People",
    "18cc9b1d-79cd-4e15-aeb2-df21c6081511": "Navigation",
    "fc6e7695-eeef-4eca-a134-39afec227bdb": "Page Content",
    "4a618102-1c13-472e-b8ba-bca9ed27ece8": "Products",
    "91cacad8-db57-4097-ace3-38282cb32061": "Newsroom",
    "fb6f6341-b94d-4305-8ffe-e22eb32ba3a6": "Ventures",
    "55a88e67-a227-46be-9e1d-2a680e1a6943": "Forms",
}
TARGET = {
    "projectId": "7f3XlRhEqdT8l8FrbjQync",
    "environmentId": "56W3hhEUAQ5GLwsHAehRhe",
    "sitePath": "/sitecore/content/allianz/allianz-life",
}
SOURCE_BASE_COMMIT = "241b6912e9f25577f6ba89123ce79aa5adb2b7fc"
SOURCE_BASELINES = {
    "scripts/allianz-life/generate-structure.py": "1561286fe8bb9d5d61f551ddea5d44245558b488",
    "authoring/allianz-life/items/allianz.placeholders/Allianz Life/headless-main.yml": "e773fb44f72917ca0b647f8de42b4584fdc55a1b",
    "authoring/allianz-life/structure-manifest.json": "e2661a2b14c1cfd2eb8a8bd7acc797f401b9bb4b",
}
ITEM_KEYS = {"ID", "Parent", "Template", "Path", "SharedFields", "UnversionedFields", "VersionedFields"}
REFERENCE = re.compile(r"\{[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}\}")
RENDERING_ROOT = "/sitecore/layout/Renderings/Project/Allianz Life"
RENDERING_TEMPLATE = "04646a89-996f-4ee7-878a-ffdbf1f0ef0d"
CAPTURE_SOURCE = {
    "filename": "Palette-Source-Serialization-Handoff-2026-10-04.zip",
    "sha256": "027b98f2ef674c6b1e374b8ed5b8b9a5ffef9e016b9d2d1e2c9dec0020bc597a",
}
CAPTURE_AT = "2026-10-04T06:51:39.577612+00:00"
# Ordered fingerprints bind transformed records to the verified ZIP and its
# original receipt/CSV bytes. Updating a model's claimed hash cannot authorize
# invented identities, reordered observations or a different capture.
CAPTURE_ARRAYS = {
    "sectionInventory": {"recordCount": 14, "orderedSha256": "e40c0e5774b375ed12ebcbe0c4cf65396d8420bcf1296240a3462be5ae9098da", "sourceFile": "evidence/SOURCE-HANDOFF-FRESH-READONLY-RECEIPT.json", "sourceFileSha256": "622d89f0fe20e077d15e19d91cd728c7cff2fd10715fe44404fd7fa015bd2a85"},
    "rendererInventory": {"recordCount": 74, "orderedSha256": "91aaf326d9097b57d69ae41933b3761162d9fd12587c18fb25851e0445a77c80", "sourceFile": "PROJECT-COMPONENT-NAME-INVENTORY.csv", "sourceFileSha256": "d971a2dd889eead432b42e1fae4ca0d00ec2245a3087b035915e067c4c83626a"},
    "sitePaletteInventory": {"recordCount": 122, "orderedSha256": "0dff86157b06d2cfb639f24a1ed107c27eaf5535e538ce814e2c851c0c86bf3b", "sourceFile": "COMPLETE-SITE-PALETTE-NAME-INVENTORY.csv", "sourceFileSha256": "ec4ed3dc6c61f35ba6f1d727fe89de07a99f234a12a596b263df1e085d42eb5e"},
    "resolvedMainControls": {"recordCount": 59, "orderedSha256": "2afb463e96d3e503bc501671577b0596f2bba24ec3da178685ed62805e252d5a", "sourceFile": "RESOLVED-BODY-CONTROLS.csv", "sourceFileSha256": "59265dc6d98299d2fa8e601e55db427cf08e48268c4b32da0579eabd2397d55c"},
    "items": {"recordCount": 9, "orderedSha256": "ecb17915e06292907c169788b9c34a2c0e9c1247d39a579a9223af204eb0b856", "sourceFile": "NATIVE-PALETTE-SOURCE-SERIALIZATION-HANDOFF.json", "sourceFileSha256": "42113c3fc5cd53a946c993862c3c38551681be4e433cbba73137024f1ad0f4b2"},
    "originalMainRawReferences": {"recordCount": 40, "orderedSha256": "4d507d3da4efd153cedff75d2a16f304539ed4a9f0dbb000aa2d2c5ac571c266", "sourceFile": "NATIVE-PALETTE-SOURCE-SERIALIZATION-HANDOFF.json", "sourceFileSha256": "42113c3fc5cd53a946c993862c3c38551681be4e433cbba73137024f1ad0f4b2"},
}
SECTION_KEYS = {"itemId", "nativeItemName", "nativePath", "parentId", "templateId", "rawRenderings", "storage", "captureOrder", "includedInVerifiedDeltaProjection"}
RENDERER_KEYS = {"itemId", "nativeItemName", "nativePath", "templateId", "nativeVersionObserved", "inCurrentSitePalette", "technicalComponentName", "effectiveDisplayLabelBefore", "effectiveDisplayLabelCurrent", "effectiveCategoryCurrent", "allianzInNativeItemName", "allianzInTechnicalComponentName", "allianzInObservedDisplayLabel", "displayNameFieldId", "labelChangeThisPass", "labelObservationLimit"}
PALETTE_KEYS = {"componentId", "displayName", "technicalComponentName", "currentCategory", "inProjectInventory", "knownProjectNativePath", "allianzInDisplayName", "allianzInCategory"}
RESOLVED_KEYS = {"renderingId", "effectiveName"}


def ordered_fingerprint(records: list) -> str:
    return hashlib.sha256(json.dumps(records, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def _guid(value: str, label: str) -> None:
    try:
        if not isinstance(value, str) or str(uuid.UUID(value)) != value:
            raise ValueError("Noncanonical GUID")
    except (ValueError, TypeError, AttributeError) as error:
        raise ValueError(f"Malformed inventory GUID: {label}") from error


def _native_child_path(path: str, root: str, name: str) -> None:
    if not isinstance(name, str) or not name or name in (".", "..") or "/" in name or any(character in name for character in ("\n", "\r", "\x00")) or path != root + "/" + name:
        raise ValueError("Inventory native path/name differs from its structural root")


def _string_records(rows: list, keys: set[str], label: str) -> None:
    if not all(isinstance(row, dict) and set(row) == keys and all(isinstance(value, str) for value in row.values()) for row in rows):
        raise ValueError(f"Malformed inventory record schema: {label}")


def _csv_flags(row: dict, keys: tuple[str, ...]) -> None:
    if any(row[key] not in ("True", "False") for key in keys):
        raise ValueError("Malformed captured inventory boolean")


def validate_capture_provenance(model: dict) -> None:
    expected = {"captureSource": CAPTURE_SOURCE, "observedAtUtc": CAPTURE_AT, "arrays": CAPTURE_ARRAYS}
    if model.get("sourceEvidence") != CAPTURE_SOURCE or model.get("observedAtUtc") != CAPTURE_AT or model.get("inventoryProvenance") != expected:
        raise ValueError("Inventory provenance differs from the verified source capture")
    for key, capture in CAPTURE_ARRAYS.items():
        records = _rows(model, key, capture["recordCount"])
        if ordered_fingerprint(records) != capture["orderedSha256"]:
            raise ValueError(f"Inventory records/order differ from captured provenance: {key}")


def reference_ids(value: str) -> list[str]:
    parts = value.split("|")
    if not value or not all(REFERENCE.fullmatch(part) for part in parts):
        raise ValueError("Palette references must preserve the captured raw GUID list")
    ids = [part[1:-1].lower() for part in parts]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate palette reference")
    return ids


def _rows(model: dict, key: str, count: int) -> list:
    value = model.get(key)
    if not isinstance(value, list) or len(value) != count:
        raise ValueError(f"Palette model requires {count} {key} entries")
    return value


def validate_model(model: dict) -> dict:
    if not isinstance(model, dict) or model.get("schemaVersion") != 1:
        raise ValueError("Malformed palette model schema")
    if model.get("target") != TARGET or model.get("deployable") is not False or model.get("nativeWrites") != 0:
        raise ValueError("Palette model must remain source-only for the preserved target")
    if model.get("unversionedLanguage") != "en":
        raise ValueError("Palette display label must use unversioned English storage")
    if model.get("sourceBaseCommit") != SOURCE_BASE_COMMIT or not isinstance(model.get("fieldValueSha256"), dict):
        raise ValueError("Missing or malformed palette capture provenance")
    rows = _rows(model, "items", 9)
    if not all(isinstance(row, dict) and set(row) == ITEM_KEYS for row in rows):
        raise ValueError("Palette fields must not invent unrelated item metadata")
    by_id = {row["ID"]: row for row in rows}
    if len(by_id) != 9 or set(by_id) != set(SECTION_IDS) | {MAIN_ID, COMPANY_ID}:
        raise ValueError("Unexpected palette item scope, missing item, or duplicate identity")
    for item_id, row in by_id.items():
        for key in ("ID", "Parent", "Template"):
            try:
                uuid.UUID(row[key])
            except (ValueError, TypeError, AttributeError) as error:
                raise ValueError("Malformed palette identity") from error
        if item_id in SECTION_IDS:
            expected = (SECTION_ROOT + "/" + SECTION_IDS[item_id], SECTION_PARENT, SECTION_TEMPLATE)
            storage, field_id, hint = "SharedFields", RENDERINGS_FIELD, "Renderings"
        elif item_id == MAIN_ID:
            expected = ("/sitecore/layout/Placeholder Settings/Project/Allianz Life/headless-main", "6f99399d-e003-5a7d-a379-dc154ffea09c", "5c547d4e-7111-4995-95b0-6b561751bf2e")
            storage, field_id, hint = "SharedFields", ALLOWED_FIELD, "Allowed Controls"
        else:
            expected = ("/sitecore/layout/Renderings/Project/Allianz Life/About Allianz Life", "c4c92e66-b8c2-55e8-b500-5c9f122daa3f", "04646a89-996f-4ee7-878a-ffdbf1f0ef0d")
            storage, field_id, hint = "UnversionedFields", DISPLAY_FIELD, "__Display name"
        if (row["Path"], row["Parent"], row["Template"]) != expected:
            raise ValueError("Palette identity/path differs from the verified native item")
        for key in ("SharedFields", "UnversionedFields", "VersionedFields"):
            if not isinstance(row[key], list) or len(row[key]) != (1 if key == storage else 0):
                raise ValueError("Palette field storage or ownership differs from native")
        value = row[storage][0]
        if not isinstance(value, dict) or set(value) != {"ID", "Hint", "Value"} or value["ID"] != field_id or value["Hint"] != hint or not isinstance(value["Value"], str):
            raise ValueError("Unexpected palette field identity or value")
        if item_id == COMPANY_ID:
            if value["Value"] != "Company Profile":
                raise ValueError("Unverified Company Profile display label")
        else:
            reference_ids(value["Value"])
        if model.get("fieldValueSha256", {}).get(item_id) != hashlib.sha256(value["Value"].encode()).hexdigest():
            raise ValueError("Palette field differs from the captured value/order")
    sections = _rows(model, "sectionInventory", 14)
    if not all(isinstance(row, dict) and set(row) == SECTION_KEYS for row in sections):
        raise ValueError("Malformed inventory record schema: sectionInventory")
    if len({row["itemId"] for row in sections}) != 14:
        raise ValueError("Duplicate captured section identity")
    for index, section in enumerate(sections):
        for key in ("itemId", "parentId", "templateId"):
            _guid(section[key], "sectionInventory." + key)
        _native_child_path(section["nativePath"], SECTION_ROOT, section["nativeItemName"])
        if type(section["captureOrder"]) is not int or section["captureOrder"] != index or section["parentId"] != SECTION_PARENT or section["templateId"] != SECTION_TEMPLATE:
            raise ValueError("Captured section identity/order changed")
        if section["storage"] != "shared" or type(section["includedInVerifiedDeltaProjection"]) is not bool or section["includedInVerifiedDeltaProjection"] != (section["itemId"] in SECTION_IDS):
            raise ValueError("Captured section storage/projection ownership changed")
        reference_ids(section["rawRenderings"])
        if section["itemId"] in SECTION_IDS and section["rawRenderings"] != by_id[section["itemId"]]["SharedFields"][0]["Value"]:
            raise ValueError("Section inventory and verified membership disagree")
    renderers = _rows(model, "rendererInventory", 74)
    palette = _rows(model, "sitePaletteInventory", 122)
    resolved = _rows(model, "resolvedMainControls", 59)
    _string_records(renderers, RENDERER_KEYS, "rendererInventory")
    _string_records(palette, PALETTE_KEYS, "sitePaletteInventory")
    _string_records(resolved, RESOLVED_KEYS, "resolvedMainControls")
    if len({row["itemId"] for row in renderers}) != 74 or len({row["componentId"] for row in palette}) != 122 or len({row["renderingId"] for row in resolved}) != 59:
        raise ValueError("Duplicate captured renderer or palette identity")
    by_renderer = {row["itemId"]: row for row in renderers}
    by_palette = {row["componentId"]: row for row in palette}
    for renderer in renderers:
        for key in ("itemId", "templateId", "displayNameFieldId"):
            _guid(renderer[key], "rendererInventory." + key)
        _native_child_path(renderer["nativePath"], RENDERING_ROOT, renderer["nativeItemName"])
        if renderer["templateId"] != RENDERING_TEMPLATE or renderer["displayNameFieldId"] != DISPLAY_FIELD:
            raise ValueError("Inventory renderer template or display-field identity changed")
        _csv_flags(renderer, ("inCurrentSitePalette", "allianzInNativeItemName", "allianzInTechnicalComponentName", "allianzInObservedDisplayLabel"))
        if not re.fullmatch(r"0|[1-9][0-9]*", renderer["nativeVersionObserved"]):
            raise ValueError("Malformed captured native renderer version")
        active_renderer = renderer["inCurrentSitePalette"] == "True"
        if active_renderer != (renderer["itemId"] in by_palette):
            raise ValueError("Renderer active status differs from the captured site palette")
        if active_renderer:
            current = by_palette[renderer["itemId"]]
            if renderer["nativeVersionObserved"] == "0" or not renderer["technicalComponentName"] or any(renderer[left] != current[right] for left, right in (("nativePath", "knownProjectNativePath"), ("technicalComponentName", "technicalComponentName"), ("effectiveDisplayLabelCurrent", "displayName"), ("effectiveCategoryCurrent", "currentCategory"))):
                raise ValueError("Renderer metadata differs from the captured site palette")
        elif renderer["nativeVersionObserved"] != "0" or any(renderer[key] for key in ("technicalComponentName", "effectiveDisplayLabelCurrent", "effectiveCategoryCurrent")):
            raise ValueError("Versionless renderer must not invent an active binding or label")
    for component in palette:
        _guid(component["componentId"], "sitePaletteInventory.componentId")
        _csv_flags(component, ("inProjectInventory", "allianzInDisplayName", "allianzInCategory"))
        if not component["displayName"] or not component["technicalComponentName"] or not component["currentCategory"]:
            raise ValueError("Active palette metadata must retain its observed names/category")
        in_project = component["inProjectInventory"] == "True"
        if in_project != (component["componentId"] in by_renderer):
            raise ValueError("Palette project membership differs from native renderer inventory")
        if in_project:
            renderer = by_renderer[component["componentId"]]
            _native_child_path(component["knownProjectNativePath"], RENDERING_ROOT, renderer["nativeItemName"])
        elif component["knownProjectNativePath"]:
            raise ValueError("Non-project palette item must not invent a native project path")
    for control in resolved:
        _guid(control["renderingId"], "resolvedMainControls.renderingId")
        component = by_palette.get(control["renderingId"])
        if component is None or control["effectiveName"] != component["displayName"]:
            raise ValueError("Resolved Main control label differs from captured active palette")
    original = _rows(model, "originalMainRawReferences", 40)
    main = by_id[MAIN_ID]["SharedFields"][0]["Value"]
    if main.split("|")[:40] != original or len(reference_ids(main)) != 67:
        raise ValueError("Main must preserve all 40 original raw references and 27 additions")
    active = {row["componentId"] for row in palette}
    if {row["renderingId"] for row in resolved} != set(reference_ids(main)) & active:
        raise ValueError("Main active-resolution evidence differs from raw references")
    validate_capture_provenance(model)
    return model


def load_model(path: Path = MODEL_PATH) -> dict:
    try:
        model = json.loads(path.read_text())
        return validate_model(model)
    except (OSError, json.JSONDecodeError, KeyError, TypeError, AttributeError, IndexError, StopIteration) as error:
        raise ValueError("Missing or malformed captured palette projection") from error


def verify_source_baselines(model: dict, repo: Path) -> None:
    """Guard existing files before applying this source change to another checkout."""
    baseline = model.get("historicalSourceBaseline", {})
    if not isinstance(baseline, dict):
        raise ValueError("Missing or unexpected exact source baselines")
    entries = baseline.get("files", [])
    if not isinstance(entries, list) or not all(isinstance(row, dict) and set(row) == {"path", "gitBlobSha"} for row in entries) or baseline.get("commit") != SOURCE_BASE_COMMIT or len(entries) != 3 or {row["path"]: row["gitBlobSha"] for row in entries} != SOURCE_BASELINES:
        raise ValueError("Missing or unexpected exact source baselines")
    for path, expected in SOURCE_BASELINES.items():
        try:
            content = (repo / path).read_bytes()
        except OSError as error:
            raise ValueError(f"Missing baseline file: {path}") from error
        actual = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()
        if actual != expected:
            raise ValueError(f"Source baseline changed: {path}")


def override_main(row: dict, model: dict) -> dict:
    captured = next(item for item in model["items"] if item["ID"] == MAIN_ID)
    if any(row[key] != captured[key] for key in ("ID", "Parent", "Template", "Path")):
        raise ValueError("Historical Main identity does not match the captured native item")
    result = copy.deepcopy(row)
    fields = [field for field in result["SharedFields"] if field["ID"] == ALLOWED_FIELD]
    if len(fields) != 1:
        raise ValueError("Historical Main must contain exactly one Allowed Controls field")
    fields[0]["Value"] = captured["SharedFields"][0]["Value"]
    return result


def snapshot_path(row: dict) -> Path:
    if row["ID"] in SECTION_IDS:
        return Path("available-renderings") / (SECTION_IDS[row["ID"]] + ".yml")
    if row["ID"] == MAIN_ID:
        return Path("placeholders/headless-main.yml")
    return Path("renderings/About Allianz Life.yml")


def dependency_report(model: dict, historical: list[dict]) -> dict:
    historical_by_id = {row["ID"]: row for row in historical}
    renderers = {row["itemId"]: row for row in model["rendererInventory"]}
    active = {row["componentId"]: row for row in model["sitePaletteInventory"]}
    references: dict[str, list[str]] = {}
    for row in model["items"]:
        for field in row["SharedFields"]:
            for item_id in reference_ids(field["Value"]):
                references.setdefault(item_id, []).append(row["ID"])
    targets = []
    for item_id, consumers in references.items():
        native = renderers.get(item_id, {})
        site = active.get(item_id, {})
        old = historical_by_id.get(item_id)
        targets.append({"itemId": item_id, "nativePath": native.get("nativePath") or None, "nativeItemName": native.get("nativeItemName") or None, "technicalComponentNameObserved": native.get("technicalComponentName") or site.get("technicalComponentName") or None, "effectiveDisplayLabelObserved": site.get("displayName") or None, "nativeVersionObserved": native.get("nativeVersionObserved") or None, "inCurrentSitePalette": item_id in active, "historicalSerializedDefinitionPath": old["Path"] if old else None, "completeCurrentNativeSerializationVerified": False, "consumingItemIds": consumers})
    missing = [row for row in targets if row["historicalSerializedDefinitionPath"] is None]
    raw_main = reference_ids(next(row for row in model["items"] if row["ID"] == MAIN_ID)["SharedFields"][0]["Value"])
    return {"status": "incomplete-native-serialization; field-only evidence", "deployable": False, "nativeWrites": 0, "sourceBaseCommit": model["sourceBaseCommit"], "verifiedFieldCount": 9, "referenceTargetCount": len(targets), "historicalDefinitionPresentCount": len(targets) - len(missing), "missingHistoricalDefinitionCount": len(missing), "missingHistoricalDefinitions": missing, "mainUnresolvedActiveReferenceIds": [item_id for item_id in raw_main if item_id not in active], "referenceTargetsInCapturedOrder": targets, "remainingDependencies": ["Capture complete current native rendering fields and their storage/field identities", "Capture each native datasource template, fields, child templates, parameters template and source/query dependencies", "Capture native Available Renderings parent/template definitions and verify platform renderer dependencies", "Compare current native metadata with historical definitions; historical presence does not establish native agreement", "Verify Pages category grouping and insertion separately; the current component API still reports Allianz Life"]}


def write_snapshots(model: dict, serializer, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for row in model["items"]:
        path = destination / snapshot_path(row)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(serializer(row))


def main() -> None:
    import importlib.util
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, default=MODEL_PATH)
    parser.add_argument("--output", type=Path, default=ROOT)
    parser.add_argument("--check-source-baseline", type=Path, help="Check exact original file blobs at this checkout before applying the source handoff")
    args = parser.parse_args()
    model = load_model(args.model)
    if args.check_source_baseline is not None:
        verify_source_baselines(model, args.check_source_baseline)
        print(json.dumps({"status": "exact-source-baselines-match", "commit": SOURCE_BASE_COMMIT, "fileCount": 3, "nativeWrites": 0}))
        return
    spec = importlib.util.spec_from_file_location("allianz_structure", Path(__file__).with_name("generate-structure.py"))
    structure = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(structure)
    historical, _ = structure.generate()
    write_snapshots(model, structure.serialize, args.output / "field-values")
    report = dependency_report(model, historical)
    (args.output / "dependency-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ("status", "verifiedFieldCount", "referenceTargetCount", "missingHistoricalDefinitionCount", "deployable", "nativeWrites")}))


if __name__ == "__main__":
    main()
