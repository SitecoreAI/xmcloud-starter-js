import type { Field, ImageField, LinkField, LinkProps } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from './component-props';
import publicRouteIndex from '../../content/public-route-index.json';
import approvedSourceLinks from './approved-source-external-links.fixture.json';
import { isConnected } from './allianz-content-mode';
import { isVerifiedContentHubDocumentLink } from './allianz-verified-documents';
import { originalSourceAliasHref } from './allianz-source-aliases';

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
// These captured source destinations are explicitly approved external links.
// Extend the evidence-backed list for a new source URL rather than a domain policy.
const APPROVED_SOURCE_LINKS = new Set(approvedSourceLinks.entries.map(({ url }) => url));
// These two temporary About source fallbacks now have verified rendered local
// destinations (public QA 2026-10-27). Keep other exact exceptions, including
// the separately held Culture destination, unchanged.
const VERIFIED_LOCAL_SOURCE_LINKS = new Set([
  'https://www.allianzlife.com/about/executives',
  'https://www.allianzlife.com/about/newsroom',
]);

// Native document links stay on this approved CMS delivery origin. The QA
// examples are evidence only: ordinary authored media replacements need no ID list.
const NATIVE_DOCUMENT_ORIGIN = 'https://xmc-sitecoresaaef4e-thltmnpdemof1fc-devdd6f.sitecorecloud.io';
const NATIVE_DOCUMENT_PREFIX = '/-/media/Project/Allianz-Life/Documents/';
// This published Essential brochure was verified against its native PDF bytes.
const VERIFIED_EDGE_DOCUMENT_ID = 'E74B58F0-8F94-4A52-8765-9BEF4D3EF758';
const VERIFIED_EDGE_DOCUMENT_URL = 'https://edge.sitecorecloud.io/sitecoresaaef4e-thltmnpdemof1fc-devdd6f-106b/media/Project/Allianz-Life/Documents/CB61892.pdf';
// Only these three tracked sales PDFs have verified public payloads.
// Other native documents remain held until their delivery is verified.
const VERIFIED_SALES_EDGE_DOCUMENTS = new Map([
  ['394C17306F9B45B082E686DE9A870F19', 'AMK-496.pdf'],
  ['584775856E1B4F938108B1E8E3361A8D', 'AMK-501.pdf'],
  ['A8F20CD821A04F569E3B5828CAC83BC9', 'AMK-488.pdf'],
]);
const VERIFIED_EDGE_DOCUMENT_ROOT = VERIFIED_EDGE_DOCUMENT_URL.slice(0, VERIFIED_EDGE_DOCUMENT_URL.lastIndexOf('/') + 1);
function isNativeDocumentLink(field: LinkField, url: URL, sourceBase: string, querystring: string) {
  const id = field.value.id;
  if (field.value.linktype !== 'media' || typeof id !== 'string' ||
    !/^(?:\{[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.test(id)) return false;
  if (id.replace(/^\{|\}$/g, '').toUpperCase() === VERIFIED_EDGE_DOCUMENT_ID &&
    field.value.href === VERIFIED_EDGE_DOCUMENT_URL && !querystring &&
    !field.value.querystring && !field.value.anchor) return true;
  const salesDocument = VERIFIED_SALES_EDGE_DOCUMENTS.get(id.replace(/[{}-]/g, '').toUpperCase());
  if (salesDocument && field.value.href === `${VERIFIED_EDGE_DOCUMENT_ROOT}${salesDocument}` &&
    !querystring && !field.value.querystring && !field.value.anchor) return true;
  if (url.origin !== NATIVE_DOCUMENT_ORIGIN || url.protocol !== 'https:' ||
    url.username || url.password || url.port || sourceBase !== `${url.origin}${url.pathname}` ||
    !url.pathname.startsWith(NATIVE_DOCUMENT_PREFIX) || field.value.href?.includes('#') || field.value.anchor ||
    !/^(?:ttc=[0-9]+&tt=[0-9a-fA-F]{32}|tt=[0-9a-fA-F]{32}&ttc=[0-9]+)$/.test(querystring)) return false;
  const segments = url.pathname.slice(NATIVE_DOCUMENT_PREFIX.length).split('/');
  if (!/^.+\.pdf$/i.test(segments.at(-1) ?? '')) return false;
  return segments.every((segment) => {
    try {
      const name = decodeURIComponent(segment);
      // Permit canonical spaces/Unicode names, while rejecting encoded traversal,
      // separators, double encoding, control characters and alternate encodings.
      return name !== '.' && name !== '..' && /^[\p{L}\p{M}\p{N} ._-]+$/u.test(name) &&
        encodeURIComponent(name) === segment;
    } catch { return false; }
  });
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
  // Source legal copy sometimes omits the scheme on the exact public home URL.
  // Recognize only that hostname root; paths, lookalikes and other schemes retain the existing policy.
  const sourceHref = /^www\.allianzlife\.com\/?(?:[?#]|$)/i.test(href) ? `https://${href}` : href;
  let url: URL;
  try { url = new URL(sourceHref, 'https://www.allianzlife.com'); }
  catch { return unavailable(); }
  // Historical official HTTP URLs become local demo paths, never HTTP requests.
  // Keep this exact-host exception free of ports, credentials and duplicate-slash redirects.
  const isOfficialHttp = /^http:\/\/www\.allianzlife\.com(?:[/?#]|$)/i.test(href) &&
    url.origin === 'http://www.allianzlife.com' && !url.pathname.includes('//');
  const isPublic = (url.origin === 'https://www.allianzlife.com' || isOfficialHttp) && !url.username && !url.password &&
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
  const sourceBase = href.split(/[?#]/, 1)[0];
  const sourceDestination = `${sourceBase}${querystring ? `?${querystring}` : ''}${anchor ? `#${anchor}` : ''}`;
  if (isNativeDocumentLink(field, url, sourceBase, querystring)) {
    return { ...field, value: { ...field.value, href: sourceBase, querystring, anchor: '' } };
  }
  if (isVerifiedContentHubDocumentLink(field)) {
    return { ...field, value: { ...field.value, href: sourceBase, querystring, anchor: '' } };
  }
  const originalAlias = originalSourceAliasHref(url.pathname);
  if (!isUnavailable && isPublic && originalAlias) {
    return { ...field, value: { ...field.value, href: originalAlias, querystring, anchor } };
  }
  const linkType = field.value.linktype?.toLowerCase();
  const isSourceExternal = linkType === 'external' || (!linkType && !field.value.id);
  if (!isUnavailable && isSourceExternal && APPROVED_SOURCE_LINKS.has(sourceDestination) && !VERIFIED_LOCAL_SOURCE_LINKS.has(sourceDestination)) {
    return { ...field, value: { ...field.value, href: sourceBase, querystring, anchor } };
  }
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
      // Internal page navigation stays in the current browsing context. Native
      // document/download links and retained external-source exceptions return
      // above or keep their authored target. Do not intercept modifier clicks.
      ...(field.value.target && field.value.target.toLowerCase() !== '_self' &&
        !/\.(?:pdf|docx?|xlsx?|pptx?|csv|zip|mp4|mp3)$/i.test(url.pathname) &&
        !Object.hasOwn(field.value, 'download') ? { target: '' } : {}),
    },
  };
}

/** Both SDK renderers accept rel as a Link prop, rather than a field value. */
export function safeLinkRenderProps(field?: LinkField, isEditing = false): Pick<LinkProps, 'field' | 'rel'> {
  const normalized = isEditing && field ? field : safeLink(field);
  const authoredRel = normalized.value?.rel;
  const rel = typeof authoredRel === 'string' ? authoredRel : undefined;
  if (!normalized.value?.href || normalized.value.target?.toLowerCase() !== '_blank') {
    return { field: normalized, ...(rel === undefined ? {} : { rel }) };
  }
  const tokens = (rel ?? '').split(/\s+/).filter(Boolean);
  const existing = new Set(tokens.map((token) => token.toLowerCase()));
  return {
    field: normalized,
    rel: [...tokens, ...['noopener', 'noreferrer'].filter((token) => !existing.has(token))].join(' '),
  };
}
