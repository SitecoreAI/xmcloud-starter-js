import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockUseSearch = jest.fn();
const mockSitecoreEvent = jest.fn();
const mockFallbackSearch = jest.fn();

jest.mock('@sitecore-content-sdk/nextjs/search', () => ({
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

jest.mock('@sitecore-content-sdk/events', () => ({
  event: (...args: unknown[]) => mockSitecoreEvent(...args),
}));

jest.mock('@/lib/slb-search', () => ({
  searchSlbFallbackContent: (...args: unknown[]) => mockFallbackSearch(...args),
}));

jest.mock('lucide-react', () => ({
  ArrowLeft: 'svg',
  ArrowRight: 'svg',
  LoaderCircle: 'svg',
  Search: 'svg',
  X: 'svg',
}));

jest.mock('next/link', () => {
  const ActualReact = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: ({
      href,
      children,
      onClick,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
      children?: React.ReactNode;
    }) =>
      ActualReact.createElement(
        'a',
        {
          ...props,
          href,
          onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            onClick?.(event);
          },
        },
        children,
      ),
  };
});

const previousSearchIndexId = process.env.NEXT_PUBLIC_SITECORE_SEARCH_INDEX_ID;
process.env.NEXT_PUBLIC_SITECORE_SEARCH_INDEX_ID = 'slb-test-index';

// The component reads the public index ID once when its module is evaluated.
const { SiteSearchDialog } = jest.requireActual<
  typeof import('@/components/site-search/SiteSearchDialog')
>('@/components/site-search/SiteSearchDialog');

type RemoteState = {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  results: Array<Record<string, unknown>>;
  total: number;
  totalPages: number;
};

const idleRemote: RemoteState = {
  isLoading: false,
  isSuccess: false,
  isError: false,
  results: [],
  total: 0,
  totalPages: 0,
};

const loadingRemote: RemoteState = {
  ...idleRemote,
  isLoading: true,
};

let remoteState: RemoteState;

function fallbackResponse(locale: 'en' | 'es-MX') {
  return {
    total: 1,
    totalPages: 1,
    results: [
      {
        id: `fallback:${locale}`,
        locale,
        title: 'Fallback carbon capture',
        description: 'Governed local content used when live search fails.',
        section: 'solutions',
        url:
          locale === 'es-MX'
            ? '/es-mx/solutions/fallback-carbon-capture'
            : '/solutions/fallback-carbon-capture',
      },
    ],
  };
}

async function openDialog(locale = 'en') {
  const view = render(
    <SiteSearchDialog locale={locale} pageName="Search test page" />,
  );
  const openName =
    locale.toLowerCase() === 'es-mx' ? 'Abrir búsqueda' : 'Open search menu';

  fireEvent.click(screen.getByRole('button', { name: openName }));
  await screen.findByRole('dialog');
  await waitFor(() => expect(mockFallbackSearch).toHaveBeenCalled());

  return view;
}

async function startSuggestedSearch(suggestion: string) {
  fireEvent.click(screen.getByRole('button', { name: suggestion }));

  await waitFor(() =>
    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: suggestion,
        enabled: true,
      }),
    ),
  );
}

