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
const sourceLinkedPortraitPath = '/-/media/Feature/Tile/Allianz-Life/tile-azl-luca-gallo-executives-bio.jpg';

/** Keep editing fields unchanged; unverified normal-mode delivery links fail closed. */
export function biographyLinkField(field: LinkField | undefined, editable: boolean, purpose: 'document' | 'portrait' = 'document'): LinkField | undefined {
  if (!field || editable || !field.value?.href) return field;
  const value = field.value;
  const href = value.href ?? '';
  const cleared = () => ({ ...field, value: { ...value, href: '', querystring: '', anchor: '', target: '' } });
  let url: URL;
  try { url = new URL(href, 'https://www.allianzlife.com'); }
  catch { return cleared(); }
  const verifiedPath = purpose === 'document' ? sourceBiographyPdfPaths.has(url.pathname) : url.pathname === sourceLinkedPortraitPath;
  if (url.origin !== 'https://www.allianzlife.com' || url.username || url.password || !verifiedPath || href.startsWith('//')) return cleared();
  const nativeQuery = value.querystring?.replace(/^\?/, '') ?? '';
  const hrefQuery = url.search.slice(1);
  const querystring = hrefQuery && nativeQuery && hrefQuery !== nativeQuery
    ? `${hrefQuery}&${nativeQuery}` : nativeQuery || hrefQuery;
  const anchor = value.anchor?.replace(/^#/, '') || url.hash.slice(1);
  return { ...field, value: { ...value, href: url.pathname, querystring, anchor } };
}
