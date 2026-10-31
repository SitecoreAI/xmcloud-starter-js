import 'server-only';
import { isProxy } from 'node:util/types';
import { debug as sdkDebug } from '@sitecore-content-sdk/core';
import type { ComponentMap, GetComponentServerProps, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';
import { classifyQueryFailure, type QueryFailureDiagnostic } from './allianz-query-failure';
import { boundedPeoplePageShape, buildPeopleIdOnlySearchQuery, buildPeopleScopeQuery, collectPeopleSearch, getPeopleInvalidIdDiagnostic, getPeopleNullRowComparisonContext, getPeopleSearchValidationReason, NATIVE_PEOPLE_DIAGNOSTIC_SCOPE, normalizePeopleId, selectPeopleDirectory, unavailablePeople, validPeopleScope,
  type AutomaticPeople, type NativePeopleDiagnostic, type PeopleInvalidIdDiagnostic, type PeopleNullRowComparisonContext, type PeopleProjectionComparison, type PeopleBiography, type PeopleCategory, type PeopleDirectoryKind, type PeopleGetData, type PeopleScope, type PeopleSearchValidationReason } from './people-automatic-data';

export type PeopleAutomaticServerOptions = {
  getData: PeopleGetData;
  fetchOptions?: FetchOptions;
  /** Server-local proof from the protected native loader; never a query/header toggle. */
  nativePeopleDiagnostics?: boolean;
};

/** Public failure metadata is deliberately limited to these fixed, nonsecret stages. */
type PeopleFailureStage = Exclude<NativePeopleDiagnostic['failureStage'], 'invalid-scope'>;
type PeopleReadResult = { automaticPeople: AutomaticPeople & { failureStage?: PeopleFailureStage }; validationReason?: PeopleSearchValidationReason; invalidIdDiagnostic?: PeopleInvalidIdDiagnostic; comparisonContext?: PeopleNullRowComparisonContext };
class PeopleStageFailure extends Error {
  constructor(readonly stage: PeopleFailureStage, readonly diagnostic: QueryFailureDiagnostic, readonly validationReason?: PeopleSearchValidationReason, readonly invalidIdDiagnostic?: PeopleInvalidIdDiagnostic, readonly comparisonContext?: PeopleNullRowComparisonContext) { super('Automatic people directory read failed'); }
}
async function atPeopleStage<T>(stage: PeopleFailureStage, operation: () => T | Promise<T>, query?: string): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof PeopleStageFailure) throw error;
    // Do not retain the original error: SDK request errors may contain private headers.
    const validationReason = stage === 'biographies-validation' || stage === 'categories-validation'
      ? getPeopleSearchValidationReason(error) : undefined;
    const invalidIdDiagnostic = validationReason === 'invalid-id' ? getPeopleInvalidIdDiagnostic(error) : undefined;
    const comparisonContext = invalidIdDiagnostic?.idPresence === 'row-null' ? getPeopleNullRowComparisonContext(error) : undefined;
    throw new PeopleStageFailure(stage, classifyQueryFailure(error, query), validationReason, invalidIdDiagnostic, comparisonContext);
  }
}

