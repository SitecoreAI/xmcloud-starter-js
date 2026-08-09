import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LocaleSelector } from '@/components/global-header/LocaleSelector';

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

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe('LocaleSelector', () => {
  beforeEach(() => {
    window.history.replaceState(
      {},
      '',
      '/es-MX/safety/winter-service-advisory?audience=customer#winter-safety',
    );
  });

  it('preserves the current page when switching languages', () => {
    render(<LocaleSelector locale="es-MX" />);

    expect(
      screen.getByRole('button', { name: 'Idioma: Español' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /English/i })).toHaveAttribute(
      'href',
      '/safety/winter-service-advisory?audience=customer#winter-safety',
    );
    expect(screen.getByRole('link', { name: /Español/i })).toHaveAttribute(
      'href',
      '/es-MX/safety/winter-service-advisory?audience=customer#winter-safety',
    );
  });

  it('marks Spanish as the current language', () => {
    render(<LocaleSelector locale="es-MX" />);

    expect(screen.getByRole('link', { name: /Español/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
