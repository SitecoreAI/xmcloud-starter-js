import {
  containsLegacyStarterContent,
  NWN_FAQ_ITEMS,
  NWN_SERVICE_ITEMS,
  NWN_SUMMARY,
} from '@/lib/nwn-ai-content';

describe('NWN AI endpoint content', () => {
  it('detects inherited automotive starter content', () => {
    expect(
      containsLegacyStarterContent({
        title: 'Meet the Alaris Aero',
        action: 'Schedule a test drive',
      }),
    ).toBe(true);
  });

  it('keeps the fallback payload specific to NW Natural', () => {
    expect(NWN_FAQ_ITEMS).toHaveLength(4);
    expect(NWN_SERVICE_ITEMS).toHaveLength(6);
    expect(NWN_SUMMARY.title).toContain('NW Natural');
    expect(
      containsLegacyStarterContent({
        faq: NWN_FAQ_ITEMS,
        services: NWN_SERVICE_ITEMS,
        summary: NWN_SUMMARY,
      }),
    ).toBe(false);
  });
});
