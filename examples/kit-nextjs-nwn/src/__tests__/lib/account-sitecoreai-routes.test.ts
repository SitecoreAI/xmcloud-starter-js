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
      profileId: 'new-profile-id',
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
    const request = identifyRequest(
      { action: 'login', email: 'demo@example.com' },
      { 'Content-Type': 'application/json' },
    );

    expect((await identify(request)).status).toBe(403);
  });

  it('establishes an email-keyed session on login', async () => {
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
    expect(mockOptInSitecoreAiProfileToPaperless).not.toHaveBeenCalled();
  });

  it('initializes a new profile before establishing its registration session', async () => {
    const response = await identify(
      identifyRequest({
        action: 'registration',
        email: '  NWN-LIVE-20260809-143025@example.com ',
        firstName: ' Taylor ',
        lastName: ' Morgan ',
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: { established: true },
    });
    expect(response.headers.get('set-cookie')).toContain(
      `${NWN_ACCOUNT_SESSION_COOKIE}=`,
    );
    expect(response.headers.get('set-cookie')).toContain('Max-Age=3600');
    expect(mockInitializeNewSitecoreAiProfile).toHaveBeenCalledWith({
      email: GENERATED_EMAIL,
      firstName: 'Taylor',
      lastName: 'Morgan',
    });
  });

  it('preserves an existing paperless profile while establishing the session', async () => {
    mockInitializeNewSitecoreAiProfile.mockResolvedValueOnce({
      created: false,
      paperlessInitialized: false,
      profileId: 'existing-paperless-profile-id',
    });

    const response = await identify(
      identifyRequest({
        action: 'registration',
        email: GENERATED_EMAIL,
        firstName: 'Taylor',
        lastName: 'Morgan',
      }),
    );

    expect(response.status).toBe(200);
    expect(mockInitializeNewSitecoreAiProfile).toHaveBeenCalledTimes(1);
    expect(response.headers.get('set-cookie')).toContain(
      `${NWN_ACCOUNT_SESSION_COOKIE}=`,
    );
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

  it('does not establish a session when profile initialization fails', async () => {
    mockInitializeNewSitecoreAiProfile.mockRejectedValueOnce(
      new Error('Profile Import unavailable'),
    );

    const response = await identify(
      identifyRequest({
        action: 'registration',
        email: GENERATED_EMAIL,
        firstName: 'Taylor',
        lastName: 'Morgan',
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('keeps generated registration emails unavailable to ordinary login', async () => {
    const response = await identify(
      identifyRequest({ action: 'login', email: GENERATED_EMAIL }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('verifies a signed session without changing its paperless preference', async () => {
    const token = createAccountSessionToken(GENERATED_EMAIL.toUpperCase());

    const response = await optIn(
      new NextRequest('https://nwn.example/api/account/paperless', {
        method: 'POST',
        headers: {
          ...browserHeaders,
          Cookie: `${NWN_ACCOUNT_SESSION_COOKIE}=${token}`,
        },
        body: JSON.stringify({ action: 'verify' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: { verified: true, email: GENERATED_EMAIL },
    });
    expect(mockOptInSitecoreAiProfileToPaperless).not.toHaveBeenCalled();
  });

  it('updates the signed Unified Data profile on explicit paperless opt-in', async () => {
    const token = createAccountSessionToken(GENERATED_EMAIL.toUpperCase());

    const response = await optIn(
      new NextRequest('https://nwn.example/api/account/paperless', {
        method: 'POST',
        headers: {
          ...browserHeaders,
          Cookie: `${NWN_ACCOUNT_SESSION_COOKIE}=${token}`,
        },
        body: JSON.stringify({ action: 'opt-in' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: { verified: true, email: GENERATED_EMAIL },
      paperless: { updated: true, value: true },
    });
    expect(mockOptInSitecoreAiProfileToPaperless).toHaveBeenCalledWith(
      GENERATED_EMAIL,
    );
  });

  it('reports a visible failure when the Unified Data profile update fails', async () => {
    mockOptInSitecoreAiProfileToPaperless.mockRejectedValueOnce(
      new Error('Profile Import unavailable'),
    );
    const token = createAccountSessionToken(GENERATED_EMAIL);

    const response = await optIn(
      new NextRequest('https://nwn.example/api/account/paperless', {
        method: 'POST',
        headers: {
          ...browserHeaders,
          Cookie: `${NWN_ACCOUNT_SESSION_COOKIE}=${token}`,
        },
        body: JSON.stringify({ action: 'opt-in' }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Paperless preference update failed',
    });
  });

  it('clears an invalid session cookie', async () => {
    const response = await optIn(
      new NextRequest('https://nwn.example/api/account/paperless', {
        method: 'POST',
        headers: {
          ...browserHeaders,
          Cookie: `${NWN_ACCOUNT_SESSION_COOKIE}=invalid`,
        },
        body: JSON.stringify({ action: 'verify' }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toContain(
      `${NWN_ACCOUNT_SESSION_COOKIE}=`,
    );
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
