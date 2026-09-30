'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import MockLogin from 'components/content-sdk/MockLogin';
import { sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { AllianzHeroProps } from './allianz-hero.props';

export const Default = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const home = params.layout === 'home';
  const productTheme = ['fixed','variable','life'].includes(params.heroTheme) ? `c-hero__theme--${params.heroTheme}` : '';
  if (!home) return (
    <div className={`l-container-full-width ${sectionTheme(params.theme)} ${productTheme}`}>
      <div className="m-axlHero">
        {shouldRenderImageField(data.desktopImage?.jsonValue, isEditing) && <picture className="c-image c-stage__image--cover c-stage__image--short">
          {data.mobileImage?.jsonValue?.value?.src && <source media="(max-width: 703px)" srcSet={data.mobileImage.jsonValue.value.src} />}
          <Image editable={isEditing} field={data.desktopImage?.jsonValue} className="c-image__img c-hero__image" />
        </picture>}
        <div className="l-grid l-grid--max-width l-grid--no-gutters">
          <div className="l-grid__column-medium-12 c-hero__wrapper">
            {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag="h1" field={data.heading?.jsonValue} className="c-heading c-hero__headline u-text-center" />}
            {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="c-hero__subHeadline u-text-center" />}
            {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
            {isEditing && data.mobileImage?.jsonValue && <div className="u-padding-top-sm">Mobile image<Image editable={isEditing} field={data.mobileImage.jsonValue} style={{ maxWidth: '240px' }} /></div>}
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <div className={`l-container-full-width c-hero ${productTheme} ${params.showLogin === '1' ? '-login' : ''}`}>
      <div className="c-hero__gridWrapper">
        <picture className="c-image c-stage__image--cover">
          {data.mobileImage?.jsonValue?.value?.src && <source media="(max-width: 703px)" srcSet={data.mobileImage.jsonValue.value.src} />}
          <Image editable={isEditing} field={data.desktopImage?.jsonValue} className="c-image__img c-hero__image" />
        </picture>
        <div className="c-hero__gridWrapperBackground">
          <div className="l-grid l-grid--max-width"><div className="l-grid__row">
            <div className={params.showLogin === '1' ? 'l-grid__column-small-12 l-grid__column-large-8' : 'l-grid__column-small-12'}>
              {shouldRenderTextField(data.eyebrow?.jsonValue, isEditing) && <Text editable={isEditing} field={data.eyebrow?.jsonValue} tag="p" />}
              {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag="h1" field={data.heading?.jsonValue} className="c-heading c-hero__headline" />}
              {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="h4 c-heading c-hero__subHeadline" />}
              {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
              {shouldRenderLinkField(data.secondaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.secondaryLink?.jsonValue, isEditing)} className="a-link" />}
              {isEditing && data.mobileImage?.jsonValue && <div className="u-padding-top-sm">Mobile image<Image editable={isEditing} field={data.mobileImage.jsonValue} style={{ maxWidth: '240px' }} /></div>}
            </div>
            {params.showLogin === '1' && <div className="l-grid__column-small-12 l-grid__column-large-4 c-hero__loginForm"><MockLogin /></div>}
          </div></div>
        </div>
      </div>
    </div>
  );
};
