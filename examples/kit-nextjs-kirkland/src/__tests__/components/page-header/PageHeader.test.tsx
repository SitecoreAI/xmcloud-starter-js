import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Default as PageHeader,
  BlueText,
  FiftyFifty,
  OfficeBanner,
} from '@/components/page-header/PageHeader';
import { mockPageHeaderProps } from './page-header.mock.props';

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
jest.mock('@/components/page-header/PageHeaderDefault.dev', () => ({
  PageHeaderDefault: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="page-header-default">
      PageHeaderDefault - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock('@/components/page-header/PageHeaderBlueText.dev', () => ({
  PageHeaderBlueText: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="page-header-blue-text">
      PageHeaderBlueText - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock('@/components/page-header/PageHeaderFiftyFifty.dev', () => ({
  PageHeaderFiftyFifty: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="page-header-fifty-fifty">
      PageHeaderFiftyFifty - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock('@/components/page-header/PageHeaderBlueBackground.dev', () => ({
  PageHeaderBlueBackground: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="page-header-blue-background">
      PageHeaderBlueBackground - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock('@/components/page-header/PageHeaderCentered.dev', () => ({
  PageHeaderCentered: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="page-header-centered">
      PageHeaderCentered - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock('@/components/page-header/PageHeaderOfficeBanner.dev', () => ({
  PageHeaderOfficeBanner: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="page-header-office-banner">
      PageHeaderOfficeBanner - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

describe('PageHeader', () => {
  it('renders Default variant correctly', () => {
    render(<PageHeader {...mockPageHeaderProps} />);
    expect(screen.getByTestId('page-header-default')).toBeInTheDocument();
    expect(screen.getByText(/PageHeaderDefault - Normal/)).toBeInTheDocument();
  });

  it('uses the image-backed banner for office detail pages awaiting explicit variant selection', () => {
    const officePageProps = {
      ...mockPageHeaderProps,
      page: {
        ...mockPageHeaderProps.page,
        layout: {
          ...mockPageHeaderProps.page.layout,
          sitecore: {
            ...mockPageHeaderProps.page.layout.sitecore,
            context: {
              ...mockPageHeaderProps.page.layout.sitecore.context,
              itemPath: '/Locations/Houston',
            },
          },
        },
      },
    };

    render(<PageHeader {...officePageProps} />);

    expect(screen.getByTestId('page-header-office-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('page-header-default')).not.toBeInTheDocument();
  });

  it('renders the explicit OfficeBanner variant correctly', () => {
    render(<OfficeBanner {...mockPageHeaderProps} />);

    expect(screen.getByTestId('page-header-office-banner')).toBeInTheDocument();
    expect(
      screen.getByText(/PageHeaderOfficeBanner - Normal/),
    ).toBeInTheDocument();
  });

  it('renders BlueText variant correctly', () => {
    render(<BlueText {...mockPageHeaderProps} />);
    expect(screen.getByTestId('page-header-blue-text')).toBeInTheDocument();
    expect(screen.getByText(/PageHeaderBlueText - Normal/)).toBeInTheDocument();
  });

  it('renders FiftyFifty variant correctly', () => {
    render(<FiftyFifty {...mockPageHeaderProps} />);
    expect(screen.getByTestId('page-header-fifty-fifty')).toBeInTheDocument();
    expect(
      screen.getByText(/PageHeaderFiftyFifty - Normal/),
    ).toBeInTheDocument();
  });
});
