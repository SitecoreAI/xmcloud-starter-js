import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export type NewsroomTextValue = { jsonValue?: Field<string> };
export type NewsroomNativeField = { name?: string; jsonValue?: unknown };
export type NewsroomPage = { id?: string; url?: { path?: string } };

/** Only the existing article fields needed by a release teaser, never its body. */
export interface NewsroomRelease {
  id: string;
  title?: NewsroomTextValue;
  summary?: NewsroomTextValue;
  releaseDate?: NewsroomTextValue;
  fieldCollection?: NewsroomNativeField[] | null;
  parent?: { parent?: NewsroomPage | null } | null;
}

export interface NewsroomReleaseList {
  jsonValue?: unknown;
  targetItems?: (NewsroomRelease | null)[] | null;
  /** Optional resolver evidence; an unfinished connection must never look complete. */
  total?: number;
  pageInfo?: { hasNext?: boolean; endCursor?: string | null };
}

export interface PressReleaseArchiveDatasource {
  id?: string;
  heading?: NewsroomTextValue;
  releases?: NewsroomReleaseList | null;
  fieldCollection?: NewsroomNativeField[] | null;
}

export type PressReleaseArchiveProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: PressReleaseArchiveDatasource } };
};

/** A canonical direct field, including an intentional clear, wins over collection data. */
export function newsroomFields<T extends object>(item: T, names: readonly string[]): T {
  const projected = { ...item } as Record<string, unknown>;
  const allowed = new Map(names.map((name) => [name.toLowerCase(), name]));
  for (const field of (item as { fieldCollection?: NewsroomNativeField[] | null }).fieldCollection ?? []) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const name = allowed.get(field.name.toLowerCase());
    if (name && !Object.hasOwn(projected, name)) projected[name] = { jsonValue: field.jsonValue };
  }
  return projected as T;
}

export const pressReleaseArchiveFields = (item: PressReleaseArchiveDatasource) =>
  newsroomFields(item, ['heading']);

export const newsroomReleaseFields = (item: NewsroomRelease) =>
  newsroomFields(item, ['title', 'summary', 'releaseDate']);

/** Recognize serializer reference values without replacing the SDK field object. */
export function newsroomReferenceIds(jsonValue: unknown): string[] | undefined {
  const value = jsonValue && typeof jsonValue === 'object' && Object.hasOwn(jsonValue, 'value')
    ? (jsonValue as { value?: unknown }).value : jsonValue;
  if (value === undefined) return undefined;
  if (value === null || value === '') return [];
  const normalize = (id: string) => id.replace(/[{}-]/g, '').toLowerCase();
  if (typeof value === 'string' && /^(?:\{?[\da-f-]{32,38}\}?)(?:\|\{?[\da-f-]{32,38}\}?)*$/i.test(value)) {
    return value.split('|').map(normalize);
  }
  if (Array.isArray(value)) {
    const ids = value.map((item) => typeof item === 'string' ? item
      : item && typeof item === 'object' && typeof item.id === 'string' ? item.id : undefined);
    return ids.every((id) => id !== undefined) ? (ids as string[]).map(normalize) : undefined;
  }
  if (value && typeof value === 'object' && Object.hasOwn(value, 'id') && typeof (value as { id?: unknown }).id === 'string') {
    return [normalize((value as { id: string }).id)];
  }
  return undefined;
}

/** Preserve authored Multilist order, including equal-date ties. No search, sort, or cap. */
export function newsroomReleaseItems(list?: NewsroomReleaseList | null): {
  items: NewsroomRelease[];
  complete: boolean;
} {
  if (!list) return { items: [], complete: true };
  const expected = newsroomReferenceIds(list.jsonValue);
  // An intentionally cleared field wins over stale resolver target data.
  if (expected?.length === 0) return { items: [], complete: true };
  const items = list.targetItems ?? [];
  const complete = Array.isArray(list.targetItems) && !list.pageInfo?.hasNext &&
    (list.total === undefined || list.total === items.length) &&
    items.every((item) => Boolean(item?.id)) &&
    (expected === undefined || (expected.length === items.length && expected.every((id, index) =>
      id === items[index]?.id.replace(/[{}-]/g, '').toLowerCase())));
  return { items: complete ? (items as NewsroomRelease[]).map(newsroomReleaseFields) : [], complete };
}

/** URL belongs to the returned owning page, not to the article title or fixture. */
export function newsroomReleaseLink(item: NewsroomRelease): LinkField | undefined {
  const page = item.parent?.parent;
  const href = page?.url?.path;
  if (!page?.id || !href || !href.startsWith('/') || href.startsWith('//')) return undefined;
  return { value: { href, text: item.title?.jsonValue?.value ?? '', linktype: 'internal' } };
}

export type NewsroomCalendarDate = { iso: string; year: string; month: string; day: string };

/** Read native/ISO calendar parts without converting midnight into a local timezone. */
export function newsroomCalendarDate(value?: string): NewsroomCalendarDate | undefined {
  const parts = value?.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:T|$)/);
  if (!parts) return undefined;
  const [, year, month, day] = parts;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m < 1 || m > 12 || d < 1 || d > days[m - 1]) return undefined;
  return { iso: `${year}-${month}-${day}`, year, month, day };
}

export function newsroomDateLabel(value: string | undefined, design: 'archive' | 'recent'): string {
  const date = newsroomCalendarDate(value);
  if (!date) return '';
  if (design === 'recent') return `Date: ${date.month}/${date.day}/${date.year}`;
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(date.month) - 1];
  return `${month} ${date.day}, ${date.year}`;
}
