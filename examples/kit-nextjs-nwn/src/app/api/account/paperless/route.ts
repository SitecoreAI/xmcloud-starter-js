import { NextRequest, NextResponse } from 'next/server';

import {
  isSameOriginRequest,
  NWN_ACCOUNT_SESSION_COOKIE,
  readAccountSessionToken,
} from '@/lib/nwn-demo-session';
import {
  optInSitecoreAiProfileToPaperless,
  SitecoreAiProfileImportError,
} from '@/lib/sitecoreai-profile-import';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return json({ error: 'Forbidden' }, 403);
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

  try {
    const paperless = await optInSitecoreAiProfileToPaperless(session.email);
    return json({ paperless });
  } catch (error) {
    console.error(
      '[NWN paperless] Could not save the SitecoreAI UDL opt-in.',
      error,
    );
    const status =
      error instanceof SitecoreAiProfileImportError && !error.status
        ? 503
        : 502;
    return json(
      { error: 'The paperless preference could not be saved.' },
      status,
    );
  }
}
