/** @jest-environment node */

import { NextRequest } from 'next/server';
import client from 'lib/sitecore-client';
import { GET } from '@/app/api/ai/markdown/[[...path]]/route';

jest.mock('lib/sitecore-client', () => ({
  __esModule: true,
  default: {
    getPage: jest.fn(),
  },
}));

const getPage = client.getPage as jest.Mock;
const context = (path: string[] = []) => ({
  params: Promise.resolve({ path }),
});
const request = (query = '') =>
  new NextRequest(`https://nwn.example/api/ai/markdown${query}`);

describe('NWN AI Markdown route', () => {
  beforeEach(() => {
    getPage.mockReset();
  });

  it('rejects requests for another site or an unsupported locale', async () => {
    const foreignSite = await GET(
      request('?site=kit-nextjs-kirkland'),
      context(['safety']),
    );
    const unsupportedLocale = await GET(
      request('?locale=fr'),
      context(['safety']),
    );

    expect(foreignSite.status).toBe(400);
    expect(unsupportedLocale.status).toBe(400);
    expect(getPage).not.toHaveBeenCalled();
  });

  it('rejects inherited starter routes before fetching content', async () => {
    const response = await GET(request(), context(['Products', 'Aero']));

    expect(response.status).toBe(404);
    expect(getPage).not.toHaveBeenCalled();
  });

  it('forces the NWN scope and removes inherited starter content', async () => {
    getPage.mockResolvedValue({
      layout: {
        sitecore: {
          route: {
            fields: {
              pageTitle: { value: 'Natural gas safety' },
              oldDescription: { value: 'Alaris electric future' },
            },
            placeholders: {
              main: [
                {
                  componentName: 'Safety guidance',
                  fields: {
                    description: { value: 'Call 811 before you dig.' },
                    oldLink: { value: 'Book a test drive' },
                  },
                },
              ],
            },
          },
        },
      },
    });

    const response = await GET(
      request('?site=kit-nextjs-nwn'),
      context(['safety']),
    );
    const markdown = await response.text();

    expect(response.status).toBe(200);
    expect(getPage).toHaveBeenCalledWith(['safety'], {
      site: 'kit-nextjs-nwn',
      locale: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en',
    });
    expect(markdown).toContain('Natural gas safety');
    expect(markdown).toContain('Call 811 before you dig.');
    expect(markdown).not.toMatch(/Alaris|test drive/i);
  });
});
