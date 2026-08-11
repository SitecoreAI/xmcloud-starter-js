import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Page } from '@sitecore-content-sdk/nextjs';

import { GlobalHeaderNwn } from '@/components/global-header/GlobalHeaderNwn.dev';
import type { GlobalHeaderProps } from '@/components/global-header/global-header.props';
import {
  endDemoAccountSession,
  navigateAfterDemoAccountSignOut,
  notifyDemoAccountSessionChanged,
  NWN_ACCOUNT_SESSION_CHANGED_EVENT,
  verifyDemoAccountSession,
} from '@/lib/sitecoreai-udl-client';

jest.mock('@/lib/sitecoreai-udl-client', () => ({
  endDemoAccountSession: jest.fn(),
  navigateAfterDemoAccountSignOut: jest.fn(),
  notifyDemoAccountSessionChanged: jest.fn(),
  NWN_ACCOUNT_SESSION_CHANGED_EVENT: 'nwn-account-session-changed',
  verifyDemoAccountSession: jest.fn(),
}));

const mockEndDemoAccountSession = endDemoAccountSession as jest.MockedFunction<
  typeof endDemoAccountSession
>;
const mockVerifyDemoAccountSession =
  verifyDemoAccountSession as jest.MockedFunction<
    typeof verifyDemoAccountSession
  >;
const mockNavigateAfterDemoAccountSignOut =
  navigateAfterDemoAccountSignOut as jest.MockedFunction<
    typeof navigateAfterDemoAccountSignOut
  >;
const mockNotifyDemoAccountSessionChanged =
  notifyDemoAccountSessionChanged as jest.MockedFunction<
    typeof notifyDemoAccountSessionChanged
  >;

jest.mock('@/components/content-sdk/CompatibleLink', () => ({
  CompatibleLink: ({
    field,
    onClick,
  }: {
    field?: { value?: { href?: string; text?: string } };
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  }) =>
    field?.value?.href ? (
      <a href={field.value.href} onClick={onClick}>
        {field.value.text}
      </a>
    ) : null,
}));

jest.mock('@/components/button-component/ButtonComponent', () => ({
  EditableButton: ({
    buttonLink,
    isPageEditing,
  }: {
    buttonLink?: { value?: { href?: string; text?: string } };
    isPageEditing?: boolean;
  }) =>
    buttonLink?.value?.href ? (
      <a
        href={buttonLink.value.href}
        data-page-editing={String(Boolean(isPageEditing))}
      >
        {buttonLink.value.text}
      </a>
    ) : null,
}));

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  Default: ({
    wrapperClass,
    sizes,
  }: {
    wrapperClass?: string;
    sizes?: string;
  }) => (
    <span
      data-testid="header-logo-field"
      data-wrapper-class={wrapperClass}
      data-sizes={sizes}
    />
  ),
}));

const externalSignInUrl =
  'https://www.nwnatural.com/identity/login/NWNatural/NWNIdentityServer';
const externalRegisterUrl = 'https://identity.nwnatural.com/Account/Register';

