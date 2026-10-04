import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** One linked resource card, without design or redundant link-list fields. */
export interface HelpfulResourceEntry {
  id: string;
  title?: { jsonValue?: Field<string> };
  text?: { jsonValue?: Field<string> };
  image?: { jsonValue?: ImageField };
  link?: { jsonValue?: LinkField };
  fieldCollection?: { name?: string; jsonValue?: unknown }[] | null;
}

export interface HelpfulResourcesDatasource {
  id?: string;
  title?: { jsonValue?: Field<string> };
  icon?: { jsonValue?: ImageField };
  children?: {
    total?: number;
    pageInfo?: { hasNext?: boolean; endCursor?: string | null };
    results: HelpfulResourceEntry[];
  };
}

export type HelpfulResourcesProps = ComponentProps & {
  fields?: { data?: { datasource?: HelpfulResourcesDatasource } };
};
