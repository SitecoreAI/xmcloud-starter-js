'use client';

import { Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { AllianzRichTextProps } from './allianz-rich-text.props';
import './AllianzLifeOverviewHeadings.css';
import './AllianzAboutHeadings.css';

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
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
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
