'use client';

import { RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import type { ProductDisclosuresProps } from './product-disclosures.props';

/** The Home product disclosures have one semantic body field and a fixed design. */
export const Default = ({ fields, params }: ProductDisclosuresProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Product Disclosures" />;

  const body = datasource.body?.jsonValue;

  return (
    <div className="l-container--full-width t-bg-grey-muted axlTileCollection" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row">
          <div className="l-grid__column-medium-12">
            <article className="m-axlIntroductionBlock -is--stacked -no--image">
              <div className="tileContent u-text-left">
                {/* Fixed source spacing scaffold; these are not authoring fields. */}
                <header aria-hidden="true">
                  <div className="tileHeading" />
                  <div className="tileSubHeading" />
                </header>
                {shouldRenderTextField(body, isEditing) && (
                  <RichText field={body} editable={isEditing} className="tileBody" />
                )}
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
};

/** FAQ source note has a plain RTE wrapper, without the Home introduction scaffold. */
export const FaqNote = ({ fields, params }: ProductDisclosuresProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Product Disclosures" />;
  return (
    <div className="l-container--full-width t-bg-grey-muted axlTileCollection" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText field={data.body?.jsonValue} editable={isEditing} className="o-richTextEditor__wrapper" />}
      </div></div></div>
    </div>
  );
};
