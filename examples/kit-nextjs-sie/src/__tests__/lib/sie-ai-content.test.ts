import {
  containsLegacyStarterContent,
  SIE_FAQ_ITEMS,
  SIE_SERVICE_ITEMS,
  SIE_SUMMARY,
} from '@/lib/sie-ai-content';

describe('SiEnergy AI endpoint content', () => {
  it('detects inherited automotive starter content', () => {
    expect(
      containsLegacyStarterContent({
        title: 'Meet the Alaris Aero',
        action: 'Schedule a test drive',
      }),
    ).toBe(true);
  });

  it('detects inherited NWN content and routes', () => {
    expect(
      containsLegacyStarterContent({
        title: 'NW Natural account help',
        href: '/account-billing/pay-my-bill',
      }),
    ).toBe(true);
  });

  it('keeps the fallback payload specific to SiEnergy', () => {
    expect(SIE_FAQ_ITEMS).toHaveLength(4);
    expect(SIE_SERVICE_ITEMS).toHaveLength(6);
    expect(SIE_SUMMARY.title).toContain('SiEnergy');
    expect(
      containsLegacyStarterContent({
        faq: SIE_FAQ_ITEMS,
        services: SIE_SERVICE_ITEMS,
        summary: SIE_SUMMARY,
      }),
    ).toBe(false);
  });
});
