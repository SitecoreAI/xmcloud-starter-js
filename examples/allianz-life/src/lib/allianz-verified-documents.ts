import type { LinkField } from '@sitecore-content-sdk/nextjs';

// These exact Content Hub PDF versions were verified against delivery or original-file evidence.
// This is a destination exception, not approval of the delivery host or API prefix.
const VERIFIED_CONTENT_HUB_DOCUMENTS = new Set([
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/47d0fbb1e2b6457fa2a595b96dcdccaa?v=27849fc6',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/16cb820b40994ca3b7af38d574a44d59?v=d59e0053',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/656eaeaaa433418ca03db6fcd7fa3512?v=f87588d4',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/0aafda00578a4eb1a678b2aa04d15595?v=760d2d3b',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/f109cc47edba46de921fecb735c567ea?v=68ea6fa3',
]);

/** Match full or SDK-split external links without extending native media/page policy. */
export function isVerifiedContentHubDocumentLink(field?: LinkField): boolean {
  const value = field?.value;
  const href = value?.href;
  const linkType = value?.linktype?.toLowerCase();
  if (!href || value.id || (linkType && linkType !== 'external') ||
    href.includes('#') || value.anchor) return false;
  const separator = href.indexOf('?');
  const base = separator < 0 ? href : href.slice(0, separator);
  const hrefQuery = separator < 0 ? '' : href.slice(separator + 1);
  const nativeQuery = value.querystring?.replace(/^\?/, '') || '';
  const query = hrefQuery && nativeQuery && hrefQuery !== nativeQuery
    ? `${hrefQuery}&${nativeQuery}` : nativeQuery || hrefQuery;
  return VERIFIED_CONTENT_HUB_DOCUMENTS.has(`${base}${query ? `?${query}` : ''}`);
}
