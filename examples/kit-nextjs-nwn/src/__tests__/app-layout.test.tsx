import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { headers } from 'next/headers';
import RootLayout from '@/app/layout';

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

describe('RootLayout', () => {
  it.each(['en', 'es-MX'])(
    'renders the active %s language for crawlers and assistive technology',
    async (locale) => {
      jest
        .mocked(headers)
        .mockResolvedValue(
          new Headers({ 'x-nwn-locale': locale }) as Awaited<
            ReturnType<typeof headers>
          >,
        );

      const markup = renderToStaticMarkup(
        await RootLayout({ children: <main>Content</main> }),
      );

      expect(markup).toContain(`<html lang="${locale}"`);
    },
  );
});
