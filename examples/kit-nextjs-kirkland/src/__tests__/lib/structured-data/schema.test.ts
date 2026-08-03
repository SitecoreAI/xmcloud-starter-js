import { generateWebSiteSchema } from '@/lib/structured-data/schema';

describe('generateWebSiteSchema', () => {
  it('advertises the SitecoreAI Search results page', () => {
    expect(
      generateWebSiteSchema('Kirkland & Ellis', 'https://www.kirkland.com'),
    ).toMatchObject({
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://www.kirkland.com/site-search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    });
  });
});
