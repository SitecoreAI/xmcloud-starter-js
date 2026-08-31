import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { FooterNewsletterSignup } from '@/components/global-footer/FooterNewsletterSignup.client';

const mockIdentity = jest.fn();

jest.mock('@sitecore-content-sdk/events', () => ({
  identity: (...args: unknown[]) => mockIdentity(...args),
}));

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({
    tag = 'span',
    field,
    className,
  }: {
    tag?: string;
    field?: { value?: string };
    className?: string;
  }) => React.createElement(tag, { className }, field?.value || ''),
}));

const defaultProps = {
  title: { value: 'Energy insights, delivered' },
  description: { value: 'The latest SLB thinking in your inbox.' },
  locale: 'en',
  trackingEnabled: true,
};

function submitEmail(value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
    target: { value },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
}

describe('FooterNewsletterSignup', () => {
  beforeEach(() => {
    mockIdentity.mockReset();
    mockIdentity.mockResolvedValue(null);
    window.history.replaceState({}, '', '/solutions/digital-operations');
  });

  it('renders accessible English newsletter content', () => {
    render(<FooterNewsletterSignup {...defaultProps} />);

    expect(
      screen.getByRole('heading', { name: 'Energy insights, delivered' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('form', { name: 'Newsletter signup' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Email address' }),
    ).toHaveAttribute('type', 'email');
  });

  it('normalizes the email and sends the expected Sitecore identity event', async () => {
    render(<FooterNewsletterSignup {...defaultProps} />);

    submitEmail('  Person@Example.COM  ');

    await waitFor(() =>
      expect(mockIdentity).toHaveBeenCalledWith({
        identifiers: [{ id: 'person@example.com', provider: 'email' }],
        email: 'person@example.com',
        channel: 'WEB',
        language: 'EN',
        page: '/solutions/digital-operations',
        extensionData: {
          newsletterOptIn: true,
          signupSource: 'global_footer',
        },
      }),
    );
    expect(
      await screen.findByText('Thank you. You’re subscribed to SLB updates.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveValue(
      '',
    );
  });

  it('uses bilingual Spanish copy and the ES event language', async () => {
    render(<FooterNewsletterSignup {...defaultProps} locale="es-MX" />);

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Correo electrónico' }),
      { target: { value: 'persona@ejemplo.mx' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Suscribirse' }));

    await waitFor(() =>
      expect(mockIdentity).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'persona@ejemplo.mx',
          language: 'ES',
        }),
      ),
    );
    expect(
      await screen.findByText(
        'Gracias. Ya está suscrito a las novedades de SLB.',
      ),
    ).toBeInTheDocument();
  });

  it('rejects an invalid email without calling Sitecore', () => {
    render(<FooterNewsletterSignup {...defaultProps} />);

    submitEmail('not-an-email');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a valid email address.',
    );
    expect(
      screen.getByRole('textbox', { name: 'Email address' }),
    ).toHaveAttribute('aria-invalid', 'true');
    expect(mockIdentity).not.toHaveBeenCalled();
  });

  it('prevents duplicate submissions while the identity event is pending', async () => {
    let resolveIdentity: ((value: null) => void) | undefined;
    mockIdentity.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          resolveIdentity = resolve;
        }),
    );
    render(<FooterNewsletterSignup {...defaultProps} />);

    submitEmail('person@example.com');

    expect(screen.getByRole('button', { name: 'Subscribing…' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Newsletter signup' }));
    expect(mockIdentity).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveIdentity?.(null);
    });
    expect(
      await screen.findByText('Thank you. You’re subscribed to SLB updates.'),
    ).toBeInTheDocument();
  });

  it('keeps the email available for retry when Sitecore rejects the event', async () => {
    mockIdentity.mockRejectedValue(new Error('Network unavailable'));
    render(<FooterNewsletterSignup {...defaultProps} />);

    submitEmail('person@example.com');

    expect(
      await screen.findByText(
        'We couldn’t complete your subscription. Please try again.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveValue(
      'person@example.com',
    );
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeEnabled();
  });

  it('does not submit when tracking is disabled outside normal mode', () => {
    render(
      <FooterNewsletterSignup {...defaultProps} trackingEnabled={false} />,
    );

    expect(
      screen.getByRole('textbox', { name: 'Email address' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeDisabled();
    expect(
      screen.getByText('Newsletter signup is available on the published site.'),
    ).toBeInTheDocument();
    expect(mockIdentity).not.toHaveBeenCalled();
  });
});
