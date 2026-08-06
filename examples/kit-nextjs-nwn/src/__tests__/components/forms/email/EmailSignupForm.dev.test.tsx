import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { identity } from '@sitecore-content-sdk/events';
import { Default as EmailSignupForm } from '@/components/forms/email/EmailSignupForm.dev';

jest.unmock('react-hook-form');
jest.unmock('@/components/ui/form');

jest.mock('@sitecore-content-sdk/events', () => ({
  identity: jest.fn(),
}));

jest.mock('sitecore.config', () => ({
  __esModule: true,
  default: {
    api: {
      edge: {
        clientContextId: 'test-context-id',
      },
    },
  },
}));

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({ field }: { field?: { value?: string } }) => <>{field?.value}</>,
}));

jest.mock('@/components/forms/success/success-compact.dev', () => ({
  SuccessCompact: ({ successMessage }: { successMessage: string }) => (
    <p role="status">{successMessage}</p>
  ),
}));

const mockIdentity = identity as jest.MockedFunction<typeof identity>;
const acceptedIdentityResponse = {
  ref: 'identity-event-reference',
  status: 'OK',
  version: '1.2',
  client_key: 'test-client',
  customer_ref: 'test-customer',
};

const formFields = {
  emailPlaceholder: { value: 'Enter your email address' },
  emailErrorMessage: { value: 'Enter a valid email address.' },
  emailSubmitLabel: { value: 'Subscribe' },
  emailSuccessMessage: { value: 'Thanks for subscribing.' },
  submissionErrorMessage: {
    value: "We couldn't complete your signup. Please try again.",
  },
  buttonVariant: 'default' as const,
};

const renderForm = () =>
  render(
    <EmailSignupForm
      fields={formFields}
      cdpIdentity={{ provider: 'email', source: 'global_footer' }}
    />,
  );

const submitEmail = (email: string) => {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: email },
  });
  const submitButton = screen.getByRole('button', { name: 'Subscribe' });
  const form = submitButton.closest('form');

  if (!form) {
    throw new Error('Newsletter form was not rendered.');
  }

  fireEvent.submit(form);
  return submitButton;
};

describe('EmailSignupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.documentElement.lang = 'en-US';
    window.history.replaceState({}, '', '/ways-to-save');
  });

  it('does not identify the visitor when the email is invalid', async () => {
    renderForm();

    submitEmail('not-an-email');

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeInTheDocument();
    expect(mockIdentity).not.toHaveBeenCalled();
  });

  it('normalizes the email and sends the expected newsletter identity payload', async () => {
    mockIdentity.mockResolvedValue(acceptedIdentityResponse);
    renderForm();

    submitEmail('  Visitor@Example.COM  ');

    await waitFor(() => {
      expect(mockIdentity).toHaveBeenCalledTimes(1);
    });
    expect(mockIdentity).toHaveBeenCalledWith({
      channel: 'WEB',
      currency: 'USD',
      email: 'visitor@example.com',
      identifiers: [
        {
          id: 'visitor@example.com',
          provider: 'email',
        },
      ],
      language: 'EN-US',
      page: '/ways-to-save',
      extensionData: {
        source: 'global_footer',
        intent: 'newsletter_signup',
      },
    });
    expect(
      await screen.findByText('Thanks for subscribing.'),
    ).toBeInTheDocument();
  });

  it('does not show success until Sitecore accepts the identity event', async () => {
    let resolveIdentity: (
      value: typeof acceptedIdentityResponse,
    ) => void = () => undefined;
    mockIdentity.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveIdentity = resolve;
        }),
    );
    renderForm();

    submitEmail('visitor@example.com');

    await waitFor(() => expect(mockIdentity).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText('Thanks for subscribing.'),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveIdentity(acceptedIdentityResponse);
    });

    expect(
      await screen.findByText('Thanks for subscribing.'),
    ).toBeInTheDocument();
  });

  it('retains the form and shows a retry message when identity returns null', async () => {
    mockIdentity.mockResolvedValue(null);
    renderForm();

    submitEmail('visitor@example.com');

    expect(
      await screen.findByText(
        "We couldn't complete your signup. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      'visitor@example.com',
    );
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeEnabled();
    expect(
      screen.queryByText('Thanks for subscribing.'),
    ).not.toBeInTheDocument();
  });

  it('retains the form and shows a retry message when identity throws', async () => {
    mockIdentity.mockRejectedValue(new Error('SDK not initialized'));
    renderForm();

    submitEmail('visitor@example.com');

    expect(
      await screen.findByText(
        "We couldn't complete your signup. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      'visitor@example.com',
    );
    expect(
      screen.queryByText('Thanks for subscribing.'),
    ).not.toBeInTheDocument();
  });

  it('disables submission while the identity request is pending', async () => {
    let resolveIdentity: (
      value: typeof acceptedIdentityResponse,
    ) => void = () => undefined;
    mockIdentity.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveIdentity = resolve;
        }),
    );
    renderForm();

    const submitButton = submitEmail('visitor@example.com');

    await waitFor(() => expect(submitButton).toBeDisabled());
    fireEvent.click(submitButton);
    expect(mockIdentity).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveIdentity(acceptedIdentityResponse);
    });
  });
});
