import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Default as Hero,
  ImageBackground,
  NwnHome,
} from '@/components/hero/Hero';
import { mockHeroProps } from './hero.mock.props';

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

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: jest.fn(() => (key: string) => key),
}));

// Mock dictionary
jest.mock('@/variables/dictionary', () => ({
  dictionaryKeys: {
    HERO_SubmitCTALabel: 'HERO_SubmitCTALabel',
    HERO_ZipPlaceholder: 'HERO_ZipPlaceholder',
  },
}));

// Mock child components
jest.mock('@/components/hero/HeroDefault.dev', () => ({
  HeroDefault: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="hero-default">
      HeroDefault - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock('@/components/hero/HeroImageBottom.dev', () => ({
  HeroImageBottom: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="hero-image-bottom">
      HeroImageBottom - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock('@/components/hero/HeroImageBackground.dev', () => ({
  HeroImageBackground: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="hero-image-background">
      HeroImageBackground - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

jest.mock('@/components/hero/HeroImageBottomInset.dev', () => ({
  HeroImageBottomInset: () => <section data-testid="hero-image-bottom-inset" />,
}));

jest.mock('@/components/hero/HeroImageRight.dev', () => ({
  HeroImageRight: () => <section data-testid="hero-image-right" />,
}));

jest.mock('@/components/hero/HeroNwnHome.dev', () => ({
  HeroNwnHome: ({ isPageEditing }: { isPageEditing: boolean }) => (
    <section data-testid="hero-nwn-home">
      NW Natural Home Hero - {isPageEditing ? 'Editing' : 'Normal'}
    </section>
  ),
}));

describe('Hero Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the default variant without crashing', () => {
    render(<Hero {...mockHeroProps} />);
    expect(screen.getByTestId('hero-nwn-home')).toBeInTheDocument();
    expect(screen.getByText(/Normal/)).toBeInTheDocument();
  });

  it('adds dictionary to props from i18n', () => {
    const { container } = render(<Hero {...mockHeroProps} />);
    expect(container).toBeInTheDocument();
    expect(mockHeroProps.fields.dictionary).toBeDefined();
  });

  it('renders the ImageBackground variant correctly', () => {
    render(<ImageBackground {...mockHeroProps} />);
    expect(screen.getByTestId('hero-nwn-home')).toBeInTheDocument();
  });

  it('renders the NW Natural home variant correctly', () => {
    render(<NwnHome {...mockHeroProps} />);
    expect(screen.getByTestId('hero-nwn-home')).toBeInTheDocument();
    expect(
      screen.getByText(/NW Natural Home Hero - Normal/),
    ).toBeInTheDocument();
  });
});
