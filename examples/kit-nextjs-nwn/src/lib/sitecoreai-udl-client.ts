export class SitecoreAiUdlClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SitecoreAiUdlClientError';
  }
}

export type PaperlessClientResult = {
  paperless: {
    batchId: string;
    changed: boolean;
    value: boolean;
  };
};

type SessionClientResult = {
  session: {
    established: true;
  };
};

type RegistrationClientResult = {
  profile: {
    created: boolean;
    paperlessInitialized: boolean;
    profileId?: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const isPaperlessClientResult = (
  value: unknown,
): value is PaperlessClientResult => {
  if (!isRecord(value) || !isRecord(value.paperless)) return false;

  return (
    typeof value.paperless.batchId === 'string' &&
    typeof value.paperless.changed === 'boolean' &&
    typeof value.paperless.value === 'boolean'
  );
};

const isSessionClientResult = (value: unknown): value is SessionClientResult =>
  isRecord(value) &&
  isRecord(value.session) &&
  value.session.established === true;

const isRegistrationClientResult = (
  value: unknown,
): value is RegistrationClientResult =>
  isRecord(value) &&
  isRecord(value.profile) &&
  typeof value.profile.created === 'boolean' &&
  typeof value.profile.paperlessInitialized === 'boolean' &&
  (value.profile.profileId === undefined ||
    typeof value.profile.profileId === 'string');

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

export const initializeNewUdlProfile = (profile: {
  email: string;
  firstName: string;
  lastName: string;
}) =>
  postJson(
    '/api/account/identify',
    { action: 'registration', ...profile },
    isRegistrationClientResult,
    290_000,
  );

export const submitPaperlessOptIn = () =>
  postJson('/api/account/paperless', {}, isPaperlessClientResult, 170_000);
