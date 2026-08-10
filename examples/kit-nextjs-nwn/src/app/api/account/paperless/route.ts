import { NextRequest, NextResponse } from 'next/server';

import {
  isSameOriginRequest,
  NWN_ACCOUNT_SESSION_COOKIE,
  readAccountSessionToken,
} from '@/lib/nwn-demo-session';
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

  return json({ session: { verified: true, email: session.email } });
}
