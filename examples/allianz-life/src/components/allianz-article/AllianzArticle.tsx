'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { shouldRenderTextField } from 'lib/allianz-field-state';
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
