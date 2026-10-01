'use client';

import { Image, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { RetirementSolutionsIntroProps } from './retirement-solutions-intro.props';
import './RetirementSolutionsIntro.css';

/** Home's retirement solutions introduction has three fields and a fixed design. */
export const Default = ({ fields, params }: RetirementSolutionsIntroProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Retirement Solutions Intro" />;

  const heading = datasource.heading?.jsonValue;
  const body = datasource.body?.jsonValue;
  const icon = datasource.icon?.jsonValue;

  return (
    <div
      className="l-container--full-width t-bg-blue-soft axlTileCollection allianz-retirement-solutions-intro"
      id={params?.RenderingIdentifier}
    >
      <div className="l-grid l-grid--max-width">
        {params?.RenderingIdentifier !== 'solutions' && <span id="solutions" />}
        <div className="l-grid__row">
          <div className="l-grid__column-medium-12">
            <article className="m-axlTile match-height -is--stacked t-bg-transparent">
              <div className="tileContent u-text-center">
                {shouldRenderImageField(icon, isEditing) && (
                  <div className="tileSubGrid__image">
                    <div className="tileIcon t-bg-transparent t-icon-primary-black">
                      <Image field={icon} editable={isEditing} />
                    </div>
                  </div>
                )}
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
