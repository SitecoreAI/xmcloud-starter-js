import 'server-only';
import type { ComponentMap, GetComponentServerProps, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';
import { classifyQueryFailure, type QueryFailureDiagnostic } from './allianz-query-failure';
import { buildPeopleScopeQuery, collectPeopleSearch, normalizePeopleId, selectPeopleDirectory, unavailablePeople, validPeopleScope,
  type AutomaticPeople, type PeopleBiography, type PeopleCategory, type PeopleDirectoryKind, type PeopleGetData, type PeopleScope } from './people-automatic-data';

export type PeopleAutomaticServerOptions = { getData: PeopleGetData; fetchOptions?: FetchOptions };

/** Public failure metadata is deliberately limited to these fixed, nonsecret stages. */
type PeopleFailureStage = 'scope-request' | 'scope-validation' | 'biographies-request' | 'biographies-validation' |
  'categories-request' | 'categories-validation' | 'selection-validation' | 'unknown';
class PeopleStageFailure extends Error {
  constructor(readonly stage: PeopleFailureStage, readonly diagnostic: QueryFailureDiagnostic) { super('Automatic people directory read failed'); }
}
async function atPeopleStage<T>(stage: PeopleFailureStage, operation: () => T | Promise<T>, query?: string): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof PeopleStageFailure) throw error;
    // Do not retain the original error: SDK request errors may contain private headers.
    throw new PeopleStageFailure(stage, classifyQueryFailure(error, query));
  }
}

/** Instantiate per request so draft authorization and language never cross request boundaries. */
export function enrichPeopleComponentMap(components: ComponentMap<NextjsContentSdkComponent>, options: PeopleAutomaticServerOptions): ComponentMap<NextjsContentSdkComponent> {
  const enriched = new Map(components), reads = new Map<string, Promise<AutomaticPeople>>();
  const hook = (kind: PeopleDirectoryKind): GetComponentServerProps => async (rendering, layout) => {
    const { language, site } = layout.sitecore.context;
    const rootId = layout.sitecore.route?.itemId, datasourceId = rendering.dataSource;
    if (site?.name !== 'allianz-life' || typeof language !== 'string' || !/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(language) || !normalizePeopleId(rootId) || !normalizePeopleId(datasourceId)) return { automaticPeople: unavailablePeople('invalid-scope') };
    const scope: PeopleScope = { kind, language, rootId: rootId!, datasourceId: datasourceId! };
    const key = `${kind}:${language}:${normalizePeopleId(rootId)}:${normalizePeopleId(datasourceId)}`;
    let result = reads.get(key);
    if (!result) {
      result = (async () => {
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
            ...(error instanceof PeopleStageFailure ? error.diagnostic : classifyQueryFailure(error)) };
        }
      })();
      reads.set(key, result);
    }
    return { automaticPeople: await result };
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
