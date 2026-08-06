import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Page } from '@sitecore-content-sdk/nextjs';
import type { GlobalFooterProps } from '@/components/global-footer/global-footer.props';
import { GlobalFooterNwn } from '@/components/global-footer/GlobalFooterNwn.dev';
import { Default as EmailSignupForm } from '@/components/forms/email/EmailSignupForm.dev';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({
    field,
    tag = 'span',
    className,
  }: {
    field?: { value?: string };
    tag?: React.ElementType;
    className?: string;
  }) => React.createElement(tag, { className }, field?.value),
}));

jest.mock('@/components/button-component/ButtonComponent', () => ({
  EditableButton: ({
    buttonLink,
    icon,
    asIconLink,
  }: {
    buttonLink?: { value?: { href?: string; text?: string } };
    icon?: { value?: { alt?: string } };
    asIconLink?: boolean;
  }) => {
    const label = buttonLink?.value?.text || icon?.value?.alt || 'Social link';
    return (
      <a
        href={buttonLink?.value?.href}
        aria-label={asIconLink ? label : undefined}
      >
        {label}
      </a>
    );
  },
}));

jest.mock('@/components/forms/email/EmailSignupForm.dev', () => ({
  Default: jest.fn(() => (
    <form aria-label="Newsletter signup">
      <label htmlFor="footer-test-email">Email address</label>
      <input id="footer-test-email" type="email" />
      <button type="submit">Subscribe</button>
    </form>
  )),
}));

const mockEmailSignupForm = EmailSignupForm as jest.MockedFunction<
  typeof EmailSignupForm
>;

const normalPage = {
  mode: {
    isEditing: false,
    isPreview: false,
    isNormal: true,
    name: 'normal' as const,
    designLibrary: { isVariantGeneration: false },
    isDesignLibrary: false,
  },
  layout: {
    sitecore: {
      context: {},
      route: null,
    },
  },
  locale: 'en',
} as Page;

const footerProps: GlobalFooterProps = {
  rendering: { componentName: 'GlobalFooter' },
  params: {},
  fields: {
    data: {
      datasource: {
        footerNavLinks: {
          results: [
            {
              link: {
                jsonValue: {
                  value: {
                    href: '/account-billing',
                    text: 'Account & Billing',
                    linktype: 'internal',
                  },
                },
              },
            },
            {
              link: {
                jsonValue: {
                  value: {
                    href: '/safety',
                    text: 'Safety',
                    linktype: 'internal',
                  },
                },
              },
            },
          ],
        },
        socialLinks: {
          results: [
            {
              link: {
                jsonValue: {
                  value: {
                    href: 'https://www.facebook.com/NWNaturalGas',
                    text: 'Facebook',
                    linktype: 'external',
                  },
                },
              },
              socialIcon: {
                jsonValue: {
                  value: {
                    src: '/facebook.svg',
                    alt: 'Facebook',
                  },
                },
              },
            },
          ],
        },
        tagline: {
          jsonValue: {
            value:
              'Safe, reliable energy and practical support for Pacific Northwest homes.',
          },
        },
        emailSubscriptionTitle: {
          jsonValue: { value: 'Get energy tips and service updates.' },
        },
        footerCopyright: {
          jsonValue: { value: '© 2026 NW Natural. All rights reserved.' },
        },
      },
    },
    dictionary: {
      FOOTER_EmailSubmitLabel: 'Subscribe',
      FOOTER_EmailPlaceholder: 'Enter your email address',
      FOOTER_EmailErrorMessage: 'Enter a valid email address.',
      FOOTER_EmailSuccessMessage: 'Thanks for subscribing.',
    },
  },
  page: normalPage,
  isPageEditing: false,
};

describe('GlobalFooterNwn', () => {
  const previousIdentityProvider =
    process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER = 'email';
  });

  afterAll(() => {
    if (previousIdentityProvider === undefined) {
      delete process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER;
    } else {
      process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER =
        previousIdentityProvider;
    }
  });

  it('renders the compact newsletter, navigation, social, and legal structure', () => {
    render(<GlobalFooterNwn {...footerProps} />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Get energy tips and service updates.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('form', { name: 'Newsletter signup' }),
    ).toBeInTheDocument();

    const footerNavigation = screen.getByRole('navigation', {
      name: 'Footer navigation',
    });
    expect(
      within(footerNavigation).getByRole('link', {
        name: 'Account & Billing',
      }),
    ).toHaveAttribute('href', '/account-billing');
    expect(
      within(footerNavigation).getByRole('link', { name: 'Safety' }),
    ).toHaveAttribute('href', '/safety');

    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
      'href',
      'https://www.facebook.com/NWNaturalGas',
    );

    const legalNavigation = screen.getByRole('navigation', { name: 'Legal' });
    expect(
      within(legalNavigation).getByRole('link', {
        name: 'Terms and Conditions',
      }),
    ).toBeInTheDocument();
    expect(
      within(legalNavigation).getByRole('link', { name: 'Privacy Notice' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('© 2026 NW Natural. All rights reserved.'),
    ).toBeInTheDocument();
  });

  it('passes CDP identity configuration only in normal mode', () => {
    const { rerender } = render(<GlobalFooterNwn {...footerProps} />);

    expect(mockEmailSignupForm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cdpIdentity: {
          provider: 'email',
          source: 'global_footer',
        },
      }),
      undefined,
    );

    rerender(
      <GlobalFooterNwn
        {...footerProps}
        page={{
          ...normalPage,
          mode: {
            ...normalPage.mode,
            isEditing: true,
            isNormal: false,
          },
        }}
        isPageEditing
      />,
    );

    expect(mockEmailSignupForm).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ cdpIdentity: expect.anything() }),
      undefined,
    );
  });

  it('omits the oversized brand, tagline, emergency panel, and closing slogan', () => {
    render(<GlobalFooterNwn {...footerProps} />);

    expect(screen.queryByText(/^NW Natural$/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Safe, reliable energy and practical support for Pacific Northwest homes.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Smell natural gas?')).not.toBeInTheDocument();
    expect(screen.queryByText('800-882-3377')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Safe. Reliable. Ready for what comes next.'),
    ).not.toBeInTheDocument();
  });
});
