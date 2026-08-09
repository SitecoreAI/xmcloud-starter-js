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
                    href: 'https://nwnpartnerlink.com/Account/Login?ReturnUrl=%2f',
                    text: 'Builders / HVAC',
                    linktype: 'external',
                  },
                },
              },
            },
            {
              link: {
                jsonValue: {
                  value: {
                    href: 'https://ir.nwnaturalholdings.com/home/default.aspx',
                    text: 'Investors',
                    linktype: 'external',
                  },
                },
              },
            },
            {
              link: {
                jsonValue: {
                  value: {
                    href: 'https://www.nwnatural.com/suppliers',
                    text: 'Suppliers',
                    linktype: 'external',
                  },
                },
              },
            },
            {
              link: {
                jsonValue: {
                  value: {
                    href: 'https://www.nwnatural.com/about-us/the-company/careers',
                    text: 'Careers',
                    linktype: 'external',
                  },
                },
              },
            },
            {
              link: {
                jsonValue: {
                  value: {
                    href: 'https://www.nwnatural.com/safety/home-safety',
                    text: 'Safety',
                    linktype: 'external',
                  },
                },
              },
            },
            {
              link: {
                jsonValue: {
                  value: {
                    href: 'https://www.nwnatural.com/contact-us',
                    text: 'Contact Us',
                    linktype: 'external',
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
                    href: 'https://twitter.com/nwnatural',
                    text: 'X',
                    linktype: 'external',
                  },
                },
              },
              socialIconEnum: {
                jsonValue: {
                  value: 'twitter',
                },
              },
            },
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
            {
              link: {
                jsonValue: {
                  value: {
                    href: 'https://www.youtube.com/user/nwnaturalgas',
                    text: 'YouTube',
                    linktype: 'external',
                  },
                },
              },
              socialIconEnum: {
                jsonValue: {
                  value: 'youtube',
                },
              },
            },
            {
              link: {
                jsonValue: {
                  value: {
                    href: 'https://www.linkedin.com/company/nw-natural',
                    text: 'LinkedIn',
                    linktype: 'external',
                  },
                },
              },
              socialIcon: {
                jsonValue: {
                  value: {
                    src: '/linkedin.svg',
                    alt: 'LinkedIn',
                  },
                },
              },
            },
            {
              link: {
                jsonValue: {
                  value: {
                    href: 'https://www.instagram.com/nwnaturalgas/',
                    text: 'Instagram',
                    linktype: 'external',
                  },
                },
              },
              socialIcon: {
                jsonValue: {
                  value: {
                    src: '/instagram.svg',
                    alt: 'Instagram',
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
          jsonValue: { value: '© 2026 NW Natural. All Rights Reserved.' },
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
    process.env.NEXT_PUBLIC_SITECOREAI_IDENTITY_PROVIDER;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SITECOREAI_IDENTITY_PROVIDER = 'email';
  });

  afterAll(() => {
    if (previousIdentityProvider === undefined) {
      delete process.env.NEXT_PUBLIC_SITECOREAI_IDENTITY_PROVIDER;
    } else {
      process.env.NEXT_PUBLIC_SITECOREAI_IDENTITY_PROVIDER =
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
        name: 'Builders / HVAC',
      }),
    ).toHaveAttribute(
      'href',
      'https://nwnpartnerlink.com/Account/Login?ReturnUrl=%2f',
    );
    expect(
      within(footerNavigation).getByRole('link', { name: 'Safety' }),
    ).toHaveAttribute('href', 'https://www.nwnatural.com/safety/home-safety');
    expect(
      within(footerNavigation).getByRole('link', { name: 'Contact Us' }),
    ).toHaveAttribute('href', 'https://www.nwnatural.com/contact-us');
    expect(
      within(footerNavigation).queryByRole('link', { name: 'Less We Can' }),
    ).not.toBeInTheDocument();

    [
      ['X', 'https://twitter.com/nwnatural'],
      ['Facebook', 'https://www.facebook.com/NWNaturalGas'],
      ['YouTube', 'https://www.youtube.com/user/nwnaturalgas'],
      ['LinkedIn', 'https://www.linkedin.com/company/nw-natural'],
      ['Instagram', 'https://www.instagram.com/nwnaturalgas/'],
    ].forEach(([name, href]) => {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    });

    const legalNavigation = screen.getByRole('navigation', { name: 'Legal' });
    [
      'Terms and Conditions',
      'Privacy Notice',
      'Bill Inserts',
      'En Español',
      'Your Privacy Choices',
    ].forEach((name) => {
      expect(
        within(legalNavigation).getByRole('link', { name }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('© 2026 NW Natural. All Rights Reserved.'),
    ).toBeInTheDocument();
  });

  it('passes SitecoreAI identity configuration only in normal mode', () => {
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

  it('replaces an obsolete Less We Can footer link with the live footer set', () => {
    render(
      <GlobalFooterNwn
        {...footerProps}
        fields={{
          ...footerProps.fields,
          data: {
            datasource: {
              ...footerProps.fields.data.datasource,
              footerNavLinks: {
                results: [
                  {
                    link: {
                      jsonValue: {
                        value: {
                          href: '/about-us/environment/less-we-can',
                          text: 'Less We Can',
                          linktype: 'internal',
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        }}
      />,
    );

    const footerNavigation = screen.getByRole('navigation', {
      name: 'Footer navigation',
    });
    expect(
      within(footerNavigation)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      'Builders / HVAC',
      'Investors',
      'Suppliers',
      'Careers',
      'Safety',
      'Contact Us',
    ]);
    expect(
      within(footerNavigation).queryByText('Less We Can'),
    ).not.toBeInTheDocument();
  });

  it('uses the same social-link order as the live NW Natural footer', () => {
    const reversedSocialLinks = [
      ...footerProps.fields.data.datasource.socialLinks.results,
    ].reverse();

    render(
      <GlobalFooterNwn
        {...footerProps}
        fields={{
          ...footerProps.fields,
          data: {
            datasource: {
              ...footerProps.fields.data.datasource,
              socialLinks: { results: reversedSocialLinks },
            },
          },
        }}
      />,
    );

    const socialSection = screen.getByRole('heading', {
      name: 'Follow NW Natural',
    }).parentElement;

    expect(socialSection).not.toBeNull();
    expect(
      within(socialSection as HTMLElement)
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label')),
    ).toEqual(['X', 'Facebook', 'YouTube', 'LinkedIn', 'Instagram']);
  });

  it('uses the same primary-link order as the live NW Natural footer', () => {
    const reversedFooterLinks = [
      ...footerProps.fields.data.datasource.footerNavLinks.results,
    ].reverse();

    render(
      <GlobalFooterNwn
        {...footerProps}
        fields={{
          ...footerProps.fields,
          data: {
            datasource: {
              ...footerProps.fields.data.datasource,
              footerNavLinks: { results: reversedFooterLinks },
            },
          },
        }}
      />,
    );

    expect(
      within(screen.getByRole('navigation', { name: 'Footer navigation' }))
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      'Builders / HVAC',
      'Investors',
      'Suppliers',
      'Careers',
      'Safety',
      'Contact Us',
    ]);
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
