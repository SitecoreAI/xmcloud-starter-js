import type { AllianzProps } from 'lib/allianz-fields';
import type { NativeCardEntry } from 'lib/allianz-card-fields';

export type AllianzCardGridProps = AllianzProps & {
  fields?: {
    data?: {
      datasource?: {
        children?: { results: NativeCardEntry[] };
      };
    };
  };
};
