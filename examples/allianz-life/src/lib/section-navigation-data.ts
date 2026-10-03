import type { Field } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';

/** The inherited SXA caption is distinct from the project's similarly named field. */
export const SECTION_NAVIGATION_TITLE_FIELD_ID = '4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8';
export const SECTION_NAVIGATION_PAGE_SIZE = 10;

/** Populate only after reading the existing native templates, fields and parameters. */
export interface SectionNavigationBindings {
  pageBaseTemplateId: string;
  excludedFilterFieldId: string;
  rootParameterName: string;
  filterParameterName: string;
}

export type SectionNavigationGetData = <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) => Promise<T>;
export type SectionNavigationText = { jsonValue?: Field<string> };
export interface SectionNavigationPage {
  id: string;
  path: string;
  url: { path: string };
  navigationTitle?: SectionNavigationText;
  parent?: { id: string };
}
export interface SectionNavigationChild extends SectionNavigationPage {
  parent: { id: string };
  excludedFilters?: { jsonValue?: unknown };
}
export interface SectionNavigationScope {
  rootId: string;
  currentId: string;
  filterId: string;
  language: string;
}
export interface AutomaticSectionNavigation {
  root?: SectionNavigationPage;
  items: SectionNavigationChild[];
  currentId?: string;
  complete: boolean;
  status: 'ready' | 'unavailable';
  error?: 'unbound' | 'invalid-scope' | 'unavailable';
}
export type SectionNavigationCatalog = {
  root: SectionNavigationPage;
  current: SectionNavigationPage;
  items: SectionNavigationChild[];
};
export type SectionNavigationMembership = { id: string; path: string; parent?: { id: string } };
type Connection<T> = { total: number; pageInfo: { hasNext: boolean; endCursor?: string | null }; results: T[] };

export function normalizeSectionNavigationId(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}|\{[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\})$/i.test(value)) return undefined;
  return value.replace(/[{}-]/g, '').toLowerCase();
}

function checkedId(value: unknown): string {
  const id = normalizeSectionNavigationId(value);
  if (!id) throw new Error('Invalid section navigation ID');
  return id;
}

export function validSectionNavigationBindings(bindings?: SectionNavigationBindings): bindings is SectionNavigationBindings {
  const parameter = (value: unknown) => typeof value === 'string' && value === value.trim() &&
    value.length > 0 && value.length <= 128 && !/[\x00-\x1f]/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value);
  return Boolean(bindings && normalizeSectionNavigationId(bindings.pageBaseTemplateId) &&
    normalizeSectionNavigationId(bindings.excludedFilterFieldId) && parameter(bindings.rootParameterName) &&
    parameter(bindings.filterParameterName) && bindings.rootParameterName !== bindings.filterParameterName);
}

export function validSectionNavigationLanguage(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(value);
}

export function validSectionNavigationUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\/(?!\/)[^?#\\\s]*$/.test(value) || /%(?:2f|5c)/i.test(value)) return false;
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return false; }
  return !/[\\\s\x00-\x1f\x7f]/.test(decoded) && !/(?:^|\/)\.{1,2}(?:\/|$)/.test(decoded) &&
    !/^\/(?:new-york\/)?(?:api|sitecore|login|registration|spa|account|portal|secured|logout|manageuserprofile)(?:\/|$)/i.test(decoded);
}

function itemPath(value: unknown): value is string {
  return typeof value === 'string' && /^\/sitecore\/(?!\/)[^\x00-\x1f\\]*[^/]$/i.test(value);
}
function below(child: string, root: string): boolean {
  return child.toLowerCase().startsWith(`${root.replace(/\/$/, '').toLowerCase()}/`);
}
function directChild(child: string, root: string): boolean {
  const prefix = `${root.replace(/\/$/, '')}/`;
  return below(child, root) && !child.slice(prefix.length).includes('/');
}

function checkedScope(scope: SectionNavigationScope, bindings: SectionNavigationBindings, after?: string) {
  if (!validSectionNavigationBindings(bindings) || !validSectionNavigationLanguage(scope.language) ||
    (after !== undefined && (typeof after !== 'string' || !after))) throw new Error('Invalid section navigation scope');
  return { root: checkedId(scope.rootId), current: checkedId(scope.currentId), filter: checkedId(scope.filterId) };
}

