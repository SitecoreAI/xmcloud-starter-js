import { createHash } from 'node:crypto';
import { z } from 'zod';

export type SitecoreAiProfileRecord = {
  recordType: 'profile';
  identifiers: Array<{
    provider: string;
    id: string;
  }>;
  contact?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  extensions?: Record<string, unknown>;
};

export type ProfileImportOutcome = 'CREATED' | 'UPDATED';

type BatchState =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED';

type BatchUploadResponse = {
  batchId?: unknown;
  status?: unknown;
};

type BatchStatusResponse = {
  batchId?: unknown;
  status?: unknown;
  totalRecords?: unknown;
  succeededRecords?: unknown;
  failedRecords?: unknown;
};

type BatchResultRecord = {
  recordIndex?: unknown;
  outcome?: unknown;
  profileId?: unknown;
  errorCode?: unknown;
  errorDescription?: unknown;
};

type ProfileImportOptions = {
  maxPollAttempts?: number;
  pollIntervalMs?: number;
};

export type ProfileImportResult = {
  batchId: string;
  outcome: ProfileImportOutcome;
  profileId?: string;
};

export type NewProfileInitializationResult = {
  created: boolean;
  paperlessInitialized: boolean;
  profileId?: string;
};

export type PaperlessUpdateResult = {
  batchId: string;
  changed: boolean;
  value: true;
};

export class SitecoreAiProfileImportError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SitecoreAiProfileImportError';
  }
}

const BATCH_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FINAL_BATCH_STATES = new Set<BatchState>([
  'COMPLETED',
  'COMPLETED_WITH_ERRORS',
  'FAILED',
]);
const ACTIVE_BATCH_STATES = new Set<BatchState>(['QUEUED', 'RUNNING']);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getConfiguration = () => {
  const configuredEndpoint =
    process.env.SITECOREAI_PROFILE_IMPORT_ENDPOINT?.trim();
  const apiKey = process.env.SITECOREAI_PROFILE_IMPORT_API_KEY?.trim();

  if (!configuredEndpoint || !apiKey) {
    throw new SitecoreAiProfileImportError(
      'SitecoreAI Profile Import credentials are not configured.',
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(configuredEndpoint);
  } catch {
    throw new SitecoreAiProfileImportError(
      'The SitecoreAI Profile Import endpoint is invalid.',
    );
  }

  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new SitecoreAiProfileImportError(
      'The SitecoreAI Profile Import endpoint must be HTTPS.',
    );
  }

  const basePath = endpoint.pathname.replace(/\/+$/, '');
  endpoint.pathname = basePath.endsWith('/v1/batches')
    ? basePath
    : `${basePath}/v1/batches`;

  return {
    batchesUrl: endpoint.toString().replace(/\/$/, ''),
    authorization: `ApiKey ${apiKey}`,
  };
};

const profileImportRequest = async (
  url: string,
  init: RequestInit = {},
): Promise<Response> => {
  const { authorization } = getConfiguration();
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
        ...init.headers,
      },
      signal: init.signal || AbortSignal.timeout(15_000),
    });
  } catch {
    throw new SitecoreAiProfileImportError(
      'The SitecoreAI Profile Import API could not be reached.',
    );
  }

  if (!response.ok) {
    throw new SitecoreAiProfileImportError(
      `SitecoreAI Profile Import returned ${response.status}.`,
      response.status,
    );
  }

  return response;
};

const readJson = async <T>(response: Response): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new SitecoreAiProfileImportError(
      'SitecoreAI Profile Import returned invalid JSON.',
      502,
    );
  }
};

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds));

const isBatchState = (value: unknown): value is BatchState =>
  typeof value === 'string' &&
  (ACTIVE_BATCH_STATES.has(value as BatchState) ||
    FINAL_BATCH_STATES.has(value as BatchState));

const parseResultFile = async (
  response: Response,
): Promise<BatchResultRecord[]> => {
  const body = await response.text();

  try {
    return body
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as BatchResultRecord);
  } catch {
    throw new SitecoreAiProfileImportError(
      'SitecoreAI Profile Import returned an invalid results file.',
      502,
    );
  }
};

const uploadBatch = async (records: readonly SitecoreAiProfileRecord[]) => {
  const { batchesUrl } = getConfiguration();
  const jsonl = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
  const form = new FormData();

  form.set(
    'file',
    new Blob([jsonl], { type: 'application/x-ndjson' }),
    'nwn-sitecoreai-profiles.jsonl',
  );
  form.set('md5', createHash('md5').update(jsonl).digest('hex'));

  const response = await profileImportRequest(batchesUrl, {
    method: 'POST',
    body: form,
  });
  const payload = await readJson<BatchUploadResponse>(response);

  if (
    response.status !== 202 ||
    typeof payload.batchId !== 'string' ||
    !BATCH_ID_PATTERN.test(payload.batchId)
  ) {
    throw new SitecoreAiProfileImportError(
      'SitecoreAI Profile Import did not return a valid batch identifier.',
      502,
    );
  }

  return { batchId: payload.batchId, batchesUrl };
};

