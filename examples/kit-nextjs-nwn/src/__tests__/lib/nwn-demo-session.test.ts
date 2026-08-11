/** @jest-environment node */

import {
  createAccountSessionToken,
  isSameOriginRequest,
  NWN_ACCOUNT_SESSION_MAX_AGE,
  readAccountSessionToken,
} from '@/lib/nwn-demo-session';

const EMAIL = 'demo@example.com';
const REGISTERED_EMAIL = 'taylor.morgan@example.com';
const NOW = 1_800_000_000_000;

const request = (
  headers: Record<string, string>,
  origin = 'https://nwn.example',
) => ({
  headers: {
    get: (name: string) => headers[name.toLowerCase()] || null,
  },
  nextUrl: { origin },
});

describe('NW Natural demo account session', () => {
  beforeEach(() => {
    process.env.NWN_DEMO_SESSION_SECRET =
      'a-unique-demo-session-secret-with-32-chars';
    process.env.NWN_DEMO_ACCOUNT_EMAILS =
      'demo@example.com, second@example.com';
  });

  afterEach(() => {
    delete process.env.NWN_DEMO_SESSION_SECRET;
    delete process.env.NWN_DEMO_ACCOUNT_EMAILS;
    delete process.env.SITECORE_EDITING_SECRET;
  });

  it('round-trips a normalized, allowed email in a signed token', () => {
    const token = createAccountSessionToken('  DEMO@EXAMPLE.COM ', NOW);

    expect(readAccountSessionToken(token, NOW + 1)).toEqual({
      email: EMAIL,
      expiresAt: NOW + NWN_ACCOUNT_SESSION_MAX_AGE * 1000,
    });
    expect(
      readAccountSessionToken(token, NOW + NWN_ACCOUNT_SESSION_MAX_AGE * 1000),
    ).toBeUndefined();
  });

  it.each([
    'taylor.morgan@example.com',
    'taylor.morgan@example.org',
    'taylor.morgan@example.net',
  ])(
    'round-trips a normalized reserved-domain registration email: %s',
    (email) => {
      const token = createAccountSessionToken(`  ${email.toUpperCase()} `, NOW);

      expect(readAccountSessionToken(token, NOW + 1)).toEqual({
        email,
        expiresAt: NOW + NWN_ACCOUNT_SESSION_MAX_AGE * 1000,
      });
    },
  );

  it('rejects a tampered signature', () => {
    const token = createAccountSessionToken(EMAIL, NOW);
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(readAccountSessionToken(tampered, NOW + 1)).toBeUndefined();
  });

  it('requires a dedicated session secret', () => {
    delete process.env.NWN_DEMO_SESSION_SECRET;
    process.env.SITECORE_EDITING_SECRET =
      'an-editing-secret-that-must-not-sign-demo-sessions';

    expect(() => createAccountSessionToken(EMAIL, NOW)).toThrow(
      'session secret is not configured',
    );
  });

  it('rejects malformed and non-demo-domain emails and invalid timestamps', () => {
    expect(() => createAccountSessionToken('not-an-email', NOW)).toThrow(
      'session is invalid',
    );
    expect(() =>
      createAccountSessionToken('taylor.morgan@nwnatural.com', NOW),
    ).toThrow('session is invalid');
    expect(() => createAccountSessionToken(EMAIL, Number.NaN)).toThrow(
      'session is invalid',
    );
    expect(() =>
      createAccountSessionToken(EMAIL, Number.MAX_SAFE_INTEGER),
    ).toThrow('session is invalid');
  });

  it('keeps a valid signed session when the login allowlist changes', () => {
    const token = createAccountSessionToken(REGISTERED_EMAIL, NOW);
    process.env.NWN_DEMO_ACCOUNT_EMAILS = 'someone.else@example.com';

    expect(readAccountSessionToken(token, NOW + 1)).toEqual({
      email: REGISTERED_EMAIL,
      expiresAt: NOW + NWN_ACCOUNT_SESSION_MAX_AGE * 1000,
    });
  });

  it('accepts requests with a matching browser origin', () => {
    expect(
      isSameOriginRequest(
        request({
          origin: 'https://nwn.example',
          'sec-fetch-site': 'same-origin',
        }),
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(request({ 'sec-fetch-site': 'same-origin' })),
    ).toBe(true);
  });

  it('rejects cross-site requests and missing browser origin signals', () => {
    expect(
      isSameOriginRequest(
        request({
          origin: 'https://attacker.example',
          'sec-fetch-site': 'cross-site',
        }),
      ),
    ).toBe(false);
    expect(isSameOriginRequest(request({}))).toBe(false);
  });
});
