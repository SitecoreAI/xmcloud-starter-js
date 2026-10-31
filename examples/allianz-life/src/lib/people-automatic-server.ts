import 'server-only';
import type { ComponentMap, GetComponentServerProps, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';
import { classifyQueryFailure, type QueryFailureDiagnostic } from './allianz-query-failure';
import { buildPeopleScopeQuery, collectPeopleSearch, getPeopleSearchValidationReason, NATIVE_PEOPLE_DIAGNOSTIC_SCOPE, normalizePeopleId, selectPeopleDirectory, unavailablePeople, validPeopleScope,
  type AutomaticPeople, type NativePeopleDiagnostic, type PeopleBiography, type PeopleCategory, type PeopleDirectoryKind, type PeopleGetData, type PeopleScope, type PeopleSearchValidationReason } from './people-automatic-data';

export type PeopleAutomaticServerOptions = {
  getData: PeopleGetData;
  fetchOptions?: FetchOptions;
  /** Server-local proof from the protected native loader; never a query/header toggle. */
  nativePeopleDiagnostics?: boolean;
};

/** Public failure metadata is deliberately limited to these fixed, nonsecret stages. */
type PeopleFailureStage = Exclude<NativePeopleDiagnostic['failureStage'], 'invalid-scope'>;
type PeopleInternalResult = AutomaticPeople & { failureStage?: PeopleFailureStage; validationReason?: PeopleSearchValidationReason };
type PeopleReadResult = { automaticPeople: Omit<PeopleInternalResult, 'validationReason'>; validationReason?: PeopleSearchValidationReason };
class PeopleStageFailure extends Error {
  constructor(readonly stage: PeopleFailureStage, readonly diagnostic: QueryFailureDiagnostic, readonly validationReason?: PeopleSearchValidationReason) { super('Automatic people directory read failed'); }
}
async function atPeopleStage<T>(stage: PeopleFailureStage, operation: () => T | Promise<T>, query?: string): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof PeopleStageFailure) throw error;
    // Do not retain the original error: SDK request errors may contain private headers.
    const validationReason = stage === 'biographies-validation' || stage === 'categories-validation'
      ? getPeopleSearchValidationReason(error) : undefined;
    throw new PeopleStageFailure(stage, classifyQueryFailure(error, query), validationReason);
  }
}

/** Instantiate per request so draft authorization and language never cross request boundaries. */
export function enrichPeopleComponentMap(components: ComponentMap<NextjsContentSdkComponent>, options: PeopleAutomaticServerOptions): ComponentMap<NextjsContentSdkComponent> {
  const enriched = new Map(components), reads = new Map<string, Promise<PeopleReadResult>>();
  const hook = (kind: PeopleDirectoryKind): GetComponentServerProps => async (rendering, layout) => {
    const { language, site } = layout.sitecore.context;
    const rootId = layout.sitecore.route?.itemId, datasourceId = rendering.dataSource;
    if (site?.name !== 'allianz-life' || typeof language !== 'string' || !/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(language) || !normalizePeopleId(rootId) || !normalizePeopleId(datasourceId)) return { automaticPeople: unavailablePeople('invalid-scope') };
    const scope: PeopleScope = { kind, language, rootId: rootId!, datasourceId: datasourceId! };
    const key = `${kind}:${language}:${normalizePeopleId(rootId)}:${normalizePeopleId(datasourceId)}`;
    let result = reads.get(key);
    if (!result) {
      result = (async (): Promise<PeopleInternalResult> => {
        try {
          const query = buildPeopleScopeQuery(scope);
          const actual = await atPeopleStage('scope-request', () => options.getData<Parameters<typeof validPeopleScope>[1]>(query, undefined, options.fetchOptions), query);
          if (!actual || !await atPeopleStage('scope-validation', () => validPeopleScope(scope, actual))) return unavailablePeople('invalid-scope');
          const reader = (stage: PeopleFailureStage): PeopleGetData => <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) =>
            atPeopleStage(stage, () => options.getData<T>(query, variables, fetchOptions), query);
          const [biographies, categories] = await Promise.all([
            atPeopleStage('biographies-validation', () => collectPeopleSearch<PeopleBiography>(reader('biographies-request'), 'biographies', scope, options.fetchOptions)),
            kind === 'experts' ? atPeopleStage('categories-validation', () => collectPeopleSearch<PeopleCategory>(reader('categories-request'), 'categories', scope, options.fetchOptions)) : Promise.resolve(undefined),
          ]);
          return await atPeopleStage('selection-validation', () => selectPeopleDirectory(scope, biographies, categories));
        } catch (error) {
          return { ...unavailablePeople(), failureStage: error instanceof PeopleStageFailure ? error.stage : 'unknown',
            ...(error instanceof PeopleStageFailure ? error.diagnostic : classifyQueryFailure(error)),
            ...(error instanceof PeopleStageFailure && error.validationReason ? { validationReason: error.validationReason } : {}) };
        }
      })().then(({ validationReason, ...automaticPeople }) => ({ automaticPeople, validationReason }));
      reads.set(key, result);
    }
    // Keep the newly classified reason server-local for all public results, including RSC.
    const { validationReason, automaticPeople } = await result;
    // Evaluate per placement after the shared read: another UID must not inherit this readout.
    const nativePeopleDiagnostic: NativePeopleDiagnostic | undefined = options.nativePeopleDiagnostics === true &&
      kind === 'executives' && language === 'en' &&
      normalizePeopleId(rootId) === NATIVE_PEOPLE_DIAGNOSTIC_SCOPE.rootId &&
      normalizePeopleId(datasourceId) === NATIVE_PEOPLE_DIAGNOSTIC_SCOPE.datasourceId &&
      normalizePeopleId(rendering.uid) === NATIVE_PEOPLE_DIAGNOSTIC_SCOPE.placementId && !automaticPeople.complete
      ? { failureStage: automaticPeople.failureStage ?? (automaticPeople.error === 'invalid-scope' ? 'invalid-scope' : 'unknown'),
        validationReason: validationReason ?? 'not-reported' } : undefined;
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
