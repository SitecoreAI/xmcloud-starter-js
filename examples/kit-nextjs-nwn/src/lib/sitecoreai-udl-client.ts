export class SitecoreAiUdlClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SitecoreAiUdlClientError';
  }
}

type SessionClientResult = {
  session: {
    established: true;
  };
};

type EndedSessionClientResult = {
  session: {
    ended: true;
  };
};

type VerifiedSessionClientResult = {
  session: {
    verified: true;
    email: string;
  };
};

type PaperlessOptInClientResult = VerifiedSessionClientResult & {
  paperless: {
    updated: true;
    value: true;
  };
};

export const NWN_ACCOUNT_SESSION_CHANGED_EVENT = 'nwn-account-session-changed';

export type DemoAccountSessionState = 'anonymous' | 'identified';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const isSessionClientResult = (value: unknown): value is SessionClientResult =>
  isRecord(value) &&
  isRecord(value.session) &&
  value.session.established === true;

const isEndedSessionClientResult = (
  value: unknown,
): value is EndedSessionClientResult =>
  isRecord(value) && isRecord(value.session) && value.session.ended === true;

const isVerifiedSessionClientResult = (
  value: unknown,
): value is VerifiedSessionClientResult =>
  isRecord(value) &&
  isRecord(value.session) &&
  value.session.verified === true &&
  typeof value.session.email === 'string' &&
  value.session.email === value.session.email.trim().toLowerCase();

const isPaperlessOptInClientResult = (
  value: unknown,
): value is PaperlessOptInClientResult => {
  if (!isRecord(value) || !isVerifiedSessionClientResult(value)) return false;
  const paperless = (value as Record<string, unknown>).paperless;

  return (
    isRecord(paperless) &&
    paperless.updated === true &&
    paperless.value === true
  );
};

const postJson = async <T>(
  path: string,
  body: Record<string, unknown>,
  isResult: (value: unknown) => value is T,
  timeoutMs: number,
): Promise<T> => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(path, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new SitecoreAiUdlClientError(
      'The SitecoreAI UDL request could not be completed.',
    );
  } finally {
    globalThis.clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new SitecoreAiUdlClientError(
      'The SitecoreAI UDL request was not accepted.',
      response.status,
    );
  }

  try {
    const result: unknown = await response.json();
    if (!isResult(result)) throw new Error('Invalid response');
    return result;
  } catch {
    throw new SitecoreAiUdlClientError(
      'The SitecoreAI UDL response was invalid.',
      response.status,
    );
  }
};

export const establishDemoAccountSession = (email: string) =>
  postJson(
    '/api/account/identify',
    { action: 'login', email },
    isSessionClientResult,
    15_000,
  );

export const establishDemoRegistrationSession = (profile: {
  email: string;
  firstName: string;
  lastName: string;
}) =>
  postJson(
    '/api/account/identify',
    { action: 'registration', ...profile },
    isSessionClientResult,
    290_000,
  );

export const verifyDemoAccountSession = () =>
  postJson(
    '/api/account/paperless',
    { action: 'verify' },
    isVerifiedSessionClientResult,
    15_000,
  );

export const verifyPaperlessOptInSession = verifyDemoAccountSession;

const expireVisitorCookie = (name: string) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const expires = `; Max-Age=0; Path=/${secure}`;
  document.cookie = `${name}=${expires}`;

  const hostname = window.location.hostname.replace(/^www\./, '');
  if (
    hostname &&
    hostname !== 'localhost' &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  ) {
    document.cookie = `${name}=${expires}; Domain=${hostname}`;
  }
};

export const clearSitecoreAiVisitor = async () => {
  if (typeof window === 'undefined') return;

  try {
    await window.scContentSDK?.events?.clearEventQueue?.();
  } catch {
    // A visitor reset must still continue when there is no queued-events plugin.
  }

  const contextId = window.scContentSDK?.analytics_core?.options?.contextId;
  const cookieNames = new Set(['sc_cid', 'sc_cid_personalize']);
  if (contextId) {
    cookieNames.add(`sc_${contextId}`);
    cookieNames.add(`sc_${contextId}_personalize`);
  }

  cookieNames.forEach(expireVisitorCookie);
};

export const notifyDemoAccountSessionChanged = (
  state: DemoAccountSessionState,
) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<DemoAccountSessionState>(
      NWN_ACCOUNT_SESSION_CHANGED_EVENT,
      { detail: state },
    ),
  );
};

export const navigateAfterDemoAccountSignOut = (path: string) => {
  if (typeof window === 'undefined') return;

  window.location.replace(path);
};

export const endDemoAccountSession = async () => {
  const result = await postJson(
    '/api/account/session',
    { action: 'sign-out' },
    isEndedSessionClientResult,
    15_000,
  );

  await clearSitecoreAiVisitor();
  return result;
};

export const optInDemoAccountToPaperless = () =>
  postJson(
    '/api/account/paperless',
    { action: 'opt-in' },
    isPaperlessOptInClientResult,
    60_000,
  );
