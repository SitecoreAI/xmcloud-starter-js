import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import type { MediaContactRecord } from '../media-contact/media-contact.props';
import { newsroomReferenceIds } from '../press-release-archive/press-release-archive.props';

type TextValue = { jsonValue?: Field<string> };
type NativeField = { name?: string; jsonValue?: unknown };

export interface NewsroomPublicRelationsDatasource {
  id?: string;
  heading?: TextValue;
  intro?: TextValue;
  contacts?: { jsonValue?: unknown };
  /** Separate alias keeps the native Multilist field metadata in fieldCollection. */
  contactReferences?: {
    targetItems?: (MediaContactRecord | null)[] | null;
    total?: number;
    pageInfo?: { hasNext?: boolean };
  } | null;
  fieldCollection?: NativeField[] | null;
}

export type NewsroomPublicRelationsProps = ComponentProps & {
  fields?: { data?: { datasource?: NewsroomPublicRelationsDatasource } };
};

export function newsroomPublicRelationsFields(item: NewsroomPublicRelationsDatasource): NewsroomPublicRelationsDatasource {
  if (!Array.isArray(item.fieldCollection)) return item;
  const result = { ...item } as Record<string, unknown>;
  const allowed = new Set(['heading', 'intro', 'contacts']);
  for (const field of item.fieldCollection) {
    if (!field || typeof field.name !== 'string' || !Object.hasOwn(field, 'jsonValue')) continue;
    const name = field.name.toLowerCase();
    if (allowed.has(name) && !Object.hasOwn(result, name)) result[name] = { jsonValue: field.jsonValue };
  }
  return result as NewsroomPublicRelationsDatasource;
}

/** Known native selections must agree with the complete, ordered reference alias.
 * Unknown serializer shapes are left unclaimed, never inferred from child data. */
export function newsroomContactItems(list?: NewsroomPublicRelationsDatasource['contactReferences'], jsonValue?: unknown): {
  items: MediaContactRecord[];
  complete: boolean;
} {
  const expected = newsroomReferenceIds(jsonValue);
  // Deliberate native clears win even if resolver data still contains old records.
  if (expected?.length === 0) return { items: [], complete: true };
  if (!list) return { items: [], complete: expected === undefined };
  const items = list.targetItems ?? [];
  const complete = Array.isArray(list.targetItems) && !list.pageInfo?.hasNext &&
    (list.total === undefined || list.total === items.length) && items.every((item) => Boolean(item?.id)) &&
    (expected === undefined || (expected.length === items.length && expected.every((id, index) =>
      id === items[index]?.id?.replace(/[{}-]/g, '').toLowerCase())));
  return { items: complete ? items as MediaContactRecord[] : [], complete };
}