describe('SiteSearchDialog', () => {
  beforeEach(() => {
    remoteState = idleRemote;
    mockUseSearch.mockReset();
    mockUseSearch.mockImplementation(() => remoteState);
    mockSitecoreEvent.mockReset();
    mockSitecoreEvent.mockResolvedValue(undefined);
    mockFallbackSearch.mockReset();
    mockFallbackSearch.mockImplementation(
      ({ locale }: { locale: 'en' | 'es-MX' }) => fallbackResponse(locale),
    );
  });

  afterAll(() => {
    if (previousSearchIndexId === undefined) {
      delete process.env.NEXT_PUBLIC_SITECORE_SEARCH_INDEX_ID;
    } else {
      process.env.NEXT_PUBLIC_SITECORE_SEARCH_INDEX_ID = previousSearchIndexId;
    }
  });

  it('renders a normalized English link from a successful remote response', async () => {
    remoteState = loadingRemote;
    const view = await openDialog();
    await startSuggestedSearch('emissions');

    remoteState = {
      isLoading: false,
      isSuccess: true,
      isError: false,
      results: [
        {
          content: 'Methane measurement and abatement technologies.',
          description: 'Operational emissions intelligence from SLB.',
          sc_item_id: 'remote-1',
          sc_locale: 'en',
          sc_url:
            'https://www.slb.com/solutions/emissions?source=search#overview',
          title: 'Measure and reduce methane emissions',
        },
      ],
      total: 1,
      totalPages: 1,
    };
    view.rerender(<SiteSearchDialog locale="en" pageName="Search test page" />);

    expect(
      await screen.findByRole('link', {
        name: /Measure and reduce methane emissions/i,
      }),
    ).toHaveAttribute('href', '/solutions/emissions?source=search#overview');
    expect(
      screen.queryByText('Fallback carbon capture'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Live search is temporarily unavailable/i),
    ).not.toBeInTheDocument();
  });

  it('keeps a successful zero-result remote response authoritative', async () => {
    remoteState = loadingRemote;
    const view = await openDialog();
    await startSuggestedSearch('emissions');

    remoteState = {
      ...idleRemote,
      isSuccess: true,
    };
    view.rerender(<SiteSearchDialog locale="en" pageName="Search test page" />);

    expect(await screen.findByText('No results found')).toBeInTheDocument();
    expect(
      screen.queryByText('Fallback carbon capture'),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/results\s+for/i).closest('p')).toHaveTextContent(
      '0 results for “emissions”',
    );
  });

  it('shows the native loading state while a remote request is pending', async () => {
    remoteState = loadingRemote;
    await openDialog();
    await startSuggestedSearch('emissions');

    expect(screen.getByText('Searching SLB')).toBeInTheDocument();
    expect(
      screen.queryByText('Fallback carbon capture'),
    ).not.toBeInTheDocument();
  });

  it('shows the lazy local fallback and notice after a matching remote error', async () => {
    remoteState = loadingRemote;
    const view = await openDialog();
    await startSuggestedSearch('emissions');

    remoteState = {
      ...idleRemote,
      isError: true,
    };
    view.rerender(<SiteSearchDialog locale="en" pageName="Search test page" />);

    expect(
      await screen.findByText(
        'Live search is temporarily unavailable. Showing the closest site content instead.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Fallback carbon capture/i }),
    ).toHaveAttribute('href', '/solutions/fallback-carbon-capture');
  });

  it('rejects malformed remote URLs instead of linking home and falls back', async () => {
    remoteState = loadingRemote;
    const view = await openDialog();
    await startSuggestedSearch('emissions');

    remoteState = {
      isLoading: false,
      isSuccess: true,
      isError: false,
      results: [
        {
          id: 'unsafe-remote-result',
          title: 'Unsafe remote result',
          url: 'javascript:alert(1)',
        },
      ],
      total: 1,
      totalPages: 1,
    };
    view.rerender(<SiteSearchDialog locale="en" pageName="Search test page" />);

    const fallbackLink = await screen.findByRole('link', {
      name: /Fallback carbon capture/i,
    });
    expect(fallbackLink).toHaveAttribute(
      'href',
      '/solutions/fallback-carbon-capture',
    );
    expect(screen.queryByText('Unsafe remote result')).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/"]')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Live search is temporarily unavailable/i),
    ).toBeInTheDocument();
  });

  it('uses Spanish labels and passes the es-MX locale to native search', async () => {
    await openDialog('es-MX');

    expect(
      screen.getByRole('heading', { name: 'Buscar en SLB' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: '¿Qué está buscando?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument();
    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ locale: 'es-MX' }),
    );
  });

  it('keeps the icon-first mobile submit control accessibly named', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
    });
    await openDialog();

    expect(screen.getByRole('button', { name: 'Search' })).toHaveAttribute(
      'type',
      'submit',
    );
  });

  it('suppresses viewed and clicked search events when tracking is disabled', async () => {
    remoteState = loadingRemote;
    const view = render(
      <SiteSearchDialog
        locale="en"
        pageName="Search test page"
        trackingEnabled={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open search menu' }));
    await screen.findByRole('dialog');
    await waitFor(() => expect(mockFallbackSearch).toHaveBeenCalled());
    await startSuggestedSearch('emissions');

    remoteState = {
      isLoading: false,
      isSuccess: true,
      isError: false,
      results: [
        {
          id: 'remote-2',
          title: 'Remote tracked result',
          url: '/solutions/remote-tracked-result',
        },
      ],
      total: 1,
      totalPages: 1,
    };
    view.rerender(
      <SiteSearchDialog
        locale="en"
        pageName="Search test page"
        trackingEnabled={false}
      />,
    );

    fireEvent.click(
      await screen.findByRole('link', { name: /Remote tracked result/i }),
    );
    expect(mockSitecoreEvent).not.toHaveBeenCalled();
  });
});
