#!/usr/bin/env python3
"""Build a private, bounded import snapshot from an actual Sitecore CLI readback.

No network requests or writes to Sitecore are made. The explicit capture file
supplies the actual scaffold identities and completed read scopes; this helper
does not infer those identities, declare an incomplete pull complete, or adopt
native fields for an import. SCS parsing is limited to the observed native format
and preserves storage, all languages/versions, revisions, and the exact document.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import uuid

PROJECT_ID = "7f3XlRhEqdT8l8FrbjQync"
ENVIRONMENT_ID = "56W3hhEUAQ5GLwsHAehRhe"
SITE_ROOT = "/sitecore/content/allianz/allianz-life"
MEDIA_ROOT = "/sitecore/media library/Project/Allianz Life"
SITE_TEMPLATE = "9ed66404-64c9-4122-90e1-869cb3cea566"
REVISION_ID = "8cdc337e-a112-42fb-bbb4-4143751e123f"
REPO = Path(__file__).resolve().parents[2]
SCAFFOLD_PATHS = {
    "site": SITE_ROOT, "home": SITE_ROOT + "/Home",
    "data": SITE_ROOT + "/Data", "presentation": SITE_ROOT + "/Presentation",
    "settings": SITE_ROOT + "/Settings",
}
PARENT_PATHS = {"/sitecore/content/allianz", "/sitecore/media library/Project"}
SECRET_HINT = re.compile(r"password|secret|(?:access|refresh|bearer)[ _-]*token|api[ _-]*key", re.I)


def guid(value: object, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{label} must be a GUID string")
    try:
        return str(uuid.UUID(value.strip("{}")))
    except (ValueError, AttributeError) as error:
        raise ValueError(f"{label} is not a GUID") from error


def inside(path: str, root: str) -> bool:
    return path == root or path.startswith(root + "/")


def template_evidence(capture: dict) -> dict:
    result = {}
    for entry in capture.get("nativeTemplateEvidence", []):
        raw = entry.get("rawScs")
        if not isinstance(raw, str) or hashlib.sha256(raw.encode("utf-8")).hexdigest() != entry.get("sha256"):
            raise ValueError("Generated native template evidence lacks its original file hash")
        document = parse_scs(raw)
        if not inside(document["Path"].casefold(), "/sitecore/templates/project/allianz"):
            raise ValueError("Generated template evidence escapes the observed isolated collection")
        if document["ID"] in result:
            raise ValueError("Duplicate generated native template evidence")
        result[document["ID"]] = document
    return result


def inherits_template(template_id: str, expected: str, documents: dict, visiting=None) -> bool:
    template_id, expected = guid(template_id, "Native template"), guid(expected, "Native base template")
    if template_id == expected:
        return True
    visiting = set(visiting or ())
    if template_id in visiting:
        raise ValueError("Generated native template inheritance cycle")
    visiting.add(template_id)
    document = documents.get(template_id)
    if not document or document["Template"] != "ab86861a-6030-46c5-b394-e8f99e8b87db":
        return False
    bases = next((field["Value"] for field in document.get("SharedFields", []) if field["ID"] == "12c33f3f-86c5-43a5-aeb4-5598cec45116"), "")
    return any(inherits_template(match, expected, documents, visiting) for match in re.findall(r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}", bases))


def valid_path(path: object) -> str:
    if not isinstance(path, str) or not path.startswith("/sitecore/"):
        raise ValueError("Unexpected native item path")
    if any(part in {"", ".", ".."} for part in path[1:].split("/")) or any(c in path for c in "\\\x00\r\n"):
        raise ValueError("Noncanonical native item path")
    return path


class _SCSReader:
    """A strict parser for SCS' indentation and string-only scalar contract.

    It deliberately does not implement arbitrary YAML aliases, tags, implicit
    scalar typing, flow collections, or a second document. Thus values such as
    1, false and dates remain their exact Sitecore strings.
    """
    def __init__(self, text: str):
        if not isinstance(text, str) or "\x00" in text:
            raise ValueError("Invalid SCS text")
        self.lines = text.lstrip("\ufeff").splitlines()
        self.index = 0

    def peek(self) -> str | None:
        while self.index < len(self.lines) and not self.lines[self.index].strip():
            self.index += 1
        return self.lines[self.index] if self.index < len(self.lines) else None

    def scalar(self, token: str, indent: int) -> str:
        if token in {"|", "|-", "|+", ">", ">-", ">+"}:
            body = []
            while self.index < len(self.lines):
                line = self.lines[self.index]
                if line.strip() and len(line) - len(line.lstrip(" ")) < indent:
                    break
                if line.strip() and not line.startswith(" " * indent):
                    raise ValueError("Unsupported block scalar indentation")
                body.append(line[indent:] if line.strip() else "")
                self.index += 1
            value = "\n".join(body)
            if token.startswith(">"):
                # Folding is safe only for the simple observed wrapped form.
                if any(line.startswith(" ") for line in body):
                    raise ValueError("Unsupported indented folded scalar")
                value = re.sub(r"(?<=\S)\n(?=\S)", " ", value)
            if not body:
                return ""
            if token.endswith("-"):
                return value.rstrip("\n")
            if token.endswith("+"):
                return value + "\n"
            return value.rstrip("\n") + "\n"
        if token.startswith('"'):
            try:
                value = json.loads(token)
            except json.JSONDecodeError as error:
                raise ValueError("Unsupported quoted SCS scalar") from error
            if not isinstance(value, str):
                raise ValueError("SCS scalar must be a string")
            return value
        if token.startswith("'"):
            if len(token) < 2 or not token.endswith("'"):
                raise ValueError("Unsupported quoted SCS scalar")
            inner = token[1:-1]
            if "'" in inner.replace("''", ""):
                raise ValueError("Invalid single-quoted SCS scalar")
            return inner.replace("''", "'")
        if token.startswith(("!", "&", "[", "{")) or (token.startswith("*") and token != "*"):
            raise ValueError("Unsupported YAML scalar syntax")
        # SCS' observed string-only writer emits values such as
        # 'Hashtag (must start with #)' without quoting. Do not reinterpret an
        # inline hash as a YAML comment and silently truncate native values.
        return token

    def entry(self, indent: int, sequence: bool = False) -> tuple[str, str]:
        line = self.peek()
        if line is None:
            raise ValueError("Unexpected end of SCS document")
        prefix = " " * indent + ("- " if sequence else "")
        if not line.startswith(prefix):
            raise ValueError("Unexpected SCS indentation")
        match = re.fullmatch(r"([A-Za-z][A-Za-z ]*):(?: (.*))?", line[len(prefix):])
        if not match:
            raise ValueError("Unknown SCS node or indentation")
        self.index += 1
        key, token = match.group(1), match.group(2) or ""
        return key, self.scalar(token, indent + (4 if sequence else 2))

    def fields(self, indent: int) -> list[dict]:
        result, identities = [], set()
        while (line := self.peek()) is not None and line.startswith(" " * indent + "- ID:"):
            key, value = self.entry(indent, True)
            field = {key: guid(value, "Field ID")}
            if field["ID"] in identities:
                raise ValueError("Duplicate field ID in one native storage scope")
            identities.add(field["ID"])
            while (line := self.peek()) is not None and line.startswith(" " * (indent + 2)):
                key, value = self.entry(indent + 2)
                if key not in {"Hint", "Value", "BlobID"} or key in field:
                    raise ValueError("Unknown or duplicate SCS field attribute")
                field[key] = guid(value, "Blob ID") if key == "BlobID" else value
            if "Value" not in field:
                raise ValueError("Native field has no serialized Value")
            result.append(field)
        return result

    def languages(self) -> list[dict]:
        result, names = [], set()
        while (line := self.peek()) is not None and line.startswith("- Language:"):
            key, language = self.entry(0, True)
            if not re.fullmatch(r"[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*", language) or language in names:
                raise ValueError("Invalid or duplicate native language")
            names.add(language)
            record = {key: language}
            if self.peek() == "  Fields:":
                self.entry(2)
                record["Fields"] = self.fields(2)
            if self.peek() != "  Versions:":
                raise ValueError("Native language must have an explicit Versions node")
            self.entry(2)
            versions, numbers = [], set()
            while (line := self.peek()) is not None and line.startswith("  - Version:"):
                key, value = self.entry(2, True)
                if not re.fullmatch(r"[1-9][0-9]*", value) or value in numbers:
                    raise ValueError("Invalid or duplicate native version")
                numbers.add(value)
                version = {key: int(value)}
                if self.peek() == "    Fields:":
                    self.entry(4)
                    version["Fields"] = self.fields(4)
                versions.append(version)
            record["Versions"] = versions
            result.append(record)
        return result

    def read(self) -> dict:
        result = {}
        if self.peek() == "---":
            self.index += 1
        while (line := self.peek()) is not None:
            key, value = self.entry(0)
            if key in result:
                raise ValueError("Duplicate SCS document key")
            if key in {"ID", "Parent", "Template", "BranchID"}:
                result[key] = guid(value, key)
            elif key == "Path":
                result[key] = valid_path(value)
            elif key == "DB":
                if value != "master":
                    raise ValueError("Only native authoring master readback is supported")
                result[key] = value
            elif key == "SharedFields" and not value:
                result[key] = self.fields(0)
            elif key == "Languages" and not value:
                result[key] = self.languages()
            else:
                raise ValueError("Unknown SCS document key or structure")
        if not {"ID", "Parent", "Template", "Path"}.issubset(result):
            raise ValueError("Missing native identity in SCS document")
        return result


def parse_scs(text: str) -> dict:
    """Return the observed SCS shape, retaining string values and native scopes."""
    return _SCSReader(text).read()


def read_scs(path: Path | str) -> dict:
    return parse_scs(Path(path).read_text(encoding="utf-8-sig"))


def _field_map(fields: list[dict]) -> dict:
    values = {}
    for field in fields:
        identifier = field["ID"]
        if identifier in values:
            raise ValueError("Duplicate native field")
        if SECRET_HINT.search(field.get("Hint", "")):
            raise ValueError("Readback contains a credential field; use a narrower read scope")
        values[identifier] = ({"value": field["Value"], "blobId": field["BlobID"]}
                              if "BlobID" in field else field["Value"])
    return values


def normalize_item(document: dict, raw_scs: str | None = None, selected_version: int | None = None) -> dict:
    """Flatten English for the planner while preserving every storage scope."""
    if selected_version is not None and (not isinstance(selected_version, int) or isinstance(selected_version, bool) or selected_version < 1):
        raise ValueError("Selected English version must be a positive integer")
    shared = _field_map(document.get("SharedFields", []))
    languages, field_storage = {}, {field: "shared" for field in shared}
    for language in document.get("Languages", []):
        unversioned = _field_map(language.get("Fields", []))
        versions = {str(value["Version"]): _field_map(value.get("Fields", [])) for value in language["Versions"]}
        for field in unversioned:
            if field in shared or field_storage.get(field, "unversioned") != "unversioned":
                raise ValueError("Native field collides across shared/unversioned/versioned storage")
            field_storage[field] = "unversioned"
        for fields in versions.values():
            for field in fields:
                if field in shared or field in unversioned or field_storage.get(field, "versioned") != "versioned":
                    raise ValueError("Native field collides across shared/unversioned/versioned storage")
                field_storage[field] = "versioned"
        languages[language["Language"]] = {"unversioned": unversioned, "versions": versions}
    en = languages.get("en", {"unversioned": {}, "versions": {}})
    available = sorted(map(int, en["versions"]))
    if selected_version is not None and selected_version not in available:
        raise ValueError("Explicit English version is absent from native readback")
    chosen = selected_version if selected_version is not None else (available[-1] if available else None)
    versioned = en["versions"].get(str(chosen), {})
    fields = {**shared, **en["unversioned"], **versioned}
    revision = versioned.get(REVISION_ID)
    if revision is not None:
        guid(revision, "English revision")
    item = {
        "id": document["ID"], "path": document["Path"], "templateId": document["Template"],
        "parentId": document["Parent"], "fields": fields, "revision": revision,
        "selectedVersion": chosen, "fieldStorage": field_storage,
        "storage": {"shared": shared, "enUnversioned": en["unversioned"], "enVersions": en["versions"]},
        "languages": languages,
    }
    if raw_scs is not None:
        item["rawScs"] = raw_scs
        item["rawScsSha256"] = hashlib.sha256(raw_scs.encode()).hexdigest()
    return item


def _timestamp(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("Native capture timestamp is required")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("Invalid native capture timestamp") from error
    if parsed.utcoffset() != timezone.utc.utcoffset(parsed):
        raise ValueError("Native capture timestamp must be UTC")
    return parsed.isoformat().replace("+00:00", "Z")


def validate_capture(capture: dict) -> tuple[dict, dict, dict]:
    target = capture.get("target", {})
    for key, expected in (("projectId", PROJECT_ID), ("environmentId", ENVIRONMENT_ID),
                          ("siteRoot", SITE_ROOT), ("mediaRoot", MEDIA_ROOT)):
        value = target.get(key)
        if (not isinstance(value, str) or value.casefold() != expected.casefold()) if key == "siteRoot" else value != expected:
            raise ValueError(f"Unverified or mismatched native target: {key}")
    target = {key: target[key] for key in ("projectId", "environmentId", "siteRoot", "mediaRoot")} | {"siteId": guid(target.get("siteId"), "Content site ID")}
    site_root = valid_path(target["siteRoot"])
    scaffold_paths = {role: site_root + path[len(SITE_ROOT):] for role, path in SCAFFOLD_PATHS.items()}
    parent_paths = {path.casefold() for path in PARENT_PATHS}
    _timestamp(capture.get("capturedAt"))
    if capture.get("captureMode") != "sitecore-cli-readback" or capture.get("captureSucceeded") is not True:
        raise ValueError("Only an explicitly successful native CLI readback can form a snapshot")
    scopes = capture.get("completeScopes", {})
    if set(scopes) != {"exactPaths", "subtrees"} or not all(isinstance(scopes[k], list) for k in scopes):
        raise ValueError("Explicit completed exact paths and subtree scopes are required")
    if not scopes["exactPaths"] and not scopes["subtrees"]:
        raise ValueError("Native readback has no completed scopes")
    for kind, paths in scopes.items():
        if len({path.casefold() for path in paths if isinstance(path, str)}) != len(paths):
            raise ValueError("Duplicate completed native scopes")
        for path in paths:
            valid_path(path)
            within = inside(path, site_root) or inside(path, MEDIA_ROOT)
            if not within and not (kind == "exactPaths" and path.casefold() in parent_paths):
                raise ValueError("Completed native scope escapes Allianz boundaries")
    scaffold = capture.get("scaffold", {})
    if not set(SCAFFOLD_PATHS).union({"siteDefinition"}).issubset(scaffold):
        raise ValueError("Actual site/Home/Data/Presentation/Settings/site-definition identities are required")
    for role, identity in scaffold.items():
        if not isinstance(identity, dict) or not {"id", "path", "templateId"}.issubset(identity):
            raise ValueError("Scaffold identity requires ID, path and template")
        guid(identity["id"], "Scaffold item ID")
        guid(identity["templateId"], "Scaffold template ID")
        path = valid_path(identity["path"])
        if role in scaffold_paths and path != scaffold_paths[role]:
            raise ValueError("Scaffold role has the wrong exact native path")
        if role == "siteDefinition" and not path.startswith(site_root + "/Settings/"):
            raise ValueError("Site definition must belong to native Allianz settings")
        if not (inside(path, site_root) or path.casefold() in parent_paths):
            raise ValueError("Scaffold identity escapes Allianz boundaries")
    if guid(scaffold["site"]["id"], "Content site ID") != target["siteId"]:
        raise ValueError("Import site ID must explicitly identify the native content Site item")
    if not inherits_template(scaffold["site"]["templateId"], SITE_TEMPLATE, template_evidence(capture)):
        raise ValueError("Native content Site must inherit the verified Headless Site template")
    return target, scaffold, scopes


def build_snapshot(files: list[Path], capture: dict) -> dict:
    target, scaffold, scopes = validate_capture(capture)
    items, by_id, by_path, sources = [], {}, {}, []
    versions = capture.get("selectedVersions", {})
    if not isinstance(versions, dict) or any(not isinstance(value, int) or isinstance(value, bool) or value < 1 for value in versions.values()):
        raise ValueError("Explicit selected English versions must be positive integers")
    canonical_versions = {guid(key, "Selected-version item ID"): value for key, value in versions.items()}
    if len(canonical_versions) != len(versions):
        raise ValueError("Duplicate selected-version item ID")
    for path in sorted(files):
        if path.is_symlink() or not path.is_file():
            raise ValueError("Readback inputs must be ordinary local files")
        # Preserve original UTF-8 bytes, including BOM and CRLF, so provenance
        # hashes describe the captured file rather than a decoded rewrite.
        raw = path.read_bytes().decode("utf-8")
        document = parse_scs(raw)
        item = normalize_item(document, raw, canonical_versions.get(document["ID"]))
        item_path = item["path"]
        if item_path not in scopes["exactPaths"] and not any(inside(item_path, root) for root in scopes["subtrees"]):
            raise ValueError("Readback item lies outside the completed scopes")
        if item["id"] in by_id or item_path.casefold() in {p.casefold() for p in by_path}:
            raise ValueError("Native readback contains duplicate item identities or paths")
        items.append(item)
        by_id[item["id"]], by_path[item_path] = item, item
        sources.append({"file": str(path), "sha256": item["rawScsSha256"]})
    if set(canonical_versions) - set(by_id):
        raise ValueError("Selected-version identity is absent from native readback")
    for exact_path in scopes["exactPaths"]:
        if exact_path not in by_path:
            raise ValueError("A completed exact-path read lacks the actual native item")
    for root in scopes["subtrees"]:
        if root not in by_path:
            raise ValueError("A completed subtree read lacks its actual native root item")
    for identity in scaffold.values():
        identifier = guid(identity["id"], "Scaffold ID")
        actual = by_id.get(identifier)
        if not actual or actual["path"] != identity["path"] or actual["templateId"] != guid(identity["templateId"], "Scaffold template"):
            raise ValueError("Scaffold identity does not match independent native readback")
        if "parentId" in identity and actual["parentId"] != guid(identity["parentId"], "Scaffold parent"):
            raise ValueError("Scaffold parent does not match independent native readback")
    for item in items:
        parent_path = item["path"].rsplit("/", 1)[0]
        if parent_path in by_path and item["parentId"] != by_path[parent_path]["id"]:
            raise ValueError("Native item parent ID does not match its verified path")
    bindings = {}
    for key, expected in capture.get("keyBindings", {}).items():
        identity = scaffold.get(expected) if isinstance(expected, str) else expected
        if not isinstance(identity, dict) or not {"id", "path", "templateId"}.issubset(identity):
            raise ValueError("A key binding must name a verified scaffold role or explicit identity")
        identifier = guid(identity["id"], "Binding ID")
        actual = by_id.get(identifier)
        if not actual or actual["path"] != identity["path"] or actual["templateId"] != guid(identity["templateId"], "Binding template"):
            raise ValueError("Key binding does not match independent native readback")
        if not inside(actual["path"], target["siteRoot"]):
            raise ValueError("Editorial key binding escapes the Allianz site")
        bindings[key] = identifier
    if len(set(bindings.values())) != len(bindings):
        raise ValueError("Native key bindings must be one-to-one")
    return {
        "formatVersion": 1, "target": target, "language": "en", "bindings": bindings,
        "scaffold": scaffold, "capturedAt": _timestamp(capture["capturedAt"]),
        "captureMode": capture["captureMode"], "captureSucceeded": True, "completeScopes": scopes,
        "nativeTemplateEvidence": capture.get("nativeTemplateEvidence", []),
        "items": sorted(items, key=lambda item: item["path"]),
        "provenance": {"source": "explicit successful native CLI serialization readback", "files": sources},
        "limitations": ["Completed scopes are supplied by the native pull caller, not inferred from local files", "Content site ID is distinct from Channels, site definition and analytics identities", "No native template changes or baseline field adoption are authorized by this snapshot"],
    }


def verify_snapshot(snapshot: dict) -> tuple[dict, dict]:
    """Verify the normalized snapshot against its retained native documents.

    Capture completeness remains an explicit assertion by the readback caller.
    This validation proves internal consistency; it does not authenticate a
    caller, establish cloud permissions, or make a stale capture live again.
    """
    if snapshot.get("formatVersion") != 1 or snapshot.get("language") != "en":
        raise ValueError("Unsupported native snapshot format or language")
    target, scaffold, scopes = validate_capture(snapshot)
    if snapshot["target"] != target:
        raise ValueError("Native snapshot target is not canonical")
    by_id, by_path = {}, {}
    for item in snapshot.get("items", []):
        raw = item.get("rawScs")
        if not isinstance(raw, str):
            raise ValueError("Snapshot requires the complete original native SCS document")
        actual = normalize_item(parse_scs(raw), raw, item.get("selectedVersion"))
        if actual != item:
            raise ValueError("Normalized snapshot differs from its original native SCS document")
        identifier, path = actual["id"], actual["path"]
        folded = path.casefold()
        if identifier in by_id or folded in by_path:
            raise ValueError("Snapshot contains duplicate or case-colliding native identities")
        if path not in scopes["exactPaths"] and not any(inside(path, root) for root in scopes["subtrees"]):
            raise ValueError("Snapshot item is outside the completed capture scopes")
        by_id[identifier], by_path[folded] = actual, actual
    for path in scopes["exactPaths"] + scopes["subtrees"]:
        if path.casefold() not in by_path or by_path[path.casefold()]["path"] != path:
            raise ValueError("Completed capture scope lacks its exact native root item")
    for identity in scaffold.values():
        actual = by_id.get(guid(identity["id"], "Scaffold ID"))
        if not actual or actual["path"] != identity["path"] or actual["templateId"] != guid(identity["templateId"], "Scaffold template"):
            raise ValueError("Scaffold identity differs from native SCS readback")
        if "parentId" in identity and actual["parentId"] != guid(identity["parentId"], "Scaffold parent"):
            raise ValueError("Scaffold parent differs from native SCS readback")
    for item in by_id.values():
        parent = by_path.get(item["path"].rsplit("/", 1)[0].casefold())
        if parent and item["parentId"] != parent["id"]:
            raise ValueError("Native parent identity differs from its observed path")
    bindings = snapshot.get("bindings", {})
    if not isinstance(bindings, dict):
        raise ValueError("Native bindings must be an explicit mapping")
    identities = [guid(value, "Native binding ID") for value in bindings.values()]
    if len(set(identities)) != len(identities):
        raise ValueError("Native bindings must be one-to-one")
    for identifier in identities:
        actual = by_id.get(identifier)
        if not actual or not inside(actual["path"], target["siteRoot"]):
            raise ValueError("Native binding lacks isolated site readback")
    return by_id, by_path


def require_private(path: Path) -> Path:
    if any(part.is_symlink() for part in (path, *path.parents)):
        raise ValueError("Private native paths cannot contain symbolic links")
    resolved = path.resolve()
    if resolved.is_relative_to(REPO):
        roots = [REPO / ".sitecore/reference-schema", REPO / ".sitecore/allianz-media"]
        if not any(resolved.is_relative_to(root) for root in roots):
            raise ValueError("Native inputs/output inside the public checkout must use the existing Git-ignored private roots")
    return resolved


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("readback", type=Path, help="Private native SCS item directory")
    parser.add_argument("--capture", type=Path, required=True, help="Private actual-scaffold and successful-pull metadata")
    parser.add_argument("--output", type=Path, required=True, help="Private snapshot; never a public authoring/deploy module")
    args = parser.parse_args()
    root, capture_path, output = map(require_private, (args.readback, args.capture, args.output))
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Private readback directory is required")
    files = list(root.rglob("*.yml"))
    if not files:
        raise ValueError("No native SCS readback items were supplied")
    snapshot = build_snapshot(files, json.loads(capture_path.read_text()))
    output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Create first with restrictive permissions; don't briefly expose native data.
    import os
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w") as stream:
        os.fchmod(stream.fileno(), 0o600)
        json.dump(snapshot, stream, indent=2, ensure_ascii=False)
        stream.write("\n")
    print(json.dumps({"mode": "local-native-readback", "items": len(snapshot["items"]), "bindings": len(snapshot["bindings"]), "remoteWrites": 0}))


if __name__ == "__main__":
    main()
