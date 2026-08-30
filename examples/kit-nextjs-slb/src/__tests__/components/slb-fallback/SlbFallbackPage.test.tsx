import React from 'react';
import { render, screen } from '@testing-library/react';
import SlbFallbackPage from '@/components/slb-fallback/SlbFallbackPage';
import { resolveSlbFallbackPage } from '@/lib/slb-fallback-content';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    hrefLang,
  }: {
    children: React.ReactNode;
    href: string;
    hrefLang?: string;
  }) => (
    <a href={href} hrefLang={hrefLang}>
      {children}
    </a>
  ),
}));

describe('SlbFallbackPage', () => {
  it('renders a complete English branded page from the content model', () => {
    const page = resolveSlbFallbackPage('en', ['solutions']);
    expect(page).toBeDefined();

    render(<SlbFallbackPage page={page!} />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Solve the energy challenge in front of you',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Start with the outcome')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Leer en español' }),
    ).toHaveAttribute('href', '/es-mx/soluciones');
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
  });

  it('renders localized contact content and the approved corporate handoff', () => {
    const page = resolveSlbFallbackPage('es-MX', ['contact-us']);
    expect(page).toBeDefined();

    render(<SlbFallbackPage page={page!} />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Habla con un especialista de SLB',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('¿Cómo podemos ayudarte?')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', {
        name: /formulario de contacto|contactar a slb/i,
      })[0],
    ).toHaveAttribute('href', 'https://www.slb.com/contact-us');
  });
});
