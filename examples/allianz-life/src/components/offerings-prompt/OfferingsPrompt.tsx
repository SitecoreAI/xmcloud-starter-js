'use client';

import { Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField } from 'lib/allianz-field-state';
import { AllianzFieldIcon } from 'lib/allianz-field-icon';
import { offeringsPromptFields, type OfferingsPromptProps } from './offerings-prompt.props';
import './OfferingsPrompt.css';

const hasBlockMarkup = (value?: string) => /<(?:div|h[1-6]|p|ul|ol|blockquote)\b/i.test(value ?? '');

/** One fixed green introduction and a primary button; no layout or style selectors. */
export const Default = ({ fields, params }: OfferingsPromptProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  if (!fields?.data?.datasource) return <NoDataFallback componentName="Offerings Prompt" />;
  const source = offeringsPromptFields(fields.data.datasource);
  return <div className="l-container--full-width t-bg-green-soft axlTileCollection allianz-offerings-prompt" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          {shouldRenderImageField(source.icon?.jsonValue, isEditing) &&
            <div className="tileIcon t-bg-primary-brand t-icon-primary-white"><AllianzFieldIcon field={source.icon?.jsonValue} /></div>}
          <header><div className="tileHeading"><Text field={source.heading?.jsonValue} tag="h2" editable={isEditing} /></div>
            <div className="tileSubHeading"><RichText field={source.body?.jsonValue} editable={isEditing}
              tag={hasBlockMarkup(source.body?.jsonValue?.value) ? 'div' : 'h5'} /></div>
          </header>
          {shouldRenderLinkField(source.link?.jsonValue, isEditing) && <footer><div className="tileLink">
            <Link field={allianzLinkField(source.link?.jsonValue, isEditing)} editable={isEditing}
              renderChildrenWhenEmpty={isEditing} className="m-axlButton m-axlButton--primary" />
          </div></footer>}
        </div></article>
      </div></div>
    </div>
  </div>;
};
