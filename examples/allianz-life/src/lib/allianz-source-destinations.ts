import type { Field, LinkField, LinkProps } from '@sitecore-content-sdk/nextjs';

const SOURCE_ORIGIN = 'https://www.allianzlife.com';

// Owner IDs identify the captured source fields, never the link destination item.
const LINK_DESTINATIONS: Readonly<Record<string, string>> = {
  '5b186c8836a64df8b9100187d1bd7101': '/for-financial-professionals/Life-Sales-Tools/flexible-estate-planning-materials',
  '143dd9d8760c4ac589591c534360e51c': '/for-financial-professionals/Life-Sales-Tools/key-employee-compensation-materials',
  '5d51bc887cc84f159ed72598ee011858': '/for-financial-professionals/Life-Sales-Tools/essential-concepts',
  'b95a8d6917354b278c57e7bc71106800': '/what-we-offer/annuities/fixed-index-annuities/Benefit-Control-Plus/Rates',
  '6976acdff6d1420da80513e46b79fe4d': '/what-we-offer/annuities/fixed-index-annuities/Accumulation-Advantage-plus/Rates',
};

const RICH_TEXT_DESTINATIONS: Readonly<Record<string, string>> = {
  'c4f12d3c2db14cc98dbc1b6683ecf133': '/what-we-offer/Index-Lock',
  'fdedde9be38246eab0077164baecbf47': '/for-financial-professionals/Life-Sales-Tools/life-advanced-markets-turnkey-programs',
};

function normalizedOwnerId(ownerId: unknown): string {
  if (typeof ownerId !== 'string') return '';
  const id = ownerId.startsWith('{') && ownerId.endsWith('}') ? ownerId.slice(1, -1) : ownerId;
  return /^(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.test(id)
    ? id.replace(/-/g, '').toLowerCase() : '';
}

function isUnavailable(anchor: string): boolean {
  return /^(?:demo|service)-unavailable$/i.test(anchor);
}

function sourceDestination(href: string, path: string) {
  // Compare the raw base: URL parsing would normalize encoded/case/port variants.
  const base = href.split(/[?#]/, 1)[0];
  if (base !== path && base !== `${SOURCE_ORIGIN}${path}`) return undefined;
  const hashIndex = href.indexOf('#');
  const anchor = hashIndex < 0 ? '' : href.slice(hashIndex + 1);
  if (isUnavailable(anchor)) return undefined;
  const beforeHash = hashIndex < 0 ? href : href.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  return {
    href: `${SOURCE_ORIGIN}${path}`,
    suffix: href.slice(base.length),
    querystring: queryIndex < 0 ? '' : beforeHash.slice(queryIndex + 1),
    anchor,
  };
}

/** Visitor-only projection for five witnessed native General Link owners. */
export function sourceDestinationLinkField(
  field: LinkField | undefined,
  isEditing: boolean,
  ownerId: unknown
): LinkField | undefined {
  if (isEditing !== false || !field || typeof field.value?.href !== 'string' || !field.value.href) return undefined;
  const path = LINK_DESTINATIONS[normalizedOwnerId(ownerId)];
  if (!path) return undefined;
  const linkType = field.value.linktype?.toLowerCase();
  if (field.value.id || (linkType && linkType !== 'external')) return undefined;
  const destination = sourceDestination(field.value.href, path);
  const nativeAnchor = field.value.anchor?.replace(/^#/, '') || '';
  if (!destination || isUnavailable(nativeAnchor)) return undefined;
  const nativeQuery = field.value.querystring?.replace(/^\?/, '') || '';
  // Match safeLink's merge: preserve encoded values, repeats and authored order.
  const querystring = destination.querystring && nativeQuery && destination.querystring !== nativeQuery
    ? `${destination.querystring}&${nativeQuery}` : nativeQuery || destination.querystring;
  return {
    ...field,
    value: { ...field.value, href: destination.href, querystring, anchor: nativeAnchor || destination.anchor },
  };
}

/** Overlay after ordinary normalization so its local-route policy cannot undo the projection. */
export function restoreSourceDestinationLinkProps(
  props: Pick<LinkProps, 'field' | 'rel'>,
  original: LinkField | undefined,
  isEditing: boolean,
  ownerId: unknown
): Pick<LinkProps, 'field' | 'rel'> {
  const field = sourceDestinationLinkField(original, isEditing, ownerId);
  if (!field) return props;
  const authoredRel = field.value.rel;
  const rel = typeof authoredRel === 'string' ? authoredRel : undefined;
  const projected = { ...props, field, rel };
  if (field.value.target?.toLowerCase() !== '_blank') return projected;
  const tokens = (rel ?? '').split(/\s+/).filter(Boolean);
  const existing = new Set(tokens.map((token) => token.toLowerCase()));
  return {
    ...projected,
    rel: [...tokens, ...['noopener', 'noreferrer'].filter((token) => !existing.has(token))].join(' '),
  };
}

/** Restore only the real href attributes in the two witnessed Rich Text owners. */
export function restoreSourceDestinationRichText(
  field: Field<string> | undefined,
  isEditing: boolean,
  ownerId: unknown
): Field<string> | undefined {
  if (isEditing !== false || !field || !field.value) return field;
  const path = RICH_TEXT_DESTINATIONS[normalizedOwnerId(ownerId)];
  if (!path) return field;
  const value = field.value.replace(/<a\b(?:[^'">]|"[^"]*"|'[^']*')*>/gi, (tag) =>
    // Consume quoted attributes so href-looking title text cannot become a match.
    tag.replace(/^(<a\b(?:[^'">]|"[^"]*"|'[^']*')*?\s+href\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
      (attribute, prefix, doubleQuoted, singleQuoted, unquoted) => {
        const href = doubleQuoted ?? singleQuoted ?? unquoted;
        const destination = sourceDestination(href, path);
        if (!destination) return attribute;
        const quote = doubleQuoted !== undefined ? '"' : singleQuoted !== undefined ? "'" : '';
        return `${prefix}${quote}${destination.href}${destination.suffix}${quote}`;
      })
  );
  return value === field.value ? field : { ...field, value };
}
