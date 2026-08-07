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
import config from 'sitecore.config';

import { SubmissionFormDefault } from '@/components/submission-form/SubmissionFormDefault.dev';

import { mockSubmissionFormProps } from './submission-form.mock.props';

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
  Text: ({
    field,
    tag = 'span',
    className,
  }: {
    field?: { value?: string };
    tag?: string;
    className?: string;
  }) => React.createElement(tag, { className }, field?.value),
}));

jest.mock('@/utils/NoDataFallback', () => ({
  NoDataFallback: ({ componentName }: { componentName: string }) => (
    <div>No Data: {componentName}</div>
  ),
}));

const mockIdentity = identity as jest.MockedFunction<typeof identity>;
const mockConfig = config as unknown as {
  api: { edge: { clientContextId?: string } };
};
const acceptedIdentityResponse = {
  ref: 'identity-event-reference',
  status: 'OK',
  version: '1.2',
  client_key: 'test-client',
  customer_ref: 'test-customer',
};
const originalNodeEnv = process.env.NODE_ENV;
const originalIdentityProvider =
  process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER;

const contactProps = {
  ...mockSubmissionFormProps,
  fields: {
    title: {
      value: 'Contact Us',
    },
  },
};

const renderForm = (
  props: React.ComponentProps<typeof SubmissionFormDefault> = contactProps,
) => render(<SubmissionFormDefault {...props} />);

const completeAndSubmitForm = () => {
  fireEvent.change(screen.getByLabelText('First name'), {
    target: { value: '  Taylor  ' },
  });
  fireEvent.change(screen.getByLabelText('Last name'), {
    target: { value: '  Morgan  ' },
  });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: '  Taylor@Example.COM  ' },
  });
  fireEvent.change(screen.getByLabelText('Message'), {
    target: { value: 'Please help with my account.' },
  });

  const button = screen.getByRole('button', { name: 'Send message' });
  const form = button.closest('form');

  if (!form) {
    throw new Error('Contact form was not rendered.');
  }

  fireEvent.submit(form);
  return button;
};

describe('SubmissionFormDefault', () => {
  beforeAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      value: 'production',
    });
  });

  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      value: originalNodeEnv,
    });

    if (originalIdentityProvider === undefined) {
      delete process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER;
    } else {
      process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER =
        originalIdentityProvider;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.api.edge.clientContextId = 'test-context-id';
    delete process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER;
    document.documentElement.lang = 'en-US';
    window.history.replaceState({}, '', '/contact-us');
  });

  it('renders only the four requested, accessibly labeled fields', () => {
    renderForm();

    expect(
      screen.getByRole('heading', { name: 'Contact Us' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/zip/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Privacy Notice (opens in a new tab)',
      }),
    ).toHaveAttribute('href', 'https://www.sienergy.com/privacy-policy/');
  });

  it('validates all required fields before identifying the visitor', async () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(
      await screen.findByText('First name is required.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Last name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
    expect(screen.getByText('A message is required.')).toBeInTheDocument();
    expect(mockIdentity).not.toHaveBeenCalled();
  });

  it('normalizes identity fields and does not send the message to CDP', async () => {
    mockIdentity.mockResolvedValue(acceptedIdentityResponse);
    renderForm();

    completeAndSubmitForm();

    await waitFor(() => expect(mockIdentity).toHaveBeenCalledTimes(1));
    expect(mockIdentity).toHaveBeenCalledWith({
      channel: 'WEB',
      currency: 'USD',
      email: 'taylor@example.com',
      firstName: 'Taylor',
      lastName: 'Morgan',
      identifiers: [
        {
          id: 'taylor@example.com',
          provider: 'email',
        },
      ],
      language: 'EN-US',
      page: '/contact-us',
      extensionData: {
        source: 'contact_us',
        intent: 'contact_request',
      },
    });
    expect(mockIdentity.mock.calls[0][0]).not.toHaveProperty('message');
    expect(
      await screen.findByText('Thank you for contacting us.'),
    ).toBeInTheDocument();
  });

  it('uses the configured CDP identity provider', async () => {
    process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER = 'customer_email';
    mockIdentity.mockResolvedValue(acceptedIdentityResponse);
    renderForm();

    completeAndSubmitForm();

    await waitFor(() => expect(mockIdentity).toHaveBeenCalledTimes(1));
    expect(mockIdentity.mock.calls[0][0].identifiers).toEqual([
      {
        id: 'taylor@example.com',
        provider: 'customer_email',
      },
    ]);
  });

  it('retains the form and shows an error when CDP returns null', async () => {
    mockIdentity.mockResolvedValue(null);
    renderForm();

    completeAndSubmitForm();

    expect(
      await screen.findByText(
        'We could not send your message. Please try again.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toHaveValue('  Taylor  ');
    expect(screen.getByLabelText('Message')).toHaveValue(
      'Please help with my account.',
    );
    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
    expect(
      screen.queryByText('Thank you for contacting us.'),
    ).not.toBeInTheDocument();
  });

  it('retains the form when CDP rejects the identity request', async () => {
    mockIdentity.mockRejectedValue(new Error('SDK not initialized'));
    renderForm();

    completeAndSubmitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not send your message. Please try again.',
    );
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'Taylor@Example.COM',
    );
  });

  it('shows an error without calling CDP when the client context is missing', async () => {
    mockConfig.api.edge.clientContextId = undefined;
    renderForm();

    completeAndSubmitForm();

    expect(
      await screen.findByText(
        'We could not send your message. Please try again.',
      ),
    ).toBeInTheDocument();
    expect(mockIdentity).not.toHaveBeenCalled();
  });

  it('disables the form while the identity request is pending', async () => {
    let resolveIdentity: (
      response: typeof acceptedIdentityResponse,
    ) => void = () => undefined;
    mockIdentity.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveIdentity = resolve;
        }),
    );
    renderForm();

    const submitButton = completeAndSubmitForm();

    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(screen.getByLabelText('Message')).toBeDisabled();

    await act(async () => {
      resolveIdentity(acceptedIdentityResponse);
    });
  });

  it('does not identify in preview mode', async () => {
    const previewProps = {
      ...contactProps,
      page: {
        ...contactProps.page,
        mode: {
          ...contactProps.page.mode,
          isNormal: false,
          isPreview: true,
        },
      },
    };
    renderForm(previewProps);

    completeAndSubmitForm();

    expect(
      await screen.findByText('Thank you for contacting us.'),
    ).toBeInTheDocument();
    expect(mockIdentity).not.toHaveBeenCalled();
  });

  it('renders a Page Builder fallback when the datasource is missing', () => {
    renderForm({ ...contactProps, fields: null as never });

    expect(screen.getByText('No Data: SubmissionForm')).toBeInTheDocument();
  });
});
