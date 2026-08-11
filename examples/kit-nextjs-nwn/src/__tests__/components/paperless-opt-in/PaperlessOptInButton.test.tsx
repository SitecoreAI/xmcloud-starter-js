import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { identity } from '@sitecore-content-sdk/events';

import {
  PaperlessOptInButton,
  PaperlessOptInExperience,
} from '@/components/paperless-opt-in/PaperlessOptInButton';
import {
  optInDemoAccountToPaperless,
  SitecoreAiUdlClientError,
  verifyPaperlessOptInSession,
} from '@/lib/sitecoreai-udl-client';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@sitecore-content-sdk/events', () => ({
  identity: jest.fn(),
}));

jest.mock('@/lib/sitecoreai-udl-client', () => ({
  ...jest.requireActual('@/lib/sitecoreai-udl-client'),
  optInDemoAccountToPaperless: jest.fn(),
  verifyPaperlessOptInSession: jest.fn(),
}));

const mockVerifyPaperlessOptInSession =
  verifyPaperlessOptInSession as jest.MockedFunction<
    typeof verifyPaperlessOptInSession
  >;
const mockOptInDemoAccountToPaperless =
  optInDemoAccountToPaperless as jest.MockedFunction<
    typeof optInDemoAccountToPaperless
  >;
const mockIdentity = identity as jest.MockedFunction<typeof identity>;
type OptInResponse = Awaited<ReturnType<typeof optInDemoAccountToPaperless>>;

const acceptedIdentityResponse = {
  ref: 'identity-reference',
  status: 'OK',
  version: '1.2',
  client_key: 'test-client',
  customer_ref: 'test-profile',
};
const SIGNED_EMAIL = 'nwn-live-20260809-143025@example.com';

