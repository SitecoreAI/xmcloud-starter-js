'use client';
import type React from 'react';
import type { ProductListingProps } from './product-listing.props';
import { ProductListingDefault } from './ProductListingDefault.dev';
import { ProductListingThreeUp } from './ProductListingThreeUp.dev';
import { ProductListingSlider } from './ProductListingSlider.dev';

// Data source checks are done in the child components
const shouldHideEmptyListing = (
  props: ProductListingProps,
  isEditing: boolean,
) => {
  const datasource = props.fields?.data?.datasource;
  const products = datasource?.products?.targetItems;

  return (
    Boolean(datasource) && !isEditing && (!products || products.length === 0)
  );
};

// Default display of the component
export const Default: React.FC<ProductListingProps> = (props) => {
  const { isEditing } = props.page.mode;

  if (shouldHideEmptyListing(props, isEditing)) {
    return null;
  }

  return <ProductListingDefault {...props} isPageEditing={isEditing} />;
};

// Variants
export const ThreeUp: React.FC<ProductListingProps> = (props) => {
  const { isEditing } = props.page.mode;

  if (shouldHideEmptyListing(props, isEditing)) {
    return null;
  }

  return <ProductListingThreeUp {...props} isPageEditing={isEditing} />;
};

// Variants
export const Slider: React.FC<ProductListingProps> = (props) => {
  const { isEditing } = props.page.mode;

  if (shouldHideEmptyListing(props, isEditing)) {
    return null;
  }

  return <ProductListingSlider {...props} isPageEditing={isEditing} />;
};
