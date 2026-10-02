import type { Field } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';

export const NEWSROOM_ROOT_ID = '0971f3ec-8aae-5950-9ad5-11e62f6b5770';
export const NEWSROOM_PAGE_TEMPLATE_ID = '273e2551-3e06-52a6-bea5-6f7d6e506913';
export const PRESS_RELEASE_TEMPLATE_ID = '8c7ba106-bf89-4b94-8667-06f4febe9d1a';
export const NEWSROOM_YEAR_PAGE_TEMPLATE_ID = '2d50c9b4-9f1e-42ae-aa00-0c85fd2b689e';
export const NEWSROOM_NAVIGATION_TITLE_FIELD_ID = '4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8';
export const NEWSROOM_URL = '/about/newsroom';

export type NewsroomGetData = <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) => Promise<T>;
export type AutomaticTextField = { jsonValue?: Field<string> };
export interface AutomaticYear {
  id: string;
  name: string;
  path: string;
  url: { path: string };
  navigationTitle?: AutomaticTextField;
  parent: { id: string };
  year: number;
}
export interface AutomaticNewsPage {
  id: string;
  path: string;
  url: { path: string };
  parent: { id: string };
}
export interface AutomaticRelease {
  id: string;
  title?: AutomaticTextField;
  summary?: AutomaticTextField;
  releaseDate?: AutomaticTextField;
  parent?: { parent?: { id?: string; url?: { path?: string }; parent?: { id?: string } } };
}
export type AutomaticStatus = { complete: boolean; status: 'ready' | 'unavailable'; error?: 'invalid-scope' | 'unavailable' };
export type AutomaticYears = AutomaticStatus & { items: AutomaticYear[]; currentId?: string };
export type AutomaticReleases = AutomaticStatus & { items: AutomaticRelease[]; missingDates?: number; missingSources?: number };
export type NewsroomQueryKind = 'years' | 'pages' | 'releases';
export type NewsroomCollectionScope = { language: string; yearId?: string };

/** Item IDs may arrive in any Sitecore GUID representation. */
export function normalizeNewsroomId(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}|\{[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\})$/i.test(value)) return undefined;
  return value.replace(/[{}-]/g, '').toLowerCase();
}

function checkedId(value: string): string {
  const id = normalizeNewsroomId(value);
  if (!id) throw new Error('Invalid newsroom item ID');
  return id;
}

function checkedLanguage(value: string): string {
  if (!/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(value)) throw new Error('Invalid newsroom language');
  return value;
}

/** Entirely literal input avoids Edge's mixed literal/variable restriction and guessed input types. */
export function buildNewsroomQuery(kind: NewsroomQueryKind, scope: NewsroomCollectionScope, after?: string): string {
  const language = checkedLanguage(scope.language);
  const root = checkedId(NEWSROOM_ROOT_ID);
  const selected = scope.yearId ? checkedId(scope.yearId) : root;
  if (after !== undefined && (typeof after !== 'string' || !after)) throw new Error('Invalid newsroom cursor');
  const literal = (value: string) => JSON.stringify(value);
  const template = kind === 'years' ? NEWSROOM_YEAR_PAGE_TEMPLATE_ID : kind === 'pages' ? NEWSROOM_PAGE_TEMPLATE_ID : PRESS_RELEASE_TEMPLATE_ID;
  const relation = kind === 'years' || (kind === 'pages' && scope.yearId) ? '_parent' : '_path';
  const location = kind === 'years' ? root : selected;
  const projection = kind === 'years'
    ? `id name path url { path } navigationTitle: field(name: "${NEWSROOM_NAVIGATION_TITLE_FIELD_ID}") { jsonValue } parent { id }`
    : kind === 'pages' ? 'id path url { path } parent { id }'
      : 'id title: field(name: "title") { jsonValue } summary: field(name: "summary") { jsonValue } releaseDate: field(name: "releaseDate") { jsonValue } parent { parent { id url { path } parent { id } } }';
  return `query AutomaticNewsroom${kind[0].toUpperCase()}${kind.slice(1)} {
    search(where: { AND: [
      { name: "_templates", value: ${literal(checkedId(template))}, operator: CONTAINS }
      { name: ${literal(relation)}, value: ${literal(location)}, operator: ${relation === '_parent' ? 'EQ' : 'CONTAINS'} }
      { name: "_language", value: ${literal(language)}, operator: EQ }
      { name: "_latestversion", value: "true", operator: EQ }
    ] }, first: ${kind === 'pages' ? 20 : 10}${after === undefined ? '' : `, after: ${literal(after)}`}) {
      total pageInfo { hasNext endCursor } results { ${projection} }
    }
  }`;
}

