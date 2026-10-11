import type { AllianzDatasource } from 'lib/allianz-fields';
import type { ComponentProps } from 'lib/component-props';

export type AllianzProductNavigationProps = ComponentProps & {
  fields?: {
    data?: {
      datasource?: AllianzDatasource | null;
      contextItem?: { id?: string } | null;
    };
  };
};
