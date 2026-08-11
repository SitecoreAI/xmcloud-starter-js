import { NextRequest, NextResponse } from 'next/server';

import {
  isSameOriginRequest,
  NWN_ACCOUNT_SESSION_COOKIE,
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

  let action: unknown;
  try {
    ({ action } = (await request.json()) as { action?: unknown });
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (action !== 'sign-out') {
    return json({ error: 'Invalid request' }, 400);
  }

  const response = json({ session: { ended: true } });
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
