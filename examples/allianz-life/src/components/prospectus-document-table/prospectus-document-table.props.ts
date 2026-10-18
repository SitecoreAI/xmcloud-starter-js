import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import { normalizeDocumentId, type AutomaticDocuments } from '../prospectus-product-directory/document-automatic-data.props';
import { allianzLinkField } from 'lib/allianz-field-state';
import { isVerifiedContentHubDocumentLink } from 'lib/allianz-verified-documents';
import { localDocumentHref } from 'components/allianz-document-list/allianz-document-list.props';

/** One prospectus row, including its independently clearable issuance note. */
export interface ProspectusDocumentRow {
  id?: string;
  documentLink?: { jsonValue?: LinkField };
  contractNote?: { jsonValue?: Field<string> };
  revisionDate?: { jsonValue?: Field<string> };
  fileSize?: { jsonValue?: Field<string> };
}

export interface ProspectusDocumentTableDatasource {
  id?: string;

}

export type ProspectusDocumentTableProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProspectusDocumentTableDatasource } };
};

export type ProspectusDocumentComponentData = { automaticDocuments?: AutomaticDocuments };

/** An incomplete or missing server response never falls back to selected references. */
export function automaticDocumentRows(data?: AutomaticDocuments): ProspectusDocumentRow[] | undefined {
  const items = data?.items;
  if (data?.complete !== true || data.status !== 'ready' || data.error || !Array.isArray(items) ||
    items.some((item) => !normalizeDocumentId(item?.id)) ||
    new Set(items.map((item) => normalizeDocumentId(item.id))).size !== items.length) return undefined;
  return items;
}

// Verified collections and HTML viewers belong only to these native document rows.
const VERIFIED_OWNER_DESTINATIONS = new Map<string, string>([
  ['793cf45a831a4431b2e0dac7e6e14dc6', 'https://connect.rightprospectus.com/Allianz?site=AZ600'],
  ['a32c0c37e5be4dae84f96aeddf656a50', 'https://vpx.broadridge.com/GetContract1.asp?doctype=isp&cid=allianzmft&fid=018815514'],
  ['4c72bada56d14b0e81f6fa59c9b39410', 'https://vpx.broadridge.com/GetContract1.asp?doctype=usp&cid=allianzmft&fid=018815514'],
  ['b9eaa4ab4aa34907bf92ed1cdd47ed52', 'https://vpx.broadridge.com/GetContract1.asp?doctype=pros&cid=allianzmft&fid=018815514'],
  ['15d187b6d7cd4b028495e185705d067e', 'https://vpx.broadridge.com/GetContract1.asp?doctype=sai&cid=allianzmft&fid=018815514'],
]);

/** Reuse the established public-document inventory and navigation boundary. */
export function prospectusLinkField(field: LinkField | undefined, isEditing: boolean, ownerId?: string): LinkField {
  if (!field || isEditing || !field.value?.href) return allianzLinkField(field, isEditing);
  if (isVerifiedContentHubDocumentLink(field)) return allianzLinkField(field, false);
  // Keep owner-specific destinations out of the global navigation/PDF policy.
  const value = field.value;
  const href = field.value.href;
  const destination = VERIFIED_OWNER_DESTINATIONS.get(normalizeDocumentId(ownerId) ?? '');
  if (destination &&
    value.linktype?.toLowerCase() === 'external' && !value.id && !value.anchor && !href.includes('#')) {
    const separator = href.indexOf('?');
    const base = separator < 0 ? href : href.slice(0, separator);
    const hrefQuery = separator < 0 ? '' : href.slice(separator + 1);
    const nativeQuery = value.querystring?.replace(/^\?/, '') || '';
    const query = nativeQuery || hrefQuery;
    if ((!hrefQuery || !nativeQuery || hrefQuery === nativeQuery) &&
      `${base}${query ? `?${query}` : ''}` === destination) {
      return { ...field, value: { ...value, href: base, querystring: query, anchor: '' } };
    }
  }
  const local = localDocumentHref(field.value.href);
  if (local) {
    const source = new URL(field.value.href, 'https://www.allianzlife.com');
    const approved = allianzLinkField({ ...field,
      value: { ...field.value, href: `${local}${source.search}${source.hash}` } }, false);
    if (approved.value.href !== local) return approved;
    // This target belongs to an approved local document, never an external origin.
    return { ...approved, value: { ...approved.value, target: field.value.target ?? '' } };
  }
  // Document approval cannot fall through to the broader connected page policy.
  return { ...field, value: { ...field.value, href: '#service-unavailable',
    querystring: '', anchor: '', target: '', title: 'This service is unavailable' } };
}
