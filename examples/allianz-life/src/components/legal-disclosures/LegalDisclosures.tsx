'use client';

import { RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import type { LegalDisclosuresProps } from './legal-disclosures.props';

/** Body-only disclosure purpose, independently sourced on all 81 newsroom pages. */
export const Default = ({ fields, params }: LegalDisclosuresProps) => {
  const { page } = useSitecore();
  const data = fields?.data?.datasource;
  const editable = page?.mode?.isEditing ?? false;
  if (!data) return <NoDataFallback componentName="Legal Disclosures" />;
  const body = data.body?.jsonValue;
  return (
    <div className="component legal-disclosures l-container--full-width a-axlDisclosures" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row">
          <div className="l-grid__column">
            <div className="row">
              {shouldRenderTextField(body, editable)
                ? <RichText className="col-md-12 content-body disclosure" field={body} editable={editable} />
                : <div className="col-md-12 content-body disclosure" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
