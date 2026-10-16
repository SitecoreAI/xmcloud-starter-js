import type { ImageField } from '@sitecore-content-sdk/nextjs';
import type { AllianzProps } from 'lib/allianz-fields';

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
};
