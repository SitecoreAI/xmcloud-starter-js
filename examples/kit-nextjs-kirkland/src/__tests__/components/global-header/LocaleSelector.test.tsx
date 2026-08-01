import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LocaleSelector } from '@/components/global-header/LocaleSelector';

jest.mock('next/navigation', () => ({
  usePathname: () => '/fr-FR/News-and-Insights/Client-Alert',
}));

jest.mock('lucide-react', () => ({
  Check: () => <span aria-hidden="true">check</span>,
  ChevronDown: () => <span aria-hidden="true">down</span>,
  Globe2: () => <span aria-hidden="true">globe</span>,
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
  it('renders every configured region and language', () => {
    render(<LocaleSelector locale="fr-FR" />);

    expect(
      screen.getByRole('button', {
        name: 'Region and language: France, French',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /United States English/i }),
    ).toHaveAttribute('href', '/News-and-Insights/Client-Alert');
    expect(
      screen.getByRole('link', { name: /Mexico Spanish/i }),
    ).toHaveAttribute('href', '/es-MX/News-and-Insights/Client-Alert');
    expect(
      screen.getByRole('link', { name: /France French/i }),
    ).toHaveAttribute('href', '/fr-FR/News-and-Insights/Client-Alert');
    expect(
      screen.getByRole('link', { name: /Japan Japanese/i }),
    ).toHaveAttribute('href', '/ja-JP/News-and-Insights/Client-Alert');
  });

  it('marks the current locale', () => {
    render(<LocaleSelector locale="fr-FR" />);

    expect(
      screen.getByRole('link', { name: /France French/i }),
    ).toHaveAttribute('aria-current', 'page');
  });
});
