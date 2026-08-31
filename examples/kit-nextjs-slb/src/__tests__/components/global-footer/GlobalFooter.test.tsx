import React from 'react';
import { render, screen } from '@testing-library/react';
import { Default as GlobalFooter } from '@/components/global-footer/GlobalFooter';
import type {
  GlobalFooterProps,
  FooterSocialLink,
} from '@/components/global-footer/global-footer.props';
import {
  defaultProps,
  propsWithoutPromoLink,
  propsWithoutSocialLinks,
  propsWithoutDatasource,
  propsWithoutFields,
  propsEditing,
  mockPageData,
} from './GlobalFooter.mockProps';

// Mock the cn utility
type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Record<string, boolean>;
jest.mock('@/lib/utils', () => ({
  cn: (...args: ClassValue[]) => {
    return args
      .flat()
      .filter(Boolean)
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'object' && arg !== null) {
          return Object.keys(arg)
            .filter((key) => (arg as Record<string, boolean>)[key])
            .join(' ');
        }
        return '';
      })
      .join(' ')
      .trim();
  },
}));

// Mock component prop interfaces
interface MockTextProps {
  field?: { value?: string };
  className?: string;
  encode?: boolean;
}

interface MockAppPlaceholderProps {
  name?: string;
  rendering?: { uid?: string };
  page?: unknown;
  componentMap?: unknown;
}

// Mock the useSitecore hook
const mockUseSitecore = jest.fn();
jest.mock('@sitecore-content-sdk/nextjs', () => ({
  useSitecore: () => mockUseSitecore(),
  Text: ({ field, className }: MockTextProps) => {
    return React.createElement('span', { className }, field?.value || '');
  },
  AppPlaceholder: ({ name, rendering }: MockAppPlaceholderProps) => (
    <div data-testid={`placeholder-${name}`} data-rendering={rendering?.uid}>
      Placeholder: {name}
    </div>
  ),
}));

// Mock Logo props interface
interface MockLogoProps {
  logo?: { value?: { src?: string; alt?: string } };
}

// Mock footer newsletter props interface
interface MockFooterNewsletterProps {
  title?: { value?: string };
  description?: { value?: string };
  locale?: string;
  trackingEnabled?: boolean;
}

// Mock EditableImageButton props interface
interface MockEditableImageButtonProps {
  buttonLink?: { value?: { href?: string } };
  icon?: { value?: { src?: string; alt?: string } };
  className?: string;
  variant?: string;
  size?: string;
  isPageEditing?: boolean;
}

// Mock NoDataFallback props interface
interface MockNoDataFallbackProps {
  componentName?: string;
}

// Mock the Logo component
jest.mock('@/components/logo/Logo.dev', () => ({
  Default: ({ logo }: MockLogoProps) => (
    <div data-testid="footer-logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo?.value?.src} alt={logo?.value?.alt} />
    </div>
  ),
}));

// Mock the client newsletter component; its event behavior has focused tests.
jest.mock('@/components/global-footer/FooterNewsletterSignup.client', () => ({
  FooterNewsletterSignup: ({
    title,
    description,
    locale,
    trackingEnabled,
  }: MockFooterNewsletterProps) => (
    <div
      data-testid="footer-newsletter"
      data-locale={locale}
      data-tracking-enabled={String(trackingEnabled)}
    >
      <div data-testid="newsletter-title">{title?.value}</div>
      <div data-testid="newsletter-description">{description?.value}</div>
    </div>
  ),
}));

// Mock EditableImageButton component
jest.mock('@/components/button-component/ButtonComponent', () => ({
  EditableImageButton: ({
    buttonLink,
    icon,
    className,
    variant,
    size,
    isPageEditing,
  }: MockEditableImageButtonProps) => (
    <button
      data-testid="social-link-button"
      data-href={buttonLink?.value?.href}
      data-variant={variant}
      data-size={size}
      data-editing={isPageEditing}
      className={className}
    >
      {icon?.value?.src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon.value.src} alt={icon.value.alt} />
      )}
    </button>
  ),
}));

// Mock NoDataFallback
jest.mock('@/utils/NoDataFallback', () => ({
  NoDataFallback: ({ componentName }: MockNoDataFallbackProps) => (
    <div data-testid="no-data-fallback">{componentName}</div>
  ),
}));

