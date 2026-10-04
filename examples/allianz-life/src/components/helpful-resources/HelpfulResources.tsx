'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { helpfulResourceFields } from 'lib/helpful-resource-fields';
import type { HelpfulResourcesProps } from './helpful-resources.props';
import './HelpfulResources.css';

function HelpfulResources({ fields, params, isGreen = false }: HelpfulResourcesProps & { isGreen?: boolean }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Helpful Resources" />;
  const resources = (datasource.children?.results ?? []).map(helpfulResourceFields);
  const hasTitle = shouldRenderTextField(datasource.title?.jsonValue, isEditing);
  const hasGreenIcon = isGreen && shouldRenderImageField(datasource.icon?.jsonValue, isEditing);

  return <div className={`l-container--full-width t-bg-${isGreen ? 'green-soft' : 'blue-soft'} allianz-helpful-resources`}
    id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {(hasTitle || hasGreenIcon) &&
        <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
          <div className="l-grid__column-medium-12">
            <article className="m-axlIntroductionBlock -is--stacked -no--image">
              <div className="tileContent u-text-center">
                {hasGreenIcon && <div className="tileIcon t-bg-primary-brand t-icon-primary-white">
                  <Image field={datasource.icon?.jsonValue} editable={isEditing} />
                </div>}
                <header><div className="tileHeading">
                  {hasTitle && <Text field={datasource.title?.jsonValue} tag="h2" editable={isEditing} />}
                </div>{isGreen && <div className="tileSubHeading" />}</header>
              </div>
            </article>
          </div>
        </div>}
      {isEditing && resources.length === 0 && <p role="status" className="allianz-helpful-resources-empty">
        Add a helpful resource to this section.
      </p>}
      <div className="l-grid__row">
        <div className="l-grid__column-medium-12">
          <div className="o-cards o-cards__col3">
            {resources.map((resource) => {
              const content = <>
                {shouldRenderImageField(resource.image?.jsonValue, isEditing) &&
                  <div className="m-card__image"><picture className="c-image">
                    <Image field={resource.image?.jsonValue} editable={isEditing}
                      className="c-image__img c-teaser__image-img" />
                  </picture></div>}
                <div className="m-card__header">
                  <Text field={resource.title?.jsonValue} tag="h4" editable={isEditing} />
                </div>
                <RichText field={resource.text?.jsonValue} editable={isEditing} className="m-card__body" />
              </>;
              return shouldRenderLinkField(resource.link?.jsonValue, isEditing)
                ? <Link key={resource.id} field={allianzLinkField(resource.link?.jsonValue, isEditing)}
                    editable={isEditing} renderChildrenWhenEmpty={isEditing} className="m-card">{content}</Link>
                : <article key={resource.id} className="m-card">{content}</article>;
            })}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

/** The homepage resource collection retains its blue section and card design. */
export const Default = (props: HelpfulResourcesProps) => <HelpfulResources {...props} />;

/** Green resource collection used by the source's Explore further section. */
export const Green = (props: HelpfulResourcesProps) => <HelpfulResources {...props} isGreen />;
