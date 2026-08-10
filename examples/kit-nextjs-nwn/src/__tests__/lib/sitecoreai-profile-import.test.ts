/** @jest-environment node */

import {
  importSitecoreAiProfiles,
  initializeNewSitecoreAiProfile,
  optInSitecoreAiProfileToPaperless,
  SitecoreAiProfileImportError,
} from '@/lib/sitecoreai-profile-import';

const BATCH_ONE = '7dc912e2-4fb9-4340-ae1d-4239399e3f97';
const BATCH_TWO = 'a3ead7a8-d059-4e0e-8fd2-b5401bfd8c7d';
const PROFILE_ONE = '76ac4984-cff8-4b3d-3071-08ded696f4f5';
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = global.fetch;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const resultResponse = (
  outcome: 'CREATED' | 'UPDATED',
  profileId = PROFILE_ONE,
) =>
  new Response(`${JSON.stringify({ recordIndex: 0, outcome, profileId })}\n`, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  });

const mockCompletedBatch = (
  batchId: string,
  outcome: 'CREATED' | 'UPDATED',
) => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ batchId, status: 'QUEUED' }, 202))
    .mockResolvedValueOnce(
      jsonResponse({
        batchId,
        status: 'COMPLETED',
        totalRecords: 1,
        succeededRecords: 1,
        failedRecords: 0,
      }),
    )
    .mockResolvedValueOnce(resultResponse(outcome));
};

const uploadedRecord = async (callIndex: number) => {
  const body = fetchMock.mock.calls[callIndex][1]?.body;
  if (!(body instanceof FormData)) throw new Error('Expected FormData');
  const file = body.get('file');
  if (!(file instanceof Blob)) throw new Error('Expected JSONL Blob');
  return JSON.parse((await file.text()).trim()) as Record<string, unknown>;
};

describe('SitecoreAI Profile Import', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    process.env.SITECOREAI_PROFILE_IMPORT_ENDPOINT =
      'https://profiles.example.test/import';
    process.env.SITECOREAI_PROFILE_IMPORT_API_KEY = 'sitecoreai-api-key';
  });

  afterEach(() => {
    delete process.env.SITECOREAI_PROFILE_IMPORT_ENDPOINT;
    delete process.env.SITECOREAI_PROFILE_IMPORT_API_KEY;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('uploads JSONL with MD5 authentication and polls before reading results', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ batchId: BATCH_ONE, status: 'QUEUED' }, 202),
      )
      .mockResolvedValueOnce(
        jsonResponse({ batchId: BATCH_ONE, status: 'RUNNING' }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          batchId: BATCH_ONE,
          status: 'COMPLETED',
          totalRecords: 1,
          succeededRecords: 1,
          failedRecords: 0,
        }),
      )
      .mockResolvedValueOnce(resultResponse('UPDATED'));

    await expect(
      importSitecoreAiProfiles(
        [
          {
            recordType: 'profile',
            identifiers: [{ provider: 'email', id: 'demo@example.com' }],
            extensions: { paperless: true },
          },
        ],
        { maxPollAttempts: 3, pollIntervalMs: 0 },
      ),
    ).resolves.toEqual([
      { batchId: BATCH_ONE, outcome: 'UPDATED', profileId: PROFILE_ONE },
    ]);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://profiles.example.test/import/v1/batches',
      `https://profiles.example.test/import/v1/batches/${BATCH_ONE}/status`,
      `https://profiles.example.test/import/v1/batches/${BATCH_ONE}/status`,
      `https://profiles.example.test/import/v1/batches/${BATCH_ONE}/results`,
    ]);
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'ApiKey sitecoreai-api-key',
      }),
    );
    const uploadBody = fetchMock.mock.calls[0][1]?.body;
    expect(uploadBody).toBeInstanceOf(FormData);
    expect((uploadBody as FormData).get('md5')).toMatch(/^[0-9a-f]{32}$/);
    expect(await uploadedRecord(0)).toEqual({
      recordType: 'profile',
      identifiers: [{ provider: 'email', id: 'demo@example.com' }],
      extensions: { paperless: true },
    });
  });

  it('sets paperless false only after Profile Import proves registration created a profile', async () => {
    mockCompletedBatch(BATCH_ONE, 'CREATED');
    mockCompletedBatch(BATCH_TWO, 'UPDATED');

    await expect(
      initializeNewSitecoreAiProfile({
        email: '  DEMO@EXAMPLE.COM ',
        firstName: ' Taylor ',
        lastName: ' Morgan ',
      }),
    ).resolves.toEqual({
      created: true,
      paperlessInitialized: true,
      profileId: PROFILE_ONE,
    });

    expect(await uploadedRecord(0)).toEqual({
      recordType: 'profile',
      identifiers: [{ provider: 'email', id: 'demo@example.com' }],
      contact: {
        email: 'demo@example.com',
        firstName: 'Taylor',
        lastName: 'Morgan',
      },
    });
    expect(await uploadedRecord(3)).toEqual({
      recordType: 'profile',
      identifiers: [{ provider: 'email', id: 'demo@example.com' }],
      extensions: { paperless: false },
    });
  });

  it('preserves paperless true when registration resolves to an existing profile', async () => {
    mockCompletedBatch(BATCH_ONE, 'UPDATED');

    await expect(
      initializeNewSitecoreAiProfile({
        email: 'demo@example.com',
        firstName: 'Taylor',
        lastName: 'Morgan',
      }),
    ).resolves.toEqual({
      created: false,
      paperlessInitialized: false,
      profileId: PROFILE_ONE,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(await uploadedRecord(0)).not.toHaveProperty('extensions');
  });

  it('imports paperless true using the normalized email identifier', async () => {
    mockCompletedBatch(BATCH_ONE, 'UPDATED');

    await expect(
      optInSitecoreAiProfileToPaperless(' DEMO@EXAMPLE.COM '),
    ).resolves.toEqual({
      batchId: BATCH_ONE,
      changed: true,
      value: true,
    });
    expect(await uploadedRecord(0)).toEqual({
      recordType: 'profile',
      identifiers: [{ provider: 'email', id: 'demo@example.com' }],
      extensions: { paperless: true },
    });
  });

  it('rejects a batch with record failures instead of reporting success', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ batchId: BATCH_ONE, status: 'QUEUED' }, 202),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          batchId: BATCH_ONE,
          status: 'COMPLETED_WITH_ERRORS',
          totalRecords: 1,
          succeededRecords: 0,
          failedRecords: 1,
        }),
      );

    await expect(
      importSitecoreAiProfiles(
        [
          {
            recordType: 'profile',
            identifiers: [{ provider: 'email', id: 'demo@example.com' }],
            extensions: { paperless: true },
          },
        ],
        { pollIntervalMs: 0 },
      ),
    ).rejects.toBeInstanceOf(SitecoreAiProfileImportError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('requires server-only Profile Import credentials', async () => {
    delete process.env.SITECOREAI_PROFILE_IMPORT_API_KEY;

    await expect(
      optInSitecoreAiProfileToPaperless('demo@example.com'),
    ).rejects.toThrow('credentials are not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