const comparisonNoRetry = { shouldRetry: () => false, getDelay: () => 0 };
const comparisonQuiet = () => {};
const COMPARISON_WAIT_MS = 5000;
function ownData(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null || isProxy(value)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
}
async function compareNullRowProjection(options: PeopleAutomaticServerOptions, scope: PeopleScope, cue?: PeopleNullRowComparisonContext): Promise<PeopleProjectionComparison> {
  if (!cue) return { outcome: 'context-unavailable' };
  // The audited default client uses this SDK logger for success-response data.
  // Inspect only; never enable/disable or replace runtime logging settings.
  try { if (sdkDebug.http.enabled !== false) return { outcome: 'logging-blocked', full: cue.shape }; }
  catch { return { outcome: 'logging-blocked', full: cue.shape }; }
  let timer: ReturnType<typeof setTimeout> | undefined;
  // This bounds waiting, not transport cancellation: the SDK exposes no per-call abort.
  const operation = (async (): Promise<PeopleProjectionComparison> => {
    try {
      const response = await options.getData<unknown>(buildPeopleIdOnlySearchQuery(scope, cue.after), undefined, {
        ...options.fetchOptions, retryStrategy: comparisonNoRetry, debugger: comparisonQuiet,
      });
      const search = ownData(response, 'search');
      const invalid = (responseShape: PeopleProjectionComparison['responseShape']): PeopleProjectionComparison => ({ outcome: 'inconclusive', full: cue.shape, responseShape });
      if (!search || typeof search !== 'object') return invalid('missing-search');
      const total = ownData(search, 'total');
      if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0) return invalid('invalid-total');
      const hasNext = ownData(ownData(search, 'pageInfo'), 'hasNext');
      if (typeof hasNext !== 'boolean') return invalid('invalid-page-info');
      const rows = ownData(search, 'results');
      if (!Array.isArray(rows) || isProxy(rows)) return invalid('invalid-results');
      if (rows.length > 10) return invalid('oversized-page');
      const shape = boundedPeoplePageShape(rows);
      if (!shape) return invalid('unclassified');
      let validIdRows = 0;
      for (let i = 0; i < shape.rows; i++) if (normalizePeopleId(ownData(ownData(rows, String(i)), 'id'))) validIdRows++;
      const totalMatch = total === cue.total ? 'same' : 'different';
      const rowCountMatch = shape.rows === cue.shape.rows ? 'same' : 'different';
      const hasNextMatch = hasNext === cue.hasNext ? 'same' : 'different';
      return { outcome: totalMatch === 'same' && rowCountMatch === 'same' && hasNextMatch === 'same' && cue.shape.otherRows === 0 && validIdRows + shape.nullRows === shape.rows ? 'completed' : 'inconclusive',
        full: cue.shape, idOnly: { ...shape, validIdRows }, responseShape: 'bounded-array', totalMatch, rowCountMatch, hasNextMatch };
    } catch (error) {
      try {
        const { failureKind, graphqlErrorCount, countTruncated } = classifyQueryFailure(error);
        return { outcome: 'request-failed', full: cue.shape, error: { failureKind, graphqlErrorCount, countTruncated } };
      } catch {
        return { outcome: 'request-failed', full: cue.shape, error: { failureKind: 'unknown', graphqlErrorCount: 0, countTruncated: false } };
      }
    }
  })();
  try {
    return await Promise.race([operation, new Promise<PeopleProjectionComparison>((resolve) => {
      timer = setTimeout(() => resolve({ outcome: 'wait-budget-exceeded', full: cue.shape }), COMPARISON_WAIT_MS);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

/** Instantiate per request so draft authorization and language never cross request boundaries. */
export function enrichPeopleComponentMap(components: ComponentMap<NextjsContentSdkComponent>, options: PeopleAutomaticServerOptions): ComponentMap<NextjsContentSdkComponent> {
  const enriched = new Map(components), reads = new Map<string, Promise<PeopleReadResult>>();
  const comparisonReads = new Map<string, Promise<PeopleProjectionComparison>>();
  const hook = (kind: PeopleDirectoryKind): GetComponentServerProps => async (rendering, layout) => {
    const { language, site } = layout.sitecore.context;
    const rootId = layout.sitecore.route?.itemId, datasourceId = rendering.dataSource;
    if (site?.name !== 'allianz-life' || typeof language !== 'string' || !/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(language) || !normalizePeopleId(rootId) || !normalizePeopleId(datasourceId)) return { automaticPeople: unavailablePeople('invalid-scope') };
    const scope: PeopleScope = { kind, language, rootId: rootId!, datasourceId: datasourceId! };
    const key = `${kind}:${language}:${normalizePeopleId(rootId)}:${normalizePeopleId(datasourceId)}`;
    let result = reads.get(key);
    if (!result) {
      result = (async (): Promise<PeopleReadResult> => {
        try {
          const query = buildPeopleScopeQuery(scope);
          const actual = await atPeopleStage('scope-request', () => options.getData<Parameters<typeof validPeopleScope>[1]>(query, undefined, options.fetchOptions), query);
          if (!actual || !await atPeopleStage('scope-validation', () => validPeopleScope(scope, actual))) return { automaticPeople: unavailablePeople('invalid-scope') };
          const reader = (stage: PeopleFailureStage): PeopleGetData => <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) =>
            atPeopleStage(stage, () => options.getData<T>(query, variables, fetchOptions), query);
          const [biographies, categories] = await Promise.all([
            atPeopleStage('biographies-validation', () => collectPeopleSearch<PeopleBiography>(reader('biographies-request'), 'biographies', scope, options.fetchOptions)),
            kind === 'experts' ? atPeopleStage('categories-validation', () => collectPeopleSearch<PeopleCategory>(reader('categories-request'), 'categories', scope, options.fetchOptions)) : Promise.resolve(undefined),
          ]);
          return { automaticPeople: await atPeopleStage('selection-validation', () => selectPeopleDirectory(scope, biographies, categories)) };
        } catch (error) {
          return { automaticPeople: { ...unavailablePeople(), failureStage: error instanceof PeopleStageFailure ? error.stage : 'unknown',
            ...(error instanceof PeopleStageFailure ? error.diagnostic : classifyQueryFailure(error)) },
            ...(error instanceof PeopleStageFailure && error.validationReason ? { validationReason: error.validationReason } : {}),
            ...(error instanceof PeopleStageFailure && error.invalidIdDiagnostic ? { invalidIdDiagnostic: error.invalidIdDiagnostic } : {}),
            ...(error instanceof PeopleStageFailure && error.comparisonContext ? { comparisonContext: error.comparisonContext } : {}) };
        }
      })();
      reads.set(key, result);
    }
    // Keep the newly classified reason server-local for all public results, including RSC.
    const { validationReason, invalidIdDiagnostic, comparisonContext, automaticPeople } = await result;
    // Evaluate per placement after the shared read: another UID must not inherit this readout.
    const nativePeopleDiagnostic: NativePeopleDiagnostic | undefined = options.nativePeopleDiagnostics === true &&
      kind === 'executives' && language === 'en' &&
      normalizePeopleId(rootId) === NATIVE_PEOPLE_DIAGNOSTIC_SCOPE.rootId &&
      normalizePeopleId(datasourceId) === NATIVE_PEOPLE_DIAGNOSTIC_SCOPE.datasourceId &&
      normalizePeopleId(rendering.uid) === NATIVE_PEOPLE_DIAGNOSTIC_SCOPE.placementId && !automaticPeople.complete
      ? { failureStage: automaticPeople.failureStage ?? (automaticPeople.error === 'invalid-scope' ? 'invalid-scope' : 'unknown'),
        validationReason: validationReason ?? 'not-reported',
        ...(validationReason === 'invalid-id' && automaticPeople.failureStage === 'biographies-validation' && invalidIdDiagnostic ? { invalidId: invalidIdDiagnostic } : {}) } : undefined;
    if (nativePeopleDiagnostic?.failureStage === 'biographies-validation' && nativePeopleDiagnostic.validationReason === 'invalid-id' &&
      nativePeopleDiagnostic.invalidId?.idPresence === 'row-null' && ownData(options.fetchOptions?.headers, 'sc_previewMode') === 'true') {
      let comparison = comparisonReads.get(key);
      if (!comparison) { comparison = Promise.resolve().then(() => compareNullRowProjection(options, scope, comparisonContext)); comparisonReads.set(key, comparison); }
      nativePeopleDiagnostic.projectionComparison = await comparison;
    }
    return { automaticPeople, ...(nativePeopleDiagnostic ? { nativePeopleDiagnostic } : {}) };
  };
  for (const [name, kind] of [['ExecutiveDirectory', 'executives'], ['ExpertDirectory', 'experts']] as const) {
    const component = enriched.get(name);
    if (!component) continue;
    const getComponentServerProps = hook(kind);
    enriched.set(name, { ...component, getComponentServerProps,
      ...(component.dynamicModule ? { dynamicModule: async () => ({ ...await component.dynamicModule!(), getComponentServerProps }) } : {}) });
  }
  return enriched;
}
