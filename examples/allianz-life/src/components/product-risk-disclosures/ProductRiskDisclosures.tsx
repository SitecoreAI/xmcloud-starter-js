'use client';

import { RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import type { ProductRiskDisclosuresProps } from './product-risk-disclosures.props';

/** Risk copy keeps the source disclosure shell and its independently authored body. */
export const Default = ({ fields, params }: ProductRiskDisclosuresProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Product Risk Disclosures" />;
  const body = datasource.body?.jsonValue;

  return (
    <div className="l-container--full-width a-axlDisclosures" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row">
          <div className="l-grid__column">
            <div className="row">
              {shouldRenderTextField(body, isEditing) && (
                <RichText field={body} editable={isEditing} className="col-md-12 content-body disclosure" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
