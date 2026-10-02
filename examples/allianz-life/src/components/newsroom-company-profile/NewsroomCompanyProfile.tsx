'use client';

import { Image, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderTextField } from 'lib/allianz-field-state';
import { newsroomCompanyProfileFields, type NewsroomCompanyProfileProps } from './newsroom-company-profile.props';
import { safeNewsroomRichText } from './newsroom-company-profile.links.props';
import './NewsroomCompanyProfile.css';

/** Two fixed white company tiles on blue; layout and headings are source-defined. */
export const Default = ({ fields, params }: NewsroomCompanyProfileProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  if (!fields?.data?.datasource) return <NoDataFallback componentName="Newsroom Company Profile" />;
  const source = newsroomCompanyProfileFields(fields.data.datasource);
  return <div className="l-container--full-width t-bg-blue-soft axlTileCollection allianz-newsroom-company-profile" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <header><div className="tileHeading">
            {shouldRenderTextField(source.heading?.jsonValue, isEditing) && <Text field={source.heading?.jsonValue} tag="h2" editable={isEditing} />}
          </div><div className="tileSubHeading" /></header>
        </div></article>
      </div></div>
      <div className="l-grid__row"><div className="l-grid__column-medium-12">
        <article className="m-axlTile match-height tile--5050 -is--flipped -is--split t-bg-primary-white u-margin-bottom-xl">
          <div className="tileContent u-text-left"><div className="tileSubGrid__content">
            <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
            {shouldRenderTextField(source.facts?.jsonValue, isEditing)
              ? <RichText field={safeNewsroomRichText(source.facts?.jsonValue, isEditing)} className="tileBody u-font-size-md" editable={isEditing} />
              : <div className="tileBody u-font-size-md" />}
          </div></div>
          {shouldRenderImageField(source.companyImage?.jsonValue, isEditing) && <div className="tileImage">
            <picture className="c-image c-teaser__image"><Image field={source.companyImage?.jsonValue} editable={isEditing} className="c-image__img c-teaser__image-img" /></picture>
          </div>}
        </article>
        <article className="m-axlTile match-height tile--5050 -is--split t-bg-primary-white u-margin-bottom-xl">
          <div className="tileContent u-text-left"><div className="tileSubGrid__content">
            <header><div className="tileHeading">
              {shouldRenderTextField(source.parentHeading?.jsonValue, isEditing) && <Text field={source.parentHeading?.jsonValue} tag="h3" editable={isEditing} />}
            </div><div className="tileSubHeading" /></header>
            {shouldRenderTextField(source.parentBody?.jsonValue, isEditing)
              ? <RichText field={safeNewsroomRichText(source.parentBody?.jsonValue, isEditing)} className="tileBody u-font-size-md" editable={isEditing} />
              : <div className="tileBody u-font-size-md" />}
          </div></div>
          {shouldRenderImageField(source.parentImage?.jsonValue, isEditing) && <div className="tileImage">
            <picture className="c-image c-teaser__image"><Image field={source.parentImage?.jsonValue} editable={isEditing} className="c-image__img c-teaser__image-img" /></picture>
          </div>}
        </article>
      </div></div>
    </div>
  </div>;
};
