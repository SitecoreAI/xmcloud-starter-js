import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ContextBreadcrumbItem {
  id?: string;
  path?: string;
  navigationTitle?: { jsonValue?: Field<string> };
  url?: { path?: string };
}

export interface ContextBreadcrumbPage extends ContextBreadcrumbItem {
  ancestors?: ContextBreadcrumbItem[] | null;
}

export type AllianzContextBreadcrumbsProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { contextItem?: ContextBreadcrumbPage | null } };
};

// Verified content boundary for this site's native ancestor query. Titles and
// links always come from native fields, never from these path segments.
const allianzHomePath = '/sitecore/content/allianz/allianz-life/Home';
const normalizedPath = (value: string) => value.replace(/\/+$/, '').toLowerCase();

export interface ContextBreadcrumbTrail {
  items: ContextBreadcrumbItem[];
  issue?: 'missing-context' | 'outside-site' | 'incomplete-chain' | 'missing-title' | 'invalid-url';
}

/** Verify the complete structural ancestor trail without manufacturing copy. */
export function contextBreadcrumbTrail(contextItem?: ContextBreadcrumbPage | null, isEditing = false): ContextBreadcrumbTrail {
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
    const field = item.navigationTitle?.jsonValue;
    if (!field || typeof field.value !== 'string' || (!isEditing && !field.value.trim())) return failed('missing-title');
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
  return { items };
}
