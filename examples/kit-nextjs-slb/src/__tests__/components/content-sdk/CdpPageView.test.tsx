import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  CdpHelper: {
    getPageVariantId: jest.fn(() => 'test-page-variant-id'),
  },
  useSitecore: jest.fn(),
}));

jest.mock('@sitecore-content-sdk/events', () => ({
  pageView: jest.fn(),
}));

jest.mock('sitecore.config', () => ({
  __esModule: true,
  default: {
    defaultLanguage: 'en',
    personalize: { scope: 'test-scope' },
  },
}));

jest.mock('@/components/content-sdk/campaign-personalization-refresh', () => ({
  scheduleEmissionsCampaignRefresh: jest.fn(),
}));

import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { pageView } from '@sitecore-content-sdk/events';
import CdpPageView from '@/components/content-sdk/CdpPageView';
import { scheduleEmissionsCampaignRefresh } from '@/components/content-sdk/campaign-personalization-refresh';

const mockedUseSitecore = useSitecore as jest.MockedFunction<
  typeof useSitecore
>;
const mockedPageView = pageView as jest.MockedFunction<typeof pageView>;
const mockedScheduleRefresh =
  scheduleEmissionsCampaignRefresh as jest.MockedFunction<
    typeof scheduleEmissionsCampaignRefresh
  >;

type SitecoreContext = ReturnType<typeof useSitecore>;
type PageViewResult = Awaited<ReturnType<typeof pageView>>;

const successfulPageViewResponse: NonNullable<PageViewResult> = {
  ref: 'test-ref',
  status: 'success',
  version: '1.0',
  client_key: 'test-client-key',
  customer_ref: 'test-customer-ref',
};

function createSitecoreContext(isNormal = true): SitecoreContext {
  return {
    loadImportMap: jest.fn(),
    componentMap: new Map(),
    page: {
      layout: {
        sitecore: {
          route: {
            itemId: 'test-item-id',
            itemLanguage: 'en',
            name: 'Industrial decarbonization',
            placeholders: {},
          },
          context: {
            variantId: 'default',
          },
        },
      },
      siteName: 'slb',
      locale: 'en',
      mode: {
        isNormal,
        isEditing: !isNormal,
        isPreview: false,
        name: (isNormal ? 'normal' : 'edit') as never,
        designLibrary: {
          isVariantGeneration: false,
        },
        isDesignLibrary: false,
      },
    },
  } as SitecoreContext;
}

describe('CdpPageView campaign refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(
      {},
      '',
      '/solutions/industrial-decarbonization?utm_campaign=emissions_performance',
    );
    mockedUseSitecore.mockReturnValue(createSitecoreContext());
    mockedPageView.mockResolvedValue(successfulPageViewResponse);
    mockedScheduleRefresh.mockReturnValue(null);
  });

  it('schedules campaign personalization only after pageView resolves', async () => {
    let resolvePageView: ((value: PageViewResult) => void) | undefined;
    mockedPageView.mockImplementation(
      () =>
        new Promise<PageViewResult>((resolve) => {
          resolvePageView = resolve;
        }),
    );

    render(<CdpPageView />);

    expect(mockedScheduleRefresh).not.toHaveBeenCalled();

    await act(async () => {
      resolvePageView?.(successfulPageViewResponse);
    });

    await waitFor(() => expect(mockedScheduleRefresh).toHaveBeenCalledTimes(1));
    expect(mockedScheduleRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        location: window.location,
        storage: window.sessionStorage,
        reload: expect.any(Function),
        setTimeoutFn: expect.any(Function),
        isCancelled: expect.any(Function),
      }),
    );
  });

  it('does not schedule when Sitecore resolves pageView without a response', async () => {
    mockedPageView.mockResolvedValue(null);

    render(<CdpPageView />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedScheduleRefresh).not.toHaveBeenCalled();
  });

  it('does not schedule a refresh when pageView rejects', async () => {
    mockedPageView.mockRejectedValue(new Error('Event failed'));

    render(<CdpPageView />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedScheduleRefresh).not.toHaveBeenCalled();
  });

  it('does not send pageView or schedule a refresh outside normal mode', () => {
    mockedUseSitecore.mockReturnValue(createSitecoreContext(false));

    render(<CdpPageView />);

    expect(mockedPageView).not.toHaveBeenCalled();
    expect(mockedScheduleRefresh).not.toHaveBeenCalled();
  });

  it('does not schedule after the component has unmounted', async () => {
    let resolvePageView: ((value: PageViewResult) => void) | undefined;
    mockedPageView.mockImplementation(
      () =>
        new Promise<PageViewResult>((resolve) => {
          resolvePageView = resolve;
        }),
    );
    const { unmount } = render(<CdpPageView />);

    unmount();
    await act(async () => {
      resolvePageView?.(successfulPageViewResponse);
    });

    expect(mockedScheduleRefresh).not.toHaveBeenCalled();
  });
});
