import {
  filterLegacyStarterSitemapEntries,
  isLegacyStarterRoute,
  isLegacyStarterUrl,
} from '@/lib/nwn-route-guard';

describe('SiEnergy inherited route guard', () => {
  it('blocks inherited product and test-drive routes case-insensitively', () => {
    expect(isLegacyStarterRoute(['Products', 'Aero'])).toBe(true);
    expect(isLegacyStarterRoute(['Test-Drive'])).toBe(true);
    expect(isLegacyStarterUrl('https://www.sienergy.com/products/Nexa')).toBe(
      true,
    );
  });

  it('blocks inherited NWN routes while keeping SiEnergy routes', () => {
    expect(isLegacyStarterRoute(['account-billing'])).toBe(true);
    expect(
      isLegacyStarterUrl('https://www.sienergy.com/safety/call-before-you-dig'),
    ).toBe(true);
    expect(isLegacyStarterUrl('https://www.nwnatural.com/')).toBe(true);
    expect(isLegacyStarterRoute(['service-options'])).toBe(false);
    expect(isLegacyStarterRoute(['safety'])).toBe(false);
  });

  it('removes only legacy URL entries from a sitemap', () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://www.sienergy.com/</loc></url>
      <url><loc>https://www.sienergy.com/Products/Terra</loc></url>
      <url><loc>https://www.sienergy.com/about-us</loc></url>
      <url><loc>https://www.sienergy.com/Test-Drive</loc></url>
    </urlset>`;

    const filtered = filterLegacyStarterSitemapEntries(xml);

    expect(filtered).toContain('https://www.sienergy.com/');
    expect(filtered).not.toContain('https://www.sienergy.com/about-us');
    expect(filtered).not.toContain('/Products/Terra');
    expect(filtered).not.toContain('/Test-Drive');
  });
});