type Connection<T> = { total: number; pageInfo: { hasNext: boolean; endCursor?: string | null }; results: T[] };

/** Finish every cursor page, rejecting corruption instead of presenting a partial catalog. */
export async function collectNewsroomSearch<T extends { id: string }>(getData: NewsroomGetData, kind: NewsroomQueryKind, scope: NewsroomCollectionScope, fetchOptions?: FetchOptions): Promise<T[]> {
  const items: T[] = [];
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let after: string | undefined;
  let total: number | undefined;
  for (;;) {
    const response = await getData<{ search?: Connection<T> }>(buildNewsroomQuery(kind, scope, after), undefined, fetchOptions);
    const connection = response?.search;
    if (!connection || !Number.isSafeInteger(connection.total) || connection.total < 0 ||
      typeof connection.pageInfo?.hasNext !== 'boolean' || !Array.isArray(connection.results)) throw new Error('Incomplete newsroom search');
    if (total !== undefined && total !== connection.total) throw new Error('Newsroom total changed during pagination');
    total = connection.total;
    const pageLimit = kind === 'pages' ? 20 : 10;
    if (connection.results.length > pageLimit) throw new Error('Unexpected newsroom page size');
    for (const item of connection.results) {
      const id = normalizeNewsroomId(item?.id);
      if (!id || ids.has(id)) throw new Error('Invalid or duplicate newsroom item');
      ids.add(id);
      items.push(item);
    }
    if (items.length > total) throw new Error('Newsroom result count exceeds total');
    if (!connection.pageInfo.hasNext) {
      if (items.length !== total) throw new Error('Newsroom final result count differs from total');
      return items;
    }
    const cursor = connection.pageInfo.endCursor;
    if (!connection.results.length || items.length >= total || typeof cursor !== 'string' || !cursor || cursors.has(cursor)) throw new Error('Invalid newsroom pagination cursor');
    cursors.add(cursor);
    after = cursor;
  }
}

function internalPath(value: unknown): value is string {
  return typeof value === 'string' && /^\/(?!\/)[^?#\\\s]*$/.test(value);
}
function withoutTrailingSlash(value: string): string { return value.replace(/\/$/, ''); }
function directPath(child: string, parent: string): boolean {
  const prefix = `${withoutTrailingSlash(parent)}/`;
  const tail = child.toLowerCase().startsWith(prefix.toLowerCase()) ? child.slice(prefix.length) : '';
  return Boolean(tail) && !tail.includes('/');
}

/** Positive year identity and native URL checks exclude folders and unrelated root pages. */
export function selectNewsroomYears(items: Array<Omit<AutomaticYear, 'year'>>): AutomaticYear[] {
  const years = items.flatMap((item) => {
    const match = item.url?.path?.match(/^\/about\/newsroom\/(\d{4})-press-releases\/?$/i);
    if (!match || typeof item.name !== 'string' || !item.name || normalizeNewsroomId(item.parent?.id) !== normalizeNewsroomId(NEWSROOM_ROOT_ID) ||
      typeof item.path !== 'string' || !item.path.toLowerCase().endsWith(`/${item.name.toLowerCase()}`) || !internalPath(item.url?.path)) return [];
    return [{ ...item, year: Number(match[1]) }];
  });
  const names = new Set<number>();
  for (const item of years) {
    if (names.has(item.year)) throw new Error('Duplicate newsroom year');
    names.add(item.year);
  }
  return years.sort((a, b) => b.year - a.year || checkedId(a.id).localeCompare(checkedId(b.id)));
}

/** Compare validated calendar dates, preserving the authored calendar rather than shifting time zones. */
export function newsroomAutomaticDate(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:$|T(?:\d{2}:?\d{2}:?\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)$/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m < 1 || m > 12 || d < 1 || d > days[m - 1]) return undefined;
  const time = value.match(/T(\d{2}):?(\d{2}):?(\d{2})/);
  if (time && (Number(time[1]) > 23 || Number(time[2]) > 59 || Number(time[3]) > 59)) return undefined;
  const offset = value.match(/[+-](\d{2}):?(\d{2})$/);
  if (offset && (Number(offset[1]) > 23 || Number(offset[2]) > 59)) return undefined;
  return y * 10000 + m * 100 + d;
}

