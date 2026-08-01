import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Default as TextBanner,
  TextBanner01,
  TextBanner02,
  TextTop,
  BlueTitleRight,
} from '@/components/text-banner/TextBanner';
import { mockTextBannerProps } from './text-banner.mock.props';

// Mock useSitecore
jest.mock('@sitecore-content-sdk/nextjs', () => ({
  useSitecore: jest.fn(() => ({
    page: {
      mode: {
        isEditing: false,
      },
    },
  })),
  Text: jest.fn(({ field }) => (
    <span data-testid="text-field">{field?.value}</span>
  )),
}));

// Mock child components
jest.mock('@/components/text-banner/TextBannerDefault.dev', () => ({
  TextBannerDefault: ({
    fields,
  }: {
    fields: { heading: { value: string } };
  }) => <div data-testid="text-banner-default">{fields?.heading?.value}</div>,
}));

jest.mock('@/components/text-banner/TextBanner01.dev', () => ({
  TextBanner01: ({ fields }: { fields: { heading: { value: string } } }) => (
    <div data-testid="text-banner-01">{fields?.heading?.value}</div>
  ),
}));

jest.mock('@/components/text-banner/TextBanner02.dev', () => ({
  TextBanner02: ({ fields }: { fields: { heading: { value: string } } }) => (
    <div data-testid="text-banner-02">{fields?.heading?.value}</div>
  ),
}));

jest.mock('@/components/text-banner/TextBannerTextTop.dev', () => ({
  TextBannerTextTop: ({
    fields,
  }: {
    fields: { heading: { value: string } };
  }) => <div data-testid="text-banner-text-top">{fields?.heading?.value}</div>,
}));

jest.mock('@/components/text-banner/TextBannerBlueTitleRight.dev', () => ({
  TextBannerBlueTitleRight: ({
    fields,
  }: {
    fields: { heading: { value: string } };
  }) => (
    <div data-testid="text-banner-blue-title-right">
      {fields?.heading?.value}
    </div>
  ),
}));

