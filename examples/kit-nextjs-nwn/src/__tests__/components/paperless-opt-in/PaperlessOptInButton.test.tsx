import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { event } from '@sitecore-content-sdk/events';

import { PaperlessOptInButton } from '@/components/paperless-opt-in/PaperlessOptInButton';
import {
  SitecoreAiUdlClientError,
  submitPaperlessOptIn,
} from '@/lib/sitecoreai-udl-client';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@sitecore-content-sdk/events', () => ({
  event: jest.fn(),
}));

jest.mock('@/lib/sitecoreai-udl-client', () => ({
  ...jest.requireActual('@/lib/sitecoreai-udl-client'),
  submitPaperlessOptIn: jest.fn(),
}));

const mockSubmitPaperlessOptIn = submitPaperlessOptIn as jest.MockedFunction<
  typeof submitPaperlessOptIn
>;
const mockEvent = event as jest.MockedFunction<typeof event>;
type PaperlessResponse = Awaited<ReturnType<typeof submitPaperlessOptIn>>;

const acceptedEventResponse = {
  ref: 'event-reference',
  status: 'OK',
  version: '1.2',
  client_key: 'test-client',
  customer_ref: 'test-profile',
};

describe('PaperlessOptInButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvent.mockResolvedValue(acceptedEventResponse);
    document.documentElement.lang = 'en-US';
  });

  it('submits the preference once and confirms the English success state', async () => {
    let resolveRequest: ((value: PaperlessResponse) => void) | undefined;
    mockSubmitPaperlessOptIn.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(<PaperlessOptInButton locale="en" />);

    const button = screen.getByRole('button', {
      name: 'Choose paperless billing',
    });
    fireEvent.click(button);

    expect(mockSubmitPaperlessOptIn).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Saving preference…' }),
    ).toBeDisabled();

    resolveRequest?.({
      paperless: {
        batchId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
        changed: true,
        value: true,
      },
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
    expect(mockEvent).toHaveBeenCalledWith({
      type: 'NWN_PAPERLESS_OPT_IN',
      channel: 'WEB',
      currency: 'USD',
      language: 'EN',
      page: '/',
      extensionData: { paperless: true },
    });
    expect(mockSubmitPaperlessOptIn.mock.invocationCallOrder[0]).toBeLessThan(
      mockEvent.mock.invocationCallOrder[0],
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Paperless billing is on' }),
    );
    expect(mockSubmitPaperlessOptIn).toHaveBeenCalledTimes(1);
  });

  it('renders Spanish labels and feedback for es-MX', async () => {
    mockSubmitPaperlessOptIn.mockResolvedValue({
      paperless: {
        batchId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
        changed: true,
        value: true,
      },
    });

    render(<PaperlessOptInButton locale="es-MX" />);

    fireEvent.click(
      screen.getByRole('button', {
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

  it('shows a localized error and allows the visitor to retry', async () => {
    mockSubmitPaperlessOptIn
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce({
        paperless: {
          batchId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
          changed: true,
          value: true,
        },
      });

    render(
      <PaperlessOptInButton
        locale="es-MX"
        label="Activar facturación electrónica"
      />,
    );

    const button = screen.getByRole('button', {
      name: 'Activar facturación electrónica',
    });
    fireEvent.click(button);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos actualizar su preferencia. Inténtelo de nuevo.',
    );
    expect(
      screen.getByRole('button', {
        name: 'Activar facturación electrónica',
      }),
    ).toBeEnabled();

    fireEvent.click(button);

    await waitFor(() =>
      expect(mockSubmitPaperlessOptIn).toHaveBeenCalledTimes(2),
    );
    expect(
      await screen.findByRole('button', {
        name: 'La facturación electrónica está activada',
      }),
    ).toBeDisabled();
  });

  it('does not show success unless the API confirms paperless is true', async () => {
    mockSubmitPaperlessOptIn.mockResolvedValue({
      paperless: {
        batchId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
        changed: false,
        value: false,
      },
    });

    render(<PaperlessOptInButton locale="en" />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Choose paperless billing' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t update your preference. Please try again.',
    );
    expect(
      screen.queryByRole('button', { name: 'Paperless billing is on' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Explore AutoPay' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the confirmed preference successful when event telemetry returns null', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    mockSubmitPaperlessOptIn.mockResolvedValue({
      paperless: {
        batchId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
        changed: true,
        value: true,
      },
    });
    mockEvent.mockResolvedValue(null);

    render(<PaperlessOptInButton locale="en" />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Choose paperless billing' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Paperless billing is on' }),
    ).toBeDisabled();
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    warn.mockRestore();
  });

  it('keeps the confirmed preference successful when event telemetry rejects', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    mockSubmitPaperlessOptIn.mockResolvedValue({
      paperless: {
        batchId: '7dc912e2-4fb9-4340-ae1d-4239399e3f97',
        changed: true,
        value: true,
      },
    });
    mockEvent.mockRejectedValue(new Error('Telemetry unavailable'));

    render(<PaperlessOptInButton locale="es-MX" />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Elegir facturación electrónica' }),
    );

    expect(
      await screen.findByRole('button', {
        name: 'La facturación electrónica está activada',
      }),
    ).toBeDisabled();
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    warn.mockRestore();
  });

  it.each([
    ['en', '/account-billing/login'],
    ['es-MX', '/es-MX/account-billing/login'],
  ])(
    'redirects an unauthenticated %s visitor to the localized login page',
    async (locale, expectedPath) => {
      mockSubmitPaperlessOptIn.mockRejectedValue(
        new SitecoreAiUdlClientError('Sign in required', 401),
      );

      render(<PaperlessOptInButton locale={locale} label="Paperless CTA" />);
      fireEvent.click(screen.getByRole('button', { name: 'Paperless CTA' }));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith(expectedPath));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Paperless CTA' }),
      ).toBeEnabled();
    },
  );
});
