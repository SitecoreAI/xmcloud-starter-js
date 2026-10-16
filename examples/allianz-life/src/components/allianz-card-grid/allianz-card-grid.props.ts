import type { ImageValue, AllianzProps } from 'lib/allianz-fields';
import type { NativeCardEntry } from 'lib/allianz-card-fields';

export type AllianzCardGridProps = AllianzProps & {
  fields?: {
    data?: {
      datasource?: {
        icon?: ImageValue;
        children?: { results: NativeCardEntry[] };
      };
    };
  };
};

/** Internal presentation supplied by named variants, never authored parameters. */
export type AllianzCardGridDefaultProps = AllianzCardGridProps & {
  sourceDownloadLinks?: boolean;
  headingIconAppearance?: 'gray' | 'brand';
};
