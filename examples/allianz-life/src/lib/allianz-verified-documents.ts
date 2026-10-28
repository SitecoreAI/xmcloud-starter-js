import type { LinkField } from '@sitecore-content-sdk/nextjs';

// These exact Content Hub PDF versions were verified against delivery or original-file evidence.
// This is a destination exception, not approval of the delivery host or API prefix.
const VERIFIED_CONTENT_HUB_DOCUMENTS = new Set([
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/47d0fbb1e2b6457fa2a595b96dcdccaa?v=27849fc6',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/16cb820b40994ca3b7af38d574a44d59?v=d59e0053',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/656eaeaaa433418ca03db6fcd7fa3512?v=f87588d4',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/0aafda00578a4eb1a678b2aa04d15595?v=760d2d3b',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/f109cc47edba46de921fecb735c567ea?v=68ea6fa3',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/ac0957d84998445e98adffaec3c6402f?v=4cfa94aa',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/f2c2be58cff1453f93f24f122d3c30e1?v=1d29b652',

  // Public source: https://www.allianzlife.com/-/media/Files/Global/documents/2016/09/15/16/03/M-5391.pdf
  // SHA-256 0214f22a49307bbe3961be0fccb48ad64ebb13560b6a1a52096b113c1afbecf4 (290228 bytes).
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/7782b0dd295b4429815149f2c15039ae?v=71fb078a',
  // Public source: https://www.allianzlife.com/-/media/Files/Global/documents/2016/09/15/16/02/M-5133.pdf
  // SHA-256 b0220d51e718a3815c7fb02d29f65a2831e112997ec737ddc4a4e5866cef3657 (1350449 bytes).
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/1ea05d7fc4634af481700ebb8d0c65a7?v=37883710',
  // Public source: https://www.allianzlife.com/-/media/Files/Global/documents/2021/11/11/18/22/AMK-605.pdf
  // SHA-256 a000a867cbb50a4173cfb38e728973971550e02f7aaa1b117badcd4227b68c27 (125278 bytes).
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/bf076ddaeea94fb6860c313589b4bb92?v=5e8d814f',
  // Public source: https://www.allianzlife.com/-/media/Files/Global/documents/2022/03/24/13/15/LIA-003.pdf
  // SHA-256 edfdabea7e60b871d717a8df953845dd60edeccc543e0ae58fa5e414826fb621 (64178 bytes).
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/35d9e32f7d0f47bc8f54010dfdf4d977?v=f296bdeb',
  // Public source: https://www.allianzlife.com/-/media/Files/Global/documents/2022/12/16/14/36/LIA-046.pdf
  // SHA-256 a415be47d061237b6e444060c4995ffe687f1b770601209ed09b68ebfcef2085 (1414830 bytes).
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/96ef14f000424a3cab89e7f3c96fec68?v=6a52fdda',
  // Public source: https://www.allianzlife.com/-/media/Files/Global/documents/2022/12/16/14/37/LIA-034.pdf
  // SHA-256 5b47102784400b706b2cdb36d1ca70c32d040641a6eddd7dc126d0ea6175fb29 (887425 bytes).
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/75abd5399396429db7940b01a1441a4c?v=9338bf84',
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
