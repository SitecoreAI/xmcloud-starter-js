'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useId } from 'react';
import { projectIndexCategoryBody } from 'lib/index-category-projection';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { AllianzFieldContent } from 'lib/allianz-field-content';
import type { AllianzRichTextDefaultProps, AllianzRichTextProps } from './allianz-rich-text.props';
import { safeEditorialRichText } from 'lib/allianz-editorial';
import { isSourceDestinationRichTextHref, restoreSourceDestinationRichText } from 'lib/allianz-source-destinations';
import { bodyArrowLinkGlyphs, bodyDownloadLinkGlyphs } from 'lib/body-download-link-glyphs';
import './AllianzLifeOverviewHeadings.css';
import './AllianzAboutHeadings.css';
import './AllianzInvestmentOptions.css';
import './AllianzRichTextIcons.css';
import './AllianzIndexCategoryDisclosures.css';

export const Default = ({ fields, params, rendering, brandIcon = false, bodyDownloadLinks = false, bodyArrowLinks = false }: AllianzRichTextDefaultProps) => {
  const { page } = useSitecore();
  const categoryInstance = useId();
  const isEditing = page?.mode?.isEditing ?? false;
  const routeId = page?.layout?.sitecore?.route?.itemId;
  const indexOptionsScope = typeof routeId === 'string' && routeId.replace(/[{}-]/g, '').toLowerCase() === 'e8e1893aff9b4b4a81bca809693ccf88'
    ? ' allianz-index-options-rich-text' : '';
  const nativeData = fields?.data?.datasource;
  const ownerId = nativeData && 'id' in nativeData ? nativeData.id : undefined;
  const restoredBody = restoreSourceDestinationRichText(nativeData?.body?.jsonValue, page?.mode?.isEditing !== false, ownerId);
  const destinationBody = safeEditorialRichText(restoredBody, isEditing, true,
    (href) => isSourceDestinationRichTextHref(href, ownerId));
  const glyphBody = bodyDownloadLinks
    ? bodyDownloadLinkGlyphs(destinationBody, false)
    : bodyArrowLinks ? bodyArrowLinkGlyphs(destinationBody, false) : destinationBody;
  const category = projectIndexCategoryBody({ pageID: routeId,
    ownerID: nativeData && 'id' in nativeData ? nativeData.id : undefined,
    renderingUID: rendering?.uid, instanceToken: categoryInstance, html: glyphBody?.value });
  const body = category ? { ...glyphBody, value: category.html } : glyphBody;
  const data = nativeData && body !== nativeData.body?.jsonValue
    ? { ...nativeData, body: { ...nativeData.body, jsonValue: body } } : nativeData;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  // This source page title was imported as h2. Keep its existing h2 visual
  // treatment while restoring the source-owned level-one heading semantics.
  const compactId = (value: unknown) => typeof value === 'string' ? value.replace(/[{}-]/g, '').toLowerCase() : '';
  const calculatorTitle = compactId('id' in data ? data.id : undefined) === 'c4048ff267ec4d989d2a95b28c2d64a2'
    && compactId(rendering?.uid) === '57532c337e0f5dfa8bc9793e493c6fa1';
  // Visual-only projections retain the original native Body chrome.
  // The SDK receives projected HTML as non-editable content, never as a changed
  // authoring value; the native metadata wrapper owns the actual field control.
  const projectedBody = isEditing && body !== destinationBody;
  const renderBody = (className: string, tabIndex?: number) => {
    // Non-editable projections must not activate the SDK's visitor link routing.
    const content = <RichText editable={isEditing && !projectedBody} field={data.body?.jsonValue}
      internalLinksSelector={projectedBody ? ':not(*)' : undefined}
      className={`${className}${category ? ' allianz-index-category-accordions' : ''}`} tabIndex={tabIndex} />;
    return projectedBody ? <AllianzFieldContent field={nativeData?.body?.jsonValue} editable>{content}</AllianzFieldContent> : content;
  };
  const bodyValue = data.body?.jsonValue?.value;
  const hasIndexOptionsTable = !!indexOptionsScope && typeof bodyValue === 'string' && /<table\b/i.test(bodyValue);
  if (params.layout === 'rich-text' || params.layout === 'disclosures') return <div className={`l-container--full-width ${params.layout === 'disclosures' ? 'a-axlDisclosures' : sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      {shouldRenderTextField(data.body?.jsonValue, isEditing) && renderBody(params.layout === 'disclosures' ? 'content-body disclosure' : 'o-richTextEditor__wrapper')}
    </div></div></div>
  </div>;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className={`tileContent ${params.alignment === 'left' ? 'u-text-left' : 'u-text-center'}`}>
        {shouldRenderImageField(data.icon?.jsonValue, isEditing) && <div className={`tileIcon ${brandIcon ? 't-bg-primary-brand t-icon-primary-white' : 't-bg-transparent t-icon-primary-black'}`} data-allianz-rich-text-icon={brandIcon ? 'brand' : 'gray'}>
          <Image editable={isEditing} field={data.icon?.jsonValue} className="allianz-rich-text-icon-glyph" />
        </div>}
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <header><div className="tileHeading"><Text editable={isEditing} tag={calculatorTitle ? 'h1' : headingTag(params.headingLevel)} className={calculatorTitle ? 'h2' : undefined} field={data.heading?.jsonValue} /></div></header>}
        {shouldRenderTextField(data.subheading?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.subheading?.jsonValue} className="tileSubHeading" />}
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && renderBody(`tileBody ${params.headingLevel === 'h2' ? 'u-font-size-xl' : ''}${indexOptionsScope}`, hasIndexOptionsTable && !isEditing ? 0 : undefined)}
        {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
      </div></article>
    </div></div></div>
  </div>;
};


/** The brand icon treatment retains the complete Default field and layout contract. */
export const BrandIcon = (props: AllianzRichTextProps) => <Default {...props} brandIcon />;

/** Source-owned inline PDF glyphs, retaining the complete Default field surface. */
export const BodyDownloadLinks = (props: AllianzRichTextProps) => <Default {...props} bodyDownloadLinks />;

/** Source-owned single Body arrow link, retaining the complete Default field surface. */
export const BodyArrowLinks = (props: AllianzRichTextProps) => <Default {...props} bodyArrowLinks />;

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
          {shouldRenderImageField(data.icon?.jsonValue, false) && <Image field={data.icon?.jsonValue} editable={isEditing} className="allianz-about-information-glyph"
            width={24} height={24} />}
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
          {parts ? <AllianzFieldContent editable={isEditing} field={heading}>
            <small className="blue">{parts[1]}</small><span {...{ testid: 'currentMVARate' }}>{parts[2]}</span>{parts[3]}<small>{parts[4]}<span {...{ testid: 'currentMVARateEffectiveDate' }}>{parts[5]}</span></small>
          </AllianzFieldContent> : <Text editable={isEditing} field={heading} />}
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

const IapStackedTile = ({ fields, params, role, indexHeadingLevel = 'h3' }:
  AllianzRichTextProps & { role: IapTileRole; indexHeadingLevel?: 'h2' | 'h3' }) => {
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
            <div className="tileHeading">{hasHeading && shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={role === 'index-definitions-heading' ? indexHeadingLevel : 'h2'} field={data.heading?.jsonValue} />}</div>
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
export const NfIndexDefinitionsHeading = (props: AllianzRichTextProps) => <IapStackedTile {...props} role="index-definitions-heading" indexHeadingLevel="h2" />;
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

/** Three existing NF owners form one source-grey resources section. Each keeps
 * its original body field and article treatment, with spacing at the ends only. */
const NfResourcesBlock = ({ fields, params, position }:
  AllianzRichTextProps & { position: 'start' | 'middle' | 'end' }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const body = data.body?.jsonValue;
  const hasBody = shouldRenderTextField(body, isEditing);
  const spacing = position === 'start' ? ' u-padding-top-xl' : position === 'end' ? ' u-padding-bottom-xl' : '';
  return <div className={`l-container--full-width t-bg-grey-soft axlTileCollection allianz-nf-resources allianz-nf-resources-${position}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row${spacing}`}><div className="l-grid__column-medium-12">
      {position === 'start' ? (hasBody && <RichText editable={isEditing} field={body} className="o-richTextEditor__wrapper" />) :
        <article className={position === 'middle' ? 'm-axlTile match-height -is--stacked t-bg-transparent' : 'm-axlIntroductionBlock -is--stacked -no--image'}>
          <div className={`tileContent ${position === 'middle' ? 'u-text-center' : 'u-text-left'}`}>
            {position === 'middle' ? <div className="tileSubGrid__content">
              <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
              {hasBody && <RichText editable={isEditing} field={body} className="tileBody u-font-size-xl" />}
            </div> : <>
              <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
              {hasBody && <RichText editable={isEditing} field={body} className="tileBody" />}
            </>}
          </div>
        </article>}
    </div></div></div>
  </div>;
};

export const NfResourcesStart = (props: AllianzRichTextProps) => <NfResourcesBlock {...props} position="start" />;
export const NfResourcesMiddle = (props: AllianzRichTextProps) => <NfResourcesBlock {...props} position="middle" />;
export const NfResourcesEnd = (props: AllianzRichTextProps) => <NfResourcesBlock {...props} position="end" />;

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


/** Select source roles retain each existing whole native field and datasource. */
const SelectSourceTile = ({ fields, params, role, includeRiderAnchor = true }:
  AllianzRichTextProps & { role: 'rider' | 'next-step'; includeRiderAnchor?: boolean }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const rider = role === 'rider';
  return <div className={`l-container--full-width ${rider ? 't-bg-grey-soft' : 't-bg-green-soft'} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {rider && includeRiderAnchor && <a {...{ name: 'si-IB', children: null }} />}
      <div className="l-grid__row"><div className="l-grid__column-medium-12">
        <article className="m-axlTile match-height -is--stacked t-bg-transparent"><div className="tileContent u-text-center">
          {rider && <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black">
            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fillRule="evenodd" d="M22.2366635,15.7949913 C22.6083668,15.7949913 22.9981043,15.4733175 22.9981043,15.1797025 L22.9520171,12.7065219 C22.9520171,12.3477704 22.5262114,11.9830063 22.1565118,11.9990399 L21.4812341,11.98 C21.2748436,11.9739874 21.0924986,11.8427124 21.0233678,11.6473031 C20.992309,11.5601205 20.9602483,11.4589085 20.9241801,11.3456713 C20.7288104,10.7223656 20.4332512,9.78339874 19.4293516,8.84342977 L19.031599,8.45862371 C18.7731099,8.23615771 18.8412388,7.9074692 18.9434322,7.40942594 C19.0265895,7.0045779 19.194908,6.18786712 18.9805023,5.92030665 C18.5486853,5.84314502 17.9104777,6.21392169 17.0548587,7.02061148 C16.927618,7.14086338 16.7482786,7.18495574 16.5799601,7.13986128 C15.764417,6.91839737 14.092253,6.78612029 12.9470862,6.78612029 C12.8288625,6.90537008 12.6966122,7.00758419 12.5623582,7.1087962 C12.5563468,7.1128046 12.5513374,7.11881719 12.5443241,7.12282559 C12.4261004,7.21101031 12.2998615,7.28716985 12.1696151,7.35932098 C12.1395582,7.37535457 12.1105032,7.39138815 12.0794445,7.40742174 C11.9461923,7.47656658 11.8109364,7.53769462 11.6686672,7.58880168 C11.6556426,7.59180798 11.6426179,7.59481427 11.6295933,7.59982477 C11.3660947,7.69001369 11.0905734,7.74713334 10.8030293,7.77018162 C10.7549383,7.77419002 10.7068473,7.78320891 10.6587563,7.78521311 C10.6156748,7.7872173 10.575599,7.79824039 10.5325174,7.79824039 C10.4193032,7.79824039 10.3070909,7.78521311 10.1938767,7.77318792 C10.1868634,7.77318792 10.1788482,7.77318792 10.171835,7.77218582 C10.0195468,7.75615223 9.87026435,7.72909556 9.72198378,7.69201789 C9.70495155,7.68800949 9.68691743,7.68500319 9.6698852,7.6809948 C9.50857999,7.63890664 9.35128236,7.58579538 9.19799231,7.51965684 C7.02387855,8.40250616 5.46492878,9.98482066 4.90587095,11.8868048 C4.71851645,12.5131167 4.67743872,13.3719157 4.67743872,13.3809346 C4.67743872,15.2037529 5.62022262,16.9283654 7.33146054,18.2110523 C7.50879609,18.3443315 7.57792689,18.5788227 7.50078092,18.7862572 C7.50078092,18.7872593 7.16414395,19.6961632 6.84053163,20.6000566 C6.64015248,21.1632363 6.77841409,21.2484147 7.20822737,21.4107548 L7.58994964,21.5560591 C7.89953543,21.6723026 8.09290131,21.7454559 8.52672216,21.9047896 C8.89842548,22.0420772 9.14889942,21.918819 9.2931724,21.5360172 L9.85423402,20.0549147 C9.94540653,19.8114046 10.2069013,19.6781254 10.4573753,19.7492744 C12.122526,20.2142484 14.226507,19.946688 15.1061715,19.7392534 C15.3526379,19.674117 15.6051156,19.8174172 15.6922805,20.0559168 L16.2292966,21.5450361 C16.2904123,21.6853299 16.4056303,21.8095902 16.561926,21.8877539 C16.6991857,21.9458757 16.869508,21.9508862 17.0688853,21.8947686 L18.3543175,21.4107548 C18.5005943,21.3476225 18.6248293,21.2333832 18.7029772,21.0770558 C18.7610872,20.9397682 18.7681004,20.7694113 18.7099905,20.5709957 L18.1018398,18.9085133 C18.0146748,18.6720179 18.1178701,18.4074637 18.3422947,18.2912202 C19.3361753,17.7781455 20.059544,17.0776782 20.6176,16.0906106 C20.703763,15.9392936 20.8620625,15.84209 21.0363924,15.8360774 L22.2366635,15.7949913 Z M8.13598282,4.4001223 C8.13598282,4.68371635 8.18607761,4.9622999 8.2832615,5.22785617 C8.46260083,5.71487633 8.80324539,6.13876426 9.24307762,6.42035411 C9.41941127,6.53258921 9.60977146,6.61375924 9.80714492,6.67588939 C9.86826056,6.69492927 9.9303781,6.70495026 9.99149374,6.71797755 C10.1197364,6.74904262 10.2509847,6.76607831 10.383235,6.7740951 C11.1056018,6.81518116 11.8299724,6.53459341 12.3259108,5.97041161 C12.3269127,5.96940951 12.3279146,5.96840741 12.3289165,5.96740531 C12.6976141,5.54652368 12.9280502,5.00138177 12.9280502,4.4001223 C12.9280502,3.07835356 11.8540179,2.00209911 10.5325174,2.00209911 C9.21201885,2.00209911 8.13598282,3.07835356 8.13598282,4.4001223 Z M2.18973159,11.8016264 C2.40914676,11.2143963 2.40714297,10.5961011 2.27689652,10.4808597 C2.18171643,10.5069143 1.97432401,10.7494223 2.18973159,11.8016264 Z M22.1775516,10.9969408 C23.1093147,11.0009492 23.9539128,11.8096432 23.9539128,12.697503 L24,15.1706836 C24,16.0254741 23.1674246,16.7970904 22.2536957,16.7970904 L21.3459782,16.8281555 C20.7859185,17.7380615 20.0896009,18.4295099 19.1888966,18.966635 L19.6627933,20.260345 C19.7940417,20.7163001 19.7730019,21.1211481 19.6106948,21.4989395 C19.4143232,21.8947686 19.1127526,22.1763585 18.7260208,22.3407027 L17.3824786,22.8447586 C16.9246123,22.9770357 16.5188445,22.9579958 16.1421317,22.7966578 C15.7443791,22.5992443 15.4628464,22.2976125 15.2975336,21.9118043 L14.8977772,20.8044848 C13.8497942,20.9968878 12.1575923,21.1411901 10.6347108,20.8235247 L10.2309468,21.8907602 C9.97145582,22.5751939 9.43143402,22.96 8.79623212,22.96 C8.59885866,22.96 8.39246813,22.9229223 8.18207003,22.8457607 C7.74424159,22.6854248 7.54887192,22.6112695 7.23628045,22.4930218 L6.85455817,22.3487195 C6.48285485,22.2084257 5.35672404,21.7815314 5.89674584,20.2633513 C6.09912878,19.6981674 6.3065212,19.1299772 6.43476385,18.7812467 C4.65239133,17.3292051 3.67554298,15.4161979 3.67554298,13.3578863 C3.67654488,13.3498695 3.67754677,13.314796 3.68055246,13.2707037 C3.29081502,13.3318317 2.86200364,13.3368422 2.46224724,13.2316218 C2.34302164,13.3518737 2.21377709,13.4550899 2.07351169,13.537262 C1.90118562,13.6394761 1.64169462,13.7477028 1.32409367,13.7477028 C0.992466183,13.7477028 0.596717365,13.628453 0.171913571,13.2576764 C-0.0364807435,13.0752943 -0.0585224499,12.7596331 0.122820679,12.5501944 C0.3061676,12.3417578 0.621764759,12.3227179 0.830159073,12.5020936 C1.10067092,12.7375869 1.32208988,12.7997171 1.53950126,12.6894862 C1.37619225,12.5000894 1.26498183,12.273615 1.21188135,12.0180798 C0.991464288,10.9568568 1.07061405,10.2383517 1.45033254,9.82047641 C1.68477614,9.56393903 2.02041121,9.44669344 2.39812591,9.4897837 C2.8700188,9.54489915 3.20665577,9.88962125 3.32187378,10.4367674 C3.43408611,10.9728904 3.33389653,11.686385 3.06338468,12.313699 C3.3178662,12.3297326 3.57835909,12.2846381 3.80378564,12.2174975 C3.83985388,12.0120672 3.88594109,11.7996222 3.94505293,11.6012065 C4.53516953,9.59500411 6.0700738,7.9074692 8.20811932,6.87029661 C7.82639704,6.50954093 7.52482642,6.06761522 7.34348329,5.57458246 C7.20522168,5.19779319 7.13408708,4.80296614 7.13408708,4.4001223 C7.13408708,2.52519485 8.6589724,1 10.5325174,1 C12.4060625,1 13.9299459,2.52519485 13.9299459,4.4001223 C13.9299459,4.89916766 13.8157298,5.37115634 13.621362,5.79704846 C14.525072,5.83111983 15.726345,5.92331295 16.5679374,6.10669709 C17.3684521,5.38117733 18.3713497,4.67469745 19.3642284,4.98334398 C19.4133213,4.99837547 19.4604104,5.02142375 19.50249,5.05048462 C20.3330616,5.62869581 20.0775782,6.87029661 19.9242881,7.61084786 C19.9042502,7.71205987 19.8832104,7.80124669 19.8701858,7.87640413 L20.1206597,8.11791001 C21.2768474,9.20117915 21.6465469,10.3044903 21.8619545,10.9879219 L22.1775516,10.9969408 Z M13.8445883,8.08 C14.1035883,8.177 14.2345883,8.465 14.1375883,8.724 C14.0405883,8.981 13.7515883,9.116 13.4935883,9.016 C13.4925883,9.015 12.7825883,8.776 11.3005883,8.995 C9.62058828,9.238 9.19958828,9.749 9.19658828,9.754 C9.10258828,9.901 8.94858828,9.978 8.78758828,9.978 C8.69458828,9.978 8.59858828,9.952 8.51258828,9.897 C8.27958828,9.749 8.21858828,9.43 8.36658828,9.196 C8.45858828,9.052 9.02558828,8.314 11.1565883,8.005 C12.8975883,7.751 13.7535883,8.045 13.8445883,8.08 Z M18.4545883,11.957 C18.7305883,11.957 18.9545883,11.732 18.9545883,11.457 C18.9545883,11.182 18.7305883,10.957 18.4545883,10.957 C18.1785883,10.957 17.9545883,11.182 17.9545883,11.457 C17.9545883,11.732 18.1785883,11.957 18.4545883,11.957 Z M18.4545883,9.957 C19.2815883,9.957 19.9545883,10.63 19.9545883,11.457 C19.9545883,12.284 19.2815883,12.957 18.4545883,12.957 C17.6275883,12.957 16.9545883,12.284 16.9545883,11.457 C16.9545883,10.63 17.6275883,9.957 18.4545883,9.957 Z" /></svg>
          </div></div>}
          <div className="tileSubGrid__content">
            <header>
              <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
              <div className="tileSubHeading" />
            </header>
            {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody u-font-size-xl" />}
          </div>
        </div></article>
      </div></div>
    </div>
  </div>;
};

export const SelectIncomeBenefitRider = (props: AllianzRichTextProps) => <SelectSourceTile {...props} role="rider" />;

/** Income uses the same source tile without the Select-only named anchor. */
export const IncomeBenefitRider = (props: AllianzRichTextProps) => <SelectSourceTile {...props} role="rider" includeRiderAnchor={false} />;
export const SelectNextStep = (props: AllianzRichTextProps) => <SelectSourceTile {...props} role="next-step" />;

/** Both resource groups stay in their single original native Rich Text owner. */
export const SelectResources = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-grey-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="o-richTextEditor__wrapper" />}
    </div></div></div>
  </div>;
};

