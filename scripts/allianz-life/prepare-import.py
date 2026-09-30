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
from pathlib import Path
import re
from urllib.parse import urlsplit, urlencode
import uuid
import xml.etree.ElementTree as ET

SCRIPT_ROOT = Path(__file__).resolve().parent
REPO = SCRIPT_ROOT.parents[1]
PUBLIC = REPO / "examples/allianz-life/public"
spec = importlib.util.spec_from_file_location("import_planner", SCRIPT_ROOT / "import-planner.py")
planner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(planner)
SITE_ROOT = "/sitecore/content/Allianz/allianz-life"
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
                self.exception(key, "native-generated-partial-placeholder-readback-required", partialPath=library_root + "/Global/" + name, signature=signature, note="Create through supported native partial-design authoring, read and preserve the generated placeholder settings, then explicitly reconcile the captured Signature and rendering placeholder path")
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fixtures", type=Path)
    parser.add_argument("--target", required=True, type=Path)
    parser.add_argument("--schema", required=True, type=Path)
    parser.add_argument("--presentation-bindings", type=Path, help="Verified native presentation registry; missing registry remains an import blocker")
    parser.add_argument("--native-snapshot", type=Path, help="Private independently read-back scaffold snapshot; never guessed Site or Channels IDs")
    parser.add_argument("--media-sources", type=Path)
    parser.add_argument("--assets", type=Path, help="Verified full original raster download manifest")
    parser.add_argument("--vectors", type=Path)
    parser.add_argument("--documents", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
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
