import {
  filterLegacyStarterSitemapEntries,
  isLegacyStarterRoute,
  isLegacyStarterUrl,
} from '@/lib/nwn-route-guard';

describe('NWN legacy route guard', () => {
  it('blocks inherited product and test-drive routes case-insensitively', () => {
    expect(isLegacyStarterRoute(['Products', 'Aero'])).toBe(true);
    expect(isLegacyStarterRoute(['Test-Drive'])).toBe(true);
    expect(isLegacyStarterUrl('https://demo.example/products/Nexa')).toBe(true);
  });

  it('keeps NW Natural demo routes', () => {
    expect(isLegacyStarterRoute(['account-billing'])).toBe(false);
    expect(
      isLegacyStarterUrl('https://demo.example/safety/call-before-you-dig'),
    ).toBe(false);
  });

  it('removes only legacy URL entries from a sitemap', () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://demo.example/</loc></url>
      <url><loc>https://demo.example/Products/Terra</loc></url>
      <url><loc>https://demo.example/about-us</loc></url>
      <url><loc>https://demo.example/Test-Drive</loc></url>
    </urlset>`;

    const filtered = filterLegacyStarterSitemapEntries(xml);

    expect(filtered).toContain('https://demo.example/');
    expect(filtered).toContain('https://demo.example/about-us');
    expect(filtered).not.toContain('/Products/Terra');
    expect(filtered).not.toContain('/Test-Drive');
  });
});
