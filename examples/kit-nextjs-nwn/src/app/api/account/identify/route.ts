import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createAccountSessionToken,
  isAllowedDemoAccount,
  isDemoRegistrationEmail,
  isSameOriginRequest,
  NWN_ACCOUNT_SESSION_COOKIE,
  NWN_ACCOUNT_SESSION_MAX_AGE,
} from '@/lib/nwn-demo-session';
import { initializeNewSitecoreAiProfile } from '@/lib/sitecoreai-profile-import';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const requestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('login'),
    email: z.string().trim().email().max(254),
  }),
  z.object({
    action: z.literal('registration'),
    email: z.string().trim().email().max(254),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
  }),
]);

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

const sessionResponse = (email: string, body: object) => {
  const response = json(body);
  response.cookies.set({
    name: NWN_ACCOUNT_SESSION_COOKIE,
    value: createAccountSessionToken(email),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: NWN_ACCOUNT_SESSION_MAX_AGE,
    priority: 'high',
  });
  return response;
};

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return json({ error: 'Forbidden' }, 403);
  }

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return json({ error: 'Invalid request' }, 400);
  }

  const email = parsed.data.email.toLowerCase();

  if (parsed.data.action === 'login') {
    if (!isAllowedDemoAccount(email)) {
      return json({ error: 'Account unavailable' }, 403);
    }

    try {
      return sessionResponse(email, { session: { established: true } });
    } catch (error) {
      console.error(
        '[NWN account] Could not establish the demo session.',
        error,
      );
      return json({ error: 'Session unavailable' }, 503);
    }
  }

  if (!isDemoRegistrationEmail(email)) {
    return json({ error: 'Account unavailable' }, 403);
  }

  try {
    await initializeNewSitecoreAiProfile({
      email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    });
    return sessionResponse(email, { session: { established: true } });
  } catch (error) {
    console.error(
      '[NWN account] Could not initialize the registered demo account.',
      error,
    );
    return json({ error: 'Session unavailable' }, 503);
  }
}
