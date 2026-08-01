import type {
  Field,
  ImageField,
  LinkFieldValue,
} from '@sitecore-content-sdk/nextjs';
import type { OptionalComponentProps } from '@/lib/component-props';

export type ChildPageListingParams = {
  styles?: string;
  listingType?: 'lawyers' | 'news' | 'locations';
  [key: string]: unknown;
};

export type ChildPageListingField<T> = {
  jsonValue?: T;
};

export type ChildPageListingNestedItem = {
  id?: string;
  imageRequired?: ChildPageListingField<ImageField>;
  items?: {
    results?: ChildPageListingNestedItem[];
  };
  children?: {
    results?: ChildPageListingNestedItem[];
  };
};

export type ChildPageListingPage = {
  id: string;
  name: string;
  displayName?: string;
  url?: string | (LinkFieldValue & { path?: string });
  pageHeaderTitle?: ChildPageListingField<Field<string>>;
  pageSubtitle?: ChildPageListingField<Field<string>>;
  pageSummary?: ChildPageListingField<Field<string>>;
  metadataDescription?: ChildPageListingField<Field<string>>;
  pageThumbnail?: ChildPageListingField<ImageField>;
  pageDisplayDate?: ChildPageListingField<Field<string>>;
  contentFolders?: {
    results?: ChildPageListingNestedItem[];
  };
  children?: {
    results?: ChildPageListingNestedItem[];
  };
};

export type ChildPageListingDatasource = {
  id?: string;
  name?: string;
  displayName?: string;
  url?: string | (LinkFieldValue & { path?: string });
  children?: {
    results?: ChildPageListingPage[];
  };
};

export type ChildPageListingFields = {
  data?: {
    datasource?: ChildPageListingDatasource;
  };
};

export type ChildPageListingProps = OptionalComponentProps & {
  params: ChildPageListingParams;
  fields?: ChildPageListingFields;
};
