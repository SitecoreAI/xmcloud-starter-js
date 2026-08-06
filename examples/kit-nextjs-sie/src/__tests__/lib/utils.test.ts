const { getBaseUrl, getBaseUrlFromHeaders, getFullUrl } =
  jest.requireActual<typeof import('@/lib/utils')>('@/lib/utils');

const makeHeaders = (values: Record<string, string>): Pick<Headers, 'get'> => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});
const setNodeEnv = (value: string | undefined) =>
  Object.defineProperty(process.env, 'NODE_ENV', {
    configurable: true,
    value,
    writable: true,
  });

describe('public base URL resolution', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  afterAll(() => {
    setNodeEnv(originalNodeEnv);
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    if (originalBaseUrl === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
    else process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl;
  });

  it('prefers and normalizes the configured public origin', () => {
    setNodeEnv('production');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://canonical.example.com/a/path/';

    expect(
      getBaseUrlFromHeaders(
        makeHeaders({
          host: 'internal.example',
          'x-forwarded-host': 'proxy.example.com',
          'x-forwarded-proto': 'http',
        }),
      ),
    ).toBe('https://canonical.example.com');
  });

  it('uses the first trusted forwarded host and protocol when configuration is absent', () => {
    setNodeEnv('production');

    expect(
      getBaseUrlFromHeaders(
        makeHeaders({
          host: 'internal.example',
          'x-forwarded-host': 'nwn.example.com, internal.example',
          'x-forwarded-proto': 'https, http',
        }),
      ),
    ).toBe('https://nwn.example.com');
    expect(getFullUrl('/safety', 'nwn.example.com', 'https')).toBe(
      'https://nwn.example.com/safety',
    );
  });

  it('never silently falls back to localhost in production', () => {
    setNodeEnv('production');

    expect(() => getBaseUrl()).toThrow(
      'Unable to determine the public site origin',
    );
  });

  it('retains localhost as a development-only fallback', () => {
    setNodeEnv('development');

    expect(getBaseUrl()).toBe('http://localhost:3000');
  });
});
