'use client';

import { Image, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderTextField } from 'lib/allianz-field-state';
import { companyHeroFields, type CompanyHeroProps } from './company-hero.props';
import './NewsroomShort.css';

const hasBlockMarkup = (value?: string) => /<(?:div|h[1-6]|p|ul|ol|blockquote)\b/i.test(value ?? '');

/** Why's source overlay has one picture and fixed centered h1/subtitle. */
export const Overlay = ({ fields, params }: CompanyHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  if (!fields?.data?.datasource) return <NoDataFallback componentName="Company Hero" />;
  const source = companyHeroFields(fields.data.datasource);
  return <div className="l-container-full-width c-hero m-hero-overlay allianz-company-hero" id={params?.RenderingIdentifier}>
    <div className="m-axlHero">
      {shouldRenderImageField(source.image?.jsonValue, isEditing) &&
        <picture className="c-image c-stage__image--cover">
          <Image field={source.image?.jsonValue} editable={isEditing} className="c-image__img c-hero__image" />
        </picture>}
      <div className="l-grid l-grid--max-width l-grid--no-gutters">
        <div className="l-grid__column-medium-12 c-hero__wrapper">
          {shouldRenderTextField(source.heading?.jsonValue, isEditing) &&
            <Text field={source.heading?.jsonValue} editable={isEditing} tag="h1" className="c-heading c-hero__headline u-text-center" />}
          {shouldRenderTextField(source.subtitle?.jsonValue, isEditing) &&
            <RichText field={source.subtitle?.jsonValue} editable={isEditing}
              tag={hasBlockMarkup(source.subtitle?.jsonValue?.value) ? 'div' : 'p'} className="h4 c-heading c-hero__subHeadline u-text-center" />}
        </div>
      </div>
    </div>
  </div>;
};

export const Default = Overlay;

/** Newsroom's short picture and centered heading use the existing three fields. */
export const NewsroomShort = ({ fields, params }: CompanyHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  if (!fields?.data?.datasource) return <NoDataFallback componentName="Company Hero" />;
  const source = companyHeroFields(fields.data.datasource);
  return <div className="l-container-full-width allianz-newsroom-short-hero" id={params?.RenderingIdentifier}>
    <div className="m-axlHero">
      {shouldRenderImageField(source.image?.jsonValue, isEditing) &&
        <picture className="c-image c-stage__image--cover c-stage__image--short">
          <Image field={source.image?.jsonValue} editable={isEditing} className="c-image__img c-hero__image" />
        </picture>}
      <div className="l-grid l-grid--max-width l-grid--no-gutters">
        <div className="l-grid__column-medium-12 c-hero__wrapper">
          {shouldRenderTextField(source.heading?.jsonValue, isEditing) &&
            <Text field={source.heading?.jsonValue} editable={isEditing} tag="h1" className="c-heading c-hero__headline u-text-center" />}
          {shouldRenderTextField(source.subtitle?.jsonValue, isEditing) &&
            <RichText field={source.subtitle?.jsonValue} editable={isEditing}
              tag={hasBlockMarkup(source.subtitle?.jsonValue?.value) ? 'div' : 'p'} className="h4 c-heading c-hero__subHeadline u-text-center" />}
        </div>
      </div>
    </div>
  </div>;
};
