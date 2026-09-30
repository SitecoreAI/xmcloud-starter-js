import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from './component-props';
import publicRouteIndex from '../../content/public-route-index.json';

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
  let url: URL;
  try { url = new URL(href.replace(/%23/gi, '#') || '#', 'https://www.allianzlife.com'); }
  catch { return { ...field, value: { ...field.value, href: '#service-unavailable', target: '', title: 'This service is unavailable' } }; }
  const isPublic = url.hostname === 'www.allianzlife.com' &&
    !/^\/(?:new-york\/)?(login|registration|spa|account|portal|secured|logout|manageuserprofile|api|sitecore)(\/|$)/i.test(url.pathname);
  const path = (() => { try { return decodeURIComponent(url.pathname).toLowerCase().replace(/\/$/, '') || '/'; } catch { return ''; } })();
  const fixtureRouteAvailable = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE === 'connected' ||
    path in publicRouteIndex || /^\/allianz-(?:legacy-)?assets\//.test(path);
  const canNavigate = isPublic && fixtureRouteAvailable;
  const isLocalAnchor = href.startsWith('#');
  const isUnavailable = /#(?:demo|service)-unavailable/.test(href);
  return {
    ...field,
    value: {
      ...field.value,
      href: isUnavailable ? '#service-unavailable' : isLocalAnchor ? href : canNavigate ? `${url.pathname}${url.search}${url.hash}` : '#service-unavailable',
      target: '',
      ...(isUnavailable || (!canNavigate && !isLocalAnchor) ? { title: 'This service is unavailable' } : {}),
    },
  };
}
