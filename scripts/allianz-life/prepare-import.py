#!/usr/bin/env python3
"""Convert granular SDK source fixtures into reviewable native import candidates.

This command reads local authorized source files only and writes local JSON. It
never uploads, submits a form, calls a customer API, or changes Sitecore. A native
write adapter still must check target/revisions and apply the reviewed plan.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.util
import json
import mimetypes
import os
from pathlib import Path
import re
from urllib.parse import urlsplit, urlencode, unquote, parse_qsl
import uuid
import xml.etree.ElementTree as ET

SCRIPT_ROOT = Path(__file__).resolve().parent
REPO = SCRIPT_ROOT.parents[1]
PUBLIC = REPO / "examples/allianz-life/public"
spec = importlib.util.spec_from_file_location("import_planner", SCRIPT_ROOT / "import-planner.py")
planner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(planner)
SITE_ROOT = "/sitecore/content/allianz/allianz-life"
MEDIA_ROOT = "/sitecore/media library/Project/Allianz Life"
TEMPLATES_ROOT = "/sitecore/templates/Project/Allianz Life"
RENDERINGS_ROOT = "/sitecore/layout/Renderings/Project/Allianz Life"
FINAL_RENDERINGS = "04bf00db-f5fb-41f7-8ab7-22408372a981"
DEFAULT_DEVICE = "fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3"
ARCHETYPE_TEMPLATE = {
    "Home": "Home", "Press release": "News", "Press release year listing": "Resource Listing",
    "Editorial insight / article": "Editorial", "Person biography": "Editorial",
    "Document / disclosure library": "Resource Listing", "Directory / collection landing": "Resource Listing",
    "Product detail / guide": "Product Detail", "Product rates": "Product Detail",
    "Product video": "Product Detail", "Legal / policy": "Legal", "Contact / claim form": "Form Demo",
    "Interactive tool / calculator": "Form Demo", "Site search": "Resource Listing",
    "Marketing / topic landing": "Section Landing", "FAQ / glossary": "Section Landing",
}
FORBIDDEN_HTML = re.compile(r"<\s*(script|style|form|iframe|object|embed|html|head|body)\b|\bon\w+\s*=|javascript\s*:", re.I)


def brace(value: str) -> str:
    return "{" + value.upper() + "}"


def raw_value(value):
    if isinstance(value, dict) and "jsonValue" in value:
        return value.get("jsonValue", {}).get("value", "")
    return value


def digest_file(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def safe_name(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._ -]+", "-", value).strip(" .-")
    return value[:70] or "Item"


class Builder:
    def __init__(self, fixtures: dict, target: dict, schema: dict, media_sources: list[dict], vectors: list[dict], documents: list[dict], presentation_bindings: dict | None = None, native_snapshot: dict | None = None):
        self.fixtures, self.target, self.schema = fixtures, target, schema
        self.contract = json.loads((REPO / "authoring/allianz-life/content-contract.json").read_text())
        self.struct = json.loads((REPO / "authoring/allianz-life/structure-manifest.json").read_text())["items"]
        self.by_path = {item["Path"]: item for item in self.struct}
        self.native_by_path = {item["path"]: item for item in schema.get("items", [])}
        self.records: dict[str, dict] = {}
        self.media: dict[str, dict] = {}
        self.exceptions: list[dict] = []
        self.bindings = copy.deepcopy(target.get("keyBindings", {}))
        self.presentation_bindings = presentation_bindings
        self.native_snapshot = native_snapshot
        self.native_items = {}
        self.native_templates = {}
        if native_snapshot is not None:
            native_spec = importlib.util.spec_from_file_location("prepare_native_snapshot", SCRIPT_ROOT / "native-snapshot.py")
            native = importlib.util.module_from_spec(native_spec)
            native_spec.loader.exec_module(native)
            _, self.native_items = native.verify_snapshot(native_snapshot)
            self.native_templates = native.template_evidence(native_snapshot)
            for item in self.native_templates.values():
                self.native_by_path[item["Path"]] = {"id": item["ID"], "path": item["Path"], "template": item["Template"]}
            for name in ("projectId", "environmentId"):
                if target.get(name) != native_snapshot["target"][name]:
                    raise ValueError("Native scaffold snapshot belongs to another target")
            if target.get("siteId") not in (None, "", native_snapshot["target"]["siteId"]):
                raise ValueError("Target Site UUID differs from native scaffold readback")
            self.target = copy.deepcopy(native_snapshot["target"])
            if self.bindings and self.bindings != native_snapshot.get("bindings", {}):
                raise ValueError("Target bindings differ from independently read-back native bindings")
            self.bindings = copy.deepcopy(native_snapshot.get("bindings", {}))
        self.site_root = self.target.get("siteRoot") or SITE_ROOT
        if not isinstance(self.site_root, str) or self.site_root.casefold() != SITE_ROOT.casefold():
            raise ValueError("Candidate content root escapes the isolated Allianz site")
        self.shell_datasources = {}
        self.shell_designs = {}
        self.native_authoring = {}
        self.media_by_src = {row.get("demoSrc"): row for row in media_sources if row.get("demoSrc")}
        self.media_by_src.update({"/allianz-assets/" + row["name"]: {**row, "status": "bundled", "demoSrc": "/allianz-assets/" + row["name"]} for row in vectors})
        self.documents_by_source = {planner.canonical_source(row["sourceUrl"]).casefold(): row for row in documents if row.get("sourceUrl") and urlsplit(row["sourceUrl"]).hostname == "www.allianzlife.com"}
        self.routes = {path.lower().rstrip("/") or "/": value for path, value in fixtures.get("routes", {}).items()}

    def identity(self, key: str) -> str:
        return self.bindings.get(key, planner.item_id(key)).lower()

    def exception(self, key: str, reason: str, **details) -> None:
        self.exceptions.append({"key": key, "reason": reason, **details})

    def add(self, key: str, path: str, template_path: str, source: str, fields: dict | None = None) -> str:
        template = self.by_path.get(template_path) or self.native_by_path.get(template_path)
        template_id = (template or {}).get("ID", (template or {}).get("id"))
        if not template_id:
            self.exception(key, "unresolved-native-template", templatePath=template_path)
        record = {"key": key, "id": self.identity(key), "path": path, "templateId": template_id, "sourceUrl": planner.canonical_source(source), "access": "public", "language": "en", "kind": "editorial", "fields": fields or {}}
        if key in self.records and self.records[key] != record:
            self.exception(key, "duplicate-source-identity")
        self.records[key] = record
        return record["id"]

    def folder(self, path: str, source: str) -> str:
        return self.add("folder:" + path, path, TEMPLATES_ROOT + "/Data/AllianzDataFolder", source)

    def field_id(self, template: str, name: str) -> str | None:
        item = self.by_path.get(template + "/Content/" + name)
        return item["ID"] if item else None

    def native_media_template(self, suffix: str) -> str | None:
        name = {".jpg": "Jpeg", ".jpeg": "Jpeg", ".pdf": "Pdf"}.get(suffix.lower(), "Image" if suffix.lower() in {".png", ".gif", ".svg", ".webp", ".avif"} else "File")
        item = self.native_by_path.get("/sitecore/templates/System/Media/Unversioned/" + name)
        return item.get("id") if item else None

    def media_reference(self, src: str, source: str, key: str) -> str | None:
        if not src:
            return None
        row = self.media_by_src.get(src)
        document = bool(row and row.get("kind") == "document")
        if not row and (src.startswith("https://www.allianzlife.com/") or src.startswith("/-/media/")):
            candidate = src if src.startswith("https:") else "https://www.allianzlife.com" + src
            row = self.documents_by_source.get(planner.canonical_source(candidate).casefold())
            document = row is not None
        if not row:
            self.exception(key, "media-not-in-authorized-source-manifest", src=src)
            return None
        if row.get("status") not in ("bundled", "available", "downloaded"):
            self.exception(key, "source-media-unavailable", src=src, sourceUrl=row.get("sourceUrl"), status=row.get("status"))
            return None
        if document:
            local = Path(row.get("localPath", row.get("local_path", "")))
        else:
            local_path = row.get("localPath", row.get("path"))
            local = Path(local_path) if local_path else PUBLIC / src.lstrip("/")
            if not local.is_file():
                local = PUBLIC / src.lstrip("/")
        if not local.is_file():
            self.exception(key, "authorized-media-not-present-locally", src=src)
            return None
        source_url = row.get("sourceUrl", source)
        planner.canonical_source(source_url)
        binary_hash = digest_file(local)
        extension = local.suffix.lower()
        # Identical authorized bytes share one media item, regardless of public
        # source path/query aliases. Binary changes get a new recoverable item.
        media_key = "media:sha256:" + binary_hash
        identifier = self.identity(media_key)
        path = MEDIA_ROOT + ("/Documents/" if document else "/Images/") + "public-" + binary_hash[:16]
        template_id = self.native_media_template(extension)
        if not template_id:
            self.exception(key, "unresolved-native-media-template", extension=extension)
        previous = self.media.get(media_key, {})
        aliases = sorted(set(previous.get("sourceAliases", [])) | {source_url})
        self.media[media_key] = {"key": media_key, "id": identifier, "path": path, "templateId": template_id, "sourceUrl": planner.canonical_source(source_url), "sourceAliases": aliases, "kind": "media", "language": "en", "access": "public", "fields": {}, "binary": {"localPath": str(local.relative_to(REPO)) if local.is_relative_to(REPO) else str(local), "sha256": binary_hash, "bytes": local.stat().st_size, "mimeType": row.get("contentType", row.get("content_type", mimetypes.guess_type(local.name)[0] or "application/octet-stream")), "width": row.get("width"), "height": row.get("height")}}
        return identifier

    def encode_link(self, value: dict, source: str, key: str) -> str:
        href = value.get("href", "")
        if not href:
            return ""
        parts = urlsplit(href)
        attrs = {"text": value.get("text", ""), "title": value.get("title", ""), "target": "", "anchor": parts.fragment, "querystring": parts.query}
        if parts.scheme or parts.netloc:
            if parts.scheme != "https" or parts.netloc.lower() != "www.allianzlife.com":
                self.exception(key, "external-or-account-link-disabled", href=href)
                attrs.update(linktype="anchor", anchor="demo-unavailable")
                return ET.tostring(ET.Element("link", attrs), encoding="unicode")
        route = parts.path.lower().rstrip("/") or "/"
        if href.startswith("#"):
            attrs.update(linktype="anchor")
        elif parts.path.startswith("/-/media/") or parts.path in self.media_by_src:
            media_src = parts.path if parts.path in self.media_by_src else "https://www.allianzlife.com" + parts.path
            media = self.media_reference(media_src, source, key)
            if media:
                attrs.update(linktype="media", id=brace(media))
            else:
                attrs.update(linktype="anchor", anchor="demo-unavailable")
        elif route in self.routes:
            attrs.update(linktype="internal", id=brace(self.identity("page:" + route)))
        else:
            self.exception(key, "unresolved-internal-page-link", href=href)
            attrs.update(linktype="anchor", anchor="demo-unavailable")
        return ET.tostring(ET.Element("link", attrs), encoding="unicode")

    def encode_field(self, kind: str, wrapped, source: str, key: str, field_name: str) -> str:
        value = raw_value(wrapped)
        if kind in ("Image", "File"):
            if not value or not isinstance(value, dict) or not value.get("src"):
                return ""
            media = self.media_reference(value["src"], source, key)
            if not media:
                return ""
            attrs = {"mediaid": brace(media)}
            if kind == "Image":
                for name in ("alt", "width", "height"):
                    if name in value:
                        attrs[name] = str(value[name])
            return ET.tostring(ET.Element("image" if kind == "Image" else "file", attrs), encoding="unicode")
        if kind == "General Link":
            return self.encode_link(value or {}, source, key)
        if kind == "Checkbox":
            return "1" if value in (True, 1, "1", "true") else "0"
        if kind == "Rich Text":
            if not isinstance(value, str) or FORBIDDEN_HTML.search(value):
                self.exception(key, "unsafe-or-composite-rich-text", field=field_name)
                return ""
            return value
        if kind == "Droplist":
            allowed = self.contract["parameters"].get(field_name, self.contract.get("dataOptions", {}).get(field_name, []))
            if value not in allowed and value not in (None, ""):
                self.exception(key, "unsupported-native-option", field=field_name, value=value)
                return ""
        if isinstance(value, (list, dict)):
            return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        return str(value) if value is not None else ""

    def navigation(self, values: list[dict], path: str, source: str, key: str) -> list[str]:
        identifiers = []
        for index, value in enumerate(values, 1):
            child_key = key + ":navigation:" + str(index)
            child_path = path + "/Link " + str(index).zfill(2)
            fields = self.fields("AllianzNavigationLink", value, child_path, source, child_key, child_template=True)
            identifiers.append(self.add(child_key, child_path, TEMPLATES_ROOT + "/Data/AllianzNavigationLink", source, fields))
            nested = value.get("children", {}).get("results", [])
            if nested:
                self.navigation(nested, child_path, source, child_key)
        return identifiers

    def fields(self, name: str, datasource: dict, path: str, source: str, key: str, child_template: bool = False) -> dict:
        definition = self.contract["childTemplates"].get(name) if child_template else self.contract["components"].get(name, {}).get("fields")
        if definition is None:
            self.exception(key, "unsupported-component-template", componentName=name)
            return {}
        template_path = TEMPLATES_ROOT + ("/Data/" if child_template else "/Components/") + name
        result = {}
        for field_name, wrapped in datasource.items():
            if field_name in ("id", "children"):
                continue
            kind = definition.get(field_name)
            if not kind:
                if raw_value(wrapped) not in (None, "", {}, []):
                    self.exception(key, "unmodeled-native-field", componentName=name, field=field_name)
                continue
            identifier = self.field_id(template_path, field_name)
            if kind == "Treelist":
                nav_path = path + "/" + field_name
                self.folder(nav_path, source)
                ids = self.navigation(wrapped.get("targetItems", []), nav_path, source, key + ":" + field_name)
                result[identifier] = "|".join(brace(value) for value in ids)
            else:
                result[identifier] = self.encode_field(kind, wrapped, source, key, field_name)
        if not child_template:
            children = datasource.get("children", {}).get("results", [])
            child_name = self.contract["components"][name].get("children")
            if children and not child_name:
                self.exception(key, "unmodeled-child-collection", componentName=name)
            elif child_name:
                for index, value in enumerate(children, 1):
                    child_key = key + ":entry:" + str(index)
                    child_path = path + "/Entry " + str(index).zfill(2)
                    self.add(child_key, child_path, TEMPLATES_ROOT + "/Data/" + child_name, source, self.fields(child_name, value, child_path, source, child_key, True))
        return result

    def layout(self, components: list[dict], page_path: str, source: str, route: str) -> str:
        ET.register_namespace("p", "p")
        ET.register_namespace("s", "s")
        root = ET.Element("r", {"{p}p": "1"})
        device = ET.SubElement(root, "d", {"id": brace(DEFAULT_DEVICE)})
        previous = None
        for index, component in enumerate(components, 1):
            name = component["componentName"]
            definition = self.contract["components"].get(name)
            if not definition:
                self.exception("page:" + route, "unsupported-component-template", componentName=name)
                continue
            datasource = component.get("fields", {}).get("data", {}).get("datasource", {})
            key = "route:" + route + ":component:" + str(index) + ":" + name
            data_path = page_path + "/Data/" + name + " " + str(index).zfill(2)
            self.add(key, data_path, TEMPLATES_ROOT + "/Components/" + name, source, self.fields(name, datasource, data_path, source, key))
            uid = self.identity(key + ":rendering")
            params = component.get("params", {})
            for name_param, value in params.items():
                if name_param == "RenderingIdentifier":
                    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_:.-]*", value):
                        self.exception(key, "invalid-anchor-identifier", value=value)
                elif name_param not in self.contract["parameters"] or value not in self.contract["parameters"][name_param]:
                    self.exception(key, "unsupported-rendering-parameter", field=name_param, value=value)
            attributes = {"uid": brace(uid), "{s}id": brace(self.by_path[RENDERINGS_ROOT + "/" + name]["ID"]), "{s}ds": "local:/Data/" + name + " " + str(index).zfill(2), "{s}ph": "headless-sidebar" if name == "AllianzLegacySidebar" else "headless-main", "{s}par": urlencode(params), "{p}after": "r[@uid='" + brace(previous) + "']" if previous else "*"}
            if previous is None:
                attributes.pop("{p}after")
                attributes["{p}before"] = "*"
            ET.SubElement(device, "r", attributes)
            previous = uid
        return ET.tostring(root, encoding="unicode")


    def presentation_record(self, key: str, path: str, template_role: str, source: str, fields=None, storage=None) -> str | None:
        registry = self.presentation_bindings
        definition = (registry or {}).get("nativeTemplates", {}).get(template_role)
        observed = self.native_by_path.get((definition or {}).get("path"))
        if not definition or not observed or str(observed["id"]).lower() != str(definition["id"]).lower():
            self.exception(key, "unresolved-verified-presentation-template", templateRole=template_role)
            return None
        existing = self.native_items.get(path.casefold())
        template_path = definition["path"]
        if existing:
            native_spec = importlib.util.spec_from_file_location("presentation_native_lineage", SCRIPT_ROOT / "native-snapshot.py")
            native = importlib.util.module_from_spec(native_spec)
            native_spec.loader.exec_module(native)
            if not native.inherits_template(existing["templateId"], definition["id"], self.native_templates):
                self.exception(key, "native-presentation-template-collision", path=path, nativeTemplateId=existing["templateId"])
                return None
            if existing["templateId"] != str(definition["id"]).lower():
                template_path = self.native_templates[existing["templateId"]]["Path"]
            if self.bindings.get(key) != existing["id"]:
                self.exception(key, "native-scaffold-key-binding-required", path=path, actualId=existing["id"])
                return None
        identifier = self.add(key, path, template_path, source, fields)
        self.records[key]["fieldStorage"] = storage or {}
        return identifier

    def native_shell_layout(self, key: str, renderer: dict, datasource_id: str, placeholder: str) -> str:
        layout = self.presentation_bindings["inheritedLayout"]
        if str(layout["defaultDeviceId"]).lower() != DEFAULT_DEVICE or not layout.get("verified"):
            raise ValueError("Native partial layout/device evidence is incomplete")
        actual = self.by_path.get(renderer["path"], {})
        if str(actual.get("ID", "")).lower() != str(renderer["id"]).lower():
            raise ValueError("Native shell rendering differs from applied project structure")
        ET.register_namespace("s", "s")
        root = ET.Element("r")
        device = ET.SubElement(root, "d", {"id": brace(DEFAULT_DEVICE), "l": brace(layout["layoutId"])})
        ET.SubElement(device, "r", {"uid": brace(self.identity(key + ":rendering")), "{s}id": brace(str(renderer["id"]).lower()), "{s}ds": brace(datasource_id), "{s}ph": placeholder, "{s}par": "DynamicPlaceholderId=1"})
        return ET.tostring(root, encoding="unicode")

    def prepare_native_presentation(self, source: str) -> None:
        """Propose actual SXA shell records; leave native side effects gated."""
        registry = self.presentation_bindings
        if not registry:
            self.exception("target", "verified-native-presentation-bindings-required")
            return
        registry_target = registry.get("provenance", {}).get("target", {})
        if any(registry_target.get(name) != self.target.get(name) for name in ("projectId", "environmentId")) or str(registry.get("targetSiteRoot", "")).casefold() != self.site_root.casefold():
            raise ValueError("Presentation registry belongs to another native target")
        if self.native_snapshot is None:
            self.exception("target", "native-presentation-scaffold-readback-required")
        library_root = self.site_root + "/Presentation/Partial Designs"
        page_root = self.site_root + "/Presentation/Page Designs"
        self.presentation_record("presentation:partial-designs-library", library_root, "partialDesignsLibrary", source)
        self.presentation_record("presentation:global-partial-folder", library_root + "/Global", "partialDesignFolder", source)
        self.presentation_record("presentation:page-designs-library", page_root, "pageDesignsLibrary", source)
        native_fields = registry["nativeFields"]
        signature_field = str(native_fields["signature"]["id"]).lower()
        partials_field = str(native_fields["partialDesigns"]["id"]).lower()
        shared_layout_field = str(registry["inheritedLayout"]["sharedRenderingsFieldId"]).lower()
        if native_fields["signature"].get("storage") != "shared" or native_fields["partialDesigns"].get("storage") != "shared":
            raise ValueError("Native presentation field storage was not verified shared")
        for family, shell in sorted(self.shell_datasources.items()):
            if not {"header", "footer"}.issubset(shell):
                self.exception("presentation:page-design:" + family, "native-shell-header-or-footer-missing", family=family)
                continue
            partial_ids = []
            for label in ("header", "footer"):
                key = "presentation:shell:" + family + ":" + label
                name = safe_name("Allianz " + family + " " + label.title())
                renderer_name = ("legacyHeader" if label == "header" else "legacyFooter") if family.startswith("legacy") else label
                renderer = registry["projectRenderings"][renderer_name]
                signature = "allianz-" + family + "-" + label
                composition = self.native_shell_layout(key, renderer, shell[label], "headless-" + label)
                identifier = self.presentation_record(key, library_root + "/Global/" + name, "partialDesign", source, {signature_field: signature, shared_layout_field: composition}, {signature_field: "shared", shared_layout_field: "shared"})
                if identifier:
                    partial_ids.append(identifier)
                # Never fabricate the generated placeholder item or infer that
                # direct SCS creation triggers the supported UI side effect.
                self.exception(key, "native-generated-partial-placeholder-readback-required", partialPath=library_root + "/Global/" + name, signature=signature, note="Use a supported native creation path (CLI/API/event or UI where verified), independently read Signature and any generated placeholder settings, preserve native side effects, then reconcile the authored rendering blueprint. A raw create alone is not proof of creation-event behavior")
            if len(partial_ids) != 2:
                continue
            key = "presentation:page-design:" + family
            identifier = self.presentation_record(key, page_root + ("/Default" if family == "modern" else "/" + safe_name("Allianz " + family)), "pageDesign", source, {partials_field: "|".join(brace(value) for value in partial_ids)}, {partials_field: "shared"})
            if identifier:
                self.shell_designs[family] = identifier

    def inspect_native_authoring(self) -> None:
        """Keep supported toolbox/variant prerequisites explicit and read-only.

        Available Renderings and Headless Variants are separate native site
        structures. Placeholder Allowed Controls does not configure either.
        No roots, enum values, insert-rule values or variant side effects are
        invented here; they must come from the actual site's SCS readback.
        """
        variant_path = "/sitecore/templates/Foundation/JSS Experience Accelerator/Headless Variants/Variant Definition"
        group_path = "/sitecore/templates/Foundation/JSS Experience Accelerator/Headless Variants/HeadlessVariants"
        list_path = "/sitecore/templates/Foundation/Experience Accelerator/Presentation/Available Renderings/_Renderings List/Data/Renderings"
        variant = self.native_by_path.get(variant_path)
        group = self.native_by_path.get(group_path)
        rendering_list = self.native_by_path.get(list_path)
        toolbox_root = self.site_root + "/Presentation/Available Renderings"
        variant_root = self.site_root + "/Presentation/Headless Variants"
        component_ids = {name: self.by_path[RENDERINGS_ROOT + "/" + name]["ID"].lower() for name in self.contract["components"]}
        missing_renderings, missing_variants = [], []
        visible = set()
        if rendering_list:
            for path, item in self.native_items.items():
                if planner.inside(path, toolbox_root.casefold()):
                    value = item["storage"]["shared"].get(rendering_list["id"].lower(), "")
                    if isinstance(value, str):
                        visible.update(str(uuid.UUID(match)) for match in re.findall(r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}", value))
        for name, identifier in component_ids.items():
            if identifier not in visible:
                missing_renderings.append(name)
            group_item = self.native_items.get((variant_root + "/" + name).casefold())
            default = self.native_items.get((variant_root + "/" + name + "/Default").casefold())
            if not group or not variant or not group_item or not default or group_item["templateId"] != group["id"].lower() or default["templateId"] != variant["id"].lower() or default["parentId"] != group_item["id"]:
                missing_variants.append(name)
        if missing_renderings:
            self.exception("target", "native-available-renderings-toolbox-readback-required", components=missing_renderings)
        if missing_variants:
            self.exception("target", "native-default-headless-variants-readback-required", components=missing_variants)
        self.exception("target", "native-page-local-datasource-configuration-readback-required", note="Preserve actual Settings/Editing behavior and Datasource Configurations until the enum values, AllowPageRelativeLocation, compatible rendering/template bindings and create/clone dialog behavior are independently verified")
        self.native_authoring = {"toolboxRoot": toolbox_root, "headlessVariantsRoot": variant_root, "renderingsListField": rendering_list, "headlessVariantsTemplate": group, "defaultVariantTemplate": variant, "componentRenderingIds": component_ids, "missingToolboxComponents": missing_renderings, "missingDefaultVariants": missing_variants, "pageLocalDatasourceConfigurationVerified": False, "remoteWrites": 0}

    def page_design(self, page: dict, key: str) -> str | None:
        legacy = str(page.get("shellFamily", "modern")).casefold().startswith("legacy")
        family = "legacy-" + (page.get("legacySharedKey") or "allianz-life") if legacy else "modern"
        identifier = self.shell_designs.get(family)
        if not identifier:
            self.exception(key, "native-default-page-design-unresolved", family=family)
        return identifier

    def build(self) -> dict:
        homepage = self.routes.get("/", {})
        source = homepage.get("sourceUrl", "https://www.allianzlife.com/")
        for path in (self.site_root + "/Data/Allianz Life", self.site_root + "/Data/Allianz Life/Navigation", self.site_root + "/Data/Allianz Life/Footer", self.site_root + "/Data/Allianz Life/Documents", self.site_root + "/Data/Allianz Life/Demo Variants"):
            self.folder(path, source)
        shared = self.fixtures.get("shared", {})
        families = [("modern", shared)] + [("legacy-" + label, values) for label, values in shared.get("legacyShared", {}).items()]
        families += [("legacy", self.fixtures.get("sharedLegacy", {}))]
        for family, values in families:
            for label, component in values.items():
                if not isinstance(component, dict) or "componentName" not in component:
                    continue
                name = component["componentName"]
                key = "shared:" + family + ":" + label
                path = self.site_root + "/Data/Allianz Life/" + ("Navigation" if "Header" in name else "Footer") + "/" + family + " " + safe_name(label)
                datasource = component.get("fields", {}).get("data", {}).get("datasource", {})
                identifier = self.add(key, path, TEMPLATES_ROOT + "/Components/" + name, source, self.fields(name, datasource, path, source, key))
                if label in ("header", "footer"):
                    self.shell_datasources.setdefault(family, {})[label] = identifier
        self.prepare_native_presentation(source)
        self.inspect_native_authoring()
        for route, page in sorted(self.routes.items(), key=lambda pair: (pair[0].count("/"), pair[0])):
            source = page["sourceUrl"]
            page_path = self.site_root + "/Home" + (route if route != "/" else "")
            for index in range(1, len(route.strip("/").split("/"))):
                prefix = "/" + "/".join(route.strip("/").split("/")[:index])
                if prefix not in self.routes:
                    self.exception("page:" + route, "missing-source-parent-route", parentRoute=prefix)
            self.folder(page_path + "/Data", source)
            layout = self.layout(page.get("components", []), page_path, source, route)
            base = TEMPLATES_ROOT + "/Pages/AllianzPage"
            source_id = page.get("sourceBodyId", "")
            source_classes = page.get("sourceBodyClasses", [])
            if source_id and not re.fullmatch(r"[A-Za-z][\w-]*", source_id):
                self.exception("page:" + route, "invalid-source-body-id", value=source_id)
                source_id = ""
            if not isinstance(source_classes, list) or any(not re.fullmatch(r"[A-Za-z][\w-]*", value) for value in source_classes):
                self.exception("page:" + route, "invalid-source-body-classes", value=source_classes)
                source_classes = []
            values = {"pageTitle": page.get("title", ""), "navigationTitle": page.get("title", ""), "metaDescription": page.get("description", ""), "sourceUrl": planner.canonical_source(source), "sourceHash": planner.checksum(page), "importVersion": "1", "shellFamily": page.get("shellFamily", "modern") or "modern", "legacySharedKey": page.get("legacySharedKey", ""), "sourceBodyId": source_id, "sourceBodyClasses": " ".join(source_classes)}
            fields = {self.field_id(base, name): value for name, value in values.items()}
            fields[FINAL_RENDERINGS] = layout
            design_id = self.page_design(page, "page:" + route)
            design_field = (self.presentation_bindings or {}).get("nativeFields", {}).get("pageDesignAssignment", {})
            if design_id:
                if design_field.get("storage") != "shared" or not design_field.get("id"):
                    raise ValueError("Native Page Design assignment/storage is unresolved")
                fields[str(design_field["id"]).lower()] = brace(design_id)
            if page.get("needsReview"):
                self.exception("page:" + route, "source-components-or-interactive-states-require-review")
            template = ARCHETYPE_TEMPLATE.get(page.get("archetype"))
            if not template:
                self.exception("page:" + route, "unmapped-page-archetype", archetype=page.get("archetype"))
                template = "Section Landing"
            self.add("page:" + route, page_path, TEMPLATES_ROOT + "/Pages/" + template, source, fields)
            if design_id:
                self.records["page:" + route]["fieldStorage"] = {str(design_field["id"]).lower(): "shared"}
        # Include all genuine downloaded originals, not only first-archetype
        # references. Unavailable originals remain explicit source exceptions.
        for src, row in sorted(self.media_by_src.items()):
            if row.get("status") in ("bundled", "available", "downloaded"):
                self.media_reference(src, row["sourceUrl"], "media-inventory:" + src)
        for row in self.documents_by_source.values():
            if row.get("status") in ("available", "downloaded"):
                self.media_reference(row["sourceUrl"], row["sourceUrl"], "document-inventory:" + row["sourceUrl"])
        if not self.target.get("siteId"):
            self.exception("target", "native-allianz-site-not-yet-bootstrapped-or-read")
        summary = {"sourceRoutes": len(self.routes), "editorialItemCandidates": len(self.records), "mediaUploadCandidates": len(self.media), "exceptionCount": len(self.exceptions), "remoteWrites": 0}
        return {"mode": "candidate-dry-run", "readyForImport": not self.exceptions, "target": {**{name: self.target.get(name) for name in ("projectId", "environmentId", "siteId")}, "siteRoot": self.site_root, "mediaRoot": MEDIA_ROOT}, "bindings": self.bindings, "language": "en", "items": sorted(self.records.values(), key=lambda record: (record["path"].count("/"), record["path"])), "mediaUploads": sorted(self.media.values(), key=lambda record: record["path"]), "exceptions": self.exceptions, "nativePresentation": {"pageDesignsByFamily": self.shell_designs, "fieldAdoption": False, "partialPlaceholderGenerationVerified": False, "remoteWrites": 0}, "nativeAuthoring": self.native_authoring, "summary": summary, "limitations": ["Candidate JSON only; no cloud write adapter is invoked", "Media upload and native site/design bootstrap precede editable page apply", "Native partial placeholder generation, actual Signature values and scaffold key bindings remain explicit readback gates", "Available Renderings, Default variants and local datasource authoring configuration need actual native readback", "Live apply must snapshot/recheck revisions and preserve author changes", "Source exceptions must be reviewed before claiming completeness or visual parity"]}


def load_rows(path: Path | None, key: str | None = None) -> list[dict]:
    if not path or not path.exists():
        return []
    value = json.loads(path.read_text())
    if isinstance(value, list):
        return value
    return value.get(key, value.get("assets", value.get("documents", value.get("items", []))))


def composition_modules():
    """Load the existing offline codec/schema, never a native write adapter."""
    result = []
    for name, filename in (("compose_native", "native-snapshot.py"), ("compose_editorial", "serialize-editorial.py")):
        module_spec = importlib.util.spec_from_file_location(name, SCRIPT_ROOT / filename)
        module = importlib.util.module_from_spec(module_spec)
        module_spec.loader.exec_module(module)
        result.append(module)
    return tuple(result)


def verify_bootstrap_capture(root: Path) -> dict:
    """Verify every supplied per-file hash and native document before use.

    The manifest protects accidental corruption; its digest still needs the
    independently checked archive provenance. It is not a signature or a claim
    that old readback is fresh enough for an apply.
    """
    native, _ = composition_modules()
    root = root.resolve()
    manifest = json.loads((root / "capture-manifest.json").read_text())
    target = manifest.get("target", {})
    if target.get("projectId") != native.PROJECT_ID or target.get("environmentId") != native.ENVIRONMENT_ID or target.get("siteRoot") != "/sitecore/content/allianz/allianz-life":
        raise ValueError("Bootstrap capture belongs to another native target")
    if manifest.get("remoteWrites") != 0 or manifest.get("credentialsExported") is not False:
        raise ValueError("Bootstrap capture is not the bounded credential-free readback")
    verified = {}
    for row in manifest["files"]:
        relative = Path(row["path"])
        path = root / relative
        if relative.is_absolute() or ".." in relative.parts or relative.as_posix() in verified or any(p.is_symlink() for p in (path, *path.parents)) or not path.resolve().is_relative_to(root):
            raise ValueError("Unsafe or duplicate capture manifest file")
        if not path.is_file() or path.stat().st_size != row["bytes"] or digest_file(path) != row["sha256"]:
            raise ValueError("Bootstrap per-file hash/size mismatch: " + str(relative))
        verified[relative.as_posix()] = row["sha256"]
    if not {"bootstrap-snapshot.json", "bootstrap-summary.json"}.issubset(verified):
        raise ValueError("Bootstrap snapshot and summary must be manifested")
    snapshot = json.loads((root / "bootstrap-snapshot.json").read_text())
    if snapshot.get("target") != target or snapshot.get("remoteWrites") != 0:
        raise ValueError("Bootstrap snapshot target/provenance mismatch")
    ids, paths = set(), set()
    for row in snapshot["items"]:
        if row["id"] in ids or row["path"].casefold() in paths:
            raise ValueError("Duplicate bootstrap native identity or path")
        ids.add(row["id"]); paths.add(row["path"].casefold())
        if verified.get(row["sourceFile"]) != row["sourceSha256"]:
            raise ValueError("Bootstrap item lacks its original manifested bytes")
        raw = native.read_scs(root / row["sourceFile"])
        if raw != row["rawSCS"] or any(raw[key] != row[name] for key, name in (("ID", "id"), ("Path", "path"), ("Parent", "parentId"), ("Template", "templateId"))):
            raise ValueError("Bootstrap item differs from its independently read native document")
        field_rows = []
        def append_fields(fields, storage, language=None, version=None):
            field_rows.extend({"id": f["ID"], "hint": f.get("Hint"), "storage": storage, "language": language, "version": version, "value": f["Value"], **({"blobId": f["BlobID"]} if "BlobID" in f else {})} for f in fields)
        append_fields(raw.get("SharedFields", []), "shared")
        for language in raw.get("Languages", []):
            append_fields(language.get("Fields", []), "unversioned", language["Language"])
            for version in language.get("Versions", []):
                append_fields(version.get("Fields", []), "versioned", language["Language"], version["Version"])
        if field_rows != row["fieldStorage"]:
            raise ValueError("Bootstrap normalized field scopes differ from original native storage")
    if len(ids) != manifest["uniqueSCSItems"]:
        raise ValueError("Bootstrap item count differs from manifest")
    scopes = []
    for path in sorted(verified):
        if path.endswith(".module.json"):
            module = json.loads((root / path).read_text())
            scopes.extend({"path": i["path"], "scope": i["scope"]} for i in module.get("items", {}).get("includes", []))
    return {"snapshot": snapshot, "root": str(root), "manifestSha256": digest_file(root / "capture-manifest.json"), "snapshotSha256": verified["bootstrap-snapshot.json"], "verifiedFileCount": len(verified), "requestedReadScopes": scopes}


def audit_native_composition(capture: dict) -> dict:
    """Audit observed relationships, without treating layout deltas as merged."""
    native, _ = composition_modules()
    rows = capture["snapshot"]["items"]
    by_path = {r["path"]: r for r in rows}
    mnp = "/sitecore/content/industry-verticals/mnp"
    def field(row, identifier, storage="shared"):
        raw = row["rawSCS"]
        if storage == "shared":
            return next((f["Value"] for f in raw.get("SharedFields", []) if f["ID"] == identifier), "")
        raise ValueError("Audit field lookup requires explicit shared storage")
    def identity(row):
        return {k: row.get(k) for k in ("id", "path", "parentId", "templateId", "revision", "sharedRevision", "sourceSha256")}
    mapping_item = by_path[mnp + "/Presentation/Page Designs"]
    mapping_raw = field(mapping_item, "ba1f60d6-3deb-40cc-bb61-eec772279ee1")
    # The observed outer UrlEncode wraps a UrlString whose GUID values are
    # separately encoded. parse_qsl performs the inner decoding exactly once.
    pairs = parse_qsl(unquote(mapping_raw), strict_parsing=True)
    mapping = {native.guid(k, "Mapped template"): native.guid(v, "Mapped design") for k, v in pairs}
    if len(mapping) != len(pairs):
        raise ValueError("Duplicate native page-template mapping")
    home = by_path[mnp + "/Home"]
    design = by_path[mnp + "/Presentation/Page Designs/Default"]
    explicit = field(home, "24171bf1-c0e1-480e-be76-4c0a1876f916")
    if explicit or mapping.get(home["templateId"]) != design["id"]:
        raise ValueError("Observed MNP Home does not select the expected mapped Default design")
    partial_ids = [native.guid(v, "Partial design") for v in field(design, "0966b999-0d0e-4278-acc9-9da69d461fe6").split("|") if v]
    expected_partials = [by_path[mnp + "/Presentation/Partial Designs/" + name] for name in ("Header", "Footer")]
    if partial_ids != [r["id"] for r in expected_partials]:
        raise ValueError("Observed Default partial order differs from Header then Footer")
    partials = []
    for row in expected_partials:
        if row["templateId"] != "fd2059fd-6043-4dfe-8c04-e2437ce87634":
            raise ValueError("MNP partial does not use the observed headless model")
        layouts = []
        for f in row["fieldStorage"]:
            if f["id"] not in ("f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e", FINAL_RENDERINGS) or not f["value"]:
                continue
            xml = ET.fromstring(f["value"])
            renderings = [{key.split("}")[-1]: value for key, value in r.attrib.items()} for d in xml.findall("d") for r in d.findall("r")]
            layouts.append({"fieldId": f["id"], "storage": f["storage"], "language": f["language"], "version": f["version"], "rawDeltaSha256": hashlib.sha256(f["value"].encode()).hexdigest(), "renderings": renderings, "effectiveMergedLayout": False})
        partials.append({**identity(row), "signature": field(row, "55faae90-3bba-4f7f-96fe-13c3f40055ff"), "layouts": layouts})
    placeholders = []
    for row in rows:
        if row["templateId"] == "5c547d4e-7111-4995-95b0-6b561751bf2e":
            placeholders.append({**identity(row), "key": field(row, "7256bdab-1fd2-49dd-b205-cb4873d2917c"), "allowedControls": re.findall(r"[\da-fA-F]{8}(?:-[\da-fA-F]{4}){3}-[\da-fA-F]{12}", field(row, "e391b526-d0c5-439d-803e-17512eae6222"))})
    enum_roots = {
        "nonReusableDatasourceBehaviour": "/sitecore/system/Settings/Foundation/Experience Accelerator/Editing/DatasourceBehaviour",
        "globalDatasourceSelectionBehaviour": "/sitecore/system/Settings/Foundation/Experience Accelerator/Local Datasources/Enums/Data Source Selection Behavior",
    }
    enums = {name: [{**identity(r), "value": field(r, "f917c951-1f75-4d62-b14a-bc6888d7eeca")} for r in rows if r["parentId"] == by_path[path]["id"]] for name, path in enum_roots.items()}
    site = capture["snapshot"]["target"]["siteRoot"]
    generated_root = by_path[site + "/Presentation/Placeholder Settings/Partial Design"]
    if not any(s["scope"] == "ItemAndDescendants" and planner.inside(generated_root["path"], s["path"]) for s in capture.get("requestedReadScopes", [])):
        raise ValueError("Allianz generated-placeholder folder lacks full-subtree read scope")
    return {
        "mode": "actual-same-tenant-native-readback-audit",
        "target": capture["snapshot"]["target"],
        "provenance": {
            k: capture[k] for k in ("manifestSha256", "snapshotSha256", "verifiedFileCount")
        },
        "mnp": {
            "home": identity(home),
            "selection": "captured template mapping; no explicit stored Home Page Design",
            "mappingRaw": mapping_raw,
            "mappingDecoded": mapping,
            "defaultPageDesign": {
                **identity(design),
                "partialIds": partial_ids
            },
            "partials": partials,
            "capturedNestedPlaceholders": placeholders,
            "generatedPartialPlaceholderSubtreeCaptured": False
        },
        "allianz": {
            "home": identity(by_path[site + "/Home"]),
            "generatedPartialPlaceholderRoot": identity(generated_root),
            "capturedGeneratedPlaceholderChildren": [identity(r) for r in rows if r["path"].startswith(generated_root["path"] + "/")],
            "siteEditingItemPresent": site + "/Settings/Editing" in by_path
        },
        "datasourceEnums": enums,
        "factsAndLimits": ["Header/Footer shared Signature values identify partials; authored raw renderings target headless-header/headless-footer and nested dynamic placeholders", "The eight captured MNP nested placeholders describe component children, not a proved ItemAdded-generated partial placeholder", "MNP Presentation/Placeholder Settings was outside this bounded capture; its generated placeholder presence is unknown", "Allianz Presentation was fully captured and its existing Partial Design placeholder folder has no children", "Literal enum Values, not GUIDs or display names, belong in the captured Droplist fields", "An existing blueprint proves item relationships, not which creation transport or ItemAdded event originally created them", "Supported CLI/API/event creation remains eligible for a bounded native experiment; no browser-only requirement is inferred", "No merged Layout Service output, Pages editing, branch cloning or publish behavior has been verified"],
        "nativeCreationSideEffectsProven": False,
        "remoteWrites": 0
    }


def build_native_home_composition(manifest: dict, scaffold: dict, schema, capture: dict) -> dict:
    """Prepare exact desired writes and gates from actual readback only.

    This intentionally is not serialize-editorial.build_plan: that adapter
    rejects Home template/field adoption and unresolved linked-page references.
    Neither evidence is silently manufactured to make its preflight pass.
    """
    native, editorial = composition_modules()
    _, old_paths = native.verify_snapshot(scaffold)
    if manifest["target"] != scaffold["target"] or manifest.get("bindings") != scaffold.get("bindings"):
        raise ValueError("Home candidates do not match actual native bindings")
    target = scaffold["target"]; site = target["siteRoot"]
    if any(capture["snapshot"]["target"].get(k) != target.get(k) for k in ("projectId", "environmentId", "siteRoot")):
        raise ValueError("Composition readback and scaffold target differ")
    actual = {r["path"].casefold(): r for r in capture["snapshot"]["items"]}
    home_now = actual[(site + "/Home").casefold()]
    home_before = old_paths[(site + "/Home").casefold()]
    if home_now["sourceSha256"] != home_before["rawScsSha256"]:
        raise ValueError("Native Home changed between scaffold and bootstrap captures")
    current = dict(old_paths); current.update(actual)
    by_key = {r["key"]: r for r in manifest["items"]}
    if len(by_key) != len(manifest["items"]):
        raise ValueError("Duplicate candidate key")
    selected = {r["key"] for r in manifest["items"] if r["key"] == "page:/" or planner.inside(r["path"], site + "/Home/Data") or r["key"].startswith(("shared:modern:header", "shared:modern:footer"))}
    selected.update(("presentation:shell:modern:header", "presentation:shell:modern:footer", "presentation:page-design:modern"))
    # Preserve deterministic identity keys. Direct children of the existing
    # Partial Designs root avoid an unnecessary Global folder, as in real MNP.
    records = {k: copy.deepcopy(by_key[k]) for k in selected}
    for label in ("header", "footer"):
        row = records["presentation:shell:modern:" + label]
        row["path"] = site + "/Presentation/Partial Designs/Allianz modern " + label.title()
    all_candidates = {r["path"].casefold(): r for r in manifest["items"]}
    for row in list(records.values()):
        parent = row["path"].rsplit("/", 1)[0]
        while parent.casefold() not in current:
            ancestor = all_candidates.get(parent.casefold())
            if not ancestor:
                raise ValueError("Missing actual or candidate composition parent: " + parent)
            records[ancestor["key"]] = copy.deepcopy(ancestor)
            parent = parent.rsplit("/", 1)[0]
    paths = {r["path"].casefold(): r["id"] for r in records.values()}
    paths.update({p: r["id"] for p, r in current.items()})
    known_ids = {r["id"]: r for r in records.values()}
    known_ids.update({r["id"]: r for r in current.values()})
    media = {r["id"]: r for r in manifest["mediaUploads"]}
    linked, required_media, operations, reuses = {}, {}, [], []
    for row in sorted(records.values(), key=lambda r: (r["path"].count("/"), r["path"].casefold())):
        expected_id = scaffold["bindings"].get(row["key"], planner.item_id(row["key"]))
        if row["id"] != expected_id:
            raise ValueError("Composition identity lacks deterministic key or actual native binding")
        for field_id in row.get("fields", {}):
            schema.field(row["templateId"], field_id)
        refs, local_paths = editorial.references(row, schema, site)
        for identifier in refs:
            if identifier in media:
                required_media[identifier] = media[identifier]
            elif identifier not in known_ids:
                linked_row = next((r for r in manifest["items"] if r["id"] == identifier and r["key"].startswith("page:")), None)
                if not linked_row:
                    raise ValueError("Unresolved non-page composition reference: " + identifier)
                linked[identifier] = {k: linked_row[k] for k in ("key", "id", "path", "templateId")}
        if any(p.casefold() not in paths for p in local_paths):
            raise ValueError("Unresolved page-local datasource in Home layout")
        existing = current.get(row["path"].casefold())
        if row["key"] == "page:/":
            continue
        if existing:
            if any(existing[k] != row[k] for k in ("id", "path", "templateId")) or existing["parentId"] != paths[row["path"].rsplit("/", 1)[0].casefold()]:
                raise ValueError("Composition collides with existing native item")
            reuses.append({"key": row["key"], "id": row["id"], "path": row["path"], "requiresExactFieldReadback": True})
            continue
        storage = editorial.empty_storage()
        for identifier, value in row.get("fields", {}).items():
            editorial.set_native_field(storage, schema.field(row["templateId"], identifier), identifier, value, 1)
        parent_id = paths[row["path"].rsplit("/", 1)[0].casefold()]
        operations.append({
                "action": "create-desired-blueprint",
                "key": row["key"],
                "id": row["id"],
                "path": row["path"],
                "parentId": parent_id,
                "templateId": row["templateId"],
                "fields": row.get("fields", {
                    }),
                "referenceIds": sorted(refs),
                "localDatasourcePaths": sorted(local_paths),
                "precondition": {
                    "idAbsent": True,
                    "pathAbsent": True,
                    "freshCompleteScopeRequired": site
                },
                "native": {
                    "ID": row["id"],
                    "Parent": parent_id,
                    "Template": row["templateId"],
                    "Path": row["path"],
                    "storage": storage
                }
            })
    home = records["page:/"]
    if not native.inherits_template(home["templateId"], home_before["templateId"], schema.items):
        raise ValueError("Desired Home does not inherit the actual generated real Page template")
    retained = schema.inherited_fields(home["templateId"])
    if not set(home_before["fields"]).issubset(retained):
        raise ValueError("Desired Home template drops captured stored fields")
    if set(home["fields"]) & set(home_before["fields"]):
        raise ValueError("Home adoption would overwrite an existing stored field")
    parent_ids = {o["parentId"] for o in operations}
    parents = [{k: r.get(k) for k in ("id", "path", "parentId", "templateId", "revision", "sharedRevision", "rawScsSha256", "sourceSha256")} for r in current.values() if r["id"] in parent_ids]
    home_layout = ET.fromstring(home["fields"][FINAL_RENDERINGS])
    component_ids = {native.guid(r.get("{s}id"), "Home rendering") for r in home_layout.findall("./d/r")}
    component_ids.update(native.guid(r.get("{s}id"), "Shell rendering") for label in ("header", "footer") for r in ET.fromstring(records["presentation:shell:modern:" + label]["fields"][editorial.SHARED_LAYOUT]).findall("./d/r"))
    components = sorted(schema.items[i]["Path"].rsplit("/", 1)[-1] for i in component_ids)
    renderings_field = "715ae6c0-71c8-4744-ab4f-65362d20ad65"
    toolbox = current[(site + "/Presentation/Available Renderings").casefold()]
    variants = current[(site + "/Presentation/Headless Variants").casefold()]
    category_model = current[(site + "/Presentation/Available Renderings/Page Content").casefold()]
    group_model = current[(site + "/Presentation/Headless Variants/RichText").casefold()]
    default_model = current[(site + "/Presentation/Headless Variants/RichText/Default").casefold()]
    category_path = toolbox["path"] + "/Allianz Life"
    authoring = [{"id": planner.item_id("bootstrap:" + category_path), "path": category_path, "parentId": toolbox["id"], "templateId": category_model["templateId"], "fields": {renderings_field: "|".join(brace(i) for i in sorted(component_ids))}}]
    for name in components:
        path = variants["path"] + "/" + name
        identifier = planner.item_id("bootstrap:" + path)
        authoring.append({"id": identifier, "path": path, "parentId": variants["id"], "templateId": group_model["templateId"], "fields": {}})
        path += "/Default"
        authoring.append({"id": planner.item_id("bootstrap:" + path), "path": path, "parentId": identifier, "templateId": default_model["templateId"], "fields": {}})
    for row in authoring:
        for identifier in row["fields"]:
            if schema.field(row["templateId"], identifier)["storage"] != "shared":
                raise ValueError("Toolbox field lacks actual shared storage evidence")
        observed = current.get(row["path"].casefold())
        row["observedStateAtBootstrapCapture"] = "present" if observed else "absent"
        row["nativeWriteExecuted"] = False
        row["freshReadbackRequired"] = True
    authoring_parents = [{k: r.get(k) for k in ("id", "path", "parentId", "templateId", "revision", "sharedRevision", "rawScsSha256", "sourceSha256")} for r in (toolbox, variants)]
    enum_bindings = {}
    for identifier in ("332a4c4e-222d-4a94-abcc-79f92f3b7b4b", "c80e6f3c-5bcd-426b-b1eb-6d10672e985d"):
        definition = schema.fields[identifier]
        if definition["type"] != "Droplist" or definition["storage"] != "shared":
            raise ValueError("Datasource enum field lacks observed shared Droplist schema")
        source = next((f["Value"] for f in schema.items[identifier]["SharedFields"] if f.get("Hint") == "Source"), None)
        if not source:
            raise ValueError("Datasource enum field lacks its observed option source")
        enum_bindings[identifier] = {"type": definition["type"], "storage": definition["storage"], "source": source, "hint": definition["hint"]}
    richtext_delta = [r for r in authoring if "/AllianzRichText" in r["path"]]
    audit = audit_native_composition(capture)
    result = {
        "mode": "private-next-home-composition-review",
        "executable": False,
        "applyReady": False,
        "remoteWrites": 0,
        "target": target,
        "provenance": {"scaffoldSha256": planner.checksum(scaffold), "candidateManifestSha256": planner.checksum(manifest), **audit["provenance"]},
        "minimalShell": {
            "existingPartialDesignsLibraryId": old_paths[(site + "/Presentation/Partial Designs").casefold()]["id"],
            "existingPageDesignsLibraryId": old_paths[(site + "/Presentation/Page Designs").casefold()]["id"],
            "partialPlacement": "direct children; unnecessary Global folder omitted",
            "desiredDesignIds": {
                k: records[k]["id"] for k in sorted(records) if k.startswith("presentation:")
            },
            "homeAssignment": "explicit shared Page Design; existing TemplatesMapping stays unchanged",
            "generatedPlaceholderWrites": [],
            "settingsWrites": []
        },
        "createBlueprints": operations,
        "existingReuses": reuses,
        "existingParentPreconditions": parents,
        "requiredMediaReadbacks": [{"id": r["id"], "path": r["path"], "templateId": r["templateId"], "sha256": r["binary"]["sha256"], "bytes": r["binary"]["bytes"]} for r in sorted(required_media.values(), key=lambda r: r["path"])],
        "linkedPagesOutsideWriteScope": sorted(linked.values(), key=lambda r: r["path"]),
        "authoringPrerequisites": {
            "components": components,
            "renderingIds": sorted(component_ids),
            "desiredFullBootstrapItems": authoring,
            "priorFourComponentBootstrapIsInsufficient": "AllianzRichText" in components,
            "nextDeltaAfterPriorBootstrapReadback": {
                "createItems": richtext_delta,
                "toolboxMerge": {
                    "id": authoring[0]["id"],
                    "path": category_path,
                    "fieldId": renderings_field,
                    "appendRenderingId": schema.items[next(i for i in component_ids if schema.items[i]["Path"].endswith("/AllianzRichText"))]["ID"],
                    "requiresFreshNativeRevisionAndRawHash": True,
                    "preserveExistingRenderingIds": True,
                    "observedPostPriorStage": False
                }
            },
            "enumAudit": audit["datasourceEnums"],
            "siteEditingItemPresent": audit["allianz"]["siteEditingItemPresent"],
            "settingsAndDatasourceConfigurationWrites": []
        },
        "homeBaseline": {
            "id": home["id"],
            "path": home["path"],
            "parentId": home_before["parentId"],
            "currentTemplateId": home_before["templateId"],
            "desiredTemplateId": home["templateId"],
            "selectedLanguage": "en",
            "selectedVersion": home_before["selectedVersion"],
            "revisionPrecondition": home_now["revision"],
            "rawScsSha256Precondition": home_now["sourceSha256"],
            "retainedStoredFieldCount": len(home_before["fields"]),
            "beforeRawScs": home_before["rawScs"],
            "beforeStorage": copy.deepcopy(home_before["storage"]),
            "newManagedFields": [{
                    "id": i,
                    "hint": schema.field(home["templateId"], i)["hint"],
                    "storage": schema.field(home["templateId"], i)["storage"],
                    "before": {
                        "stored": False
                    },
                    "desiredValue": v
                } for i, v in home["fields"].items()],
            "steps": ["Fresh full native Home export and raw hash/revision check under an exclusive authoring interval", "Change only Home template using a supported native API/event path; retain UUID, parent, English version and all captured content fields; allow platform audit/revision updates", "Read back Home and verify all stored fields remain represented in the new real Page lineage", "Explicitly adopt only these previously absent managed fields and set their reviewed desired values after dependencies are real; no unowned stored field adoption", "Read back every changed scope/value and create the successful-import baseline only from observed native values"],
            "rollback": ["Before any rollback, freshly compare the post-write native hash/revision and abort on author changes", "Restore original template and original content field scopes/values; remove only newly introduced managed field overrides, preserving actual absent versus empty state", "Retain native audit revisions instead of forcing the old revision string; preserve all other languages/versions and unrelated author content", "Keep created dependent items recoverable; do not delete/recreate Home, sites, projects or environments"],
            "atomicRevisionCompareAndSwapAvailable": False,
            "baselineEstablished": False,
            "templateChangeExecuted": False,
            "fieldAdoptionExecuted": False
        },
        "creationExperiment": {
            "rawItemAddedSideEffectsProven": False,
            "probePaths": [records["presentation:shell:modern:" + label]["path"] for label in ("header", "footer")],
            "probeTemplateId": "fd2059fd-6043-4dfe-8c04-e2437ce87634",
            "probeAuthoredFields": {
            },
            "allowedCreationRoutesAfterApproval": ["supported native CLI", "supported native API/event path", "native UI"],
            "method": "Freshly prove exact paths/IDs absent, create the two empty native partial instances through one supported route, then independently capture actual Signature, raw layouts and the full Allianz Presentation/Placeholder Settings subtree before applying authored fields",
            "preservation": "Any actual generated placeholder ID/key/fields remain native evidence. Do not create a guessed sxa item, overwrite a generated key, or treat the desired Signature as event readback",
            "authoredBlueprintReconciliation": "Compare observed side effects with the desired allianz-modern-header/footer Signature and headless-header/footer layout; review any dependent generated-key reconciliation before a revision-fenced field update"
        },
        "gates": ["Parent-owned media/toolbox stage has a fresh successful actual readback, including exact existing pilot GUID and decoded-byte hash", "Fresh complete Allianz Home/Data/Presentation readback proves every proposed create absent and every existing parent unchanged", "Exact required project templates/renderings/placeholders and structural delta are deployed/read back; source WIP commit is not evidence of native application", "Bounded creation experiment establishes actual native side effects or a reviewed supported equivalent without invented placeholder items", "Native Home template change and previously absent field adoption are explicitly reviewed; SCS update execution remains disabled without revision-safe integration", f"{len(linked)} linked route references require explicit separately approved route work or an approved link policy; no implicit child-page creation", "Settings/Editing absence does not establish effective inherited behavior; page-local create/selection/clone behavior remains an acceptance check", "Read effective native layout and verify one editable Home flow before claiming composition success or publishing"],
        "summary": {
            "desiredCreateBlueprints": len(operations),
            "nativeShellCreates": sum(o["key"].startswith("presentation:") for o in operations),
            "homeDatasourceAndSharedDataCreates": sum(not o["key"].startswith("presentation:") for o in operations),
            "requiredMedia": len(required_media),
            "linkedPagesOutsideScope": len(linked),
            "homeManagedFieldAdoptions": len(home["fields"]),
            "remoteWrites": 0
        }
    }
    result["authoringPrerequisites"]["existingParentPreconditions"] = authoring_parents
    result["authoringPrerequisites"]["enumFieldBindings"] = enum_bindings
    result["authoringPrerequisites"]["effectiveDatasourceBehaviorKnown"] = False
    result["creationExperiment"]["probeItems"] = [{k: r[k] for k in ("id", "path", "parentId", "templateId")} for r in operations if r["key"].startswith("presentation:shell:modern:")]
    return result


def blueprint_wire_contract(item: dict, editorial, schema) -> dict:
    """Disclose every blueprint's source/wire representation without native claims."""
    contracts = []
    for bucket, version, identifier, value in editorial.storage_value_rows(item["storage"]):
        definition = schema.field(item["Template"], identifier)
        contracts.append({
            "fieldId": identifier, "fieldType": definition["type"],
            "storageBucket": bucket, "version": version,
            **editorial.value_codec.value_contract(editorial.field_value(value)),
        })
    return {
        "nativeValueEncoding": editorial.value_codec.ENCODING,
        "sourceLogicalStorageSha256": planner.checksum(item["storage"]),
        "expectedSerializedWireStorageSha256": planner.checksum(editorial.wire_storage(item["storage"])),
        "fieldContracts": contracts,
        "actualNativeReadbackVerified": False,
        "typedJsonValueVerified": False,
    }