const waitForBatch = async (
  batchesUrl: string,
  batchId: string,
  options: ProfileImportOptions,
) => {
  const maxPollAttempts = options.maxPollAttempts ?? 180;
  const pollIntervalMs = options.pollIntervalMs ?? 750;

  if (
    !Number.isInteger(maxPollAttempts) ||
    maxPollAttempts < 1 ||
    !Number.isFinite(pollIntervalMs) ||
    pollIntervalMs < 0
  ) {
    throw new SitecoreAiProfileImportError(
      'The SitecoreAI Profile Import polling configuration is invalid.',
    );
  }

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    if (attempt > 0 && pollIntervalMs > 0) await delay(pollIntervalMs);

    const response = await profileImportRequest(
      `${batchesUrl}/${encodeURIComponent(batchId)}/status`,
    );
    const status = await readJson<BatchStatusResponse>(response);

    if (!isBatchState(status.status)) {
      throw new SitecoreAiProfileImportError(
        'SitecoreAI Profile Import returned an unknown batch state.',
        502,
      );
    }

    if (ACTIVE_BATCH_STATES.has(status.status)) continue;

    if (
      status.status !== 'COMPLETED' ||
      status.failedRecords !== 0 ||
      typeof status.succeededRecords !== 'number' ||
      status.succeededRecords < 1
    ) {
      throw new SitecoreAiProfileImportError(
        `SitecoreAI Profile Import batch ${batchId} finished with ${status.status}.`,
        502,
      );
    }

    return;
  }

  throw new SitecoreAiProfileImportError(
    `SitecoreAI Profile Import batch ${batchId} did not finish in time.`,
    504,
  );
};

let importQueue = Promise.resolve();

const serializeImport = async <T>(operation: () => Promise<T>): Promise<T> => {
  const previous = importQueue;
  let release: () => void = () => undefined;
  importQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await operation();
  } finally {
    release();
  }
};

/** Uploads records and resolves only after the batch and result file succeed. */
export const importSitecoreAiProfiles = async (
  records: readonly SitecoreAiProfileRecord[],
  options: ProfileImportOptions = {},
): Promise<ProfileImportResult[]> => {
  if (records.length < 1) {
    throw new SitecoreAiProfileImportError(
      'A SitecoreAI Profile Import batch cannot be empty.',
    );
  }

  return serializeImport(async () => {
    const { batchId, batchesUrl } = await uploadBatch(records);
    await waitForBatch(batchesUrl, batchId, options);

    const resultsResponse = await profileImportRequest(
      `${batchesUrl}/${encodeURIComponent(batchId)}/results`,
    );
    const results = await parseResultFile(resultsResponse);

    return records.map((_, recordIndex) => {
      const result = results.find(
        (candidate) => candidate.recordIndex === recordIndex,
      );

      if (
        !result ||
        (result.outcome !== 'CREATED' && result.outcome !== 'UPDATED')
      ) {
        const detail =
          typeof result?.errorDescription === 'string'
            ? ` ${result.errorDescription}`
            : '';
        throw new SitecoreAiProfileImportError(
          `SitecoreAI Profile Import record ${recordIndex} failed.${detail}`,
          502,
        );
      }

      return {
        batchId,
        outcome: result.outcome,
        ...(typeof result.profileId === 'string'
          ? { profileId: result.profileId }
          : {}),
      };
    });
  });
};

const emailIdentifier = (email: string) => ({
  provider: 'email',
  id: normalizeEmail(email),
});

/**
 * Creates or matches the registration profile without touching paperless.
 * The false default is imported only when the first batch proves it was new.
 */
export const initializeNewSitecoreAiProfile = async (profile: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<NewProfileInitializationResult> => {
  const email = normalizeEmail(profile.email);
  const isValidEmail = z.string().email().safeParse(email).success;
  const [resolvedProfile] = await importSitecoreAiProfiles([
    {
      recordType: 'profile',
      identifiers: [emailIdentifier(email)],
      contact: {
        ...(isValidEmail ? { email } : {}),
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
      },
    },
  ]);

  if (resolvedProfile.outcome !== 'CREATED') {
    return {
      created: false,
      paperlessInitialized: false,
      profileId: resolvedProfile.profileId,
    };
  }

  const [paperlessProfile] = await importSitecoreAiProfiles([
    {
      recordType: 'profile',
      identifiers: [emailIdentifier(email)],
      extensions: { paperless: false },
    },
  ]);

  return {
    created: true,
    paperlessInitialized: true,
    profileId: paperlessProfile.profileId || resolvedProfile.profileId,
  };
};

/** Persists the explicit paperless opt-in in the SitecoreAI UDL profile. */
export const optInSitecoreAiProfileToPaperless = async (
  email: string,
): Promise<PaperlessUpdateResult> => {
  const normalizedEmail = normalizeEmail(email);
  const [result] = await importSitecoreAiProfiles([
    {
      recordType: 'profile',
      identifiers: [emailIdentifier(normalizedEmail)],
      extensions: { paperless: true },
    },
  ]);

  return {
    batchId: result.batchId,
    changed: true,
    value: true,
  };
};
