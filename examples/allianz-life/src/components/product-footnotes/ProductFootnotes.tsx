'use client';

import { RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { safeEditorialRichText } from 'lib/allianz-editorial';
import type { ProductFootnotesProps } from './product-footnotes.props';

/** The source footnotes use the grey rich-text wrapper, without a tile or heading. */
export const Default = ({ fields, params }: ProductFootnotesProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Product Footnotes" />;
  const body = safeEditorialRichText(datasource.body?.jsonValue, isEditing, true, () => true);

  return (
    <div className="l-container--full-width t-bg-grey-muted axlTileCollection" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row">
          <div className="l-grid__column-medium-12">
            {shouldRenderTextField(body, isEditing) && (
              <RichText field={body} editable={isEditing} className="o-richTextEditor__wrapper" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
