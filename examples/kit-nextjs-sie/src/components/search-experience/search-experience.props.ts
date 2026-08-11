import type { OptionalComponentProps } from '@/lib/component-props';

export type SearchExperienceParams = {
  pageSize?: string | number;
  searchIndexId?: string;
  sourceId?: string;
  GridParameters?: string;
  RenderingIdentifier?: string;
  styles?: string;
  [key: string]: string | number | undefined;
};

export type SearchFieldsMapping = {
  title?: string;
  description?: string;
  link?: string;
};

export type SearchConfiguration = {
  searchIndex: string;
  fieldsMapping: SearchFieldsMapping;
};

export type SearchResultValue =
  | string
  | number
  | boolean
  | null
  | SearchResultValue[]
  | { [key: string]: SearchResultValue };

export type SearchResultDocument = {
  [key: string]: SearchResultValue;
};

export type SearchExperienceFields = {
  search?: {
    value?: string | null;
  };
};

export type SearchExperienceProps = OptionalComponentProps & {
  params: SearchExperienceParams;
  fields?: SearchExperienceFields;
};
