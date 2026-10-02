'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import type { PressReleaseProps } from './press-release.props';
import './PressRelease.css';

/** Fixed newsroom design: an introduction column followed by an editorial column. */
export const Default = ({ fields, params }: PressReleaseProps) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Press Release" />;

  const title = data.title?.jsonValue;
  const summary = data.summary?.jsonValue;
  const body = data.body?.jsonValue;

  return (
    <div className="component press-release l-container" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width l-grid--no-gutters">
        <div className="l-grid__row u-margin-bottom-xl">
          <div className="l-grid__column-medium-12">
            <article className="m-azlIntroductionBlock -is--stacked -no--image">
              <div className="tileContent u-text-left">
                <header>
                  <div className="tileHeading">
                    {shouldRenderTextField(title, editable) && (
                      <Text tag="h1" field={title} editable={editable} />
                    )}
                  </div>
                  {shouldRenderTextField(summary, editable)
                    ? <RichText className="tileSubHeading" field={summary} editable={editable} />
                    : <div className="tileSubHeading" />}
                </header>
              </div>
            </article>
          </div>
          {shouldRenderTextField(body, editable)
            ? <RichText className="l-grid__column-medium-12" field={body} editable={editable} />
            : <div className="l-grid__column-medium-12" />}
        </div>
      </div>
    </div>
  );
};
