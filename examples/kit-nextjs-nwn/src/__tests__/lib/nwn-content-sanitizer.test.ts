import {
  isLegacyStarterDataValue,
  sanitizeLegacyStarterData,
} from '@/lib/nwn-content-sanitizer';

describe('NWN route-data sanitizer', () => {
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
      title: 'NW Natural',
      metadata: { oldTitle: '', oldImage: '' },
      links: [{ label: 'Safety' }, { label: '' }],
    });
  });

  it('does not flag NW Natural customer content', () => {
    expect(isLegacyStarterDataValue('Natural gas vehicle safety')).toBe(true);
    expect(isLegacyStarterDataValue('Natural gas safety at home')).toBe(false);
  });
});
