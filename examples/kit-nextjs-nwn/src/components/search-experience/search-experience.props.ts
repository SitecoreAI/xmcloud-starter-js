import type { OptionalComponentProps } from '@/lib/component-props';

export type SearchExperienceParams = {
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
  type?: string;
};

export type SearchConfiguration = {
  searchIndex: string;
  fieldsMapping: SearchFieldsMapping;
};

export type SearchResultPrimitive = string | number | boolean | null;

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