/** Literal queries follow the already supported Edge item/children schema. */
export function buildSectionNavigationChildrenQuery(scope: SectionNavigationScope, bindings: SectionNavigationBindings, after?: string): string {
  const ids = checkedScope(scope, bindings, after);
  const literal = JSON.stringify;
  const identity = 'id path url { path } parent { id }';
  return `query AutomaticSectionNavigationChildren {
    root: item(path: ${literal(ids.root)}, language: ${literal(scope.language)}) {
      ${identity}
      navigationTitle: field(name: ${literal(SECTION_NAVIGATION_TITLE_FIELD_ID)}) { jsonValue }
      children(first: ${SECTION_NAVIGATION_PAGE_SIZE}${after === undefined ? '' : `, after: ${literal(after)}`}) {
        total pageInfo { hasNext endCursor } results {
          ${identity}
          navigationTitle: field(name: ${literal(SECTION_NAVIGATION_TITLE_FIELD_ID)}) { jsonValue }
          excludedFilters: field(name: ${literal(checkedId(bindings.excludedFilterFieldId))}) { jsonValue }
        }
      }
    }
    current: item(path: ${literal(ids.current)}, language: ${literal(scope.language)}) { ${identity} }
  }`;
}

/** _templates includes inherited templates; concrete template equality is insufficient. */
export function buildSectionNavigationMembershipQuery(scope: SectionNavigationScope, bindings: SectionNavigationBindings, after?: string): string {
  const ids = checkedScope(scope, bindings, after);
  const literal = JSON.stringify;
  return `query AutomaticSectionNavigationMembership {
    search(where: { AND: [
      { name: "_templates", value: ${literal(checkedId(bindings.pageBaseTemplateId))}, operator: CONTAINS }
      { name: "_path", value: ${literal(ids.root)}, operator: CONTAINS }
      { name: "_language", value: ${literal(scope.language)}, operator: EQ }
      { name: "_latestversion", value: "true", operator: EQ }
    ] }, first: ${SECTION_NAVIGATION_PAGE_SIZE}${after === undefined ? '' : `, after: ${literal(after)}`}) {
      total pageInfo { hasNext endCursor } results { id path parent { id } }
    }
  }`;
}

function acceptPage<T extends { id: string }>(connection: Connection<T> | undefined, state: {
  items: T[]; ids: Set<string>; cursors: Set<string>; total?: number;
}): string | undefined {
  if (!connection || !Number.isSafeInteger(connection.total) || connection.total < 0 ||
    typeof connection.pageInfo?.hasNext !== 'boolean' || !Array.isArray(connection.results) ||
    connection.results.length > SECTION_NAVIGATION_PAGE_SIZE) throw new Error('Incomplete section navigation collection');
  if (state.total !== undefined && state.total !== connection.total) throw new Error('Section navigation total changed');
  state.total = connection.total;
  for (const item of connection.results) {
    const id = normalizeSectionNavigationId(item?.id);
    if (!id || state.ids.has(id)) throw new Error('Invalid or duplicate section navigation item');
    state.ids.add(id);
    state.items.push(item);
  }
  if (state.items.length > state.total) throw new Error('Section navigation count exceeds total');
  if (!connection.pageInfo.hasNext) {
    if (state.items.length !== state.total) throw new Error('Section navigation count differs from total');
    return undefined;
  }
  const cursor = connection.pageInfo.endCursor;
  if (!connection.results.length || state.items.length >= state.total || typeof cursor !== 'string' ||
    !cursor || state.cursors.has(cursor)) throw new Error('Invalid section navigation cursor');
  state.cursors.add(cursor);
  return cursor;
}

/** Exhaust native children before filtering, preserving the API's exact sibling order. */
export async function collectSectionNavigationChildren(getData: SectionNavigationGetData, scope: SectionNavigationScope,
  bindings: SectionNavigationBindings, fetchOptions?: FetchOptions): Promise<SectionNavigationCatalog> {
  const state = { items: [] as SectionNavigationChild[], ids: new Set<string>(), cursors: new Set<string>() };
  let after: string | undefined;
  let catalog: Omit<SectionNavigationCatalog, 'items'> | undefined;
  let fingerprint: string | undefined;
  for (;;) {
    const response = await getData<{ root?: SectionNavigationPage & { children?: Connection<SectionNavigationChild> }; current?: SectionNavigationPage }>(
      buildSectionNavigationChildrenQuery(scope, bindings, after), undefined, fetchOptions);
    const root = response?.root, current = response?.current;
    if (!root || !current || normalizeSectionNavigationId(root.id) !== checkedId(scope.rootId) ||
      normalizeSectionNavigationId(current.id) !== checkedId(scope.currentId) || !itemPath(root.path) ||
      !itemPath(current.path) || !validSectionNavigationUrl(root.url?.path) || !validSectionNavigationUrl(current.url?.path) ||
      (checkedId(root.id) !== checkedId(current.id) && !below(current.path, root.path))) throw new Error('Invalid section navigation root/current identity');
    const nextFingerprint = JSON.stringify([root.id, root.path, root.url, root.navigationTitle, current.id, current.path, current.url, current.parent]);
    if (fingerprint !== undefined && fingerprint !== nextFingerprint) throw new Error('Section navigation scope changed during pagination');
    fingerprint = nextFingerprint;
    if (!catalog) {
      // Do not forward the root's unfiltered children connection to client props.
      const { id, path, url, parent, navigationTitle } = root;
      catalog = { root: { id, path, url, parent, navigationTitle }, current };
    }
    for (const child of root.children?.results ?? []) {
      if (!child || normalizeSectionNavigationId(child.parent?.id) !== checkedId(root.id) ||
        !itemPath(child.path) || !directChild(child.path, root.path)) throw new Error('Invalid native section child ownership');
    }
    after = acceptPage(root.children, state);
    if (after === undefined) return { ...catalog, items: state.items };
  }
}

