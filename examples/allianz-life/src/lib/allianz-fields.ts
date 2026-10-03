import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from './component-props';
import publicRouteIndex from '../../content/public-route-index.json';
import { isConnected } from './allianz-content-mode';

/** Native integrated GraphQL field shape, shared by Edge and local fixtures. */
export type JsonField<T> = { jsonValue?: T };
export type TextValue = JsonField<Field<string>>;
export type ImageValue = JsonField<ImageField>;
export type LinkValue = JsonField<LinkField>;
export interface NavigationItem {
  id: string;
  title?: TextValue;
  link?: LinkValue;
  icon?: ImageValue;
  children?: { results: NavigationItem[] };
}
export interface ContentEntry {
  id: string;
  heading?: TextValue;
  date?: TextValue;
  color?: TextValue;
  body?: TextValue;
  summary?: TextValue;
  subheading?: TextValue;
  image?: ImageValue;
  icon?: ImageValue;
  iconTheme?: TextValue;
  theme?: TextValue;
  headingLevel?: TextValue;
  alphanumeral?: TextValue;
  link?: LinkValue;
  links?: { targetItems: NavigationItem[] };
}
export interface AllianzDatasource {
  heading?: TextValue;
  rate?: TextValue;
  asOf?: TextValue;
  tagline?: TextValue;
  body?: TextValue;
  summary?: TextValue;
  subheading?: TextValue;
  eyebrow?: TextValue;
  desktopImage?: ImageValue;
  mobileImage?: ImageValue;
  primaryLink?: LinkValue;
  secondaryLink?: LinkValue;
  logo?: ImageValue;
  copyright?: TextValue;
  link?: LinkValue;
  primaryNav?: { targetItems: NavigationItem[] };
  utilityNav?: { targetItems: NavigationItem[] };
  socialNav?: { targetItems: NavigationItem[] };
  children?: { results: ContentEntry[] };
}
export type AllianzProps = ComponentProps & {
  fields?: { data?: { datasource?: AllianzDatasource } };
};

const THEMES = ['transparent', 'blue-soft', 'grey-muted', 'white', 'green-soft', 'grey-soft', 'purple-soft', 'yellow-soft', 'primary-white', 'red-soft'];
export function sectionTheme(theme?: string) {
  return `t-bg-${THEMES.includes(theme ?? '') ? theme : 'transparent'}`;
}
export function sectionSpacing(spacing?: string) {
  return ['sm', 'md', 'lg', 'xl'].includes(spacing ?? '')
    ? `u-padding-top-${spacing} u-padding-bottom-${spacing}`
    : '';
}
export function rowSpacing(params: Record<string, string | undefined>) {
  return (['paddingTop', 'paddingBottom', 'marginBottom'] as const).map((key) => {
    const val = params[key];
    if (!['sm','md','lg','xl'].includes(val ?? '')) return '';
    const prefix = key === 'marginBottom' ? 'u-margin-bottom-' : key === 'paddingTop' ? 'u-padding-top-' : 'u-padding-bottom-';
    return `${prefix}${val}`;
  }).filter(Boolean).join(' ') || sectionSpacing(params.spacing);
}
export function headingTag(level?: string): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
  return level === 'h1' || level === 'h3' || level === 'h4' || level === 'h5' || level === 'h6' ? level : 'h2';
}
export function safeLink(field?: LinkField): LinkField {
  if (!field) return { value: { href: '' } };
  const href = field.value?.href ?? '';
  // A cleared native field must stay cleared, including its authoring metadata.
  if (!href) return field;
  const unavailable = () => ({
    ...field,
    value: { ...field.value, href: '#service-unavailable', querystring: '', anchor: '', target: '', title: 'This service is unavailable' },
  });
  let url: URL;
  try { url = new URL(href, 'https://www.allianzlife.com'); }
  catch { return unavailable(); }
  const isPublic = url.origin === 'https://www.allianzlife.com' && !url.username && !url.password &&
    !/^\/(?:new-york\/)?(login|registration|spa|account|portal|secured|logout|manageuserprofile|api|sitecore)(\/|$)/i.test(url.pathname);
  const path = (() => { try { return decodeURIComponent(url.pathname).toLowerCase().replace(/\/$/, '') || '/'; } catch { return ''; } })();
  const fixtureRouteAvailable = isConnected() ||
    Object.hasOwn(publicRouteIndex, path) || /^\/allianz-(?:legacy-)?assets\//.test(path) || path === '/search';
  const canNavigate = isPublic && !!path && !/%(?:2f|5c)/i.test(url.pathname) && fixtureRouteAvailable &&
    !/^\/(?:new-york\/)?(login|registration|spa|account|portal|secured|logout|manageuserprofile|api|sitecore)(\/|$)/i.test(path);
  const isLocalAnchor = href.startsWith('#');
  const isQueryOnly = href.startsWith('?');
  const nativeQuery = field.value.querystring?.replace(/^\?/, '') || '';
  const hrefQuery = url.search.slice(1);
  // Preserve encoded values, repeated keys and ordering. Do not decode %23 in
  // query values: it is data, not a fragment delimiter.
  const querystring = hrefQuery && nativeQuery && hrefQuery !== nativeQuery
    ? `${hrefQuery}&${nativeQuery}` : nativeQuery || hrefQuery;
  const anchor = field.value.anchor?.replace(/^#/, '') || url.hash.slice(1);
  const isUnavailable = [anchor, url.hash.slice(1)].some((value) => /^(?:demo|service)-unavailable$/.test(value));
  if (isUnavailable || (!canNavigate && !isLocalAnchor)) return unavailable();
  return {
    ...field,
    value: {
      ...field.value,
      // Installed SDK Next Link accepts href as pathname and reads query/hash
      // from these separate attributes. Anchor/query-only links use its React
      // anchor fallback, where the full same-page URL belongs in href.
      href: isLocalAnchor ? `${nativeQuery ? `?${nativeQuery}` : ''}${href}` : isQueryOnly ? `?${querystring}${anchor ? `#${anchor}` : ''}` : url.pathname,
      querystring: isLocalAnchor || isQueryOnly ? '' : querystring,
      anchor: isLocalAnchor || isQueryOnly ? '' : anchor,
      target: '',
    },
  };
}
