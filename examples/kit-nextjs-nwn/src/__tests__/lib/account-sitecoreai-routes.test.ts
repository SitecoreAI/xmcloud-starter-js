/** @jest-environment node */

import { NextRequest } from 'next/server';

import { POST as identify } from '@/app/api/account/identify/route';
import { POST as optIn } from '@/app/api/account/paperless/route';
import {
  createAccountSessionToken,
  NWN_ACCOUNT_SESSION_COOKIE,
} from '@/lib/nwn-demo-session';
import {
  initializeNewSitecoreAiProfile,
  optInSitecoreAiProfileToPaperless,
} from '@/lib/sitecoreai-profile-import';

jest.mock('@/lib/sitecoreai-profile-import', () => ({
  ...jest.requireActual('@/lib/sitecoreai-profile-import'),
  initializeNewSitecoreAiProfile: jest.fn(),
  optInSitecoreAiProfileToPaperless: jest.fn(),
}));

const mockInitializeNewSitecoreAiProfile =
  initializeNewSitecoreAiProfile as jest.MockedFunction<
    typeof initializeNewSitecoreAiProfile
  >;
const mockOptInSitecoreAiProfileToPaperless =
  optInSitecoreAiProfileToPaperless as jest.MockedFunction<
    typeof optInSitecoreAiProfileToPaperless
  >;

const browserHeaders = {
  Origin: 'https://nwn.example',
  'Sec-Fetch-Site': 'same-origin',
  'Content-Type': 'application/json',
};
const GENERATED_EMAIL = 'nwn-live-20260809-143025@example.com';

const identifyRequest = (
  body: Record<string, unknown>,
  headers: Record<string, string> = browserHeaders,
) =>
  new NextRequest('https://nwn.example/api/account/identify', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

describe('NW Natural SitecoreAI account routes', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NWN_DEMO_ACCOUNT_EMAILS = 'demo@example.com';
    process.env.NWN_DEMO_SESSION_SECRET =
      'a-unique-demo-session-secret-with-32-chars';
    mockInitializeNewSitecoreAiProfile.mockResolvedValue({
      created: true,
      paperlessInitialized: true,
      profileId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
    });
    mockOptInSitecoreAiProfileToPaperless.mockResolvedValue({
      batchId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
      changed: true,
      value: true,
    });
    consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
    delete process.env.NWN_DEMO_ACCOUNT_EMAILS;
    delete process.env.NWN_DEMO_SESSION_SECRET;
  });

  it('rejects a request with no browser origin signal', async () => {
    const response = await identifyRequest(
      { action: 'login', email: 'demo@example.com' },
      { 'Content-Type': 'application/json' },
    );

    const result = await identify(response);

    expect(result.status).toBe(403);
    expect(mockInitializeNewSitecoreAiProfile).not.toHaveBeenCalled();
  });

  it('establishes an email-keyed session on login without importing a profile', async () => {
    const response = await identify(
      identifyRequest({ action: 'login', email: '  DEMO@example.com ' }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: { established: true },
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('set-cookie')).toContain(
      `${NWN_ACCOUNT_SESSION_COOKIE}=`,
    );
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=strict');
    expect(mockInitializeNewSitecoreAiProfile).not.toHaveBeenCalled();
  });

  it('initializes a new generated registration profile and signs it in', async () => {
    const response = await identify(
      identifyRequest({
        action: 'registration',
        email: '  NWN-LIVE-20260809-143025@example.com ',
        firstName: '  Taylor ',
        lastName: ' Morgan  ',
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      profile: {
        created: true,
        paperlessInitialized: true,
        profileId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
      },
      session: { established: true },
    });
    expect(mockInitializeNewSitecoreAiProfile).toHaveBeenCalledWith({
      email: GENERATED_EMAIL,
      firstName: 'Taylor',
      lastName: 'Morgan',
    });
    expect(response.headers.get('set-cookie')).toContain(
      `${NWN_ACCOUNT_SESSION_COOKIE}=`,
    );
    expect(response.headers.get('set-cookie')).toContain('Max-Age=3600');
  });

  it('rejects ordinary and malformed emails for registration', async () => {
    const ordinaryResponse = await identify(
      identifyRequest({
        action: 'registration',
        email: 'demo@example.com',
        firstName: 'Taylor',
        lastName: 'Morgan',
      }),
    );
    const malformedResponse = await identify(
      identifyRequest({
        action: 'registration',
        email: 'nwn-live-20260230-143025@example.com',
        firstName: 'Taylor',
        lastName: 'Morgan',
      }),
    );

    expect(ordinaryResponse.status).toBe(403);
    expect(malformedResponse.status).toBe(403);
    expect(mockInitializeNewSitecoreAiProfile).not.toHaveBeenCalled();
  });

  it('keeps generated registration emails unavailable to ordinary login', async () => {
    const response = await identify(
      identifyRequest({ action: 'login', email: GENERATED_EMAIL }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('returns 409 without a session when a generated email was already used', async () => {
    mockInitializeNewSitecoreAiProfile.mockResolvedValueOnce({
      created: false,
      paperlessInitialized: false,
      profileId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
    });

    const response = await identify(
      identifyRequest({
        action: 'registration',
        email: GENERATED_EMAIL,
        firstName: 'Taylor',
        lastName: 'Morgan',
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Demo account already used' });
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('uses a signed generated registration email for an explicit opt-in', async () => {
    const token = createAccountSessionToken(GENERATED_EMAIL.toUpperCase());

    const response = await optIn(
      new NextRequest('https://nwn.example/api/account/paperless', {
        method: 'POST',
        headers: {
          ...browserHeaders,
          Cookie: `${NWN_ACCOUNT_SESSION_COOKIE}=${token}`,
        },
        body: '{}',
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      paperless: {
        batchId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
        changed: true,
        value: true,
      },
    });
    expect(mockOptInSitecoreAiProfileToPaperless).toHaveBeenCalledWith(
      GENERATED_EMAIL,
    );
  });

  it('clears an invalid session cookie without importing a profile', async () => {
    const response = await optIn(
      new NextRequest('https://nwn.example/api/account/paperless', {
        method: 'POST',
        headers: {
          ...browserHeaders,
          Cookie: `${NWN_ACCOUNT_SESSION_COOKIE}=invalid`,
        },
        body: '{}',
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toContain(
      `${NWN_ACCOUNT_SESSION_COOKIE}=`,
    );
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(mockOptInSitecoreAiProfileToPaperless).not.toHaveBeenCalled();
  });
});