/** The separate complete search proves generic inherited page membership. */
export async function collectSectionNavigationMembership(getData: SectionNavigationGetData, scope: SectionNavigationScope,
  bindings: SectionNavigationBindings, fetchOptions?: FetchOptions): Promise<SectionNavigationMembership[]> {
  const state = { items: [] as SectionNavigationMembership[], ids: new Set<string>(), cursors: new Set<string>() };
  let after: string | undefined;
  for (;;) {
    const response = await getData<{ search?: Connection<SectionNavigationMembership> }>(
      buildSectionNavigationMembershipQuery(scope, bindings, after), undefined, fetchOptions);
    after = acceptPage(response?.search, state);
    if (after === undefined) return state.items;
  }
}

/** Existing native multilist serializers may expose a raw value, SDK wrapper or IDs. */
export function sectionNavigationExcludedFilterIds(jsonValue: unknown): string[] | undefined {
  const value = jsonValue && typeof jsonValue === 'object' && !Array.isArray(jsonValue) && Object.hasOwn(jsonValue, 'value')
    ? (jsonValue as { value?: unknown }).value : jsonValue;
  if (value === null || value === '') return [];
  const raw = typeof value === 'string' ? value.split('|') : Array.isArray(value) ? value : undefined;
  if (!raw) return undefined;
  const ids = raw.map((entry) => normalizeSectionNavigationId(typeof entry === 'string' ? entry
    : entry && typeof entry === 'object' && Object.hasOwn(entry, 'id') ? (entry as { id: unknown }).id : undefined));
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return undefined;
  return ids as string[];
}

/** Membership and exclusion refine native siblings; neither search order nor slugs order them. */
export function selectSectionNavigation(catalog: SectionNavigationCatalog, membership: SectionNavigationMembership[],
  scope: SectionNavigationScope): AutomaticSectionNavigation {
  const pageIds = new Map<string, SectionNavigationMembership>();
  for (const page of membership) {
    const id = checkedId(page.id);
    if (pageIds.has(id) || !itemPath(page.path) ||
      (page.path.toLowerCase() !== catalog.root.path.toLowerCase() && !below(page.path, catalog.root.path))) throw new Error('Invalid section page membership');
    pageIds.set(id, page);
  }
  const root = pageIds.get(checkedId(scope.rootId)), current = pageIds.get(checkedId(scope.currentId));
  if (!root || !current || root.path !== catalog.root.path || current.path !== catalog.current.path) throw new Error('Section root/current are not native pages');
  const selected = catalog.items.filter((item) => {
    const page = pageIds.get(checkedId(item.id));
    if (!page) return false;
    if (page.path !== item.path || normalizeSectionNavigationId(page.parent?.id) !== checkedId(scope.rootId) ||
      normalizeSectionNavigationId(item.parent?.id) !== checkedId(scope.rootId) || !directChild(item.path, catalog.root.path) ||
      !validSectionNavigationUrl(item.url?.path)) throw new Error('Invalid section page ownership');
    const exclusions = sectionNavigationExcludedFilterIds(item.excludedFilters?.jsonValue);
    if (!exclusions) throw new Error('Missing native navigation exclusion field');
    return !exclusions.includes(checkedId(scope.filterId));
  });
  const items = selected.map(({ id, path, url, parent, navigationTitle }) => ({ id, path, url, parent, navigationTitle }));
  return { root: catalog.root, items, currentId: catalog.current.id, complete: true, status: 'ready' };
}

export function unavailableSectionNavigation(error: AutomaticSectionNavigation['error'] = 'unavailable'): AutomaticSectionNavigation {
  return { items: [], complete: false, status: 'unavailable', error };
}
