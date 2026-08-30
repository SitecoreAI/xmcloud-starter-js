jest.unmock('@/lib/utils');

import { getBaseUrl, getFullUrl } from '@/lib/utils';

describe('public URL resolution', () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnvironment, NODE_ENV: 'production' };
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('uses an explicitly configured public site URL first', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.example.com/';

    expect(getBaseUrl('preview.internal')).toBe('https://www.example.com');
  });

  it('derives an HTTPS origin from the request host in production', () => {
    expect(getBaseUrl('slb.example.com')).toBe('https://slb.example.com');
    expect(getBaseUrl('slb.example.com, proxy.internal', 'https, http')).toBe(
      'https://slb.example.com',
    );
  });

  it('honors a safe forwarded protocol', () => {
    expect(getBaseUrl('localhost:3000', 'http')).toBe('http://localhost:3000');
  });

  it('never manufactures localhost metadata in production', () => {
    expect(getBaseUrl()).toBe('');
    expect(getFullUrl('/solutions')).toBe('/solutions');
  });

  it('rejects a malformed host instead of injecting it into metadata', () => {
    expect(getBaseUrl('example.com/path')).toBe('');
    expect(getBaseUrl('https://example.com')).toBe('');
  });
});
