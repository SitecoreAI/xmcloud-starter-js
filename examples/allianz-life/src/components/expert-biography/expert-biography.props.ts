import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** Experts and ventures have the same recovered source design. */
export interface ExpertBiographyDatasource {
  id?: string;
  name?: { jsonValue?: Field<string> };
  role?: { jsonValue?: Field<string> };
  focus?: { jsonValue?: Field<string> };
  portrait?: { jsonValue?: ImageField };
  biography?: { jsonValue?: Field<string> };
  downloadLink?: { jsonValue?: LinkField };
}
export type ExpertBiographyProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ExpertBiographyDatasource } };
};

/** Exact public document paths have archived successful PDF transport receipts.
 * New native/local delivery contracts must be verified before adding them here.
 */
const sourceBiographyPdfPaths = new Set([
  '/-/media/Files/Allianz/PDFs/about/bio/adam-brown.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/angela-hollan.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/angelica-bonacci.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/austin-bichler.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/benjamin-thomason.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/brian-muench.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/calvin-buchanan.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/carlota-balet-gusils.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/charles-champagne.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/charlie-ripley.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/chris-chambs.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/corey-walther.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/dwayne-maddox.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/eric-thomes.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/heidi-vanderkloot.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/jason-wellmann.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/jeng-chiu.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/jenny-guldseth.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/jessica-drake.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/Kelly-LaVigne.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/kenna-poppler.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/lorinda-niemeyer.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/machenzie-wickre.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/matt-gray.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/melanie-christensen.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/paul-cahill.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/steven-sweeney.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/tracy-bruckschen.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/waldean-wall.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/clay-bottensek.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/collin-bhojwani.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/ron-gonen.pdf',
  '/-/media/Files/Allianz/PDFs/about/bio/taylor-sieverling.pdf',
]);
/** Exact captured local copies of the same receipt-backed biography PDFs. */
const capturedBiographyPdfPaths = new Set([
  '/allianz-assets/c3d6cc05f70a263c-adam-brown.pdf',
  '/allianz-assets/1f18c84acda0eb3e-angela-hollan.pdf',
  '/allianz-assets/df6b140b7bd468ca-angelica-bonacci.pdf',
  '/allianz-assets/51577516a5d700b4-austin-bichler.pdf',
  '/allianz-assets/677704ed25d8edeb-benjamin-thomason.pdf',
  '/allianz-assets/73c1e8a41e34e67d-brian-muench.pdf',
  '/allianz-assets/330d4af85545c914-calvin-buchanan.pdf',
  '/allianz-assets/81f88067db183002-carlota-balet-gusils.pdf',
  '/allianz-assets/7d5c19d92ee6396f-charles-champagne.pdf',
  '/allianz-assets/9a507f430405351c-charlie-ripley.pdf',
  '/allianz-assets/1d7812dc9b9bd33f-chris-chambs.pdf',
  '/allianz-assets/f8061849a8a539aa-corey-walther.pdf',
  '/allianz-assets/d7c410032ebf7d07-dwayne-maddox.pdf',
  '/allianz-assets/3c89ed7387f90795-eric-thomes.pdf',
  '/allianz-assets/cbaf9a87772b361a-heidi-vanderkloot.pdf',
  '/allianz-assets/2fdbb564470fb888-jason-wellmann.pdf',
  '/allianz-assets/5a958684dc00599f-jeng-chiu.pdf',
  '/allianz-assets/6fab8c3ea1c0b8e0-jenny-guldseth.pdf',
  '/allianz-assets/909106e8db6d8004-jessica-drake.pdf',
  '/allianz-assets/7b67fdfc08c8fdfd-Kelly-LaVigne.pdf',
  '/allianz-assets/324179589c92cf35-kenna-poppler.pdf',
  '/allianz-assets/118b42ec24abd832-lorinda-niemeyer.pdf',
  '/allianz-assets/0aab02d15174bc5f-machenzie-wickre.pdf',
  '/allianz-assets/a1b7a9fdf255457f-matt-gray.pdf',
  '/allianz-assets/d150def01321cd7b-melanie-christensen.pdf',
  '/allianz-assets/c90a43bfdd3dfdcc-paul-cahill.pdf',
  '/allianz-assets/6f44f136ecf20fc5-steven-sweeney.pdf',
  '/allianz-assets/0159bdfd7629d608-tracy-bruckschen.pdf',
  '/allianz-assets/67f6d1cc4831304b-waldean-wall.pdf',
  '/allianz-assets/f6a64abf125cedf0-clay-bottensek.pdf',
  '/allianz-assets/edc110edaa3dd2fa-collin-bhojwani.pdf',
  '/allianz-assets/8f77f4901f9a09d2-ron-gonen.pdf',
  '/allianz-assets/1c260e564f06ba52-taylor-sieverling.pdf',
]);
const sourceLinkedPortraitPath = '/-/media/Feature/Tile/Allianz-Life/tile-azl-luca-gallo-executives-bio.jpg';
// Anonymous Original delivery: 167493 bytes, SHA256
// 1e9884998dfa9d89b63afaa6b50186af2fb9225d52766c46acbfc63b1b446f1b.
const verifiedLinkedPortraitUrl = 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/46a4ef1cbe2a4e51871bab9ccdb957a9?v=3cf794f0';

/** Keep editing fields unchanged; unverified normal-mode delivery links fail closed. */
export function biographyLinkField(field: LinkField | undefined, editable: boolean, purpose: 'document' | 'portrait' = 'document'): LinkField | undefined {
  if (!field || editable || !field.value?.href) return field;
  const value = field.value;
  const href = value.href ?? '';
  const cleared = () => ({ ...field, value: { ...value, href: '', url: '', querystring: '', anchor: '', target: '' } });
  let url: URL;
  try { url = new URL(href, 'https://www.allianzlife.com'); }
  catch { return cleared(); }
  const verifiedPath = purpose === 'document'
    ? sourceBiographyPdfPaths.has(url.pathname) || capturedBiographyPdfPaths.has(url.pathname)
    : url.pathname === sourceLinkedPortraitPath;
  const verifiedPortrait = purpose === 'portrait' && `${url.origin}${url.pathname}${url.search}` === verifiedLinkedPortraitUrl;
  if (url.username || url.password || href.startsWith('//') ||
    !(url.origin === 'https://www.allianzlife.com' && verifiedPath || verifiedPortrait)) return cleared();
  const nativeQuery = value.querystring?.replace(/^\?/, '') ?? '';
  const hrefQuery = url.search.slice(1);
  const querystring = hrefQuery && nativeQuery && hrefQuery !== nativeQuery
    ? `${hrefQuery}&${nativeQuery}` : nativeQuery || hrefQuery;
  // A separate native query must not broaden the verified portrait Original.
  if (verifiedPortrait && `${url.origin}${url.pathname}?${querystring}` !== verifiedLinkedPortraitUrl) return cleared();
  const anchor = value.anchor?.replace(/^#/, '') || url.hash.slice(1);
  return { ...field, value: { ...value, href: verifiedPortrait ? `${url.origin}${url.pathname}` : url.pathname, querystring, anchor } };
}
