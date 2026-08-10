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

type VerifiedSessionClientResult = {
  session: {
    verified: true;
    email: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const isSessionClientResult = (value: unknown): value is SessionClientResult =>
  isRecord(value) &&
  isRecord(value.session) &&
  value.session.established === true;

const isVerifiedSessionClientResult = (
  value: unknown,
): value is VerifiedSessionClientResult =>
  isRecord(value) &&
  isRecord(value.session) &&
  value.session.verified === true &&
  typeof value.session.email === 'string' &&
  value.session.email === value.session.email.trim().toLowerCase();

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

export const establishDemoRegistrationSession = (email: string) =>
  postJson(
    '/api/account/identify',
    { action: 'registration', email },
    isSessionClientResult,
    15_000,
  );

export const verifyPaperlessOptInSession = () =>
  postJson(
    '/api/account/paperless',
    {},
    isVerifiedSessionClientResult,
    15_000,
  );
