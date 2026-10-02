'use client';

import { DateField, Link, RichText, Text, useComponentProps, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { safeNewsroomRichText } from 'components/newsroom-public-relations/newsroom-public-relations.links.props';
import {
  newsroomCalendarDate, newsroomDateLabel, newsroomReleaseFields, newsroomReleaseLink,
} from 'components/press-release-archive/press-release-archive.props';
import { newsroomRecentReleasesFields, type NewsroomRecentReleasesProps } from './newsroom-recent-releases.props';
import './NewsroomRecentReleases.css';
import type { AutomaticReleases } from 'lib/newsroom-automatic-data';

/** The server supplies six newest eligible child releases; the heading stays editable. */
export const Default = ({ fields, params, rendering }: NewsroomRecentReleasesProps) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const automatic = useComponentProps<{ automaticReleases?: AutomaticReleases }>(rendering?.uid ?? '');
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Recent News Releases" />;
  const data = newsroomRecentReleasesFields(datasource);
  const releases = automatic?.automaticReleases;
  const rows = releases?.complete && releases.status === 'ready' ? releases.items.map(newsroomReleaseFields) : [];
  const moreLink = data.moreLink?.jsonValue;
  return <div className="l-container--full-width t-bg-transparent allianz-newsroom-recent-releases" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center"><header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, editable) &&
            <Text field={data.heading?.jsonValue} editable={editable} tag="h2" />}</div><div className="tileSubHeading" />
        </header></div></article>
      </div></div>
      <div className="l-grid__row"><div className="l-grid__column-medium-12"><div className="o-cards o-cards__col3">
        {rows.map((release, index) => {
          const link = newsroomReleaseLink(release);
          const date = release.releaseDate?.jsonValue;
          const title = shouldRenderTextField(release.title?.jsonValue, false)
            ? <Text field={release.title?.jsonValue} editable={false} /> : null;
          return <article key={`${release.id}-${index}`} className="m-card">
            <div className="m-card__header">
              {title && <h4>{link
                ? <Link field={allianzLinkField(link, editable)} editable={false}
                    className={`m-card__title-link${editable ? '' : ' m-card__title-link--stretched'}`}>{title}</Link>
                : title}</h4>}
            </div>
            <div className="m-card__body">
              {shouldRenderTextField(date, false) && <time dateTime={newsroomCalendarDate(date?.value)?.iso}>
                {date?.value
                  ? <DateField field={date} editable={false} render={() => newsroomDateLabel(date.value, 'recent')} />
                  : null}
              </time>}
              {shouldRenderTextField(release.summary?.jsonValue, false) &&
                <RichText field={safeNewsroomRichText(release.summary?.jsonValue, false)} editable={false}
                  className="allianz-newsroom-recent-releases__summary"
                  tag={/<(?:p|div|ul|ol|h[1-6])\b/i.test(release.summary?.jsonValue?.value ?? '') ? 'div' : 'p'} />}
            </div>
            {editable && !link && <p role="status">This release needs its owning page URL.</p>}
          </article>;
        })}
      </div></div></div>
      {!releases?.complete && <p role="status">Recent news releases are temporarily unavailable.</p>}
      {editable && releases?.complete && !rows.length && <p role="status">Add dated press release pages beneath Newsroom year pages to populate recent news.</p>}
      {editable && Boolean(releases?.missingDates) && <p role="status">Some release dates are missing or invalid. Edit them on their release pages.</p>}
      {editable && Boolean(releases?.missingSources) && <p role="status">Some release pages still need their article content.</p>}
      <div className="l-grid__row"><div className="l-grid__column-medium-12 u-text-center"><footer><div className="tileLink u-margin-top-md u-margin-bottom-md">
        {shouldRenderLinkField(moreLink, editable) && <Link field={allianzLinkField(moreLink, editable)} editable={editable} renderChildrenWhenEmpty={editable} className="a-link">
          <span className="a-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet">
            <path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536" />
          </svg></span><span className="a-link__text">{moreLink?.value?.text}</span>
        </Link>}
      </div></footer></div></div>
    </div>
  </div>;
};
