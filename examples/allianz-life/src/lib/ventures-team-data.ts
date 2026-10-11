import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';

/** Existing identities verified against native authoring reads, 2026-10-10. */
export const VENTURES_TEAM_PAGE_ID = '732f5bb8-6158-45ab-925a-3bf0decb954b';
export const VENTURES_BIOGRAPHY_BASE_TEMPLATE_ID = 'ad3a7fa4-b3e7-4578-9a76-1fefa535485c';
export const VENTURES_BIOGRAPHY_TEMPLATE_ID = '57724bbd-9f79-4c8d-90a8-c9d7fa17760a';
/** Native Collection profiles field verified by the CMS writer, 2026-10-10. */
export const VENTURES_TEAM_PROFILES_FIELD_ID = '33c1daa9-7214-4f94-8e5b-c20dedc57d33';
export const VENTURES_CANONICAL_FIELD_IDS = {
  name: 'a0ede426-b810-43df-b1f7-e132966fc3b0',
  role: 'a1d15662-2f37-483e-b096-61d9994b982f',
  portrait: '70fb20ee-5bdb-48ea-bce5-5b4abca8f538',
} as const;
/** Native Listing fields verified by the CMS writer, 2026-10-10. */
export const VENTURES_TEAM_LISTING_FIELD_IDS = {
  roleMode: '0ce2e70e-5abd-4819-9e57-2b422cf08615',
  role: '1ba806dc-2db9-4052-bd88-59d8508f58a5',
  summary: '8c25bd44-db7a-4454-8c8f-ad7b1d3eb790',
  focus: 'bc3cebb8-418b-4a96-a8bb-ae3398274ca9',
  bioLinkText: 'cd5b6979-c8cf-4cb1-add5-101bc3bfe2f6',
  socialLink: '4e447395-1f2d-4dcd-9b2b-0973809ff347',
} as const;
/** Names document the authoring contract; runtime queries use verified field identities. */
export const VENTURES_TEAM_FIELD_NAMES = {
  profiles: 'profiles', roleMode: 'teamListingRoleMode',
  role: 'teamListingRole', summary: 'teamListingSummary', focus: 'teamListingFocus',
  bioLinkText: 'teamBioLinkText', socialLink: 'teamSocialLink',
} as const;
const VENTURES_URL = '/about/ventures';
const SITE_HOME_PATH = '/sitecore/content/allianz/allianz-life/Home';
export type VenturesTeamText = { jsonValue: Field<string> };
export type VenturesTeamImage = { jsonValue: ImageField };
export type VenturesTeamLink = { jsonValue: LinkField };
export type VenturesTeamPerson = {
  pageId: string; biographyId: string; href: string;
  name: VenturesTeamText; role?: VenturesTeamText; roleFormat: 'text' | 'rich-text';
  portrait: VenturesTeamImage; summary: VenturesTeamText; focus: VenturesTeamText;
  bioLinkText: VenturesTeamText; socialLink: VenturesTeamLink;
};
export type AutomaticVenturesTeam = {
  complete: boolean; status: 'ready' | 'unavailable'; items: VenturesTeamPerson[];
  error?: 'unbound' | 'invalid-scope' | 'unavailable';
};
/** NEW template IDs must come from the CMS writer; the existing Biography page template stays intact. */
export type VenturesTeamBindings = { datasourceTemplateId: string; listingTemplateId: string; biographyPageTemplateId?: string };
export type VenturesTeamScope = { rootId: string; datasourceId: string; language: string };
export type VenturesTeamGetData = <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) => Promise<T>;
type NativeField = { jsonValue?: unknown };
export type VenturesTeamPage = {
  id: string; path: string; url: { path: string }; template?: { id: string }; rendered?: unknown;
};
export type VenturesTeamListing = {
  id: string; path: string; template?: { id: string }; parent?: { name: string; parent?: { id: string } };
  roleMode?: NativeField; listingRole?: NativeField; summary?: NativeField; focus?: NativeField;
  bioLinkText?: NativeField; socialLink?: NativeField;
};
export type VenturesTeamBiography = {
  id: string; path: string; template?: { id: string }; parent?: { name: string; parent?: { id: string } };
  name?: NativeField; role?: NativeField; portrait?: NativeField;
};
export type VenturesTeamScopeResponse = {
  root?: { id: string; path: string; url: { path: string } };
  datasource?: { id: string; path: string; template?: { id: string }; parent?: { name: string; parent?: { id: string } }; profiles?: NativeField };
};
export type VenturesTeamCollection = {
  complete: true; scope: VenturesTeamScope; biographyPageTemplateId: string; listingTemplateId: string;
  selectedIds: string[]; profiles: Array<{ page: VenturesTeamPage; biography: VenturesTeamBiography; listing: VenturesTeamListing }>;
};

