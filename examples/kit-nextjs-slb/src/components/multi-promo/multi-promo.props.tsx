import { ComponentProps } from '@/lib/component-props';
import { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';

export interface MultiPromoParams {
  numColumns?: string;
  slbPresentation?: 'card-grid' | 'content-rail' | 'related';
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface MultiPromoFields {
  data?: {
    datasource?: {
      title?: { jsonValue: Field<string> };
      description?: { jsonValue: Field<string> };
      children?: {
        results: MultiPromoItemProps[];
      };
    };
  };
}

/**
 * Model used for Sitecore Component integration
 */
export interface MultiPromoProps extends ComponentProps {
  params: MultiPromoParams;
  fields?: MultiPromoFields;
  name: string;
  promos: React.Component[];
}

export type MultiPromoItemProps = {
  isPageEditing?: boolean;
  itemNumber?: number;
  presentation?: MultiPromoParams['slbPresentation'];
  heading: {
    jsonValue: Field<string>;
  };
  description?: {
    jsonValue?: Field<string>;
  };
  image: {
    jsonValue: ImageField;
  };
  link?: {
    jsonValue?: LinkField;
  };
};
