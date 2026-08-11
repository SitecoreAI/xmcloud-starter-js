import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const NWN_ACCOUNT_SESSION_COOKIE = 'nwn_demo_account';
export const NWN_ACCOUNT_SESSION_MAX_AGE = 60 * 60;

type AccountSession = {
  email: string;
  paperless: boolean;
  expiresAt: number;
};

const DEFAULT_PAPERLESS_DEMO_ACCOUNTS = [
  'nwn-demo-07@example.com',
  'nwn-demo-08@example.com',
  'nwn-demo-09@example.com',
  'nwn-demo-10@example.com',
] as const;

/**
 * Keeps seeded demo-account state deterministic without a Unified Data read.
 * Defining NWN_DEMO_PAPERLESS_ACCOUNT_EMAILS replaces the built-in 07-10 set.
 */
export const isPaperlessDemoAccount = (email: string) => {
  const configuredEmails = process.env.NWN_DEMO_PAPERLESS_ACCOUNT_EMAILS;
  const paperlessEmails = (
    configuredEmails === undefined
      ? DEFAULT_PAPERLESS_DEMO_ACCOUNTS
      : configuredEmails.split(',')
  )
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return paperlessEmails.includes(email.trim().toLowerCase());
};

const getSessionSecret = () => {
  const secret = process.env.NWN_DEMO_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('The NW Natural demo session secret is not configured.');
  }

  return secret;
};

const sign = (payload: string) =>
  createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');

const demoRegistrationIdentitySchema = z
  .string()
  .trim()
  .min(1)
  .max(254)
  .transform((identity) => identity.toLowerCase());

/** Accepts any nonempty identity string for this registration-only demo. */
export const isDemoRegistrationIdentity = (identity: string) =>
  demoRegistrationIdentitySchema.safeParse(identity).success;

const isSessionEligibleDemoAccount = (email: string) =>
  isAllowedDemoAccount(email) || isDemoRegistrationIdentity(email);

export const createAccountSessionToken = (
  email: string,
  now = Date.now(),
  paperless = isPaperlessDemoAccount(email),
) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (
    !isSessionEligibleDemoAccount(normalizedEmail) ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    typeof paperless !== 'boolean'
  ) {
    throw new Error('The NW Natural demo account session is invalid.');
  }

  const expiresAt = now + NWN_ACCOUNT_SESSION_MAX_AGE * 1000;
  if (!Number.isSafeInteger(expiresAt)) {
    throw new Error('The NW Natural demo account session is invalid.');
  }

  const session: AccountSession = {
    email: normalizedEmail,
    paperless,
    expiresAt,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

export const readAccountSessionToken = (
  token: string | undefined,
  now = Date.now(),
): AccountSession | undefined => {
  if (!token) return undefined;
  if (!Number.isSafeInteger(now) || now < 0) return undefined;

  const [payload, suppliedSignature, extra] = token.split('.');
  if (!payload || !suppliedSignature || extra) return undefined;

  const expectedSignature = sign(payload);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Partial<AccountSession>;

    if (
      typeof parsed.email !== 'string' ||
      !isSessionEligibleDemoAccount(parsed.email) ||
      parsed.email !== parsed.email.trim().toLowerCase() ||
      typeof parsed.paperless !== 'boolean' ||
      typeof parsed.expiresAt !== 'number' ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      parsed.expiresAt <= now
    ) {
      return undefined;
    }

    return {
      email: parsed.email,
      paperless: parsed.paperless,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return undefined;
  }
};

type OriginBoundRequest = {
  headers: {
    get(name: string): string | null;
  };
  nextUrl: {
    origin: string;
  };
};

/** Rejects cross-site requests and requests with neither browser origin signal. */
export const isSameOriginRequest = (request: OriginBoundRequest) => {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (fetchSite && fetchSite !== 'same-origin') return false;

  if (origin) {
    try {
      return new URL(origin).origin === request.nextUrl.origin;
    } catch {
      return false;
    }
  }

  return fetchSite === 'same-origin';
};

export const isAllowedDemoAccount = (email: string) => {
  const allowedEmails = (process.env.NWN_DEMO_ACCOUNT_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(email.trim().toLowerCase());
};
