'use client';

import { Image, RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import MockLogin from 'components/content-sdk/MockLogin';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { HomepageHeroProps } from './homepage-hero.props';
import './HomepageHero.css';

// Captured body copy is inline text in a paragraph. Keep previously authored
// Rich Text blocks intact, with a div wrapper to avoid invalid nested paragraphs.
const hasBlockMarkup = (value?: string): boolean =>
  /<(?:address|article|aside|blockquote|div|dl|fieldset|figure|footer|form|h[1-6]|header|hr|main|nav|ol|p|pre|section|table|ul)\b/i.test(value ?? '');

/** Homepage source design: branded heading, body, one cover image and login. */
export const Default = ({ fields, params }: HomepageHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Homepage Hero" />;
  const blockHeading = hasBlockMarkup(datasource.heading?.jsonValue?.value);

  return <div className="l-container-full-width c-hero -login allianz-homepage-hero" id={params?.RenderingIdentifier}>
    <div className="c-hero__gridWrapper">
      {shouldRenderImageField(datasource.desktopImage?.jsonValue, isEditing) &&
        <picture className="c-image c-stage__image--cover">
          <Image field={datasource.desktopImage?.jsonValue} editable={isEditing}
            className="c-image__img c-hero__image" />
        </picture>}
      <div className="c-hero__gridWrapperBackground">
        <div className="l-grid l-grid--max-width">
          <div className="l-grid__row">
            <div className="l-grid__column-small-12 l-grid__column-large-8">
              {shouldRenderTextField(datasource.heading?.jsonValue, isEditing) &&
                <RichText field={datasource.heading?.jsonValue} editable={isEditing}
                  tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined}
                  aria-level={blockHeading ? 1 : undefined}
                  className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline`} />}
              {shouldRenderTextField(datasource.body?.jsonValue, isEditing) &&
                <RichText field={datasource.body?.jsonValue} editable={isEditing}
                  tag={hasBlockMarkup(datasource.body?.jsonValue?.value) ? 'div' : 'p'}
                  className="h4 c-heading c-hero__subHeadline" />}
            </div>
            <div className="l-grid__column-small-12 l-grid__column-large-4 c-hero__loginForm">
              <MockLogin />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
};
