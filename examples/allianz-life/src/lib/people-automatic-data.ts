import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';

/** Native IDs verified in Biography-41 native checkpoint, 2026-10-02, version 0. */
export const PEOPLE_CATEGORY_INTRODUCTION_FIELD_ID = 'b161bbde-4549-4d1e-bd99-7d0840708ff6';
export const BIOGRAPHY_PAGE_TEMPLATE_ID = 'ad3a7fa4-b3e7-4578-9a76-1fefa535485c';
/** Actual native staging IDs verified by the owning actor on 2026-10-02. */
export const EXPERT_DIRECTORY_CATEGORY_TEMPLATE_ID = 'bbaca5d1-9d26-479a-81c1-c37caa661a1e';
export const PEOPLE_DIRECTORY_FIELD_IDS = {
  executiveOrder: 'b6a7493c-740f-45b5-8bae-b90b80d5aff3',
  expertOrder: '7ec198c6-9914-4f31-8144-b47933cdb165',
  expertCategory: '2b371226-4ba2-4b89-b0a1-2819f61cd2fe',
  expertSummary: '52bd7e33-c42d-466b-897d-54d6304a3f01',
} as const;
export const PEOPLE_DIRECTORY_CONTRACTS = {
  executives: { url: '/about/executives', templateId: '0fc2896e-316f-45fb-83ef-5fe7773cc31b', directoryTemplate: 'ExecutiveDirectory', directoryTemplateId: '59a5f242-acf7-4b0d-b055-562eb565d37e' },
  experts: { url: '/about/subject-matter-experts', templateId: '57724bbd-9f79-4c8d-90a8-c9d7fa17760a', directoryTemplate: 'ExpertDirectory', directoryTemplateId: 'd539b5fd-a4cd-4ae0-8618-ec63bfd9f113' },
} as const;
export type PeopleDirectoryKind = keyof typeof PEOPLE_DIRECTORY_CONTRACTS;
export type PeopleGetData = <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) => Promise<T>;
export type PeopleText = { jsonValue?: Field<string> };
export type PeopleOrder = { jsonValue?: Field<string | number> };
export type PeoplePage = { id: string; path: string; url: { path: string }; template?: { id: string }; parent?: { id: string } };
export type PeopleScope = { kind: PeopleDirectoryKind; rootId: string; datasourceId: string; language: string };
export type PeopleQueryKind = 'biographies' | 'categories';
/** Provenance of a complete native search, whose _templates predicate includes inherited templates. */
export type PeopleSearchResult<T> = { items: T[]; complete: true; queryKind: PeopleQueryKind; baseTemplateId: string; scope: PeopleScope };
export type PeopleCategory = { id: string; heading?: PeopleText; introduction?: PeopleText; sortOrder?: PeopleOrder; template?: { id: string; name?: string }; parent?: { id: string } };
export type PeopleBiography = {
  id: string;
  /** Native base-template-filtered ancestors prove the owning page's inherited eligibility. */
  ownerPages: Array<{ id: string }>;
  name?: PeopleText;
  role?: PeopleText;
  portrait?: { jsonValue?: ImageField };
  directoryOrder?: PeopleOrder;
  directorySummary?: PeopleText;
  directoryCategory?: { targetItem?: { id: string } | null };
  parent?: { name: string; parent?: PeoplePage };
};
export type DirectoryPerson = Pick<PeopleBiography, 'id' | 'name' | 'role' | 'portrait' | 'directorySummary'> & { pageId: string; href: string };
export type AutomaticPeople = {
  complete: boolean;
  status: 'ready' | 'unavailable';
  error?: 'invalid-scope' | 'unavailable';
  items: DirectoryPerson[];
  groups: Array<{ id: string; heading?: PeopleText; introduction?: PeopleText; items: DirectoryPerson[] }>;
  unassigned: DirectoryPerson[];
  missingOrder?: number;
};

