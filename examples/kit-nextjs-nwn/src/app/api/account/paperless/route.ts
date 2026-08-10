import { NextRequest, NextResponse } from 'next/server';

import {
  isSameOriginRequest,
  NWN_ACCOUNT_SESSION_COOKIE,
  readAccountSessionToken,
} from '@/lib/nwn-demo-session';
import { optInSitecoreAiProfileToPaperless } from '@/lib/sitecoreai-profile-import';

export const dynamic = 'force-dynamic';

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return json({ error: 'Forbidden' }, 403);
  }

  let action: unknown;
  try {
    ({ action } = (await request.json()) as { action?: unknown });
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (action !== 'verify' && action !== 'opt-in') {
    return json({ error: 'Invalid request' }, 400);
  }

  let session;
  try {
    session = readAccountSessionToken(
      request.cookies.get(NWN_ACCOUNT_SESSION_COOKIE)?.value,
    );
  } catch (error) {
    console.error('[NWN paperless] The demo session is not configured.', error);
    return json({ error: 'Session unavailable' }, 503);
  }

  if (!session) {
    const response = json({ error: 'Sign in required' }, 401);
    response.cookies.set({
      name: NWN_ACCOUNT_SESSION_COOKIE,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
    return response;
  }

  if (action === 'verify') {
    return json({ session: { verified: true, email: session.email } });
  }

  try {
    await optInSitecoreAiProfileToPaperless(session.email);
  } catch (error) {
    console.error(
      '[NWN paperless] The Unified Data profile could not be updated.',
      error,
    );
    return json({ error: 'Paperless preference update failed' }, 503);
  }

  return json({
    session: { verified: true, email: session.email },
    paperless: { updated: true, value: true },
  });
}
