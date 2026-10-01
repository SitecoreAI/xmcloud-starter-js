import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

export type CompanyMissionProps = ComponentProps & {
  fields?: {
    data?: {
      datasource?: {
        missionStatement?: { jsonValue?: Field<string> };
      };
    };
  };
};