export function normalizePeopleId(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}|\{[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\})$/i.test(value)) return undefined;
  return value.replace(/[{}-]/g, '').toLowerCase();
}
function checkedId(value: string): string {
  const id = normalizePeopleId(value);
  if (!id) throw new Error('Invalid people-directory item ID');
  return id;
}
function checkedScope(scope: PeopleScope) {
  if (!PEOPLE_DIRECTORY_CONTRACTS[scope.kind] || !/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(scope.language)) throw new Error('Invalid people-directory scope');
  return { root: checkedId(scope.rootId), datasource: checkedId(scope.datasourceId), language: scope.language };
}
const literal = (value: string) => JSON.stringify(value);
// Rich biography projections use a bounded ten-item request size; all cursor pages are still collected.
const PEOPLE_PAGE_LIMITS = { biographies: 10, categories: 20 } as const;
function searchTemplateId(kind: PeopleQueryKind, scope: PeopleScope): string {
  if (kind !== 'biographies' && kind !== 'categories') throw new Error('Invalid people-directory query kind');
  return checkedId(kind === 'biographies' ? PEOPLE_DIRECTORY_CONTRACTS[scope.kind].templateId : EXPERT_DIRECTORY_CATEGORY_TEMPLATE_ID);
}

/** Resolve the actual route and owning datasource; never trust recovered fixture IDs. */
export function buildPeopleScopeQuery(scope: PeopleScope): string {
  const { root, datasource, language } = checkedScope(scope);
  return `query AutomaticPeopleScope {
    root: item(path: ${literal(root)}, language: ${literal(language)}) { id path url { path } }
    datasource: item(path: ${literal(datasource)}, language: ${literal(language)}) {
      id parent { name parent { id } }
    }
  }`;
}
export function validPeopleScope(scope: PeopleScope, response: { root?: PeoplePage; datasource?: { id: string; parent?: { name: string; parent?: { id: string } } } }): boolean {
  const contract = PEOPLE_DIRECTORY_CONTRACTS[scope.kind];
  return normalizePeopleId(response.root?.id) === normalizePeopleId(scope.rootId) &&
    response.root?.url?.path?.replace(/\/$/, '').toLowerCase() === contract.url &&
    response.root?.path?.toLowerCase() === `/sitecore/content/allianz/allianz-life/home${contract.url}` &&
    normalizePeopleId(response.datasource?.id) === normalizePeopleId(scope.datasourceId) &&
    // The trusted native rendering defines its datasource template; verify its actual owner here.
    response.datasource?.parent?.name?.toLowerCase() === 'data' &&
    normalizePeopleId(response.datasource?.parent?.parent?.id) === normalizePeopleId(scope.rootId);
}

/** Fully literal search inputs follow the same supported Edge contract as Newsroom. */
export function buildPeopleSearchQuery(kind: PeopleQueryKind, scope: PeopleScope, after?: string): string {
  const { root, datasource, language } = checkedScope(scope);
  if (after !== undefined && !after) throw new Error('Invalid people-directory cursor');
  const projection = kind === 'biographies'
    ? `id ownerPages: ancestors(includeTemplateIDs: "${checkedId(BIOGRAPHY_PAGE_TEMPLATE_ID)}") { id }
      name: field(name: "name") { jsonValue }
      role: field(name: "role") { jsonValue }
      portrait: field(name: "portrait") { jsonValue }
      directoryOrder: field(name: "${scope.kind === 'executives' ? PEOPLE_DIRECTORY_FIELD_IDS.executiveOrder : PEOPLE_DIRECTORY_FIELD_IDS.expertOrder}") { jsonValue }
      ${scope.kind === 'experts' ? `directorySummary: field(name: "${PEOPLE_DIRECTORY_FIELD_IDS.expertSummary}") { jsonValue }
      directoryCategory: field(name: "${PEOPLE_DIRECTORY_FIELD_IDS.expertCategory}") { ... on LookupField { targetItem { id } } }` : ''}
      parent { name parent { id path url { path } parent { id } } }`
    : `id heading: field(name: "heading") { jsonValue } introduction: field(name: "${PEOPLE_CATEGORY_INTRODUCTION_FIELD_ID}") { jsonValue } sortOrder: field(name: "__Sortorder") { jsonValue } parent { id }`;
  return `query AutomaticPeople${kind === 'biographies' ? 'Biographies' : 'Categories'} {
    search(where: { AND: [
      { name: "_templates", value: ${literal(searchTemplateId(kind, scope))}, operator: CONTAINS }
      { name: ${literal(kind === 'biographies' ? '_path' : '_parent')}, value: ${literal(kind === 'biographies' ? root : datasource)}, operator: ${kind === 'biographies' ? 'CONTAINS' : 'EQ'} }
      { name: "_language", value: ${literal(language)}, operator: EQ }
      { name: "_latestversion", value: "true", operator: EQ }
    ] }, first: ${PEOPLE_PAGE_LIMITS[kind]}${after === undefined ? '' : `, after: ${literal(after)}`}) {
      total pageInfo { hasNext endCursor } results { ${projection} }
    }
  }`;
}

