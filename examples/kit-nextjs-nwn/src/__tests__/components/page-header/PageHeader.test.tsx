import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Default as PageHeader,
  BlueText,
  FiftyFifty,
  NwnEditorial,
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

jest.mock('@/components/page-header/PageHeaderNwnEditorial.dev', () => ({
  PageHeaderNwnEditorial: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="page-header-nwn-editorial">
      NW Natural Editorial Header - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

describe('PageHeader', () => {
  it('renders Default variant correctly', () => {
    render(<PageHeader {...mockPageHeaderProps} />);
    expect(screen.getByTestId('page-header-nwn-editorial')).toBeInTheDocument();
    expect(
      screen.getByText(/NW Natural Editorial Header - Normal/),
    ).toBeInTheDocument();
  });

  it('renders BlueText variant correctly', () => {
    render(<BlueText {...mockPageHeaderProps} />);
    expect(screen.getByTestId('page-header-nwn-editorial')).toBeInTheDocument();
    expect(
      screen.getByText(/NW Natural Editorial Header - Normal/),
    ).toBeInTheDocument();
  });

  it('renders FiftyFifty variant correctly', () => {
    render(<FiftyFifty {...mockPageHeaderProps} />);
    expect(screen.getByTestId('page-header-nwn-editorial')).toBeInTheDocument();
    expect(
      screen.getByText(/NW Natural Editorial Header - Normal/),
    ).toBeInTheDocument();
  });

  it('renders the NW Natural editorial variant correctly', () => {
    render(<NwnEditorial {...mockPageHeaderProps} />);
    expect(screen.getByTestId('page-header-nwn-editorial')).toBeInTheDocument();
    expect(
      screen.getByText(/NW Natural Editorial Header - Normal/),
    ).toBeInTheDocument();
  });
});
