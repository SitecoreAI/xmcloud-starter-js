import type { LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import {
  newsroomFields, type NewsroomNativeField, type NewsroomTextValue,
} from 'components/press-release-archive/press-release-archive.props';

export interface NewsroomRecentReleasesDatasource {
  id?: string;
  heading?: NewsroomTextValue;
  moreLink?: { jsonValue?: LinkField };
  fieldCollection?: NewsroomNativeField[] | null;
}
export type NewsroomRecentReleasesProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: NewsroomRecentReleasesDatasource } };
};
export const newsroomRecentReleasesFields = (item: NewsroomRecentReleasesDatasource) =>
  newsroomFields(item, ['heading', 'moreLink']);
