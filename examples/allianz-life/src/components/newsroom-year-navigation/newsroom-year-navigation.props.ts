import type { LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import { safeLink } from 'lib/allianz-fields';
import { normalizeNewsroomId, type AutomaticYear, type AutomaticYears } from 'lib/newsroom-automatic-data';

export type NewsroomArchiveYear = AutomaticYear;
export type NewsroomYearNavigationComponentData = { automaticYears?: AutomaticYears };

export type NewsroomYearNavigationProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
};

/** Render only a complete server result, preserving its native fields and order. */
export function newsroomYearItems(data?: AutomaticYears): {
  items: NewsroomArchiveYear[];
  complete: boolean;
} {
  const items = data?.items;
  const complete = data?.complete === true && data.status === 'ready' && !data.error &&
    Array.isArray(items) && items.every((item) => Boolean(normalizeNewsroomId(item?.id))) &&
    new Set(items.map((item) => normalizeNewsroomId(item.id))).size === items.length;
  return { items: complete ? items! : [], complete };
}

/** Native page URLs use the existing public-link safety policy and SDK navigation. */
export function newsroomYearLink(item: NewsroomArchiveYear): LinkField | undefined {
  const href = item.url?.path;
  if (!href || !href.startsWith('/') || href.startsWith('//') || /[\s\\]/.test(href) ||
    /^\/(?:new-york\/)?(?:api|sitecore|login|registration|spa|account|portal|secured|logout|manageuserprofile)(?:\/|$)/i.test(href)) {
    return undefined;
  }
  return safeLink({ value: { href, text: item.navigationTitle?.jsonValue?.value ?? '', linktype: 'internal' } });
}

export interface NewsroomYearNavigationData {
  items: NewsroomArchiveYear[];
  active?: NewsroomArchiveYear;
  issue?: 'incomplete-years' | 'missing-current-year' | 'missing-title' | 'invalid-url';
}

/** Current identity comes from the server result; titles remain native editable fields. */
export function newsroomYearNavigationData(
  automaticYears?: AutomaticYears,
  isEditing = false,
): NewsroomYearNavigationData {
  const selection = newsroomYearItems(automaticYears);
  const failed = (issue: NewsroomYearNavigationData['issue']): NewsroomYearNavigationData => ({ items: [], issue });
  if (!selection.complete) return failed('incomplete-years');
  if (selection.items.length === 0) return { items: [] };
  const contextId = normalizeNewsroomId(automaticYears?.currentId);
  const active = contextId && selection.items.find((item) => normalizeNewsroomId(item.id) === contextId);
  if (!active) return failed('missing-current-year');
  for (const item of selection.items) {
    const field = item.navigationTitle?.jsonValue;
    if (!field || typeof field.value !== 'string' || (!isEditing && !field.value.trim())) return failed('missing-title');
    if (!newsroomYearLink(item)) return failed('invalid-url');
  }
  return { items: selection.items, active };
}
