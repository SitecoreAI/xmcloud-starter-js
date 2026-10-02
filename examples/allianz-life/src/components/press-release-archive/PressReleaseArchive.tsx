'use client';

import { DateField, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { safeNewsroomRichText } from 'components/newsroom-public-relations/newsroom-public-relations.links.props';
import {
  newsroomCalendarDate, newsroomDateLabel, newsroomReleaseItems, newsroomReleaseLink,
  pressReleaseArchiveFields, type PressReleaseArchiveProps,
} from './press-release-archive.props';
import './PressReleaseArchive.css';

/** Fixed source archive: H1 introduction and an image-free medium-12/large-8 list. */
export const Default = ({ fields, params }: PressReleaseArchiveProps) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Press Release Archive" />;
  const data = pressReleaseArchiveFields(datasource);
  const releases = newsroomReleaseItems(data.releases);
  return <div className="allianz-press-release-archive" id={params?.RenderingIdentifier}>
    <div className="l-container--full-width t-bg-transparent axlTileCollection">
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12" /></div>
        <div className="l-grid__row"><div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image">
            <div className="tileContent u-text-left"><header>
              <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, editable) &&
                <Text field={data.heading?.jsonValue} editable={editable} tag="h1" />}</div>
              <div className="tileSubHeading" />
            </header></div>
          </article>
        </div></div>
      </div>
    </div>
    <div className="l-container l-container--full-width"><div className="l-grid l-grid--max-width"><div className="l-grid__row">
      <div className="c-search-result-text-teaser l-grid__column-medium-12 l-grid__column-large-8"><div className="l-grid__row">
        {releases.items.map((release, index) => {
          const link = newsroomReleaseLink(release);
          const date = release.releaseDate?.jsonValue;
          return <div className="l-grid__column-small-12" key={`${release.id}-${index}`}>
            <article className="c-search-result-text-teaser__item">
              <h5 className="c-heading c-search-result-text-teaser__headline u-text-weight-semibold c-heading--subsection-small">
                {link ? <Link field={allianzLinkField(link, editable)} editable={false} className="c-heading__link">
                  <Text field={release.title?.jsonValue} editable={editable} />
                </Link> : <Text field={release.title?.jsonValue} editable={editable} />}
              </h5>
              {shouldRenderTextField(date, editable) && <p className="c-copy c-search-result-text-teaser__copytext">
                {date?.value
                  ? <DateField field={date} editable={editable} render={() => newsroomDateLabel(date.value, 'archive')} />
                  : <DateField field={date!} editable={editable} />}
              </p>}
              {shouldRenderTextField(release.summary?.jsonValue, editable) &&
                <RichText field={safeNewsroomRichText(release.summary?.jsonValue, editable)} editable={editable}
                  tag={/<(?:p|div|ul|ol|h[1-6])\b/i.test(release.summary?.jsonValue?.value ?? '') ? 'div' : 'p'}
                  className="c-copy c-search-result-text-teaser__copytext" />}
              {editable && !link && <p role="status">This release needs its owning page URL.</p>}
              {editable && date?.value && !newsroomCalendarDate(date.value) && <p role="status">Choose a valid release date.</p>}
            </article>
          </div>;
        })}
        {editable && !releases.complete && <p role="status">The release references have not loaded completely.</p>}
        {editable && releases.complete && releases.items.length === 0 && <p role="status">Select the news releases for this archive.</p>}
      </div></div>
    </div></div></div>
  </div>;
};
