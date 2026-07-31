import type {
  Field,
  ImageField,
  LinkField,
} from '@sitecore-content-sdk/nextjs';
import type {
  CompatibleField,
  GraphQLImageField,
  GraphQLTextField,
  OptionalComponentProps,
} from '@/lib/component-props';
import type { ReferenceField } from '@/types/ReferenceField.props';

export type ArticleHeaderParams = {
  [key: string]: unknown;
};

export type ArticleHeaderDatasource = {
  imageRequired?: GraphQLImageField;
  eyebrowOptional?: GraphQLTextField;
};

export type ArticleAuthorItemFields = {
  pageHeaderTitle?: Field<string>;
  pageThumbnail?: ImageField;
  pageSubtitle?: Field<string>;
  personProfileImage?: ImageField;
  personFirstName?: Field<string>;
  personLastName?: Field<string>;
  personJobTitle?: Field<string>;
  personBio?: Field<string>;
  personLinkedIn?: LinkField;
};

export type ArticleAuthorItem = Omit<ReferenceField, 'url' | 'fields'> & {
  url?:
    | string
    | {
        href?: string;
      };
  fields?: ArticleAuthorItemFields;
};

export type ArticleReferenceItemFields = {
  pageHeaderTitle?: Field<string>;
  titleRequired?: Field<string>;
  descriptionOptional?: Field<string>;
  linkOptional?: LinkField;
};

export type ArticleReferenceItem = Omit<ReferenceField, 'url' | 'fields'> & {
  url?:
    | string
    | {
        href?: string;
      };
  fields?: ArticleReferenceItemFields;
};

export type ArticleReferenceField<
  T extends ArticleReferenceItem = ArticleReferenceItem,
> = CompatibleField<T | null>;

export type ArticleReferenceListField = CompatibleField<ArticleReferenceItem[]>;

export type ArticleHeaderExternalFields = {
  pageHeaderTitle?: CompatibleField<Field<string>>;
  pageSummary?: CompatibleField<Field<string>>;
  pageReadTime?: CompatibleField<Field<string>>;
  pageDisplayDate?: CompatibleField<Field<string>>;
  pageAuthor?: CompatibleField<ArticleAuthorItem | null>;
  contentType?: ArticleReferenceField;
  topics?: ArticleReferenceListField;
  relatedPractice?: ArticleReferenceField;
  relatedOffice?: ArticleReferenceField;
  sourceItem?: ArticleReferenceField;
  relatedInsights?: ArticleReferenceListField;
};

export type ArticleHeaderRouteFields = {
  pageHeaderTitle?: Field<string>;
  pageSummary?: Field<string>;
  pageReadTime?: Field<string>;
  pageDisplayDate?: Field<string>;
  taxAuthor?: ArticleAuthorItem | null;
  taxContentType?: ArticleReferenceItem | null;
  taxTopic?: ArticleReferenceItem[];
  relatedPractice?: ArticleReferenceItem | null;
  relatedOffice?: ArticleReferenceItem | null;
  sourceItem?: ArticleReferenceItem | null;
  relatedInsights?: ArticleReferenceItem[];
};

export type ArticleHeaderFields = {
  data?: {
    datasource?: ArticleHeaderDatasource;
    externalFields?: ArticleHeaderExternalFields;
  };
};

export type ArticleHeaderProps = OptionalComponentProps & {
  params: ArticleHeaderParams;
  fields?: ArticleHeaderFields;
};
