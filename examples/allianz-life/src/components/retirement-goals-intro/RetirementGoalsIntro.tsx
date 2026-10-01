'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import type { RetirementGoalsIntroProps } from './retirement-goals-intro.props';

/** Home's retirement goals introduction preserves its source tile and typography. */
export const Default = ({ fields, params }: RetirementGoalsIntroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Retirement Goals Intro" />;

  const heading = datasource.heading?.jsonValue;
  const body = datasource.body?.jsonValue;

  return (
    <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row">
          <div className="l-grid__column-medium-12">
            <article className="m-axlTile match-height -is--stacked t-bg-transparent">
              <div className="tileContent u-text-center">
                <div className="tileSubGrid__content">
                  {shouldRenderTextField(heading, isEditing) && (
                    <header>
                      <div className="tileHeading">
                        <Text field={heading} tag="h2" editable={isEditing} />
                      </div>
                    </header>
                  )}
                  {shouldRenderTextField(body, isEditing) && (
                    <RichText field={body} editable={isEditing} className="tileBody u-font-size-xl" />
                  )}
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
};