/** Styling supplies the source Download treatment without rebuilding the Body. */
export const SelectRiderBrochure = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-grey-soft axlTileCollection allianz-select-rider-brochure" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12 u-text-center">
      <footer>{shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileLink u-margin-top-md u-margin-bottom-md" />}</footer>
    </div></div></div>
  </div>;
};

import './AllianzSelectRichText.css';


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
            {parts ? <AllianzFieldContent editable={isEditing} field={heading}>
              <small className="blue">{parts[1]}</small><span {...{ testid: 'currentMVARate' }}>{parts[2]}</span>{parts[3]}<small>{parts[4]}<span {...{ testid: 'currentMVARateEffectiveDate' }}>{parts[5]}</span></small>
            </AllianzFieldContent> : <Text editable={isEditing} field={heading} />}
          </h2>}
          {shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} />}
        </div>
      </div></div>
    </div>
  </div>;
};


/** RFA retains its body-only source introduction and empty heading wrappers. */
export const RetirementFoundationAdvIntroduction = (props: AllianzRichTextProps) => <AAPlusResourcesIntroduction {...props} />;

/** Each source introduction owns its original native heading and complete body.
 * The shared source outer margin belongs to the following cards/answers binding. */
const RetirementFoundationAdvSectionIntroduction = ({ fields, params, sourceRole }:
  AllianzRichTextProps & { sourceRole: 'features' | 'allocation' | 'crediting' }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const contained = sourceRole !== 'features';
  return <div className={`${contained ? 'l-container' : 'l-container--full-width'} t-bg-transparent axlTileCollection`} id={params.RenderingIdentifier}>
    <div className={`l-grid l-grid--max-width${contained ? ' l-grid--no-gutters-outer' : ''}`}>
      {sourceRole === 'allocation' && <a {...{ name: 'allocation-options', children: null }} />}
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          {sourceRole !== 'crediting' && <div className="tileIcon t-bg-transparent t-icon-primary-black">
            {sourceRole === 'features' ? <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M20.0714286,0 L3.64285714,0 C2.76666667,0 2,0.763636364 2,1.63636364 L2,22.3636364 C2,23.2363636 2.76666667,24 3.64285714,24 L20.0714286,24 C20.947619,24 21.7142857,23.2363636 21.7142857,22.3636364 L21.7142857,1.63636364 C21.7142857,0.763636364 20.947619,0 20.0714286,0 Z M20.8571429,22.5857143 C20.8571429,22.92 20.6321429,23.1428571 20.2946429,23.1428571 L3.41964286,23.1428571 C3.08214286,23.1428571 2.85714286,22.92 2.85714286,22.5857143 L2.85714286,1.41428571 C2.85714286,1.08 3.08214286,0.857142857 3.41964286,0.857142857 L20.2946429,0.857142857 C20.6321429,0.857142857 20.8571429,1.08 20.8571429,1.41428571 L20.8571429,22.5857143 Z M7.14285714,4.28571429 C6.22857143,4.28571429 5.42857143,5.08571429 5.42857143,6 C5.42857143,6.91428571 6.22857143,7.71428571 7.14285714,7.71428571 C8.05714286,7.71428571 8.85714286,6.91428571 8.85714286,6 C8.85714286,5.08571429 8.05714286,4.28571429 7.14285714,4.28571429 Z M7.14285714,6.85714286 C6.62857143,6.85714286 6.28571429,6.51428571 6.28571429,6 C6.28571429,5.48571429 6.62857143,5.14285714 7.14285714,5.14285714 C7.65714286,5.14285714 8,5.48571429 8,6 C8,6.51428571 7.65714286,6.85714286 7.14285714,6.85714286 Z M7.14285714,9.42857143 C6.22857143,9.42857143 5.42857143,10.2285714 5.42857143,11.1428571 C5.42857143,12.0571429 6.22857143,12.8571429 7.14285714,12.8571429 C8.05714286,12.8571429 8.85714286,12.0571429 8.85714286,11.1428571 C8.85714286,10.2285714 8.05714286,9.42857143 7.14285714,9.42857143 Z M7.14285714,12 C6.62857143,12 6.28571429,11.6571429 6.28571429,11.1428571 C6.28571429,10.6285714 6.62857143,10.2857143 7.14285714,10.2857143 C7.65714286,10.2857143 8,10.6285714 8,11.1428571 C8,11.6571429 7.65714286,12 7.14285714,12 Z M7.14285714,15.4285714 C6.22857143,15.4285714 5.42857143,16.2285714 5.42857143,17.1428571 C5.42857143,18.0571429 6.22857143,18.8571429 7.14285714,18.8571429 C8.05714286,18.8571429 8.85714286,18.0571429 8.85714286,17.1428571 C8.85714286,16.2285714 8.05714286,15.4285714 7.14285714,15.4285714 Z M7.14285714,18 C6.62857143,18 6.28571429,17.6571429 6.28571429,17.1428571 C6.28571429,16.6285714 6.62857143,16.2857143 7.14285714,16.2857143 C7.65714286,16.2857143 8,16.6285714 8,17.1428571 C8,17.6571429 7.65714286,18 7.14285714,18 Z M18.5918367,5.14285714 C18.922449,5.14285714 19.1428571,5.31428571 19.1428571,5.57142857 C19.1428571,5.82857143 18.922449,6 18.5918367,6 L11.9795918,6 C11.6489796,6 11.4285714,5.82857143 11.4285714,5.57142857 C11.4285714,5.31428571 11.6489796,5.14285714 11.9795918,5.14285714 L18.5918367,5.14285714 Z M18.5918367,12 C18.922449,12 19.1428571,12.1714286 19.1428571,12.4285714 C19.1428571,12.6857143 18.922449,12.8571429 18.5918367,12.8571429 L11.9795918,12.8571429 C11.6489796,12.8571429 11.4285714,12.6857143 11.4285714,12.4285714 C11.4285714,12.1714286 11.6489796,12 11.9795918,12 L18.5918367,12 Z M18.5918367,17.1428571 C18.922449,17.1428571 19.1428571,17.3142857 19.1428571,17.5714286 C19.1428571,17.8285714 18.922449,18 18.5918367,18 L11.9795918,18 C11.6489796,18 11.4285714,17.8285714 11.4285714,17.5714286 C11.4285714,17.3142857 11.6489796,17.1428571 11.9795918,17.1428571 L18.5918367,17.1428571 Z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fillRule="evenodd" d="M0.545454545,22 C0.244363636,22 0,21.7511111 0,21.4444444 L0,2.55555556 C0,2.24888889 0.244363636,2 0.545454545,2 C0.846545455,2 1.09090909,2.24888889 1.09090909,2.55555556 L1.09090909,20.8888889 L23.4545455,20.8888889 C23.7556364,20.8888889 24,21.1377778 24,21.4444444 C24,21.7511111 23.7556364,22 23.4545455,22 L0.545454545,22 Z M18.705,8.82916667 C18.9177273,8.6125 19.2635455,8.6125 19.4762727,8.82916667 C19.689,9.04583333 19.689,9.39805556 19.4762727,9.61472222 L14.0217273,15.1702778 C13.8286364,15.3669444 13.5242727,15.3880556 13.3093636,15.2213889 L9.32318182,12.1780556 L5.29445455,16.2813889 C5.18754545,16.3902778 5.04790909,16.4447222 4.90936364,16.4447222 C4.76972727,16.4447222 4.63009091,16.3902778 4.52318182,16.2813889 C4.31045455,16.0647222 4.31045455,15.7125 4.52318182,15.4958333 L8.88681818,11.0513889 C9.07772727,10.8547222 9.38209091,10.8336111 9.59918182,11.0002778 L13.5853636,14.0436111 L18.705,8.82916667 Z" /></svg>}
          </div>}
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={sourceRole === 'features' ? 'h3' : 'h2'} field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
          {sourceRole !== 'features' && shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
        </div></article>
      </div></div>
    </div>
  </div>;
};

/** Features has a separate original datasource and source List glyph with H3. */
export const RetirementFoundationAdvFeaturesIntroduction = (props: AllianzRichTextProps) => <RetirementFoundationAdvSectionIntroduction {...props} sourceRole="features" />;

export const RetirementFoundationAdvAllocationIntroduction = (props: AllianzRichTextProps) => <RetirementFoundationAdvSectionIntroduction {...props} sourceRole="allocation" />;

/** The crediting introduction has no source glyph. */
export const RetirementFoundationAdvCreditingIntroduction = (props: AllianzRichTextProps) => <RetirementFoundationAdvSectionIntroduction {...props} sourceRole="crediting" />;

/** The second source heading is stored as complete native RichText body. */
export const RetirementFoundationAdvQuestionsHeading = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-green-soft" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className="tileIcon t-bg-primary-brand t-icon-primary-white"><svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M14,8 C14.3,8 14.5,8.2 14.5,8.5 L14.5,23.5 C14.5,23.8 14.3,24 14,24 L10,24 C9.7,24 9.5,23.8 9.5,23.5 L9.5,8.5 C9.5,8.2 9.7,8 10,8 L14,8 Z M12,6 C10.3,6 9,4.7 9,3 C9,1.3 10.3,0 12,0 C13.7,0 15,1.3 15,3 C15,4.7 13.7,6 12,6 Z" /></svg></div>
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={data.body?.jsonValue} className="tileSubHeading" /> : <div className="tileSubHeading" />}
        </header>
      </div></article>
    </div></div></div>
  </div>;
};

