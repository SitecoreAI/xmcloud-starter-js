import React from 'react';
import { render, screen, within } from '@testing-library/react';
import SlbFallbackPage from '@/components/slb-fallback/SlbFallbackPage';
import {
  resolveSlbFallbackPage,
  type SlbFallbackPageModel,
} from '@/lib/slb-fallback-content';

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

  it('consumes supporting images once across every image-bearing component', () => {
    const basePage = resolveSlbFallbackPage('en', ['solutions']);
    expect(basePage).toBeDefined();

    const page: SlbFallbackPageModel = {
      ...basePage!,
      fields: {
        ...basePage!.fields,
        hero: { ...basePage!.fields.hero, image: undefined },
        supportingImages: [
          {
            filename: 'solutions-manufacturing-expertise.jpg',
            alt: 'First supporting image',
          },
          {
            filename: 'solutions-local-expertise.jpg',
            alt: 'Second supporting image',
          },
          {
            filename: 'products-lumi-platform.jpg',
            alt: 'Third supporting image',
          },
        ],
        components: [
          {
            id: 'test-card-grid',
            type: 'cardGrid',
            order: 1,
            heading: 'Card grid',
            items: [
              { title: 'Card one', summary: 'First card' },
              { title: 'Card two', summary: 'Second card' },
            ],
          },
          {
            id: 'test-content-section',
            type: 'contentSection',
            order: 2,
            heading: 'Content section',
            body: 'Content section body',
          },
          {
            id: 'test-content-rail',
            type: 'contentRail',
            order: 3,
            heading: 'Content rail',
            items: [
              { title: 'Rail one', summary: 'First rail item' },
              { title: 'Rail two', summary: 'Second rail item' },
            ],
          },
        ],
      },
    };

    render(<SlbFallbackPage page={page} />);

    expect(
      screen.getAllByRole('img').map((image) => image.getAttribute('alt')),
    ).toEqual([
      'First supporting image',
      'Second supporting image',
      'Third supporting image',
    ]);
    expect(
      screen.getByText('Rail one').closest('article')?.querySelector('img'),
    ).toBeNull();
    expect(
      screen.getByText('Rail two').closest('article')?.querySelector('img'),
    ).toBeNull();
  });

  it('deduplicates repeated supporting filenames before allocation', () => {
    const basePage = resolveSlbFallbackPage('en', ['solutions']);
    expect(basePage).toBeDefined();

    const page: SlbFallbackPageModel = {
      ...basePage!,
      fields: {
        ...basePage!.fields,
        hero: { ...basePage!.fields.hero, image: undefined },
        supportingImages: [
          {
            filename: 'solutions-manufacturing-expertise.jpg',
            alt: 'First occurrence',
          },
          {
            filename: 'solutions-manufacturing-expertise.jpg',
            alt: 'Duplicate occurrence',
          },
          {
            filename: 'solutions-local-expertise.jpg',
            alt: 'Second unique image',
          },
        ],
        components: [
          {
            id: 'test-card-grid',
            type: 'cardGrid',
            order: 1,
            heading: 'Card grid',
            items: [
              { title: 'Card one', summary: 'First card' },
              { title: 'Card two', summary: 'Second card' },
              { title: 'Card three', summary: 'Third card' },
            ],
          },
        ],
      },
    };

    render(<SlbFallbackPage page={page} />);

    expect(
      screen.getAllByRole('img').map((image) => image.getAttribute('alt')),
    ).toEqual(['First occurrence', 'Second unique image']);
    expect(
      screen.queryByAltText('Duplicate occurrence'),
    ).not.toBeInTheDocument();
  });
});
