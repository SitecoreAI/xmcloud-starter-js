#!/usr/bin/env python3
"""Derive native component fields from authorized, locally saved public HTML.

This is an editorial import precursor, not an HTML renderer. Only localized rich
text bodies retain a small safe markup vocabulary; structure is finite components.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import html
import json
import re
import uuid
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO.parent.parent / "public-site"
OUTPUT = REPO / "examples/allianz-life/content"
SVG_DIR = OUTPUT / "media-vectors"
HOST = "https://www.allianzlife.com"
VOID = set("area base br col embed hr img input link meta param source track wbr".split())
FIRST = {"/", "/what-we-offer/annuities", "/customer-service-frequently-asked-questions"}
ALLOWED_RICH = set("p br strong b em i u sup sub ul ol li table thead tbody tr th td blockquote a span h1 h2 h3 h4 h5 h6 hr".split())
DROP = set("script style form input button select textarea iframe noscript object embed svg".split())
VECTORS: dict[str, dict] = {}
LINK_AUDIT: dict[str, dict] = {}
ASSET_AUDIT: dict[str, dict] = {}
DOCUMENT_PATHS = set()
THEMES = ["transparent", "blue-soft", "grey-muted", "green-soft", "grey-soft", "purple-soft", "yellow-soft", "primary-white", "red-soft"]


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    content: list["Node | str"] = field(default_factory=list)
    parent: "Node | None" = None

    def children(self):
        return [n for n in self.content if isinstance(n, Node)]

    def descendants(self):
        for n in self.children():
            yield n
            yield from n.descendants()

    def has(self, css):
        return css in self.attrs.get("class", "").split()

    def find(self, tag=None, css=None):
        return next((n for n in self.descendants() if (tag is None or n.tag == tag) and (css is None or n.has(css))), None)

    def all(self, tag=None, css=None):
        return [n for n in self.descendants() if (tag is None or n.tag == tag) and (css is None or n.has(css))]

    def text(self):
        if self.tag in {"svg", "script", "style", "noscript", "form", "input", "select", "textarea"}:
            return ""
        parts = []
        for n in self.content:
            value = n.text() if isinstance(n,Node) else n
            if isinstance(n,Node) and n.tag in {"p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "td", "tr"}:
                value = " " + value + " "
            parts.append(value)
        return re.sub(r"\s+", " ", "".join(parts)).strip()


class DOM(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        # Source templates contain predictable valid wrappers; tolerate optional li/p.
        if tag == "li" and self.stack[-1].tag == "li":
            self.stack.pop()
        if tag == "p" and self.stack[-1].tag == "p":
            self.stack.pop()
        node = Node(tag, dict((k, v or "") for k, v in attrs), parent=self.stack[-1])
        self.stack[-1].content.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        self.stack[-1].content.append(data)


def stable(value):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "allianz-life-demo:" + value)).upper()


def field_value(value):
    return {"jsonValue": {"value": value}}


def canonical_href(raw, source=HOST + "/"):
    if not raw:
        return "", "empty"
    full = urljoin(source, raw.replace("~/", "/"))
    parsed = urlparse(full)
    if raw.startswith("#"):
        return raw, "public same-host"
    if parsed.scheme not in {"http", "https"}:
        return "#demo-unavailable", "contact or unsupported scheme"
    if parsed.hostname != "www.allianzlife.com":
        return "#demo-unavailable", "external destination"
    encoded_fragment = re.search(r"%23",parsed.path,re.I)
    route_path = parsed.path[:encoded_fragment.start()] if encoded_fragment else parsed.path
    fragment = unquote(parsed.path[encoded_fragment.end():]) if encoded_fragment else parsed.fragment
    path = route_path.lower().rstrip("/") or "/"
    if re.match(r"^/(?:new-york/)?(?:secured|login|logout|registration|manageuserprofile|spa|api|sitecore)(?:/|$)", path):
        return "#demo-unavailable", "authenticated/account destination"
    if path in DOCUMENT_PATHS or re.search(r"\.(?:pdf|docx?|xlsx?|pptx?|csv|zip)$", path):
        asset = ASSET_BY_PATH.get(path)
        full = urljoin(source,raw)
        if asset:
            demo = asset.get("demoSrc", "/allianz-assets/" + asset["id"] + Path(asset["path"]).suffix)
            ASSET_AUDIT[full] = {"sourceUrl": full, "sourcePath": path, "demoSrc": demo, "status": "available", "localPath": asset["path"]}
            return demo, "bundled document"
        ASSET_AUDIT[full] = {"sourceUrl": full, "sourcePath": path, "demoSrc": "", "status": "missing", "localPath": ""}
        return "#demo-unavailable", "unresolved document"
    return path + ("?" + parsed.query if parsed.query else "") + ("#" + fragment if fragment else ""), "public same-host"


def link_value(node, source, text=None):
    raw = node.attrs.get("href", "") if node else ""
    href, reason = canonical_href(raw, source)
    label = text if text is not None else (node.text() if node else "")
    if raw:
        LINK_AUDIT[raw] = {"sourceHref": raw, "demoHref": href, "classification": reason}
    value = {"href": href, "text": label, "linktype": "internal" if reason in {"public same-host", "bundled document"} else "anchor", "target": ""}
    if reason not in {"public same-host", "bundled document", "empty"}:
        value["title"] = "This service is unavailable"
    result = {"jsonValue": {"value": value}}
    full = urljoin(source,raw)
    if full in ASSET_AUDIT:
        result["asset"] = ASSET_AUDIT[full]
    return result


def raw_svg(node):
    if not isinstance(node, Node):
        return html.escape(node)
    # No script/event/href sources enter extracted vector files.
    if node.tag not in {"svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "title", "desc", "defs", "clippath", "mask", "lineargradient", "radialgradient", "stop", "use"}:
        return ""
    attrs = {k: v for k, v in node.attrs.items() if not k.startswith("on") and k not in {"href", "xlink:href", "style"}}
    if node.tag=="use":
        href=node.attrs.get("href",node.attrs.get("xlink:href",""))
        if href.startswith("#"):
            attrs["href"]=href
    attrs.pop("focusable", None)
    attrs.pop("aria-labelledby", None)
    attrs.pop("aria-describedby", None)
    if node.tag == "svg":
        if "viewbox" in attrs:
            attrs["viewBox"] = attrs.pop("viewbox")
        if "preserveaspectratio" in attrs:
            attrs["preserveAspectRatio"] = attrs.pop("preserveaspectratio")
        attrs["xmlns"] = "http://www.w3.org/2000/svg"
    attrtext = "".join(f' {k}="{html.escape(v, quote=True)}"' for k, v in attrs.items())
    return f"<{node.tag}{attrtext}>" + "".join(raw_svg(n) for n in node.content) + f"</{node.tag}>"


def vector_image(node, source):
    defined={n.attrs["id"] for n in [node,*node.descendants()] if n.attrs.get("id")}
    references = [n for n in node.descendants() if n.tag in {"image", "script", "foreignobject"} or n.tag=="use" and not n.attrs.get("href",n.attrs.get("xlink:href","")).startswith("#")]
    if references:
        dependencies=[n.attrs.get("href",n.attrs.get("xlink:href","")) for n in references]
        ref = {"sourceUrl": source + "#source-vector-reference-"+hashlib.sha256("\n".join(dependencies).encode()).hexdigest()[:12], "demoSrc": "", "status": "missing", "availability": "not_attempted", "sourcePath": "", "localPath": "", "reason": "SVG contains dependent references; cannot silently strip or substitute", "dependentReferences": dependencies}
        ASSET_AUDIT[ref["sourceUrl"]] = ref
        return {"jsonValue": {"value": {"src": "", "alt": ""}}, "asset": ref}
    value = raw_svg(node)
    digest = hashlib.sha256(value.encode()).hexdigest()[:16]
    name = f"{digest}.svg"
    SVG_DIR.mkdir(exist_ok=True)
    (SVG_DIR / name).write_text(value)
    title = node.find("title")
    local_warnings=[n.attrs.get("href",n.attrs.get("xlink:href","")) for n in node.descendants() if n.tag=="use" and n.attrs.get("href",n.attrs.get("xlink:href",""))[1:] not in defined]
    VECTORS[digest] = {"id": digest, "name": name, "path": str(SVG_DIR / name), "sourceUrl": source, "demoSrc": "/allianz-assets/" + name, "status": "available", "kind": "source vector", "contentType": "image/svg+xml","internalReferenceWarnings":local_warnings}
    return {"jsonValue": {"value": {"src": "/allianz-assets/" + name, "alt": title.text() if title else ""}}}


ASSET_BY_PATH = {}


def load_assets():
    """Use only verifiably present approved assets; never request source assets."""
    manifests = sorted(ROOT.glob("**/*manifest*.json"))
    for manifest in manifests:
        try:
            payload = json.loads(manifest.read_text())
        except (ValueError, OSError):
            continue
        assets = payload.get("assets", payload.get("documents", [])) if isinstance(payload, dict) else payload
        if not isinstance(assets, list):
            continue
        for asset in assets:
            source_url=asset.get("url",asset.get("selectedSourceUrl",asset.get("sourceUrl",""))) if isinstance(asset,dict) else ""
            if not isinstance(asset, dict) or not source_url or asset.get("status") in {"observed403", "denied", "invalid", "error"}:
                continue
            parsed = urlparse(source_url)
            if parsed.hostname != "www.allianzlife.com":
                continue
            local = Path(asset.get("path", asset.get("localPath",asset.get("local_path", ""))))
            alternatives = [local, manifest.parent / local, manifest.parent / local.name]
            present = next((p for p in alternatives if p.is_file()), None)
            if present:
                ASSET_BY_PATH[parsed.path.lower()] = {**asset, "url":source_url,"id": asset.get("id", present.stem), "path": str(present), "manifest": str(manifest)}


def image_value(node, source):
    if node is None:
        return {"jsonValue": {"value": {"src": "", "alt": ""}}}
    if node.tag == "svg":
        return vector_image(node, source)
    src = node.attrs.get("src", "")
    full = urljoin(source, src.replace("~/", "/"))
    asset = ASSET_BY_PATH.get(urlparse(full).path.lower())
    if asset:
        suffix = Path(asset["path"]).suffix
        src = asset.get("demoSrc", "/allianz-assets/" + asset["id"] + suffix)
        status = "available"
    else:
        src = ""
        status = "missing" if urlparse(full).hostname == "www.allianzlife.com" else "outside-scope"
    ref = {"sourceUrl": full, "demoSrc": src, "status": status, "sourcePath": urlparse(full).path.lower(), "localPath": asset["path"] if asset else ""}
    ASSET_AUDIT[full] = ref
    return {"jsonValue": {"value": {"src": src, "alt": node.attrs.get("alt", "")}}, "asset": ref}


def rich(node, source, outer=False):
    if node is None:
        return ""
    if isinstance(node, str):
        return html.escape(node)
    if node.tag in DROP:
        return ""
    body = "".join(rich(n, source, True) for n in node.content)
    if not outer or node.tag not in ALLOWED_RICH:
        return body
    attrs = {}
    if node.tag == "a":
        href, reason = canonical_href(node.attrs.get("href", ""), source)
        attrs["href"] = href
        if reason not in {"public same-host", "bundled document", "empty"}:
            attrs["data-demo-disabled"] = "true"
            attrs["title"] = "This service is unavailable"
            LINK_AUDIT[node.attrs.get("href", "")] = {"sourceHref": node.attrs.get("href", ""), "demoHref": href, "classification": reason}
    for attr in ["colspan", "rowspan", "scope"]:
        if attr in node.attrs:
            attrs[attr] = node.attrs[attr]
    if node.tag == "span" and node.has("t-primary-brand"):
        attrs["class"] = "t-primary-brand"
    if node.tag == "table":
        safe_classes = {"table", "table-condensed", "table-bordered", "table-striped", "table-hover", "o-table", "o-table-index", "c-table", "c-table--light", "has-border"}
        keep=[c for c in node.attrs.get("class", "").split() if c in safe_classes or c in {"o-table__stripes--reverse", "o-table__multi-header", "o-table__body-column-borders", "o-table__header-text-vertical-alignment--middle", "o-table__body-text-horizontal-alignment--left", "o-table__body-text-vertical-alignment--middle"}]
        if keep:attrs["class"]=" ".join(keep)
    if node.tag in {"tr", "th", "td"}:
        keep=[c for c in node.attrs.get("class", "").split() if c in {"info", "active", "success", "warning", "danger", "text-center", "text-right"}]
        if keep:attrs["class"]=" ".join(keep)
    if node.tag == "p" and node.has("box"):
        attrs["class"]="box"
    if node.tag == "a":
        for key in ["id", "name"]:
            if re.fullmatch(r"[A-Za-z][\w:.-]*", node.attrs.get(key, "")):
                attrs[key] = node.attrs[key]
    attrtext = "".join(f' {k}="{html.escape(v, quote=True)}"' for k, v in attrs.items())
    return f"<{node.tag}{attrtext}>" + body + ("" if node.tag in VOID else f"</{node.tag}>")


def component(name, fields, params, key):
    uid = stable(key)
    return {"componentName": name, "uid": uid, "dataSource": stable(key + ":datasource"), "sourceKey":key,"params": params, "fields": {"data": {"datasource": {"id": stable(key + ":datasource"), **fields}}}}


def params(node, layout="stacked", columns=1, heading="h2"):
    classes = " ".join(n.attrs.get("class", "") for n in [node, *node.children()])
    theme = next((a for a in THEMES if f"t-bg-{a}" in classes), "transparent")
    result = {"theme": theme, "layout": layout, "columns": str(columns), "alignment": "left" if "u-text-left" in classes else "center", "spacing": "none", "headingLevel": heading}
    row_classes = " ".join(n.attrs.get("class", "") for n in node.all(css="l-grid__row"))
    for field_name, prefix in [("paddingTop", "u-padding-top-"), ("paddingBottom", "u-padding-bottom-"), ("marginBottom", "u-margin-bottom-")]:
        result[field_name] = next((s for s in ["xl", "lg", "md", "sm"] if prefix + s in row_classes), "none")
    hero_theme = next((a for a in ["fixed", "variable", "life"] if f"c-hero__theme--{a}" in classes), None)
    if hero_theme:
        result["heroTheme"] = hero_theme
    return result


def component_row_params(section, node, layout="plain", columns=1, heading="h2"):
    """Read only this block's ancestor rows, never a sibling's row spacing.

    A source section can contain a title row and a separate accordion row. Each
    native component owns its own row, so copying every descendant row's spacing
    onto both components would duplicate the source section's padding/margins.
    """
    result = params(section, layout, columns, heading)
    classes = []
    current = node
    while current is not None and current is not section:
        if current.has("l-grid__row"):
            classes.extend(current.attrs.get("class", "").split())
        current = current.parent
    for field_name, prefix in [("paddingTop", "u-padding-top-"), ("paddingBottom", "u-padding-bottom-"), ("marginBottom", "u-margin-bottom-")]:
        result[field_name] = next((size for size in ["xl", "lg", "md", "sm"] if prefix + size in classes), "none")
    result["spacing"] = "none"
    return result


def tile_fields(tile, source, key):
    heading = tile.find(css="tileHeading") or tile.find(css="m-card__header")
    body = tile.find(css="tileBody") or tile.find(css="m-card__body")
    im = tile.find(css="tileImage") or tile.find(css="m-card__image")
    image = im.find("img") if im else None
    if image is None:
        image = tile.find("img")
    icon_holder = tile.find(css="tileIcon")
    icon = icon_holder.find("svg") if icon_holder else None
    subheading = tile.find(css="tileSubHeading")
    alpha = tile.find(css="alphaType")
    theme = next((a for a in ["blue-soft", "grey-muted", "primary-white", "green-soft", "grey-soft", "purple-soft", "yellow-soft", "red-soft"] if tile.has("t-bg-" + a)), "transparent")
    heading_tag = next((n.tag for n in heading.descendants() if n.tag in {"h2", "h3", "h4"}), "h4") if heading else "h4"
    anchor = tile if tile.tag == "a" else (tile.find(css="tileLink").find("a") if tile.find(css="tileLink") else None)
    link_holder=tile.find(css="tileLink") or tile.find(css="m-card__footer")
    anchors=link_holder.all("a") if link_holder else []
    return {"id": stable(key), "heading": field_value(heading.text() if heading else ""), "subheading": field_value(rich(subheading, source).strip()), "body": field_value(rich(body, source).strip()), "image": image_value(image, source), "icon": image_value(icon, source), "iconTheme":field_value("primary-brand" if icon_holder and icon_holder.has("t-bg-primary-brand") else "transparent"), "link": link_value(anchor, source), "links":{"targetItems":[{"id":stable(key+f":link:{i}"),"title":field_value(a.text()),"link":link_value(a,source),"children":{"results":[]}} for i,a in enumerate(anchors)]},"theme": field_value(theme), "headingLevel": field_value(heading_tag), "alphanumeral": field_value(alpha.text() if alpha else "")}


def substantive(node):
    """Editorial text, excluding integration payloads and decorative SVG labels."""
    if node.tag in DROP or node.has("hidden"):
        return ""
    return re.sub(r"\s+", " ", " ".join(substantive(n) if isinstance(n, Node) else n for n in node.content)).strip()


def source_facts(node):
    return {"tag": node.tag, "classes": node.attrs.get("class", ""), "id": node.attrs.get("id", ""), "textPreview": substantive(node)[:180]}


def residual_editorial(section, components, source):
    """A conservative text gate catches dropped subheads/paragraphs within mapped blocks."""
    represented = []
    def collect(value):
        if isinstance(value, dict):
            j = value.get("jsonValue", {}).get("value")
            if isinstance(j, str):
                represented.append(substantive(DOM(j).root))
            elif isinstance(j, dict):
                represented.append(j.get("text", ""))
            for k,v in value.items():
                if k not in {"jsonValue", "asset"}:
                    if k=="link" and ("title" in value or value.get("links",{}).get("targetItems")):
                        continue
                    collect(v)
        elif isinstance(value,list):
            for v in value: collect(v)
    for component_value in components:
        collect(component_value.get("fields", {}))
    source_words = re.findall(r"\w+", substantive(section).casefold())
    result_words = re.findall(r"\w+", " ".join(represented).casefold())
    missing = collections.Counter(source_words) - collections.Counter(result_words)
    # Allow no substantive omissions. A Counter avoids markup/whitespace differences.
    return dict(missing)


def legacy_page(row, dom):
    """Finite legacy components; wrappers are never stored as a CMS body field."""
    source = row["final_url"]
    path = urlparse(source).path.lower().rstrip("/") or "/"
    center = dom.find(css="center-column")
    components, gaps = [], []
    base = {"theme": "transparent", "layout": "plain", "columns": "1", "alignment": "left", "spacing": "none", "headingLevel": "h2"}
    ordinal = 0

    def emit(name, fields, render_params, node, key_suffix=""):
        nonlocal ordinal
        key = path + f":component:{ordinal}" + key_suffix
        ancestor=node
        while ancestor and ancestor is not center:
            if ancestor.has("next-steps"):
                render_params={**render_params,"nextSteps":"1"}
                break
            ancestor=ancestor.parent
        value = component(name, fields, render_params, key)
        value["provenance"] = {"sourceUrl": source, "sourceHtml": row["html_file"], "sourceBlock": source_facts(node), "ordinal": ordinal}
        components.append(value)
        ordinal += 1
        return value

    if center is None:
        gaps.append({"path": path, "reason": "Source is shell-only: no center-column/editorial content. Do not invent homepage content."})
        return {"path": path, "title": row.get("title", ""), "description": "", "sourceUrl": source, "archetype": row.get("archetype", ""), "shellFamily": row.get("shell_family", ""), "components": [], "needsReview": True}, gaps
    side = dom.find(css="left-column")
    nav = side.find("ul") if side else None
    if nav:
        emit("AllianzLegacySidebar", {"heading": field_value(""), "primaryNav": {"targetItems": nav_items(nav,source,path + ":sidebar:")}}, {}, side)

    def pure_editorial(node):
        allowed_wrappers = {"div", "section", "article"}
        return all(n.tag in ALLOWED_RICH | allowed_wrappers and not n.has("panel-group") and not n.has("next-steps") and not n.has("mod-row") for n in [node,*node.descendants()])

    def extract_form(form, placement):
        fields = []
        labels = {l.attrs.get("for", ""): l.text() for l in form.all("label") if l.attrs.get("for")}
        seen = set()
        for control in [n for n in form.descendants() if n.tag in {"input", "select", "textarea"}]:
            input_type = control.attrs.get("type", "text") if control.tag == "input" else control.tag
            if input_type in {"hidden", "submit", "button", "password", "reset"}:
                continue
            name = control.attrs.get("name") or control.attrs.get("id")
            if not name or name in seen:
                continue
            seen.add(name)
            label = control.attrs.get("data-val-sitecore-labeltext","") or labels.get(control.attrs.get("id", ""), "")
            if not label:
                parent_label = control.parent if control.parent and control.parent.tag == "label" else None
                label = parent_label.text() if parent_label else control.attrs.get("placeholder", name.split(".")[-1])
            options = [{"label": o.text(), "value": o.attrs.get("value", o.text())} for o in control.all("option")] if control.tag == "select" else []
            required = "required" in control.attrs or bool(control.attrs.get("data-val-required"))
            fields.append({"id": stable(path + ":form:" + name), "name": field_value(name), "sourceName":field_value(name),"label": field_value(label), "inputType": field_value(input_type), "required": field_value(required), "validationMessage": field_value(control.attrs.get("data-val-required", "Please complete this field.") if required else ""), "options": field_value(json.dumps(options,ensure_ascii=False)),"maxLength":field_value(control.attrs.get("maxlength",control.attrs.get("data-val-length-max",""))),"pattern":field_value(control.attrs.get("pattern",control.attrs.get("data-val-regex-pattern",""))),"placeholder":field_value(control.attrs.get("placeholder",control.attrs.get("data-val-sitecore-placeholder","")))})
        button = next((n for n in form.descendants() if n.tag in {"button", "input"} and n.attrs.get("type") == "submit"), None)
        submit_label = button.attrs.get("value", button.text()) if button else "Submit"
        schema_key="death-claim" if form.attrs.get("id")=="StartClaimAboutPortletForm" else "new-york-contact" if form.attrs.get("id")=="ContactUsContainerPortletForm" else "generic"
        value = emit("AllianzForm", {"heading": field_value(""), "body": field_value(""), "schemaKey":field_value(schema_key), "successMessage": field_value("Information validated. No information has been submitted."), "submitLabel": field_value(submit_label), "children": {"results": fields}}, {**base,"headingLevel":"h3"}, form)
        value["integrationPolicy"] = {"mode": "mock-only", "productionSubmission": False, "sourcePlacement": placement}
        gaps.append({"path": path, "reason": "Native form fields extracted; conditional fields and placement require frontend state verification", "source": source_facts(form), "placement": placement, "fieldCount": len(fields)})

    def sequence(nodes, region, parent, placement="body"):
        buffer = []
        def flush():
            if not buffer:
                return
            fragment = "".join(rich(n,source,True) for n in buffer)
            if substantive(DOM(fragment).root):
                render_params = {**base, "region": region}
                if any(isinstance(n,Node) and (n.tag == "table" or n.find("table")) for n in buffer):
                    render_params["tableTheme"] = "striped" if any(isinstance(n,Node) and any(x.has("table-striped") for x in [n,*n.descendants()]) for n in buffer) else "plain"
                emit("AllianzLegacyRichText", {"heading": field_value(""), "body": field_value(fragment.strip())}, render_params, parent)
            buffer.clear()
        for node in nodes:
            if isinstance(node,str):
                if node.strip():buffer.append(node)
                continue
            if node.tag in {"script", "style", "noscript"} or node.has("hidden"):
                continue
            if node.tag == "form":
                flush(); extract_form(node,placement); continue
            if node.has("panel-group"):
                flush(); entries = []
                for panel_index,panel in enumerate(node.children()):
                    if not panel.has("panel"):
                        continue
                    heading = panel.find(css="panel-title")
                    body = panel.find(css="panel-body")
                    entries.append({"id": stable(path+f":accordion:{ordinal}:{panel_index}"), "heading": field_value(heading.text() if heading else ""), "body": field_value(rich(body,source))})
                emit("AllianzLegacyAccordion", {"heading": field_value(""), "children": {"results": entries}}, {**base,"region":region}, node)
                for form in node.all("form"):
                    extract_form(form,"accordion-panel")
                extras=[n for n in node.content if not (isinstance(n,Node) and n.has("panel"))]
                if any(isinstance(n,Node) and substantive(n) for n in extras):
                    sequence(extras,region,node,placement)
                continue
            if node.has("nav-links"):
                flush(); emit("AllianzLegacyLinkList", {"heading":field_value(""),"children":{"results":[{"id":x["id"],"heading":x["title"],"body":field_value(""),"link":x["link"]} for x in nav_items(node,source,path+f":tabs:{ordinal}:")]}}, {"style":"nav-links"},node);continue
            if node.has("mod-row"):
                flush(); cards=[]
                for ci,col in enumerate(node.children()):
                    h=next((n for n in col.descendants() if n.tag in {"h2","h3","h4"}),None)
                    card_body="".join(rich(n,source,True) for n in col.all("p") if not n.has("link"))
                    a=col.find(css="link");a=a.find("a") if a else col.find("a")
                    icon=col.find("svg");image=col.find("img")
                    cards.append({"id":stable(path+f":card:{ordinal}:{ci}"),"heading":field_value(h.text() if h else ""),"subheading":field_value(""),"body":field_value(card_body),"image":image_value(image,source),"icon":image_value(icon,source),"link":link_value(a,source),"theme":field_value("transparent"),"headingLevel":field_value(h.tag if h else "h3"),"alphanumeral":field_value("")})
                breakpoint="md" if any(any(c.startswith("col-md-") for c in x.attrs.get("class", "").split()) for x in node.children()) else "sm"
                emit("AllianzLegacyCardGrid", {"heading":field_value(""),"body":field_value(""),"children":{"results":cards}}, {**base,"columns":str(min(4,len(cards)) or 1),"region":region,"alignment":"center" if node.has("text-center") else "left","breakpoint":breakpoint,"noMarginBottom":"1" if node.has("no-margin-bottom") else "0"},node);continue
            if node.has("next-steps"):
                flush(); heading=node.find("h2");link_list=next((n for n in node.children() if n.tag=="ul"),None)
                emit("AllianzLegacyLinkList",{"heading":field_value(heading.text() if heading else ""),"children":{"results":[{"id":x["id"],"heading":x["title"],"body":field_value(""),"link":x["link"]} for x in nav_items(link_list,source,path+f":next:{ordinal}:")]}},{"style":"next-steps"},node)
                sequence([n for n in node.content if n not in [heading,link_list] and not (isinstance(n,Node) and n.tag=="hr")],region,node,"next-steps");continue
            if node.tag in ALLOWED_RICH and not node.find("img") and not node.find("form") and not node.find(css="panel-group"):
                buffer.append(node);continue
            if pure_editorial(node):
                buffer.append(node);continue
            if node.tag in {"div", "section", "article"}:
                flush(); sequence(node.content,region,node,placement);continue
            flush()
            if node.tag == "img":
                emit("AllianzLegacyHero", {"heading":field_value(""),"body":field_value(""),"desktopImage":image_value(node,source),"mobileImage":image_value(node,source),"primaryLink":link_value(None,source),"secondaryLink":link_value(None,source)}, {**base,"layout":"stage","headingLevel":"h1"}, node)
                gaps.append({"path":path,"reason":"Standalone editorial image requires contextual native layout review","source":source_facts(node)})
            elif substantive(node):
                gaps.append({"path":path,"reason":"Unsupported legacy editorial island","source":source_facts(node)})
        flush()

    for section in center.children():
        if section.has("hidden"):
            continue
        if section.has("hero-img"):
            h=next((n for n in section.descendants() if n.tag in {"h1","h2"}),None)
            body=section.find(css="notepad-content")
            paragraph_body="".join(rich(n,source,True) for n in body.all("p")) if body else ""
            notepad=section.find(css="notepad")
            position="left" if notepad and notepad.has("left") else "right"
            product_line="none" if not notepad or notepad.has("no-product-line") else "life-insurance" if notepad.has("life-insurance") else "annuities"
            emit("AllianzLegacyHero", {"heading":field_value(rich(h,source)),"body":field_value(paragraph_body),"desktopImage":image_value(section.find("img"),source),"mobileImage":image_value(section.find("img"),source),"primaryLink":link_value(None,source),"secondaryLink":link_value(None,source)}, {"position":position,"productLine":product_line},section)
        elif section.has("page-header"):
            h=section.find("h1") or section.find("h2")
            emit("AllianzLegacyPageHeader", {"heading":field_value(h.text() if h else section.text()),"body":field_value("")},{},section)
        elif section.has("row"):
            for body in section.children():
                if body.has("content-footer"):
                    emit("AllianzLegacyLinkList", {"heading":field_value(""),"children":{"results":[{"id":x["id"],"heading":x["title"],"body":field_value(""),"link":x["link"]} for x in nav_items(body.find("ul"),source,path+":tools:")]}},{"style":"tools"},body)
                elif body.has("content-body"):
                    region=next((a for a in ["pre-content","content","post-content","disclosure"] if body.has(a)),"content")
                    sequence(body.content,region,body)
                elif substantive(body):
                    gaps.append({"path":path,"reason":"Unsupported legacy row column","source":source_facts(body)})
        else:
            sequence([section],"content",section)
    source_body = Node("div",content=[n for n in center.children() if not n.has("hidden") and not n.has("content-footer")])
    missing = residual_editorial(source_body,components,source)
    if missing:
        gaps.append({"path":path,"reason":"Legacy extraction omitted source editorial words; do not import until reconciled","missingWordCounts":missing})
    if row.get("archetype") in {"Interactive tool / calculator", "Product rates", "Product video", "Site search", "Contact / claim form"}:
        gaps.append({"path":path,"reason":"Legacy interactive archetype needs independently verified mocked behavior","archetype":row["archetype"]})
    return {"path":path,"title":row.get("title",""),"description":"","sourceUrl":source,"archetype":row.get("archetype",""),"shellFamily":row.get("shell_family",""),"components":components,"needsReview":bool(gaps)},gaps


def supplement_modern_components(main,components,source,path):
    """Handle explicit additional editorial islands without flattening sections."""
    result=[]
    for section_index,section in enumerate(main.children()):
        prefix=path+f":section:{section_index}"
        group=[c for c in components if c.get("sourceKey","")==prefix or c.get("sourceKey","").startswith(prefix+":")]
        positions={id(n):i for i,n in enumerate([section,*section.descendants()])}
        articles=[n for n in section.all("article") if n.has("m-axlTile") or n.has("m-axlIntroductionBlock")]
        intros=[n for n in articles if n.has("m-axlIntroductionBlock")]
        extra_ordinal=0
        ordered=[]
        def push(value,node):
            value["provenance"]={"sourceUrl":source,"sourceSection":section_index,"sourceBlock":source_facts(node)}
            ordered.append((positions.get(id(node),0),len(ordered),value))
        def extra(name,fields,render_params,node):
            nonlocal extra_ordinal
            value=component(name,fields,render_params,prefix+f":editorial-island:{extra_ordinal}")
            extra_ordinal+=1
            push(value,node)
        for value in group:
            node=section
            if value["componentName"]=="AllianzAccordion":
                ai=int(value["sourceKey"].rsplit(":",1)[-1]);accordions=section.all(css="c-accordion")
                node=accordions[ai] if ai<len(accordions) else section
            elif value["componentName"] in {"AllianzCardGrid","AllianzRichText"}:
                node=intros[0] if intros else articles[0] if articles else section.find(css="o-richTextEditor__wrapper") or section
            if intros and value["componentName"] in {"AllianzCardGrid","AllianzRichText"} and node is intros[0]:
                value["fields"]["data"]["datasource"]["primaryLink"]=tile_fields(intros[0],source,prefix+":intro")["link"]
            if value["componentName"]=="AllianzCardGrid" and articles:
                tile=next((n for n in articles if not n.has("m-axlIntroductionBlock")),articles[0])
                ratio=next((r for cl,r in [("tile--3366","33:67"),("tile--6633","67:33"),("tile--5050","50:50")] if tile.has(cl)),None)
                if ratio:
                    value["params"]["layout"]="image-right" if tile.has("-is--flipped") else "image-left"
                    value["params"]["splitRatio"]=ratio
                col=tile.parent
                while col and col is not section:
                    width=next((int(match.group(1)) for cl in col.attrs.get("class","").split() if (match:=re.fullmatch(r"l-grid__column-medium-(\d+)",cl))),None)
                    if width and width in {3,4,6,12}:
                        value["params"]["columns"]=str(12//width);break
                    col=col.parent
            push(value,node)
        for intro in intros[1:]:
            fields=tile_fields(intro,source,prefix+f":additional-intro:{extra_ordinal}")
            render_params=params(section,"plain",1,fields["headingLevel"]["jsonValue"]["value"])
            render_params["alignment"]="left" if intro.find(css="tileContent") and intro.find(css="tileContent").has("u-text-left") else "center"
            if fields["icon"]["jsonValue"]["value"]["src"] or fields["image"]["jsonValue"]["value"]["src"]:
                extra("AllianzCardGrid",{"heading":field_value(""),"body":field_value(""),"children":{"results":[fields]}},render_params,intro)
            elif fields["heading"]["jsonValue"]["value"] or fields["body"]["jsonValue"]["value"] or fields["link"]["jsonValue"]["value"]["href"]:
                extra("AllianzRichText",{"heading":fields["heading"],"subheading":fields["subheading"],"body":fields["body"],"primaryLink":fields["link"]},render_params,intro)
        for well in [n for n in section.descendants() if n.has("well") and (n.has("seven-yr-slot") or n.has("five-yr-slot") or n.find("span") and any(x.attrs.get("testid")=="currentMVARate" for x in n.all("span")))]:
            rate=next((n for n in well.descendants() if n.attrs.get("testid")=="currentMVARate"),None)
            date=next((n for n in well.descendants() if n.attrs.get("testid")=="currentMVARateEffectiveDate"),None)
            small=well.find("small")
            paragraphs=[n for n in well.all("p") if not n.find("a")]
            render_params=params(section,"plain")
            render_params["RenderingIdentifier"]="mva-rate"
            extra("AllianzRateSnapshot",{"heading":field_value((small.text() if small else "Current MVA reference rate:").rstrip(":")),"rate":field_value((rate.text() if rate else "")+"%"),"asOf":field_value(date.text() if date else ""),"body":field_value("".join(rich(n,source,True) for n in paragraphs)),"link":link_value(well.find("a"),source)},render_params,well)
        for wrapper in section.all(css="o-richTextEditor__wrapper"):
            ancestor=wrapper.parent
            inside_component=False
            while ancestor and ancestor is not section:
                if ancestor.tag=="article" or ancestor.has("c-accordion__item-content"):
                    inside_component=True;break
                ancestor=ancestor.parent
            if inside_component:continue
            if wrapper.find(css="bordered") and any(c["params"].get("layout")=="bordered" for c in group):
                continue
            if any(c["componentName"]=="AllianzRichText" and c["fields"]["data"]["datasource"].get("body",{}).get("jsonValue",{}).get("value")==rich(wrapper,source).strip() for c in group):
                continue
            timeline=[]
            for tr in wrapper.all("tr"):
                cells=[n for n in tr.children() if n.tag=="td"]
                if len(cells)>=3 and re.fullmatch(r"\d{4}",cells[0].text()):
                    timeline.append({"id":stable(prefix+f":timeline:{len(timeline)}"),"date":field_value(cells[0].text()),"heading":field_value(""),"body":field_value(rich(cells[-1],source)),"image":image_value(None,source),"link":link_value(None,source)})
            if len(timeline)>=5:
                extra("AllianzTimeline",{"heading":field_value(""),"body":field_value(""),"children":{"results":timeline}},params(section,"plain"),wrapper);continue
            definitions=wrapper.all(css="index-table-2-col")
            if definitions:
                entries=[]
                for di,definition in enumerate(definitions):
                    fund=definition.find(css="index-table-fund")
                    swatch=definition.find(css="index-table-swatch")
                    color=next((c[5:] for c in swatch.attrs.get("class","").split() if c.startswith("t-bg-")),"") if swatch else ""
                    entries.append({"id":stable(prefix+f":index-definition:{di}"),"body":field_value(rich(fund,source)),"color":field_value(color)})
                extra("AllianzIndexDefinitions",{"heading":field_value(""),"body":field_value(""),"children":{"results":entries}},params(section,"plain"),wrapper);continue
            fragment=rich(wrapper,source).strip()
            if fragment and substantive(DOM(fragment).root):
                extra("AllianzRichText",{"heading":field_value(""),"body":field_value(fragment)}, {**params(section,"rich-text"),"alignment":"left"},wrapper)
        result.extend(value for _,_,value in sorted(ordered,key=lambda x:(x[0],x[1])))
    return result


def parse_page(row):
    source = row["final_url"]
    path = urlparse(source).path.lower().rstrip("/") or "/"
    dom = DOM((ROOT / row["html_file"]).read_text()).root
    main = dom.find("main")
    components = []
    gaps = []
    if main is None:
        return legacy_page(row,dom)
    for index, section in enumerate(main.children()):
        key = path + f":section:{index}"
        hero = section if section.has("c-hero") else section.find(css="m-axlHero")
        if hero:
            heading = hero.find("h1")
            subheading = hero.find(css="c-hero__subHeadline")
            image = hero.find("img")
            p = params(section, "home" if section.has("c-hero") else "stage", 1, "h1")
            p["showLogin"] = "1" if section.has("-login") else "0"
            fields = {"heading": field_value(rich(heading, source).strip()), "body": field_value(rich(subheading, source).strip()), "desktopImage": image_value(image, source), "mobileImage": image_value(image, source), "primaryLink": link_value(None, source), "secondaryLink": link_value(None, source)}
            components.append(component("AllianzHero", fields, p, key))
            continue
        accordions = section.all(css="c-accordion")
        cards = section.all(css="m-card")
        tiles = [n for n in section.all("article") if n.has("m-axlTile") or n.has("m-axlIntroductionBlock")]
        intro = next((n for n in tiles if n.has("m-axlIntroductionBlock")), None)
        article_intro = section.find(css="m-azlIntroductionBlock")
        if article_intro:
            heading_node = article_intro.find(css="tileHeading")
            subheading_node = article_intro.find(css="tileSubHeading")
            bodies = [n for n in section.all(css="l-grid__column-medium-12") if n.find("p") and not n.find("article")]
            fields = {"heading": field_value(heading_node.text() if heading_node else ""), "summary": field_value(rich(subheading_node, source)), "body": field_value("".join(rich(n, source) for n in bodies)), "publishedDate": field_value("")}
            components.append(component("AllianzArticle", fields, {**params(section, "plain", 1, "h1"), "alignment": "left"}, key))
            continue
        teaser_items = section.all(css="c-search-result-text-teaser__item")
        if teaser_items:
            items = []
            for ti, teaser in enumerate(teaser_items):
                h = teaser.find(css="c-search-result-text-teaser__headline")
                a = h.find("a") if h else None
                bodies = teaser.all(css="c-search-result-text-teaser__copytext")
                items.append({"id": stable(key + f":teaser:{ti}"), "heading": field_value(h.text() if h else ""), "body": field_value("".join(rich(n,source,True) for n in bodies)), "image": image_value(None,source), "link": link_value(a,source)})
            components.append(component("AllianzCardGrid", {"heading": field_value(""), "body": field_value(""), "children": {"results": items}}, {**params(section, "list", 1, "h5"), "alignment": "left"}, key))
            gaps.append({"path": path, "section": index, "reason": "Native CardGrid list layout needs frontend implementation", "source": source_facts(section)})
            continue
        if accordions:
            if intro:
                f = tile_fields(intro, source, key + ":intro")
                heading_node = intro.find(css="tileHeading")
                anchor = heading_node.find("a") if heading_node else None
                p = component_row_params(section, intro, "plain")
                p["alignment"] = "left" if intro.find(css="tileContent") and intro.find(css="tileContent").has("u-text-left") else "center"
                if anchor and (anchor.attrs.get("name") or anchor.attrs.get("id")):
                    p["RenderingIdentifier"] = anchor.attrs.get("name") or anchor.attrs["id"]
                heading_tag=next((n.tag for n in heading_node.descendants() if n.tag in {"h1","h2","h3","h4"}),"h2") if heading_node else "h2"
                p["headingLevel"]=heading_tag
                if f["image"]["jsonValue"]["value"]["src"] or f["icon"]["jsonValue"]["value"]["src"]:
                    components.append(component("AllianzCardGrid", {"heading": field_value(""), "body": field_value(""), "children": {"results": [f]}}, p, key + ":intro"))
                elif f["heading"]["jsonValue"]["value"] or f["body"]["jsonValue"]["value"]:
                    components.append(component("AllianzRichText", {"heading": f["heading"], "subheading": f["subheading"], "body": f["body"]}, p, key + ":intro"))
            for ai, accordion in enumerate(accordions):
                children = []
                for ii, item in enumerate(accordion.all(css="c-accordion__item-wrapper")):
                    trigger = item.find(css="c-accordion__item-title") or item.find("button")
                    body = item.find(css="accordionContent") or item.find(css="c-accordion__item-content")
                    children.append({"id": stable(key + f":accordion:{ai}:{ii}"), "heading": field_value(trigger.text() if trigger else ""), "body": field_value(rich(body, source).strip())})
                components.append(component("AllianzAccordion", {"heading": field_value(""), "children": {"results": children}}, component_row_params(section, accordion, "plain"), key + f":accordion:{ai}"))
            continue
        if cards or len(tiles) > 1 or (tiles and (tiles[0].find("img") or tiles[0].find("svg") or tiles[0].find(css="tileLink") or tiles[0].find(css="alphaType"))):
            items = cards or [t for t in tiles if not t.has("m-axlIntroductionBlock")]
            if not items:
                items = tiles
                intro = None
            layout = "cards" if cards else "stacked"
            if items and items[0].has("tile--5050"):
                layout = "image-right" if items[0].has("-is--flipped") else "image-left"
            columns = min(4, len(items)) or 1
            fields = {"heading": field_value(intro.find(css="tileHeading").text() if intro and intro.find(css="tileHeading") else ""), "subheading": field_value(rich(intro.find(css="tileSubHeading"),source).strip() if intro else ""), "body": field_value(rich(intro.find(css="tileBody"), source).strip() if intro else ""), "children": {"results": [tile_fields(t, source, key + f":tile:{i}") for i, t in enumerate(items)]}}
            p = params(section, layout, columns)
            child_heading = items[0].find(css="tileHeading") or items[0].find(css="m-card__header") if items else None
            heading_tag = next((n.tag for n in child_heading.descendants() if n.tag in {"h2", "h3", "h4"}), "h4") if child_heading else "h4"
            p["headingLevel"] = heading_tag
            if items and items[0].find(css="tileContent"):
                p["alignment"] = "left" if items[0].find(css="tileContent").has("u-text-left") else "center"
            components.append(component("AllianzCardGrid", fields, p, key))
            continue
        if tiles:
            f = tile_fields(tiles[0], source, key)
            p = params(section, "plain")
            heading_node = tiles[0].find(css="tileHeading")
            if heading_node:
                p["headingLevel"] = next((n.tag for n in heading_node.descendants() if n.tag in {"h2", "h3", "h4"}), "h2")
            p["alignment"] = "left" if tiles[0].find(css="tileContent") and tiles[0].find(css="tileContent").has("u-text-left") else "center"
            components.append(component("AllianzRichText", {"heading": f["heading"], "subheading": f["subheading"], "body": f["body"]}, p, key))
            continue
        rich_wrapper = section.find(css="o-richTextEditor__wrapper") or section.find(css="disclosure")
        if rich_wrapper:
            bordered = rich_wrapper.find(css="bordered")
            if bordered:
                body = bordered.find(css="tileBody")
                a = bordered.find("a")
                f = {"id": stable(key + ":card"), "heading": field_value(""), "body": field_value(rich(body, source).strip()), "image": image_value(bordered.find("img"), source), "link": link_value(a, source)}
                components.append(component("AllianzCardGrid", {"heading": field_value(""), "body": field_value(""), "children": {"results": [f]}}, params(section, "bordered"), key))
            elif rich_wrapper.text():
                p=params(section,"plain")
                if rich_wrapper.has("disclosure"):
                    p["theme"]="grey-muted";p["alignment"]="left";p["layout"]="disclosures"
                else:
                    p["alignment"]="left";p["layout"]="rich-text"
                components.append(component("AllianzRichText", {"heading": field_value(""), "body": field_value(rich(rich_wrapper, source).strip())}, p, key))
            continue
        if section.text():
            gaps.append({"path": path, "section": index, "reason": "Unmapped native structural archetype", "classes": section.attrs.get("class", ""), "textPreview": section.text()[:180]})
    components=supplement_modern_components(main,components,source,path)
    by_section = collections.defaultdict(list)
    for value in components:
        # UUIDs are deliberately opaque; retain explicit source section provenance.
        value["provenance"] = {"sourceUrl": source, "sourceHtml": row["html_file"]}
    for index, section in enumerate(main.children()):
        expected = substantive(section)
        prefix=path+f":section:{index}"
        section_components = [c for c in components if c.get("sourceKey")==prefix or c.get("sourceKey","").startswith(prefix+":")]
        if not expected:
            continue
        missing = residual_editorial(section, section_components, source)
        if missing and not any(g.get("section") == index for g in gaps):
            gaps.append({"path": path, "section": index, "reason": "Mapped component omitted source editorial words; do not import until reconciled", "missingWordCounts": missing, "source": source_facts(section)})
        source_form = section.find("form")
        source_login = source_form and "AllianzLogin" in source_form.attrs.get("action", "") and any(c["componentName"] == "AllianzHero" and c["params"].get("showLogin") == "1" for c in section_components)
        if source_form and not source_login:
            gaps.append({"path": path, "section": index, "reason": "Form requires native field model and mocked validation; source form action never imported", "source": source_facts(section)})
        if section.find("iframe"):
            gaps.append({"path": path, "section": index, "reason": "Embedded integration requires deliberate mock; source iframe never imported", "source": source_facts(section)})
    if row.get("archetype") in {"Interactive tool / calculator", "Product rates", "Product video", "Site search", "Contact / claim form"}:
        gaps.append({"path": path, "reason": "Interactive archetype needs independently verified frontend states and native/mock behavior", "archetype": row["archetype"]})
    return {"path": path, "title": row.get("title", ""), "description": "", "sourceUrl": source, "archetype": row.get("archetype", ""), "shellFamily": row.get("shell_family", ""), "components": components, "needsReview": bool(gaps)}, gaps


def nav_items(ul, source, key):
    if not ul:
        return []
    items = []
    for index, li in enumerate(ul.children()):
        if li.tag != "li" or li.has("logo-icon"):
            continue
        anchor = next((n for n in li.children() if n.tag == "a"), None)
        if not anchor:
            continue
        child_ul = next((n for n in li.children() if n.tag == "ul"), None)
        item_key = key + str(index)
        item = {"id": stable(item_key), "title": field_value(anchor.text()), "link": link_value(anchor, source), "children": {"results": nav_items(child_ul, source, item_key + ":")}}
        svg = anchor.find("svg")
        if svg:
            item["icon"] = image_value(svg, source)
        items.append(item)
    return items


def shared_components(home):
    source = home["final_url"]
    dom = DOM((ROOT / home["html_file"]).read_text()).root
    utility = dom.find(css="m-navigationUtility")
    primary = dom.find(css="m-navigation-primary")
    logo = utility.find("svg") if utility else None
    utility_ul = next((n for n in utility.all("ul") if not n.has("logo-name")), None) if utility else None
    logo_name=utility.find(css="logo-name") if utility else None
    insurer=next((n for n in logo_name.children() if n.tag=="li" and not n.has("logo-icon")),None) if logo_name else None
    header = component("AllianzHeader", {"logo": image_value(logo, source), "tagline":field_value(insurer.text() if insurer else ""),"primaryNav": {"targetItems": nav_items(primary.find("ul") if primary else None, source, "nav:primary:")}, "utilityNav": {"targetItems": nav_items(utility_ul, source, "nav:utility:")}}, {}, "shared:header")
    footer = dom.find(css="c-footer")
    groups = []
    for i, col in enumerate(footer.all(css="l-grid__column-medium-3") if footer else []):
        heading = col.find(css="c-footer__navigation-headline")
        groups.append({"id": stable(f"footer:{i}"), "title": field_value(heading.text() if heading else ""), "link": link_value(None, source), "children": {"results": nav_items(col.find("ul"), source, f"footer:{i}:")}})
    legal = footer.find(css="c-footer__legal") if footer else None
    copyright_node = footer.find(css="c-footer__copyright") if footer else None
    tagline = footer.find(css="c-footer__tagline-headline") if footer else None
    body = html.escape(tagline.text()) if tagline else ""
    legal_items = []
    for i, anchor in enumerate(legal.all("a") if legal else []):
        legal_items.append({"id": stable(f"footer:legal:{i}"), "title": field_value(anchor.text()), "link": link_value(anchor, source), "children": {"results": []}})
    social_items = []
    social_block = footer.find(css="m-footer__social") if footer else None
    for i, anchor in enumerate(social_block.all("a") if social_block else []):
        social_items.append({"id": stable(f"footer:social:{i}"), "title": field_value(anchor.attrs.get("title", "")), "link": link_value(anchor, source, anchor.attrs.get("title", "")), "icon": image_value(anchor.find("svg"), source), "children": {"results": []}})
    footer_component = component("AllianzFooter", {"logo": image_value(logo, source), "primaryNav": {"targetItems": groups}, "utilityNav": {"targetItems": legal_items}, "socialNav": {"targetItems": social_items}, "body": field_value(body), "copyright": field_value(copyright_node.text() if copyright_node else "")}, {}, "shared:footer")
    return {"header": header, "footer": footer_component}


def legacy_shared_components(row,key):
    source=row["final_url"]
    dom=DOM((ROOT/row["html_file"]).read_text()).root
    by_id=lambda value:next((n for n in dom.descendants() if n.attrs.get("id")==value),None)
    mast=dom.find(css="mast-title")
    byline=mast.find(css="byline") if mast else None
    main_nav=by_id("MainNavigationPortlet")
    utility=by_id("UtilityNavigationPortlet")
    logo_file=ROOT/"legacy-assets/logo.png"
    logo_ref={"sourceUrl":"https://www.allianzlife.com/~/media/images/allianz/global/css/logo.png","sourcePath":"/~/media/images/allianz/global/css/logo.png","demoSrc":"/allianz-legacy-assets/logo.png" if logo_file.is_file() else "","status":"available" if logo_file.is_file() else "missing","availability":"captured" if logo_file.is_file() else "not_attempted","kind":"raster","localPath":str(logo_file) if logo_file.is_file() else "","evidence":"legacy-assets/azl-styles.source.css"}
    ASSET_AUDIT[logo_ref["sourceUrl"]]=logo_ref
    logo={"jsonValue":{"value":{"src":logo_ref["demoSrc"],"alt":"Allianz"}},"asset":logo_ref}
    home_path="/new-york" if key=="new-york" else "/"
    header_fields={"logo":logo,"heading":field_value(mast.text() if mast else ""),"tagline":field_value(""),"byline":field_value(byline.text() if byline else ""),"link":link_value(Node("a",{"href":home_path}),source),"primaryNav":{"targetItems":nav_items(main_nav.find("ul") if main_nav else None,source,"legacy:"+key+":primary:")},"utilityNav":{"targetItems":nav_items(utility.find("ul") if utility else None,source,"legacy:"+key+":utility:")}}
    header=component("AllianzLegacyHeader",header_fields,{},"shared:legacy:"+key+":header")
    footer_nav=by_id("footernav")
    group_menu=footer_nav.find(css="dropdown-menu") if footer_nav else None
    groups=[]
    for i,li in enumerate(group_menu.children() if group_menu else []):
        if li.tag!="li":continue
        title=li.find("h3");anchor=title.find("a") if title else None
        child_ul=next((n for n in li.children() if n.tag=="ul"),None)
        groups.append({"id":stable(f"legacy:{key}:footer:{i}"),"title":field_value(title.text() if title else ""),"link":link_value(anchor,source),"children":{"results":nav_items(child_ul,source,f"legacy:{key}:footer:{i}:")}})
    copyright_node=dom.find(css="copyright")
    footer=component("AllianzLegacyFooter",{"logo":logo,"body":field_value(""),"copyright":field_value(copyright_node.text() if copyright_node else ""),"primaryNav":{"targetItems":groups},"utilityNav":{"targetItems":[]},"socialNav":{"targetItems":[]}},{},"shared:legacy:"+key+":footer")
    return {"header":header,"footer":footer}


def breadcrumbs(dom,source,path):
    nav=dom.find(css="azl-breadcrumb")
    if nav is None:return None
    parent=nav.find("ol") or nav.find("ul") or nav
    entries=[]
    for i,li in enumerate(parent.children()):
        if li.tag!="li":continue
        anchor=li.find("a")
        text=anchor.text() if anchor else li.text()
        if not text:continue
        if anchor is None:anchor=Node("a",{"href":path},[text])
        entries.append({"id":stable(path+f":breadcrumb:{i}"),"title":field_value(text),"link":link_value(anchor,source),"children":{"results":[]}})
    return component("AllianzBreadcrumbs",{"heading":field_value(""),"primaryNav":{"targetItems":entries}},{},path+":breadcrumbs") if entries else None


def schema_errors(route, contract):
    errors = []
    for component_value in route["components"]:
        name = component_value["componentName"]
        specification = contract["components"].get(name)
        if not specification:
            errors.append({"path": route["path"], "reason": "Component absent from native contract", "componentName": name})
            continue
        fields = component_value["fields"]["data"]["datasource"]
        for field_name in list(fields):
            if field_name not in {"id", "children", *specification["fields"]} and fields[field_name].get("jsonValue", {}).get("value") == "":
                del fields[field_name]
        unknown_fields = sorted(set(fields) - {"id", "children"} - set(specification["fields"]))
        if unknown_fields:
            errors.append({"path": route["path"], "reason": "Extracted native fields absent from template contract", "componentName": name, "fields": unknown_fields})
        for key,value in component_value["params"].items():
            if key == "RenderingIdentifier":
                continue
            if value not in contract["parameters"].get(key, []):
                errors.append({"path": route["path"], "reason": "Rendering parameter requires explicit support", "componentName": name, "parameter": key, "value": value})
        child_spec = contract["childTemplates"].get(specification.get("children", ""))
        if child_spec:
            for child in fields.get("children", {}).get("results", []):
                unknown = sorted(set(child) - {"id"} - set(child_spec))
                if unknown:
                    errors.append({"path": route["path"], "reason": "Child fields absent from native template", "componentName": name, "fields": unknown})
    return errors


def find_asset_refs(value):
    result = []
    if isinstance(value, dict):
        if "asset" in value:
            result.append(value["asset"])
        for key, child in value.items():
            if key != "asset":
                result.extend(find_asset_refs(child))
    elif isinstance(value, list):
        for child in value:
            result.extend(find_asset_refs(child))
    return result


def write_json(name, value):
    (OUTPUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def media_queue(rows):
    """Original source-declared variants, one selected GET per unresolved resource."""
    queue = {}
    first_archetype = {}
    for row in rows:
        first_archetype.setdefault(row["archetype"],row["final_url"])
    for row in rows:
        source = row["final_url"]
        path = urlparse(source).path.lower().rstrip("/") or "/"
        priority = 0 if path in FIRST else 1 if first_archetype[row["archetype"]] == source else 2
        dom = DOM((ROOT / row["html_file"]).read_text()).root
        for image in dom.all("img"):
            raw = image.attrs.get("src", "")
            full = urljoin(source,raw)
            parsed = urlparse(full)
            if parsed.hostname != "www.allianzlife.com" or not re.search(r"\.(?:jpg|jpeg|gif|png|webp|avif|svg|ico)$",parsed.path,re.I):
                continue
            normalized = parsed.path.lower()
            if normalized in ASSET_BY_PATH:
                continue
            candidates = [{"url":full,"kind":"src","width":0}]
            for entry in image.attrs.get("srcset", "").split(","):
                match = re.match(r"^\s*(\S+)\s+(\d+)w\s*$",entry)
                if match:
                    candidate_url=urljoin(source,match[1])
                    candidate_parsed=urlparse(candidate_url)
                    if candidate_parsed.hostname == "www.allianzlife.com" and candidate_parsed.path.lower() == normalized:
                        candidates.append({"url":candidate_url,"kind":"srcset","width":int(match[2])})
            selected=max(candidates,key=lambda x:x["width"])
            existing=queue.get(normalized)
            if existing is None:
                queue[normalized]={"sourcePath":normalized,"selectedSourceUrl":selected["url"],"selectedWidth":selected["width"],"priority":priority,"sourcePages":[source],"declaredCandidates":candidates,"instructions":"One ordinary GET of selected original URL only. A GET403 ends this resource; do not try alternate candidates or parameters."}
            else:
                existing["priority"]=min(existing["priority"],priority)
                if source not in existing["sourcePages"]:existing["sourcePages"].append(source)
    return sorted(queue.values(),key=lambda x:(x["priority"],x["sourcePages"][0],x["sourcePath"]))


def media_availability():
    observations=collections.defaultdict(list)
    checks_path=ROOT/"asset_download_checks.json"
    if checks_path.exists():
        for row in json.loads(checks_path.read_text()):
            observations[urlparse(row["url"]).path.lower()].append({"url":row["url"],"method":row.get("method",""),"status":row.get("status"),"evidence":"asset_download_checks.json"})
    for manifest in sorted(ROOT.glob("*download*manifest*.json")):
        payload=json.loads(manifest.read_text())
        rows=payload.get("assets",payload.get("documents",[])) if isinstance(payload,dict) else payload
        if not isinstance(rows,list):continue
        for row in rows:
            url=row.get("url",row.get("selectedSourceUrl",row.get("sourceUrl",""))) if isinstance(row,dict) else ""
            if not isinstance(row,dict) or not url:continue
            observations[urlparse(url).path.lower()].append({"url":url,"method":row.get("method","GET"),"status":row.get("http_status",row.get("status")),"evidence":manifest.name})
    for asset in ASSET_AUDIT.values():
        if asset.get("sourcePath"):
            obs=observations.get(asset["sourcePath"],[])
            asset["observations"]=obs
            asset["availability"]="captured" if asset["status"]=="available" else "observed_http_403" if any(x["status"]==403 for x in obs) else "observed_redirect_or_error" if obs else "not_attempted"
            asset["kind"]="document" if re.search(r"\.(?:pdf|docx?|xlsx?|pptx?)$",asset["sourcePath"],re.I) else "raster" if re.search(r"\.(?:jpg|jpeg|png|gif|webp|avif|ico)$",asset["sourcePath"],re.I) else "source-vector-reference" if "dependentReferences" in asset else "other-media"


def build(routes_filter=None, strict=False):
    DOCUMENT_PATHS.update(urlparse(d["url"]).path.lower() for d in json.loads((ROOT / "document_inventory.json").read_text()))
    load_assets()
    inventory = json.loads((ROOT / "canonical_inventory.json").read_text())
    original_rows = {r["final_url"].lower().rstrip("/"): r for r in json.loads((ROOT / "page_inventory.json").read_text()) if r.get("status") == 200 and r.get("html_file")}
    rows = []
    for row in inventory:
        path = urlparse(row["final_url"]).path.lower().rstrip("/") or "/"
        if routes_filter is None or path in routes_filter:
            row = {**original_rows.get(row["final_url"].lower().rstrip("/"), {}), **row}
            rows.append(row)
    contract = json.loads((REPO / "authoring/allianz-life/content-contract.json").read_text())
    routes, gaps, manifest = {}, [], []
    for row in rows:
        route, route_gaps = parse_page(row)
        if route:
            source_dom = DOM((ROOT / row["html_file"]).read_text()).root
            body=source_dom.find("body")
            route["sourceShellFamily"]=route.get("shellFamily","")
            route["shellFamily"]="legacy" if source_dom.find("main") is None else "modern"
            route["sourceBodyId"]=body.attrs.get("id","") if body else ""
            route["sourceBodyClasses"]=[c for c in body.attrs.get("class","").split() if re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]*",c)] if body else []
            if route["shellFamily"]=="legacy":
                route["legacySharedKey"]="new-york" if body and body.has("new-york") else "allianz-life"
            else:
                crumb=breadcrumbs(source_dom,route["sourceUrl"],route["path"])
                if crumb:route["components"].insert(0,crumb)
            route_gaps.extend(schema_errors(route, contract))
            missing_assets = [a for a in find_asset_refs(route) if a["status"] != "available"]
            for anchor in source_dom.all("a"):
                raw_url = urljoin(route["sourceUrl"], anchor.attrs.get("href", ""))
                asset_ref = ASSET_AUDIT.get(raw_url)
                if asset_ref and asset_ref["status"] != "available":
                    missing_assets.append(asset_ref)
            route["needsReview"] = bool(route_gaps or missing_assets)
            route["assetIssues"] = list({a["sourceUrl"]: a for a in missing_assets}.values())
            route["sourceHtml"] = row["html_file"]
            route["aliases"] = row.get("aliases", [])
            routes[route["path"]] = route
            manifest.append({"path": route["path"], "sourceUrl": route["sourceUrl"], "sourceHtml": row["html_file"], "archetype": route["archetype"], "shellFamily": route.get("shellFamily", ""), "componentCount": len(route["components"]), "readyForImport": not route["needsReview"], "layoutIssues": len(route_gaps), "missingAssets": len(route["assetIssues"]), "visualQA": "not-run", "authoringQA": "not-run"})
        gaps.extend(route_gaps)
    home = next(r for r in inventory if urlparse(r["final_url"]).path == "/")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    shared=shared_components(home)
    shared["legacyShared"]={}
    for key in ["new-york","allianz-life"]:
        representative=next((r for r in inventory if r["shell_family"].startswith("Legacy") and ("/new-york" in urlparse(r["final_url"]).path)==(key=="new-york")),None)
        if representative:shared["legacyShared"][key]=legacy_shared_components(representative,key)
    content = {"schemaVersion": 1, "provenance": {"sourceHost": "www.allianzlife.com", "source": "locally saved public English canonical inventory", "notes": "Native editorial datasource fields; rich text contains localized semantic fragments only. Integrations disabled. No source scripts, page HTML dumps, credentials or production form actions. Visual and authoring verification remain independent."}, "shared": shared, "routes": routes}
    media_availability()
    write_json("media-download-queue.json",media_queue(rows))
    write_json("native-content.json", content)
    # Compact runtime navigation guard; absent/unrecovered/excluded source paths
    # remain explicit local service states instead of broken fixture navigation.
    public_route_index = {path: path for path in routes}
    for path, route in routes.items():
        for alias in route.get("aliases", []):
            parsed = urlparse(alias)
            if parsed.scheme == "https" and parsed.netloc == "www.allianzlife.com":
                alias_path = unquote(parsed.path).lower().rstrip("/") or "/"
                public_route_index.setdefault(alias_path, path)
    write_json("public-route-index.json", public_route_index)
    write_json("unsupported-layouts.json", gaps)
    write_json("import-manifest.json", manifest)
    write_json("media-manifest.json", {"assets": list(VECTORS.values()) + list(ASSET_AUDIT.values())})
    write_json("link-audit.json", list(LINK_AUDIT.values()))
    summary = json.loads((ROOT / "reconciled_summary.json").read_text())
    write_json("source-exceptions.json", {"blockedPublicCandidates": json.loads((ROOT / "blocked_public_candidates.json").read_text()), "serverErrors": summary["sitemap_server_error"], "excludedUrls": json.loads((ROOT / "excluded_urls.json").read_text()), "redirects": summary["sitemap_redirects"], "sourceCountReconciliation": summary})
    documents = []
    for document in json.loads((ROOT / "document_inventory.json").read_text()):
        url = document["url"]
        asset = ASSET_BY_PATH.get(urlparse(url).path.lower())
        documents.append({"id": stable("document:" + urlparse(url).path.lower()), "title": field_value(document["link_text"]), "description": field_value(""), "file": {"jsonValue": {"value": {"src": "/allianz-assets/" + asset["id"] + Path(asset["path"]).suffix if asset else ""}}}, "sourceUrl": field_value(url), "publishedDate": field_value(""), "sourcePages": document["source_pages"], "status": "available" if asset else "missing", "localPath": asset["path"] if asset else ""})
    write_json("documents.json", documents)
    stats = {"routes": len(routes), "components": sum(len(r["components"]) for r in routes.values()), "sourceExceptionCandidates": len(summary["sitemap_server_error"]) + len(json.loads((ROOT / "blocked_public_candidates.json").read_text())), "layoutIssues": len(gaps), "routesWithLayoutIssues": len({g["path"] for g in gaps}), "readyForImport": sum(m["readyForImport"] for m in manifest), "missingAssets": sum(a["status"] != "available" for a in ASSET_AUDIT.values()), "documents": len(documents), "missingDocuments": sum(d["status"] != "available" for d in documents), "vectors": len(VECTORS), "componentKinds": dict(collections.Counter(c["componentName"] for r in routes.values() for c in r["components"])), "output": str(OUTPUT / "native-content.json")}
    write_json("extraction-summary.json", stats)
    report = f"""# Allianz editorial extraction\n\n{stats['routes']} canonical routes are enumerated with {stats['components']} typed native datasource components. {stats['readyForImport']} routes pass the current extraction/import gate. No visual or authoring QA is implied.\n\nThe gate fails closed for source omissions, unsupported component/parameter contracts, legacy layouts, unverified interactions and missing media. `native-content.json` can contain partial routes for review; only routes with `readyForImport: true` in `import-manifest.json` may be imported. `--strict` exits nonzero when any selected route fails. No importer should use the number of extracted routes as a completed implementation count.\n\nThere are {stats['routesWithLayoutIssues']} routes with explicit layout/interaction issues, {stats['missingAssets']} unresolved image references, and {stats['missingDocuments']} unresolved documents. See the manifests for source URLs and affected routes. {stats['sourceExceptionCandidates']} public source candidates remain separately unavailable; no content has been invented for them.\n\nRich text is limited to semantic paragraphs, emphasis, headings, lists and tables within individually identified editorial components. Scripts, styles, arbitrary wrapper DOM, forms, input controls, embeds, SVG and event attributes cannot enter rich text. Approved source SVG icons are separately sanitized into standalone media. External, authenticated and contact destinations are inert.\n\nRe-run locally: `python3 scripts/allianz-life/extract_public_content.py --source-dir <public-site-directory>`; optional `--routes / /what-we-offer/annuities /customer-service-frequently-asked-questions --strict`. The source directory is authorized research input and is not a production dependency.\n"""
    (OUTPUT / "README.md").write_text(report)
    print(json.dumps(stats, indent=2))
    return 2 if strict and any(not m["readyForImport"] for m in manifest) else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=ROOT)
    parser.add_argument("--output-dir", type=Path, default=OUTPUT)
    parser.add_argument("--routes", nargs="+")
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    ROOT, OUTPUT = args.source_dir.resolve(), args.output_dir.resolve()
    SVG_DIR = OUTPUT / "media-vectors"
    raise SystemExit(build(set(args.routes) if args.routes else None, args.strict))
