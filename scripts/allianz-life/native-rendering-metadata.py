"""Apply ID-matched, evidence-pinned metadata within separate source boundaries.

The source projection is historical and incomplete. This does not synchronize
CM or make its complete serialized rendering items safe to import. Native-only
ordinary-field projections do not add definitions to the historical generator.
"""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parents[2] / "authoring/allianz-life/native-metadata/verified-rendering-metadata.json"
MODEL_SHA256 = "fdaa30e76dec3d093b57284e8c715e4a6877006cfa052ef6113fdfff9684d5e4"
ICON_ID = "06d5295c-ed2f-4a54-9bf2-26228d113318"
DISPLAY_NAME_ID = "b5e02ad9-d56f-4c41-a065-a133db87bdeb"
COMPONENT_NAME_ID = "037fe404-dd19-4bf7-8e30-4dadf68b27b0"


def load_model(path: Path = MODEL_PATH) -> dict:
    model = json.loads(path.read_text())
    fingerprint = hashlib.sha256(json.dumps(model, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    if fingerprint != MODEL_SHA256:
        raise ValueError("Native rendering metadata differs from the reviewed evidence capture")
    return model


def _existing_field(row: dict, section: str, field_id: str, hint: str) -> dict:
    matches = [field for field in row[section] if field["ID"] == field_id]
    if len(matches) != 1 or matches[0]["Hint"] != hint:
        raise ValueError("Expected one existing native metadata field in its verified storage")
    for other in ("SharedFields", "UnversionedFields", "VersionedFields"):
        if other != section and any(field["ID"] == field_id for field in row[other]):
            raise ValueError("Native metadata field also appears in an unverified storage section")
    return matches[0]


def apply(row: dict, model: dict) -> dict:
    """Preserve all fields except explicitly verified Path/icon/English label.

    Missing records, including all eight version-0 definitions, stay untouched.
    Item IDs continue to come from the historical identity path, never the new
    author-facing name. No field is synthesized from an absent native value.
    """
    record = next((value for value in model["records"] if value["itemId"] == row["ID"]), None)
    if record is None:
        return row
    if (row["Parent"] != record["parentId"] or row["Template"] != record["templateId"]
            or row["Path"] not in (record["historicalPath"], record["currentPath"])):
        raise ValueError("Native rendering metadata does not match the source identity")
    result = copy.deepcopy(row)
    binding = _existing_field(result, "SharedFields", COMPONENT_NAME_ID, "componentName")
    if binding["Value"] != record["technicalComponentName"]:
        raise ValueError("Native rendering metadata technical binding mismatch")
    result["Path"] = record["currentPath"]
    for key, section, field_id, hint in (
        ("icon", "SharedFields", ICON_ID, "__Icon"),
        ("displayName", "UnversionedFields", DISPLAY_NAME_ID, "__Display name"),
    ):
        if key not in record:
            continue
        target = _existing_field(result, section, field_id, hint)
        if target["Value"] not in (record[key]["before"], record[key]["after"]):
            raise ValueError("Native rendering metadata would replace an unreviewed source value")
        target["Value"] = record[key]["after"]
    return result


def update_catalog(catalog: dict, model: dict) -> dict:
    """Keep technical keys and historical group hints; update known values only."""
    result = copy.deepcopy(catalog)
    for record in model["records"]:
        target = result[record["technicalComponentName"]]
        for key in ("icon", "displayName"):
            if key in record:
                if target[key] != record[key]["before"]:
                    raise ValueError("Authoring catalog differs from reviewed source metadata")
                target[key] = record[key]["after"]
    return result


def project_native_fields(item_id: str, path: str, template_id: str, fields: dict, model: dict) -> dict:
    """Project one verified ordinary field without synthesizing a native item.

    The caller supplies exact native identity and a field-name/value mapping.
    No parent identity, field GUID or storage section is inferred. This pure
    projection does not write to CM or participate in historical YAML generation.
    Unknown IDs stay untouched; mismatched known identities or values fail closed.
    """
    records = [record for record in model["nativeFieldProjections"] if record["itemId"] == item_id]
    if not records:
        return fields
    if len(records) != 1:
        raise ValueError("Ambiguous native ordinary-field projection identity")
    record = records[0]
    if path != record["currentPath"] or template_id != record["templateId"]:
        raise ValueError("Native ordinary-field projection does not match the source identity")
    if fields.get("componentName") != record["technicalComponentName"]:
        raise ValueError("Native ordinary-field projection technical binding mismatch")
    location = record["datasourceLocation"]
    if "Datasource Location" not in fields or fields["Datasource Location"] not in (location["before"], location["after"]):
        raise ValueError("Native ordinary-field projection would replace an unreviewed source value")
    result = copy.deepcopy(fields)
    result["Datasource Location"] = location["after"]
    return result


def require_canonical_storage(item_root: Path, model: dict) -> None:
    """Refuse to leave duplicate YAML behind; never delete or rename source files."""
    for record in model["records"]:
        previous = item_root / "allianz.renderings" / "Allianz Life" / (record["historicalPath"].rsplit("/", 1)[-1] + ".yml")
        if previous.exists():
            raise ValueError("Historical rendering YAML requires the reviewed same-ID file rename before regeneration: " + str(previous))
