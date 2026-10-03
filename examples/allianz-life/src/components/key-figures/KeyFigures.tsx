'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { completeKeyFigureChildren, keyFigureFields, type KeyFiguresProps } from './key-figures.props';

/** Fixed three-column statistic capsules with source typography and responsive grid. */
export const Default = ({ fields, params }: KeyFiguresProps) => {
  const { page } = useSitecore();
  const editing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Key Figures" />;
  const children = datasource.children;
  if (!completeKeyFigureChildren(children)) return <p role="status">The key figures are temporarily unavailable.</p>;
  const figures = children.results.map(keyFigureFields)
    .filter((item) => editing || shouldRenderTextField(item.figure?.jsonValue, false) || shouldRenderTextField(item.caption?.jsonValue, false));
  const rows = Array.from({ length: Math.ceil(figures.length / 3) }, (_, index) => figures.slice(index * 3, index * 3 + 3));
  return <section className="l-container--full-width t-bg-transparent axlTileCollection allianz-key-figures"
    id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">{rows.map((row) => <div className="l-grid__row match-height-row" key={row[0].id}>
      {row.map((item) => <div className="l-grid__column-medium-4" key={item.id}>
        <article className="m-axlTile match-height tile--alphaNumeric -is--stacked t-bg-transparent">
          <div className="tileContent u-text-center">
            {shouldRenderTextField(item.figure?.jsonValue, editing) && <div className="tileSubGrid__image">
              <div className="tileIcon -is--wide t-bg-primary-brand t-icon-primary-white">
                <Text field={item.figure?.jsonValue} tag="em" className="alphaType" editable={editing} />
              </div>
            </div>}
            <div className="tileSubGrid__content">
              <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
              {shouldRenderTextField(item.caption?.jsonValue, editing) &&
                <RichText field={item.caption?.jsonValue} className="tileBody u-font-size-lg" editable={editing} />}
            </div>
          </div>
        </article>
      </div>)}
    </div>)}</div>
  </section>;
};
