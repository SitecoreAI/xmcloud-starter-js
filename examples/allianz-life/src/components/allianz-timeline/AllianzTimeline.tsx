'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { rowSpacing, sectionTheme } from 'lib/allianz-fields';
import type { AllianzTimelineProps } from './allianz-timeline.props';

export const Default = ({ fields, params }: AllianzTimelineProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzTimeline" />;
  return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12">
      {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}
      {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
      <table className="allianz-timeline"><tbody>{(data.children?.results ?? []).map((item) => <tr key={item.id}><th scope="row">{shouldRenderTextField(item.date?.jsonValue, isEditing) && <Text editable={isEditing} field={item.date?.jsonValue} />}</th><td>
        {shouldRenderTextField(item.heading?.jsonValue, isEditing) && <Text editable={isEditing} field={item.heading?.jsonValue} tag="h3" />}
        {shouldRenderTextField(item.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={item.body?.jsonValue} />}
        {shouldRenderImageField(item.image?.jsonValue, isEditing) && <Image editable={isEditing} field={item.image?.jsonValue} />}
        {shouldRenderLinkField(item.link?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(item.link?.jsonValue, isEditing)} className="a-link" />}
      </td></tr>)}</tbody></table>
    </div></div></div>
  </section>;
};

import { Fragment } from 'react';
import './AboutHistory.css';

/** Fixed About source presentation; every authored value stays its original SDK field. */
export const AboutHistory = ({ fields, params }: AllianzTimelineProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzTimeline" />;
  const entries = data.children?.results ?? [];
  return <div className="l-container--full-width t-bg-blue-soft axlTileCollection allianz-about-history" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
        <div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image">
            <div className="tileContent u-text-center"><header>
              <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) &&
                <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
              <div className="tileSubHeading" />
            </header></div>
          </article>
        </div>
      </div>
      <div className="l-grid__row">
        <div className="l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12">
          <div className="o-richTextEditor__wrapper">
            {shouldRenderTextField(data.body?.jsonValue, isEditing) &&
              <RichText editable={isEditing} field={data.body?.jsonValue} />}
            <p className="allianz-about-history-leading-space" aria-hidden="true" />
            <table className="table" aria-hidden="true" />
            <table className="allianz-about-history-table"><tbody>
              {entries.map((item, index) => <Fragment key={item.id}>
                <tr className="allianz-about-history-entry">
                  <td className="allianz-about-history-date">{shouldRenderTextField(item.date?.jsonValue, isEditing) && <Text editable={isEditing} tag="strong" field={item.date?.jsonValue} />}</td>
                  <td className="allianz-about-history-gap" aria-hidden="true">{'\u00a0'}</td>
                  <td className="allianz-about-history-body">{shouldRenderTextField(item.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={item.body?.jsonValue} />}</td>
                </tr>
                {index < entries.length - 1 && <tr className="allianz-about-history-spacer" aria-hidden="true">
                  <td>{'\u00a0'}</td><td>{'\u00a0'}</td><td>{'\u00a0'}</td>
                </tr>}
              </Fragment>)}
            </tbody></table>
            <p aria-hidden="true">{'\u00a0'}</p>
          </div>
        </div>
      </div>
    </div>
  </div>;
};
