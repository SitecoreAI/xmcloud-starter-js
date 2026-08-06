import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductListingNwnResources } from '@/components/product-listing/ProductListingNwnResources.dev';
import { mockProductListingProps } from './product-listing.mock.props';

jest.mock('lucide-react', () => ({
  ArrowRight: (props: React.HTMLAttributes<HTMLSpanElement>) => (
    <span {...props} />
  ),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({
    field,
    tag = 'span',
    ...props
  }: {
    field?: { value?: string };
    tag?: string;
  }) => React.createElement(tag, props, field?.value || ''),
  Link: ({
    field,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    field?: { value?: { href?: string; text?: string } };
    children?: React.ReactNode;
  }) => (
    <a href={field?.value?.href} {...props}>
      {children || field?.value?.text || ''}
    </a>
  ),
}));

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  Default: ({
    image,
  }: {
    image: { value?: { src?: string; alt?: string } };
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image?.value?.src} alt={image?.value?.alt || ''} />
  ),
}));

describe('ProductListingNwnResources', () => {
  it('replaces legacy product content with NW Natural resource cards', () => {
    render(<ProductListingNwnResources {...mockProductListingProps} />);

    expect(
      screen.getByRole('heading', { name: 'More ways NW Natural can help.' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Explore Our Emergency Vehicle Fleet'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Explore rebates and offers/ }),
    ).toHaveAttribute('href', '/ways-to-save/rebates-offers');
    expect(
      screen.getByRole('link', { name: /Discover cooking with gas/ }),
    ).toHaveAttribute('href', '/get-natural-gas/cooking');
    expect(
      screen.getByRole('link', { name: /Review natural gas safety/ }),
    ).toHaveAttribute('href', '/safety/smell-natural-gas');
  });

  it('uses the NW Natural cards when no authored resources are selected', () => {
    const emptyProps = {
      ...mockProductListingProps,
      fields: {
        data: {
          datasource: {
            ...mockProductListingProps.fields.data.datasource,
            title: { jsonValue: { value: 'Customer resources' } },
            products: { targetItems: [] },
          },
        },
      },
    };

    render(<ProductListingNwnResources {...emptyProps} />);

    expect(
      screen.getByRole('heading', { name: 'Customer resources' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Rebates that reward efficiency' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Safety comes first' }),
    ).toBeInTheDocument();
  });

  it('renders valid authored resource fields and the authored view-all link', () => {
    const authoredProps = {
      ...mockProductListingProps,
      fields: {
        data: {
          datasource: {
            title: {
              jsonValue: { value: 'Resources selected for your home' },
            },
            viewAllLink: {
              jsonValue: {
                value: {
                  href: '/services',
                  text: 'View all home services',
                  linktype: 'internal',
                  target: '',
                },
              },
            },
            products: {
              targetItems: [
                {
                  id: 'resource-one',
                  productName: {
                    jsonValue: { value: 'Prepare your equipment for winter' },
                  },
                  pageThumbnail: {
                    jsonValue: {
                      value: {
                        src: '/assets/nwn-images/services-gas-fireplace-tune-up-landscape.png',
                        alt: 'Technician checking a home fireplace',
                      },
                    },
                  },
                  productFeatureText: {
                    jsonValue: {
                      value:
                        'Learn what to expect from an inspection or tune-up.',
                    },
                  },
                  url: {
                    jsonValue: {
                      value: {
                        href: '/services/inspections-tune-ups',
                        text: 'Explore inspections and tune-ups',
                        linktype: 'internal',
                        target: '',
                      },
                    },
                  },
                },
                {
                  id: 'resource-two',
                  productFeatureTitle: {
                    jsonValue: { value: 'Plan an efficient upgrade' },
                  },
                  productFeatureText: {
                    jsonValue: {
                      value: 'Review rebates before choosing new equipment.',
                    },
                  },
                  productThumbnail: {
                    jsonValue: {
                      value: {
                        src: '/assets/nwn-images/rebates-high-efficiency-furnace-landscape.png',
                        alt: 'Technician inspecting a home furnace',
                      },
                    },
                  },
                  url: { path: '/ways-to-save/rebates-offers' },
                },
              ],
            },
          },
        },
      },
    };

    render(<ProductListingNwnResources {...authoredProps} />);

    expect(
      screen.getByRole('heading', {
        name: 'Resources selected for your home',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Prepare your equipment for winter',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Learn what to expect from an inspection or tune-up.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Technician checking a home fireplace',
      }),
    ).toHaveAttribute(
      'src',
      '/assets/nwn-images/services-gas-fireplace-tune-up-landscape.png',
    );
    expect(
      screen.getByRole('link', {
        name: /Explore inspections and tune-ups/,
      }),
    ).toHaveAttribute('href', '/services/inspections-tune-ups');
    expect(
      screen.getByRole('link', {
        name: /Learn more about Plan an efficient upgrade/,
      }),
    ).toHaveAttribute('href', '/ways-to-save/rebates-offers');
    expect(
      screen.getByRole('link', { name: /View all home services/ }),
    ).toHaveAttribute('href', '/services');
    expect(
      screen.queryByRole('heading', {
        name: 'Rebates that reward efficiency',
      }),
    ).not.toBeInTheDocument();
  });

  it('keeps valid authored resources when a legacy item is also selected', () => {
    const mixedProps = {
      ...mockProductListingProps,
      fields: {
        data: {
          datasource: {
            ...mockProductListingProps.fields.data.datasource,
            title: { jsonValue: { value: 'Helpful customer resources' } },
            products: {
              targetItems: [
                mockProductListingProps.fields.data.datasource.products!
                  .targetItems[0],
                {
                  id: 'valid-resource',
                  productName: {
                    jsonValue: { value: 'Natural gas safety' },
                  },
                  productFeatureText: {
                    jsonValue: {
                      value:
                        'Know the steps to take when something smells wrong.',
                    },
                  },
                  url: { path: '/safety/smell-natural-gas' },
                },
              ],
            },
          },
        },
      },
    };

    render(<ProductListingNwnResources {...mixedProps} />);

    expect(
      screen.getByRole('heading', { name: 'Natural gas safety' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Alaris Type I Ambulance'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: 'Rebates that reward efficiency',
      }),
    ).not.toBeInTheDocument();
  });
});