type Connection<T> = { total: number; pageInfo: { hasNext: boolean; endCursor?: string | null }; results: T[] };
/** Every page must reconcile before a collection is exposed; failures never leak partial rows. */
export async function collectPeopleSearch<T extends { id: string }>(getData: PeopleGetData, kind: PeopleQueryKind, scope: PeopleScope, fetchOptions?: FetchOptions): Promise<PeopleSearchResult<T>> {
  const { root, datasource, language } = checkedScope(scope);
  const baseTemplateId = searchTemplateId(kind, scope);
  const rows: T[] = [], ids = new Set<string>(), cursors = new Set<string>();
  let after: string | undefined, total: number | undefined;
  for (;;) {
    const response = await getData<{ search?: Connection<T> }>(buildPeopleSearchQuery(kind, scope, after), undefined, fetchOptions);
    const data = response?.search;
    if (!data || !Number.isSafeInteger(data.total) || data.total < 0 || typeof data.pageInfo?.hasNext !== 'boolean' || !Array.isArray(data.results) || data.results.length > PEOPLE_PAGE_LIMITS[kind]) throw new Error('Incomplete people-directory search');
    if (total !== undefined && total !== data.total) throw new Error('People-directory count changed during pagination');
    total = data.total;
    for (const row of data.results) {
      const id = normalizePeopleId(row?.id);
      if (!id || ids.has(id)) throw new Error('Invalid or duplicate people-directory item');
      rows.push(row); ids.add(id);
    }
    if (rows.length > total) throw new Error('People-directory count exceeds total');
    if (!data.pageInfo.hasNext) {
      if (rows.length !== total) throw new Error('People-directory final count differs from total');
      return { items: rows, complete: true, queryKind: kind, baseTemplateId,
        scope: { kind: scope.kind, rootId: root, datasourceId: datasource, language } };
    }
    const cursor = data.pageInfo.endCursor;
    if (!data.results.length || rows.length >= total || typeof cursor !== 'string' || !cursor || cursors.has(cursor)) throw new Error('Invalid people-directory pagination cursor');
    cursors.add(cursor); after = cursor;
  }
}

