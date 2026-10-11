'use client';

import { Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { AllianzRichTextProps } from './allianz-rich-text.props';
import './AllianzLifeOverviewHeadings.css';

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
