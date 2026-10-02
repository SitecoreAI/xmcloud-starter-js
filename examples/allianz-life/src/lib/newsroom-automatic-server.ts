import 'server-only';
import type { ComponentMap, GetComponentServerProps, LayoutServiceData, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';
import {
  collectNewsroomSearch, normalizeNewsroomId, selectNewsroomReleases, selectNewsroomYears,
  unavailableNewsroomReleases, unavailableNewsroomYears,
  type AutomaticNewsPage, type AutomaticRelease, type AutomaticReleases, type AutomaticYear,
  type AutomaticYears, type NewsroomGetData,
} from './newsroom-automatic-data';

export type NewsroomAutomaticServerOptions = {
  getData: NewsroomGetData;
  fetchOptions?: FetchOptions;
  /** Technical rendering name of the site's year navigation. */
  yearNavigationComponent?: string;
};

function scope(layout: LayoutServiceData): { language: string; routeId?: string } | undefined {
  const context = layout.sitecore.context;
  const language = context.language;
  if (context.site?.name !== 'allianz-life' || typeof language !== 'string' || !/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(language)) return undefined;
  return { language, routeId: layout.sitecore.route?.itemId };
}

/** Instantiate once per page request. Cached promises never cross a request/auth boundary. */
export function createNewsroomAutomaticServer(options: NewsroomAutomaticServerOptions) {
  const yearReads = new Map<string, Promise<AutomaticYear[]>>();
  const releaseReads = new Map<string, Promise<AutomaticReleases>>();
  const years = (language: string) => {
    let promise = yearReads.get(language);
    if (!promise) {
      promise = collectNewsroomSearch<Omit<AutomaticYear, 'year'>>(options.getData, 'years', { language }, options.fetchOptions).then(selectNewsroomYears);
      yearReads.set(language, promise);
    }
    return promise;
  };
  const releases = (language: string, yearId?: string) => {
    const key = `${language}:${yearId ? normalizeNewsroomId(yearId) : 'recent'}`;
    let promise = releaseReads.get(key);
    if (!promise) {
      promise = (async () => {
        try {
          const catalog = await years(language);
          if (yearId && !catalog.some((year) => normalizeNewsroomId(year.id) === normalizeNewsroomId(yearId))) return unavailableNewsroomReleases('invalid-scope');
          const collectionScope = { language, ...(yearId ? { yearId } : {}) };
          const [pages, sources] = await Promise.all([
            collectNewsroomSearch<AutomaticNewsPage>(options.getData, 'pages', collectionScope, options.fetchOptions),
            collectNewsroomSearch<AutomaticRelease>(options.getData, 'releases', collectionScope, options.fetchOptions),
          ]);
          return selectNewsroomReleases(catalog, pages, sources, yearId);
        } catch {
          return unavailableNewsroomReleases();
        }
      })();
      releaseReads.set(key, promise);
    }
    return promise;
  };
  const archive: GetComponentServerProps = async (_rendering, layout) => {
    const current = scope(layout);
    const valid = current && normalizeNewsroomId(current.routeId);
    return { automaticReleases: valid ? await releases(current.language, current.routeId) : unavailableNewsroomReleases('invalid-scope') };
  };
  const recent: GetComponentServerProps = async (_rendering, layout) => {
    const current = scope(layout);
    return { automaticReleases: current ? await releases(current.language) : unavailableNewsroomReleases('invalid-scope') };
  };
  const navigation: GetComponentServerProps = async (_rendering, layout) => {
    const current = scope(layout);
    if (!current) return { automaticYears: unavailableNewsroomYears('invalid-scope') };
    try {
      const items = await years(current.language);
      const selected = items.find((item) => normalizeNewsroomId(item.id) === normalizeNewsroomId(current.routeId));
      const automaticYears: AutomaticYears = { items, complete: true, status: 'ready', ...(selected ? { currentId: selected.id } : {}) };
      return { automaticYears };
    } catch {
      return { automaticYears: unavailableNewsroomYears() };
    }
  };
  return { archive, recent, navigation };
}

/** Keep SDK traversal/error storage and avoid server exports in client component files. */
export function enrichNewsroomComponentMap(components: ComponentMap<NextjsContentSdkComponent>, options: NewsroomAutomaticServerOptions): ComponentMap<NextjsContentSdkComponent> {
  const enriched = new Map(components);
  const hooks = createNewsroomAutomaticServer(options);
  const attach = (name: string, hook: GetComponentServerProps) => {
    const component = enriched.get(name);
    if (!component) return;
    enriched.set(name, {
      ...component,
      getComponentServerProps: hook,
      ...(component.dynamicModule ? { dynamicModule: async () => ({ ...await component.dynamicModule!(), getComponentServerProps: hook }) } : {}),
    });
  };
  attach('PressReleaseArchive', hooks.archive);
  attach('NewsroomRecentReleases', hooks.recent);
  attach(options.yearNavigationComponent ?? 'NewsroomYearNavigation', hooks.navigation);
  return enriched;
}