/** MVA is the authored native snapshot, preserving its entire editing owner. */
export const RetirementFoundationAdvMvaReference = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const heading = data.heading?.jsonValue;
  const body = data.body?.jsonValue;
  const parts = typeof heading?.value === 'string'
    ? /^(Current MVA reference rate:\s*)([+-]?(?:\d+(?:\.\d+)?|\.\d+))(\s*%\s*)(as of\s+)(\d{1,2}\/\d{1,2}\/\d{4})$/.exec(heading.value)
    : null;
  return <div className="l-container--full-width t-bg-grey-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <a {...{ name: 'mva-scs', children: null }} />
      <div className="l-grid__row"><div className="l-grid__column-medium-12">
        <div id="seven-yr-slot" className="well seven-yr-slot">
          {shouldRenderTextField(heading, isEditing) && <h2>
            {parts ? <AllianzFieldContent editable={isEditing} field={heading}>
              <small className="blue">{parts[1]}</small><span {...{ testid: 'currentMVARate' }}>{parts[2]}</span>{parts[3]}<small>{parts[4]}<span {...{ testid: 'currentMVARateEffectiveDate' }}>{parts[5]}</span></small>
            </AllianzFieldContent> : <Text editable={isEditing} field={heading} />}
          </h2>}
          {shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} />}
        </div>
      </div></div>
    </div>
  </div>;
};

