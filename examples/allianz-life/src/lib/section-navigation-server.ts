import 'server-only';
import type { ComponentMap, GetComponentServerProps, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';
import {
  collectSectionNavigationChildren, collectSectionNavigationMembership, normalizeSectionNavigationId,
  selectSectionNavigation, unavailableSectionNavigation, validSectionNavigationBindings, validSectionNavigationLanguage,
  type AutomaticSectionNavigation, type SectionNavigationBindings, type SectionNavigationGetData, type SectionNavigationScope,
} from './section-navigation-data';

export interface SectionNavigationServerOptions {
  getData: SectionNavigationGetData;
  fetchOptions?: FetchOptions;
  /** Absent until the target's existing native metadata has been verified. */
  bindings?: SectionNavigationBindings;
}

/** Instantiate per request so neither cached data nor credentials cross an authoring boundary. */
export function createSectionNavigationServer(options: SectionNavigationServerOptions): GetComponentServerProps {
  const reads = new Map<string, Promise<AutomaticSectionNavigation>>();
  return async (rendering, layout) => {
    const bindings = options.bindings;
    if (!validSectionNavigationBindings(bindings)) return { automaticSectionNavigation: unavailableSectionNavigation('unbound') };
    const language = layout.sitecore.context.language;
    const currentId = layout.sitecore.route?.itemId;
    const params = rendering.params;
    const rootId = params && Object.hasOwn(params, bindings.rootParameterName) ? params[bindings.rootParameterName] : undefined;
    const filterId = params && Object.hasOwn(params, bindings.filterParameterName) ? params[bindings.filterParameterName] : undefined;
    if (!validSectionNavigationLanguage(language) || !normalizeSectionNavigationId(currentId) ||
      !normalizeSectionNavigationId(rootId) || !normalizeSectionNavigationId(filterId)) {
      return { automaticSectionNavigation: unavailableSectionNavigation('invalid-scope') };
    }
    const scope: SectionNavigationScope = { language, currentId: currentId!, rootId: rootId!, filterId: filterId! };
    const key = JSON.stringify([language, normalizeSectionNavigationId(rootId), normalizeSectionNavigationId(currentId), normalizeSectionNavigationId(filterId)]);
    let result = reads.get(key);
    if (!result) {
      result = (async () => {
        try {
          const [catalog, membership] = await Promise.all([
            collectSectionNavigationChildren(options.getData, scope, bindings, options.fetchOptions),
            collectSectionNavigationMembership(options.getData, scope, bindings, options.fetchOptions),
          ]);
          return selectSectionNavigation(catalog, membership, scope);
        } catch {
          return unavailableSectionNavigation();
        }
      })();
      reads.set(key, result);
    }
    return { automaticSectionNavigation: await result };
  };
}

/** Preserve installed SDK traversal, variants and lazy component module resolution. */
export function enrichSectionNavigationComponentMap(components: ComponentMap<NextjsContentSdkComponent>,
  options: SectionNavigationServerOptions): ComponentMap<NextjsContentSdkComponent> {
  const enriched = new Map(components);
  const component = enriched.get('SectionNavigation');
  if (!component) return enriched;
  const hook = createSectionNavigationServer(options);
  enriched.set('SectionNavigation', {
    ...component,
    getComponentServerProps: hook,
    ...(component.dynamicModule ? { dynamicModule: async () => ({ ...await component.dynamicModule!(), getComponentServerProps: hook }) } : {}),
  });
  return enriched;
}
