import {
  isLegacyStarterDataValue,
  sanitizeLegacyStarterData,
} from '@/lib/nwn-content-sanitizer';

describe('SiEnergy inherited route-data sanitizer', () => {
  it('removes inherited starter strings throughout nested route data', () => {
    const result = sanitizeLegacyStarterData({
      title: 'NW Natural',
      metadata: {
        oldTitle: 'Alaris - Get set for an electric future',
        oldImage: '/-/media/Feature/Alaris/Images/facebook.svg',
      },
      links: [{ label: 'Safety' }, { label: 'Book a test drive' }],
    });

    expect(result).toEqual({
      title: '',
      metadata: { oldTitle: '', oldImage: '' },
      links: [{ label: 'Safety' }, { label: '' }],
    });
  });

  it('flags inherited NWN content but keeps SiEnergy natural-gas content', () => {
    expect(isLegacyStarterDataValue('Natural gas vehicle safety')).toBe(true);
    expect(isLegacyStarterDataValue('https://www.nwnatural.com/safety')).toBe(
      true,
    );
    expect(isLegacyStarterDataValue('/account-billing/pay-my-bill')).toBe(true);
    expect(isLegacyStarterDataValue('/assets/nwn-images/hero.jpg')).toBe(true);
    expect(isLegacyStarterDataValue('Natural gas safety at home')).toBe(false);
  });
});
