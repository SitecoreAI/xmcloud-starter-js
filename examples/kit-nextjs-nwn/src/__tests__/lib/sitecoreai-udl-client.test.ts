import {
  establishDemoAccountSession,
  establishDemoRegistrationSession,
  optInDemoAccountToPaperless,
  SitecoreAiUdlClientError,
  verifyPaperlessOptInSession,
} from '@/lib/sitecoreai-udl-client';

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = global.fetch;
const REGISTERED_EMAIL = 'thomas.lin@sitecore.com';
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

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('sends the validated registration profile to the same-origin route', async () => {
    const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    fetchMock.mockResolvedValueOnce(
      response({ session: { established: true } }),
    );

    await expect(
      establishDemoRegistrationSession({
        email: REGISTERED_EMAIL,
        firstName: 'Thomas',
        lastName: 'Lin',
      }),
    ).resolves.toEqual({
      session: { established: true },
    });

    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(init?.body))).toEqual({
      action: 'registration',
      email: REGISTERED_EMAIL,
      firstName: 'Thomas',
      lastName: 'Lin',
    });
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 290_000);
  });

  it('rejects a successful response with an invalid shape', async () => {
    fetchMock.mockResolvedValueOnce(response({ paperless: { value: 'true' } }));

    await expect(verifyPaperlessOptInSession()).rejects.toBeInstanceOf(
      SitecoreAiUdlClientError,
    );
  });

  it('returns the normalized signed-session identity for paperless opt-in', async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        session: {
          verified: true,
          email: REGISTERED_EMAIL,
        },
      }),
    );

    await expect(verifyPaperlessOptInSession()).resolves.toEqual({
      session: {
        verified: true,
        email: REGISTERED_EMAIL,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/account/paperless',
      expect.objectContaining({
        body: JSON.stringify({ action: 'verify' }),
      }),
    );
  });

  it('requests and validates an explicit server-side paperless update', async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        session: {
          verified: true,
          email: REGISTERED_EMAIL,
        },
        paperless: { updated: true, value: true },
      }),
    );

    await expect(optInDemoAccountToPaperless()).resolves.toEqual({
      session: {
        verified: true,
        email: REGISTERED_EMAIL,
      },
      paperless: { updated: true, value: true },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/account/paperless',
      expect.objectContaining({
        body: JSON.stringify({ action: 'opt-in' }),
      }),
    );
  });

  it('rejects an opt-in response that does not confirm the profile update', async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        session: {
          verified: true,
          email: REGISTERED_EMAIL,
        },
      }),
    );

    await expect(optInDemoAccountToPaperless()).rejects.toBeInstanceOf(
      SitecoreAiUdlClientError,
    );
  });

  it('preserves the HTTP status for a rejected request', async () => {
    fetchMock.mockResolvedValueOnce(response(undefined, 401));

    await expect(verifyPaperlessOptInSession()).rejects.toMatchObject({
      status: 401,
    });
  });
});