/** Source centered H3/table presentation is shared exactly with Essential. */
export const RetirementFoundationAdvWithdrawalSchedule = (props: AllianzRichTextProps) => <EssentialIncome7WithdrawalSchedule {...props} />;

export const RetirementFoundationAdvFootnotes = (props: AllianzRichTextProps) => <ClassicFootnotes {...props} />;

/** Legal content keeps the complete native body in the original disclosure grid. */
export const RetirementFoundationAdvDisclosures = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width a-axlDisclosures" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column"><div className="row">
      {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="col-md-12 content-body disclosure" />}
    </div></div></div></div>
  </div>;
};


/** Core Income 7 keeps existing native fields in its exact source roles. */
export const CoreIncome7Introduction = (props: AllianzRichTextProps) => <AAPlusResourcesIntroduction {...props} />;

/** Only the following video binding owns the source section's 64px outer margin. */
export const CoreIncome7BenefitsIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-primary-white axlTileCollection" id={params.RenderingIdentifier === 'video' ? undefined : params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <a {...{ name: 'video', children: null }} />
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

/** The separate native feature introduction owns the source H2/List glyph. */
export const CoreIncome7FeaturesIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className={"l-container--full-width t-bg-transparent axlTileCollection"} id={params.RenderingIdentifier}>
    <div className={"l-grid l-grid--max-width"}>
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <div className="tileIcon t-bg-transparent t-icon-primary-black">
            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M20.0714286,0 L3.64285714,0 C2.76666667,0 2,0.763636364 2,1.63636364 L2,22.3636364 C2,23.2363636 2.76666667,24 3.64285714,24 L20.0714286,24 C20.947619,24 21.7142857,23.2363636 21.7142857,22.3636364 L21.7142857,1.63636364 C21.7142857,0.763636364 20.947619,0 20.0714286,0 Z M20.8571429,22.5857143 C20.8571429,22.92 20.6321429,23.1428571 20.2946429,23.1428571 L3.41964286,23.1428571 C3.08214286,23.1428571 2.85714286,22.92 2.85714286,22.5857143 L2.85714286,1.41428571 C2.85714286,1.08 3.08214286,0.857142857 3.41964286,0.857142857 L20.2946429,0.857142857 C20.6321429,0.857142857 20.8571429,1.08 20.8571429,1.41428571 L20.8571429,22.5857143 Z M7.14285714,4.28571429 C6.22857143,4.28571429 5.42857143,5.08571429 5.42857143,6 C5.42857143,6.91428571 6.22857143,7.71428571 7.14285714,7.71428571 C8.05714286,7.71428571 8.85714286,6.91428571 8.85714286,6 C8.85714286,5.08571429 8.05714286,4.28571429 7.14285714,4.28571429 Z M7.14285714,6.85714286 C6.62857143,6.85714286 6.28571429,6.51428571 6.28571429,6 C6.28571429,5.48571429 6.62857143,5.14285714 7.14285714,5.14285714 C7.65714286,5.14285714 8,5.48571429 8,6 C8,6.51428571 7.65714286,6.85714286 7.14285714,6.85714286 Z M7.14285714,9.42857143 C6.22857143,9.42857143 5.42857143,10.2285714 5.42857143,11.1428571 C5.42857143,12.0571429 6.22857143,12.8571429 7.14285714,12.8571429 C8.05714286,12.8571429 8.85714286,12.0571429 8.85714286,11.1428571 C8.85714286,10.2285714 8.05714286,9.42857143 7.14285714,9.42857143 Z M7.14285714,12 C6.62857143,12 6.28571429,11.6571429 6.28571429,11.1428571 C6.28571429,10.6285714 6.62857143,10.2857143 7.14285714,10.2857143 C7.65714286,10.2857143 8,10.6285714 8,11.1428571 C8,11.6571429 7.65714286,12 7.14285714,12 Z M7.14285714,15.4285714 C6.22857143,15.4285714 5.42857143,16.2285714 5.42857143,17.1428571 C5.42857143,18.0571429 6.22857143,18.8571429 7.14285714,18.8571429 C8.05714286,18.8571429 8.85714286,18.0571429 8.85714286,17.1428571 C8.85714286,16.2285714 8.05714286,15.4285714 7.14285714,15.4285714 Z M7.14285714,18 C6.62857143,18 6.28571429,17.6571429 6.28571429,17.1428571 C6.28571429,16.6285714 6.62857143,16.2857143 7.14285714,16.2857143 C7.65714286,16.2857143 8,16.6285714 8,17.1428571 C8,17.6571429 7.65714286,18 7.14285714,18 Z M18.5918367,5.14285714 C18.922449,5.14285714 19.1428571,5.31428571 19.1428571,5.57142857 C19.1428571,5.82857143 18.922449,6 18.5918367,6 L11.9795918,6 C11.6489796,6 11.4285714,5.82857143 11.4285714,5.57142857 C11.4285714,5.31428571 11.6489796,5.14285714 11.9795918,5.14285714 L18.5918367,5.14285714 Z M18.5918367,12 C18.922449,12 19.1428571,12.1714286 19.1428571,12.4285714 C19.1428571,12.6857143 18.922449,12.8571429 18.5918367,12.8571429 L11.9795918,12.8571429 C11.6489796,12.8571429 11.4285714,12.6857143 11.4285714,12.4285714 C11.4285714,12.1714286 11.6489796,12 11.9795918,12 L18.5918367,12 Z M18.5918367,17.1428571 C18.922449,17.1428571 19.1428571,17.3142857 19.1428571,17.5714286 C19.1428571,17.8285714 18.922449,18 18.5918367,18 L11.9795918,18 C11.6489796,18 11.4285714,17.8285714 11.4285714,17.5714286 C11.4285714,17.3142857 11.6489796,17.1428571 11.9795918,17.1428571 L18.5918367,17.1428571 Z" /></svg>
          </div>
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
        </div></article>
      </div></div>
    </div>
  </div>;
};

