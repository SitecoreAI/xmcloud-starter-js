'use client';

import { Image, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderTextField } from 'lib/allianz-field-state';
import { collectionsComplete } from 'lib/collection-completeness';
import { productBenefitFields } from './product-benefits-fields.props';
import type { ProductBenefitsProps } from './product-benefits.props';
import './ProductBenefits.css';

const Benefits = ({ fields, params, variant }: ProductBenefitsProps & {
  variant: 'two-up' | 'two-up-final' | 'three-up';
}) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Product Benefits" />;
  if (!Array.isArray(datasource.children?.results) || !collectionsComplete(datasource, true)) {
    return isEditing ? <div className="allianz-missing-data" role="status">
      Product Benefits could not load every benefit. Check the datasource child count and pagination before publishing.
    </div> : null;
  }
  const benefits = datasource.children.results.map(productBenefitFields);
  const threeUp = variant === 'three-up';
  const finalRow = variant === 'two-up-final';

  return <div className={`${threeUp ? 'l-container--full-width' : 'l-container'}${finalRow ? ' u-row-spacing' : ''} t-bg-transparent axlTileCollection allianz-product-benefits`}
    id={params?.RenderingIdentifier}>
    <div className={`l-grid l-grid--max-width${threeUp ? '' : ' l-grid--no-gutters-outer'}`}>
      {isEditing && benefits.length === 0 && <p role="status">Add a benefit child item to this section.</p>}
      <div className={`l-grid__row match-height-row${finalRow ? ' u-margin-bottom-xl' : ''}`}>
        {benefits.map((benefit) => <div key={benefit.id}
          className={threeUp ? 'l-grid__column-medium-4' : 'l-grid__column-medium-6'}>
          <article className="m-axlTile match-height -is--stacked t-bg-transparent">
            <div className="tileContent u-text-center">
              {shouldRenderImageField(benefit.icon?.jsonValue, isEditing) &&
                <div className="tileSubGrid__image">
                  <div className="tileIcon t-bg-transparent t-icon-primary-black">
                    <Image field={benefit.icon?.jsonValue} editable={isEditing} />
                  </div>
                </div>}
              <div className="tileSubGrid__content">
                <header>
                  <div className="tileHeading">
                    {shouldRenderTextField(benefit.heading?.jsonValue, isEditing) &&
                      <Text field={benefit.heading?.jsonValue} tag={threeUp ? 'h3' : 'h4'} editable={isEditing} />}
                  </div>
                  <div className="tileSubHeading" aria-hidden="true" />
                </header>
                {shouldRenderTextField(benefit.body?.jsonValue, isEditing) &&
                  <RichText field={benefit.body?.jsonValue} editable={isEditing} className="tileBody u-font-size-md" />}
              </div>
            </div>
          </article>
        </div>)}
      </div>
    </div>
  </div>;
};

/** First annuities benefit row: transparent, centered h4, two columns. */
export const TwoUp = (props: ProductBenefitsProps) => <Benefits {...props} variant="two-up" />;
export const Default = TwoUp;
/** Second annuities benefit row retains its fixed source spacing. */
export const TwoUpFinal = (props: ProductBenefitsProps) => <Benefits {...props} variant="two-up-final" />;
/** FIA/RILA benefit rows use the captured full-width three-column h3 design. */
export const ThreeUp = (props: ProductBenefitsProps) => <Benefits {...props} variant="three-up" />;
