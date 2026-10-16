'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import MockLogin from 'components/content-sdk/MockLogin';
import { sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { hasEditorialBlockMarkup, safeEditorialRichText } from 'lib/allianz-editorial';
import './AllianzEditorialHero.css';
import type { AllianzHeroProps, AllianzHeroStageProps } from './allianz-hero.props';
import './AllianzFaqHero.css';

export const Default = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const home = params.layout === 'home';
  const productTheme = ['fixed','variable','life'].includes(params.heroTheme) ? `c-hero__theme--${params.heroTheme}` : '';
  const themeClass = params.theme === 'product-fixed' ? 't-bg-product-fixed' : sectionTheme(params.theme);
  if (!home) return (
    <div className={`l-container-full-width ${themeClass} ${productTheme}`}>
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
            {isEditing && data.mobileImage?.jsonValue && <div className="u-padding-top-sm">Mobile image<Image editable={isEditing} field={data.mobileImage.jsonValue} style={{ maxWidth: '240px', height: 'auto' }} /></div>}
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
              {isEditing && data.mobileImage?.jsonValue && <div className="u-padding-top-sm">Mobile image<Image editable={isEditing} field={data.mobileImage.jsonValue} style={{ maxWidth: '240px', height: 'auto' }} /></div>}
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

/** Shared short stage; product background support is opt-in for LifeStrategy. */
const EditorialStage = ({ fields, params, lifeStrategy = false }: AllianzHeroStageProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const blockHeading = hasEditorialBlockMarkup(data.heading?.jsonValue?.value);
  const themeClass = lifeStrategy
    ? params.theme === 'product-life' ? 't-bg-product-life' : params.theme ? sectionTheme(params.theme) : ''
    : sectionTheme(params.theme);
  const productTheme = lifeStrategy && params.heroTheme === 'life' ? 'c-hero__theme--life' : '';
  const stageClasses = lifeStrategy
    ? `l-container-full-width ${themeClass} ${productTheme} allianz-editorial-hero`
    : `l-container-full-width ${themeClass}${params.layout === 'home' ? ' c-hero m-hero-overlay' : ''} allianz-editorial-hero`;
  return <div className={stageClasses} id={params.RenderingIdentifier}>
    <div className="m-axlHero">
      <picture className="c-image c-stage__image--cover c-stage__image--short">
        {data.mobileImage?.jsonValue?.value?.src && <source media="(max-width: 703px)" srcSet={data.mobileImage.jsonValue.value.src} />}
        {shouldRenderImageField(data.desktopImage?.jsonValue, isEditing) && <Image editable={isEditing} field={data.desktopImage?.jsonValue} alt={data.desktopImage?.jsonValue?.value?.alt ?? ''} className="c-image__img c-hero__image" />}
      </picture>
      <div className="l-grid l-grid--max-width l-grid--no-gutters"><div className="l-grid__column-medium-12 c-hero__wrapper">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined} aria-level={blockHeading ? 1 : undefined} field={safeEditorialRichText(data.heading?.jsonValue, isEditing)} className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline u-text-center`} />}
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} tag={hasEditorialBlockMarkup(data.body?.jsonValue?.value) ? 'div' : 'p'} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="h4 c-heading c-hero__subHeadline u-text-center" />}
        {isEditing && data.mobileImage?.jsonValue && <div className="u-padding-top-sm">Mobile image<Image editable={isEditing} field={data.mobileImage.jsonValue} style={{ maxWidth: '240px', height: 'auto' }} /></div>}
      </div></div>
    </div>
  </div>;
};

/** Short editorial stage with source subtitle typography and native DAM fields. */
export const Editorial = (props: AllianzHeroProps) => <EditorialStage {...props} />;

/** Life strategy stage: heroTheme=life; optional theme=product-life. */
export const LifeStrategy = (props: AllianzHeroProps) => <EditorialStage {...props} lifeStrategy />;

/** Fixed title stage: optional image, subtitle and CTA fields have no surface. */
export const TitleOnly = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const blockHeading = hasEditorialBlockMarkup(data.heading?.jsonValue?.value);
  const stageClasses = `l-container-full-width ${sectionTheme(params.theme)}${params.layout === 'home' ? ' c-hero m-hero-overlay' : ''} allianz-editorial-hero`;
  return <div className={stageClasses} id={params.RenderingIdentifier}>
    <div className="m-axlHero">
      <picture className="c-image c-stage__image--cover c-stage__image--short" />
      <div className="l-grid l-grid--max-width l-grid--no-gutters"><div className="l-grid__column-medium-12 c-hero__wrapper">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined} aria-level={blockHeading ? 1 : undefined} field={safeEditorialRichText(data.heading?.jsonValue, isEditing)} className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline u-text-center`} />}
      </div></div>
    </div>
  </div>;
};