def write_native_home_composition(output: Path, plan: dict, audit: dict, schema) -> None:
    """Private review artifacts only, with no executable push module."""
    _, editorial = composition_modules()
    if any(p.is_symlink() for p in (output, *output.parents)) or output.resolve().is_relative_to(REPO.resolve()):
        raise ValueError("Composition review artifacts must be private and outside the repository")
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    written_paths = []
    def write(path, value):
        if any(p.is_symlink() for p in (path, *path.parents)):
            raise ValueError("Private composition output cannot follow symbolic links")
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        fd = os.open(path, os.O_CREAT | os.O_TRUNC | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "w") as stream:
            stream.write(value)
        written_paths.append(path)
    plan = copy.deepcopy(plan)
    plan["blueprintWireContracts"] = {
        operation["id"]: blueprint_wire_contract(operation["native"], editorial, schema)
        for operation in plan["createBlueprints"]
    }
    plan["nativeValueEncoding"] = editorial.value_codec.ENCODING
    write(output / "composition-plan.json", json.dumps(plan, indent=2, ensure_ascii=False) + "\n")
    write(output / "native-composition-audit.json", json.dumps(audit, indent=2, ensure_ascii=False) + "\n")
    for index, operation in enumerate(plan["createBlueprints"]):
        write(output / "desired-scs-blueprints" / (str(index).zfill(3) + ".yml"), editorial.serialize_item(operation["native"], schema))
    for index, row in enumerate(plan["authoringPrerequisites"]["desiredFullBootstrapItems"]):
        storage = editorial.empty_storage()
        for identifier, value in row["fields"].items():
            editorial.set_native_field(storage, schema.field(row["templateId"], identifier), identifier, value, 1)
        item = {"ID": row["id"], "Parent": row["parentId"], "Template": row["templateId"], "Path": row["path"], "storage": storage}
        write(output / "authoring-prerequisite-blueprints" / (str(index).zfill(3) + "-value-contract.json"), json.dumps(blueprint_wire_contract(item, editorial, schema), indent=2, ensure_ascii=False) + "\n")
        write(output / "authoring-prerequisite-blueprints" / (str(index).zfill(3) + ".yml"), editorial.serialize_item(item, schema))
    write(output / "Home-before.yml", plan["homeBaseline"]["beforeRawScs"])
    write(output / "README.md", "# Private next Home composition review\n\nThese are desired native blueprints, not an executable push module. No remote writes were made.\n\nReview composition-plan.json for exact IDs, parents, fields, references, revision/hash preconditions, native creation probe and reversible Home baseline. native-composition-audit.json separates actual MNP relationships from unproved creation-event behavior. Home-before.yml preserves the exact original native item.\n\nThe minimal shell has two partials directly under the existing Partial Designs library and one Default design. No Global folder, TemplatesMapping update, Settings write or invented generated placeholder is proposed. The Home final layout also needs AllianzRichText toolbox/default-variant support beyond the prior four-component bootstrap.\n\nAll 52 linked route IDs remain outside this write scope. Media, source security, structural application, native creation/readback, Home migration/adoption and editing/publish acceptance gates remain open. Native SCS updates have no atomic revision compare-and-swap in the current adapter.\n")
    review = ["# Native MNP audit and minimal Home composition", "", "## Actual evidence", "", f"Verified {audit['provenance']['verifiedFileCount']} manifested capture files against their original sizes and SHA256 values. The parent-verified archive provenance remains the trust anchor; the manifest is not a digital signature.", "", "MNP Home has no stored explicit Page Design assignment. Its observed TemplatesMapping selects Default, whose shared PartialDesigns references Header then Footer. Signature is shared header/footer, while the authored shared rendering deltas target headless-header/headless-footer and nested dynamic placeholders. Final-layout deltas are preserved as deltas, not reported as effective merged output.", "", "Eight real nested MNP placeholder settings describe component children. MNP Presentation/Placeholder Settings was not captured, so generated partial-placeholder presence there is unknown. Allianz Presentation was fully captured; its existing Partial Design placeholder folder is empty. Neither fact proves ItemAdded event behavior or a required browser transport.", "", "## Exact minimal shell", ""]
    for operation in plan["createBlueprints"]:
        if operation["key"].startswith("presentation:"):
            review.append(f"- {operation['path']}\n  ID {operation['id']}; parent {operation['parentId']}; template {operation['templateId']}")
    review.extend(["", "Reuse the two actual native design libraries. Place the two modern partials directly under Partial Designs, as the real MNP shape does; omit an unnecessary Global folder. Assign Default through the shared native Page Design field on Home. Do not change template mappings, Settings or guessed generated placeholders.", "", "## Desired payload and reference boundary", "", f"The review contains {plan['summary']['desiredCreateBlueprints']} desired create blueprints: {plan['summary']['homeDatasourceAndSharedDataCreates']} Home/shared data items plus {plan['summary']['nativeShellCreates']} shell design items. All exact parent IDs, field IDs/scopes, references and local datasource paths are enumerated in composition-plan.json. These counts are blueprints, not confirmed native operation counts: creation events may generate additional native items, and separate revision-fenced authored-field updates follow the raw creation probe.", "", f"The {len(plan['requiredMediaReadbacks'])} media references require fresh identity/template/decoded-byte hash checks. The {len(plan['linkedPagesOutsideWriteScope'])} linked page IDs are outside the write scope. Do not create child-page skeletons implicitly, rewrite links or publish unresolved references; resolve them through separately approved route work or link policy.", "", "## Toolbox and enum behavior", "", "Home uses AllianzHeader, AllianzFooter, AllianzHero, AllianzCardGrid and AllianzRichText. The previous four-component bootstrap lacks RichText. After that stage is actually read back, create the two exact RichText group/Default items and merge only its rendering ID into the existing Allianz Life category, preserving all existing rendering IDs. The complete 11-item desired bootstrap and the conditional three-operation delta are enumerated; neither is represented as applied.", ""])
    for name, rows in audit["datasourceEnums"].items():
        review.append(f"- {name}: " + ", ".join(r["value"] for r in rows))
    review.extend(["", "The observed enum fields are shared Droplists: store literal option Values, not option GUIDs or display labels. AutoNameStoreUnderPage is the captured current-page auto-name option; AskUser/Copy/DoNotCopy govern global datasource selection. These are distinct controls. Allianz Settings/Editing is absent, so effective inherited behavior is unknown. Existing schema defaults AllowPageRelativeLocation=1 and DoNotCopy do not prove effective site behavior or branch-clone remapping. No Settings/Editing or datasource-configuration write is proposed.", "", "## Native probe and reversible Home baseline", "", "1. Freshly prove the exact two partial IDs/paths absent and the native parent unchanged. Create empty headless Partial Design instances through one supported CLI/API/event or UI path. Capture actual Signature, raw layouts and the full generated-placeholder subtree before applying any authored blueprint fields. Preserve all actual generated IDs, keys and fields; review dependent key/signature reconciliation if required.", "2. Verify referenced project structure and data/media before composing Default and Home. Observe native merged layout, rather than assuming the stored XML demonstrates runtime output.", f"3. Snapshot Home {plan['homeBaseline']['id']} completely and recheck revision {plan['homeBaseline']['revisionPrecondition']} and raw SHA256 {plan['homeBaseline']['rawScsSha256Precondition']}. Change only the template from {plan['homeBaseline']['currentTemplateId']} to {plan['homeBaseline']['desiredTemplateId']} through a supported native path. Its real Page inheritance retains all {plan['homeBaseline']['retainedStoredFieldCount']} stored fields; preserve UUID, parent, English version, all other languages/versions and author content while allowing native audit/revision updates.", f"4. Read back the template change, then explicitly adopt only the {len(plan['homeBaseline']['newManagedFields'])} previously absent managed fields at their observed native storage scopes. Capture a new successful-import baseline from actual values; the current offline review does not establish it.", "5. For rollback, freshly compare the post-write revision/hash and stop on author changes. Restore original template and original content scopes/values, remove only introduced field overrides while preserving absence versus empty, and allow current native audit revisions. Retain dependent items recoverably; never delete/recreate Home, the site, project or environment.", "", "The existing SCS adapter has no atomic revision compare-and-swap and executes no updates. Home changes require a separately verified revision-safe native integration or exclusive authoring interval. Editing, local create/selection, image/link JSON, branch clone, publication and Edge rendering remain acceptance gates.", "", "## Validation performed", "", "Offline captured-file verification, native model/field membership and storage checks, desired SCS round-trip parsing, exact parent/reference enumeration and the adjacent native composition safety suite. No remote calls, authentication setup, native write, publishing or browser editing was performed.", ""])
    write(output / "NATIVE-COMPOSITION-REVIEW.md", "\n".join(review))
    artifact_files = sorted(written_paths)
    write(output / "PACKAGE-MANIFEST.json", json.dumps({"mode": plan["mode"], "target": plan["target"], "executable": False, "remoteWrites": 0, "files": [{"path": str(p.relative_to(output)), "bytes": p.stat().st_size, "sha256": digest_file(p)} for p in artifact_files]}, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fixtures", type=Path)
    parser.add_argument("--target", required=True, type=Path)
    parser.add_argument("--schema", required=True, type=Path)
    parser.add_argument("--presentation-bindings", type=Path, help="Verified native presentation registry; missing registry remains an import blocker")
    parser.add_argument("--native-snapshot", type=Path, help="Private independently read-back scaffold snapshot; never guessed Site or Channels IDs")
    parser.add_argument("--compose-native-home", action="store_true", help="Treat the positional JSON as bound candidates and write a private next-Home review directory; never applies native writes")
    parser.add_argument("--native-bootstrap-capture", type=Path, help="Manifested same-tenant native bootstrap capture directory for --compose-native-home")
    parser.add_argument("--media-sources", type=Path)
    parser.add_argument("--assets", type=Path, help="Verified full original raster download manifest")
    parser.add_argument("--vectors", type=Path)
    parser.add_argument("--documents", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.compose_native_home:
        if not args.native_snapshot or not args.native_bootstrap_capture or not args.presentation_bindings:
            parser.error("--compose-native-home requires --native-snapshot, --native-bootstrap-capture and --presentation-bindings")
        _, editorial = composition_modules()
        scaffold = json.loads(args.native_snapshot.read_text())
        requested_target = json.loads(args.target.read_text())
        if any(requested_target.get(k) != scaffold["target"].get(k) for k in ("projectId", "environmentId")):
            raise ValueError("Requested target differs from native scaffold")
        schema = editorial.Schema.from_files(args.schema, REPO / "authoring/allianz-life/structure-manifest.json", scaffold)
        registry = json.loads(args.presentation_bindings.read_text())
        if any(registry.get("provenance", {}).get("target", {}).get(k) != scaffold["target"].get(k) for k in ("projectId", "environmentId")):
            raise ValueError("Presentation registry belongs to another native target")
        for role in ("partialDesign", "pageDesign", "partialDesignsLibrary", "pageDesignsLibrary"):
            definition = registry["nativeTemplates"][role]
            observed = schema.items.get(str(definition["id"]).lower())
            if not observed or observed["Path"] != definition["path"]:
                raise ValueError("Presentation registry lacks observed native model: " + role)
        capture = verify_bootstrap_capture(args.native_bootstrap_capture)
        plan = build_native_home_composition(json.loads(args.fixtures.read_text()), scaffold, schema, capture)
        write_native_home_composition(args.output, plan, audit_native_composition(capture), schema)
        print(json.dumps(plan["summary"]))
        return
    documents = load_rows(args.documents)
    for row in documents:
        row["sourceUrl"] = row.get("sourceUrl", row.get("url"))
        local_path = row.get("localPath", row.get("local_path"))
        if local_path:
            local_path = Path(local_path)
            row["localPath"] = str(local_path if local_path.is_absolute() else args.documents.parent / local_path)
        row["contentType"] = row.get("contentType", row.get("content_type"))
    report = Builder(json.loads(args.fixtures.read_text()), json.loads(args.target.read_text()), json.loads(args.schema.read_text()), load_rows(args.media_sources) + load_rows(args.assets), load_rows(args.vectors), documents, json.loads(args.presentation_bindings.read_text()) if args.presentation_bindings else None, json.loads(args.native_snapshot.read_text()) if args.native_snapshot else None).build()
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(report["summary"]))


if __name__ == "__main__":
    main()