export function selectNewsroomReleases(years: AutomaticYear[], pages: AutomaticNewsPage[], sources: AutomaticRelease[], yearId?: string): AutomaticReleases {
  const selectedYear = yearId ? checkedId(yearId) : undefined;
  const yearMap = new Map(years.map((year) => [checkedId(year.id), year]));
  if (selectedYear && !yearMap.has(selectedYear)) throw new Error('Archive is outside Newsroom years');
  const validPages = new Map<string, AutomaticNewsPage>();
  for (const page of pages) {
    const year = yearMap.get(normalizeNewsroomId(page.parent?.id) ?? '');
    if (!year || (selectedYear && checkedId(year.id) !== selectedYear) ||
      !internalPath(page.url?.path) || !directPath(page.url.path, year.url.path) ||
      typeof page.path !== 'string' || !directPath(page.path, year.path)) continue;
    const id = checkedId(page.id);
    if (validPages.has(id)) throw new Error('Duplicate newsroom page');
    validPages.set(id, page);
  }
  const owned = new Map<string, AutomaticRelease>();
  const sourceIds = new Set<string>();
  for (const source of sources) {
    const id = checkedId(source.id);
    if (sourceIds.has(id)) throw new Error('Duplicate newsroom datasource');
    sourceIds.add(id);
    const owner = source.parent?.parent;
    const pageId = normalizeNewsroomId(owner?.id);
    const page = pageId ? validPages.get(pageId) : undefined;
    if (!page || normalizeNewsroomId(owner?.parent?.id) !== normalizeNewsroomId(page.parent.id)) continue;
    if (owner?.url?.path !== page.url.path) throw new Error('Newsroom owner URL differs from page');
    if (owned.has(pageId!)) throw new Error('Multiple release datasources for a newsroom page');
    owned.set(pageId!, source);
  }
  const missingSources = validPages.size - owned.size;
  const all = [...owned.values()];
  const date = (item: AutomaticRelease) => newsroomAutomaticDate(item.releaseDate?.jsonValue?.value);
  const missingDates = all.filter((item) => date(item) === undefined).length;
  const ordered = (selectedYear ? all : all.filter((item) => date(item) !== undefined)).sort((a, b) =>
    (date(b) ?? -1) - (date(a) ?? -1) ||
    checkedId(a.parent!.parent!.id!).localeCompare(checkedId(b.parent!.parent!.id!)) || checkedId(a.id).localeCompare(checkedId(b.id)));
  return { items: selectedYear ? ordered : ordered.slice(0, 6), complete: true, status: 'ready', missingDates, missingSources };
}

export function unavailableNewsroomReleases(error: AutomaticStatus['error'] = 'unavailable'): AutomaticReleases {
  return { items: [], complete: false, status: 'unavailable', error };
}
export function unavailableNewsroomYears(error: AutomaticStatus['error'] = 'unavailable'): AutomaticYears {
  return { items: [], complete: false, status: 'unavailable', error };
}
