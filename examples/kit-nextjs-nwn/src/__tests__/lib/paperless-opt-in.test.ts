import { isPaperlessOptInRequest } from '@/lib/paperless-opt-in';

describe('paperless opt-in route state', () => {
  it('activates only the query-marked Account & Billing page', () => {
    expect(isPaperlessOptInRequest('/account-billing', 'opt-in')).toBe(true);
    expect(
      isPaperlessOptInRequest('/account-billing', ['preview', 'opt-in']),
    ).toBe(true);

    expect(isPaperlessOptInRequest('/account-billing', undefined)).toBe(false);
    expect(isPaperlessOptInRequest('/account-billing', 'status')).toBe(false);
    expect(isPaperlessOptInRequest('/', 'opt-in')).toBe(false);
  });
});
