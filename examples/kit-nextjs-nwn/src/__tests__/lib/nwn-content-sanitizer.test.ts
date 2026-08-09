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
    expect(isLegacyStarterDataValue('Natural gas vehicle safety')).toBe(false);
    expect(isLegacyStarterDataValue('Natural gas safety at home')).toBe(false);
    expect(
      isLegacyStarterDataValue(
        'Keep service vehicles away from the meter during an emergency.',
      ),
    ).toBe(false);
    expect(isLegacyStarterDataValue('/vehicles/all View All Vehicles')).toBe(
      true,
    );
    expect(
      isLegacyStarterDataValue('https://example.com/vehicles/ambulances'),
    ).toBe(true);
    expect(isLegacyStarterDataValue('Browse vehicles')).toBe(true);
  });

  it('preserves winter emergency guidance that mentions vehicles', () => {
    const winterGuidance =
      '<p>Do not use switches, phones, vehicles, or anything that could create a spark.</p>';

    expect(sanitizeLegacyStarterData(winterGuidance)).toBe(winterGuidance);
  });

  it('preserves legitimate vehicle language in nested metadata', () => {
    const metadata = {
      metadataDescription:
        'Learn how natural gas vehicles can support lower-emission fleets.',
      ogImage: {
        alt: 'NW Natural service vehicles responding during winter weather',
      },
    };

    expect(sanitizeLegacyStarterData(metadata)).toEqual(metadata);
  });
});
