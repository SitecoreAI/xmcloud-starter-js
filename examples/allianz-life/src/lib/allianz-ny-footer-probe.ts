import { createHash } from 'node:crypto';

/** Server-only projection. Never serialize input values or pass this module to a client component. */
type RouteCategory = 'home' | 'about' | 'annuities' | 'outside';
type VariantCategory = 'default' | 'missing' | 'other' | 'invalid';
type CountCategory = 'none' | 'one' | 'multiple';
type FailureCategory = 'invalid' | 'limited';
type LeafStatus = 'missing' | 'invalid' | 'ambiguous' | 'correct' | 'unavailable' | 'other' | 'empty';
type ViewStatus = 'complete' | 'partial' | 'missing' | 'ambiguous' | FailureCategory;
type LinkTypeCategory = 'external' | 'anchor' | 'missing' | 'other' | 'invalid';
type HrefCategory = 'missing' | 'empty' | 'correct' | 'unavailable' | 'other' | 'invalid';

export interface NyFooterProbeLeaf {
  readonly status: LeafStatus;
  readonly hrefCorrect: boolean;
  readonly hrefUnavailable: boolean;
  readonly unavailableAnchor: boolean;
  readonly anchorPresent: boolean;
  readonly queryPresent: boolean;
  readonly sameTab: boolean;
  readonly linkTypeCategory: LinkTypeCategory;
  readonly missingValueId: boolean;
  readonly sourceExternal: boolean;
  readonly topLevelHrefPresent: boolean;
  readonly topLevelHrefCategory: HrefCategory;
  readonly topLevelDestinationCorrect: boolean;
  readonly topLevelUnavailable: boolean;
}

export interface NyFooterProbeView {
  readonly status: ViewStatus;
  readonly footerCount: CountCategory;
  readonly defaultSelectionCount: CountCategory;
  readonly ancestorDefaultSelected: boolean;
  readonly footerDefaultSelected: boolean;
  readonly pimco: NyFooterProbeLeaf;
  readonly allianzGroup: NyFooterProbeLeaf;
}

export interface NyFooterProbeSummary {
  readonly schemaVersion: 1;
  readonly route: RouteCategory;
  readonly scope: 'allowed' | 'outside' | 'invalid';
  readonly variantDefault: boolean;
  readonly variantCategory: VariantCategory;
  readonly current: NyFooterProbeView;
  readonly effectiveDefault: NyFooterProbeView;
  /** SHA256 of this fixed projection only, never of CMS input or configuration. */
  readonly digest: string;
}

const ROUTES = new Map<string, { category: RouteCategory; id: string }>([
  ['/new-york', { category: 'home', id: '214d3628e161533797f72f74db7dd027' }],
  ['/new-york/about', { category: 'about', id: '44a05d23855849daa95ac586ac19189a' }],
  ['/new-york/annuities', { category: 'annuities', id: '98ab9d72554d453db8d7af46af20ab61' }],
]);
const FOOTER_ID = '1a13ff5e35dd44688b215c149140f127';
const PIMCO_ID = '3def0d8f31e34eeb9413de850d3d1b9f';
const GROUP_ID = 'a02bfa681c7743bcb745f4c0a05e740c';
const PIMCO_URL = 'https://www.pimco.com/us/en';
const GROUP_URL = 'https://www.allianz.com/en_GB.html';
const MAX_DEPTH = 16;
const MAX_RENDERINGS = 256;
const MAX_PLACEHOLDERS = 32;
const MAX_LIST = 64;

class ProjectionFailure {
  constructor(readonly category: FailureCategory) {}
}

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null ? value as RecordValue : undefined;
}

/** Inspect data properties only; even malformed input must not execute a getter. */
function own(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  if (!Object.hasOwn(descriptor, 'value')) throw new ProjectionFailure('invalid');
  return descriptor.value;
}

function requiredRecord(value: unknown): RecordValue {
  const result = record(value);
  if (!result) throw new ProjectionFailure('invalid');
  return result;
}

function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new ProjectionFailure('invalid');
  const length = own(value, 'length');
  if (typeof length !== 'number' || length > MAX_LIST) throw new ProjectionFailure('limited');
  return Array.from({ length }, (_, index) => own(value, String(index)));
}

