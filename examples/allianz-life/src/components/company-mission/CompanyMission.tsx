'use client';

import { RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { CompanyMissionProps } from './company-mission.props';

/** The company mission section has one content field and a fixed design. */
export const Default = ({ fields, params }: CompanyMissionProps) => {
  const { page } = useSitecore();
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Company Mission" />;
  return <div className="l-container--full-width t-bg-transparent" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-xl">
        <div className="l-grid__column-medium-12">
          <RichText field={datasource.missionStatement?.jsonValue}
            editable={page?.mode?.isEditing ?? false} className="o-richTextEditor__wrapper" />
        </div>
      </div>
    </div>
  </div>;
};
