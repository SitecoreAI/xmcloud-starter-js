import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Default as ProductListing,
  ThreeUp,
  Slider,
  NwnResources,
} from '@/components/product-listing/ProductListing';
import { mockProductListingProps } from './product-listing.mock.props';

// Mock Sitecore SDK
jest.mock('@sitecore-content-sdk/nextjs', () => ({
  useSitecore: jest.fn(() => ({
    page: {
      mode: {
        isEditing: false,
        isPreview: false,
        isNormal: true,
      },
    },
  })),
}));

// Mock child components
jest.mock('@/components/product-listing/ProductListingDefault.dev', () => ({
  ProductListingDefault: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="product-listing-default">
      ProductListingDefault - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock('@/components/product-listing/ProductListingThreeUp.dev', () => ({
  ProductListingThreeUp: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="product-listing-three-up">
      ProductListingThreeUp - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock('@/components/product-listing/ProductListingSlider.dev', () => ({
  ProductListingSlider: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="product-listing-slider">
      ProductListingSlider - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock(
  '@/components/product-listing/ProductListingNwnResources.dev',
  () => ({
    ProductListingNwnResources: ({
      isPageEditing,
    }: {
      isPageEditing: boolean;
    }) => (
      <section data-testid="product-listing-nwn-resources">
        ProductListingNwnResources - {isPageEditing ? 'Editing' : 'Normal'}
      </section>
    ),
  }),
);

describe('ProductListing', () => {
  it('renders Default variant correctly', () => {
    render(<ProductListing {...mockProductListingProps} />);
    expect(
      screen.getByTestId('product-listing-nwn-resources'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ProductListingNwnResources - Normal/),
    ).toBeInTheDocument();
  });

  it('renders ThreeUp variant correctly', () => {
    render(<ThreeUp {...mockProductListingProps} />);
    expect(screen.getByTestId('product-listing-three-up')).toBeInTheDocument();
    expect(
      screen.getByText(/ProductListingThreeUp - Normal/),
    ).toBeInTheDocument();
  });

  it('renders Slider variant correctly', () => {
    render(<Slider {...mockProductListingProps} />);
    expect(screen.getByTestId('product-listing-slider')).toBeInTheDocument();
    expect(
      screen.getByText(/ProductListingSlider - Normal/),
    ).toBeInTheDocument();
  });

  it('renders the named NW Natural resources variant correctly', () => {
    render(<NwnResources {...mockProductListingProps} />);
    expect(
      screen.getByTestId('product-listing-nwn-resources'),
    ).toBeInTheDocument();
  });
});
