import { buildSiteDataPath } from '@/lib/site-path';

describe('buildSiteDataPath', () => {
  const originalSiteCollectionName = process.env.SITECORE_SITE_COLLECTION_NAME;

  afterEach(() => {
    if (originalSiteCollectionName === undefined) {
      delete process.env.SITECORE_SITE_COLLECTION_NAME;
    } else {
      process.env.SITECORE_SITE_COLLECTION_NAME = originalSiteCollectionName;
    }
  });

  it('uses the Kirkland collection by default', () => {
    delete process.env.SITECORE_SITE_COLLECTION_NAME;

    expect(buildSiteDataPath('Kirkland', '/Data/AI Config/Summary')).toBe(
      '/sitecore/content/Kirkland/Kirkland/Data/AI Config/Summary',
    );
  });

  it('uses the configured Sitecore collection name', () => {
    process.env.SITECORE_SITE_COLLECTION_NAME = ' Demo Sites ';

    expect(buildSiteDataPath('Kirkland', '/Data/AI Config/FAQ')).toBe(
      '/sitecore/content/Demo Sites/Kirkland/Data/AI Config/FAQ',
    );
  });
});
