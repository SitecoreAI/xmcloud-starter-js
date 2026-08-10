/** @jest-environment node */

import { NextRequest } from 'next/server';

import { POST as identify } from '@/app/api/account/identify/route';
import { POST as optIn } from '@/app/api/account/paperless/route';
import {
  createAccountSessionToken,
  NWN_ACCOUNT_SESSION_COOKIE,
} from '@/lib/nwn-demo-session';

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
    process.env.NWN_DEMO_ACCOUNT_EMAILS = 'demo@example.com';
    process.env.NWN_DEMO_SESSION_SECRET =
      'a-unique-demo-session-secret-with-32-chars';
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
  });

  it('signs in a generated registration email without importing a profile', async () => {
    const response = await identify(
      identifyRequest({
        action: 'registration',
        email: '  NWN-LIVE-20260809-143025@example.com ',
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
  });

  it('rejects ordinary and malformed emails for registration', async () => {
    const ordinaryResponse = await identify(
      identifyRequest({ action: 'registration', email: 'demo@example.com' }),
    );
    const malformedResponse = await identify(
      identifyRequest({
        action: 'registration',
        email: 'nwn-live-20260230-143025@example.com',
      }),
    );

    expect(ordinaryResponse.status).toBe(403);
    expect(malformedResponse.status).toBe(403);
  });

  it('keeps generated registration emails unavailable to ordinary login', async () => {
    const response = await identify(
      identifyRequest({ action: 'login', email: GENERATED_EMAIL }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('verifies a signed registration session before the opt-in event', async () => {
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
      session: { verified: true, email: GENERATED_EMAIL },
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
        body: '{}',
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toContain(
      `${NWN_ACCOUNT_SESSION_COOKIE}=`,
    );
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
