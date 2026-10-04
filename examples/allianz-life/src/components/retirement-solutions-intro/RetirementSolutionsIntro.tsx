'use client';

import { Image, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { RetirementSolutionsIntroProps } from './retirement-solutions-intro.props';
import './RetirementSolutionsIntro.css';

function RetirementSolutionsIntro({ fields, params, appearance = 'home' }: RetirementSolutionsIntroProps & { appearance?: 'home' | 'white' | 'portfolio' }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Retirement Solutions Intro" />;

  const heading = datasource.heading?.jsonValue;
  const body = datasource.body?.jsonValue;
  const icon = datasource.icon?.jsonValue;
  const isHome = appearance === 'home';
  const iconContent = shouldRenderImageField(icon, isEditing) && (
    <div className="tileIcon t-bg-transparent t-icon-primary-black">
      <Image field={icon} editable={isEditing} />
    </div>
  );
  const headingContent = shouldRenderTextField(heading, isEditing) && (
    <div className="tileHeading">
      <Text field={heading} tag="h2" editable={isEditing} />
    </div>
  );
  const bodyContent = shouldRenderTextField(body, isEditing) && (
    <RichText field={body} editable={isEditing} className={isHome ? 'tileBody u-font-size-xl' : 'tileBody'} />
  );

  return (
    <div
      className={`l-container--full-width t-bg-${appearance === 'white' ? 'transparent' : 'blue-soft'} axlTileCollection allianz-retirement-solutions-intro`}
      id={params?.RenderingIdentifier}
    >
      <div className="l-grid l-grid--max-width">
        {isHome && params?.RenderingIdentifier !== 'solutions' && <span id="solutions" />}
        <div className={isHome ? 'l-grid__row' : 'l-grid__row u-margin-bottom-lg u-padding-top-lg'}>
          <div className="l-grid__column-medium-12">
            <article className={isHome ? 'm-axlTile match-height -is--stacked t-bg-transparent' : 'm-axlIntroductionBlock -is--stacked -no--image'}>
              <div className="tileContent u-text-center">
                {isHome ? <>
                  {iconContent && <div className="tileSubGrid__image">{iconContent}</div>}
                  <div className="tileSubGrid__content">
                    {headingContent && <header>{headingContent}</header>}
                    {bodyContent}
                  </div>
                </> : <>
                  {iconContent}
                  <header>
                    {headingContent || <div className="tileHeading" />}
                    <div className="tileSubHeading" />
                  </header>
                  {bodyContent}
                </>}
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Home's blue introduction retains its existing solutions anchor. */
export const Default = (props: RetirementSolutionsIntroProps) => <RetirementSolutionsIntro {...props} />;

/** FIA explained introduction uses the source's white IntroductionBlock scaffold. */
export const White = (props: RetirementSolutionsIntroProps) => <RetirementSolutionsIntro {...props} appearance="white" />;

/** FIA portfolio introduction uses the same native fields on the source's blue section. */
export const Portfolio = (props: RetirementSolutionsIntroProps) => <RetirementSolutionsIntro {...props} appearance="portfolio" />;
