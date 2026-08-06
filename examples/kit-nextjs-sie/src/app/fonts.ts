import { Barlow, Barlow_Condensed } from 'next/font/google';

/**
 * NW Natural uses DIN 2014. Barlow is an open-source substitute with the
 * same clear, engineered character and is safe to ship with this site.
 */
export const nwnBodyFont = Barlow({
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

export const nwnHeadingFont = Barlow_Condensed({
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});
