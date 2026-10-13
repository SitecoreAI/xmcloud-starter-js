'use client';

import { Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { AllianzRichTextProps } from './allianz-rich-text.props';
import './AllianzLifeOverviewHeadings.css';
import './AllianzAboutHeadings.css';
import './AllianzInvestmentOptions.css';

export const Default = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  if (params.layout === 'rich-text' || params.layout === 'disclosures') return <div className={`l-container--full-width ${params.layout === 'disclosures' ? 'a-axlDisclosures' : sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className={params.layout === 'disclosures' ? 'content-body disclosure' : 'o-richTextEditor__wrapper'} />}
    </div></div></div>
  </div>;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className={`tileContent ${params.alignment === 'left' ? 'u-text-left' : 'u-text-center'}`}>
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <header><div className="tileHeading"><Text editable={isEditing} tag={headingTag(params.headingLevel)} field={data.heading?.jsonValue} /></div></header>}
        {shouldRenderTextField(data.subheading?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.subheading?.jsonValue} className="tileSubHeading" />}
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className={`tileBody ${params.headingLevel === 'h2' ? 'u-font-size-xl' : ''}`} />}
        {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
      </div></article>
    </div></div></div>
  </div>;
};


// These finite variants keep source-absent fields out of the editor surface.
type LifeOverviewHeadingProps = AllianzRichTextProps & {
  icon: 'shapes' | 'information' | 'puzzle';
  includeBody?: boolean;
};

const LifeOverviewHeading = ({ fields, params, icon, includeBody = false }: LifeOverviewHeadingProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const heading = data.heading?.jsonValue;
  const body = includeBody ? data.body?.jsonValue : undefined;
  const information = icon === 'information';
  const theme = information ? (params.theme === 'green-soft' ? 'green-soft' : 'yellow-soft') : 'transparent';
  return <div className={`l-container--full-width ${sectionTheme(theme)} axlTileCollection allianz-life-overview-heading`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className={`tileIcon ${information ? 't-bg-primary-brand t-icon-primary-white' : 't-bg-transparent t-icon-primary-black'}`}>
            {/* Source decorative glyphs have no editable image field. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={`allianz-life-overview-glyph ${information ? 'allianz-life-overview-glyph-white' : ''}`} src={`/allianz-ui/life-overview/${icon}.svg`} alt="" aria-hidden="true" />
        </div>
        <header>
          {shouldRenderTextField(heading, isEditing) && <div className="tileHeading"><Text editable={isEditing} tag="h2" field={heading} /></div>}
          <div className="tileSubHeading" />
        </header>
        {includeBody && shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};

export const LifeShapesHeading = (props: AllianzRichTextProps) => <LifeOverviewHeading {...props} icon="shapes" includeBody />;
export const LifeInformationHeading = (props: AllianzRichTextProps) => <LifeOverviewHeading {...props} icon="information" />;
export const LifePuzzleHeading = (props: AllianzRichTextProps) => <LifeOverviewHeading {...props} icon="puzzle" />;

export const LifeFootnotes = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const body = data.body?.jsonValue;
  return <div className="l-container--full-width t-bg-grey-muted axlTileCollection allianz-life-overview-footnotes" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-left">
        <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
        {shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};

/** Fixed About introductions expose only their source-owned native fields. */
const AboutHeading = ({ fields, params, information = false }: AllianzRichTextProps & { information?: boolean }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${information ? 't-bg-green-soft' : 't-bg-transparent'} axlTileCollection allianz-about-heading`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        {information && <div className="tileIcon t-bg-primary-brand t-icon-primary-white">
          {/* This source UI glyph has no native Image field. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="allianz-about-information-glyph" src="/allianz-ui/about-overview/information.svg" alt="Information" />
        </div>}
        <header><div className="tileHeading">
          {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}
        </div><div className="tileSubHeading" /></header>
        {information && shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};

export const AboutSectionHeading = (props: AllianzRichTextProps) => <AboutHeading {...props} />;
export const AboutInformationHeading = (props: AllianzRichTextProps) => <AboutHeading {...props} information />;

/** About disclosures retain the complete original native RichText body. */
export const AboutDisclosures = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-grey-muted axlTileCollection allianz-about-disclosures" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-left">
        <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};

/** What We Offer footnotes keep their original body as the only author surface. */
export const OfferFootnotes = (props: AllianzRichTextProps) => {
  const data = props.fields?.data?.datasource;
  if (!data) return <Default {...props} />;
  return <Default {...props}
    fields={{ ...props.fields, data: { ...props.fields?.data, datasource: {
      body: data.body,
    } } }}
    params={{ ...props.params, theme: 'grey-muted', layout: 'plain', columns: '1',
      alignment: 'left', spacing: 'none', headingLevel: 'h4', paddingTop: 'none',
      paddingBottom: 'none', marginBottom: 'none' }}
  />;
};


/** The source MVA well uses the original native heading and RichText body. */
export const FixedMvaReference = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const heading = data.heading?.jsonValue;
  const body = data.body?.jsonValue;
  // Only the source sentence shape gets its source typography. Future headings
  // outside that shape remain intact through the normal native Text surface.
  const parts = typeof heading?.value === 'string'
    ? /^(Current MVA reference rate:\s*)([+-]?(?:\d+(?:\.\d+)?|\.\d+))(\s*%\s*)(as of\s+)(\d{1,2}\/\d{1,2}\/\d{4})$/.exec(heading.value)
    : null;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier || 'mva'}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      <div id="seven-yr-slot" className="well seven-yr-slot">
        {shouldRenderTextField(heading, isEditing) && <h2>
          {isEditing || !parts ? <Text editable={isEditing} field={heading} /> : <>
            <small className="blue">{parts[1]}</small><span {...{ testid: 'currentMVARate' }}>{parts[2]}</span>{parts[3]}<small>{parts[4]}<span {...{ testid: 'currentMVARateEffectiveDate' }}>{parts[5]}</span></small>
          </>}
        </h2>}
        {shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} />}
      </div>
    </div></div></div>
  </div>;
};


