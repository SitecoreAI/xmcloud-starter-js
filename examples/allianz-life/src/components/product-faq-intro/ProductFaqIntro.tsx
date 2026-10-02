'use client';

import { Image, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { ProductFaqIntroProps } from './product-faq-intro.props';
import './ProductFaqIntro.css';

/** The fixed introduction has a centered h3 and an authored question icon. */
export const Default = ({ fields, params }: ProductFaqIntroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Product FAQ Intro" />;
  const heading = datasource.heading?.jsonValue;
  const icon = datasource.icon?.jsonValue;

  return <div className="l-container--full-width t-bg-transparent axlTileCollection allianz-product-faq-intro"
    id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
        <div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image">
            <div className="tileContent u-text-center">
              {shouldRenderImageField(icon, isEditing) &&
                <div className="tileIcon t-bg-primary-brand t-icon-primary-white">
                  <Image field={icon} editable={isEditing} />
                </div>}
              {shouldRenderTextField(heading, isEditing) && <header>
                <div className="tileHeading"><Text field={heading} editable={isEditing} tag="h3" /></div>
                <div className="tileSubHeading" aria-hidden="true" />
              </header>}
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>;
};
