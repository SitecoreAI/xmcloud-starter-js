'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { collectionsComplete } from 'lib/collection-completeness';
import { productTypeChoiceFields } from './product-type-choices-fields.props';
import type { ProductTypeChoicesProps } from './product-type-choices.props';

/** Captured annuities product choice design: two white cards on blue. */
export const Default = ({ fields, params }: ProductTypeChoicesProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Product Type Choices" />;
  if (!Array.isArray(datasource.children?.results) || !collectionsComplete(datasource, true)) {
    return isEditing ? <div className="allianz-missing-data" role="status">
      Product Type Choices could not load every choice. Check the datasource child count and pagination before publishing.
    </div> : null;
  }
  const choices = datasource.children.results.map(productTypeChoiceFields);

  return <div className="l-container--full-width t-bg-blue-soft axlTileCollection allianz-product-type-choices"
    id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {isEditing && choices.length === 0 && <p role="status">Add a product type choice child item to this section.</p>}
      <div className="l-grid__row match-height-row u-padding-bottom-xl">
        {choices.map((choice) => <div key={choice.id} className="l-grid__column-medium-6">
          <article className="m-axlTile match-height -is--flipped tile--stackedImage -is--stacked t-bg-primary-white">
            <div className="tileContent u-text-left">
              <div className="tileSubGrid__content">
                <header>
                  <div className="tileHeading">
                    {shouldRenderTextField(choice.heading?.jsonValue, isEditing) &&
                      <Text field={choice.heading?.jsonValue} tag="h4" editable={isEditing} />}
                  </div>
                  <div className="tileSubHeading" aria-hidden="true" />
                </header>
                {shouldRenderTextField(choice.body?.jsonValue, isEditing) &&
                  <RichText field={choice.body?.jsonValue} editable={isEditing} className="tileBody u-font-size-md" />}
                {shouldRenderLinkField(choice.link?.jsonValue, isEditing) &&
                  <footer><div className="tileLink">
                    <Link field={allianzLinkField(choice.link?.jsonValue, isEditing)}
                      editable={isEditing} className="a-link" aria-label={choice.link?.jsonValue?.value?.text}>
                      <span className="a-link__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet">
                          <path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536" />
                        </svg>
                      </span>
                      <span className="a-link__text">{choice.link?.jsonValue?.value?.text}</span>
                    </Link>
                  </div></footer>}
              </div>
            </div>
            {shouldRenderImageField(choice.image?.jsonValue, isEditing) &&
              <div className="tileImage"><picture className="c-image c-teaser__image">
                <Image field={choice.image?.jsonValue} editable={isEditing} className="c-image__img c-teaser__image-img" />
              </picture></div>}
          </article>
        </div>)}
      </div>
    </div>
  </div>;
};