/** Source product questions place their native body inside the introduction header. */
export const FixedProductQuestionsHeading = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className="tileIcon t-bg-primary-brand t-icon-primary-white">
          <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleIconInformation" aria-describedby="descIconInformation" focusable="true" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><title id="titleIconInformation">Information</title><desc id="descIconInformation">Information</desc><path d="M14,8 C14.3,8 14.5,8.2 14.5,8.5 L14.5,23.5 C14.5,23.8 14.3,24 14,24 L10,24 C9.7,24 9.5,23.8 9.5,23.5 L9.5,8.5 C9.5,8.2 9.7,8 10,8 L14,8 Z M12,6 C10.3,6 9,4.7 9,3 C9,1.3 10.3,0 12,0 C13.7,0 15,1.3 15,3 C15,4.7 13.7,6 12,6 Z" /></svg>
        </div>
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={data.body?.jsonValue} className="tileSubHeading" /> : <div className="tileSubHeading" />}
        </header>
      </div></article>
    </div></div></div>
  </div>;
};

/** The withdrawal schedule retains the original stacked tile and complete native table. */
export const FixedWithdrawalSchedule = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlTile match-height -is--stacked t-bg-transparent"><div className="tileContent u-text-center"><div className="tileSubGrid__content">
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={data.heading?.jsonValue} />}</div>
          <div className="tileSubHeading" />
        </header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody u-font-size-md" />}
      </div></div></article>
    </div></div></div>
  </div>;
};


/** Source resources retain their empty introduction header above the native paragraph. */
export const FixedProductResourcesIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};


/** The five-year source introduction exposes only its original native body. */
export const FixedProductPlainIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlTile match-height -is--stacked t-bg-transparent"><div className="tileContent u-text-center"><div className="tileSubGrid__content">
        <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody u-font-size-lg" />}
      </div></div></article>
    </div></div></div>
  </div>;
};

/** Product benefits retain the source Light Bulb glyph and original native fields. */
export const FixedProductBenefits = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlTile match-height -is--stacked t-bg-transparent"><div className="tileContent u-text-center">
        <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black">
          <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleIconLightBulb" aria-describedby="descIconLightBulb" focusable="true" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><title id="titleIconLightBulb">Light Bulb</title><desc id="descIconLightBulb">Light Bulb</desc>  <path fillRule="evenodd" d="M15.548,17 C15.634,16.472 15.873,15.618 16.538,14.894 C16.572,14.825 16.624,14.765 16.692,14.72 C18.763,13.32 20,10.995 20,8.5 C20,4.364 16.635,1 12.5,1 C8.364,1 5,4.364 5,8.5 C5,10.995 6.236,13.32 8.307,14.72 C8.379,14.768 8.434,14.832 8.472,14.905 C9.129,15.627 9.366,16.475 9.451,17 L15.548,17 Z M17.353,15.487 C16.509,16.331 16.5,17.488 16.5,17.5 C16.5,17.776 16.276,18 16,18 L9,18 C8.723,18 8.5,17.776 8.5,17.5 C8.5,17.49 8.48,16.321 7.646,15.487 C7.638,15.479 7.63,15.471 7.622,15.462 C5.351,13.868 4,11.277 4,8.5 C4,3.813 7.813,0 12.5,0 C17.187,0 21,3.813 21,8.5 C21,11.277 19.648,13.869 17.377,15.462 C17.369,15.471 17.361,15.479 17.353,15.487 Z M16,19 C16.276,19 16.5,19.224 16.5,19.5 C16.5,19.776 16.276,20 16,20 L9,20 C8.724,20 8.5,19.776 8.5,19.5 C8.5,19.224 8.724,19 9,19 L16,19 Z M16.5,21.5 C16.5,21.776 16.276,22 16,22 L9,22 C8.724,22 8.5,21.776 8.5,21.5 C8.5,21.224 8.724,21 9,21 L16,21 C16.276,21 16.5,21.224 16.5,21.5 Z M11,23 L14,23 C14.276,23 14.5,23.224 14.5,23.5 C14.5,23.776 14.276,24 14,24 L11,24 C10.724,24 10.5,23.776 10.5,23.5 C10.5,23.224 10.724,23 11,23 Z"></path></svg>
        </div></div>
        <div className="tileSubGrid__content">
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody u-font-size-lg" />}
        </div>
      </div></article>
    </div></div></div>
  </div>;
};

