import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

type TextField = { jsonValue?: Field<string> };
type IconField = { jsonValue?: ImageField };

export interface IconCardEntry {
  id: string;
  title?: TextField;
  text?: TextField;
  icon?: IconField;
  fieldCollection?: { name?: string; jsonValue?: unknown }[] | null;
  /** Captured About entries use these two names; the new native template does not. */
  heading?: TextField;
  body?: TextField;
}

export interface IconCardsDatasource {
  id?: string;
  title?: TextField;
  children?: {
    total?: number;
    pageInfo?: { hasNext?: boolean; endCursor?: string | null };
    results: IconCardEntry[];
  };
}

export type IconCardsProps = ComponentProps & {
  fields?: { data?: { datasource?: IconCardsDatasource } };
};
