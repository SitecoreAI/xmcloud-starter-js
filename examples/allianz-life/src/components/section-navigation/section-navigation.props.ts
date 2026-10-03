import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import {
  normalizeSectionNavigationId, validSectionNavigationUrl, type AutomaticSectionNavigation, type SectionNavigationPage,
} from 'lib/section-navigation-data';

export type SectionNavigationProps = Omit<ComponentProps, 'params'> & { params?: { RenderingIdentifier?: string } };
export type SectionNavigationComponentData = { automaticSectionNavigation?: AutomaticSectionNavigation };
/** Generic section intro chrome, deliberately separate from the owning root's native caption. */
export const SECTION_NAVIGATION_OVERVIEW: Field<string> = { value: 'Overview' };
export interface SectionNavigationData {
  root?: SectionNavigationPage;
  items: SectionNavigationPage[];
  currentId?: string;
  issue?: 'incomplete-navigation' | 'missing-title' | 'invalid-url' | 'invalid-current';
}

export function sectionNavigationLink(item: SectionNavigationPage, caption = item.navigationTitle?.jsonValue?.value ?? ''): LinkField | undefined {
  return validSectionNavigationUrl(item.url?.path) ? { value: { href: item.url.path, text: caption, linktype: 'internal' } } : undefined;
}

/** Derived chrome retains native Field objects and exact complete server order. */
export function sectionNavigationData(data?: AutomaticSectionNavigation, isEditing = false): SectionNavigationData {
  const failed = (issue: SectionNavigationData['issue']): SectionNavigationData => ({ items: [], issue });
  if (!data || data.complete !== true || data.status !== 'ready' || data.error || !data.root ||
    !Array.isArray(data.items) || !normalizeSectionNavigationId(data.root.id) ||
    data.items.some((item) => !normalizeSectionNavigationId(item?.id))) return failed('incomplete-navigation');
  const ids = [data.root, ...data.items].map((item) => normalizeSectionNavigationId(item.id));
  if (new Set(ids).size !== ids.length) return failed('incomplete-navigation');
  if (!normalizeSectionNavigationId(data.currentId)) return failed('invalid-current');
  for (const item of [data.root, ...data.items]) {
    const field = item.navigationTitle?.jsonValue;
    if (!field || typeof field.value !== 'string' || (!isEditing && !field.value.trim())) return failed('missing-title');
    if (!sectionNavigationLink(item)) return failed('invalid-url');
  }
  return { root: data.root, items: data.items, currentId: data.currentId };
}
