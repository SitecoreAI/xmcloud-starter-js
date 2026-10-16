import type { LinkField } from '@sitecore-content-sdk/nextjs';
import type { AllianzProps } from 'lib/allianz-fields';

/** heading is the mobile caption; primaryNav is an ordered native Treelist. */
export type AllianzParticipantNavigationProps = AllianzProps;

const itemId = (value?: string) => value?.replace(/[{}-]/g, '').toLowerCase();
const pathKey = (value: string) => {
  if (!value || /[\u0000-\u0020\\]/.test(value) || value.startsWith('#') || value.startsWith('?')) return '';
  try {
    const url = new URL(value, 'https://www.allianzlife.com');
    if (url.origin !== 'https://www.allianzlife.com' || url.username || url.password) return '';
    return url.pathname.replace(/\/$/, '').toLowerCase() || '/';
  }
  catch { return ''; }
};

/** Native item identity works in Pages/Preview; exact URL works for fixture navigation. */
export function isCurrentParticipantLink(field: LinkField | undefined, currentId?: string, currentPath = '') {
  if (!pathKey(field?.value?.href ?? '')) return false;
  const targetId = typeof field?.value?.id === 'string' ? itemId(field.value.id) : undefined;
  if (targetId && currentId) return targetId === itemId(currentId);
  return !!field?.value?.href && !!currentPath && pathKey(field.value.href) === pathKey(currentPath);
}

export function participantCurrentPath(pathname: string, siteName?: string, locale?: string) {
  const prefix = siteName && locale ? `/${siteName}/${locale}` : '';
  return prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`)) ? pathname.slice(prefix.length) || '/' : pathname;
}
