import type {
  Field,
  ImageField,
  LinkField,
} from '@sitecore-content-sdk/nextjs';
import type {
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

export type PersonItemFields = {
  personProfileImage?: ImageField;
  personFirstName?: Field<string>;
  personLastName?: Field<string>;
  personJobTitle?: Field<string>;
  personBio?: Field<string>;
  personLinkedIn?: LinkField;
};

export type PersonItem = ReferenceField & {
  fields?: PersonItemFields;
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
> = {
  jsonValue?: T | null;
};

export type ArticleReferenceListField = {
  jsonValue?: ArticleReferenceItem[];
};

export type ArticleHeaderExternalFields = {
  pageHeaderTitle?: GraphQLTextField;
  pageSummary?: GraphQLTextField;
  pageReadTime?: GraphQLTextField;
  pageDisplayDate?: GraphQLTextField;
  pageAuthor?: {
    jsonValue: PersonItem;
  };
  contentType?: ArticleReferenceField;
  topics?: ArticleReferenceListField;
  relatedPractice?: ArticleReferenceField;
  relatedOffice?: ArticleReferenceField;
  sourceItem?: ArticleReferenceField;
  relatedInsights?: ArticleReferenceListField;
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