/** Allocation keeps the source Line Graph glyph and heading line break. */
export const FixedProductAllocationIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className="tileIcon t-bg-transparent t-icon-primary-black">
          <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleIconGraphVariableUp" aria-describedby="descIconGraphVariableUp" focusable="true" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><title id="titleIconGraphVariableUp">Line Graph</title><desc id="descIconGraphVariableUp">Line Graph</desc>  <path fillRule="evenodd" d="M0.545454545,22 C0.244363636,22 0,21.7511111 0,21.4444444 L0,2.55555556 C0,2.24888889 0.244363636,2 0.545454545,2 C0.846545455,2 1.09090909,2.24888889 1.09090909,2.55555556 L1.09090909,20.8888889 L23.4545455,20.8888889 C23.7556364,20.8888889 24,21.1377778 24,21.4444444 C24,21.7511111 23.7556364,22 23.4545455,22 L0.545454545,22 Z M18.705,8.82916667 C18.9177273,8.6125 19.2635455,8.6125 19.4762727,8.82916667 C19.689,9.04583333 19.689,9.39805556 19.4762727,9.61472222 L14.0217273,15.1702778 C13.8286364,15.3669444 13.5242727,15.3880556 13.3093636,15.2213889 L9.32318182,12.1780556 L5.29445455,16.2813889 C5.18754545,16.3902778 5.04790909,16.4447222 4.90936364,16.4447222 C4.76972727,16.4447222 4.63009091,16.3902778 4.52318182,16.2813889 C4.31045455,16.0647222 4.31045455,15.7125 4.52318182,15.4958333 L8.88681818,11.0513889 C9.07772727,10.8547222 9.38209091,10.8336111 9.59918182,11.0002778 L13.5853636,14.0436111 L18.705,8.82916667 Z"></path></svg>
        </div>
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <h2><Text editable={isEditing} field={data.heading?.jsonValue} /><br /></h2>}</div>
          <div className="tileSubHeading" />
        </header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};

/** Crediting retains the plain native body and source empty subheading wrapper. */
export const FixedProductCreditingIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
          <div className="tileSubHeading" />
        </header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};

/** The five-year withdrawal schedule keeps its H2 and complete native table body. */
export const FixedWithdrawalScheduleH2 = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlTile match-height -is--stacked t-bg-transparent"><div className="tileContent u-text-center"><div className="tileSubGrid__content">
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
          <div className="tileSubHeading" />
        </header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody u-font-size-md" />}
      </div></div></article>
    </div></div></div>
  </div>;
};

/** Investment Options variants keep all admitted native fields in their SDK envelopes. */
type InvestmentOptionsRole = 'title' | 'content' | 'disclosures';

const InvestmentOptionsBlock = ({ fields, params, role }: AllianzRichTextProps & { role: InvestmentOptionsRole }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const level = role === 'title' ? 'h1' : headingTag(params.headingLevel);
  return <div className={`allianz-investment-options-block allianz-investment-options-${role}`} id={params.RenderingIdentifier}>
    <div className="allianz-investment-options-frame"><div className="allianz-investment-options-column">
      {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={level} field={data.heading?.jsonValue} className="allianz-investment-options-heading" />}
      {shouldRenderTextField(data.subheading?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.subheading?.jsonValue} className="allianz-investment-options-subheading" />}
      {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="allianz-investment-options-body" />}
      {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="allianz-investment-options-link" />}
    </div></div>
  </div>;
};

export const InvestmentOptionsTitle = (props: AllianzRichTextProps) => <InvestmentOptionsBlock {...props} role="title" />;
export const InvestmentOptionsContent = (props: AllianzRichTextProps) => <InvestmentOptionsBlock {...props} role="content" />;
export const InvestmentOptionsDisclosures = (props: AllianzRichTextProps) => <InvestmentOptionsBlock {...props} role="disclosures" />;

/** RILA variants keep complete native fields in source-owned presentation wrappers. */
type RilaTileRole = 'introduction' | 'explained' | 'risk' | 'series' | 'solution';