describe('TextBanner', () => {
  it('renders Default variant with isPageEditing prop', () => {
    render(<TextBanner {...mockTextBannerProps} />);

    expect(screen.getByTestId('text-banner-default')).toBeInTheDocument();
    expect(screen.getByTestId('text-banner-default')).toHaveTextContent(
      'Advanced Emergency Response Vehicles',
    );
  });

  it('uses the centered overview treatment on office detail pages', () => {
    const officeOverviewProps = {
      ...mockTextBannerProps,
      rendering: {
        ...mockTextBannerProps.rendering,
        dataSource: 'local:/Data/Office_Overview',
      },
      page: {
        ...mockTextBannerProps.page,
        layout: {
          ...mockTextBannerProps.page.layout,
          sitecore: {
            ...mockTextBannerProps.page.layout.sitecore,
            context: {
              ...mockTextBannerProps.page.layout.sitecore.context,
              itemPath: '/Locations/London',
            },
          },
        },
      },
    };

    render(<TextBanner {...officeOverviewProps} />);

    expect(screen.getByTestId('text-banner-02')).toBeInTheDocument();
    expect(screen.queryByTestId('text-banner-default')).not.toBeInTheDocument();
  });

  it('uses the blue details treatment for an empty page-branch datasource', () => {
    const branchDetailsProps = {
      ...mockTextBannerProps,
      rendering: {
        ...mockTextBannerProps.rendering,
        dataSource: 'local:/Data/Office_Details',
      },
      fields: {
        ...mockTextBannerProps.fields,
        heading: { value: '' },
      },
      page: {
        ...mockTextBannerProps.page,
        layout: {
          ...mockTextBannerProps.page.layout,
          sitecore: {
            ...mockTextBannerProps.page.layout.sitecore,
            context: {
              ...mockTextBannerProps.page.layout.sitecore.context,
              itemPath:
                '/sitecore/content/legal/kit-nextjs-kirkland/Home/Locations/$name',
            },
          },
        },
      },
    };

    render(<TextBanner {...branchDetailsProps} />);

    expect(screen.getByTestId('text-banner-01')).toBeInTheDocument();
    expect(screen.queryByTestId('text-banner-default')).not.toBeInTheDocument();
  });

  it('suppresses a migrated Overview banner on lawyer detail pages', () => {
    const lawyerOverviewProps = {
      ...mockTextBannerProps,
      rendering: {
        ...mockTextBannerProps.rendering,
        dataSource: 'local:/Data/Profile_Overview',
      },
      fields: {
        ...mockTextBannerProps.fields,
        heading: { value: 'Overview' },
      },
      page: {
        ...mockTextBannerProps.page,
        layout: {
          ...mockTextBannerProps.page.layout,
          sitecore: {
            ...mockTextBannerProps.page.layout.sitecore,
            context: {
              ...mockTextBannerProps.page.layout.sitecore.context,
              itemPath: '/Lawyers/Allan-Kirk',
            },
          },
        },
      },
    };

    const { container } = render(<TextBanner {...lawyerOverviewProps} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('suppresses the empty legacy introduction in the lawyer page branch', () => {
    const lawyerBranchProps = {
      ...mockTextBannerProps,
      rendering: {
        ...mockTextBannerProps.rendering,
        dataSource: 'local:/Data/Profile_Introduction',
      },
      fields: {
        ...mockTextBannerProps.fields,
        heading: { value: '' },
        description: { value: '' },
      },
      page: {
        ...mockTextBannerProps.page,
        layout: {
          ...mockTextBannerProps.page.layout,
          sitecore: {
            ...mockTextBannerProps.page.layout.sitecore,
            context: {
              ...mockTextBannerProps.page.layout.sitecore.context,
              itemPath:
                '/sitecore/content/legal/kit-nextjs-kirkland/Home/Lawyers/$name',
            },
          },
        },
      },
    };

    const { container } = render(<TextBanner {...lawyerBranchProps} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the lawyer Experience banner visible', () => {
    const lawyerExperienceProps = {
      ...mockTextBannerProps,
      rendering: {
        ...mockTextBannerProps.rendering,
        dataSource: 'local:/Data/Profile_Experience',
      },
      fields: {
        ...mockTextBannerProps.fields,
        heading: { value: 'Focused on what comes next.' },
      },
      page: {
        ...mockTextBannerProps.page,
        layout: {
          ...mockTextBannerProps.page.layout,
          sitecore: {
            ...mockTextBannerProps.page.layout.sitecore,
            context: {
              ...mockTextBannerProps.page.layout.sitecore.context,
              itemPath: '/Lawyers/Allan-Kirk',
            },
          },
        },
      },
    };

    render(<TextBanner {...lawyerExperienceProps} />);

    expect(screen.getByTestId('text-banner-default')).toHaveTextContent(
      'Focused on what comes next.',
    );
  });

  it('renders TextBanner01 variant', () => {
    render(<TextBanner01 {...mockTextBannerProps} />);

    expect(screen.getByTestId('text-banner-01')).toBeInTheDocument();
    expect(screen.getByTestId('text-banner-01')).toHaveTextContent(
      'Advanced Emergency Response Vehicles',
    );
  });

  it('renders TextBanner02 variant', () => {
    render(<TextBanner02 {...mockTextBannerProps} />);

    expect(screen.getByTestId('text-banner-02')).toBeInTheDocument();
    expect(screen.getByTestId('text-banner-02')).toHaveTextContent(
      'Advanced Emergency Response Vehicles',
    );
  });

  it('renders TextTop variant', () => {
    render(<TextTop {...mockTextBannerProps} />);

    expect(screen.getByTestId('text-banner-text-top')).toBeInTheDocument();
    expect(screen.getByTestId('text-banner-text-top')).toHaveTextContent(
      'Advanced Emergency Response Vehicles',
    );
  });

  it('renders BlueTitleRight variant', () => {
    render(<BlueTitleRight {...mockTextBannerProps} />);

    expect(
      screen.getByTestId('text-banner-blue-title-right'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('text-banner-blue-title-right'),
    ).toHaveTextContent('Advanced Emergency Response Vehicles');
  });
});
