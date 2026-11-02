import verified from './allianz-demo-routes.fixture.json';

const localRoutes = new Map(verified.routes.map((path) => [path.toLowerCase(), path]));
const unavailableRoutes = new Set(verified.unavailable);
// Exact known Allianz sites have no local counterpart. This is containment,
// not a domain allowlist: no new external destination becomes navigable.
const relatedAllianzHosts = new Set([
  'www.allianz.com', 'www.allianzim.com', 'www.allianzimetfs.com', 'careers.allianz.com',
  'lp.allianzlife.com', 'www.agcs.allianz.com', 'www.allianztravelinsurance.com',
  'www.allianz-trade.com', 'www.allianzworldwidepartners.com',
].flatMap((host) => host.startsWith('www.') ? [host, host.slice(4)] : [host]));

export type DemoDestination = { kind: 'page' | 'document' | 'local' | 'rejected'; pathname: string };

/** Resolve only Allianz navigation anchors, never image/media src or stored CMS data.
 * Undefined leaves malformed URLs and other hosts under the existing link policy.
 * A deliberate missing counterpart is the literal same-page anchor, not a service URL.
 */
export function allianzDemoDestination(href: string): DemoDestination | undefined {
  if (!href) return undefined;
  const local = /^\/(?!\/)/.test(href);
  const schemeless = /^(?:www\.)?allianzlife\.com(?:[/?#]|$)/i.test(href);
  const source = schemeless ? `https://${href}` : href;
  let url: URL;
  try { url = new URL(source, 'https://www.allianzlife.com'); }
  catch { return undefined; }
  const absolute = /^(?:https?:)?\/\//i.test(source);
  const explicitScheme = /^[a-z][a-z0-9+.-]*:/i.test(source);
  if (!local && !absolute && !schemeless && !explicitScheme) return undefined;
  const host = url.hostname.toLowerCase();
  const normalizedHost = host.replace(/\.$/, '');
  const official = normalizedHost === 'www.allianzlife.com' || normalizedHost === 'allianzlife.com';
  const corporate = relatedAllianzHosts.has(normalizedHost);
  if (!local && !official && !corporate) return undefined;
  const authority = /^(?:https?:)?\/\/([^/?#]*)/i.exec(source)?.[1] ?? '';
  // Recognized but unsafe source authorities must not fall through a Rich Text
  // retention callback and re-export their original production URL.
  const rejected: DemoDestination = { kind: 'rejected', pathname: '#service-unavailable' };
  if ((!local && !absolute && !schemeless) || href !== href.trim() || /[\\\u0000-\u001f\u007f]/.test(href) || host !== normalizedHost ||
    !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || /:\d*$/.test(authority) ||
    /%(?:2f|5c)/i.test(url.pathname) || url.pathname.includes('//')) return rejected;
  let path: string;
  try { path = decodeURIComponent(url.pathname).toLowerCase().replace(/\/$/, '') || '/'; }
  catch { return rejected; }
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return rejected;
  if (local) {
    // Verified local results must survive another SDK normalization pass even
    // when the older offline source catalogue has not captured the native page.
    if (unavailableRoutes.has(path) || ['/careers', '/culture', '/allianzfortomorrow'].includes(path)) {
      return { kind: 'page', pathname: '#' };
    }
    const verifiedPath = localRoutes.get(path);
    return verifiedPath ? { kind: 'local', pathname: verifiedPath } : undefined;
  }
  if (corporate) return { kind: 'page', pathname: '#' };
  const document = /^\/-\/media\//i.test(path) || /\.(?:pdf|docx?|xlsx?|pptx?|csv|zip|mp4|mp3)$/i.test(path);
  if (document) return { kind: 'document', pathname: '#' };
  const restricted = /^\/(?:new-york\/)?(?:login|registration|spa|account|portal|secured|logout|manageuserprofile|api|sitecore)(\/|$)/i.test(path);
  return { kind: 'page', pathname: restricted || unavailableRoutes.has(path) ? '#' : localRoutes.get(path) ?? '#' };
}