const RilaDecorativeIcon = ({ icon }: { icon: 'light-bulb' | 'people-connect' }) => <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black">
  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
    {icon === 'light-bulb' ? <path fillRule="evenodd" d="M15.548,17 C15.634,16.472 15.873,15.618 16.538,14.894 C16.572,14.825 16.624,14.765 16.692,14.72 C18.763,13.32 20,10.995 20,8.5 C20,4.364 16.635,1 12.5,1 C8.364,1 5,4.364 5,8.5 C5,10.995 6.236,13.32 8.307,14.72 C8.379,14.768 8.434,14.832 8.472,14.905 C9.129,15.627 9.366,16.475 9.451,17 L15.548,17 Z M17.353,15.487 C16.509,16.331 16.5,17.488 16.5,17.5 C16.5,17.776 16.276,18 16,18 L9,18 C8.723,18 8.5,17.776 8.5,17.5 C8.5,17.49 8.48,16.321 7.646,15.487 C7.638,15.479 7.63,15.471 7.622,15.462 C5.351,13.868 4,11.277 4,8.5 C4,3.813 7.813,0 12.5,0 C17.187,0 21,3.813 21,8.5 C21,11.277 19.648,13.869 17.377,15.462 C17.369,15.471 17.361,15.479 17.353,15.487 Z M16,19 C16.276,19 16.5,19.224 16.5,19.5 C16.5,19.776 16.276,20 16,20 L9,20 C8.724,20 8.5,19.776 8.5,19.5 C8.5,19.224 8.724,19 9,19 L16,19 Z M16.5,21.5 C16.5,21.776 16.276,22 16,22 L9,22 C8.724,22 8.5,21.776 8.5,21.5 C8.5,21.224 8.724,21 9,21 L16,21 C16.276,21 16.5,21.224 16.5,21.5 Z M11,23 L14,23 C14.276,23 14.5,23.224 14.5,23.5 C14.5,23.776 14.276,24 14,24 L11,24 C10.724,24 10.5,23.776 10.5,23.5 C10.5,23.224 10.724,23 11,23 Z" /> : <path d="M5.55,9.9 C3.67714286,9.9 2.1,8.32285714 2.1,6.45 C2.1,4.57714286 3.67714286,3 5.55,3 C7.42285714,3 9,4.57714286 9,6.45 C9,8.32285714 7.42285714,9.9 5.55,9.9 Z M5.55,3.9 C4.122,3.9 3,5.022 3,6.45 C3,7.878 4.122,9 5.55,9 C6.978,9 8.1,7.878 8.1,6.45 C8.1,5.022 6.978,3.9 5.55,3.9 Z M7.04409306,2.1 C6.84187893,2.1 6.74077186,2.00454545 6.63966479,1.81363636 C6.53855772,1.52727273 6.63966479,1.24090909 6.84187893,1.14545455 C10.1784122,-0.381818182 14.1215878,-0.381818182 17.4581211,1.14545455 C17.6603352,1.33636364 17.7614423,1.62272727 17.6603352,1.81363636 C17.4581211,2.00454545 17.1547999,2.1 16.9525857,2.00454545 C13.9193737,0.572727273 10.2795192,0.572727273 7.2463072,2.00454545 C7.14520013,2.1 7.14520013,2.1 7.04409306,2.1 Z M19.8549419,19.9448276 C20.0537791,19.7517241 20.3520349,19.7517241 20.5508721,19.9448276 C20.7497093,20.137931 20.7497093,20.4275862 20.5508721,20.6206897 C18.2642442,22.8413793 15.281686,24 12.1002907,24 C8.91889535,24 6.03575581,22.8413793 3.74912791,20.7172414 C3.5502907,20.5241379 3.5502907,20.2344828 3.74912791,20.0413793 C3.94796512,19.8482759 4.24622093,19.8482759 4.44505814,20.0413793 C6.53284884,21.9724138 9.21715116,23.0344828 12.1002907,23.0344828 C14.9834302,23.0344828 17.7671512,21.9724138 19.8549419,19.9448276 Z M10.0909091,13.73625 C10.0909091,12.6225 9.28363636,11.8125 8.27454545,11.8125 L2.92636364,11.8125 C1.81636364,11.8125 1.00909091,12.72375 1.00909091,13.73625 L1.00909091,18.39375 C1.00909091,18.6975 0.807272727,18.9 0.504545455,18.9 C0.201818182,18.9 0,18.6975 0,18.39375 L0,13.73625 C0,12.11625 1.31181818,10.8 2.92636364,10.8 L8.17363636,10.8 C9.78818182,10.8 11.1,12.11625 11.1,13.73625 L11.1,18.39375 C11.1,18.6975 10.8981818,18.9 10.5954545,18.9 C10.2927273,18.9 10.0909091,18.6975 10.0909091,18.39375 L10.0909091,13.73625 Z M15,6.45 C15,4.57714286 16.5771429,3 18.45,3 C20.3228571,3 21.9,4.57714286 21.9,6.45 C21.9,8.32285714 20.3228571,9.9 18.45,9.9 C16.5771429,9.9 15,8.32285714 15,6.45 Z M18.45,3.9 C17.022,3.9 15.9,5.022 15.9,6.45 C15.9,7.878 17.022,9 18.45,9 C19.878,9 21,7.878 21,6.45 C21,5.022 19.878,3.9 18.45,3.9 Z M21.1,10.8 C22.7,10.8 24,12.11625 24,13.73625 L24,18.39375 C24,18.6975 23.8,18.9 23.5,18.9 C23.2,18.9 23,18.6975 23,18.39375 L23,13.73625 C23,12.6225 22.1,11.8125 21.1,11.8125 L15.8,11.8125 C14.7,11.8125 13.9,12.72375 13.9,13.73625 L13.9,18.39375 C13.9,18.6975 13.7,18.9 13.4,18.9 C13.1,18.9 12.9,18.6975 12.9,18.39375 L12.9,13.73625 C12.9,12.11625 14.2,10.8 15.8,10.8 L21.1,10.8 Z" />}
  </svg>
</div></div>;