/** Life FAQ title-only stage: optional image, subtitle and CTA fields have no surface. */
export const LifeFaqTitle = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const blockHeading = hasEditorialBlockMarkup(data.heading?.jsonValue?.value);
  return <div className="l-container-full-width t-bg-product-life c-hero__theme--life allianz-editorial-hero" id={params.RenderingIdentifier}>
    <div className="m-axlHero">
      <picture className="c-image c-stage__image--cover c-stage__image--short" />
      <div className="l-grid l-grid--max-width l-grid--no-gutters"><div className="l-grid__column-medium-12 c-hero__wrapper">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined} aria-level={blockHeading ? 1 : undefined} field={safeEditorialRichText(data.heading?.jsonValue, isEditing)} className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline u-text-center`} />}
      </div></div>
    </div>
  </div>;
};

/** Life tools title/subtitle stage: native text only, without image or CTA surfaces. */
export const LifeToolsTitle = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const blockHeading = hasEditorialBlockMarkup(data.heading?.jsonValue?.value);
  return <div className="l-container-full-width t-bg-product-life c-hero__theme--life allianz-editorial-hero" id={params.RenderingIdentifier}>
    <div className="m-axlHero">
      <picture className="c-image c-stage__image--cover c-stage__image--short" />
      <div className="l-grid l-grid--max-width l-grid--no-gutters"><div className="l-grid__column-medium-12 c-hero__wrapper">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined} aria-level={blockHeading ? 1 : undefined} field={safeEditorialRichText(data.heading?.jsonValue, isEditing)} className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline u-text-center`} />}
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} tag={hasEditorialBlockMarkup(data.body?.jsonValue?.value) ? 'div' : 'p'} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="h4 c-heading c-hero__subHeadline u-text-center" />}
      </div></div>
    </div>
  </div>;
};

/** Source life image/title stage; native heading and desktop image only. */
export const LifeImageTitle = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const blockHeading = hasEditorialBlockMarkup(data.heading?.jsonValue?.value);
  return <div className="l-container-full-width t-bg-product-life c-hero__theme--life allianz-editorial-hero" id={params.RenderingIdentifier}>
    <div className="m-axlHero">
      <picture className="c-image c-stage__image--cover c-stage__image--short">
        {shouldRenderImageField(data.desktopImage?.jsonValue, isEditing) && <Image editable={isEditing} field={data.desktopImage?.jsonValue} alt={data.desktopImage?.jsonValue?.value?.alt ?? ''} className="c-image__img c-hero__image" />}
      </picture>
      <div className="l-grid l-grid--max-width l-grid--no-gutters"><div className="l-grid__column-medium-12 c-hero__wrapper">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined} aria-level={blockHeading ? 1 : undefined} field={safeEditorialRichText(data.heading?.jsonValue, isEditing)} className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline u-text-center`} />}
      </div></div>
    </div>
  </div>;
};

/** Source About image/title stage; native heading and desktop image only. */
export const AboutImageTitle = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const blockHeading = hasEditorialBlockMarkup(data.heading?.jsonValue?.value);
  return <div className="l-container-full-width" id={params.RenderingIdentifier}>
    <div className="m-axlHero">
      <picture className="c-image c-stage__image--cover c-stage__image--short">
        {shouldRenderImageField(data.desktopImage?.jsonValue, isEditing) && <Image editable={isEditing} field={data.desktopImage?.jsonValue} alt={data.desktopImage?.jsonValue?.value?.alt ?? ''} className="c-image__img c-hero__image" />}
      </picture>
      <div className="l-grid l-grid--max-width l-grid--no-gutters"><div className="l-grid__column-medium-12 c-hero__wrapper">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined} aria-level={blockHeading ? 1 : undefined} field={safeEditorialRichText(data.heading?.jsonValue, isEditing)} className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline u-text-center`} />}
      </div></div>
    </div>
  </div>;
};

/** What We Offer source stage exposes only the native title and desktop image. */
export const OfferImageTitle = (props: AllianzHeroProps) => {
  const data = props.fields?.data?.datasource;
  if (!data) return <Editorial {...props} />;
  return <Editorial {...props}
    fields={{ ...props.fields, data: { ...props.fields?.data, datasource: {
      heading: data.heading, desktopImage: data.desktopImage,
    } } }}
    params={{ ...props.params, theme: 'transparent', layout: 'home', columns: '1',
      alignment: 'center', spacing: 'none', headingLevel: 'h1', paddingTop: 'none',
      paddingBottom: 'none', marginBottom: 'none', showLogin: '0' }}
  />;
};

