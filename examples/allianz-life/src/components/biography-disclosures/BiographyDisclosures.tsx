'use client';

import { RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import type { BiographyDisclosuresProps } from './biography-disclosures.props';

/** Three source biography-specific notes have this grey introduction shell. */
export const Default = ({ fields, params }: BiographyDisclosuresProps) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Biography Disclosures" />;
  const body = data.body?.jsonValue;
  return <div className="component biography-disclosures l-container--full-width t-bg-grey-muted axlTileCollection" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row">
        <div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image">
            <div className="tileContent u-text-left">
              <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
              {shouldRenderTextField(body, editable)
                ? <RichText className="tileBody" field={body} editable={editable} />
                : <div className="tileBody" />}
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>;
};
