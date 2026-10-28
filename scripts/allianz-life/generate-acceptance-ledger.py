#!/usr/bin/env python3
"""Reconcile explicit, secret-free migration evidence without contacting a service.

Reads only the allowlisted public-content/checkpoint files named below and Git's
HEAD. It does not read environment files, authentication stores or local tmp
evidence. Unknown values remain unknown; this is not an acceptance calculator.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import subprocess
import urllib.parse
import uuid

CHECKPOINT = "docs/migration-checkpoints/"
CONTENT = "examples/allianz-life/content/"
RECEIPTS = CHECKPOINT + "recovery-20261028/"
FACETS = ("delivery", "desktop", "mobile", "editor")


def canonical(value):
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme and parsed.hostname not in ("www.allianzlife.com", "allianz-life.vercel.app"):
        raise ValueError("Unexpected route origin")
    path = urllib.parse.unquote(parsed.path)
    return ("/" + path.lstrip("/")).rstrip("/").lower() or "/"


def guid(value):
    return str(uuid.UUID(value.strip("{}"))).upper()


def compact_evidence(ledger):
    """Pool file names and repeated references; retain each exact pointer once."""
    files = {path: f"f{i:02d}" for i, path in enumerate(sorted(ledger["inputs"]), 1)}
    inputs = {files[path]: {"path": path, **metadata} for path, metadata in ledger["inputs"].items()}
    references = set()

    def collect(value):
        if isinstance(value, dict):
            if set(value) in ({"path", "pointer"}, {"path", "section"}):
                key = "pointer" if "pointer" in value else "section"
                references.add((value["path"], key, value[key]))
            else:
                for item in value.values():
                    collect(item)
        elif isinstance(value, list):
            for item in value:
                collect(item)
    collect(ledger)
    ids = {reference: f"e{i:04d}" for i, reference in enumerate(sorted(references), 1)}

    def replace(value):
        if isinstance(value, dict):
            if set(value) in ({"path", "pointer"}, {"path", "section"}):
                key = "pointer" if "pointer" in value else "section"
                return ids[(value["path"], key, value[key])]
            return {key: replace(item) for key, item in value.items()}
        if isinstance(value, list):
            return [replace(item) for item in value]
        return value
    result = replace(ledger)
    result["inputs"] = inputs
    result["evidenceIndex"] = {ids[(path, key, value)]: {"input": files[path], key: value} for path, key, value in sorted(references)}
    details = collections.Counter()
    def count_details(value):
        if isinstance(value, dict):
            if isinstance(value.get("detail"), str):
                details[value["detail"]] += 1
            for item in value.values():
                count_details(item)
        elif isinstance(value, list):
            for item in value:
                count_details(item)
    count_details(result["routes"])
    detail_ids = {text: f"q{i:02d}" for i, text in enumerate(sorted(text for text, count in details.items() if count > 1), 1)}
    def replace_details(value):
        if isinstance(value, dict):
            if value.get("detail") in detail_ids:
                value["detailRef"] = detail_ids[value.pop("detail")]
            for item in value.values():
                replace_details(item)
        elif isinstance(value, list):
            for item in value:
                replace_details(item)
    replace_details(result["routes"])
    result["qualifications"] = {identifier: text for text, identifier in detail_ids.items()}
    population_codes = {
        "canonical_extraction_seed": "seed", "historical_source_candidate": "candidate",
        "public_structural_screen": "http_screen", "checkpoint_native_scope": "queued_scope",
        "checkpoint_native_recovery": "draft_recovery", "checkpoint_participant_navigation": "local_navigation",
        "checkpoint_public_content_observation": "public_text", "checkpoint_recomposition_proposal": "recomposition",
        "current_english_native_inventory": "native_en",
    }
    for row in result["routes"]:
        for key in ("title", "archetype", "shellFamily"):
            row.pop(key, None)  # Available from hashed seed evidence; not needed in the acceptance join.
        row["populations"] = sorted(population_codes[key] for key in row["populations"])
    result["populationDefinitions"] = {code: name for name, code in population_codes.items()}
    return result


class Ledger:
    def __init__(self, source, overrides=None):
        self.source = source
        self.overrides = overrides or {}
        self.inputs = {}
        self.rows = {}
        self.identity_conflicts = []

    def read(self, relative):
        path = self.overrides.get(relative, self.source / relative)
        raw = path.read_bytes()
        self.inputs[relative] = {"sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}
        return json.loads(raw) if relative.endswith(".json") else raw.decode("utf-8")

    def ref(self, file, pointer=""):
        if file.endswith(".md"):
            return {"path": file, "section": pointer}
        return {"path": file, "pointer": pointer}

    def row(self, route, population=None, evidence=None):
        route = canonical(route)
        if route not in self.rows:
            self.rows[route] = {
                "route": route,
                "populations": [],
                "title": None,
                "archetype": None,
                "shellFamily": None,
                "native": {"pageId": None, "pageIdEvidence": [], "pageRevisionObservations": [], "currentInventoryPresence": "unknown"},
                "delivery": self.unknown("No current content-delivery acceptance receipt has been reconciled."),
                "desktop": self.unknown("No route-specific desktop acceptance receipt has been reconciled."),
                "mobile": self.unknown("No route-specific mobile acceptance receipt has been reconciled."),
                "editor": self.unknown("No complete native Page Builder edit/save acceptance has been reconciled."),
                "observations": [],
                "publicationRestrictions": [],
                "evidence": [],
                "wholePageAccepted": None,
            }
        row = self.rows[route]
        if population and population not in row["populations"]:
            row["populations"].append(population)
        if evidence and evidence not in row["evidence"]:
            row["evidence"].append(evidence)
        return row

    @staticmethod
    def unknown(detail):
        return {"status": "unknown", "evidence": []}

    def state(self, row, facet, status, detail, evidence, **extra):
        row[facet] = {"status": status, "detail": detail, "evidence": [evidence], **extra}

    def identity(self, row, page, evidence, revision=None, revision_kind="page_revision"):
        page = guid(page)
        if row["native"]["pageId"] not in (None, page):
            self.identity_conflicts.append({"route": row["route"], "existing": row["native"]["pageId"], "other": page, "evidence": evidence})
        else:
            row["native"]["pageId"] = page
        if evidence not in row["native"]["pageIdEvidence"]:
            row["native"]["pageIdEvidence"].append(evidence)
        if revision:
            observation = {"revision": guid(revision), "kind": revision_kind, "evidence": evidence}
            if observation not in row["native"]["pageRevisionObservations"]:
                row["native"]["pageRevisionObservations"].append(observation)

    def observation(self, row, kind, detail, evidence, **extra):
        row["observations"].append({"kind": kind, "detail": detail, "evidence": evidence, **extra})


def generate(source, current_inventory, representative_readback=None, source_commit=None):
    inventory_file = RECEIPTS + "allianz-native-pages-en-normalized-20261028.json"
    readback_file = RECEIPTS + "marketer-representative-readback-20261028.json"
    overrides = {inventory_file: current_inventory}
    if representative_readback:
        overrides[readback_file] = representative_readback
    l = Ledger(source, overrides)
    file = CONTENT + "native-content.json"
    native = l.read(file)["routes"]
    for route, data in native.items():
        row = l.row(route, "canonical_extraction_seed", l.ref(file, "/routes/" + route.replace("~", "~0").replace("/", "~1")))
        row.update({"title": data.get("title"), "archetype": data.get("archetype"), "shellFamily": data.get("shellFamily")})
    assert len(native) == 357, "Seed changed: inspect scope before updating the documented denominator"

    file = CONTENT + "import-manifest.json"
    manifest = l.read(file)
    assert len(manifest) == len(native)
    assert {canonical(x["path"]) for x in manifest} == set(l.rows)
    for i, item in enumerate(manifest):
        l.row(item["path"])["historicalExtraction"] = {"readyForImport": item.get("readyForImport"), "visualQA": item.get("visualQA"),
                                                        "authoringQA": item.get("authoringQA"), "evidence": l.ref(file, f"/{i}")}

    file = CONTENT + "public-route-index.json"
    index = l.read(file)
    aliases = [{"route": canonical(p), "canonicalDestination": canonical(d), "evidence": l.ref(file, "/" + p.replace("~", "~0").replace("/", "~1"))}
               for p, d in index.items() if canonical(p) != canonical(d)]
    assert len(index) == 360 and len(aliases) == 3
    assert all(x["canonicalDestination"] in native for x in aliases)

    file = CONTENT + "source-exceptions.json"
    exceptions = l.read(file)
    for key in ("blockedPublicCandidates", "serverErrors"):
        for i, url in enumerate(exceptions[key]):
            row = l.row(url, "historical_source_candidate", l.ref(file, f"/{key}/{i}"))
            l.observation(row, "historical_source_availability", "Historical source availability classification; later recovery evidence may supersede it.", l.ref(file, f"/{key}/{i}"),
                          classification=key)

    # Structural screen is recorded as an observation, never desktop/mobile/editor acceptance.
    file = CHECKPOINT + "PUBLIC-322-POST-NAVIGATION-LINK-SCREEN-20261027.json"
    screen = l.read(file)
    assert len(screen["rows"]) == screen["population"] == 322
    for i, item in enumerate(screen["rows"]):
        row = l.row(item["route"], "public_structural_screen", l.ref(file, f"/rows/{i}"))
        l.observation(row, "public_structural_screen", "Historical HTTP/anchor inventory only; HTTP 200 does not establish correct content or visual acceptance.", l.ref(file, f"/rows/{i}"),
                      recordedUTC=screen["checkedUTC"], http=item["http"], inherited404Targets=item["inherited404Targets"],
                      unresolvedLocalFragments=item["unresolvedLocalFragments"])
        l.state(row, "delivery", "structural_http_only", "Recorded HTTP response; published content parity and current delivery remain unverified.", l.ref(file, f"/rows/{i}"),
                recordedUTC=screen["checkedUTC"], http=item["http"])

    file = CHECKPOINT + "EXACT-FOUR-SCOPE-DRAFT-PUBLICATION-QUEUE-20261027.json"
    queue = l.read(file)
    queue_ids = set()
    item_scopes = []
    for i, scope in enumerate(queue["scopes"]):
        ref = l.ref(file, f"/scopes/{i}")
        row = l.row(scope["route"], "checkpoint_native_scope", ref)
        l.identity(row, scope["pageId"], ref)
        l.state(row, "delivery", "draft_queue_unpublished", "Exact prepared page/data scope; no publication or live parity claimed. Fresh revisions, eligibility and target readback required.", ref)
        l.observation(row, "prepared_publication_scope", scope["name"], ref, explicitItemCount=len(scope["pageAndDataItemIds"]))
        item_scopes.append({"name": scope["name"], "route": row["route"], "state": "prepared_unpublished_recheck_required",
                            "itemIds": [guid(x) for x in scope["pageAndDataItemIds"]], "evidence": ref,
                            "qualification": "Exact historical scope, not permission to execute; preserve PDF holds and recheck revisions/eligibility/jobs/target."})
        row["publicationRestrictions"].append("Preserve PDF-specific unpublished directions; no implicit related-item/subitem expansion.")
        queue_ids.update(guid(x) for x in scope["pageAndDataItemIds"])
    assert len(queue_ids) == 110

    file = CHECKPOINT + "DEPENDENT-DESTINATION-PARENT-CENSUS-20261027.json"
    census = l.read(file)
    for i, item in enumerate(census["items"]):
        route = canonical(item["route"])
        if route in l.rows:
            l.identity(l.row(route), item["item"]["id"], l.ref(file, f"/items/{i}/item"))
        for j, child in enumerate(item["item"].get("children", {}).get("results", [])):
            path = route + "/" + child["name"]
            # Bind known route rows only; a child name alone does not prove an in-scope source page.
            if canonical(path) in l.rows:
                l.identity(l.row(path), child["id"], l.ref(file, f"/items/{i}/item/children/results/{j}"))

    file = CHECKPOINT + "THREE-NEW-NATIVE-PAGES-CREATED-REGISTRY-20261027.json"
    sales = l.read(file)
    sales_rows = {}
    for key, item in sales["pages"].items():
        ref = l.ref(file, "/pages/" + key)
        row = l.row("/for-financial-professionals/life-sales-tools/" + item["slug"], "checkpoint_native_recovery", ref)
        sales_rows[guid(item["id"])] = row
        l.identity(row, item["id"], ref, item.get("layoutRevision"), "page_layout_revision")
        l.state(row, "delivery", "explicitly_held_unpublished", "Native page, PDFs and associated media remain unpublished by instruction.", ref)
        for facet in ("desktop", "mobile"):
            l.state(row, facet, "qualified_local_draft", "Source-backed native composition locally checked at 1024/370; thumbnail/document and exact geometry acceptance incomplete.", ref,
                    viewport=1024 if facet == "desktop" else 370)
        l.state(row, "editor", "content_editor_readback_only", "Saved/reopened fields and layout; complete Page Builder edit/save acceptance unknown.", ref)
        row["publicationRestrictions"].append("EXPLICIT HOLD: page, PDFs and associated media must remain unpublished.")

    file = CHECKPOINT + "THREE-SALES-TOOLS-SHARED-NATIVE-NAVIGATION-20261027.json"
    nav = l.read(file)
    for i, layout in enumerate(nav["layouts"]):
        l.identity(sales_rows[guid(layout["page"])], layout["page"], l.ref(file, f"/layouts/{i}"), layout["revision"], "page_layout_revision")
    for row in sales_rows.values():
        l.observation(row, "qualified_navigation", "Shared native navigation plus local 1024/370 menu/keyboard checks; unpublished.", l.ref(file, "/localQA"))

    file = CHECKPOINT + "LIFETIME-NATIVE-INTEGRATION-ACTIVE-20261027.json"
    lifetime = l.read(file)
    contract = lifetime["nativeContract"]
    route = "/what-we-offer/annuities/fixed-index-annuities/my-lifetime-income-plus/calculator"
    row = l.row(route, "checkpoint_native_recovery", l.ref(file, "/nativeContract"))
    l.identity(row, contract["pageId"], l.ref(file, "/nativeContract/pageRevision"), contract["pageRevision"])
    l.identity(row, contract["pageId"], l.ref(file, "/nativeContract/finalLayoutRevision"), contract["finalLayoutRevision"], "page_layout_revision")
    l.state(row, "delivery", "explicitly_held_unpublished", "Lifetime Income calculator and associated drafts/PDFs remain unpublished.", l.ref(file, "/publication"))
    for facet in ("desktop", "mobile"):
        l.state(row, facet, "qualified_local_draft", "Original engine/workbook: four reference cases/496 cells; local resize/input preservation and mobile keyboard scrolling pass. Not exhaustive financial or whole-page acceptance.",
                l.ref(file, "/mobileScrollFollowup"), viewport=1280 if facet == "desktop" else 370)
    l.state(row, "editor", "failed_heading_activation", "Native engine interaction sample passed; heading activation normalized authored markup. Exact originals restored; native edit/save acceptance remains failed.", l.ref(file, "/nativeAuthoringFollowup"))
    row["publicationRestrictions"].append("EXPLICIT HOLD: calculator page and associated restricted PDFs/media remain unpublished.")
    prefix = "/what-we-offer/annuities/fixed-index-annuities/"
    for i, path in enumerate(lifetime["participantNavigationQA"]["routes"]):
        participant = l.row(prefix + path, "checkpoint_participant_navigation", l.ref(file, f"/participantNavigationQA/routes/{i}"))
        l.observation(participant, "local_navigation", "Clicked from draft calculator and Back returned; same tab, one H1, no datasource prompts. Not full page acceptance.", l.ref(file, "/participantNavigationQA"))
    # Bind the participant IDs only after their exact route observations have been added.
    for i, item in enumerate(census["items"]):
        route = canonical(item["route"])
        for j, child in enumerate(item["item"].get("children", {}).get("results", [])):
            path = canonical(route + "/" + child["name"])
            if path in l.rows:
                l.identity(l.row(path), child["id"], l.ref(CHECKPOINT + "DEPENDENT-DESTINATION-PARENT-CENSUS-20261027.json", f"/items/{i}/item/children/results/{j}"))

    file = CHECKPOINT + "NEWSROOM-THREE-ARTICLE-DRAFT-RECOVERY-20261027.json"
    news = l.read(file)
    for i, article in enumerate(news["scope"]):
        ref = l.ref(file, f"/scope/{i}")
        row = l.row(article["route"], "checkpoint_native_recovery", ref)
        l.identity(row, article["page"], ref)
        l.state(row, "delivery", "draft_queue_unpublished", "Saved native article/disclosure scope remains unpublished; two new routes were public 404, OCTI had datasource prompts.", ref)
        for facet in ("desktop", "mobile"):
            l.state(row, facet, "qualified_local_draft", "Source article/disclosure content, single H1, no prompts/overflow and same-tab navigation locally checked at 1280/370. No live acceptance.", l.ref(file, "/qa"),
                    viewport=1280 if facet == "desktop" else 370)
        l.state(row, "editor", "content_editor_readback_only", "Saved native fields/SDK metadata verified; known heading activation issue remains open.", l.ref(file, "/qa/nativeWysiwyg"))

    file = CHECKPOINT + "FORTUNE-NATIVE-LAYOUT-OPERATOR-SUPPLEMENT-20261028.json"
    fortune = l.read(file)
    row = l.row(fortune["route"], "checkpoint_native_recovery", l.ref(file, "/route"))
    l.identity(row, fortune["page"], l.ref(file, "/pageRevision"), fortune["pageRevision"])
    l.state(row, "delivery", "draft_queue_unpublished", "Draft native layout corrected; public still uses the older generic layout until publication.", l.ref(file, "/publication"))
    for facet in ("desktop", "mobile"):
        l.state(row, facet, "qualified_local_draft", "Source-exact article/layout, single H1, no disabled anchors/prompts/overflow; native ranking new-tab click passed. Not live acceptance.", l.ref(file, "/qa"),
                viewport=1280 if facet == "desktop" else 370)
    l.state(row, "editor", "content_editor_readback_only", "Native layout saved and read back; full Page Builder acceptance unknown.", l.ref(file, "/savedRepair"))

    file = CHECKPOINT + "RIDER-CRITERIA-NATIVE-DRAFT-RECOVERY-20261028.json"
    criteria = l.read(file)
    row = l.row(criteria["route"], "checkpoint_native_recovery", l.ref(file, "/route"))
    page = next(x["id"] for x in criteria["items"] if x["name"] == "Page")
    l.identity(row, page, l.ref(file, "/pageRevision"), criteria["pageRevision"])
    l.state(row, "delivery", "draft_incomplete_unpublished", "Fourteen-item native scope is not publication ready: missing Hero photograph and remaining authoring gates.", l.ref(file, "/publication"))
    for facet in ("desktop", "mobile"):
        l.state(row, facet, "qualified_local_draft_missing_hero", "41/41 text blocks, three exact icons, cards/fragments and no overflow checked at 1280/370; Hero photograph missing, whole-page visual acceptance incomplete.", l.ref(file, "/qa"),
                viewport=1280 if facet == "desktop" else 370)
    l.state(row, "editor", "content_editor_readback_only", "Page validation/reopen passed; full native Page Builder acceptance explicitly false.", l.ref(file, "/qa/fullNativePageBuilderAcceptance"))

    file = CHECKPOINT + "INDEPENDENT-ACCEPTANCE-LEAD-RECONCILIATION-20261028.json"
    reconciliation = l.read(file)
    insights = {
        "participantsUseOfAI": "/what-we-offer/annuities/fixed-index-annuities/lifetime-income-plus/insights-and-education/participants-use-of-ai",
        "retirementIncomeAffordability": "/what-we-offer/annuities/fixed-index-annuities/lifetime-income-plus/insights-and-education/retirement-income-belongs-in-affordability-conversation",
    }
    # Exact URLs come from the preceding lead receipt, paragraph qualification from this newer receipt.
    leads_file = CHECKPOINT + "PUBLIC-NEW-INTERNAL-DESTINATION-LEADS-20261027.json"
    leads = l.read(leads_file)
    lead_paths = {canonical(x["path"]) for x in leads["rows"]}
    for key, path in insights.items():
        assert path in lead_paths
        row = l.row(path, "checkpoint_public_content_observation", l.ref(leads_file, "/rows"))
        l.state(row, "delivery", "qualified_public_text_only", "All source paragraphs present, matching H1, no visible 404/prompts; old serialized fallback false positive resolved. No complete visual/interaction acceptance.",
                l.ref(file, "/twoInsightArticles/" + key), sourceParagraphs=reconciliation["twoInsightArticles"][key]["sourceParagraphs"])
    newsroom = l.row("/about/newsroom")
    l.state(newsroom, "mobile", "qualified_public_partial", "Leading 370px source/public positions match; later 40px feed difference is qualified by unpublished releases. Not whole-page acceptance.", l.ref(file, "/newsroom370"), viewport=370)

    file = CHECKPOINT + "NEWSROOM-PUBLIC-LINKS-AND-TILE-PARITY-20261027.json"
    tiles = l.read(file)
    l.observation(newsroom, "public_tile_geometry", "Two tile orientations/widths matched at desktop 1024 and mobile 370; preceding sections/whole page not accepted.", l.ref(file, "/matchedTileGeometry"))
    l.state(newsroom, "desktop", "qualified_public_partial", "Two tile orientations/widths matched at 1024; source links checked. Whole page not accepted.", l.ref(file, "/matchedTileGeometry/desktop"), viewport=1024)

    file = CHECKPOINT + "LIFE-CALCULATOR-INCOMPLETE-SOURCE-CONTRACT-20261027.json"
    life = l.read(file)
    row = l.row(life["sourcePage"])
    l.state(row, "delivery", "implementation_incomplete", "Distinct Life Insurance calculator: 17 inputs/five stages/source-equivalent results unimplemented. Lifetime Income does not close this gate.", l.ref(file, "/status"))
    l.observation(row, "source_contract", "Source implementation and required acceptance documented; no financial formulas invented and no migrated result equivalence established.", l.ref(file, "/requiredAcceptance"))

    file = CHECKPOINT + "RILA-RATE-INTEGRATION-BOUNDARY-20261028.json"
    l.read(file)
    for path in ("/what-we-offer/annuities/registered-index-linked-annuities/rila-rates-center", "/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-nf/rila-rates-center-infp"):
        row = l.row(path)
        ref = l.ref(file, "/nextGate")
        l.state(row, "delivery", "missing_native_page_public_404", "Exact draft path absent and public 404. Unchanged rate client mounts in disposable proof; service loading/production integration unverified.", l.ref(CHECKPOINT + "INDEPENDENT-ACCEPTANCE-LEAD-RECONCILIATION-20261028.json", "/twoRilaRatesRoutes"))
        l.observation(row, "integration_gate", "Supported request-status/origin/configuration contract required. Localhost selects UAT; previous production-only proof was mismatched, not a proven CORS/authentication diagnosis.", ref)

    file = CHECKPOINT + "REMAINING-OPERATOR-AND-ACCEPTANCE-GATES.md"
    gates = l.read(file)
    for route, page in re.findall(r"\| `(/[^`]+)` \| `([0-9A-F-]{36})` \|", gates):
        row = l.row(route, "checkpoint_recomposition_proposal", l.ref(file, "Delivery recomposition: two separate prepared scopes"))
        l.identity(row, page, l.ref(file, "Delivery recomposition: two separate prepared scopes"))
        l.state(row, "delivery", "saved_delivery_mismatch_recomposition_proposed", "Six page-only FULL recomposition proposals are unexecuted tests. Previous skipped Smart jobs retained; no unchanged retry or implicit scope expansion.", l.ref(file, "Delivery recomposition: two separate prepared scopes"))

    file = CHECKPOINT + "PUBLIC-QA-NY-ARTICLE-AND-NAVIGATION-REPAIR-20261027.json"
    publicqa = l.read(file)
    rate = publicqa["cms360Rate"]
    row = l.row(rate["source"])
    l.identity(row, rate["page"], l.ref(file, "/cms360Rate/page"))
    l.state(row, "delivery", "saved_rate_update_unpublished", "Current-rate datasource heading corrected in draft, no job submitted; fetch fresh official source before publication. Datasource revision is not page revision.", l.ref(file, "/cms360Rate"))
    l.observation(row, "datasource_revision", "MVA reference-rate item revision only.", l.ref(file, "/cms360Rate/revision"), itemId=rate["item"], revision=rate["revision"])

    file = CHECKPOINT + "NY-CARD-ICONS-20261027.json"
    l.read(file)
    path = "/new-york/annuities/registered-index-linked-annuities/index-advantage-plus-new-york"
    row = l.row(path)
    for facet in ("desktop", "mobile"):
        l.state(row, facet, "qualified_local_partial", "Normal localhost runtime checked at 1024/370; two icon values remain empty in public delivery, so icon slice is not live accepted.", l.ref(file, "/runtimeAcceptance"), viewport=1024 if facet == "desktop" else 370)
    l.observation(row, "publication_jobs", "Two item jobs completed; page job skipped. Public icon payload still empty. Do not recreate items or replay unchanged jobs.", l.ref(file, "/publication"))

    file = CHECKPOINT + "CURRENT-CONSOLIDATED-HANDOFF-20261028.md"
    l.read(file)

    # Join fresh supported MCP inventory by canonical path only; native presence is
    # distinct from source scope, published delivery and every acceptance facet.
    target_candidates = set(l.rows)
    inventory = l.read(inventory_file)
    native_paths = [canonical(x["path"]) for x in inventory["pages"]]
    native_ids = [guid(x["id"]) for x in inventory["pages"]]
    assert len(native_paths) == len(set(native_paths)) == inventory["pageCount"] == 382
    assert len(native_ids) == len(set(native_ids)) == 382
    for i, item in enumerate(inventory["pages"]):
        path = canonical(item["path"])
        row = l.row(path, "current_english_native_inventory", l.ref(inventory_file, f"/pages/{i}"))
        l.identity(row, item["id"], l.ref(inventory_file, f"/pages/{i}"))
        row["native"]["currentInventoryPresence"] = "present"
        if path not in target_candidates:
            row["scopeClassification"] = "native_only_extra_outside_reconciled_source_candidates"
    for path in target_candidates - set(native_paths):
        l.row(path)["native"]["currentInventoryPresence"] = "absent_exact_path_alias_status_unknown"
    if representative_readback:
        readback = l.read(readback_file)
        by_id = {r["native"]["pageId"]: r for r in l.rows.values() if r["native"]["pageId"]}
        for i, receipt in enumerate(readback["receipts"]):
            if receipt["isError"]:
                continue
            page_id = guid(receipt["requestedItemId"])
            assert page_id in by_id
            item = next(x for x in receipt["content"] if guid(x["itemId"]) == page_id)
            field_names = item.get("fieldNames", list(item.get("fields", {})))
            revision_fields = [k for k in field_names if k.lower().strip("_ ") == "revision"]
            assert not revision_fields, "Revision now exposed: reconcile it explicitly instead of silently ignoring it"
            by_id[page_id]["native"]["representativeReadback"] = {
                "recordedUtc": readback["recordedUtc"], "englishVersion": item.get("version"),
                "workflow": item.get("workflow"), "revisionExposed": False,
                "qualification": "Successful item read, not current revision or visual/editor acceptance.",
                "evidence": l.ref(readback_file, f"/receipts/{i}"),
            }

    # Historical canonical-source failures remain as candidates, not silent exclusions.
    source_candidates = {canonical(x) for k in ("blockedPublicCandidates", "serverErrors") for x in exceptions[k]}
    rows = []
    for route in sorted(l.rows):
        row = l.rows[route]
        if "scopeClassification" not in row:
            row["scopeClassification"] = ("canonical_source_seed" if route in native else
                                          "historical_source_candidate_review" if route in source_candidates else
                                          "later_checkpoint_source_route")
        row["populations"].sort()
        row["publicationRestrictions"] = sorted(set(row["publicationRestrictions"]))
        rows.append(row)
    assert len(rows) == len({r["route"] for r in rows})
    assert not l.identity_conflicts, l.identity_conflicts
    id_routes = collections.defaultdict(list)
    for row in rows:
        if row["native"]["pageId"]:
            id_routes[row["native"]["pageId"]].append(row["route"])
    duplicate_ids = {i: rs for i, rs in id_routes.items() if len(rs) > 1}
    assert not duplicate_ids, duplicate_ids
    source_commit = subprocess.run(["git", "rev-parse", "--verify", (source_commit or "HEAD") + "^{commit}"], cwd=source, check=True, text=True, capture_output=True).stdout.strip()
    summary = {
        "sourceCommit": source_commit,
        "canonicalExtractionSeed": len(native),
        "historicalSourceCandidatesOutsideSeed": len(source_candidates - set(native)),
        "laterCheckpointRoutesOutsideSeedAndHistoricalCandidates": sorted(target_candidates - set(native) - source_candidates),
        "reconciledSourceRouteCandidates": len(target_candidates),
        "reconciledRouteCandidateRows": len(rows),
        "currentEnglishNativePages": inventory["pageCount"],
        "currentInventoryRecordedUtc": inventory["recordedUtc"],
        "sourceCandidatesWithExactCurrentNativeMatch": len(target_candidates & set(native_paths)),
        "sourceCandidatesWithoutExactCurrentNativeMatch": sorted(target_candidates - set(native_paths)),
        "nativeOnlyExtrasOutsideSourceCandidates": sorted(set(native_paths) - target_candidates),
        "seedRoutesWithExactCurrentNativeMatch": len(set(native) & set(native_paths)),
        "publicRouteIndexKeys": len(index),
        "redirectAliasesExcludedAsSeparatePages": len(aliases),
        "pageIdsExplicitlyBound": len(id_routes),
        "rowsWithRecordedPageRevision": sum(bool(r["native"]["pageRevisionObservations"]) for r in rows),
        "preparedFourScopeUniqueItems": len(queue_ids),
        "facetStatusCounts": {facet: dict(sorted(collections.Counter(r[facet]["status"] for r in rows).items())) for facet in FACETS},
        "duplicateRouteRows": 0,
        "duplicatePageIdsAcrossRoutes": duplicate_ids,
        "identityConflicts": l.identity_conflicts,
        "acceptedPageCount": None,
        "overallCompletionPercentage": None,
        "qualification": "Finite evidence universe, not a complete/current source-site census or accepted-page denominator. Historical candidates and later observations are tagged separately. All acceptance states remain bounded by their evidence; unknown is not pass or fail.",
        "liveStateRechecked": False,
        "externalRequests": 0,
        "sourceFilesModified": False,
    }
    ledger = {"schemaVersion": 1, "sourceCommit": source_commit,
              "method": "Explicit offline adapters for allowlisted repository evidence; no inferred page IDs, no datasource revisions substituted for page revisions, no status inferred from builds.",
              "qualification": summary["qualification"], "inputs": dict(sorted(l.inputs.items())),
              "fieldPolicies": {"unknown": "No facet-specific acceptance receipt reconciled; not a failure or an absence claim.",
                                "historicalExtraction": "Import readiness and stale not-run QA fields are extraction evidence, not current acceptance.",
                                "pageRevisions": "Historical observations only. No datasource revision is substituted; fresh native inventory/readback does not expose page revisions.",
                                "wholePageAccepted": "Always unknown here; partial checks, HTTP, build counts and draft readbacks never establish full acceptance."},
              "globalGates": [{"detail": "Native heading activation and complete Page Builder edit/save acceptance remain unresolved; no route-specific pass inferred from builds or Content Editor readback.",
                                "evidence": l.ref(CHECKPOINT + "CURRENT-CONSOLIDATED-HANDOFF-20261028.md", "Held actions and unfinished acceptance")}],
              "globalRestrictions": ["Staged source PDFs, the three sales-tool pages, their media and calculator drafts retain their explicit unpublished direction.",
                                     "No automatic publication, related-item expansion or acceptance calculation is performed by this tool.",
                                     "Held/denied/uncertain actions require their existing action-specific recovery and review; this ledger is read-only evidence."],
              "preparedFourPublicationScopes": item_scopes,
              "redirectAliases": sorted(aliases, key=lambda x: x["route"]), "summary": summary, "routes": rows}
    return compact_evidence(ledger), summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", "--source-repo", dest="source_repo", type=Path, required=True)
    parser.add_argument("--current-inventory", type=Path, help="Default: repo-relative recovery-20261028 normalized inventory receipt")
    parser.add_argument("--representative-readback", type=Path, help="Optional receipt; defaults to matching repo-relative recovery receipt when present")
    parser.add_argument("--source-commit", help="Pin the reviewed source checkpoint for reproducible receipts after a documentation commit")
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    source = args.source_repo.resolve()
    current_inventory = args.current_inventory or source / RECEIPTS / "allianz-native-pages-en-normalized-20261028.json"
    representative = args.representative_readback
    if representative is None:
        candidate = source / RECEIPTS / "marketer-representative-readback-20261028.json"
        if candidate.is_file():
            representative = candidate
    ledger, summary = generate(source, current_inventory, representative, args.source_commit)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for filename, data in (("route-acceptance-ledger.json", ledger), ("route-acceptance-summary.json", summary)):
        options = {"separators": (",", ":")} if filename == "route-acceptance-ledger.json" else {"indent": 2}
        (args.output_dir / filename).write_text(json.dumps(data, ensure_ascii=False, **options) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