const RilaStackedTile = ({ fields, params, role }: AllianzRichTextProps & { role: RilaTileRole }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const theme = role === 'series' || role === 'solution' ? 'blue-soft' : 'transparent';
  const bodySize = role === 'risk' ? 'sm' : role === 'solution' ? 'lg' : 'xl';
  return <div className={`l-container--full-width ${sectionTheme(theme)} axlTileCollection allianz-rila-${role}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      <article className="m-axlTile match-height -is--stacked t-bg-transparent"><div className={`tileContent ${role === 'risk' ? 'u-text-left' : 'u-text-center'}`}>
        {role === 'explained' && <RilaDecorativeIcon icon="light-bulb" />}
        {role === 'series' && <RilaDecorativeIcon icon="people-connect" />}
        <div className="tileSubGrid__content">
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={role === 'solution' ? 'h3' : 'h2'} field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading">{shouldRenderTextField(data.subheading?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.subheading?.jsonValue} />}</div>
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className={`tileBody u-font-size-${bodySize}`} />}
          {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <footer><div className="tileLink"><Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" /></div></footer>}
        </div>
      </div></article>
    </div></div></div>
  </div>;
};

export const RilaIntroduction = (props: AllianzRichTextProps) => <RilaStackedTile {...props} role="introduction" />;
export const RilaExplained = (props: AllianzRichTextProps) => <RilaStackedTile {...props} role="explained" />;
export const RilaRiskDisclosure = (props: AllianzRichTextProps) => <RilaStackedTile {...props} role="risk" />;
export const RilaSeriesIntroduction = (props: AllianzRichTextProps) => <RilaStackedTile {...props} role="series" />;
export const RilaSolutionHeading = (props: AllianzRichTextProps) => <RilaStackedTile {...props} role="solution" />;

const RilaIntroductionBlock = ({ fields, params, contract = false }: AllianzRichTextProps & { contract?: boolean }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${contract ? 't-bg-blue-soft' : 't-bg-green-soft'} axlTileCollection ${contract ? 'allianz-rila-contract-introduction' : 'allianz-rila-explore-introduction'}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <h2><Text editable={isEditing} field={data.heading?.jsonValue} />{!contract && <br />}</h2>}</div>
          <div className="tileSubHeading">{shouldRenderTextField(data.subheading?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.subheading?.jsonValue} />}</div>
        </header>
        {contract && shouldRenderTextField(data.body?.jsonValue, isEditing) && <footer><RichText editable={isEditing} field={data.body?.jsonValue} className="tileLink" /></footer>}
        {!contract && shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
        {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <footer><div className="tileLink"><Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" /></div></footer>}
      </div></article>
    </div></div></div>
  </div>;
};

export const RilaContractIntroduction = (props: AllianzRichTextProps) => <RilaIntroductionBlock {...props} contract />;
export const RilaExploreIntroduction = (props: AllianzRichTextProps) => <RilaIntroductionBlock {...props} />;

export const RilaDisclosures = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width a-axlDisclosures allianz-rila-disclosures" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column"><div className="row"><div className="col-md-12 content-body disclosure">
      {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}
      {shouldRenderTextField(data.subheading?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.subheading?.jsonValue} />}
      {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
      {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
    </div></div></div></div></div>
  </div>;
};

import './AllianzRila.css';


/** Index Advantage+ presentation exposes only each source-owned native field. */
type IapTileRole = 'introduction' | 'risk-return' | 'investor-profile' | 'index-definitions-heading' | 'index-risk-disclosure';

const IapInvestorProfileIcon = () => <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black">
  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M0.545454545,22 C0.244363636,22 0,21.7511111 0,21.4444444 L0,2.55555556 C0,2.24888889 0.244363636,2 0.545454545,2 C0.846545455,2 1.09090909,2.24888889 1.09090909,2.55555556 L1.09090909,20.8888889 L23.4545455,20.8888889 C23.7556364,20.8888889 24,21.1377778 24,21.4444444 C24,21.7511111 23.7556364,22 23.4545455,22 L0.545454545,22 Z M18.705,8.82916667 C18.9177273,8.6125 19.2635455,8.6125 19.4762727,8.82916667 C19.689,9.04583333 19.689,9.39805556 19.4762727,9.61472222 L14.0217273,15.1702778 C13.8286364,15.3669444 13.5242727,15.3880556 13.3093636,15.2213889 L9.32318182,12.1780556 L5.29445455,16.2813889 C5.18754545,16.3902778 5.04790909,16.4447222 4.90936364,16.4447222 C4.76972727,16.4447222 4.63009091,16.3902778 4.52318182,16.2813889 C4.31045455,16.0647222 4.31045455,15.7125 4.52318182,15.4958333 L8.88681818,11.0513889 C9.07772727,10.8547222 9.38209091,10.8336111 9.59918182,11.0002778 L13.5853636,14.0436111 L18.705,8.82916667 Z" />
  </svg>
</div></div>;

const IapStackedTile = ({ fields, params, role }: AllianzRichTextProps & { role: IapTileRole }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const hasHeading = role === 'investor-profile' || role === 'index-definitions-heading';
  const riskDisclosure = role === 'index-risk-disclosure';
  const grey = role === 'introduction' || role === 'risk-return';
  return <div className={`l-container--full-width ${grey ? 't-bg-grey-soft' : 't-bg-transparent'} axlTileCollection allianz-iap-${role}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      <article className="m-axlTile match-height -is--stacked t-bg-transparent"><div className={`tileContent ${riskDisclosure ? 'u-text-left' : 'u-text-center'}`}>
        {role === 'investor-profile' && <IapInvestorProfileIcon />}
        <div className="tileSubGrid__content">
          <header>
            <div className="tileHeading">{hasHeading && shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={role === 'index-definitions-heading' ? 'h3' : 'h2'} field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className={`tileBody u-font-size-${riskDisclosure ? 'sm' : 'xl'}`} />}
        </div>
      </div></article>
    </div></div></div>
  </div>;
};

export const IapIntroduction = (props: AllianzRichTextProps) => <IapStackedTile {...props} role="introduction" />;
export const IapRiskReturnDescription = (props: AllianzRichTextProps) => <IapStackedTile {...props} role="risk-return" />;
export const IapInvestorProfile = (props: AllianzRichTextProps) => <IapStackedTile {...props} role="investor-profile" />;
export const IapIndexDefinitionsHeading = (props: AllianzRichTextProps) => <IapStackedTile {...props} role="index-definitions-heading" />;
export const IapIndexRiskDisclosure = (props: AllianzRichTextProps) => <IapStackedTile {...props} role="index-risk-disclosure" />;

/** The resources and definitions keep their complete native Rich Text markup. */
const IapRichTextBlock = ({ fields, params, resources = false }: AllianzRichTextProps & { resources?: boolean }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${resources ? 't-bg-grey-soft' : 't-bg-transparent'} axlTileCollection ${resources ? 'allianz-iap-resources' : 'allianz-iap-index-definitions-content'}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {resources && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12" /></div>}
      <div className="l-grid__row"><div className="l-grid__column-medium-12">
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="o-richTextEditor__wrapper" />}
      </div></div>
    </div>
  </div>;
};

export const IapResources = (props: AllianzRichTextProps) => <IapRichTextBlock {...props} resources />;
export const IapIndexDefinitionsContent = (props: AllianzRichTextProps) => <IapRichTextBlock {...props} />;

const IapIntroductionBlock = ({ fields, params, nextStep = false }: AllianzRichTextProps & { nextStep?: boolean }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={`l-container--full-width ${nextStep ? 't-bg-green-soft' : 't-bg-grey-muted'} axlTileCollection ${nextStep ? 'allianz-iap-next-step' : 'allianz-iap-footnotes'}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row${nextStep ? ' u-margin-bottom-lg u-padding-top-lg' : ''}`}><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className={`tileContent ${nextStep ? 'u-text-center' : 'u-text-left'}`}>
        <header>
          <div className="tileHeading">{nextStep && shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
          <div className="tileSubHeading" />
        </header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};

export const IapNextStep = (props: AllianzRichTextProps) => <IapIntroductionBlock {...props} nextStep />;
export const IapFootnotes = (props: AllianzRichTextProps) => <IapIntroductionBlock {...props} />;

export const IapDisclosures = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width a-axlDisclosures allianz-iap-disclosures" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column"><div className="row">
      {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="col-md-12 content-body disclosure" />}
    </div></div></div></div>
  </div>;
};

import './AllianzIndexAdvantagePlus.css';


/** Classic variants use intrinsic presentation constants, never new native parameters. */
const classicRichTextParams = (
  params: AllianzRichTextProps['params'],
  theme: 'transparent' | 'grey-soft' | 'green-soft',
  spaced = false,
  questions = false,
) => ({ ...params, theme, spacing: 'none', paddingTop: spaced ? 'lg' : 'none',
  paddingBottom: questions ? 'lg' : 'none', marginBottom: spaced && !questions ? 'lg' : 'none' });

export const ClassicResourcesIntroduction = (props: AllianzRichTextProps) => <FixedProductResourcesIntroduction
  {...props} params={classicRichTextParams(props.params, 'grey-soft', true)} />;

export const ClassicIndexRiskNote = (props: AllianzRichTextProps) => <FixedProductResourcesIntroduction
  {...props} params={classicRichTextParams(props.params, 'transparent')} />;

export const ClassicCreditingIntroduction = (props: AllianzRichTextProps) => <FixedProductCreditingIntroduction
  {...props} params={classicRichTextParams(props.params, 'transparent', true)} />;

export const ClassicQuestionsHeading = (props: AllianzRichTextProps) => <FixedProductQuestionsHeading
  {...props} params={classicRichTextParams(props.params, 'green-soft', true, true)} />;

export const ClassicMvaReference = (props: AllianzRichTextProps) => <FixedMvaReference
  {...props} params={{ ...classicRichTextParams(props.params, 'grey-soft'), RenderingIdentifier: 'mva-rate' }} />;

export const ClassicWithdrawalSchedule = (props: AllianzRichTextProps) => <FixedWithdrawalScheduleH2
  {...props} params={classicRichTextParams(props.params, 'grey-soft')} />;

/** Classic allocation retains the source graph and native heading without a forced break. */
export const ClassicAllocationIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier || 'allocation-options'}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className="tileIcon t-bg-transparent t-icon-primary-black">
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M0.545454545,22 C0.244363636,22 0,21.7511111 0,21.4444444 L0,2.55555556 C0,2.24888889 0.244363636,2 0.545454545,2 C0.846545455,2 1.09090909,2.24888889 1.09090909,2.55555556 L1.09090909,20.8888889 L23.4545455,20.8888889 C23.7556364,20.8888889 24,21.1377778 24,21.4444444 C24,21.7511111 23.7556364,22 23.4545455,22 L0.545454545,22 Z M18.705,8.82916667 C18.9177273,8.6125 19.2635455,8.6125 19.4762727,8.82916667 C19.689,9.04583333 19.689,9.39805556 19.4762727,9.61472222 L14.0217273,15.1702778 C13.8286364,15.3669444 13.5242727,15.3880556 13.3093636,15.2213889 L9.32318182,12.1780556 L5.29445455,16.2813889 C5.18754545,16.3902778 5.04790909,16.4447222 4.90936364,16.4447222 C4.76972727,16.4447222 4.63009091,16.3902778 4.52318182,16.2813889 C4.31045455,16.0647222 4.31045455,15.7125 4.52318182,15.4958333 L8.88681818,11.0513889 C9.07772727,10.8547222 9.38209091,10.8336111 9.59918182,11.0002778 L13.5853636,14.0436111 L18.705,8.82916667 Z" />
          </svg>
        </div>
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
          <div className="tileSubHeading" />
        </header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};