const makePage = (isEditing: boolean): Page =>
  ({
    mode: {
      isEditing,
      isPreview: false,
      isNormal: !isEditing,
      name: isEditing ? 'edit' : 'normal',
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
  }) as Page;

const makeProps = (isEditing: boolean): GlobalHeaderProps =>
  ({
    isPageEditing: isEditing,
    fields: {
      data: {
        item: {
          primaryNavigationLinks: { targetItems: [] },
          utilityNavigationLinks: {
            targetItems: [
              {
                link: {
                  jsonValue: {
                    value: {
                      href: externalSignInUrl,
                      text: 'Sign In',
                      linktype: 'external',
                    },
                  },
                },
              },
              {
                link: {
                  jsonValue: {
                    value: {
                      href: externalRegisterUrl,
                      text: 'Register',
                      linktype: 'external',
                    },
                  },
                },
              },
            ],
          },
          headerContact: {
            jsonValue: {
              value: {
                href: externalSignInUrl,
                text: 'Access your account',
                linktype: 'external',
              },
            },
          },
        },
      },
    },
    params: {},
    rendering: {
      componentName: 'GlobalHeader',
      dataSource: 'global-header-datasource',
    },
    page: makePage(isEditing),
  }) as GlobalHeaderProps;

const makeIncompleteInternalProps = (): GlobalHeaderProps => {
  const props = makeProps(false);
  const item = props.fields?.data?.item;

  if (item) {
    item.utilityNavigationLinks = {
      targetItems: [
        {
          link: {
            jsonValue: {
              value: {
                href: '/account-billing/login',
                text: 'Sign In',
                linktype: 'internal',
              },
            },
          },
        },
        {
          link: {
            jsonValue: {
              value: {
                href: '/account-billing/register',
                text: 'Register',
                linktype: 'internal',
              },
            },
          },
        },
      ],
    };
  }

  return props;
};

describe('GlobalHeaderNwn account link fallbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyDemoAccountSession.mockRejectedValue(
      new Error('No signed demo session'),
    );
    mockEndDemoAccountSession.mockResolvedValue({
      session: { ended: true },
    });
  });

  it('renders the authored logo at the enlarged responsive size', () => {
    const logoProps = makeProps(false);
    const item = logoProps.fields?.data?.item;

    if (item) {
      item.logo = {
        jsonValue: {
          value: {
            src: '/nwnatural-logo.svg',
            alt: 'NW Natural',
          },
        },
      };
    }

    render(<GlobalHeaderNwn {...logoProps} />);

    expect(screen.getByTestId('header-logo-field')).toHaveAttribute(
      'data-wrapper-class',
      'w-[9.5rem] sm:w-[14.4rem]',
    );
    expect(screen.getByTestId('header-logo-field')).toHaveAttribute(
      'data-sizes',
      '(max-width: 640px) 152px, 230px',
    );
  });

  it('replaces authored external account destinations with local account journeys in normal mode', async () => {
    render(<GlobalHeaderNwn {...makeProps(false)} />);

    const utilityNavigation = screen.getByRole('navigation', {
      name: 'Utility navigation',
    });

    expect(
      within(utilityNavigation).getByRole('link', { name: 'Search' }),
    ).toHaveAttribute('href', '/search');
    expect(
      within(utilityNavigation).getByRole('link', { name: 'Contact Us' }),
    ).toHaveAttribute('href', '/contact-us');
    expect(
      await within(utilityNavigation).findByRole('link', { name: 'Sign In' }),
    ).toHaveAttribute('href', '/account-billing/login');
    expect(
      within(utilityNavigation).getByRole('link', { name: 'Register' }),
    ).toHaveAttribute('href', '/account-billing/register');
    expect(
      screen.getByRole('link', { name: 'Access your account' }),
    ).toHaveAttribute('href', '/account-billing/login');

    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toHaveAttribute(
      'href',
      externalSignInUrl,
    );
    expect(
      screen.queryByRole('link', { name: 'Register' }),
    ).not.toHaveAttribute('href', externalRegisterUrl);
  });

  it('keeps the authored external account destinations visible in editing mode', () => {
    render(<GlobalHeaderNwn {...makeProps(true)} />);

    const utilityNavigation = screen.getByRole('navigation', {
      name: 'Utility navigation',
    });

    expect(
      within(utilityNavigation).getByRole('link', { name: 'Sign In' }),
    ).toHaveAttribute('href', externalSignInUrl);
    expect(
      within(utilityNavigation).getByRole('link', { name: 'Register' }),
    ).toHaveAttribute('href', externalRegisterUrl);
    expect(
      screen.getByRole('link', { name: 'Access your account' }),
    ).toHaveAttribute('href', externalSignInUrl);
    expect(
      within(utilityNavigation).queryByRole('link', { name: 'Search' }),
    ).not.toBeInTheDocument();
    expect(
      within(utilityNavigation).queryByRole('link', { name: 'Contact Us' }),
    ).not.toBeInTheDocument();
  });

  it('fills in missing search and contact actions in normal mode', () => {
    render(<GlobalHeaderNwn {...makeIncompleteInternalProps()} />);

    const utilityNavigation = screen.getByRole('navigation', {
      name: 'Utility navigation',
    });

    expect(
      within(utilityNavigation).getByRole('link', { name: 'Search' }),
    ).toHaveAttribute('href', '/search');
    expect(
      within(utilityNavigation).getByRole('link', { name: 'Contact Us' }),
    ).toHaveAttribute('href', '/contact-us');
  });

  it('replaces account actions with sign-out for an identified user', async () => {
    mockVerifyDemoAccountSession.mockResolvedValueOnce({
      session: {
        verified: true,
        email: 'paperless@example.com',
        paperless: true,
      },
    });

    render(<GlobalHeaderNwn {...makeProps(false)} />);

    const utilityNavigation = screen.getByRole('navigation', {
      name: 'Utility navigation',
    });
    const signOut = await within(utilityNavigation).findByRole('button', {
      name: 'Sign out',
    });

    expect(screen.getAllByRole('button', { name: 'Sign out' })).toHaveLength(1);
    expect(
      screen.queryByRole('link', { name: 'Access your account' }),
    ).not.toBeInTheDocument();

    expect(
      within(utilityNavigation).queryByRole('link', { name: 'Sign In' }),
    ).not.toBeInTheDocument();
    expect(
      within(utilityNavigation).queryByRole('link', { name: 'Register' }),
    ).not.toBeInTheDocument();

    fireEvent.click(signOut);

    await waitFor(() =>
      expect(mockEndDemoAccountSession).toHaveBeenCalledTimes(1),
    );
    expect(mockNotifyDemoAccountSessionChanged).toHaveBeenCalledWith(
      'anonymous',
    );
    expect(mockNavigateAfterDemoAccountSignOut).toHaveBeenCalledWith('/');
  });

  it('updates the mounted header as soon as login identifies the visitor', async () => {
    mockVerifyDemoAccountSession.mockReturnValueOnce(new Promise(() => {}));

    render(<GlobalHeaderNwn {...makeProps(false)} />);

    const utilityNavigation = screen.getByRole('navigation', {
      name: 'Utility navigation',
    });
    expect(
      within(utilityNavigation).queryByRole('link', { name: 'Sign In' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Access your account' }),
    ).not.toBeInTheDocument();

    fireEvent(
      window,
      new CustomEvent(NWN_ACCOUNT_SESSION_CHANGED_EVENT, {
        detail: 'identified',
      }),
    );

    expect(
      await within(utilityNavigation).findByRole('button', {
        name: 'Sign out',
      }),
    ).toBeInTheDocument();
  });

  it('localizes sign-out and the hard-navigation destination', async () => {
    mockVerifyDemoAccountSession.mockResolvedValueOnce({
      session: {
        verified: true,
        email: 'paperless@example.com',
        paperless: true,
      },
    });
    const spanishProps = makeProps(false);
    spanishProps.page = { ...spanishProps.page, locale: 'es-MX' };

    render(<GlobalHeaderNwn {...spanishProps} />);

    const signOut = await screen.findByRole('button', {
      name: 'Cerrar sesión',
    });
    fireEvent.click(signOut);

    await waitFor(() =>
      expect(mockNavigateAfterDemoAccountSignOut).toHaveBeenCalledWith(
        '/es-MX',
      ),
    );
  });
});
