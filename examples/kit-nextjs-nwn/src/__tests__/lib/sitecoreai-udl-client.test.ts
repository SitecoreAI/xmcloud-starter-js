import {
  establishDemoAccountSession,
  initializeNewUdlProfile,
  SitecoreAiUdlClientError,
  submitPaperlessOptIn,
} from '@/lib/sitecoreai-udl-client';

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = global.fetch;
const response = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe('SitecoreAI UDL browser client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('establishes the demo session through the same-origin route', async () => {
    fetchMock.mockResolvedValueOnce(
      response({ session: { established: true } }),
    );

    await expect(
      establishDemoAccountSession('demo@example.com'),
    ).resolves.toEqual({ session: { established: true } });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/account/identify',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'login',
          email: 'demo@example.com',
        }),
      }),
    );
  });

  it('submits registration profile data without passwords or a customer reference', async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        profile: { created: true, paperlessInitialized: true },
        session: { established: true },
      }),
    );

    await expect(
      initializeNewUdlProfile({
        email: 'nwn-live-20260809-143025@example.com',
        firstName: 'Taylor',
        lastName: 'Morgan',
      }),
    ).resolves.toEqual({
      profile: { created: true, paperlessInitialized: true },
      session: { established: true },
    });

    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(init?.body))).toEqual({
      action: 'registration',
      email: 'nwn-live-20260809-143025@example.com',
      firstName: 'Taylor',
      lastName: 'Morgan',
    });
  });

  it('rejects a successful response with an invalid shape', async () => {
    fetchMock.mockResolvedValueOnce(response({ paperless: { value: 'true' } }));

    await expect(submitPaperlessOptIn()).rejects.toBeInstanceOf(
      SitecoreAiUdlClientError,
    );
  });

  it('preserves the HTTP status for a rejected request', async () => {
    fetchMock.mockResolvedValueOnce(response(undefined, 401));

    await expect(submitPaperlessOptIn()).rejects.toMatchObject({ status: 401 });
  });
});
