import type { ImageField } from '@sitecore-content-sdk/nextjs';
import type { AllianzProps } from 'lib/allianz-fields';
import type { CultureIntroductionRole } from 'components/culture-source-tile/culture-source-glyph.props';

export type AllianzRichTextProps = AllianzProps & {
  fields?: {
    data?: {
      datasource?: {
        icon?: { jsonValue?: ImageField };
      };
    };
  };
};

/** Internal presentation supplied by named variants, not authored parameters. */
export type AllianzRichTextDefaultProps = AllianzRichTextProps & {
  brandIcon?: boolean;
  bodyDownloadLinks?: boolean;
  bodyArrowLinks?: boolean;
  culturePresentation?: CultureIntroductionRole;
};

/** Internal fixed presentation supplied only by the named Field variants. */
export type AllianzFieldIntroductionProps = AllianzRichTextProps & {
  presentation: 'events' | 'global-stadiums' | 'about';
};

/** Internal named presentation options, never authored layout parameters. */
export type AllianzProfessionalIntroductionProps = AllianzRichTextProps & {
  bodyInSubheading?: boolean;
  sourceLoveGlyph?: boolean;
};
