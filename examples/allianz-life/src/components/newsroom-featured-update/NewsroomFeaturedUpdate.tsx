'use client';

import { Image, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderTextField } from 'lib/allianz-field-state';
import { newsroomReleaseFields } from 'components/press-release-archive/press-release-archive.props';
import { safeNewsroomRichText } from 'components/newsroom-public-relations/newsroom-public-relations.links.props';
import { newsroomFeaturedRelease, newsroomFeaturedUpdateFields, type NewsroomFeaturedUpdateProps } from './newsroom-featured-update.props';
import './NewsroomFeaturedUpdate.css';

/** The featured recognition stays curated even when newer releases exist. */
export const Default = ({ fields, params }: NewsroomFeaturedUpdateProps) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Newsroom Featured Update" />;
  const data = newsroomFeaturedUpdateFields(datasource);
  const selected = newsroomFeaturedRelease(data);
  const release = selected ? newsroomReleaseFields(selected) : undefined;
  return <div className="l-container u-row-spacing t-bg-transparent axlTileCollection allianz-newsroom-featured-update" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width l-grid--no-gutters-outer"><div className="l-grid__row match-height-row u-padding-top-xl"><div className="l-grid__column-medium-12">
      <article className="m-axlTile match-height tile--6633 -is--flipped -is--split t-bg-blue-soft">
        <div className="tileContent u-text-left"><div className="tileSubGrid__content"><header>
          <div className="tileHeading">{shouldRenderTextField(data.label?.jsonValue, editable) && <Text field={data.label?.jsonValue} editable={editable} tag="h2" />}</div>
          <div className="tileSubHeading">{shouldRenderTextField(release?.title?.jsonValue, editable) && <Text field={release?.title?.jsonValue} editable={editable} tag="h3" />}</div>
        </header>
          {shouldRenderTextField(data.body?.jsonValue, editable) && <RichText field={safeNewsroomRichText(data.body?.jsonValue, editable)} editable={editable} className="tileBody u-font-size-md" />}
          {editable && !release && <p role="status">Select the featured news release.</p>}
        </div></div>
        {shouldRenderImageField(data.image?.jsonValue, editable) && <div className="tileImage"><picture className="c-image c-teaser__image">
          <Image field={data.image?.jsonValue} editable={editable} className="c-image__img c-teaser__image-img" />
        </picture></div>}
      </article>
    </div></div></div>
  </div>;
};
