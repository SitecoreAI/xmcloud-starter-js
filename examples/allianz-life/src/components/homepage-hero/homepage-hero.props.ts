import type { Field, ImageField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

/** Content for the fixed homepage hero, without generic hero design controls. */
export type HomepageHeroProps = ComponentProps & {
  fields?: {
    data?: {
      datasource?: {
        heading?: { jsonValue?: Field<string> };
        body?: { jsonValue?: Field<string> };
        /** One source image covers the hero at every viewport. */
        desktopImage?: { jsonValue?: ImageField };
      };
    };
  };
};
