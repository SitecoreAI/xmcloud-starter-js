import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductListingNwnResources } from '@/components/product-listing/ProductListingNwnResources.dev';
import type {
  ProductItemProps,
  ProductListingProps,
} from '@/components/product-listing/product-listing.props';
import { nwnImageSources } from '@/lib/nwn-static-assets';
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

const createProps = (
  targetItems: ProductItemProps[],
  datasourceOverrides: Partial<
    ProductListingProps['fields']['data']['datasource']
  > = {},
): ProductListingProps => ({
  ...mockProductListingProps,
  fields: {
    data: {
      datasource: {
        ...mockProductListingProps.fields.data.datasource,
        title: { jsonValue: { value: 'Helpful NW Natural resources' } },
        ...datasourceOverrides,
        products: { targetItems },
      },
    },
  },
});

describe('ProductListingNwnResources', () => {
  it('keeps missing-datasource guidance exclusive to Page Builder', () => {
    const { container, rerender } = render(
      <ProductListingNwnResources
        {...mockProductListingProps}
        fields={undefined as never}
      />,
    );

    expect(container).toBeEmptyDOMElement();

    rerender(
      <ProductListingNwnResources
        {...mockProductListingProps}
        fields={undefined as never}
        isPageEditing
      />,
    );

    expect(screen.getByTestId('no-data-fallback')).toHaveTextContent(
      'No data for ProductListing',
    );
  });

  it('renders selected generic Detail Pages and canonical NW Natural routes', () => {
    const genericPages: ProductItemProps[] = [
      {
        id: 'rebates',
        pageShortTitle: { jsonValue: { value: 'Rebates and offers' } },
        pageTitle: {
          jsonValue: { value: 'Comfort upgrades can come with extra value.' },
        },
        pageSummary: {
          jsonValue: {
            value: 'Explore current opportunities for qualifying equipment.',
          },
        },
        pageSubtitle: {
          jsonValue: { value: 'This lower-priority subtitle is not shown.' },
        },
        route: {
          path: '/utilities/kit-nextjs-nwn/Home/Ways-To-Save/Rebates-Offers/',
        },
      },
      {
        id: 'cooking',
        pageTitle: {
          jsonValue: { value: 'Cook with confidence and responsive heat.' },
        },
        pageSubtitle: {
          jsonValue: {
            value: 'Direct flame puts visible control at your fingertips.',
          },
        },
        route: {
          path: 'https://preview.example/Get-Natural-Gas/Cooking?sc_lang=en',
        },
      },
      {
        id: 'smell-gas',
        pageTitle: { jsonValue: { value: 'Smell. Go. Let us know.' } },
        pageSummary: {
          jsonValue: {
            value: 'Leave immediately and call from a safe location.',
          },
        },
        route: { path: '/safety/smell-natural-gas#steps' },
      },
    ];

    render(<ProductListingNwnResources {...createProps(genericPages)} />);

    expect(
      screen.getByRole('heading', { name: 'Rebates and offers' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Explore current opportunities for qualifying equipment.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Cook with confidence and responsive heat.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Smell. Go. Let us know.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Learn more about Rebates and offers/ }),
    ).toHaveAttribute('href', '/ways-to-save/rebates-offers');
    expect(
      screen.getByRole('link', {
        name: /Learn more about Cook with confidence and responsive heat/,
      }),
    ).toHaveAttribute('href', '/get-natural-gas/cooking');
    expect(
      screen.getByRole('link', {
        name: /Learn more about Smell. Go. Let us know/,
      }),
    ).toHaveAttribute('href', '/safety/smell-natural-gas');
    expect(
      screen.getByRole('img', { name: 'Rebates and offers' }),
    ).toHaveAttribute('src', nwnImageSources.rebatesFurnace);
    expect(
      screen.queryByText('Rebates that reward efficiency'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Safety comes first')).not.toBeInTheDocument();
  });

  it('uses an authored DAM pageThumbnail instead of the known-route fallback', () => {
    render(
      <ProductListingNwnResources
        {...createProps([
          {
            id: 'rebates-with-dam-image',
            pageTitle: { jsonValue: { value: 'Current customer rebates' } },
            pageSummary: {
              jsonValue: { value: 'See available efficiency opportunities.' },
            },
            pageThumbnail: {
              jsonValue: {
                value: {
                  src: 'https://dam.example/rebates-card.jpg',
                  alt: 'High-efficiency furnace installed in a home',
                },
              },
            },
            route: { path: '/ways-to-save/rebates-offers' },
          },
        ])}
      />,
    );

    expect(
      screen.getByRole('img', {
        name: 'High-efficiency furnace installed in a home',
      }),
    ).toHaveAttribute('src', 'https://dam.example/rebates-card.jpg');
    expect(
      screen.queryByRole('img', { name: 'Current customer rebates' }),
    ).not.toBeInTheDocument();
  });

  it('prefers authored SimplePromo card fields over generic page fields', () => {
    render(
      <ProductListingNwnResources
        {...createProps([
          {
            id: 'authored-card',
            cardTitle: { jsonValue: { value: 'Authored card heading' } },
            cardDescription: {
              jsonValue: { value: 'Authored card description.' },
            },
            cardImage: {
              jsonValue: {
                value: {
                  src: 'https://dam.example/authored-card.jpg',
                  alt: 'Authored card image',
                },
              },
            },
            cardLink: {
              jsonValue: {
                value: {
                  href: '/Get-Natural-Gas/Cooking/',
                  text: 'Explore natural gas cooking',
                  linktype: 'internal',
                },
              },
            },
            pageTitle: { jsonValue: { value: 'Lower priority page title' } },
            pageSummary: {
              jsonValue: { value: 'Lower priority page summary.' },
            },
            route: { path: '/lower-priority-route' },
          },
        ])}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Authored card heading' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Authored card description.')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Authored card image' }),
    ).toHaveAttribute('src', 'https://dam.example/authored-card.jpg');
    expect(
      screen.getByRole('link', { name: /Explore natural gas cooking/ }),
    ).toHaveAttribute('href', '/get-natural-gas/cooking');
    expect(
      screen.queryByText('Lower priority page title'),
    ).not.toBeInTheDocument();
  });

  it('rejects legacy selected items and never fabricates fallback cards', () => {
    const { container, rerender } = render(
      <ProductListingNwnResources
        {...createProps([
          mockProductListingProps.fields.data.datasource.products!
            .targetItems[0],
        ])}
      />,
    );

    expect(
      screen.queryByText('Alaris Type I Ambulance'),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll('article')).toHaveLength(0);

    rerender(<ProductListingNwnResources {...createProps([])} />);

    expect(container.querySelectorAll('article')).toHaveLength(0);
    expect(
      screen.queryByText('Rebates that reward efficiency'),
    ).not.toBeInTheDocument();
  });

  it('retains the non-legacy vehicle-field contract for backward compatibility', () => {
    render(
      <ProductListingNwnResources
        {...createProps([
          {
            id: 'legacy-contract-resource',
            productName: {
              jsonValue: { value: 'Natural gas equipment support' },
            },
            productFeatureText: {
              jsonValue: { value: 'Get help with qualified home equipment.' },
            },
            productThumbnail: {
              jsonValue: {
                value: {
                  src: '/assets/nwn-images/services-technician-arrival-landscape.png',
                  alt: 'NW Natural technician arriving at a home',
                },
              },
            },
            url: { path: '/services' },
          },
        ])}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Natural gas equipment support' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /Learn more about Natural gas equipment support/,
      }),
    ).toHaveAttribute('href', '/services');
  });
});
