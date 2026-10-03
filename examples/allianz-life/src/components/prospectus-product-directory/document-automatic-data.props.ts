import type { Field } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';
import type { ProspectusDocumentRow } from '../prospectus-document-table/prospectus-document-table.props';

export const DOCUMENT_ROW_TEMPLATE_ID = 'b5661a5f-3336-457c-8f13-9bf4e5e989af';
export const PROSPECTUS_PAGE_TEMPLATE_ID = '6944dd34-e2f5-5a2d-b6d3-5dc04463cf53';
export const SORT_ORDER_FIELD_ID = 'ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e';
export type DocumentGetData = <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) => Promise<T>;
export type DocumentText = { jsonValue?: Field<string> };
export type DocumentAutomaticStatus = { complete: boolean; status: 'ready' | 'unavailable'; error?: 'invalid-scope' | 'unavailable' };
export type AutomaticDocuments = DocumentAutomaticStatus & { items: ProspectusDocumentRow[] };
export type ProspectusDirectoryPage = {
  id: string;
  name: string;
  path: string;
  url: { path: string };
  parent: { id: string };
  prospectusDirectoryTitle?: DocumentText;
  prospectusDirectoryGroup?: DocumentText;
  template?: { id?: string };
};
export type AutomaticProducts = DocumentAutomaticStatus & { items: ProspectusDirectoryPage[] };
export type DocumentQueryScope = { language: string; rootId: string; routeId: string };
export type DocumentQueryKind = 'documents' | 'products';
type NativeChild = { id: string; name: string; parent: { id: string }; template?: { id?: string } };
type NativeRoot = { id: string; path: string; url?: { path?: string }; parent?: { parent?: { id?: string } } };
type ChildConnection<T> = { total: number; pageInfo: { hasNext: boolean; endCursor?: string | null }; results: T[] };

