import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Page } from '@sitecore-content-sdk/nextjs';

import { GlobalHeaderNwn } from '@/components/global-header/GlobalHeaderNwn.dev';
import type { GlobalHeaderProps } from '@/components/global-header/global-header.props';

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
  Default: () => <span data-testid="header-logo-field" />,
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
  it('replaces authored external account destinations with local account journeys in normal mode', () => {
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
      within(utilityNavigation).getByRole('link', { name: 'Sign In' }),
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
});
