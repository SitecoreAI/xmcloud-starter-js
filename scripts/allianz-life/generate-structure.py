#!/usr/bin/env python3
"""Generate isolated Allianz structural Sitecore YAML from an explicit contract.

No editorial content, media, tenant configuration, users, or credentials are
serialized here. Native site/presentation bootstrap is separate and requires a
verified target snapshot. UUIDv5 identities remain stable across regeneration.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import re
import uuid

REPO = Path(__file__).resolve().parents[2]
OUTPUT = REPO / "authoring/allianz-life"
NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "https://www.allianzlife.com/sitecoreai-demo")

_palette_spec = importlib.util.spec_from_file_location("allianz_native_palette", Path(__file__).with_name("native-palette.py"))
native_palette = importlib.util.module_from_spec(_palette_spec)
_palette_spec.loader.exec_module(native_palette)

_metadata_spec = importlib.util.spec_from_file_location("allianz_native_rendering_metadata", Path(__file__).with_name("native-rendering-metadata.py"))
native_metadata = importlib.util.module_from_spec(_metadata_spec)
_metadata_spec.loader.exec_module(native_metadata)
NATIVE_METADATA = native_metadata.load_model()

# Verified against this repository's serialized items. Live dependency resolution
# remains mandatory: these references are platform prerequisites, not imported.
PLATFORM = {
    "Template": "ab86861a-6030-46c5-b394-e8f99e8b87db",
    "TemplateFolder": "77157d54-90c8-4014-9b9e-540d24e71d03",
    "TemplateSection": "e269fbb5-3750-427a-9149-7aa950b49301",
    "TemplateField": "455a3e98-a627-4b40-8035-e683a0331ac7",
    "StandardTemplate": "1930bbeb-7805-471a-a3be-4858ac7cf696",
    "Folder": "a87a00b1-e6db-45ab-8b54-636fec3b5523",
    "RenderingFolder": "840d4a46-5503-49ec-bf9d-bd090946c63d",
    "JsonRendering": "04646a89-996f-4ee7-878a-ffdbf1f0ef0d",
    "PlaceholderFolder": "3d281bf8-5336-4686-9dd6-ab4ab5b3fd5d",
    "Placeholder": "5c547d4e-7111-4995-95b0-6b561751bf2e",
    "SettingsFolder": "b4d86f9b-e917-4d68-978e-741361332174",
    "BranchFolder": "85adbf5b-e836-4932-a333-fe0f9fa1ed1e",
    "Branch": "35e75c72-4985-4e09-88c3-0eac6cd1e64f",
    "SxaPageBase": "47151711-26ca-434e-8132-d3e0b7d26683",
    "SxaPageBase2": "6650fb34-7ea1-4245-a919-5cc0f002a6d7",
    "SxaPageBase3": "4414a1f9-826a-4647-8df4-ed6a95e64c43",
    # Fresh native scaffold SCS captured 2026-09-30. Inheriting its generated
    # Page preserves Title/Content, navigation/taxonomy and native base lineage
    # under a separately reviewed Home-template change; never mutate this base.
    "NativeAllianzScaffoldPage": "2d50c9b4-9f1e-42ae-aa00-0c85fd2b689e",
    "SxaRenderingParameters": "4247aad4-ebde-4994-998f-e067a51b1fe4",
    "ProjectTemplatesParent": "825b30b4-b40b-422e-9920-23a1b6bda89c",
    "ProjectRenderingsParent": "1995806f-0a84-42b5-93b0-88f0e2ff872c",
    "ProjectPlaceholdersParent": "f5f0fbe3-61ad-4967-a5d8-8d760331d6a1",
    "ProjectSettingsParent": "0af56f64-b5d7-473f-9497-1dc19265e494",
    "ProjectBranchesParent": "a1f6469d-16e1-4a5f-9e49-1aad869a5d11",
}
FIELD = {
    "Base": "12c33f3f-86c5-43a5-aeb4-5598cec45116",
    "StandardValues": "f7d48a55-2158-4f02-9356-756654404f73",
    "Masters": "1172f251-dad4-4efb-a329-0c63500e4f1e",
    "Type": "ab162cc0-dc80-4abf-8871-998ee5d7ba32",
    "Source": "1eb8ae32-e190-44a6-968d-ed904c794ebf",
    "Shared": "be351a73-fcb0-4213-93fa-c302d8ab4f51",
    "SortOrder": "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e",
    "Title": "19a69332-a23e-4e70-8d16-b2640cb24cc8",
    "ComponentName": "037fe404-dd19-4bf7-8e30-4dadf68b27b0",
    "ComponentQuery": "17bb046a-a32a-41b3-8315-81217947611b",
    "DatasourceTemplate": "1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f",
    "DatasourceLocation": "b5b27af1-25ef-405c-87ce-369b3a004016",
    "ParametersTemplate": "a77e8568-1ab3-44f1-a664-b7c37ec7810d",
    "OtherProperties": "e829c217-5e94-4306-9c48-2634b094fdc2",
    "PlaceholderKey": "7256bdab-1fd2-49dd-b205-cb4873d2917c",
    "AllowedControls": "e391b526-d0c5-439d-803e-17512eae6222",
    "Renderings": "f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e",
    "DisplayName": "b5e02ad9-d56f-4c41-a065-a133db87bdeb",
    "Icon": "06d5295c-ed2f-4a54-9bf2-26228d113318",
}

ROOTS = {
    "allianz.templates": ("/sitecore/templates/Project/Allianz Life", "TemplateFolder", "ProjectTemplatesParent"),
    "allianz.renderings": ("/sitecore/layout/Renderings/Project/Allianz Life", "RenderingFolder", "ProjectRenderingsParent"),
    "allianz.placeholders": ("/sitecore/layout/Placeholder Settings/Project/Allianz Life", "PlaceholderFolder", "ProjectPlaceholdersParent"),
    "allianz.options": ("/sitecore/system/Settings/Project/Allianz Life", "SettingsFolder", "ProjectSettingsParent"),
    "allianz.branches": ("/sitecore/templates/Branches/Project/Allianz Life", "BranchFolder", "ProjectBranchesParent"),
}
TEMPLATES_ROOT = ROOTS["allianz.templates"][0]
PARAMS_ROOT = TEMPLATES_ROOT + "/Rendering Parameters"
OPTIONS_ROOT = ROOTS["allianz.options"][0] + "/Rendering Options"

COMPONENTS = {
    "AllianzHeader": {"fields": {"logo": "Image", "tagline": "Single-Line Text", "primaryNav": "Treelist", "utilityNav": "Treelist"}, "navigation": True},
    "AllianzHero": {"fields": {"heading": "Rich Text", "body": "Rich Text", "desktopImage": "Image", "mobileImage": "Image", "primaryLink": "General Link", "secondaryLink": "General Link"}},
    "AllianzRichText": {"fields": {"heading": "Single-Line Text", "subheading": "Rich Text", "body": "Rich Text", "primaryLink": "General Link"}},
    "AllianzCardGrid": {"fields": {"heading": "Single-Line Text", "subheading": "Rich Text", "body": "Rich Text", "primaryLink": "General Link"}, "children": "AllianzCard"},
    "AllianzAccordion": {"fields": {"heading": "Single-Line Text", "primaryLink": "General Link"}, "children": "AllianzAccordionEntry"},
    "AllianzCTA": {"fields": {"heading": "Single-Line Text", "body": "Rich Text", "link": "General Link"}},
    "AllianzDocumentList": {"fields": {"heading": "Single-Line Text", "body": "Rich Text"}, "children": "AllianzDocument"},
    "AllianzFooter": {"fields": {"logo": "Image", "body": "Rich Text", "copyright": "Single-Line Text", "primaryNav": "Treelist", "utilityNav": "Treelist", "socialNav": "Treelist"}, "navigation": True},
    "AllianzBreadcrumbs": {"fields": {"heading": "Single-Line Text", "primaryNav": "Treelist"}, "navigation": True},
    "AllianzForm": {"fields": {"heading": "Single-Line Text", "body": "Rich Text", "schemaKey": "Single-Line Text", "secondaryHeading": "Single-Line Text", "secondaryBody": "Rich Text", "reviewHeading": "Single-Line Text", "successMessage": "Rich Text", "failureMessage": "Rich Text", "submitLabel": "Single-Line Text"}, "children": "AllianzFormField"},
    "AllianzSearch": {"fields": {"heading": "Single-Line Text", "body": "Rich Text", "placeholder": "Single-Line Text", "resultLabel": "Single-Line Text", "noResultsMessage": "Single-Line Text"}},
    "AllianzArticle": {"fields": {"heading": "Single-Line Text", "body": "Rich Text", "summary": "Rich Text", "image": "Image", "author": "Single-Line Text", "publishedDate": "Date"}},
    "AllianzVideo": {"fields": {"heading": "Single-Line Text", "body": "Rich Text", "poster": "Image", "localVideo": "File", "mediaLink": "General Link", "transcript": "Rich Text", "caption": "Rich Text"}},
    "AllianzTimeline": {"fields": {"heading": "Single-Line Text", "body": "Rich Text"}, "children": "AllianzTimelineEntry"},
    "AllianzRateSnapshot": {"fields": {"heading": "Single-Line Text", "rate": "Single-Line Text", "asOf": "Single-Line Text", "body": "Rich Text", "link": "General Link"}},
    "AllianzIndexDefinitions": {"fields": {"heading": "Single-Line Text", "body": "Rich Text"}, "children": "AllianzIndexDefinition"},
    "AllianzCalculator": {"fields": {"heading": "Single-Line Text", "body": "Rich Text", "schemaKey": "Single-Line Text", "sampleResult": "Rich Text", "disclaimer": "Rich Text", "submitLabel": "Single-Line Text", "resultLabel": "Single-Line Text", "initialResult": "Single-Line Text"}, "children": "AllianzFormField"},
    "AllianzRateTable": {"fields": {"heading": "Single-Line Text", "body": "Rich Text", "tableBody": "Rich Text", "caption": "Single-Line Text", "emptyState": "Rich Text"}},
    "AllianzLegacySidebar": {"fields": {"heading": "Single-Line Text", "primaryNav": "Treelist"}, "navigation": True},
    "AllianzLegacyPageHeader": {"fields": {"heading": "Rich Text", "body": "Rich Text"}},
    "AllianzLegacyHero": {"fields": {"heading": "Rich Text", "body": "Rich Text", "desktopImage": "Image", "mobileImage": "Image", "primaryLink": "General Link", "secondaryLink": "General Link"}},
    "AllianzLegacyRichText": {"fields": {"heading": "Single-Line Text", "subheading": "Rich Text", "body": "Rich Text"}},
    "AllianzLegacyHeader": {"fields": {"logo": "Image", "tagline": "Single-Line Text", "heading": "Single-Line Text", "byline": "Single-Line Text", "link": "General Link", "primaryNav": "Treelist", "utilityNav": "Treelist"}, "navigation": True},
    "AllianzLegacyFooter": {"fields": {"logo": "Image", "body": "Rich Text", "copyright": "Single-Line Text", "primaryNav": "Treelist", "utilityNav": "Treelist", "socialNav": "Treelist"}, "navigation": True},
    "AllianzLegacyAccordion": {"fields": {"heading": "Single-Line Text"}, "children": "AllianzAccordionEntry"},
    "AllianzLegacyCardGrid": {"fields": {"heading": "Single-Line Text", "subheading": "Rich Text", "body": "Rich Text"}, "children": "AllianzCard"},
    "AllianzLegacyLinkList": {"fields": {"heading": "Single-Line Text"}, "children": "AllianzLinkListEntry"},
    "AllianzLegacyBreadcrumbs": {"fields": {"heading": "Single-Line Text", "primaryNav": "Treelist"}, "navigation": True},
}

# Every path below is present as __Icon in the captured native schema under
# discovery/model/schema-reference-root/items. Keep its original spelling/case;
# do not derive a new icon path or use a filename as a native media thumbnail.
# The comments identify the native item that supplies each verified icon.
NATIVE_ICONS = {
    "layout": "Office/32x32/layout.png",  # Grid/Grid Definition
    "image": "Office/32x32/photo_landscape.png",  # Presentation/_Background Image
    "richText": "Applications/32x32/text_rich_colored.png",  # Json Variants/JSON Rich Text
    "grid": "Imaging/32x32/grid.png",  # Page Structure/Rendering Parameters/ColumnSplitter/Grid
    "accordion": "Office/32x32/barrel.png",  # Composites/Datasource/Accordion/Accordion
    "link": "Office/32x32/link.png",  # Navigation/Datasource/Link
    "documents": "Office/32x32/floppy_disks.png",  # Media/Datasource/File List
    "navigation": "Office/32x32/signpost.png",  # Navigation/Navigation Filter Folder
    "form": "Applications/16x16/form_blue.png",  # System/Templates/Template
    "search": "Office/32x32/magnifying_glass.png",  # SiteMetadata/_Seo Metadata
    "article": "Office/32x32/document_text.png",  # JSS Experience Accelerator/Multisite/Base Page
    "video": "Office/32x32/movie.png",  # Media/Datasource/Video
    "timeline": "Office/32x32/calendar_clock.png",  # Json Variants/JSON Date
    "rates": "Business/16x16/line-chart.png",  # System/Templates/Sections/Statistics/Statistics
    "definitions": "Business/16x16/index_view.png",  # System/Templates/Sections/Indexing/Indexing
    "tools": "Office/32x32/tools.png",  # Rendering Variants/Edit Frame
    "table": "Business/32x32/table_edit.png",  # Page Structure/ISplitter
}

# Historical labels follow native-authoring-plan-next/PLAN.json. Verified
# English labels and icons are overlaid below; logical group hints are historical
# and are not live Available Renderings membership. These logical group labels
# describe site-scoped Available Renderings categories for presentation bootstrap;
# they never move rendering items, whose path-derived identities must stay stable.
# All registered renderers stay represented, including those with no current use.
# Thumbnails require verified native media IDs and are intentionally omitted.
RENDERING_AUTHORING = {
    name: {"displayName": label, "group": group, "icon": NATIVE_ICONS[icon]}
    for name, label, group, icon in [
        ("AllianzHeader", "Header", "Navigation", "layout"),
        ("AllianzHero", "Hero", "Page content", "image"),
        ("AllianzRichText", "Rich Text", "Page content", "richText"),
        ("AllianzCardGrid", "Card Grid", "Page content", "grid"),
        ("AllianzAccordion", "Accordion", "Page content", "accordion"),
        ("AllianzCTA", "Call to Action", "Page content", "link"),
        ("AllianzDocumentList", "Document List", "Page content", "documents"),
        ("AllianzFooter", "Footer", "Navigation", "layout"),
        ("AllianzBreadcrumbs", "Breadcrumbs", "Navigation", "navigation"),
        ("AllianzForm", "Form", "Forms and tools", "form"),
        ("AllianzSearch", "Search", "Forms and tools", "search"),
        ("AllianzArticle", "Article", "Page content", "article"),
        ("AllianzVideo", "Video", "Media", "video"),
        ("AllianzTimeline", "Timeline", "Page content", "timeline"),
        ("AllianzRateSnapshot", "Rate Snapshot", "Product content", "rates"),
        ("AllianzIndexDefinitions", "Index Definitions", "Product content", "definitions"),
        ("AllianzCalculator", "Calculator", "Forms and tools", "tools"),
        ("AllianzRateTable", "Rate Table", "Product content", "table"),
        ("AllianzLegacySidebar", "Legacy Sidebar", "Legacy content", "navigation"),
        ("AllianzLegacyPageHeader", "Legacy Page Header", "Legacy content", "article"),
        ("AllianzLegacyHero", "Legacy Hero", "Legacy content", "image"),
        ("AllianzLegacyRichText", "Legacy Rich Text", "Legacy content", "richText"),
        ("AllianzLegacyHeader", "Legacy Header", "Legacy content", "layout"),
        ("AllianzLegacyFooter", "Legacy Footer", "Legacy content", "layout"),
        ("AllianzLegacyAccordion", "Legacy Accordion", "Legacy content", "accordion"),
        ("AllianzLegacyCardGrid", "Legacy Card Grid", "Legacy content", "grid"),
        ("AllianzLegacyLinkList", "Legacy Link List", "Legacy content", "link"),
        ("AllianzLegacyBreadcrumbs", "Legacy Breadcrumbs", "Legacy content", "navigation"),
    ]
}
RENDERING_AUTHORING = native_metadata.update_catalog(RENDERING_AUTHORING, NATIVE_METADATA)

CHILDREN = {
    "AllianzCard": {"heading": "Single-Line Text", "subheading": "Rich Text", "body": "Rich Text", "image": "Image", "icon": "Image", "iconTheme": "Droplist", "link": "General Link", "links": "Treelist", "theme": "Droplist", "headingLevel": "Droplist", "alphanumeral": "Single-Line Text"},
    "AllianzAccordionEntry": {"heading": "Single-Line Text", "body": "Rich Text", "link": "General Link"},
    "AllianzNavigationLink": {"title": "Single-Line Text", "link": "General Link", "icon": "Image"},
    "AllianzDocument": {"title": "Single-Line Text", "description": "Rich Text", "file": "File", "sourceUrl": "Single-Line Text", "publishedDate": "Date"},
    "AllianzFormField": {"name": "Single-Line Text", "label": "Single-Line Text", "inputType": "Single-Line Text", "required": "Checkbox", "validationMessage": "Single-Line Text", "options": "Multi-Line Text", "maxLength": "Single-Line Text", "pattern": "Single-Line Text", "placeholder": "Single-Line Text", "sourceName": "Single-Line Text", "minValue": "Single-Line Text", "maxValue": "Single-Line Text", "initialValue": "Single-Line Text", "footnote": "Single-Line Text"},
    "AllianzLinkListEntry": {"heading": "Single-Line Text", "body": "Rich Text", "link": "General Link"},
    "AllianzTimelineEntry": {"date": "Single-Line Text", "heading": "Single-Line Text", "body": "Rich Text", "image": "Image", "link": "General Link"},
    "AllianzIndexDefinition": {"body": "Rich Text", "color": "Droplist"},
}
PARAMETERS = {
    "theme": ["transparent", "blue-soft", "grey-muted", "white", "green-soft", "grey-soft", "purple-soft", "yellow-soft", "primary-white", "red-soft"],
    "layout": ["stacked", "image-left", "image-right", "cards", "bordered", "home", "stage", "plain", "rich-text", "disclosures", "list"],
    "columns": ["1", "2", "3", "4"],
    "alignment": ["left", "center"],
    "spacing": ["none", "sm", "md", "lg", "xl"],
    "headingLevel": ["h1", "h2", "h3", "h4", "h5", "h6"],
    "showLogin": ["0", "1"],
    "heroTheme": ["fixed", "variable", "life"],
    "paddingTop": ["none", "sm", "md", "lg", "xl"],
    "paddingBottom": ["none", "sm", "md", "lg", "xl"],
    "marginBottom": ["none", "sm", "md", "lg", "xl"],
    "position": ["left", "right"],
    "productLine": ["none", "annuities"],
    "region": ["pre-content", "content", "post-content", "disclosure"],
    "style": ["nav-links", "next-steps", "tools"],
    "tableTheme": ["striped", "plain"],
    "breakpoint": ["sm", "md"],
    "noMarginBottom": ["0", "1"],
    "market": ["main", "new-york"],
    "nextSteps": ["0", "1"],
    "splitRatio": ["33:67", "50:50", "67:33"],
}
DATA_OPTIONS = {"iconTheme": ["transparent", "primary-brand"], "shellFamily": ["modern", "legacy"], "legacySharedKey": ["allianz-life", "new-york"], "color": ["blue-bright", "red-bright", "teal-bright", "purple-bright", "direct-green"]}
PAGE_TYPES = ["Home", "Section Landing", "Product Detail", "Editorial", "News", "Resource Listing", "Form Demo", "Legal"]
PARAMETER_FIELDS = {name: "Droplist" for name in PARAMETERS}


def identifier(path: str) -> str:
    return str(uuid.uuid5(NAMESPACE, "structure:" + path))


def brace(value: str) -> str:
    return "{" + value.upper() + "}"


def item(path: str, template: str, parent: str | None = None, shared: list | None = None, versioned: list | None = None, unversioned: list | None = None) -> dict:
    return {"ID": identifier(path), "Parent": parent or identifier(path.rsplit("/", 1)[0]), "Template": PLATFORM.get(template, template), "Path": path, "SharedFields": shared or [], "UnversionedFields": unversioned or [], "VersionedFields": versioned or []}


def field(identifier_value: str, hint: str, value: object) -> dict:
    return {"ID": identifier_value, "Hint": hint, "Value": str(value)}


def yaml_value(value: str, indent: str) -> list[str]:
    if "\n" not in value:
        return [indent + "Value: " + json.dumps(value, ensure_ascii=False)]
    return [indent + "Value: |"] + [indent + "  " + line for line in value.rstrip("\n").split("\n")]


def yaml_fields(values: list[dict], indent: str = "") -> list[str]:
    lines = []
    for value in values:
        lines.extend([indent + '- ID: "' + value["ID"] + '"', indent + "  Hint: " + value["Hint"]])
        lines.extend(yaml_value(value["Value"], indent + "  "))
    return lines


def serialize(value: dict) -> str:
    lines = ["---"] + [key + ": " + json.dumps(value[key]) for key in ("ID", "Parent", "Template", "Path")]
    if value["SharedFields"]:
        lines.append("SharedFields:")
        lines.extend(yaml_fields(value["SharedFields"]))
    if value.get("UnversionedFields") or value["VersionedFields"]:
        lines.extend(["Languages:", "- Language: en"])
        if value.get("UnversionedFields"):
            lines.append("  Fields:")
            lines.extend(yaml_fields(value["UnversionedFields"], "  "))
        # The pinned SCS parser requires a Versions map even when this language
        # contains only unversioned fields. An empty version carries no values.
        lines.extend(["  Versions:", "  - Version: 1"])
        if value["VersionedFields"]:
            lines.append("    Fields:")
            lines.extend(yaml_fields(value["VersionedFields"], "    "))
    return "\n".join(lines) + "\n"


def template_items(path: str, fields: dict[str, str], base: list[str] | None = None, insert: list[str] | None = None, source_fields: dict[str, str] | None = None, defaults: dict[str, str] | None = None) -> list[dict]:
    standard = path + "/__Standard Values"
    values = [item(path, "Template", shared=[field(FIELD["Base"], "__Base template", "\n".join(brace(value) for value in (base or [PLATFORM["StandardTemplate"]]))), field(FIELD["StandardValues"], "__Standard values", brace(identifier(standard)))])]
    section = path + "/Content"
    if fields:
        values.append(item(section, "TemplateSection"))
    for index, (name, kind) in enumerate(fields.items(), 1):
        field_path = section + "/" + name
        shared = [field(FIELD["Type"], "Type", kind), field(FIELD["SortOrder"], "__Sortorder", index * 100)]
        if source_fields and name in source_fields:
            shared.append(field(FIELD["Source"], "Source", source_fields[name]))
        # Native template-field Title is unversioned. Serializing it in a
        # language version produces a recurring SCS update after every push.
        values.append(item(field_path, "TemplateField", shared=shared, unversioned=[field(FIELD["Title"], "Title", name)]))
    sv_shared = [field(FIELD["Masters"], "__Masters", "\n".join(brace(identifier(value)) for value in insert))] if insert else []
    sv_versioned = [field(identifier(section + "/" + name), name, value) for name, value in (defaults or {}).items()]
    values.append(item(standard, identifier(path), shared=sv_shared, versioned=sv_versioned))
    return values


def selected_fields(fields: dict[str, str], indent: str) -> list[str]:
    return [indent + name + ': field(name: "' + name + '") { jsonValue }' for name in fields if fields[name] != "Treelist"]


# Explicit bounds cover the frozen source collections with small headroom. Both
# Preview and Delivery schema/query validation remain mandatory before publish.
CHILD_LIMITS = {
    "AllianzCardGrid": 40, "AllianzAccordion": 16, "AllianzDocumentList": 64,
    "AllianzForm": 48, "AllianzCalculator": 16, "AllianzTimeline": 20, "AllianzIndexDefinitions": 8,
    "AllianzLegacyAccordion": 12, "AllianzLegacyCardGrid": 8,
    "AllianzLegacyLinkList": 8,
}
NAV_LIMITS = {
    ("AllianzHeader", "primaryNav"): (6, 6, 16),
    ("AllianzFooter", "primaryNav"): (10,),
    ("AllianzLegacyHeader", "primaryNav"): (4,),
    ("AllianzLegacyFooter", "primaryNav"): (10,),
    ("AllianzLegacySidebar", "primaryNav"): (6, 3, 6),
}


def nav_selection(indent: str, limits: tuple[int, ...] = ()) -> list[str]:
    lines = [indent + "id", indent + 'title: field(name: "title") { jsonValue }', indent + 'link: field(name: "link") { jsonValue }', indent + 'icon: field(name: "icon") { jsonValue }']
    if limits:
        lines.append(indent + f"children(first: {limits[0]}) {{ total pageInfo {{ hasNext endCursor }} results {{")
        lines.extend(nav_selection(indent + "  ", limits[1:]))
        lines.append(indent + "} }")
    else:
        # Terminal nodes are intentionally flat. Surface a positive total rather
        # than silently ignoring author-added descendants outside this contract.
        lines.append(indent + "children(first: 1) { total pageInfo { hasNext endCursor } }")
    return lines


def component_query(name: str, definition: dict) -> str:
    lines = ["query " + name + "Query($datasource: String!, $language: String!) {", "  datasource: item(path: $datasource, language: $language) {", "    id"]
    # Legacy cards consume only this root field; keep the broader authoring
    # template intact. This lean projection was verified in native Privacy.
    root_fields = {"heading": definition["fields"]["heading"]} if name == "AllianzLegacyCardGrid" else definition["fields"]
    lines.extend(selected_fields(root_fields, "    "))
    for nav_field in [key for key, kind in definition["fields"].items() if kind == "Treelist"]:
        lines.append('    ' + nav_field + ': field(name: "' + nav_field + '") { ... on MultilistField { targetItems {')
        lines.extend(nav_selection("      ", NAV_LIMITS.get((name, nav_field), ())))
        lines.append("    } } }")
    if definition.get("children"):
        lines.append(f"    children(first: {CHILD_LIMITS[name]}) {{ total pageInfo {{ hasNext endCursor }} results {{")
        lines.append("      id")
        if name == "AllianzCardGrid":
            # Native Preview accepted this complete first:40 projection, while
            # even a second named field at that capacity was rejected. jsonValue
            # keeps the SDK field objects and ordered reference item fields; the
            # frontend projects their names without inventing fixture content.
            lines.append("      fieldCollection: fields { name jsonValue }")
        elif name == "AllianzLegacyCardGrid":
            # Preserve the verified first:8 result and paging metadata, while
            # requesting only fields used by AllianzLegacyCardGrid. Removing
            # just its unused links tree did not resolve the native failure.
            card_fields = CHILDREN[definition["children"]]
            consumed = ("heading", "body", "image", "icon", "link", "headingLevel")
            lines.extend(selected_fields({field: card_fields[field] for field in consumed}, "      "))
        else:
            lines.extend(selected_fields(CHILDREN[definition["children"]], "      "))
            for nav_field, kind in CHILDREN[definition["children"]].items():
                if kind == "Treelist":
                    lines.append('      ' + nav_field + ': field(name: "' + nav_field + '") { ... on MultilistField { targetItems {')
                    # A card's optional links are flat; do not multiply a large
                    # card collection by a full three-level menu query.
                    lines.extend(nav_selection("        "))
                    lines.append("      } } }")
        lines.append("    } }")
    lines.extend(["  }", "}"])
    return "\n".join(lines)


def generate() -> tuple[list[dict], dict]:
    # Fail closed if the durable native field projection is missing/malformed.
    # Its independent serializer retains categories and renderer inventories;
    # this historical generator owns only the matching existing Main field.
    palette_model = native_palette.load_model()
    values = []
    for root, kind, parent in ROOTS.values():
        values.append(item(root, kind, PLATFORM[parent]))
    for path in [TEMPLATES_ROOT + "/Components", TEMPLATES_ROOT + "/Data", TEMPLATES_ROOT + "/Pages", PARAMS_ROOT]:
        values.append(item(path, "TemplateFolder"))
    values.append(item(OPTIONS_ROOT, "Folder"))
    for name, options in (PARAMETERS | DATA_OPTIONS).items():
        option_root = OPTIONS_ROOT + "/" + name
        values.append(item(option_root, "Folder"))
        for index, option in enumerate(options, 1):
            values.append(item(option_root + "/" + option, "Folder", shared=[field(FIELD["SortOrder"], "__Sortorder", index * 100)]))
    parameter_path = PARAMS_ROOT + "/AllianzParameters"
    values.extend(template_items(parameter_path, PARAMETER_FIELDS, base=[PLATFORM["SxaRenderingParameters"]], source_fields={name: OPTIONS_ROOT + "/" + name for name in PARAMETERS}))
    base_path = TEMPLATES_ROOT + "/Pages/AllianzPage"
    values.extend(template_items(base_path, {"pageTitle": "Single-Line Text", "navigationTitle": "Single-Line Text", "metaDescription": "Multi-Line Text", "sourceUrl": "Single-Line Text", "sourceHash": "Single-Line Text", "importVersion": "Single-Line Text", "productInterest": "Single-Line Text", "shellFamily": "Droplist", "legacySharedKey": "Droplist", "sourceBodyId": "Single-Line Text", "sourceBodyClasses": "Multi-Line Text"}, base=[PLATFORM["NativeAllianzScaffoldPage"]], source_fields={"shellFamily": OPTIONS_ROOT + "/shellFamily", "legacySharedKey": OPTIONS_ROOT + "/legacySharedKey"}))
    for name in PAGE_TYPES:
        page_path = TEMPLATES_ROOT + "/Pages/" + name
        values.extend(template_items(page_path, {}, base=[identifier(base_path)], insert=[TEMPLATES_ROOT + "/Pages/" + candidate for candidate in PAGE_TYPES if candidate != "Home"]))
    data_folder_path = TEMPLATES_ROOT + "/Data/AllianzDataFolder"
    all_data_templates = [TEMPLATES_ROOT + "/Components/" + name for name in COMPONENTS] + [TEMPLATES_ROOT + "/Data/" + name for name in CHILDREN]
    values.extend(template_items(data_folder_path, {}, insert=all_data_templates))
    for name, fields in CHILDREN.items():
        path = TEMPLATES_ROOT + "/Data/" + name
        insert = [path] if name == "AllianzNavigationLink" else None
        sources = {field_name: OPTIONS_ROOT + "/" + field_name for field_name in ("theme", "headingLevel", "iconTheme", "color") if field_name in fields}
        values.extend(template_items(path, fields, insert=insert, source_fields=sources))
    for name, definition in COMPONENTS.items():
        path = TEMPLATES_ROOT + "/Components/" + name
        insert = [TEMPLATES_ROOT + "/Data/" + definition["children"]] if definition.get("children") else None
        sources = {nav: "/sitecore/content/allianz/allianz-life/Data/Allianz Life/Navigation" for nav in definition["fields"] if definition["fields"][nav] == "Treelist"}
        values.extend(template_items(path, definition["fields"], insert=insert, source_fields=sources))
        render_path = ROOTS["allianz.renderings"][0] + "/" + name
        shared = [
            field(FIELD["ComponentName"], "componentName", name),
            field(FIELD["ComponentQuery"], "ComponentQuery", component_query(name, definition)),
            field(FIELD["DatasourceTemplate"], "Datasource Template", path),
            field(FIELD["DatasourceLocation"], "Datasource Location", "query:$site/*[@@name='Data']/*[@@name='Allianz Life']"),
            field(FIELD["ParametersTemplate"], "Parameters Template", brace(identifier(parameter_path))),
            field(FIELD["Icon"], "__Icon", RENDERING_AUTHORING[name]["icon"]),
        ]
        if name not in ("AllianzHeader", "AllianzFooter", "AllianzLegacyHeader", "AllianzLegacyFooter", "AllianzLegacySidebar"):
            # Target native SXA Editing settings must explicitly choose page-local
            # auto datasources during verified bootstrap; do not guess field IDs.
            shared.append(field(FIELD["OtherProperties"], "OtherProperties", "IsAutoDatasourceRendering=true"))
        # Native Pages requires an English version for rendering definitions.
        # __Display name is language-unversioned, not shared or versioned. The
        # serializer emits en/Version 1 for this language without moving any of
        # the existing rendering configuration out of shared storage.
        rendering = item(render_path, "JsonRendering", shared=shared, unversioned=[field(FIELD["DisplayName"], "__Display name", RENDERING_AUTHORING[name]["displayName"])])
        # Historical identity path generates the existing ID; author-facing
        # paths and verified metadata are applied afterwards, never to bindings.
        values.append(native_metadata.apply(rendering, NATIVE_METADATA))
    placeholders = {"headless-header": ["AllianzHeader", "AllianzLegacyHeader"], "headless-main": [name for name in COMPONENTS if name not in ("AllianzHeader", "AllianzFooter", "AllianzLegacyHeader", "AllianzLegacyFooter", "AllianzLegacySidebar")], "headless-footer": ["AllianzFooter", "AllianzLegacyFooter"], "headless-sidebar": ["AllianzLegacySidebar"]}
    for key, names in placeholders.items():
        placeholder = item(ROOTS["allianz.placeholders"][0] + "/" + key, "Placeholder", shared=[field(FIELD["PlaceholderKey"], "Placeholder Key", key), field(FIELD["AllowedControls"], "Allowed Controls", "\n".join(brace(identifier(ROOTS["allianz.renderings"][0] + "/" + name)) for name in names))])
        if key == "headless-main":
            placeholder = native_palette.override_main(placeholder, palette_model)
        values.append(placeholder)
    # Datasource branches are useful traditional branches; these are NOT the new
    # tenant Page Branches UI library, whose schema must be read independently.
    for name, child in (("AllianzCardGrid", "AllianzCard"), ("AllianzAccordion", "AllianzAccordionEntry")):
        branch = ROOTS["allianz.branches"][0] + "/" + name
        values.append(item(branch, "Branch"))
        values.append(item(branch + "/$name", identifier(TEMPLATES_ROOT + "/Components/" + name)))
        values.append(item(branch + "/$name/Entry 01", identifier(TEMPLATES_ROOT + "/Data/" + child)))
    module = {
        "$schema": "../../.sitecore/schemas/ModuleFile.schema.json",
        "namespace": "Project.AllianzLife.Structure",
        "description": "Allianz isolated structural definitions. Native site/presentation, editorial data, and media use separate non-destructive bootstrap/import.",
        "items": {"path": "items", "includes": [{"name": name, "path": root, "scope": "ItemAndDescendants", "allowedPushOperations": "CreateAndUpdate"} for name, (root, _, _) in ROOTS.items()]},
    }
    return values, module


def main() -> None:
    values, module = generate()
    if len({value["ID"] for value in values}) != len(values):
        raise ValueError("Duplicate generated identities")
    item_root = OUTPUT / "items"
    native_metadata.require_canonical_storage(item_root, NATIVE_METADATA)
    for value in values:
        matching = [(name, root) for name, (root, _, _) in ROOTS.items() if value["Path"] == root or value["Path"].startswith(root + "/")]
        if len(matching) != 1:
            raise ValueError("Generated item outside exclusive include")
        name, root = matching[0]
        relative = value["Path"][len(root.rsplit("/", 1)[0]) + 1:]
        relative = relative.replace("$name", "#name").replace(":", "#")
        path = item_root / name / (relative + ".yml")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(serialize(value))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "Project.AllianzLife.Structure.module.json").write_text(json.dumps(module, indent=2) + "\n")
    contract = {"namespace": module["namespace"], "siteName": "allianz-life", "collectionName": "Allianz", "components": COMPONENTS, "renderingAuthoring": RENDERING_AUTHORING, "childTemplates": CHILDREN, "parameters": PARAMETERS, "dataOptions": DATA_OPTIONS, "inheritedParameters": ["RenderingIdentifier"], "parameterFields": PARAMETER_FIELDS, "pageTypes": PAGE_TYPES, "templateIds": {value["Path"]: value["ID"] for value in values if value["Template"] == PLATFORM["Template"]}, "platformDependencies": PLATFORM, "fieldDependencies": FIELD, "status": "generated-locally; tenant dependency/schema verification required"}
    (OUTPUT / "content-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
    (OUTPUT / "structure-manifest.json").write_text(json.dumps({"namespace": module["namespace"], "items": values}, indent=2) + "\n")
    print(json.dumps({"namespace": module["namespace"], "itemCount": len(values), "roots": len(ROOTS), "remoteWrites": 0}))


if __name__ == "__main__":
    main()
