'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import MockLogin from 'components/content-sdk/MockLogin';
import { sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { hasEditorialBlockMarkup, safeEditorialRichText } from 'lib/allianz-editorial';
import './AllianzEditorialHero.css';
import type { AllianzHeroProps } from './allianz-hero.props';
import './AllianzFaqHero.css';

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
          <Image editable={isEditing} field={data.desktopImage?.jsonValue} alt={data.desktopImage?.jsonValue?.value?.alt ?? ''} className="c-image__img c-hero__image" />
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
          <Image editable={isEditing} field={data.desktopImage?.jsonValue} alt={data.desktopImage?.jsonValue?.value?.alt ?? ''} className="c-image__img c-hero__image" />
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

const hasFaqBlockMarkup = (value?: string): boolean =>
  /<(?:address|article|aside|blockquote|div|dl|fieldset|figure|footer|form|h[1-6]|header|hr|main|nav|ol|p|pre|section|table|ul)\b/i.test(value ?? '');

/** Fixed-product FAQ title/subtitle, with no invented hero image or CTA. */
export const FixedFaq = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const blockHeading = hasFaqBlockMarkup(data.heading?.jsonValue?.value);
  return (
    <div className="l-container-full-width t-bg-product-fixed c-hero__theme--fixed allianz-faq-hero" id={params?.RenderingIdentifier}>
      <div className="m-axlHero">
        <picture className="c-image c-stage__image--cover c-stage__image--short" />
        <div className="l-grid l-grid--max-width l-grid--no-gutters">
          <div className="l-grid__column-medium-12 c-hero__wrapper">
            {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined} aria-level={blockHeading ? 1 : undefined} field={data.heading?.jsonValue} className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline u-text-center`} />}
            {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} tag={hasFaqBlockMarkup(data.body?.jsonValue?.value) ? 'div' : 'p'} field={data.body?.jsonValue} className="h4 c-heading c-hero__subHeadline u-text-center" />}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Short editorial stage with source subtitle typography and native DAM fields. */
export const Editorial = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const blockHeading = hasEditorialBlockMarkup(data.heading?.jsonValue?.value);
  return <div className={`l-container-full-width ${sectionTheme(params.theme)} allianz-editorial-hero`} id={params.RenderingIdentifier}>
    <div className="m-axlHero">
      <picture className="c-image c-stage__image--cover c-stage__image--short">
        {data.mobileImage?.jsonValue?.value?.src && <source media="(max-width: 703px)" srcSet={data.mobileImage.jsonValue.value.src} />}
        {shouldRenderImageField(data.desktopImage?.jsonValue, isEditing) && <Image editable={isEditing} field={data.desktopImage?.jsonValue} alt={data.desktopImage?.jsonValue?.value?.alt ?? ''} className="c-image__img c-hero__image" />}
      </picture>
      <div className="l-grid l-grid--max-width l-grid--no-gutters"><div className="l-grid__column-medium-12 c-hero__wrapper">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined} aria-level={blockHeading ? 1 : undefined} field={safeEditorialRichText(data.heading?.jsonValue, isEditing)} className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline u-text-center`} />}
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} tag={hasEditorialBlockMarkup(data.body?.jsonValue?.value) ? 'div' : 'p'} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="h4 c-heading c-hero__subHeadline u-text-center" />}
        {isEditing && data.mobileImage?.jsonValue && <div className="u-padding-top-sm">Mobile image<Image editable={isEditing} field={data.mobileImage.jsonValue} style={{ maxWidth: '240px' }} /></div>}
      </div></div>
    </div>
  </div>;
};
