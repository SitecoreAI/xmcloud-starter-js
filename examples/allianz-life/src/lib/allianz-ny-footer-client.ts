import 'server-only';
import { SitecoreClient } from '@sitecore-content-sdk/nextjs/client';
import { summarizeNyFooterProbe, type NyFooterProbeSummary } from './allianz-ny-footer-probe';

type ClientInit = ConstructorParameters<typeof SitecoreClient>[0];
type PageArguments = Parameters<SitecoreClient['getPage']>;
type PageResult = Awaited<ReturnType<SitecoreClient['getPage']>>;
type ReadPage = (...args: PageArguments) => Promise<PageResult>;
type Runtime = Readonly<{ VERCEL_ENV?: string; VERCEL_GIT_COMMIT_REF?: string }>;

/** Follow the SDK factory's existing branch without returning any configuration values. */
function connectionCategory(init: ClientInit) {
  try {
    const edge = init.api?.edge;
    if (edge?.contextId) {
      const host = new URL(edge.edgeUrl || 'https://edge-platform.sitecorecloud.io').hostname;
      return host === 'edge-platform.sitecorecloud.io' ? 'platform-context' : 'other-context';
    }
    const local = init.api?.local;
    if (local?.apiKey && local.apiHost) {
      const host = new URL(local.apiHost).hostname;
      if (host === 'edge.sitecorecloud.io') return 'direct-edge';
      if (host.startsWith('xmc-') && host.endsWith('.sitecorecloud.io')) return 'sitecore-cm';
      return 'other-local-api';
    }
  } catch { /* A fixed category only; never include configuration or exception text. */ }
  return 'unclassified';
}

const BRANCH = 'codex/allianz-ny-footer-projection-20261102';
const ROUTES = new Set(['/new-york', '/new-york/about', '/new-york/annuities']);
const ROUTE_IDS: Record<string, string> = {
  '/new-york': '214D3628E161533797F72F74DB7DD027',
  '/new-york/about': '44A05D23855849DAA95AC586AC19189A',
  '/new-york/annuities': '98AB9D72554D453DB8D7AF46AF20AB61',
};

function routePath(path: PageArguments[0]): string {
  if (typeof path === 'string') return path;
  return Array.isArray(path) && path.every((part) => typeof part === 'string')
    ? `/${path.join('/')}` : '';
}

/** No new setting or public diagnostic endpoint; only this isolated hosted Preview. */
export function nyFooterProbeEnabled(args: PageArguments, runtime: Runtime): boolean {
  const [path, options, fetchOptions] = args;
  return runtime.VERCEL_ENV === 'preview' && runtime.VERCEL_GIT_COMMIT_REF === BRANCH &&
    options?.site === 'allianz-life' && options?.locale === 'en' &&
    options.personalize === undefined && fetchOptions === undefined && ROUTES.has(routePath(path));
}

/** Observe the normal layout request, returning its unchanged response and errors. */
class ObservedPageClient extends SitecoreClient {
  constructor(init: ClientInit, observe: (layout: unknown) => void) {
    super(init);
    const service = this.layoutService;
    const read = service.fetchLayoutData.bind(service);
    const observedRead: typeof read = async (...args) => {
      const layout = await read(...args);
      observe(layout);
      return layout;
    };
    // A per-client decorator also leaves a supplied custom service untouched.
    this.layoutService = new Proxy(service, {
      get(target, key, receiver) {
        return key === 'fetchLayoutData' ? observedRead : Reflect.get(target, key, receiver);
      },
    });
  }
}

/** The carrier contains only constructed fixed-shape facts, never raw layout data. */
export async function readPageWithNyFooterProbe(
  init: ClientInit,
  args: PageArguments,
  fallback: ReadPage,
  runtime: Runtime = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  },
): Promise<PageResult> {
  if (!nyFooterProbeEnabled(args, runtime)) return fallback(...args);

  const path = routePath(args[0]);
  let before: NyFooterProbeSummary | null = null;
  const diagnosticClient = new ObservedPageClient(init, (layout) => {
    try { before = summarizeNyFooterProbe(layout, path); }
    catch { before = null; }
  });
  // This is the original getPage operation, not an additional comparison request.
  const page = await diagnosticClient.getPage(...args);
  if (!page || !nyFooterProbeEnabled(args, runtime)) return page;

  const context = page.layout.sitecore.context;
  const itemId = String(page.layout.sitecore.route?.itemId ?? '').replace(/[{}-]/g, '').toUpperCase();
  if (!page.mode.isNormal || page.mode.isEditing || page.mode.isPreview || page.mode.isDesignLibrary ||
    context.pageEditing || (context.pageState && context.pageState !== 'normal') ||
    itemId !== ROUTE_IDS[path] || page.siteName !== 'allianz-life' || page.locale !== 'en' ||
    Object.hasOwn(context, 'allianzNyFooterProbe')) return page;

  try {
    const after = summarizeNyFooterProbe(page, path);
    context.allianzNyFooterProbe = Object.freeze({ schemaVersion: 1, connection: connectionCategory(init), before, after });
  } catch {
    // A probe failure must not change page rendering or expose an exception.
  }
  return page;
}
