export const EMISSIONS_CAMPAIGN_REFRESH_DELAY_MS = 1000;

const EMISSIONS_CAMPAIGN_PATH = '/solutions/industrial-decarbonization';
const EMISSIONS_CAMPAIGN_NAME = 'emissions_performance';
const SESSION_KEY_PREFIX = 'slb:campaign-personalization-refresh:v1';

export type CampaignRefreshLocation = {
  pathname: string;
  search: string;
};

type CampaignRefreshStorage = Pick<Storage, 'getItem' | 'setItem'>;

type ScheduleCampaignRefreshOptions = {
  location: CampaignRefreshLocation;
  storage: CampaignRefreshStorage;
  reload: () => void;
  setTimeoutFn: (callback: () => void, delay: number) => number;
  isCancelled?: () => boolean;
};

function normalizePathname(pathname: string): string {
  if (pathname === '/') {
    return pathname;
  }

  return pathname.replace(/\/+$/, '');
}

export function getEmissionsCampaignRefreshKey(
  location: CampaignRefreshLocation,
): string | null {
  const pathname = normalizePathname(location.pathname);

  if (pathname !== EMISSIONS_CAMPAIGN_PATH) {
    return null;
  }

  const campaign = new URLSearchParams(location.search).get('utm_campaign');

  if (campaign !== EMISSIONS_CAMPAIGN_NAME) {
    return null;
  }

  return `${SESSION_KEY_PREFIX}:${encodeURIComponent(pathname)}:${encodeURIComponent(campaign)}`;
}

export function claimCampaignRefresh(
  storage: CampaignRefreshStorage,
  key: string,
): boolean {
  try {
    if (storage.getItem(key) !== null) {
      return false;
    }

    storage.setItem(key, 'refreshed');
    return true;
  } catch {
    // Never refresh without durable loop protection for the current session.
    return false;
  }
}

export function scheduleEmissionsCampaignRefresh({
  location,
  storage,
  reload,
  setTimeoutFn,
  isCancelled = () => false,
}: ScheduleCampaignRefreshOptions): number | null {
  const key = getEmissionsCampaignRefreshKey(location);

  if (!key) {
    return null;
  }

  try {
    if (storage.getItem(key) !== null) {
      return null;
    }
  } catch {
    // A blocked sessionStorage must not create an unguarded refresh loop.
    return null;
  }

  return setTimeoutFn(() => {
    if (isCancelled() || getEmissionsCampaignRefreshKey(location) !== key) {
      return;
    }

    if (claimCampaignRefresh(storage, key)) {
      reload();
    }
  }, EMISSIONS_CAMPAIGN_REFRESH_DELAY_MS);
}
