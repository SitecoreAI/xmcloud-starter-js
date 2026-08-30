import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
        name: 'Hable con un especialista de SLB',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('¿Cómo podemos ayudarle?')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', {
        name: /formulario de contacto|contactar a slb/i,
      })[0],
    ).toHaveAttribute('href', 'https://www.slb.com/contact-us');
  });

  it('only links cards with an explicit, semantically matched destination', () => {
    const page = resolveSlbFallbackPage('en', ['solutions']);
    expect(page).toBeDefined();

    render(<SlbFallbackPage page={page!} />);

    expect(
      screen
        .getByRole('heading', { level: 3, name: 'Connect decisions' })
        .closest('a'),
    ).toHaveAttribute('href', '/solutions/digital-operations');
    expect(
      screen
        .getByRole('heading', { level: 3, name: 'Understand' })
        .closest('a'),
    ).toBeNull();
  });

  it('renders newsroom discovery copy and topics as honest static content', () => {
    const page = resolveSlbFallbackPage('en', ['newsroom']);
    expect(page).toBeDefined();

    render(<SlbFallbackPage page={page!} />);

    expect(
      screen.getByText('Find news, announcements, and stories'),
    ).toBeInTheDocument();
    const topicList = screen.getByRole('list', { name: 'Topics' });
    expect(within(topicList).getAllByRole('listitem')).toHaveLength(5);
    expect(within(topicList).getByText('All')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'All' }),
    ).not.toBeInTheDocument();
  });

  it('localizes the Spanish brand signals and component kickers', () => {
    const processPage = resolveSlbFallbackPage('es-MX', [
      'sustainability',
      'climate-action',
    ]);
    expect(processPage).toBeDefined();

    const { unmount } = render(<SlbFallbackPage page={processPage!} />);

    expect(screen.getByText('Ciencia')).toBeInTheDocument();
    expect(screen.getByText('Tecnología digital')).toBeInTheDocument();
    expect(screen.getByText('Energía')).toBeInTheDocument();
    expect(screen.getByText('Cómo trabajamos')).toBeInTheDocument();
    expect(screen.getByText('Continúe explorando')).toBeInTheDocument();

    unmount();

    const productPage = resolveSlbFallbackPage('es-MX', [
      'products-and-services',
      'data-and-ai',
    ]);
    expect(productPage).toBeDefined();

    render(<SlbFallbackPage page={productPage!} />);

    const featureHeading = screen.getByRole('heading', {
      level: 2,
      name: 'Plataforma de datos e IA Lumi',
    });
    expect(featureHeading.parentElement).toHaveTextContent('Tecnología');
  });

  it('keeps the Spanish newsroom voice consistently formal', () => {
    const page = resolveSlbFallbackPage('es-MX', ['sala-de-prensa']);
    expect(page).toBeDefined();

    render(<SlbFallbackPage page={page!} />);

    expect(
      screen.getByText(
        'Consulte anuncios corporativos y novedades de los equipos de SLB.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Explore nuevas capacidades para las operaciones energéticas y los sistemas emergentes.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Descubra cómo la tecnología, la experiencia y la colaboración se unen en campo.',
      ),
    ).toBeInTheDocument();
  });
});