/** Classic footnotes render the complete authored body in its source RTE shell. */
export const ClassicFootnotes = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-grey-muted axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="o-richTextEditor__wrapper" />}
    </div></div></div>
  </div>;
};

/** AAPlus keeps the source slots and the original native field envelopes. */
export const AAPlusResourcesIntroduction = (props: AllianzRichTextProps) => <ClassicResourcesIntroduction {...props} />;

export const AAPlusCreditingIntroduction = (props: AllianzRichTextProps) => <ClassicCreditingIntroduction {...props} />;

export const AAPlusMvaReference = (props: AllianzRichTextProps) => <ClassicMvaReference {...props} />;

export const AAPlusWithdrawalSchedule = (props: AllianzRichTextProps) => <ClassicWithdrawalSchedule {...props} />;

export const AAPlusFootnotes = (props: AllianzRichTextProps) => <ClassicFootnotes {...props} />;

/** The AAPlus source has no allocation fragment anchor or forced heading break. */
export const AAPlusAllocationIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className="tileIcon t-bg-transparent t-icon-primary-black">
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M0.545454545,22 C0.244363636,22 0,21.7511111 0,21.4444444 L0,2.55555556 C0,2.24888889 0.244363636,2 0.545454545,2 C0.846545455,2 1.09090909,2.24888889 1.09090909,2.55555556 L1.09090909,20.8888889 L23.4545455,20.8888889 C23.7556364,20.8888889 24,21.1377778 24,21.4444444 C24,21.7511111 23.7556364,22 23.4545455,22 L0.545454545,22 Z M18.705,8.82916667 C18.9177273,8.6125 19.2635455,8.6125 19.4762727,8.82916667 C19.689,9.04583333 19.689,9.39805556 19.4762727,9.61472222 L14.0217273,15.1702778 C13.8286364,15.3669444 13.5242727,15.3880556 13.3093636,15.2213889 L9.32318182,12.1780556 L5.29445455,16.2813889 C5.18754545,16.3902778 5.04790909,16.4447222 4.90936364,16.4447222 C4.76972727,16.4447222 4.63009091,16.3902778 4.52318182,16.2813889 C4.31045455,16.0647222 4.31045455,15.7125 4.52318182,15.4958333 L8.88681818,11.0513889 C9.07772727,10.8547222 9.38209091,10.8336111 9.59918182,11.0002778 L13.5853636,14.0436111 L18.705,8.82916667 Z" />
          </svg>
        </div>
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
          <div className="tileSubHeading" />
        </header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};

