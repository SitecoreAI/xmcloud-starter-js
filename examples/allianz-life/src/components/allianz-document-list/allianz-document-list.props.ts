import type { FileField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import type { JsonField, TextValue } from 'lib/allianz-fields';
import capturedDocuments from '../../../content/documents.json';

/** Exact AllianzDocument child template, not the card/link-list contract. */
export interface AllianzDocument {
  id: string;
  title?: TextValue;
  description?: TextValue;
  file?: JsonField<FileField>;
  sourceUrl?: TextValue;
  publishedDate?: TextValue;
}

export type AllianzDocumentListProps = ComponentProps & {
  fields?: { data?: { datasource?: {
    heading?: TextValue;
    body?: TextValue;
    children?: { results?: AllianzDocument[] };
  } } };
};

const localDocumentPattern = /^\/allianz-assets\/[a-z0-9][a-z0-9._-]*\.(?:pdf|docx?)$/i;
const capturedSources = new Map(capturedDocuments
  .filter((document) => document.status === 'available' && localDocumentPattern.test(document.file.jsonValue.value.src))
  .map((document) => [document.sourceUrl.jsonValue.value.toLowerCase(), document.file.jsonValue.value.src]));

/** Only app-local documents or a captured public document's local copy may open. */
export function localDocumentHref(source?: string): string {
  if (!source) return '';
  if (localDocumentPattern.test(source)) return source;
  try {
    const url = new URL(source, 'https://www.allianzlife.com');
    if (url.origin !== 'https://www.allianzlife.com' || url.username || url.password) return '';
    return capturedSources.get(url.href.toLowerCase()) || capturedSources.get(`${url.origin}${url.pathname}`.toLowerCase()) || '';
  } catch { return ''; }
}
