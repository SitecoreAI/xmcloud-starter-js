import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createAccountSessionToken,
  isAllowedDemoAccount,
  isSameOriginRequest,
  NWN_ACCOUNT_SESSION_COOKIE,
  NWN_ACCOUNT_SESSION_MAX_AGE,
} from '@/lib/nwn-demo-session';
import {
  initializeNewSitecoreAiProfile,
  SitecoreAiProfileImportError,
} from '@/lib/sitecoreai-profile-import';

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
  if (!isAllowedDemoAccount(email)) {
    return json({ error: 'Account unavailable' }, 403);
  }

  if (parsed.data.action === 'login') {
    try {
      const response = json({ session: { established: true } });
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
    } catch (error) {
      console.error(
        '[NWN account] Could not establish the demo session.',
        error,
      );
      return json({ error: 'Session unavailable' }, 503);
    }
  }

  try {
    const profile = await initializeNewSitecoreAiProfile({
      email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    });
    return json({ profile });
  } catch (error) {
    console.error(
      '[NWN paperless] Could not initialize the SitecoreAI UDL profile.',
      error,
    );
    const status =
      error instanceof SitecoreAiProfileImportError && !error.status
        ? 503
        : 502;
    return json(
      { error: 'The customer profile could not be updated.' },
      status,
    );
  }
}
