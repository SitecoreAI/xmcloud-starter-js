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

export type ArticleHeaderExternalFields = {
  pageHeaderTitle?: GraphQLTextField;
  pageReadTime?: GraphQLTextField;
  pageDisplayDate?: GraphQLTextField;
  pageAuthor?: {
    jsonValue: PersonItem;
  };
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