export function normalizeDocumentId(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}|\{[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\})$/i.test(value)) return undefined;
  return value.replace(/[{}-]/g, '').toLowerCase();
}
function checkedId(value: string): string {
  const id = normalizeDocumentId(value);
  if (!id) throw new Error('Invalid document listing item ID');
  return id;
}
export function validDocumentPageUrl(value: unknown): value is string {
  return typeof value === 'string' && /^\/(?!\/)[^?#\\\s]*$/.test(value) &&
    !/^\/(?:new-york\/)?(?:api|sitecore|login|registration|spa|account|portal|secured|logout|manageuserprofile)(?:\/|$)/i.test(value);
}
function directPath(child: string, parent: string): boolean {
  const prefix = `${parent.replace(/\/$/, '')}/`;
  const tail = child.toLowerCase().startsWith(prefix.toLowerCase()) ? child.slice(prefix.length) : '';
  return Boolean(tail) && !tail.includes('/');
}

/** Native child enumeration owns sibling order, including tied/empty __Sortorder values. */
export function buildDocumentQuery(kind: DocumentQueryKind, scope: DocumentQueryScope, after?: string): string {
  if (!/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(scope.language)) throw new Error('Invalid document listing language');
  if (after !== undefined && (typeof after !== 'string' || !after)) throw new Error('Invalid document listing cursor');
  const rootId = checkedId(scope.rootId);
  checkedId(scope.routeId);
  const literal = JSON.stringify;
  const fields = kind === 'documents'
    ? 'documentLink: field(name: "documentLink") { jsonValue } contractNote: field(name: "contractNote") { jsonValue } revisionDate: field(name: "revisionDate") { jsonValue } fileSize: field(name: "fileSize") { jsonValue }'
    : 'path url { path } prospectusDirectoryTitle: field(name: "prospectusDirectoryTitle") { jsonValue } prospectusDirectoryGroup: field(name: "prospectusDirectoryGroup") { jsonValue }';
  return `query AutomaticProspectus${kind === 'documents' ? 'Documents' : 'Products'} {
    root: item(path: ${literal(rootId)}, language: ${literal(scope.language)}) {
      id path url { path } parent { parent { id } }
      children(first: 10${after === undefined ? '' : `, after: ${literal(after)}`}) {
        total pageInfo { hasNext endCursor } results {
          id name template { id } parent { id }
          ${fields}
        }
      }
    }
  }`;
}

/** Exhaust every cursor page; any broken page makes the entire result unavailable. */
export async function collectDocumentChildren<T extends NativeChild>(getData: DocumentGetData, kind: DocumentQueryKind, scope: DocumentQueryScope, fetchOptions?: FetchOptions): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  const cursors = new Set<string>();
  let total: number | undefined;
  let after: string | undefined;
  let rootPath: string | undefined;
  let rootUrl: string | undefined;
  for (;;) {
    const response = await getData<{ root?: NativeRoot & { children?: ChildConnection<T> } }>(buildDocumentQuery(kind, scope, after), undefined, fetchOptions);
    const root = response?.root;
    const connection = root?.children;
    if (!root || normalizeDocumentId(root.id) !== checkedId(scope.rootId) || typeof root.path !== 'string' || !root.path ||
      (kind === 'documents' && normalizeDocumentId(root.parent?.parent?.id) !== checkedId(scope.routeId)) ||
      (kind === 'products' && (checkedId(scope.rootId) !== checkedId(scope.routeId) || !validDocumentPageUrl(root.url?.path)))) throw new Error('Invalid document listing root');
    if (rootPath !== undefined && (rootPath !== root.path || rootUrl !== root.url?.path)) throw new Error('Document listing root changed');
    rootPath = root.path;
    rootUrl = root.url?.path;
    if (!connection || !Number.isSafeInteger(connection.total) || connection.total < 0 ||
      typeof connection.pageInfo?.hasNext !== 'boolean' || !Array.isArray(connection.results) || connection.results.length > 10) throw new Error('Incomplete document listing');
    if (total !== undefined && total !== connection.total) throw new Error('Document listing total changed');
    total = connection.total;
    for (const item of connection.results) {
      const id = normalizeDocumentId(item?.id);
      if (!id || seen.has(id) || normalizeDocumentId(item.parent?.id) !== checkedId(scope.rootId) || typeof item.name !== 'string' || !item.name) throw new Error('Invalid document listing child');
      const templateId = normalizeDocumentId(item.template?.id);
      if (!templateId) throw new Error('Missing document child template');
      if (kind === 'products' && templateId === checkedId(PROSPECTUS_PAGE_TEMPLATE_ID)) {
        const page = item as unknown as ProspectusDirectoryPage;
        if (typeof page.path !== 'string' || !directPath(page.path, rootPath) || !validDocumentPageUrl(page.url?.path) || !directPath(page.url.path, rootUrl!)) throw new Error('Invalid prospectus page ownership');
      }
      seen.add(id);
      items.push(item);
    }
    if (items.length > total) throw new Error('Document listing count exceeds total');
    if (!connection.pageInfo.hasNext) {
      if (items.length !== total) throw new Error('Document listing count differs from total');
      const templateId = checkedId(kind === 'documents' ? DOCUMENT_ROW_TEMPLATE_ID : PROSPECTUS_PAGE_TEMPLATE_ID);
      // Filter only after complete traversal; never replace native sibling order.
      return items.filter((item) => normalizeDocumentId(item.template?.id) === templateId);
    }
    const cursor = connection.pageInfo.endCursor;
    if (!connection.results.length || items.length >= total || typeof cursor !== 'string' || !cursor || cursors.has(cursor)) throw new Error('Invalid document listing pagination');
    cursors.add(cursor);
    after = cursor;
  }
}

/** Blank membership intentionally excludes unlisted child pages. Unknown groups are errors. */
export function selectDirectoryProducts(items: ProspectusDirectoryPage[]): ProspectusDirectoryPage[] {
  return items.filter((item) => {
    const group = item.prospectusDirectoryGroup?.jsonValue?.value;
    if (group === undefined || group === '') return false;
    if (group !== 'current' && group !== 'past') throw new Error('Invalid prospectus directory group');
    if (typeof item.prospectusDirectoryTitle?.jsonValue?.value !== 'string') throw new Error('Missing prospectus directory title field');
    return true;
  });
}
export function unavailableDocumentCollection(error: 'invalid-scope' | 'unavailable' = 'unavailable'): AutomaticDocuments & AutomaticProducts {
  return { items: [], complete: false, status: 'unavailable', error };
}
