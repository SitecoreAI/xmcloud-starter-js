import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompatibleLink } from '@/components/content-sdk/CompatibleLink';

jest.mock('next/navigation', () => ({
  usePathname: () => '/es-MX/safety/winter-service-advisory',
}));

jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
    ...props
  }: React.ComponentProps<'a'>) => (
    <a href={href?.toString()} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Link: ({
    field,
  }: {
    field?: { value?: { href?: string; text?: string } };
  }) => <a href={field?.value?.href}>{field?.value?.text}</a>,
}));

describe('CompatibleLink', () => {
  it('prefixes internal links with the active locale', () => {
    render(
      <CompatibleLink
        field={{
          value: {
            href: '/account-billing/payment-assistance',
            text: 'Asistencia de pago',
          },
        }}
        editable={false}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Asistencia de pago' }),
    ).toHaveAttribute('href', '/es-MX/account-billing/payment-assistance');
  });

  it('does not rewrite external links', () => {
    render(
      <CompatibleLink
        field={{
          value: {
            href: 'https://www.nwnatural.com/business',
            text: 'Negocios',
          },
        }}
        editable={false}
      />,
    );

    expect(screen.getByRole('link', { name: 'Negocios' })).toHaveAttribute(
      'href',
      'https://www.nwnatural.com/business',
    );
  });
});
