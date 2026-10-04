import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';

export type InvestmentText = { jsonValue?: Field<string> };
export type InvestmentStatus = 'Active' | 'Exited';
export type InvestmentEntry = {
  id: string;
  parent?: { id: string };
  name?: InvestmentText;
  investmentStatus?: InvestmentText;
  details?: InvestmentText;
  logo?: { jsonValue?: ImageField };
  websiteLink?: { jsonValue?: LinkField };
};
/** Supply IDs returned by a verified native read. There are intentionally no placeholder defaults. */
export type InvestmentPortfolioBindings = {
  datasourceTemplateId: string;
  investmentTemplateId: string;
  siteName: string;
  siteRootPath: string;
};
export type InvestmentPortfolioScope = { rootId: string; datasourceId: string; language: string };
export type InvestmentPortfolioGetData = <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) => Promise<T>;
export type InvestmentPortfolioResult = {
  complete: boolean;
  active: InvestmentEntry[];
  exited: InvestmentEntry[];
  error?: 'unconfigured' | 'invalid-scope' | 'unavailable';
  failureStage?: 'scope-request' | 'scope-validation' | 'items-request' | 'items-validation' | 'selection-validation';
};
export type InvestmentPortfolioSearch = {
  complete: true;
  scope: InvestmentPortfolioScope;
  baseTemplateId: string;
  items: InvestmentEntry[];
};
export type InvestmentPortfolioScopeResponse = {
  root?: { id: string; path: string };
  datasource?: { id: string; parent?: { name: string; parent?: { id: string } } };
};
export const INVESTMENT_PORTFOLIO_PAGE_SIZE = 10;