export function normalizeVenturesTeamId(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}|\{[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\})$/i.test(value)) return undefined;
  return value.replace(/[{}-]/g, '').toLowerCase();
}
function checkedId(value: unknown): string {
  const result = normalizeVenturesTeamId(value);
  if (!result) throw new Error('Invalid Ventures team identity');
  return result;
}
export function validVenturesTeamBindings(value?: VenturesTeamBindings): value is VenturesTeamBindings {
  return Boolean(value && normalizeVenturesTeamId(value.datasourceTemplateId) && normalizeVenturesTeamId(value.listingTemplateId) &&
    (value.biographyPageTemplateId === undefined || normalizeVenturesTeamId(value.biographyPageTemplateId)));
}
function biographyPageTemplateId(bindings: VenturesTeamBindings): string {
  return checkedId(bindings.biographyPageTemplateId ?? VENTURES_BIOGRAPHY_BASE_TEMPLATE_ID);
}
export function validVenturesTeamLanguage(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(value);
}
export function normalizeVenturesTeamDatasource(value: unknown): string | undefined {
  return normalizeVenturesTeamId(value) ?? (directItemChild(value, `${SITE_HOME_PATH}${VENTURES_URL}/team/Data`) ? value.toLowerCase() : undefined);
}
function checkedScope(scope: VenturesTeamScope) {
  const datasourceId = normalizeVenturesTeamDatasource(scope.datasourceId);
  if (!validVenturesTeamLanguage(scope.language) || !datasourceId) throw new Error('Invalid Ventures team scope');
  return { rootId: checkedId(scope.rootId), datasourceId, language: scope.language };
}
const literal = JSON.stringify;
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function nativeValue(field: NativeField | undefined): unknown {
  if (!field || !Object.hasOwn(field, 'jsonValue') || field.jsonValue === null || field.jsonValue === undefined) throw new Error('Missing Ventures team field');
  const json = field.jsonValue;
  return object(json) && Object.hasOwn(json, 'value') ? json.value : json;
}
/** A present empty value wins over stale target items; invalid references never disappear silently. */
export function venturesTeamProfileIds(field: NativeField | undefined): string[] {
  const value = nativeValue(field);
  if (value === '') return [];
  const entries = typeof value === 'string' ? value.split('|') : Array.isArray(value) ? value : undefined;
  if (!entries) throw new Error('Invalid Ventures team references');
  const ids = entries.map((entry) => checkedId(typeof entry === 'string' ? entry : object(entry) ? entry.id : undefined));
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate Ventures team reference');
  return ids;
}

