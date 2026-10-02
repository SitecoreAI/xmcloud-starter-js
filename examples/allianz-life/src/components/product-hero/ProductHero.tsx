'use client';

import { Image, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { ProductHeroProps } from './product-hero.props';

/** The source Annuities hero has a short image and one centered headline. */
export const Default = ({ fields, params }: ProductHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Product Hero" />;
  const heading = datasource.heading?.jsonValue;
  const image = datasource.image?.jsonValue;

  return (
    <div className="l-container-full-width t-bg-blue-soft" id={params?.RenderingIdentifier}>
      <div className="m-axlHero">
        {shouldRenderImageField(image, isEditing) && (
          <picture className="c-image c-stage__image--cover c-stage__image--short">
            <Image field={image} editable={isEditing} className="c-image__img c-hero__image" />
          </picture>
        )}
        <div className="l-grid l-grid--max-width l-grid--no-gutters">
          <div className="l-grid__column-medium-12 c-hero__wrapper">
            {shouldRenderTextField(heading, isEditing) && (
              <Text field={heading} editable={isEditing} tag="h1"
                className="c-heading c-hero__headline u-text-center" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
