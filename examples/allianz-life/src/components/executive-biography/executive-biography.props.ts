import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export interface ExecutiveBiographyDatasource {
  id?: string;
  name?: { jsonValue?: Field<string> };
  role?: { jsonValue?: Field<string> };
  portrait?: { jsonValue?: ImageField };
  biography?: { jsonValue?: Field<string> };
  /** Optional source image link; independently clearable from the portrait. */
  portraitLink?: { jsonValue?: LinkField };
}

export type ExecutiveBiographyProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: ExecutiveBiographyDatasource } };
};

export interface ExecutiveBiographyLayout {
  headingSpacing: boolean;
  roleTag: 'h4' | 'h2';
  bodyContainer: 'l-container--full-width' | 'l-container';
  bodyMargin: boolean;
  portraitWidth: boolean;
  linkedPortrait: boolean;
}

/** Source design choices are fixed rendering variants, never author parameters. */
export const executiveBiographyLayouts = {
  standard: { headingSpacing: false, roleTag: 'h4', bodyContainer: 'l-container--full-width', bodyMargin: false, portraitWidth: true, linkedPortrait: false },
  extended: { headingSpacing: false, roleTag: 'h4', bodyContainer: 'l-container--full-width', bodyMargin: true, portraitWidth: false, linkedPortrait: false },
  contained: { headingSpacing: false, roleTag: 'h4', bodyContainer: 'l-container', bodyMargin: true, portraitWidth: true, linkedPortrait: false },
  chiefExecutive: { headingSpacing: true, roleTag: 'h2', bodyContainer: 'l-container--full-width', bodyMargin: false, portraitWidth: true, linkedPortrait: false },
  linkedPortrait: { headingSpacing: false, roleTag: 'h4', bodyContainer: 'l-container--full-width', bodyMargin: false, portraitWidth: false, linkedPortrait: true },
} as const satisfies Record<string, ExecutiveBiographyLayout>;
