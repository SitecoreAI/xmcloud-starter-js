import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ContextBreadcrumbItem {
  id?: string;
  path?: string;
  navigationTitle?: { jsonValue?: Field<string> };
  title?: { jsonValue?: Field<string> };
  navigationFilter?: { jsonValue?: unknown } | null;
  displayName?: string | null;
  name?: string | null;
  url?: { path?: string };
}

export interface ContextBreadcrumbPage extends ContextBreadcrumbItem {
  ancestors?: ContextBreadcrumbItem[] | null;
}

export type AllianzContextBreadcrumbsProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { contextItem?: ContextBreadcrumbPage | null } };
};

// Verified content boundary for this site's native ancestor query. Labels and
// links come from native item data, never from these path segments.
const allianzHomePath = '/sitecore/content/allianz/allianz-life/Home';
const normalizedPath = (value: string) => value.replace(/\/+$/, '').toLowerCase();

// Verified native Breadcrumb Navigation filter identity, independent of page names.
const breadcrumbNavigationFilterId = 'e0a2a02709324878a7d60416d5263efb';
function excludedFromBreadcrumbs(item: ContextBreadcrumbItem): boolean | undefined {
  // Older context payloads did not project this field.
  if (item.navigationFilter === undefined) return false;
  const selections = item.navigationFilter?.jsonValue;
  if (!Array.isArray(selections)) return undefined;
  let excluded = false;
  for (const selection of selections) {
    if (!selection || typeof selection !== 'object' || Array.isArray(selection) ||
      typeof selection.id !== 'string' ||
      !/^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}|\{[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\})$/i.test(selection.id)) return undefined;
    if (selection.id.replace(/[{}-]/g, '').toLowerCase() === breadcrumbNavigationFilterId) excluded = true;
  }
  return excluded;
}

export interface ContextBreadcrumbTrail {
  items: ContextBreadcrumbItem[];
  issue?: 'missing-context' | 'outside-site' | 'incomplete-chain' | 'missing-title' | 'invalid-url' | 'invalid-navigation-filter';
}

/** Resolve native labels without rewriting the owning field or its metadata. */
export function contextBreadcrumbLabel(item: ContextBreadcrumbItem): Field<string> | undefined {
  for (const field of [item.navigationTitle?.jsonValue, item.title?.jsonValue]) {
    if (field && typeof field.value === 'string' && field.value.trim()) return field;
  }
  for (const value of [item.displayName, item.name]) {
    if (typeof value === 'string' && value.trim()) return { value };
  }
  return undefined;
}

/** Verify the complete structural ancestor trail without manufacturing copy. */
export function contextBreadcrumbTrail(contextItem?: ContextBreadcrumbPage | null): ContextBreadcrumbTrail {
  const failed = (issue: ContextBreadcrumbTrail['issue']): ContextBreadcrumbTrail => ({ items: [], issue });
  if (!contextItem?.id || !contextItem.path || !Array.isArray(contextItem.ancestors)) return failed('missing-context');
  const home = normalizedPath(allianzHomePath);
  const current = normalizedPath(contextItem.path);
  if (current !== home && !current.startsWith(`${home}/`)) return failed('outside-site');
  const selected = contextItem.ancestors.filter((item) => {
    const itemPath = item.path && normalizedPath(item.path);
    return itemPath === home || itemPath?.startsWith(`${home}/`);
  });
  const ancestors = [...selected].reverse();
  const expectedPaths: string[] = [];
  if (current !== home) {
    const segments = current.slice(home.length + 1).split('/');
    for (let index = 0; index < segments.length; index++) {
      expectedPaths.push(index ? `${home}/${segments.slice(0, index).join('/')}` : home);
    }
  }
  const items = [...ancestors, contextItem];
  if (ancestors.length !== expectedPaths.length ||
    ancestors.some((item, index) => !item.id || !item.path || normalizedPath(item.path) !== expectedPaths[index]) ||
    new Set(items.map((item) => item.id)).size !== items.length) return failed('incomplete-chain');
  for (const item of items) {
    if (!contextBreadcrumbLabel(item)) return failed('missing-title');
  }
  for (const item of ancestors) {
    const url = item.url?.path;
    if (!url || !url.startsWith('/') || url.startsWith('//') || /[\s\\]/.test(url)) return failed('invalid-url');
    // Normalize only for validation; keep the native link and its query/anchor intact.
    let pathname: string;
    try {
      pathname = new URL(url, 'https://www.allianzlife.com').pathname;
    } catch {
      return failed('invalid-url');
    }
    if (/^\/(?:api|sitecore|login|account|portal)(?:\/|$)/i.test(pathname)) return failed('invalid-url');
  }
  // Validate the full native chain before applying its display exclusions.
  const exclusions = items.map(excludedFromBreadcrumbs);
  if (exclusions.some((excluded) => excluded === undefined)) return failed('invalid-navigation-filter');
  return { items: items.filter((item, index) => item === contextItem ||
    normalizedPath(item.path!) === home || !exclusions[index]) };
}
