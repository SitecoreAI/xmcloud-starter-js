'use client';

import { Image, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { iconCardFields } from 'lib/icon-card-fields';
import type { IconCardsProps } from './icon-cards.props';
import './IconCards.css';

/** A fixed three-column icon and text collection, captured on the About page. */
export const Default = ({ fields, params }: IconCardsProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Icon Cards" />;
  const cards = (datasource.children?.results ?? []).map(iconCardFields);
  // Keep the capture's independent row-height groups, including on small screens.
  const rows = Array.from({ length: Math.ceil(cards.length / 3) }, (_, index) =>
    cards.slice(index * 3, index * 3 + 3));

  return <div className="l-container--full-width t-bg-transparent axlTileCollection allianz-icon-cards"
    id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {shouldRenderTextField(datasource.title?.jsonValue, isEditing) &&
        <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
          <div className="l-grid__column-medium-12">
            <article className="m-axlIntroductionBlock -is--stacked -no--image">
              <div className="tileContent u-text-center">
                <header><div className="tileHeading">
                  <Text field={datasource.title?.jsonValue} tag="h2" editable={isEditing} />
                </div></header>
              </div>
            </article>
          </div>
        </div>}
      {rows.map((row) => <div key={row[0].id} className="l-grid__row match-height-row">
        {row.map((card) => <div key={card.id} className="l-grid__column-medium-4">
          <article className="m-axlTile match-height -is--stacked t-bg-transparent">
            <div className="tileContent u-text-center">
              <div className="tileSubGrid__image">
                <div className="tileIcon t-bg-transparent t-icon-primary-black">
                  <Image field={card.icon?.jsonValue} editable={isEditing} />
                </div>
              </div>
              <div className="tileSubGrid__content">
                <header><div className="tileHeading">
                  <Text field={card.title?.jsonValue} tag="h3" editable={isEditing} />
                </div></header>
                <RichText field={card.text?.jsonValue} editable={isEditing}
                  className="tileBody u-font-size-lg" />
              </div>
            </div>
          </article>
        </div>)}
      </div>)}
    </div>
  </div>;
};

/** About's fixed UI glyphs leave native Icon fields unused and untouched. */
export const AboutFacts = ({ fields, params }: IconCardsProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Icon Cards" />;
  const cards = (datasource.children?.results ?? []).map((card) =>
    Array.isArray(card.fieldCollection) ? iconCardFields({ id: card.id,
      fieldCollection: card.fieldCollection.filter((field) => typeof field?.name === 'string' &&
        ['title', 'text', 'heading', 'body'].includes(field.name.toLowerCase())) }) : iconCardFields(card));
  if (cards.length !== 6) return <NoDataFallback componentName="Icon Cards" />;
  const glyphs = ['heart', 'receive', 'minnesota', 'portfolio', 'game', 'detailed-globe'] as const;
  const glyphLabels = ['Heart', 'Receive', 'Minnesota', 'Portfolio', 'Game', 'titleIconDetailedGlobe'] as const;
  const rows = [cards.slice(0, 3), cards.slice(3, 6)];
  return <div className="l-container--full-width t-bg-transparent axlTileCollection allianz-icon-cards allianz-about-facts"
    id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {shouldRenderTextField(datasource.title?.jsonValue, isEditing) &&
        <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
          <div className="l-grid__column-medium-12">
            <article className="m-axlIntroductionBlock -is--stacked -no--image">
              <div className="tileContent u-text-center">
                <header><div className="tileHeading">
                  <Text field={datasource.title?.jsonValue} tag="h2" editable={isEditing} />
                </div><div className="tileSubHeading" /></header>
              </div>
            </article>
          </div>
        </div>}
      {rows.map((row, rowIndex) => <div key={row[0].id} className="l-grid__row match-height-row">
        {row.map((card, columnIndex) => <div key={card.id} className="l-grid__column-medium-4">
          <article className="m-axlTile match-height -is--stacked t-bg-transparent">
            <div className="tileContent u-text-center">
              <div className="tileSubGrid__image">
                <div className="tileIcon t-bg-transparent t-icon-primary-black">
                  {/* The original source UI SVG is fixed presentation, not a native Image field. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="allianz-about-fact-glyph" src={`/allianz-ui/about-overview/${glyphs[rowIndex * 3 + columnIndex]}.svg`}
                    alt={glyphLabels[rowIndex * 3 + columnIndex]} width="24" height="24" />
                </div>
              </div>
              <div className="tileSubGrid__content">
                <header><div className="tileHeading">
                  {shouldRenderTextField(card.title?.jsonValue, isEditing) &&
                    <Text field={card.title?.jsonValue} tag="h3" editable={isEditing} />}
                </div><div className="tileSubHeading" /></header>
                {shouldRenderTextField(card.text?.jsonValue, isEditing) &&
                  <RichText field={card.text?.jsonValue} editable={isEditing} className="tileBody u-font-size-lg" />}
              </div>
            </div>
          </article>
        </div>)}
      </div>)}
    </div>
  </div>;
};
