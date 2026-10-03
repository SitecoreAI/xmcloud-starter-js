import 'server-only';
import type { ComponentMap, GetComponentServerProps, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';
import { buildPeopleScopeQuery, collectPeopleSearch, normalizePeopleId, selectPeopleDirectory, unavailablePeople, validPeopleScope,
  type AutomaticPeople, type PeopleBiography, type PeopleCategory, type PeopleDirectoryKind, type PeopleGetData, type PeopleScope } from './people-automatic-data';

export type PeopleAutomaticServerOptions = { getData: PeopleGetData; fetchOptions?: FetchOptions };

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
          const actual = await options.getData<Parameters<typeof validPeopleScope>[1]>(buildPeopleScopeQuery(scope), undefined, options.fetchOptions);
          if (!actual || !validPeopleScope(scope, actual)) return unavailablePeople('invalid-scope');
          const [biographies, categories] = await Promise.all([
            collectPeopleSearch<PeopleBiography>(options.getData, 'biographies', scope, options.fetchOptions),
            kind === 'experts' ? collectPeopleSearch<PeopleCategory>(options.getData, 'categories', scope, options.fetchOptions) : Promise.resolve([]),
          ]);
          return selectPeopleDirectory(scope, biographies, categories);
        } catch { return unavailablePeople(); }
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
