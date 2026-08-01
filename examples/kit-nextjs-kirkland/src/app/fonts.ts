import { Playfair_Display, Rubik } from 'next/font/google';

export const headingFont = Playfair_Display({
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

export const bodyFont = Rubik({
  weight: ['300', '400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});
