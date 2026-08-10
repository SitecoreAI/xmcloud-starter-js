import { createHmac, timingSafeEqual } from 'node:crypto';

export const NWN_ACCOUNT_SESSION_COOKIE = 'nwn_demo_account';
export const NWN_ACCOUNT_SESSION_MAX_AGE = 60 * 60;

type AccountSession = {
  email: string;
  expiresAt: number;
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

const GENERATED_DEMO_REGISTRATION_EMAIL =
  /^nwn-live-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})@example\.com$/;

export const isGeneratedDemoRegistrationEmail = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const match = normalizedEmail.match(GENERATED_DEMO_REGISTRATION_EMAIL);
  if (!match) return false;

  const [, year, month, day, hour, minute, second] = match.map(Number);
  const timestamp = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  );

  return (
    timestamp.getUTCFullYear() === year &&
    timestamp.getUTCMonth() === month - 1 &&
    timestamp.getUTCDate() === day &&
    timestamp.getUTCHours() === hour &&
    timestamp.getUTCMinutes() === minute &&
    timestamp.getUTCSeconds() === second
  );
};

const isSessionEligibleDemoAccount = (email: string) =>
  isAllowedDemoAccount(email) || isGeneratedDemoRegistrationEmail(email);

export const createAccountSessionToken = (email: string, now = Date.now()) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (
    !isSessionEligibleDemoAccount(normalizedEmail) ||
    !Number.isSafeInteger(now) ||
    now < 0
  ) {
    throw new Error('The NW Natural demo account session is invalid.');
  }

  const expiresAt = now + NWN_ACCOUNT_SESSION_MAX_AGE * 1000;
  if (!Number.isSafeInteger(expiresAt)) {
    throw new Error('The NW Natural demo account session is invalid.');
  }

  const session: AccountSession = {
    email: normalizedEmail,
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
      typeof parsed.expiresAt !== 'number' ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      parsed.expiresAt <= now
    ) {
      return undefined;
    }

    return {
      email: parsed.email,
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