export function normalizeInvestmentId(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}|\{[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\})$/i.test(value)) return undefined;
  return value.replace(/[{}-]/g, '').toLowerCase();
}
function checkedId(value: unknown): string {
  const id = normalizeInvestmentId(value);
  if (!id) throw new Error('Invalid investment portfolio ID');
  return id;
}
export function validInvestmentBindings(bindings?: InvestmentPortfolioBindings): bindings is InvestmentPortfolioBindings {
  return Boolean(bindings && normalizeInvestmentId(bindings.datasourceTemplateId) && normalizeInvestmentId(bindings.investmentTemplateId) &&
    typeof bindings.siteName === 'string' && bindings.siteName.trim() && typeof bindings.siteRootPath === 'string' &&
    /^\/sitecore\/content\/(?:[^/]+\/)*[^/]+$/i.test(bindings.siteRootPath) &&
    !bindings.siteRootPath.split('/').some((part) => part === '.' || part === '..'));
}
function checkedScope(scope: InvestmentPortfolioScope): InvestmentPortfolioScope {
  if (!scope || typeof scope.language !== 'string' || !/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(scope.language)) throw new Error('Invalid investment portfolio language');
  return { rootId: checkedId(scope.rootId), datasourceId: checkedId(scope.datasourceId), language: scope.language };
}
const literal = (value: string) => JSON.stringify(value);
export function unavailableInvestmentPortfolio(error: InvestmentPortfolioResult['error'] = 'unavailable'): InvestmentPortfolioResult {
  return { complete: false, active: [], exited: [], error };
}
export function buildInvestmentPortfolioScopeQuery(scope: InvestmentPortfolioScope): string {
  const { rootId, datasourceId, language } = checkedScope(scope);
  return `query InvestmentPortfolioScope {
    root: item(path: ${literal(rootId)}, language: ${literal(language)}) { id path }
    datasource: item(path: ${literal(datasourceId)}, language: ${literal(language)}) {
      id parent { name parent { id } }
    }
  }`;
}
/** Page-local datasource ownership makes the same component reusable on other pages of the bound site. */
export function validInvestmentPortfolioScope(scope: InvestmentPortfolioScope, bindings: InvestmentPortfolioBindings, response: InvestmentPortfolioScopeResponse): boolean {
  if (!validInvestmentBindings(bindings)) return false;
  const path = response?.root?.path;
  const home = `${bindings.siteRootPath}/Home`.toLowerCase();
  return typeof path === 'string' && (path.toLowerCase() === home || path.toLowerCase().startsWith(`${home}/`)) &&
    normalizeInvestmentId(response.root?.id) === checkedId(scope.rootId) &&
    normalizeInvestmentId(response.datasource?.id) === checkedId(scope.datasourceId) &&
    // The configured native rendering defines its datasource template; verify its actual owner here.
    response.datasource?.parent?.name?.toLowerCase() === 'data' &&
    normalizeInvestmentId(response.datasource?.parent?.parent?.id) === checkedId(scope.rootId);
}
/** _templates includes native inherited templates. No route/layout, investment status, or publication flags filter the collection. */
export function buildInvestmentPortfolioSearchQuery(scope: InvestmentPortfolioScope, bindings: InvestmentPortfolioBindings, after?: string): string {
  const { datasourceId, language } = checkedScope(scope);
  if (!validInvestmentBindings(bindings) || (after !== undefined && (typeof after !== 'string' || !after))) throw new Error('Invalid investment portfolio query');
  return `query InvestmentPortfolioItems {
    search(where: { AND: [
      { name: "_templates", value: ${literal(checkedId(bindings.investmentTemplateId))}, operator: CONTAINS }
      { name: "_parent", value: ${literal(datasourceId)}, operator: EQ }
      { name: "_language", value: ${literal(language)}, operator: EQ }
      { name: "_latestversion", value: "true", operator: EQ }
    ] }, first: ${INVESTMENT_PORTFOLIO_PAGE_SIZE}${after === undefined ? '' : `, after: ${literal(after)}`}) {
      total pageInfo { hasNext endCursor }
      results {
        id parent { id }
        name: field(name: "name") { jsonValue }
        investmentStatus: field(name: "investmentStatus") { jsonValue }
        details: field(name: "details") { jsonValue }
        logo: field(name: "logo") { jsonValue }
        websiteLink: field(name: "websiteLink") { jsonValue }
      }
    }
  }`;
}
type Connection = { total: number; pageInfo: { hasNext: boolean; endCursor?: string | null }; results: InvestmentEntry[] };
/** Every cursor page and unique count must reconcile. Never publish a first-page or partial collection. */
export async function collectInvestmentPortfolio(getData: InvestmentPortfolioGetData, scope: InvestmentPortfolioScope, bindings: InvestmentPortfolioBindings, fetchOptions?: FetchOptions): Promise<InvestmentPortfolioSearch> {
  const checked = checkedScope(scope), items: InvestmentEntry[] = [], ids = new Set<string>(), cursors = new Set<string>();
  let total: number | undefined, after: string | undefined;
  for (;;) {
    const response = await getData<{ search?: Connection }>(buildInvestmentPortfolioSearchQuery(scope, bindings, after), undefined, fetchOptions);
    const connection = response?.search;
    if (!connection || !Number.isSafeInteger(connection.total) || connection.total < 0 || typeof connection.pageInfo?.hasNext !== 'boolean' ||
      !Array.isArray(connection.results) || connection.results.length > INVESTMENT_PORTFOLIO_PAGE_SIZE) throw new Error('Incomplete investment portfolio connection');
    if (total !== undefined && total !== connection.total) throw new Error('Investment portfolio count changed');
    total = connection.total;
    for (const item of connection.results) {
      const id = normalizeInvestmentId(item?.id);
      if (!id || ids.has(id) || normalizeInvestmentId(item?.parent?.id) !== checked.datasourceId) throw new Error('Invalid investment portfolio child');
      ids.add(id); items.push(item);
    }
    if (items.length > total) throw new Error('Investment portfolio exceeds total');
    if (!connection.pageInfo.hasNext) {
      if (items.length !== total) throw new Error('Investment portfolio final count mismatch');
      return { complete: true, scope: checked, baseTemplateId: checkedId(bindings.investmentTemplateId), items };
    }
    const cursor = connection.pageInfo.endCursor;
    if (!connection.results.length || items.length >= total || typeof cursor !== 'string' || !cursor || cursors.has(cursor)) throw new Error('Invalid investment portfolio cursor');
    cursors.add(cursor); after = cursor;
  }
}
/** Selection retains the original native objects and all editable field metadata. */
export function selectInvestmentPortfolio(scope: InvestmentPortfolioScope, bindings: InvestmentPortfolioBindings, collection: InvestmentPortfolioSearch): InvestmentPortfolioResult {
  const checked = checkedScope(scope);
  if (!validInvestmentBindings(bindings) || collection?.complete !== true || !Array.isArray(collection.items) ||
    normalizeInvestmentId(collection.baseTemplateId) !== normalizeInvestmentId(bindings.investmentTemplateId) ||
    normalizeInvestmentId(collection.scope?.rootId) !== checked.rootId || normalizeInvestmentId(collection.scope?.datasourceId) !== checked.datasourceId ||
    collection.scope?.language !== checked.language) throw new Error('Invalid investment portfolio query provenance');
  const active: InvestmentEntry[] = [], exited: InvestmentEntry[] = [], ids = new Set<string>();
  for (const item of collection.items) {
    const id = normalizeInvestmentId(item?.id), name = item?.name?.jsonValue?.value, status = item?.investmentStatus?.jsonValue?.value;
    if (!id || ids.has(id) || normalizeInvestmentId(item?.parent?.id) !== checked.datasourceId ||
      typeof name !== 'string' || !name.trim() || (status !== 'Active' && status !== 'Exited')) throw new Error('Invalid investment portfolio content');
    ids.add(id); (status === 'Active' ? active : exited).push(item);
  }
  const collator = new Intl.Collator(checked.language, { usage: 'sort', sensitivity: 'base' });
  const compare = (a: InvestmentEntry, b: InvestmentEntry) => collator.compare(a.name!.jsonValue!.value.trim().normalize('NFC'), b.name!.jsonValue!.value.trim().normalize('NFC')) ||
    checkedId(a.id).localeCompare(checkedId(b.id), 'en');
  active.sort(compare); exited.sort(compare);
  return { complete: true, active, exited };
}