/** The source allocation anchor precedes the native heading and body. */
export const CoreIncome7AllocationIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier === 'allocation-options' ? undefined : params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <a {...{ name: 'allocation-options', children: null }} />
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

export const CoreIncome7CreditingIntroduction = (props: AllianzRichTextProps) => <AAPlusCreditingIntroduction {...props} />;

export const CoreIncome7QuestionsHeading = (props: AllianzRichTextProps) => <RetirementFoundationAdvQuestionsHeading {...props} />;

/** The MVA remains the complete authored snapshot; no rate fetching is introduced. */
export const CoreIncome7MvaReference = ({ fields, params }: AllianzRichTextProps) => {
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
      <a {...{ name: 'mva-rate', children: null }} />
      <div className="l-grid__row"><div className="l-grid__column-medium-12">
        <div id="seven-yr-slot" className="well seven-yr-slot">
          {shouldRenderTextField(heading, isEditing) && <h2>
            {parts ? <AllianzFieldContent editable={isEditing} field={heading}>
              <small className="blue">{parts[1]}</small><span {...{ testid: 'currentMVARate' }}>{parts[2]}</span>{parts[3]}<small>{parts[4]}<span {...{ testid: 'currentMVARateEffectiveDate' }}>{parts[5]}</span></small>
            </AllianzFieldContent> : <Text editable={isEditing} field={heading} />}
          </h2>}
          {shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} />}
        </div>
      </div></div>
    </div>
  </div>;
};

