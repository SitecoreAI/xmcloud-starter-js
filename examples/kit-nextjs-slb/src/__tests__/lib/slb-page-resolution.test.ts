import {
  getPageWithFallbackAlias,
  getSlbPublicPathname,
  getSlbPublicPathSegments,
  resolveSlbPageLocale,
} from '@/lib/slb-page-resolution';
import type { SlbFallbackPageModel } from '@/lib/slb-fallback-content';

const spanishFallback = {
  locale: 'es-MX',
  route: '/es-mx/soluciones',
  alternateRoute: '/solutions',
} as SlbFallbackPageModel;

describe('SLB Sitecore page resolution', () => {
  it('removes internal personalization segments from public page paths', () => {
    const componentVariant =
      '_variantId_9db8ec3a95d5ee03d327ca8cecad2d0e_454b1ed978704ea79756fe8833e97bac';
    const secondComponentVariant =
      '_variantId_0abd1a13bd8340608e54f9b577ed4db1_fc9afc5bfa694163a1ef46d0b69a3435';

    expect(
      getSlbPublicPathname(['products-and-services', 'ccus', componentVariant]),
    ).toBe('/products-and-services/ccus');
    expect(
      getSlbPublicPathSegments([
        componentVariant,
        secondComponentVariant,
        'products-and-services',
        'ccus',
      ]),
    ).toEqual(['products-and-services', 'ccus']);
    expect(getSlbPublicPathname([componentVariant])).toBe('/');
  });

  it('uses the Sitecore preview language over the internal editing route locale', () => {
    expect(resolveSlbPageLocale('es-MX', 'en')).toBe('es-MX');
    expect(resolveSlbPageLocale('ES-mx', 'en')).toBe('es-MX');
    expect(resolveSlbPageLocale('en', 'es-MX')).toBe('en');
    expect(resolveSlbPageLocale('EN', 'es-MX')).toBe('en');
    expect(resolveSlbPageLocale(undefined, 'en')).toBe('en');
    expect(resolveSlbPageLocale(undefined, 'ES-mx')).toBe('es-MX');
  });

  it('retries the shared item path for a translated Spanish alias', async () => {
    const getPage = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 'sitecore-page' });

    await expect(
      getPageWithFallbackAlias({
        getPage,
        path: ['soluciones'],
        site: 'slb',
        locale: 'es-MX',
        fallbackPage: spanishFallback,
      }),
    ).resolves.toEqual({ id: 'sitecore-page' });

    expect(getPage).toHaveBeenNthCalledWith(1, ['soluciones'], {
      site: 'slb',
      locale: 'es-MX',
    });
    expect(getPage).toHaveBeenNthCalledWith(2, ['solutions'], {
      site: 'slb',
      locale: 'es-MX',
    });
  });

  it('does not retry when Sitecore resolves the requested alias', async () => {
    const getPage = jest.fn().mockResolvedValue({ id: 'localized-page' });

    await getPageWithFallbackAlias({
      getPage,
      path: ['soluciones'],
      site: 'slb',
      locale: 'es-MX',
      fallbackPage: spanishFallback,
    });

    expect(getPage).toHaveBeenCalledTimes(1);
  });

  it('preserves personalization segments when retrying a shared item path', async () => {
    const componentVariant =
      '_variantId_9db8ec3a95d5ee03d327ca8cecad2d0e_454b1ed978704ea79756fe8833e97bac';
    const getPage = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 'personalized-sitecore-page' });

    await expect(
      getPageWithFallbackAlias({
        getPage,
        path: ['soluciones', componentVariant],
        site: 'slb',
        locale: 'es-MX',
        fallbackPage: spanishFallback,
      }),
    ).resolves.toEqual({ id: 'personalized-sitecore-page' });

    expect(getPage).toHaveBeenNthCalledWith(
      1,
      ['soluciones', componentVariant],
      { site: 'slb', locale: 'es-MX' },
    );
    expect(getPage).toHaveBeenNthCalledWith(
      2,
      ['solutions', componentVariant],
      { site: 'slb', locale: 'es-MX' },
    );
  });

  it('does not retry English routes or an already shared Spanish route', async () => {
    const getPage = jest.fn().mockResolvedValue(undefined);

    await getPageWithFallbackAlias({
      getPage,
      path: ['solutions'],
      site: 'slb',
      locale: 'en',
      fallbackPage: spanishFallback,
    });
    await getPageWithFallbackAlias({
      getPage,
      path: ['solutions'],
      site: 'slb',
      locale: 'es-MX',
      fallbackPage: spanishFallback,
    });

    expect(getPage).toHaveBeenCalledTimes(2);
  });
});