function order(field?: PeopleOrder): number | undefined {
  const value = field?.jsonValue?.value;
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : undefined;
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) return undefined;
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : undefined;
}
function directPath(child: unknown, parent: string): child is string {
  if (typeof child !== 'string' || !/^\/(?!\/)[^?#\\\s%]*$/.test(child)) return false;
  const path = child.replace(/\/$/, ''), prefix = `${parent}/`;
  const tail = path.toLowerCase().startsWith(prefix.toLowerCase()) ? path.slice(prefix.length) : '';
  return Boolean(tail) && !tail.includes('/') && tail !== '.' && tail !== '..';
}
/** Require the matching inherited-template search before applying independent owning-page guards. */
function searchedItems<T>(scope: PeopleScope, kind: PeopleQueryKind, result: PeopleSearchResult<T>): T[] {
  const expected = checkedScope(scope), actual = result?.scope && checkedScope(result.scope);
  if (result?.complete !== true || result.queryKind !== kind || !actual || result.scope.kind !== scope.kind ||
    actual.root !== expected.root || actual.datasource !== expected.datasource || actual.language !== expected.language ||
    normalizePeopleId(result.baseTemplateId) !== searchTemplateId(kind, scope) || !Array.isArray(result.items)) {
    throw new Error('People-directory search provenance does not match the requested scope');
  }
  return result.items;
}

/** Native search determines inherited membership; owning pages determine links and metadata orders/groups. */
export function selectPeopleDirectory(scope: PeopleScope, biographies: PeopleSearchResult<PeopleBiography>, categories?: PeopleSearchResult<PeopleCategory>): AutomaticPeople {
  checkedScope(scope);
  const contract = PEOPLE_DIRECTORY_CONTRACTS[scope.kind], pages = new Set<string>();
  const eligible = searchedItems(scope, 'biographies', biographies).filter((row) => {
    const owner = row.parent?.parent;
    return row.parent?.name?.toLowerCase() === 'data' && owner && normalizePeopleId(owner.parent?.id) === normalizePeopleId(scope.rootId) &&
      Array.isArray(row.ownerPages) && row.ownerPages.some((page) => normalizePeopleId(page?.id) === normalizePeopleId(owner.id)) &&
      directPath(owner.url?.path, contract.url) && directPath(owner.path, `/sitecore/content/allianz/allianz-life/Home${contract.url}`);
  });
  for (const row of eligible) {
    const id = checkedId(row.parent!.parent!.id);
    if (pages.has(id)) throw new Error('Multiple biography datasources own the same directory page');
    pages.add(id);
  }
  eligible.sort((a, b) => (order(a.directoryOrder) ?? Number.MAX_SAFE_INTEGER) - (order(b.directoryOrder) ?? Number.MAX_SAFE_INTEGER) || checkedId(a.parent!.parent!.id).localeCompare(checkedId(b.parent!.parent!.id)));
  const person = (row: PeopleBiography): DirectoryPerson => ({ id: row.id, pageId: row.parent!.parent!.id,
    href: row.parent!.parent!.url.path, name: row.name, role: row.role, portrait: row.portrait,
    ...(scope.kind === 'experts' ? { directorySummary: row.directorySummary } : {}) });
  const items = eligible.map(person);
  const groups = (categories ? searchedItems(scope, 'categories', categories) : []).filter((category) => normalizePeopleId(category.parent?.id) === normalizePeopleId(scope.datasourceId))
    .sort((a, b) => (order(a.sortOrder) ?? Number.MAX_SAFE_INTEGER) - (order(b.sortOrder) ?? Number.MAX_SAFE_INTEGER) || checkedId(a.id).localeCompare(checkedId(b.id)))
    .map((category) => ({ id: category.id, heading: category.heading, introduction: category.introduction, items: eligible.filter((row) => normalizePeopleId(row.directoryCategory?.targetItem?.id) === normalizePeopleId(category.id)).map(person) }));
  const groupIds = new Set(groups.map((group) => checkedId(group.id)));
  const unassigned = scope.kind === 'experts' ? eligible.filter((row) => !groupIds.has(normalizePeopleId(row.directoryCategory?.targetItem?.id) ?? '')).map(person) : [];
  return { complete: true, status: 'ready', items, groups, unassigned, missingOrder: eligible.filter((row) => order(row.directoryOrder) === undefined).length };
}
export function unavailablePeople(error: AutomaticPeople['error'] = 'unavailable'): AutomaticPeople {
  return { complete: false, status: 'unavailable', error, items: [], groups: [], unassigned: [] };
}