export function buildVenturesTeamScopeQuery(scope: VenturesTeamScope): string {
  const ids = checkedScope(scope);
  return `query VenturesTeamScope {
    root: item(path: ${literal(ids.rootId)}, language: ${literal(ids.language)}) { id path url { path } }
    datasource: item(path: ${literal(ids.datasourceId)}, language: ${literal(ids.language)}) {
      id path template { id } parent { name parent { id } }
      profiles: field(name: ${literal(VENTURES_TEAM_PROFILES_FIELD_ID)}) { jsonValue }
    }
  }`;
}
export function validVenturesTeamScope(scope: VenturesTeamScope, bindings: VenturesTeamBindings, response: VenturesTeamScopeResponse): boolean {
  const ids = checkedScope(scope);
  return validVenturesTeamBindings(bindings) && ids.rootId === checkedId(VENTURES_TEAM_PAGE_ID) &&
    normalizeVenturesTeamId(response?.root?.id) === ids.rootId &&
    response.root?.path?.toLowerCase() === `${SITE_HOME_PATH}${VENTURES_URL}/team`.toLowerCase() &&
    response.root?.url?.path === `${VENTURES_URL}/team` &&
    Boolean(normalizeVenturesTeamId(response.datasource?.id)) &&
    (normalizeVenturesTeamId(ids.datasourceId) ? normalizeVenturesTeamId(response.datasource?.id) === ids.datasourceId
      : response.datasource?.path?.toLowerCase() === ids.datasourceId) &&
    normalizeVenturesTeamId(response.datasource?.template?.id) === normalizeVenturesTeamId(bindings.datasourceTemplateId) &&
    response.datasource?.parent?.name?.toLowerCase() === 'data' &&
    normalizeVenturesTeamId(response.datasource?.parent?.parent?.id) === ids.rootId;
}
export function buildVenturesTeamPageQuery(pageId: string, language: string): string {
  if (!validVenturesTeamLanguage(language)) throw new Error('Invalid Ventures team language');
  return `query VenturesTeamPage {
    page: item(path: ${literal(checkedId(pageId))}, language: ${literal(language)}) { id path url { path } template { id } rendered }
  }`;
}
export function buildVenturesTeamListingQuery(pagePath: string, language: string): string {
  if (!validVenturesTeamLanguage(language) || !directChild(pagePath, `${SITE_HOME_PATH}${VENTURES_URL}`)) throw new Error('Invalid Ventures listing path');
  return `query VenturesTeamListing {
    listing: item(path: ${literal(`${pagePath}/Data/Team Listing`)}, language: ${literal(language)}) {
      id path template { id } parent { name parent { id } }
      roleMode: field(name: ${literal(VENTURES_TEAM_LISTING_FIELD_IDS.roleMode)}) { jsonValue }
      listingRole: field(name: ${literal(VENTURES_TEAM_LISTING_FIELD_IDS.role)}) { jsonValue }
      summary: field(name: ${literal(VENTURES_TEAM_LISTING_FIELD_IDS.summary)}) { jsonValue }
      focus: field(name: ${literal(VENTURES_TEAM_LISTING_FIELD_IDS.focus)}) { jsonValue }
      bioLinkText: field(name: ${literal(VENTURES_TEAM_LISTING_FIELD_IDS.bioLinkText)}) { jsonValue }
      socialLink: field(name: ${literal(VENTURES_TEAM_LISTING_FIELD_IDS.socialLink)}) { jsonValue }
    }
  }`;
}
export function buildVenturesTeamBiographyQuery(source: string, language: string): string {
  const identifier = normalizeVenturesTeamId(source) ?? (/^\/sitecore\/[^\x00-\x1f?#\\]*$/i.test(source) ? source : undefined);
  if (!identifier || !validVenturesTeamLanguage(language)) throw new Error('Invalid Ventures team language');
  return `query VenturesTeamBiography {
    biography: item(path: ${literal(identifier)}, language: ${literal(language)}) {
      id path template { id } parent { name parent { id } }
      name: field(name: ${literal(VENTURES_CANONICAL_FIELD_IDS.name)}) { jsonValue }
      role: field(name: ${literal(VENTURES_CANONICAL_FIELD_IDS.role)}) { jsonValue }
      portrait: field(name: ${literal(VENTURES_CANONICAL_FIELD_IDS.portrait)}) { jsonValue }
    }
  }`;
}
function directChild(path: unknown, root: string): path is string {
  if (typeof path !== 'string' || !path.toLowerCase().startsWith(`${root.toLowerCase()}/`)) return false;
  const leaf = path.slice(root.length + 1);
  return Boolean(leaf) && !/[/?#\\\s%]/.test(leaf) && leaf !== '.' && leaf !== '..';
}
function renderedBiographySource(page: VenturesTeamPage, language: string): string {
  let rendered = page.rendered;
  if (typeof rendered === 'string') rendered = JSON.parse(rendered);
  if (!object(rendered) || !object(rendered.sitecore)) throw new Error('Missing Ventures biography layout');
  const sitecore = rendered.sitecore;
  if (!object(sitecore.route) || normalizeVenturesTeamId(sitecore.route.itemId) !== checkedId(page.id) ||
    !object(sitecore.context) || sitecore.context.language !== language ||
    (object(sitecore.context.site) && sitecore.context.site.name !== 'allianz-life')) throw new Error('Invalid Ventures biography layout scope');
  const sources: string[] = [];
  const traverse = (placeholders: unknown, depth: number) => {
    if (depth > 32 || !object(placeholders)) throw new Error('Invalid Ventures biography placeholders');
    for (const renderings of Object.values(placeholders)) {
      if (!Array.isArray(renderings)) throw new Error('Incomplete Ventures biography placeholders');
      for (const rendering of renderings) {
        if (!object(rendering)) throw new Error('Invalid Ventures biography rendering');
        if (rendering.componentName === 'ExpertBiography') {
          if (typeof rendering.dataSource !== 'string' || !rendering.dataSource) throw new Error('Missing canonical biography binding');
          sources.push(rendering.dataSource);
        }
        if (rendering.placeholders !== undefined) traverse(rendering.placeholders, depth + 1);
      }
    }
  };
  traverse(sitecore.route.placeholders, 0);
  if (sources.length !== 1) throw new Error('Ambiguous Ventures biography binding');
  return sources[0];
}
function validPage(page: VenturesTeamPage, id: string, bindings: VenturesTeamBindings): boolean {
  return normalizeVenturesTeamId(page?.id) === id &&
    normalizeVenturesTeamId(page.template?.id) === biographyPageTemplateId(bindings) &&
    directChild(page.url?.path, VENTURES_URL) && page.url.path !== `${VENTURES_URL}/team` &&
    directChild(page.path, `${SITE_HOME_PATH}${VENTURES_URL}`) &&
    page.path.toLowerCase() === `${SITE_HOME_PATH}${page.url.path}`.toLowerCase();
}
function text(field: NativeField | undefined): VenturesTeamText {
  if (typeof nativeValue(field) !== 'string' || !object(field!.jsonValue) || !Object.hasOwn(field!.jsonValue, 'value')) throw new Error('Incomplete Ventures text field');
  return field as VenturesTeamText;
}
function media<T extends VenturesTeamImage | VenturesTeamLink>(field: NativeField | undefined, names: string[]): T {
  const value = nativeValue(field);
  if (!object(value) || !object(field!.jsonValue) || !Object.hasOwn(field!.jsonValue, 'value') ||
    names.some((key) => value[key] !== undefined && typeof value[key] !== 'string')) throw new Error('Incomplete Ventures media field');
  return field as T;
}

function directItemChild(path: unknown, root: string): path is string {
  if (typeof path !== 'string' || !path.toLowerCase().startsWith(`${root.toLowerCase()}/`)) return false;
  const leaf = path.slice(root.length + 1);
  return Boolean(leaf) && !/[/?#\\\x00-\x1f]/.test(leaf) && leaf !== '.' && leaf !== '..';
}
function validateProfile(page: VenturesTeamPage, biography: VenturesTeamBiography, listing: VenturesTeamListing,
  id: string, scope: VenturesTeamScope, bindings: VenturesTeamBindings): void {
  const actualBinding = renderedBiographySource(page, scope.language);
  const sourceId = normalizeVenturesTeamId(actualBinding);
  if (!validPage(page, id, bindings) || !normalizeVenturesTeamId(biography?.id) ||
    normalizeVenturesTeamId(biography.template?.id) !== checkedId(VENTURES_BIOGRAPHY_TEMPLATE_ID) ||
    biography.parent?.name?.toLowerCase() !== 'data' || normalizeVenturesTeamId(biography.parent.parent?.id) !== id ||
    !directItemChild(biography.path, `${page.path}/Data`) ||
    (sourceId ? sourceId !== checkedId(biography.id) : actualBinding.toLowerCase() !== biography.path.toLowerCase())) {
    throw new Error('Selected source is not the owning page canonical biography');
  }
  if (!normalizeVenturesTeamId(listing?.id) || normalizeVenturesTeamId(listing.template?.id) !== checkedId(bindings.listingTemplateId) ||
    listing.path?.toLowerCase() !== `${page.path}/Data/Team Listing`.toLowerCase() ||
    listing.parent?.name?.toLowerCase() !== 'data' || normalizeVenturesTeamId(listing.parent.parent?.id) !== id) {
    throw new Error('Missing or incorrectly owned Ventures Team Listing child');
  }
}
/** Read authored page references in order, using their actual biography rendering and page-owned listing child. */
export async function collectVenturesTeamProfiles(getData: VenturesTeamGetData, scope: VenturesTeamScope, bindings: VenturesTeamBindings,
  selectedIds: string[], fetchOptions?: FetchOptions): Promise<VenturesTeamCollection> {
  const actualScope = checkedScope(scope);
  if (!validVenturesTeamBindings(bindings)) throw new Error('Unbound Ventures team');
  const ids = selectedIds.map(checkedId);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate Ventures team reference');
  const profiles = await Promise.all(ids.map(async (id) => {
    const response = await getData<{ page?: VenturesTeamPage }>(buildVenturesTeamPageQuery(id, scope.language), undefined, fetchOptions);
    const page = response?.page;
    if (!page || !validPage(page, id, bindings)) throw new Error('Invalid selected Ventures biography page');
    const actualBinding = renderedBiographySource(page, scope.language);
    if (!normalizeVenturesTeamId(actualBinding) && !directItemChild(actualBinding, `${page.path}/Data`)) throw new Error('Foreign Ventures biography binding');
    const [result, authored] = await Promise.all([
      getData<{ biography?: VenturesTeamBiography }>(buildVenturesTeamBiographyQuery(actualBinding, scope.language), undefined, fetchOptions),
      getData<{ listing?: VenturesTeamListing }>(buildVenturesTeamListingQuery(page.path, scope.language), undefined, fetchOptions),
    ]);
    const biography = result?.biography, listing = authored?.listing;
    if (!biography || !listing) throw new Error('Missing Ventures profile data');
    validateProfile(page, biography, listing, id, scope, bindings);
    return { page, biography, listing };
  }));
  return { complete: true, scope: actualScope, biographyPageTemplateId: biographyPageTemplateId(bindings),
    listingTemplateId: checkedId(bindings.listingTemplateId), selectedIds: ids, profiles };
}

/** Preserve native fields without mutating or copying detail-page biography/focus/download content. */
export function selectVenturesTeam(scope: VenturesTeamScope, bindings: VenturesTeamBindings, collection: VenturesTeamCollection): AutomaticVenturesTeam {
  const expected = checkedScope(scope), actual = collection?.scope && checkedScope(collection.scope);
  if (!validVenturesTeamBindings(bindings) || collection?.complete !== true || !actual ||
    actual.rootId !== expected.rootId || actual.datasourceId !== expected.datasourceId || actual.language !== expected.language ||
    normalizeVenturesTeamId(collection.biographyPageTemplateId) !== biographyPageTemplateId(bindings) ||
    normalizeVenturesTeamId(collection.listingTemplateId) !== checkedId(bindings.listingTemplateId) ||
    !Array.isArray(collection.selectedIds) || !Array.isArray(collection.profiles) || collection.selectedIds.length !== collection.profiles.length) {
    throw new Error('Ventures team collection provenance mismatch');
  }
  const seen = new Set<string>();
  const items = collection.profiles.map(({ page, biography, listing }, index): VenturesTeamPerson => {
    const id = checkedId(collection.selectedIds[index]);
    if (seen.has(id)) throw new Error('Duplicate Ventures team profile');
    validateProfile(page, biography, listing, id, scope, bindings);
    seen.add(id);
    const name = text(biography.name), sharedRole = text(biography.role);
    const portrait = media<VenturesTeamImage>(biography.portrait, ['src', 'alt']);
    const mode = text(listing.roleMode).jsonValue.value || 'shared';
    if (!['shared', 'override', 'hidden'].includes(mode)) throw new Error('Invalid Ventures team role mode');
    const listingRole = text(listing.listingRole);
    return { pageId: page.id, biographyId: biography.id, href: page.url.path,
      name, ...(mode === 'hidden' ? {} : { role: mode === 'override' ? listingRole : sharedRole }),
      roleFormat: mode === 'shared' ? 'rich-text' : 'text', portrait,
      summary: text(listing.summary), focus: text(listing.focus), bioLinkText: text(listing.bioLinkText),
      socialLink: media<VenturesTeamLink>(listing.socialLink, ['href', 'url', 'text', 'target', 'linktype']),
    };
  });
  return { complete: true, status: 'ready', items };
}
export function unavailableVenturesTeam(error: AutomaticVenturesTeam['error'] = 'unavailable'): AutomaticVenturesTeam {
  return { complete: false, status: 'unavailable', error, items: [] };
}
