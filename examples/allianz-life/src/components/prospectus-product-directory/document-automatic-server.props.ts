import 'server-only';
import type { ComponentMap, GetComponentServerProps, LayoutServiceData, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';
import { classifyQueryFailure, type QueryFailureDiagnostic } from '../../lib/allianz-query-failure';
import {
  collectDocumentChildren, normalizeDocumentId, selectDirectoryProducts, unavailableDocumentCollection,
  type AutomaticDocuments, type AutomaticProducts, type DocumentGetData, type ProspectusDirectoryPage,
} from './document-automatic-data.props';
import type { ProspectusDocumentRow } from '../prospectus-document-table/prospectus-document-table.props';

export type DocumentAutomaticServerOptions = { getData: DocumentGetData; fetchOptions?: FetchOptions };
type DocumentFailureStage = 'children-request' | 'children-validation' | 'selection-validation';
class DocumentStageFailure extends Error {
  constructor(readonly stage: DocumentFailureStage, readonly diagnostic: QueryFailureDiagnostic) { super('Automatic document listing read failed'); }
}
async function atDocumentStage<T>(stage: DocumentFailureStage, operation: () => T | Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof DocumentStageFailure) throw error;
    // Keep only fixed classifications; request errors can contain private transport data.
    throw new DocumentStageFailure(stage, classifyQueryFailure(error));
  }
}
function documentFailure(error: unknown) {
  return { ...unavailableDocumentCollection(), failureStage: error instanceof DocumentStageFailure ? error.stage : 'children-validation',
    ...(error instanceof DocumentStageFailure ? error.diagnostic : classifyQueryFailure(error)) };
}
function scope(layout: LayoutServiceData): { language: string; routeId: string } | undefined {
  const { context, route } = layout.sitecore;
  if (context.site?.name !== 'allianz-life' || typeof context.language !== 'string' ||
    !/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(context.language) || !normalizeDocumentId(route?.itemId)) return undefined;
  return { language: context.language, routeId: route!.itemId! };
}

/** A new map per request keeps authoring credentials and cached results request-local. */
export function enrichDocumentComponentMap(components: ComponentMap<NextjsContentSdkComponent>, options: DocumentAutomaticServerOptions): ComponentMap<NextjsContentSdkComponent> {
  const enriched = new Map(components);
  const reads = new Map<string, Promise<AutomaticDocuments | AutomaticProducts>>();
  const reader: DocumentGetData = <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) =>
    atDocumentStage('children-request', () => options.getData<T>(query, variables, fetchOptions));
  const documents: GetComponentServerProps = async (rendering, layout) => {
    const current = scope(layout);
    const fields = rendering.fields as { data?: { datasource?: { id?: string } } } | undefined;
    const rootId = fields?.data?.datasource?.id ?? rendering.dataSource;
    if (!current || !normalizeDocumentId(rootId)) return { automaticDocuments: unavailableDocumentCollection('invalid-scope') };
    const key = `documents:${current.language}:${normalizeDocumentId(current.routeId)}:${normalizeDocumentId(rootId)}`;
    if (!reads.has(key)) reads.set(key, (async (): Promise<AutomaticDocuments> => {
      try {
        const items = await atDocumentStage('children-validation', () =>
          collectDocumentChildren<ProspectusDocumentRow & { id: string; name: string; parent: { id: string } }>(reader, 'documents', { ...current, rootId: rootId! }, options.fetchOptions));
        return { items, complete: true, status: 'ready' };
      } catch (error) { return documentFailure(error); }
    })());
    return { automaticDocuments: await reads.get(key) };
  };
  const products: GetComponentServerProps = async (_rendering, layout) => {
    const current = scope(layout);
    if (!current) return { automaticProducts: unavailableDocumentCollection('invalid-scope') };
    const key = `products:${current.language}:${normalizeDocumentId(current.routeId)}`;
    if (!reads.has(key)) reads.set(key, (async (): Promise<AutomaticProducts> => {
      try {
        const pages = await atDocumentStage('children-validation', () =>
          collectDocumentChildren<ProspectusDirectoryPage>(reader, 'products', { ...current, rootId: current.routeId }, options.fetchOptions));
        const items = await atDocumentStage('selection-validation', () => selectDirectoryProducts(pages));
        return { items, complete: true, status: 'ready' };
      } catch (error) { return documentFailure(error); }
    })());
    return { automaticProducts: await reads.get(key) };
  };
  for (const [name, hook] of [['ProspectusDocumentTable', documents], ['ProspectusProductDirectory', products]] as const) {
    const component = enriched.get(name);
    if (!component) continue;
    enriched.set(name, { ...component, getComponentServerProps: hook,
      ...(component.dynamicModule ? { dynamicModule: async () => ({ ...await component.dynamicModule!(), getComponentServerProps: hook }) } : {}) });
  }
  return enriched;
}
