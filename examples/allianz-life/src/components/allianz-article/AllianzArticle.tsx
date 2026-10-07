'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { editorialBodyClass, editorialHeadingTag, safeEditorialRichText } from 'lib/allianz-editorial';
import { EditorialFrame } from 'lib/allianz-editorial-frame';
import type { AllianzArticleProps } from './allianz-article.props';

export const Default = ({ fields, params }: AllianzArticleProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzArticle" />;
  return <article className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <header className="m-azlIntroductionBlock"><div className="tileContent"><div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h1" field={data.heading?.jsonValue} />}</div>{shouldRenderTextField(data.summary?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.summary?.jsonValue} className="tileSubHeading" />}</div></header>
      {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="o-richTextEditor__wrapper" />}
    </div></div></div>
  </article>;
};

/** Prose-only editorial islands. Heading/summary remain native fields; no extra H1. */
export const EditorialBody = ({ fields, params }: AllianzArticleProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzArticle" />;
  const tile = params.scaffold === 'plain-tile';
  const richTextField = params.scaffold === 'rich-text'
    ? safeEditorialRichText(data.body?.jsonValue, isEditing) : undefined;
  // Opt-in for a CMS-serialized leading empty paragraph. In text/html, <p />
  // is an open paragraph, not the source's empty <p></p>. Keep saved fields
  // and SDK metadata unchanged; normalize only this render-time value.
  const richTextBody = richTextField && params.leadingEmptyParagraph === '1'
    && /^<p[ \t\r\n\f]*\/>/.test(richTextField.value)
    ? { ...richTextField, value: richTextField.value.replace(/^<p[ \t\r\n\f]*\/>/, '<p></p>') }
    : richTextField;
  const content = <>
    <header>
      <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={editorialHeadingTag(params.headingLevel)} field={data.heading?.jsonValue} />}</div>
      {shouldRenderTextField(data.summary?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(data.summary?.jsonValue, isEditing)} className="tileSubHeading" /> : <div className="tileSubHeading" />}
    </header>
    {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className={editorialBodyClass(params.bodySize)} />}
  </>;
  return <EditorialFrame params={params} column>
    {params.scaffold === 'rich-text' ? <RichText editable={isEditing} field={richTextBody} className="o-richTextEditor__wrapper" /> :
      <article className={tile ? 'm-axlTile match-height -is--stacked t-bg-transparent' : 'm-axlIntroductionBlock -is--stacked -no--image'}>
        <div className={`tileContent ${params.alignment === 'center' ? 'u-text-center' : 'u-text-left'}`}>
          {tile ? <div className="tileSubGrid__content">{content}</div> : content}
        </div>
      </article>}
  </EditorialFrame>;
};