export const CoreIncome7WithdrawalSchedule = (props: AllianzRichTextProps) => <EssentialIncome7WithdrawalSchedule {...props} />;

export const CoreIncome7Footnotes = (props: AllianzRichTextProps) => <ClassicFootnotes {...props} />;

export const CoreIncome7Disclosures = (props: AllianzRichTextProps) => <RetirementFoundationAdvDisclosures {...props} />;

/** Lifetime's challenge owns only its native heading and unchanged body. */
export const LifetimeIncomeChallenge = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-purple-soft axlTileCollection" style={{ display: 'flow-root' }} id={params.RenderingIdentifier === 'video' ? undefined : params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <a {...{ name: 'video', children: null }} />
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

/** Lifetime's plan-fit tile retains the body's native inline alignment and lists. */
export const LifetimeIncomePlanFit = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-purple-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
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
/** Taking Income keeps its source video introduction in the existing heading owner. */
export const TakingIncomeVideoIntroduction = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const glyphId = useId();
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      <article className="m-axlTile match-height -is--stacked t-bg-transparent"><div className="tileContent u-text-center">
        <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black">
          <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby={`${glyphId}-title`} aria-describedby={`${glyphId}-description`} focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
            <title id={`${glyphId}-title`}>Video Camera</title><desc id={`${glyphId}-description`}>Video Camera</desc>
            <path d="M23.7,11.1 C23.5,11 23.3,11 23.2,11.1 L20,13.4 C19.9,12.1 18.8,11 17.5,11 L17.3,11 C18.3,10.2 19,8.9 19,7.5 C19,5 17,3 14.5,3 C12.7,3 11.2,4 10.5,5.5 C9.8,4 8.3,3 6.5,3 C4,3 2,5 2,7.5 C2,8.9 2.7,10.2 3.7,11 L2.5,11 C1.1,11 0,12.1 0,13.5 L0,18.5 C0,19.9 1.1,21 2.5,21 L17.5,21 C18.9,21 20,19.9 20,18.5 L23.2,20.9 C23.3,21 23.4,21 23.5,21 C23.6,21 23.7,21 23.7,20.9 C23.9,20.8 24,20.6 24,20.5 L24,11.5 C24,11.3 23.9,11.1 23.7,11.1 Z M14.5,4 C16.4,4 18,5.6 18,7.5 C18,9.4 16.4,11 14.5,11 C12.6,11 11,9.4 11,7.5 C11,5.6 12.6,4 14.5,4 Z M11.7,11 L9.3,11 C9.8,10.6 10.2,10.1 10.5,9.5 C10.8,10.1 11.2,10.6 11.7,11 Z M3,7.5 C3,5.6 4.6,4 6.5,4 C8.4,4 10,5.6 10,7.5 C10,9.4 8.4,11 6.5,11 C4.6,11 3,9.4 3,7.5 Z M19,18.5 C19,19.3 18.3,20 17.5,20 L2.5,20 C1.7,20 1,19.3 1,18.5 L1,13.5 C1,12.7 1.7,12 2.5,12 L17.5,12 C18.3,12 19,12.7 19,13.5 L19,14.4 L19,17.5 L19,18.5 Z M23,19.5 L20,17.3 L20,14.7 L23,12.6 L23,19.5 Z" />
          </svg>
        </div></div>
        <div className="tileSubGrid__content">
          <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
          <div className="tileBody u-font-size-md">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
        </div>
      </div></article>
    </div></div></div>
  </div>;
};

/** The two source resource cards remain one native Body field beneath their heading. */
export const TakingIncomeResources = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const glyphId = useId();
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const body = safeEditorialRichText(data.body?.jsonValue, isEditing, true);
  return <div className="l-container--full-width t-bg-green-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <div className="tileIcon t-bg-purple-bright t-icon-primary-white">
            <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby={`${glyphId}-title`} aria-describedby={`${glyphId}-description`} focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
              <title id={`${glyphId}-title`}>Information</title><desc id={`${glyphId}-description`}>Information</desc>
              <path d="M14,8 C14.3,8 14.5,8.2 14.5,8.5 L14.5,23.5 C14.5,23.8 14.3,24 14,24 L10,24 C9.7,24 9.5,23.8 9.5,23.5 L9.5,8.5 C9.5,8.2 9.7,8 10,8 L14,8 Z M12,6 C10.3,6 9,4.7 9,3 C9,1.3 10.3,0 12,0 C13.7,0 15,1.3 15,3 C15,4.7 13.7,6 12,6 Z" />
            </svg>
          </div>
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
        </div></article>
      </div></div>
      {shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} className="l-grid__row match-height-row u-padding-bottom-xl" />}
    </div>
  </div>;
};
