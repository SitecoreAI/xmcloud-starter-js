'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import type { ProductIntroductionProps } from './product-introduction.props';

function ProductIntroduction({ fields, params, blue = false }: ProductIntroductionProps & { blue?: boolean }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Product Introduction" />;
  const heading = datasource.heading?.jsonValue;
  const body = datasource.body?.jsonValue;

  return (
    <div className={`l-container--full-width ${blue ? 't-bg-blue-soft' : 't-bg-transparent'} axlTileCollection`}
      id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row">
          <div className="l-grid__column-medium-12">
            <article className="m-axlTile match-height -is--stacked t-bg-transparent">
              <div className="tileContent u-text-center">
                <div className="tileSubGrid__content">
                  {shouldRenderTextField(heading, isEditing) && (
                    <header><div className="tileHeading">
                      <Text field={heading} editable={isEditing} tag="h2" />
                    </div></header>
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
}

/** White introduction used by the source's "What is an annuity?" section. */
export const Default = (props: ProductIntroductionProps) => <ProductIntroduction {...props} />;
/** Blue introduction used by the source's "Explore our annuities" section. */
export const Blue = (props: ProductIntroductionProps) => <ProductIntroduction {...props} blue />;

/** Product-group introduction: source H3 and spacing, using the same native fields. */
export const ProductGroup = ({ fields, params }: ProductIntroductionProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Product Introduction" />;
  const heading = datasource.heading?.jsonValue;
  const body = datasource.body?.jsonValue;

  return (
    <div className="l-container--full-width t-bg-blue-soft" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
          <div className="l-grid__column-medium-12">
            <article className="m-axlIntroductionBlock -is--stacked -no--image">
              <div className="tileContent u-text-center">
                <header>
                  <div className="tileHeading">
                    {shouldRenderTextField(heading, isEditing) && <Text field={heading} editable={isEditing} tag="h3" />}
                  </div>
                  <div className="tileSubHeading" />
                </header>
                {shouldRenderTextField(body, isEditing)
                  ? <RichText field={body} editable={isEditing} className="tileBody" />
                  : <div className="tileBody" />}
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
};
