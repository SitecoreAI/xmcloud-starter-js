import type { ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import { newsroomFields, newsroomReferenceIds, type NewsroomNativeField, type NewsroomRelease, type NewsroomTextValue } from 'components/press-release-archive/press-release-archive.props';

export interface NewsroomFeaturedUpdateDatasource {
  id?: string;
  label?: NewsroomTextValue;
  release?: { jsonValue?: unknown; targetItem?: NewsroomRelease | null } | null;
  body?: NewsroomTextValue;
  image?: { jsonValue?: ImageField };
  fieldCollection?: NewsroomNativeField[] | null;
}
export type NewsroomFeaturedUpdateProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: NewsroomFeaturedUpdateDatasource } };
};
export const newsroomFeaturedUpdateFields = (item: NewsroomFeaturedUpdateDatasource) =>
  newsroomFields(item, ['label', 'body', 'image']);

export function newsroomFeaturedRelease(item: NewsroomFeaturedUpdateDatasource): NewsroomRelease | undefined {
  const expected = newsroomReferenceIds(item.release?.jsonValue);
  const target = item.release?.targetItem;
  if (!target?.id || expected?.length === 0) return undefined;
  if (expected && (expected.length !== 1 || expected[0] !== target.id.replace(/[{}-]/g, '').toLowerCase())) return undefined;
  return target;
}
