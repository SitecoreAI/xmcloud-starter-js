import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import { normalizeDocumentId, type AutomaticDocuments } from '../prospectus-product-directory/document-automatic-data.props';
import { allianzLinkField } from 'lib/allianz-field-state';
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

/** Reuse the established public-document inventory and navigation boundary. */
export function prospectusLinkField(field: LinkField | undefined, isEditing: boolean): LinkField {
  if (!field || isEditing || !field.value?.href) return allianzLinkField(field, isEditing);
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
