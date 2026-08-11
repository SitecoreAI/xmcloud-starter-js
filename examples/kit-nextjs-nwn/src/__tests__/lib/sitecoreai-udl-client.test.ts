import {
  endDemoAccountSession,
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

  it('ends the signed demo session through the same-origin route', async () => {
    const clearEventQueue = jest.fn().mockResolvedValue(undefined);
    (
      window as unknown as {
        scContentSDK?: {
          analytics_core?: { options?: { contextId?: string } };
          events?: { clearEventQueue?: () => Promise<void> };
        };
      }
    ).scContentSDK = {
      analytics_core: { options: { contextId: 'context-123' } },
      events: { clearEventQueue },
    };
    document.cookie = 'sc_cid=browser-a; Path=/';
    document.cookie = 'sc_cid_personalize=profile-a; Path=/';
    document.cookie = 'sc_context-123=legacy-browser; Path=/';
    document.cookie = 'sc_context-123_personalize=legacy-profile; Path=/';
    fetchMock.mockResolvedValueOnce(response({ session: { ended: true } }));

    await expect(endDemoAccountSession()).resolves.toEqual({
      session: { ended: true },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/account/session',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'sign-out' }),
      }),
    );
    expect(clearEventQueue).toHaveBeenCalledTimes(1);
    expect(document.cookie).not.toContain('sc_cid=');
    expect(document.cookie).not.toContain('sc_cid_personalize=');
    expect(document.cookie).not.toContain('sc_context-123=');
    expect(document.cookie).not.toContain('sc_context-123_personalize=');
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
