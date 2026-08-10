import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { identity } from '@sitecore-content-sdk/events';

import { PaperlessOptInButton } from '@/components/paperless-opt-in/PaperlessOptInButton';
import {
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
  verifyPaperlessOptInSession: jest.fn(),
}));

const mockVerifyPaperlessOptInSession =
  verifyPaperlessOptInSession as jest.MockedFunction<
    typeof verifyPaperlessOptInSession
  >;
const mockIdentity = identity as jest.MockedFunction<typeof identity>;
type SessionResponse = Awaited<ReturnType<typeof verifyPaperlessOptInSession>>;

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
      session: { verified: true, email: SIGNED_EMAIL },
    });
    mockIdentity.mockResolvedValue(acceptedIdentityResponse);
    document.documentElement.lang = 'en-US';
  });

  it('sets paperless on the signed identity and then shows success', async () => {
    let resolveRequest: ((value: SessionResponse) => void) | undefined;
    mockVerifyPaperlessOptInSession
      .mockResolvedValueOnce({
        session: { verified: true, email: SIGNED_EMAIL },
      })
      .mockReturnValueOnce(
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

    expect(mockVerifyPaperlessOptInSession).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole('button', { name: 'Saving preference…' }),
    ).toBeDisabled();

    resolveRequest?.({
      session: { verified: true, email: SIGNED_EMAIL },
    });

    expect(
      await screen.findByRole('button', { name: 'Paperless billing is on' }),
    ).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your paperless billing preference has been saved.',
    );
    expect(
      screen.getByRole('link', { name: 'Explore AutoPay' }),
    ).toHaveAttribute(
      'href',
      '/account-billing/pay-my-bill#payment-options',
    );
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
      mockVerifyPaperlessOptInSession.mock.invocationCallOrder[1],
    ).toBeLessThan(mockIdentity.mock.invocationCallOrder[0]);

    fireEvent.click(
      screen.getByRole('button', { name: 'Paperless billing is on' }),
    );
    expect(mockVerifyPaperlessOptInSession).toHaveBeenCalledTimes(2);
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

  it('renders Spanish labels, feedback, and AutoPay destination', async () => {
    mockVerifyPaperlessOptInSession.mockResolvedValue({
      session: { verified: true, email: SIGNED_EMAIL },
    });

    render(<PaperlessOptInButton locale="es-MX" />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Elegir facturación electrónica',
      }),
    );

    expect(
      await screen.findByRole('button', {
        name: 'La facturación electrónica está activada',
      }),
    ).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Se guardó su preferencia de facturación electrónica.',
    );
    expect(
      screen.getByRole('link', { name: 'Explorar AutoPay' }),
    ).toHaveAttribute(
      'href',
      '/es-MX/account-billing/pay-my-bill#payment-options',
    );
  });

  it('shows a localized error and allows retry when session verification fails', async () => {
    mockVerifyPaperlessOptInSession
      .mockResolvedValueOnce({
        session: { verified: true, email: SIGNED_EMAIL },
      })
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce({
        session: { verified: true, email: SIGNED_EMAIL },
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
      expect(mockVerifyPaperlessOptInSession).toHaveBeenCalledTimes(3),
    );
    expect(
      await screen.findByRole('button', {
        name: 'La facturación electrónica está activada',
      }),
    ).toBeDisabled();
  });

  it.each(['rejects', 'returns null', 'returns non-OK'] as const)(
    'shows a retryable error when identity %s',
    async (outcome) => {
      mockVerifyPaperlessOptInSession.mockResolvedValue({
        session: { verified: true, email: SIGNED_EMAIL },
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
      mockVerifyPaperlessOptInSession
        .mockResolvedValueOnce({
          session: { verified: true, email: SIGNED_EMAIL },
        })
        .mockRejectedValueOnce(
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