function guid(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const unwrapped = value.startsWith('{') && value.endsWith('}') ? value.slice(1, -1) : value;
  if (!/^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(unwrapped)) return undefined;
  return unwrapped.replaceAll('-', '').toLowerCase();
}

const count = (value: number): CountCategory => value === 0 ? 'none' : value === 1 ? 'one' : 'multiple';
const absentLeaf = (status: LeafStatus): NyFooterProbeLeaf => Object.freeze({
  status, hrefCorrect: false, hrefUnavailable: false, unavailableAnchor: false,
  anchorPresent: false, queryPresent: false, sameTab: false,
  linkTypeCategory: 'invalid', missingValueId: false, sourceExternal: false,
  topLevelHrefPresent: false, topLevelHrefCategory: 'invalid',
  topLevelDestinationCorrect: false, topLevelUnavailable: false,
});

function scalar(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new ProjectionFailure('invalid');
  return value;
}

function projectLink(item: RecordValue, expected: string): NyFooterProbeLeaf {
  const link = record(own(item, 'link'));
  if (!link) return absentLeaf('missing');
  const jsonValue = record(own(link, 'jsonValue'));
  if (!jsonValue) return absentLeaf('invalid');
  const value = record(own(jsonValue, 'value'));
  if (!value) return absentLeaf('invalid');
  const href = scalar(own(value, 'href'));
  const anchor = scalar(own(value, 'anchor'));
  const query = scalar(own(value, 'querystring'));
  const target = scalar(own(value, 'target'));
  const linkType = scalar(own(value, 'linktype')).toLowerCase();
  const valueId = own(value, 'id');
  if (valueId !== undefined && valueId !== null && typeof valueId !== 'string') throw new ProjectionFailure('invalid');
  const missingValueId = valueId === undefined || valueId === null || valueId === '';
  const linkTypeCategory: LinkTypeCategory = linkType === 'external' ? 'external'
    : linkType === 'anchor' ? 'anchor' : linkType === '' ? 'missing' : 'other';
  // Mirror safeLink's external-source eligibility rather than accepting href alone.
  const sourceExternal = linkType === 'external' || (linkType === '' && missingValueId);
  const hrefCorrect = href === expected;
  const hrefUnavailable = /#(?:demo|service)-unavailable$/.test(href);
  const unavailableAnchor = /^(?:#)?(?:demo|service)-unavailable$/.test(anchor);
  const sameTab = target === '' || target === '_self';
  const topHrefValue = own(jsonValue, 'href');
  const topHref = scalar(topHrefValue);
  const topLevelHrefPresent = topHref !== '';
  const topLevelHrefCategory: HrefCategory = topHrefValue === undefined ? 'missing'
    : topHref === '' ? 'empty' : topHref === expected ? 'correct'
      : /#(?:demo|service)-unavailable$/.test(topHref) ? 'unavailable' : 'other';
  // Both SDK Link implementations prefer a truthy field.href over field.value.href.
  // Inspect the shadowing field's attributes only when that branch is active.
  const topAnchor = topLevelHrefPresent ? scalar(own(jsonValue, 'anchor')) : '';
  const topQuery = topLevelHrefPresent ? scalar(own(jsonValue, 'querystring')) : '';
  const topTarget = topLevelHrefPresent ? scalar(own(jsonValue, 'target')) : '';
  const topLevelUnavailable = topLevelHrefPresent && (topLevelHrefCategory === 'unavailable' ||
    /^(?:#)?(?:demo|service)-unavailable$/.test(topAnchor));
  const topLevelDestinationCorrect = topLevelHrefPresent && topHref === expected &&
    topAnchor === '' && topQuery === '' && (topTarget === '' || topTarget === '_self');
  const status: LeafStatus = hrefUnavailable || unavailableAnchor || topLevelUnavailable ? 'unavailable'
    : hrefCorrect && anchor === '' && query === '' && sameTab && sourceExternal &&
      (!topLevelHrefPresent || topLevelDestinationCorrect) ? 'correct'
      : href === '' ? 'empty' : 'other';
  return Object.freeze({ status, hrefCorrect, hrefUnavailable, unavailableAnchor,
    anchorPresent: anchor !== '', queryPresent: query !== '', sameTab,
    linkTypeCategory, missingValueId, sourceExternal, topLevelHrefPresent,
    topLevelHrefCategory, topLevelDestinationCorrect, topLevelUnavailable });
}

function projectLeaves(datasource: RecordValue) {
  const primary = record(own(datasource, 'primaryNav'));
  const matches: Record<string, RecordValue[]> = { pimco: [], allianzGroup: [] };
  if (!primary) return { pimco: absentLeaf('missing'), allianzGroup: absentLeaf('missing') };
  for (const groupValue of list(own(primary, 'targetItems'))) {
    const group = requiredRecord(groupValue);
    const childCollection = record(own(group, 'children'));
    if (!childCollection) throw new ProjectionFailure('invalid');
    for (const itemValue of list(own(childCollection, 'results'))) {
      const item = requiredRecord(itemValue);
      const id = guid(own(item, 'id'));
      if (id === PIMCO_ID) matches.pimco.push(item);
      if (id === GROUP_ID) matches.allianzGroup.push(item);
    }
  }
  const leaf = (items: RecordValue[], expected: string): NyFooterProbeLeaf => items.length > 1
    ? absentLeaf('ambiguous') : items.length === 0 ? absentLeaf('missing') : projectLink(items[0], expected);
  return { pimco: leaf(matches.pimco, PIMCO_URL), allianzGroup: leaf(matches.allianzGroup, GROUP_URL) };
}

interface FooterMatch {
  datasource: RecordValue;
  ancestorDefaultSelected: boolean;
  footerDefaultSelected: boolean;
}

function emptyView(status: ViewStatus, footerCount: CountCategory = 'none', defaults = 0): NyFooterProbeView {
  const leafStatus = status === 'ambiguous' ? 'ambiguous' : status === 'invalid' || status === 'limited' ? 'invalid' : 'missing';
  return Object.freeze({ status, footerCount, defaultSelectionCount: count(defaults),
    ancestorDefaultSelected: false, footerDefaultSelected: false,
    pimco: absentLeaf(leafStatus), allianzGroup: absentLeaf(leafStatus) });
}

/** Follow only placeholder arrays and the SDK's exact _default experience selection. */
function projectView(placeholders: unknown, effectiveDefault: boolean): NyFooterProbeView {
  const matches: FooterMatch[] = [];
  const stack = new WeakSet<object>();
  let visited = 0;
  let defaults = 0;
  function walkPlaceholders(value: unknown, depth: number, ancestorDefaultSelected: boolean): void {
    if (value === undefined) return;
    if (depth > MAX_DEPTH) throw new ProjectionFailure('limited');
    const map = requiredRecord(value);
    const names = Object.keys(map);
    if (names.length > MAX_PLACEHOLDERS) throw new ProjectionFailure('limited');
    for (const name of names) for (const rendering of list(own(map, name))) walkRendering(rendering, depth, ancestorDefaultSelected);
  }
  function walkRendering(value: unknown, depth: number, ancestorDefaultSelected: boolean): void {
    const original = requiredRecord(value);
    if (++visited > MAX_RENDERINGS) throw new ProjectionFailure('limited');
    if (stack.has(original)) throw new ProjectionFailure('invalid');
    stack.add(original);
    try {
      let rendering = original;
      const originalName = own(original, 'componentName');
      const experiences = own(original, 'experiences');
      let selected = false;
      if (experiences !== undefined) {
        const variants = requiredRecord(experiences);
        const defaultValue = own(variants, '_default');
        if (effectiveDefault) {
          if (defaultValue) {
            rendering = requiredRecord(defaultValue);
            if (rendering === original) throw new ProjectionFailure('invalid');
            selected = true;
            defaults += 1;
            if (own(rendering, 'componentName') === null && own(rendering, 'dataSource') === null) return;
          } else if (!originalName) return;
        }
      }
      const name = own(rendering, 'componentName');
      if (name === 'AllianzLegacyFooter') {
        const fields = requiredRecord(own(rendering, 'fields'));
        const data = requiredRecord(own(fields, 'data'));
        const datasource = requiredRecord(own(data, 'datasource'));
        if (guid(own(datasource, 'id')) === FOOTER_ID) {
          const explicitOwner = own(rendering, 'dataSource');
          if (guid(explicitOwner) && guid(explicitOwner) !== FOOTER_ID) throw new ProjectionFailure('invalid');
          matches.push({ datasource, ancestorDefaultSelected,
            footerDefaultSelected: selected && originalName === 'AllianzLegacyFooter' });
        }
      }
      walkPlaceholders(own(rendering, 'placeholders'), depth + 1, ancestorDefaultSelected || selected);
    } finally {
      stack.delete(original);
    }
  }
  try {
    walkPlaceholders(placeholders, 0, false);
    if (matches.length !== 1) return emptyView(matches.length ? 'ambiguous' : 'missing', count(matches.length), defaults);
    const match = matches[0];
    const leaves = projectLeaves(match.datasource);
    const ambiguous = leaves.pimco.status === 'ambiguous' || leaves.allianzGroup.status === 'ambiguous';
    if (ambiguous) return emptyView('ambiguous', 'one', defaults);
    const invalid = leaves.pimco.status === 'invalid' || leaves.allianzGroup.status === 'invalid';
    if (invalid) return emptyView('invalid', 'one', defaults);
    const partial = leaves.pimco.status === 'missing' || leaves.allianzGroup.status === 'missing';
    return Object.freeze({ status: partial ? 'partial' : 'complete', footerCount: 'one',
      defaultSelectionCount: count(defaults), ancestorDefaultSelected: match.ancestorDefaultSelected,
      footerDefaultSelected: match.footerDefaultSelected, ...leaves });
  } catch (error) {
    return emptyView(error instanceof ProjectionFailure ? error.category : 'invalid');
  }
}

function finish(summary: Omit<NyFooterProbeSummary, 'digest'>): NyFooterProbeSummary {
  const digest = createHash('sha256').update(JSON.stringify(summary)).digest('hex');
  return Object.freeze({ ...summary, digest });
}

/** Pure, detached allowlisted projection; never logs, fetches, invokes input methods, or emits raw IDs/strings. */
export function summarizeNyFooterProbe(input: unknown, routePath: unknown): NyFooterProbeSummary {
  const outside = (): NyFooterProbeSummary => finish({ schemaVersion: 1, route: 'outside', scope: 'outside',
    variantDefault: false, variantCategory: 'missing', current: emptyView('missing'), effectiveDefault: emptyView('missing') });
  let allowed: { category: RouteCategory; id: string } | undefined;
  try {
    let path = routePath;
    if (Array.isArray(path)) path = `/${list(path).map(scalar).join('/')}`;
    if (typeof path !== 'string' || !(allowed = ROUTES.get(path))) return outside();
    const root = requiredRecord(input);
    const nestedLayout = own(root, 'layout');
    if (nestedLayout !== undefined && own(root, 'sitecore') !== undefined) throw new ProjectionFailure('invalid');
    const layout = nestedLayout === undefined ? root : requiredRecord(nestedLayout);
    const sitecore = requiredRecord(own(layout, 'sitecore'));
    const route = requiredRecord(own(sitecore, 'route'));
    if (guid(own(route, 'itemId')) !== allowed.id) throw new ProjectionFailure('invalid');
    const context = own(sitecore, 'context');
    const variant = context === undefined ? undefined : own(requiredRecord(context), 'variantId');
    const variantCategory: VariantCategory = variant === undefined || variant === '' ? 'missing'
      : typeof variant !== 'string' ? 'invalid' : variant === '_default' ? 'default' : 'other';
    if (variantCategory === 'invalid') throw new ProjectionFailure('invalid');
    const placeholders = own(route, 'placeholders');
    return finish({ schemaVersion: 1, route: allowed.category, scope: 'allowed',
      variantDefault: variantCategory === 'default', variantCategory,
      current: projectView(placeholders, false), effectiveDefault: projectView(placeholders, true) });
  } catch (error) {
    const status = error instanceof ProjectionFailure ? error.category : 'invalid';
    return finish({ schemaVersion: 1, route: allowed?.category ?? 'outside', scope: 'invalid',
      variantDefault: false, variantCategory: 'invalid', current: emptyView(status), effectiveDefault: emptyView(status) });
  }
}