/** Both source question headings keep their independently editable native owners. */
export const AAPlusQuestionsHeading = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-green-soft" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className="tileIcon t-bg-primary-brand t-icon-primary-white">
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
            <path d="M14,8 C14.3,8 14.5,8.2 14.5,8.5 L14.5,23.5 C14.5,23.8 14.3,24 14,24 L10,24 C9.7,24 9.5,23.8 9.5,23.5 L9.5,8.5 C9.5,8.2 9.7,8 10,8 L14,8 Z M12,6 C10.3,6 9,4.7 9,3 C9,1.3 10.3,0 12,0 C13.7,0 15,1.3 15,3 C15,4.7 13.7,6 12,6 Z" />
          </svg>
        </div>
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
          <div className="tileSubHeading">{shouldRenderTextField(data.subheading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={data.subheading?.jsonValue} />}</div>
        </header>
      </div></article>
    </div></div></div>
  </div>;
};

/** Benefit Control+ source-matching roles retain their original native owners. */
export const BenefitControlPlusResourcesIntroduction = (props: AllianzRichTextProps) => <AAPlusResourcesIntroduction {...props} />;

export const BenefitControlPlusAllocationIntroduction = (props: AllianzRichTextProps) => <AAPlusAllocationIntroduction {...props} />;

export const BenefitControlPlusCreditingIntroduction = (props: AllianzRichTextProps) => <AAPlusCreditingIntroduction {...props} />;

export const BenefitControlPlusQuestionsHeading = (props: AllianzRichTextProps) => <AAPlusQuestionsHeading {...props} />;

export const BenefitControlPlusMvaReference = (props: AllianzRichTextProps) => <AAPlusMvaReference {...props} />;

export const BenefitControlPlusFootnotes = (props: AllianzRichTextProps) => <AAPlusFootnotes {...props} />;

/** The source introduction uses its inset grid and direct decorative Light Bulb. */
export const BenefitControlPlusIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width l-grid--no-gutters-outer"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className="tileIcon t-bg-transparent t-icon-primary-black">
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M15.548,17 C15.634,16.472 15.873,15.618 16.538,14.894 C16.572,14.825 16.624,14.765 16.692,14.72 C18.763,13.32 20,10.995 20,8.5 C20,4.364 16.635,1 12.5,1 C8.364,1 5,4.364 5,8.5 C5,10.995 6.236,13.32 8.307,14.72 C8.379,14.768 8.434,14.832 8.472,14.905 C9.129,15.627 9.366,16.475 9.451,17 L15.548,17 Z M17.353,15.487 C16.509,16.331 16.5,17.488 16.5,17.5 C16.5,17.776 16.276,18 16,18 L9,18 C8.723,18 8.5,17.776 8.5,17.5 C8.5,17.49 8.48,16.321 7.646,15.487 C7.638,15.479 7.63,15.471 7.622,15.462 C5.351,13.868 4,11.277 4,8.5 C4,3.813 7.813,0 12.5,0 C17.187,0 21,3.813 21,8.5 C21,11.277 19.648,13.869 17.377,15.462 C17.369,15.471 17.361,15.479 17.353,15.487 Z M16,19 C16.276,19 16.5,19.224 16.5,19.5 C16.5,19.776 16.276,20 16,20 L9,20 C8.724,20 8.5,19.776 8.5,19.5 C8.5,19.224 8.724,19 9,19 L16,19 Z M16.5,21.5 C16.5,21.776 16.276,22 16,22 L9,22 C8.724,22 8.5,21.776 8.5,21.5 C8.5,21.224 8.724,21 9,21 L16,21 C16.276,21 16.5,21.224 16.5,21.5 Z M11,23 L14,23 C14.276,23 14.5,23.224 14.5,23.5 C14.5,23.776 14.276,24 14,24 L11,24 C10.724,24 10.5,23.776 10.5,23.5 C10.5,23.224 10.724,23 11,23 Z" />
          </svg>
        </div>
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
          <div className="tileSubHeading" />
        </header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
      </div></article>
    </div></div></div>
  </div>;
};