describe('PaperlessOptInButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyPaperlessOptInSession.mockResolvedValue({
      session: { verified: true, email: SIGNED_EMAIL, paperless: false },
    });
    mockOptInDemoAccountToPaperless.mockResolvedValue({
      session: { verified: true, email: SIGNED_EMAIL, paperless: true },
      paperless: { updated: true, value: true },
    });
    mockIdentity.mockResolvedValue(acceptedIdentityResponse);
    document.documentElement.lang = 'en-US';
  });

  it('sets paperless on the signed identity and then shows success', async () => {
    let resolveRequest: ((value: OptInResponse) => void) | undefined;
    mockOptInDemoAccountToPaperless.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(<PaperlessOptInButton locale="en" />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Choose paperless billing',
      }),
    );

    expect(mockVerifyPaperlessOptInSession).toHaveBeenCalledTimes(1);
    expect(mockOptInDemoAccountToPaperless).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Saving preference…' }),
    ).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'We’re securely updating your billing preference. This can take up to a minute.',
    );

    resolveRequest?.({
      session: { verified: true, email: SIGNED_EMAIL, paperless: true },
      paperless: { updated: true, value: true },
    });

    expect(
      await screen.findByRole('button', {
        name: 'Paperless preference saved',
      }),
    ).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Make monthly payments one less thing to remember with Auto Pay.',
    );
    expect(
      screen.getByRole('link', { name: 'Explore Auto Pay' }),
    ).toHaveAttribute('href', '/account-billing/pay-my-bill#payment-options');
    expect(mockIdentity).toHaveBeenCalledWith({
      channel: 'WEB',
      currency: 'USD',
      email: SIGNED_EMAIL,
      identifiers: [{ id: SIGNED_EMAIL, provider: 'email' }],
      language: 'EN',
      page: '/paperless-billing/opt-in',
      extensionData: {
        source: 'paperless_opt_in',
        intent: 'update_billing_preference',
        paperless: true,
      },
    });
    expect(
      mockOptInDemoAccountToPaperless.mock.invocationCallOrder[0],
    ).toBeLessThan(mockIdentity.mock.invocationCallOrder[0]);

    fireEvent.click(
      screen.getByRole('button', { name: 'Paperless preference saved' }),
    );
    expect(mockVerifyPaperlessOptInSession).toHaveBeenCalledTimes(1);
    expect(mockOptInDemoAccountToPaperless).toHaveBeenCalledTimes(1);
  });

  it('uses a non-email demo identity only as an identifier', async () => {
    const demoIdentity = 'nwn-demo-thomas-lin';
    mockOptInDemoAccountToPaperless.mockResolvedValueOnce({
      session: { verified: true, email: demoIdentity, paperless: true },
      paperless: { updated: true, value: true },
    });

    render(<PaperlessOptInButton locale="en" />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Choose paperless billing',
      }),
    );

    await screen.findByRole('button', {
      name: 'Paperless preference saved',
    });
    expect(mockIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        identifiers: [{ id: demoIdentity, provider: 'email' }],
      }),
    );
    expect(mockIdentity.mock.calls[0][0]).not.toHaveProperty('email');
  });

  it('renders no CTA when the visitor has no valid signed session', async () => {
    mockVerifyPaperlessOptInSession.mockRejectedValueOnce(
      new SitecoreAiUdlClientError('Sign in required', 401),
    );

    render(<PaperlessOptInButton locale="en" />);

    await waitFor(() =>
      expect(mockVerifyPaperlessOptInSession).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.queryByRole('button', { name: 'Choose paperless billing' }),
    ).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockIdentity).not.toHaveBeenCalled();
  });

  it('renders the CTA after a signed session is verified', async () => {
    render(<PaperlessOptInButton locale="en" />);

    expect(
      await screen.findByRole('button', {
        name: 'Choose paperless billing',
      }),
    ).toBeEnabled();
    expect(mockIdentity).not.toHaveBeenCalled();
  });

  it('renders no CTA when the signed account is already paperless', async () => {
    mockVerifyPaperlessOptInSession.mockResolvedValueOnce({
      session: { verified: true, email: SIGNED_EMAIL, paperless: true },
    });

    render(<PaperlessOptInButton locale="en" />);

    await waitFor(() =>
      expect(mockVerifyPaperlessOptInSession).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.queryByRole('button', { name: 'Choose paperless billing' }),
    ).not.toBeInTheDocument();
    expect(mockOptInDemoAccountToPaperless).not.toHaveBeenCalled();
    expect(mockIdentity).not.toHaveBeenCalled();
  });

  it('renders Spanish labels, feedback, and AutoPay destination', async () => {
    mockVerifyPaperlessOptInSession.mockResolvedValue({
      session: { verified: true, email: SIGNED_EMAIL, paperless: false },
    });

    render(<PaperlessOptInButton locale="es-MX" />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Elegir facturación electrónica',
      }),
    );

    expect(
      await screen.findByRole('button', {
        name: 'Preferencia de facturación electrónica guardada',
      }),
    ).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Con Auto Pay, sus pagos mensuales pueden ser una preocupación menos.',
    );
    expect(
      screen.getByRole('link', { name: 'Explorar Auto Pay' }),
    ).toHaveAttribute(
      'href',
      '/es-MX/account-billing/pay-my-bill#payment-options',
    );
  });

  it('renders a localized opt-in experience and returns home after success', async () => {
    render(<PaperlessOptInExperience locale="es-MX" />);

    expect(
      screen.getByRole('heading', {
        name: 'Elija la facturación electrónica',
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Elegir facturación electrónica',
      }),
    );

    expect(
      await screen.findByRole('link', {
        name: 'Volver a la página principal',
      }),
    ).toHaveAttribute('href', '/es-MX');
    expect(mockIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        email: SIGNED_EMAIL,
        extensionData: expect.objectContaining({ paperless: true }),
      }),
    );
  });

  it('shows a localized error and allows retry when the profile update fails', async () => {
    mockOptInDemoAccountToPaperless
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce({
        session: { verified: true, email: SIGNED_EMAIL, paperless: true },
        paperless: { updated: true, value: true },
      });

    render(
      <PaperlessOptInButton
        locale="es-MX"
        label="Activar facturación electrónica"
      />,
    );

    const button = await screen.findByRole('button', {
      name: 'Activar facturación electrónica',
    });
    fireEvent.click(button);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos actualizar su preferencia. Inténtelo de nuevo.',
    );
    expect(button).toBeEnabled();
    expect(mockIdentity).not.toHaveBeenCalled();

    fireEvent.click(button);
    await waitFor(() =>
      expect(mockOptInDemoAccountToPaperless).toHaveBeenCalledTimes(2),
    );
    expect(
      await screen.findByRole('button', {
        name: 'Preferencia de facturación electrónica guardada',
      }),
    ).toBeDisabled();
  });

  it.each(['rejects', 'returns null', 'returns non-OK'] as const)(
    'shows a retryable error when identity %s',
    async (outcome) => {
      mockVerifyPaperlessOptInSession.mockResolvedValue({
        session: { verified: true, email: SIGNED_EMAIL, paperless: false },
      });
      if (outcome === 'rejects') {
        mockIdentity.mockRejectedValueOnce(new Error('Identity unavailable'));
      } else if (outcome === 'returns null') {
        mockIdentity.mockResolvedValueOnce(null);
      } else {
        mockIdentity.mockResolvedValueOnce({
          ...acceptedIdentityResponse,
          status: 'ERROR',
        });
      }

      render(<PaperlessOptInButton locale="en" />);
      fireEvent.click(
        await screen.findByRole('button', {
          name: 'Choose paperless billing',
        }),
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'We couldn’t update your preference. Please try again.',
      );
      expect(
        screen.queryByRole('link', { name: 'Explore AutoPay' }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([
    ['en', '/account-billing/login'],
    ['es-MX', '/es-MX/account-billing/login'],
  ])(
    'redirects an unauthenticated %s visitor to the localized login page',
    async (locale, expectedPath) => {
      mockVerifyPaperlessOptInSession.mockResolvedValueOnce({
        session: { verified: true, email: SIGNED_EMAIL, paperless: false },
      });
      mockOptInDemoAccountToPaperless.mockRejectedValueOnce(
        new SitecoreAiUdlClientError('Sign in required', 401),
      );

      render(<PaperlessOptInButton locale={locale} label="Paperless CTA" />);
      fireEvent.click(
        await screen.findByRole('button', { name: 'Paperless CTA' }),
      );

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith(expectedPath));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(mockIdentity).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: 'Paperless CTA' }),
      ).toBeEnabled();
    },
  );
});
