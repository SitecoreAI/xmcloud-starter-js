import 'server-only';
import type { ComponentMap, GetComponentServerProps, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';
import { classifyQueryFailure, type QueryFailureDiagnostic } from './allianz-query-failure';
import {
  buildVenturesTeamScopeQuery, collectVenturesTeamProfiles, normalizeVenturesTeamDatasource, normalizeVenturesTeamId,
  selectVenturesTeam, unavailableVenturesTeam, validVenturesTeamBindings, validVenturesTeamLanguage,
  validVenturesTeamScope, venturesTeamProfileIds, VENTURES_TEAM_PAGE_ID,
  type AutomaticVenturesTeam, type VenturesTeamBindings, type VenturesTeamGetData,
  type VenturesTeamScope, type VenturesTeamScopeResponse,
} from './ventures-team-data';

export type VenturesTeamServerOptions = {
  getData: VenturesTeamGetData; fetchOptions?: FetchOptions;
  /** Absent until the owning CMS writer verifies both new native template identities. */
  bindings?: VenturesTeamBindings;
};
type VenturesTeamFailureStage = 'scope-request' | 'scope-validation' | 'references-validation' |
  'profile-request' | 'biography-request' | 'listing-request' | 'profiles-validation' | 'selection-validation' | 'unknown';
class VenturesTeamStageFailure extends Error {
  constructor(readonly stage: VenturesTeamFailureStage, readonly diagnostic: QueryFailureDiagnostic) {
    super('Ventures team native read failed');
  }
}
async function atStage<T>(stage: VenturesTeamFailureStage, operation: () => T | Promise<T>, query?: string): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof VenturesTeamStageFailure) throw error;
    // Original SDK exceptions may contain private request headers; retain fixed diagnostic categories only.
    throw new VenturesTeamStageFailure(stage, classifyQueryFailure(error, query));
  }
}
/** Call once for each page request: draft authorization and cache contents never cross requests. */
export function createVenturesTeamServer(options: VenturesTeamServerOptions): GetComponentServerProps {
  const reads = new Map<string, Promise<AutomaticVenturesTeam>>();
  return async (rendering, layout) => {
    const bindings = options.bindings;
    if (!validVenturesTeamBindings(bindings)) return { automaticVenturesTeam: unavailableVenturesTeam('unbound') };
    const { language, site } = layout.sitecore.context;
    const rootId = layout.sitecore.route?.itemId, datasourceId = rendering.dataSource;
    if (site?.name !== 'allianz-life' || !validVenturesTeamLanguage(language) ||
      normalizeVenturesTeamId(rootId) !== normalizeVenturesTeamId(VENTURES_TEAM_PAGE_ID) || !normalizeVenturesTeamDatasource(datasourceId)) {
      return { automaticVenturesTeam: unavailableVenturesTeam('invalid-scope') };
    }
    const scope: VenturesTeamScope = { language, rootId: rootId!, datasourceId: datasourceId! };
    const key = JSON.stringify([language, normalizeVenturesTeamId(rootId), normalizeVenturesTeamDatasource(datasourceId)]);
    let result = reads.get(key);
    if (!result) {
      result = (async () => {
        try {
          const query = buildVenturesTeamScopeQuery(scope);
          const response = await atStage('scope-request', () => options.getData<VenturesTeamScopeResponse>(query, undefined, options.fetchOptions), query);
          if (!response || !await atStage('scope-validation', () => validVenturesTeamScope(scope, bindings, response))) return unavailableVenturesTeam('invalid-scope');
          const ids = await atStage('references-validation', () => venturesTeamProfileIds(response.datasource?.profiles));
          const reader: VenturesTeamGetData = <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) => {
            const stage = query.startsWith('query VenturesTeamPage') ? 'profile-request'
              : query.startsWith('query VenturesTeamBiography') ? 'biography-request' : 'listing-request';
            return atStage(stage, () => options.getData<T>(query, variables, fetchOptions), query);
          };
          const collection = await atStage('profiles-validation', () => collectVenturesTeamProfiles(reader, scope, bindings, ids, options.fetchOptions));
          return await atStage('selection-validation', () => selectVenturesTeam(scope, bindings, collection));
        } catch (error) {
          return { ...unavailableVenturesTeam(), failureStage: error instanceof VenturesTeamStageFailure ? error.stage : 'unknown',
            ...(error instanceof VenturesTeamStageFailure ? error.diagnostic : classifyQueryFailure(error)) };
        }
      })();
      reads.set(key, result);
    }
    return { automaticVenturesTeam: await result };
  };
}
/** Preserve SDK lazy module resolution and variants while adding scoped native data to VenturesTeam. */
export function enrichVenturesTeamComponentMap(components: ComponentMap<NextjsContentSdkComponent>,
  options: VenturesTeamServerOptions): ComponentMap<NextjsContentSdkComponent> {
  const enriched = new Map(components), component = enriched.get('VenturesTeam');
  if (!component) return enriched;
  const hook = createVenturesTeamServer(options);
  enriched.set('VenturesTeam', { ...component, getComponentServerProps: hook,
    ...(component.dynamicModule ? { dynamicModule: async () => ({ ...await component.dynamicModule!(), getComponentServerProps: hook }) } : {}),
  });
  return enriched;
}
