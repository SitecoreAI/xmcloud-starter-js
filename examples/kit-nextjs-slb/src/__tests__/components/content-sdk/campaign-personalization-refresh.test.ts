import {
  claimCampaignRefresh,
  EMISSIONS_CAMPAIGN_REFRESH_DELAY_MS,
  getEmissionsCampaignRefreshKey,
  scheduleEmissionsCampaignRefresh,
  type CampaignRefreshLocation,
} from '@/components/content-sdk/campaign-personalization-refresh';

function createStorage() {
  const values = new Map<string, string>();

  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  };
}

describe('emissions campaign personalization refresh', () => {
  it('creates a stable key only for the intended path and UTM campaign', () => {
    const matchingLocation = {
      pathname: '/solutions/industrial-decarbonization/',
      search:
        '?utm_source=google&utm_campaign=emissions_performance&utm_content=featured_result',
    };

    expect(getEmissionsCampaignRefreshKey(matchingLocation)).toBe(
      'slb:campaign-personalization-refresh:v1:%2Fsolutions%2Findustrial-decarbonization:emissions_performance',
    );
    expect(
      getEmissionsCampaignRefreshKey({
        ...matchingLocation,
        pathname: '/solutions/digital-operations',
      }),
    ).toBeNull();
    expect(
      getEmissionsCampaignRefreshKey({
        ...matchingLocation,
        search: '?utm_campaign=another_campaign',
      }),
    ).toBeNull();
    expect(
      getEmissionsCampaignRefreshKey({
        ...matchingLocation,
        search: '',
      }),
    ).toBeNull();
  });

  it('claims a session refresh key exactly once', () => {
    const { storage, values } = createStorage();

    expect(claimCampaignRefresh(storage, 'campaign-key')).toBe(true);
    expect(values.get('campaign-key')).toBe('refreshed');
    expect(claimCampaignRefresh(storage, 'campaign-key')).toBe(false);
  });

  it('refreshes after the propagation delay and records loop protection first', () => {
    const { storage, values } = createStorage();
    const location: CampaignRefreshLocation = {
      pathname: '/solutions/industrial-decarbonization',
      search: '?utm_campaign=emissions_performance',
    };
    const reload = jest.fn();
    let scheduledCallback: (() => void) | undefined;
    let scheduledDelay: number | undefined;

    const timer = scheduleEmissionsCampaignRefresh({
      location,
      storage,
      reload,
      setTimeoutFn: (callback, delay) => {
        scheduledCallback = callback;
        scheduledDelay = delay;
        return 17;
      },
    });

    expect(timer).toBe(17);
    expect(scheduledDelay).toBe(EMISSIONS_CAMPAIGN_REFRESH_DELAY_MS);
    expect(reload).not.toHaveBeenCalled();

    scheduledCallback?.();

    expect(values.size).toBe(1);
    expect(reload).toHaveBeenCalledTimes(1);

    scheduledCallback?.();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('cancels safely when navigation changes before the timer runs', () => {
    const { storage, values } = createStorage();
    const location: CampaignRefreshLocation = {
      pathname: '/solutions/industrial-decarbonization',
      search: '?utm_campaign=emissions_performance',
    };
    const reload = jest.fn();
    let scheduledCallback: (() => void) | undefined;

    scheduleEmissionsCampaignRefresh({
      location,
      storage,
      reload,
      setTimeoutFn: (callback) => {
        scheduledCallback = callback;
        return 18;
      },
    });

    location.pathname = '/solutions/digital-operations';
    scheduledCallback?.();

    expect(values.size).toBe(0);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not refresh when session storage cannot provide loop protection', () => {
    const storage = {
      getItem: () => {
        throw new Error('Storage unavailable');
      },
      setItem: jest.fn(),
    };
    const setTimeoutFn = jest.fn();

    expect(
      scheduleEmissionsCampaignRefresh({
        location: {
          pathname: '/solutions/industrial-decarbonization',
          search: '?utm_campaign=emissions_performance',
        },
        storage,
        reload: jest.fn(),
        setTimeoutFn,
      }),
    ).toBeNull();
    expect(setTimeoutFn).not.toHaveBeenCalled();
  });
});