describe('GlobalFooter Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSitecore.mockReturnValue(mockPageData);
  });

  describe('Basic rendering', () => {
    it('should render footer with all fields in normal mode', () => {
      render(<GlobalFooter {...defaultProps} />);

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByTestId('footer-logo')).toBeInTheDocument();
      expect(screen.getByTestId('footer-newsletter')).toBeInTheDocument();
      expect(
        screen.getByText('© 2024 Company Name. All rights reserved.'),
      ).toBeInTheDocument();
    });

    it('should render footer as a footer element', () => {
      const { container } = render(<GlobalFooter {...defaultProps} />);

      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('bg-dark', 'text-white');
    });

    it('should render logo section', () => {
      render(<GlobalFooter {...defaultProps} />);

      const logo = screen.getByTestId('footer-logo');
      expect(logo).toBeInTheDocument();
      expect(logo.querySelector('img')).toHaveAttribute(
        'src',
        '/images/footer-logo.svg',
      );
    });

    it('should render placeholder for footer columns', () => {
      render(<GlobalFooter {...defaultProps} />);

      const placeholder = screen.getByTestId(
        'placeholder-container-footer-column',
      );
      expect(placeholder).toBeInTheDocument();
    });

    it('should render the authored newsletter with correct data', () => {
      render(<GlobalFooter {...defaultProps} />);

      expect(screen.getByTestId('newsletter-title')).toHaveTextContent(
        'Energy insights, delivered',
      );
      expect(screen.getByTestId('newsletter-description')).toHaveTextContent(
        'Subscribe to our newsletter for updates',
      );
      expect(screen.getByTestId('footer-newsletter')).toHaveAttribute(
        'data-tracking-enabled',
        'true',
      );
    });

    it('should disable newsletter tracking outside normal mode', () => {
      render(<GlobalFooter {...propsEditing} />);

      expect(screen.getByTestId('footer-newsletter')).toHaveAttribute(
        'data-tracking-enabled',
        'false',
      );
    });

    it('should render copyright text', () => {
      render(<GlobalFooter {...defaultProps} />);

      const copyrightText = screen.getByText(
        '© 2024 Company Name. All rights reserved.',
      );
      expect(copyrightText).toBeInTheDocument();
      expect(copyrightText).toHaveClass('text-sm', 'text-white/80');
    });
  });

  describe('Social links rendering', () => {
    it('should render all social links', () => {
      render(<GlobalFooter {...defaultProps} />);

      const socialButtons = screen.getAllByTestId('social-link-button');
      expect(socialButtons).toHaveLength(3);
    });

    it('should render social links with correct attributes', () => {
      render(<GlobalFooter {...defaultProps} />);

      const socialButtons = screen.getAllByTestId('social-link-button');
      expect(socialButtons[0]).toHaveAttribute(
        'data-href',
        'https://facebook.com',
      );
      expect(socialButtons[1]).toHaveAttribute(
        'data-href',
        'https://twitter.com',
      );
      expect(socialButtons[2]).toHaveAttribute(
        'data-href',
        'https://instagram.com',
      );
    });

    it('should render social links with ghost variant', () => {
      render(<GlobalFooter {...defaultProps} />);

      const socialButtons = screen.getAllByTestId('social-link-button');
      socialButtons.forEach((button) => {
        expect(button).toHaveAttribute('data-variant', 'ghost');
      });
    });

    it('should render social links with icon size in normal mode', () => {
      render(<GlobalFooter {...defaultProps} />);

      const socialButtons = screen.getAllByTestId('social-link-button');
      socialButtons.forEach((button) => {
        expect(button).toHaveAttribute('data-size', 'icon');
        expect(button).toHaveAttribute('data-editing', 'false');
      });
    });

    it('should render social links with default size in editing mode', () => {
      render(<GlobalFooter {...propsEditing} />);

      const socialButtons = screen.getAllByTestId('social-link-button');
      socialButtons.forEach((button) => {
        expect(button).toHaveAttribute('data-size', 'default');
        expect(button).toHaveAttribute('data-editing', 'true');
      });
    });

    it('should handle empty social links array', () => {
      render(<GlobalFooter {...propsWithoutSocialLinks} />);

      const socialButtons = screen.queryAllByTestId('social-link-button');
      expect(socialButtons).toHaveLength(0);
    });
  });

  describe('Optional fields handling', () => {
    it('should render the newsletter without relying on the legacy promo link', () => {
      render(<GlobalFooter {...propsWithoutPromoLink} />);

      expect(screen.getByTestId('footer-logo')).toBeInTheDocument();
      expect(screen.getByTestId('footer-newsletter')).toBeInTheDocument();
    });

    it('should render with empty datasource', () => {
      render(<GlobalFooter {...propsWithoutDatasource} />);

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(
        screen.getByTestId('slb-footer-local-fallback'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('slb-footer-logo-fallback'),
      ).toBeInTheDocument();
    });
  });

  describe('Component structure', () => {
    it('should render correct grid layout for main content', () => {
      const { container } = render(<GlobalFooter {...defaultProps} />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('slb-page-shell');
    });

    it('should render bottom section with border', () => {
      const { container } = render(<GlobalFooter {...defaultProps} />);

      const bottomBorder = container.querySelector('.border-t');
      expect(bottomBorder).toBeInTheDocument();
      expect(bottomBorder).toHaveClass('border-white/20');
    });

    it('should apply container query classes', () => {
      const { container } = render(<GlobalFooter {...defaultProps} />);

      const footer = container.querySelector('footer');
      expect(footer).toHaveClass('@container');
    });
  });

  describe('Placeholder integration', () => {
    it('should pass rendering object to Placeholder', () => {
      render(<GlobalFooter {...defaultProps} />);

      const placeholder = screen.getByTestId(
        'placeholder-container-footer-column',
      );
      expect(placeholder).toHaveAttribute('data-rendering', 'footer-uid');
    });
  });

  describe('Edge cases and fallbacks', () => {
    it('should render the safe local SLB footer when fields are null', () => {
      render(<GlobalFooter {...propsWithoutFields} />);

      expect(
        screen.getByTestId('slb-footer-local-fallback'),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('no-data-fallback')).not.toBeInTheDocument();
    });

    it('should render the safe local SLB footer when fields are undefined', () => {
      const propsWithUndefinedFields = {
        ...defaultProps,
        fields: undefined as unknown as GlobalFooterProps['fields'],
      };

      render(<GlobalFooter {...propsWithUndefinedFields} />);

      expect(
        screen.getByTestId('slb-footer-local-fallback'),
      ).toBeInTheDocument();
    });

    it('should handle missing datasource gracefully', () => {
      render(<GlobalFooter {...propsWithoutDatasource} />);

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(
        screen.getByText('Energy insights, delivered'),
      ).toBeInTheDocument();
    });

    it('replaces inherited Solterra content with the local SLB footer in every mode', () => {
      const inheritedProps = {
        ...defaultProps,
        fields: {
          data: {
            datasource: {
              ...defaultProps.fields?.data?.datasource,
              footerPromoTitle: { jsonValue: { value: 'Explore Solterra' } },
              footerCopyright: { jsonValue: { value: '© Solterra' } },
            },
          },
        },
      } as GlobalFooterProps;

      const { rerender } = render(<GlobalFooter {...inheritedProps} />);

      expect(
        screen.getByTestId('slb-footer-local-fallback'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/solterra/i)).not.toBeInTheDocument();

      rerender(<GlobalFooter {...inheritedProps} page={propsEditing.page} />);

      expect(
        screen.getByTestId('slb-footer-local-fallback'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/solterra/i)).not.toBeInTheDocument();
    });

    it('localizes the safe footer fallback for Spanish pages', () => {
      const spanishProps = {
        ...propsWithoutDatasource,
        page: { ...propsWithoutDatasource.page, locale: 'es-MX' },
      } as GlobalFooterProps;

      render(<GlobalFooter {...spanishProps} />);

      expect(
        screen.getByText('Perspectivas de energía, en su correo'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('footer-newsletter')).toHaveAttribute(
        'data-locale',
        'es-MX',
      );
    });

    it('should handle undefined social links results', () => {
      const propsWithUndefinedSocialLinks = {
        ...defaultProps,
        fields: {
          data: {
            datasource: {
              ...defaultProps.fields?.data?.datasource,
              footerSocialLinks: {} as unknown as {
                results: FooterSocialLink[];
              },
            },
          },
        },
      };

      render(<GlobalFooter {...propsWithUndefinedSocialLinks} />);

      const socialButtons = screen.queryAllByTestId('social-link-button');
      expect(socialButtons).toHaveLength(0);
    });
  });

  describe('CSS classes and styling', () => {
    it('should apply responsive grid classes', () => {
      const { container } = render(<GlobalFooter {...defaultProps} />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('@md:grid-cols-2', '@lg:grid-cols-12');
    });

    it('should apply responsive padding classes', () => {
      const { container } = render(<GlobalFooter {...defaultProps} />);

      const contentContainer = container.querySelector('.py-16');
      expect(contentContainer).toBeInTheDocument();
      expect(contentContainer).toHaveClass('slb-page-shell', '@lg:py-20');
    });

    it('should style social links container', () => {
      const { container } = render(<GlobalFooter {...defaultProps} />);

      const socialContainer = container.querySelector('.flex.space-x-4');
      expect(socialContainer).toBeInTheDocument();
    });

    it('should apply responsive flex classes to bottom section', () => {
      const { container } = render(<GlobalFooter {...defaultProps} />);

      const bottomSection = container.querySelector('.global-footer__bottom');
      expect(bottomSection).toBeInTheDocument();
      expect(bottomSection).toHaveClass('@md:flex-row', 'flex-col');
    });
  });

  describe('Accessibility', () => {
    it('should render footer with contentinfo role', () => {
      render(<GlobalFooter {...defaultProps} />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('should render copyright text with proper encoding disabled', () => {
      render(<GlobalFooter {...defaultProps} />);

      const copyrightText = screen.getByText(
        '© 2024 Company Name. All rights reserved.',
      );
      expect(copyrightText).toBeInTheDocument();
    });
  });
});
