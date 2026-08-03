import type { OptionalComponentProps } from '@/lib/component-props';

export type SearchExperienceParams = {
  columns?: string;
  pageSize?: string | number;
  GridParameters?: string;
  RenderingIdentifier?: string;
  styles?: string;
  [key: string]: unknown;
};

export type SearchFieldsMapping = {
  title?: string;
  description?: string;
  link?: string;
  images?: string;
  type?: string;
  tags?: string;
  author?: string;
  practice?: string;
  office?: string;
  date?: string;
  language?: string;
};

export type SearchConfiguration = {
  searchIndex: string;
  fieldsMapping: SearchFieldsMapping;
};

export type SearchResultPrimitive = string | number | boolean;

export type SearchResultDocument = {
  [key: string]:
    | SearchResultPrimitive
    | SearchResultPrimitive[]
    | SearchResultDocument
    | SearchResultDocument[];
};

export type SearchResultValue =
  | SearchResultPrimitive
  | SearchResultPrimitive[]
  | SearchResultDocument
  | SearchResultDocument[];

export type SearchExperienceFields = {
  search?: {
    value?: string | null;
  };
};

export type SearchExperienceProps = OptionalComponentProps & {
  params: SearchExperienceParams;
  fields?: SearchExperienceFields;
};
