import type { Field } from '@sitecore-content-sdk/nextjs';

type RouteIdentityFields = Record<string, unknown> | undefined;

export const CASH_DEMO_LINK_NOTICE = 'Fund-selection and external reference links are not configured in this demo. Captured Daily Details and holdings documents are available below.';
export const CASH_EQUIVALENT_PATHS = [
  '/what-we-offer/annuities/investment-strategies/cash-equivalent',
  '/new-york/annuities/investment-strategies/cash-equivalent',
] as const;

/** Exact public routes plus native source identity; copied fields cannot widen scope. */
export function isCashEquivalentPage(fields: RouteIdentityFields, pathname: string | null | undefined): boolean {
  const path = pathname?.toLowerCase()
    .replace(/^\/sitecore\/content\/allianz\/allianz-life\/home(?=\/)/, '')
    .replace(/^\/allianz-life\/en(?=\/)/, '').replace(/\/$/, '');
  if (!CASH_EQUIVALENT_PATHS.some((allowed) => allowed === path)) return false;
  const value = (name: string) => (fields?.[name] as Field<string> | undefined)?.value;
  const market = value('legacySharedKey');
  const classes = value('sourceBodyClasses');
  return value('shellFamily') === 'legacy' && value('sourceBodyId') === 'page-cash-equivalent' &&
    market === (path?.startsWith('/new-york/') ? 'new-york' : 'allianz-life') && typeof classes === 'string' &&
    classes.split(/\s+/).includes('page-cash-equivalent') &&
    (market !== 'new-york' || classes.split(/\s+/).includes('new-york'));
}

/** Visitor adaptation only. Keep source HTML and SDK authoring metadata intact. */
export function cashEquivalentDemoBody(field: Field<string> | undefined, enabled: boolean) {
  if (!enabled || !field?.value) return { field, showNotice: false };
  let showNotice = false;
  const value = field.value.replace(/<a\b((?:[^'">]|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/a\s*>/gi, (anchor, attrs: string, content: string) => {
    const href = attrs.match(/\s+href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const destination = (href?.[1] ?? href?.[2] ?? href?.[3] ?? '').toLowerCase();
    if (!['#', '#demo-unavailable', '#service-unavailable'].includes(destination)) return anchor;
    if (destination === '#') showNotice = true;
    return `<span class="allianz-cash-demo-reference">${content}</span>`;
  });
  return { field: value === field.value ? field : { ...field, value }, showNotice };
}