/** Source withdrawal content keeps its left alignment, H2 and complete native table. */
export const BenefitControlPlusWithdrawalSchedule = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-grey-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      <article className="m-axlTile match-height -is--stacked t-bg-transparent"><div className="tileContent u-text-left"><div className="tileSubGrid__content">
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
          <div className="tileSubHeading" />
        </header>
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody u-font-size-md" />}
      </div></div></article>
    </div></div></div>
  </div>;
};


/** Essential Income 7 roles keep source-owned fields and intrinsic presentation. */
export const EssentialIncome7ResourcesIntroduction = (props: AllianzRichTextProps) => <AAPlusResourcesIntroduction {...props} />;

export const EssentialIncome7CreditingIntroduction = (props: AllianzRichTextProps) => <FixedProductCreditingIntroduction
  {...props} params={{ ...props.params, theme: 'primary-white', spacing: 'none',
    paddingTop: 'lg', paddingBottom: 'none', marginBottom: 'lg' }} />;

export const EssentialIncome7QuestionsHeading = (props: AllianzRichTextProps) => <AAPlusQuestionsHeading {...props} />;

export const EssentialIncome7WithdrawalSchedule = (props: AllianzRichTextProps) => <FixedWithdrawalSchedule
  {...props} params={{ ...props.params, theme: 'grey-soft', spacing: 'none',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'none' }} />;

export const EssentialIncome7Footnotes = (props: AllianzRichTextProps) => <ClassicFootnotes {...props} />;

/** The source video anchor belongs to the glyph-free introduction row. */
export const EssentialIncome7Introduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width u-row-spacing t-bg-transparent axlTileCollection" id={params.RenderingIdentifier === 'video' ? undefined : params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <a id="video" />
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
        </div></article>
      </div></div>
    </div>
  </div>;
};

/** Allocation uses the white source section and its single allocation anchor. */
export const EssentialIncome7AllocationIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-primary-white axlTileCollection" id={params.RenderingIdentifier === 'allocation-options' ? undefined : params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <a id="allocation-options" />
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <div className="tileIcon t-bg-transparent t-icon-primary-black">
            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M0.545454545,22 C0.244363636,22 0,21.7511111 0,21.4444444 L0,2.55555556 C0,2.24888889 0.244363636,2 0.545454545,2 C0.846545455,2 1.09090909,2.24888889 1.09090909,2.55555556 L1.09090909,20.8888889 L23.4545455,20.8888889 C23.7556364,20.8888889 24,21.1377778 24,21.4444444 C24,21.7511111 23.7556364,22 23.4545455,22 L0.545454545,22 Z M18.705,8.82916667 C18.9177273,8.6125 19.2635455,8.6125 19.4762727,8.82916667 C19.689,9.04583333 19.689,9.39805556 19.4762727,9.61472222 L14.0217273,15.1702778 C13.8286364,15.3669444 13.5242727,15.3880556 13.3093636,15.2213889 L9.32318182,12.1780556 L5.29445455,16.2813889 C5.18754545,16.3902778 5.04790909,16.4447222 4.90936364,16.4447222 C4.76972727,16.4447222 4.63009091,16.3902778 4.52318182,16.2813889 C4.31045455,16.0647222 4.31045455,15.7125 4.52318182,15.4958333 L8.88681818,11.0513889 C9.07772727,10.8547222 9.38209091,10.8336111 9.59918182,11.0002778 L13.5853636,14.0436111 L18.705,8.82916667 Z" />
            </svg>
          </div>
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
        </div></article>
      </div></div>
    </div>
  </div>;
};

/** MVA retains the authored snapshot and full editing owner, with no rate fetch. */
export const EssentialIncome7MvaReference = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const heading = data.heading?.jsonValue;
  const body = data.body?.jsonValue;
  const parts = typeof heading?.value === 'string'
    ? /^(Current MVA reference rate:\s*)([+-]?(?:\d+(?:\.\d+)?|\.\d+))(\s*%\s*)(as of\s+)(\d{1,2}\/\d{1,2}\/\d{4})$/.exec(heading.value)
    : null;
  return <div className="l-container--full-width t-bg-grey-soft axlTileCollection" id={params.RenderingIdentifier === 'mva-rate' ? undefined : params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <a id="mva-rate" />
      <div className="l-grid__row"><div className="l-grid__column-medium-12">
        <div id="seven-yr-slot" className="well seven-yr-slot">
          {shouldRenderTextField(heading, isEditing) && <h2>
            {isEditing || !parts ? <Text editable={isEditing} field={heading} /> : <>
              <small className="blue">{parts[1]}</small><span {...{ testid: 'currentMVARate' }}>{parts[2]}</span>{parts[3]}<small>{parts[4]}<span {...{ testid: 'currentMVARateEffectiveDate' }}>{parts[5]}</span></small>
            </>}
          </h2>}
          {shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} />}
        </div>
      </div></div>
    </div>
  </div>;
};
