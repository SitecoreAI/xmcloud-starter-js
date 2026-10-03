import type { LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import { normalizeDocumentId, validDocumentPageUrl, type AutomaticProducts, type DocumentText, type ProspectusDirectoryPage } from './document-automatic-data.props';

export interface ProspectusProductDirectoryDatasource {
  id?: string;
  currentHeading?: DocumentText;
  pastHeading?: DocumentText;
  fieldCollection?: { name?: string; jsonValue?: unknown }[];
}
export type ProspectusDirectoryComponentData = { automaticProducts?: AutomaticProducts };
export type ProspectusProductDirectoryProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ProspectusProductDirectoryDatasource } };
};

export function directoryHeading(data: ProspectusProductDirectoryDatasource, name: 'currentHeading' | 'pastHeading'): DocumentText | undefined {
  if (Object.hasOwn(data, name)) return data[name];
  const field = data.fieldCollection?.find((item) => item.name?.toLowerCase() === name.toLowerCase());
  return field ? { jsonValue: field.jsonValue as DocumentText['jsonValue'] } : undefined;
}
export function automaticProductPages(data?: AutomaticProducts): ProspectusDirectoryPage[] | undefined {
  const items = data?.items;
  if (data?.complete !== true || data.status !== 'ready' || data.error || !Array.isArray(items) ||
    items.some((item) => !normalizeDocumentId(item?.id) || !validDocumentPageUrl(item.url?.path) ||
      !['current', 'past'].includes(item.prospectusDirectoryGroup?.jsonValue?.value ?? '') ||
      typeof item.prospectusDirectoryTitle?.jsonValue?.value !== 'string') ||
    new Set(items.map((item) => normalizeDocumentId(item.id))).size !== items.length) return undefined;
  return items;
}
export function prospectusPageLink(page: ProspectusDirectoryPage): LinkField {
  return { value: { href: page.url.path, text: page.prospectusDirectoryTitle?.jsonValue?.value ?? '', linktype: 'internal', target: '' } };
}
