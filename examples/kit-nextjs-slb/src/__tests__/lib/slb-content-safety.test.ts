import {
  hasLegacySolterraSignature,
  sanitizeLegacySolterraPage,
} from '@/lib/slb-content-safety';

describe('SLB content safety', () => {
  it('recognizes both starter-brand spellings', () => {
    expect(hasLegacySolterraSignature('Solterra & Co.')).toBe(true);
    expect(hasLegacySolterraSignature('© 2025 Soltera & Co.')).toBe(true);
  });

  it('removes an inherited route as one presentation without mutating the page', () => {
    const page = {
      locale: 'en',
      mode: { isEditing: false },
      layout: {
        sitecore: {
          context: { site: { name: 'slb' } },
          route: {
            fields: {
              metadataTitle: { value: 'Solterra | Sustainable living' },
              pageTitle: { value: 'SLB | Energy innovation' },
            },
            placeholders: {
              'headless-header': [
                {
                  componentName: 'GlobalHeader',
                  fields: {
                    logo: {
                      value: { src: '/Feature/Solterra/images/Logo.webp' },
                    },
                  },
                },
              ],
              'headless-main': [
                {
                  componentName: 'Hero',
                  fields: { heading: { value: 'The Ordinary Kit' } },
                },
                {
                  componentName: 'Hero',
                  fields: { heading: { value: 'Solve with confidence' } },
                },
              ],
              'headless-footer': [
                {
                  componentName: 'GlobalFooter',
                  fields: {
                    copyright: { value: '© 2025 Soltera & Co.' },
                  },
                },
              ],
            },
          },
        },
      },
    };

    const sanitized = sanitizeLegacySolterraPage(page);
    const route = sanitized.layout.sitecore.route;

    expect(route.fields).toEqual({});
    expect(route.placeholders['headless-header']).toEqual([]);
    expect(route.placeholders['headless-footer']).toEqual([]);
    expect(route.placeholders['headless-main']).toEqual([]);
    expect(
      page.layout.sitecore.route.placeholders['headless-main'],
    ).toHaveLength(2);
    expect(page.layout.sitecore.route.fields).toHaveProperty('metadataTitle');
  });

  it('preserves a fully SLB-authored route', () => {
    const page = {
      layout: {
        sitecore: {
          route: {
            fields: { pageTitle: { value: 'SLB | Energy innovation' } },
            placeholders: {
              'headless-main': [
                {
                  componentName: 'Hero',
                  fields: { heading: { value: 'Solve with confidence' } },
                },
              ],
            },
          },
        },
      },
    };

    expect(sanitizeLegacySolterraPage(page)).toEqual(page);
  });
});