/** Fixed annuity image/title stage; only its three original native fields have surfaces. */
export const FixedProduct = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  return <div className="l-container-full-width c-hero__theme--fixed" id={params?.RenderingIdentifier}>
    <div className="m-axlHero">
      <picture className="c-image c-stage__image--cover c-stage__image--short">
        {data.mobileImage?.jsonValue?.value?.src && <source media="(max-width: 703px)" srcSet={data.mobileImage.jsonValue.value.src} />}
        {shouldRenderImageField(data.desktopImage?.jsonValue, isEditing) && <Image editable={isEditing} field={data.desktopImage?.jsonValue} alt={data.desktopImage?.jsonValue?.value?.alt ?? ''} className="c-image__img c-hero__image" />}
      </picture>
      <div className="l-grid l-grid--max-width l-grid--no-gutters"><div className="l-grid__column-medium-12 c-hero__wrapper">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag="h1" field={data.heading?.jsonValue} className="c-heading c-hero__headline u-text-center" />}
        {isEditing && data.mobileImage?.jsonValue && <div className="u-padding-top-sm">Mobile image<Image editable={isEditing} field={data.mobileImage.jsonValue} style={{ maxWidth: '240px', height: 'auto' }} /></div>}
      </div></div>
    </div>
  </div>;
};

/** RILA short source stage; native DAM fields retain their authoring envelopes. */
export const RilaHero = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const blockHeading = hasEditorialBlockMarkup(data.heading?.jsonValue?.value);
  return <div className="l-container-full-width t-bg-product-variable c-hero__theme--variable allianz-rila-hero" id={params.RenderingIdentifier}>
    <div className="m-axlHero">
      <picture className="c-image c-stage__image--cover c-stage__image--short">
        {data.mobileImage?.jsonValue?.value?.src && <source media="(max-width: 703px)" srcSet={data.mobileImage.jsonValue.value.src} />}
        {shouldRenderImageField(data.desktopImage?.jsonValue, isEditing) && <Image editable={isEditing} field={data.desktopImage?.jsonValue} alt={data.desktopImage?.jsonValue?.value?.alt ?? ''} className="c-image__img c-hero__image" />}
      </picture>
      <div className="l-grid l-grid--max-width l-grid--no-gutters"><div className="l-grid__column-medium-12 c-hero__wrapper">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined} aria-level={blockHeading ? 1 : undefined} field={safeEditorialRichText(data.heading?.jsonValue, isEditing)} className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline u-text-center`} />}
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} tag={hasEditorialBlockMarkup(data.body?.jsonValue?.value) ? 'div' : 'p'} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="h4 c-heading c-hero__subHeadline u-text-center" />}
        {isEditing && data.mobileImage?.jsonValue && <div className="u-padding-top-sm">Mobile image<Image editable={isEditing} field={data.mobileImage.jsonValue} style={{ maxWidth: '240px', height: 'auto' }} /></div>}
      </div></div>
    </div>
  </div>;
};

/** Index Advantage+ source stage; its finite theme needs only the admitted variant selector. */
export const IapHero = ({ fields, params }: AllianzHeroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzHero" />;
  const blockHeading = hasEditorialBlockMarkup(data.heading?.jsonValue?.value);
  return <div className="l-container-full-width t-bg-product-variable c-hero__theme--variable allianz-index-advantage-plus-hero" id={params?.RenderingIdentifier}>
    <div className="m-axlHero">
      <picture className="c-image c-stage__image--cover c-stage__image--short">
        {data.mobileImage?.jsonValue?.value?.src && <source media="(max-width: 703px)" srcSet={data.mobileImage.jsonValue.value.src} />}
        {shouldRenderImageField(data.desktopImage?.jsonValue, isEditing) && <Image editable={isEditing} field={data.desktopImage?.jsonValue} alt={data.desktopImage?.jsonValue?.value?.alt ?? ''} className="c-image__img c-hero__image" />}
      </picture>
      <div className="l-grid l-grid--max-width l-grid--no-gutters"><div className="l-grid__column-medium-12 c-hero__wrapper">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag={blockHeading ? 'div' : 'h1'} role={blockHeading ? 'heading' : undefined} aria-level={blockHeading ? 1 : undefined} field={data.heading?.jsonValue} className={`${blockHeading ? 'h1 ' : ''}c-heading c-hero__headline u-text-center`} />}
        {isEditing && data.mobileImage?.jsonValue && <div className="u-padding-top-sm">Mobile image<Image editable={isEditing} field={data.mobileImage.jsonValue} style={{ maxWidth: '240px', height: 'auto' }} /></div>}
      </div></div>
    </div>
  </div>;
};
