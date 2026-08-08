import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { identity } from '@sitecore-content-sdk/events';
import type { Page } from '@sitecore-content-sdk/nextjs';
import config from 'sitecore.config';

import { Login, Register } from '@/components/customer-account/CustomerAccount';
import type { CustomerAccountProps } from '@/components/customer-account/customer-account.props';

jest.unmock('react-hook-form');
jest.unmock('@/components/ui/form');

jest.mock('@sitecore-content-sdk/events', () => ({
  identity: jest.fn(),
}));

jest.mock('lucide-react', () => ({
  CheckCircle2: (props: React.HTMLAttributes<HTMLSpanElement>) => (
    <span {...props}>C</span>
  ),
  LockKeyhole: (props: React.HTMLAttributes<HTMLSpanElement>) => (
    <span {...props}>L</span>
  ),
  ShieldCheck: (props: React.HTMLAttributes<HTMLSpanElement>) => (
    <span {...props}>S</span>
  ),
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

jest.mock('@/components/content-sdk/CompatibleLink', () => ({
  CompatibleLink: ({
    field,
    className,
  }: {
    field?: { value?: { href?: string; text?: string } };
    className?: string;
  }) => (
    <a href={field?.value?.href} className={className}>
      {field?.value?.text}
    </a>
  ),
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

const page = {
  mode: {
    isEditing: false,
    isPreview: false,
    isNormal: true,
    name: 'normal' as const,
    designLibrary: { isVariantGeneration: false },
    isDesignLibrary: false,
  },
  layout: {
    sitecore: {
      context: {},
      route: null,
    },
  },
  locale: 'en',
} as Page;

const loginProps: CustomerAccountProps = {
  rendering: {
    componentName: 'CustomerAccount',
    dataSource: 'login-datasource',
  },
  params: {},
  fields: {
    title: { value: 'Access your account' },
    description: { value: 'Manage your NW Natural account online.' },
    submitLabel: { value: 'Sign in' },
    successTitle: { value: 'You’re signed in' },
    successMessage: { value: 'Your account is ready.' },
    secondaryPrompt: { value: 'Need an online account?' },
    secondaryLink: {
      value: {
        href: '/account-billing/register',
        text: 'Register',
        linktype: 'internal',
      },
    },
  },
  page,
};

const registrationProps: CustomerAccountProps = {
  ...loginProps,
  rendering: {
    componentName: 'CustomerAccount',
    dataSource: 'registration-datasource',
  },
  fields: {
    title: { value: 'Register your account' },
    description: { value: 'Create your NW Natural online account.' },
    submitLabel: { value: 'Register' },
    successTitle: { value: 'Your registration is complete' },
    successMessage: { value: 'Sign in with your email address.' },
    secondaryPrompt: { value: 'Already registered?' },
    secondaryLink: {
      value: {
        href: '/account-billing/login',
        text: 'Access your account',
        linktype: 'internal',
      },
    },
  },
};

const submitClosestForm = (buttonName: string) => {
  const button = screen.getByRole('button', { name: buttonName });
  const form = button.closest('form');

  if (!form) {
    throw new Error('Account form was not rendered.');
  }

  fireEvent.submit(form);
};

describe('CustomerAccount', () => {
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
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.api.edge.clientContextId = 'test-context-id';
    mockIdentity.mockResolvedValue(acceptedIdentityResponse);
    document.documentElement.lang = 'en-US';
  });

  it('uses email-address language, masks the password, and accepts any password', async () => {
    window.history.replaceState({}, '', '/account-billing/login');
    render(<Login {...loginProps} />);

    expect(screen.queryByText(/username/i)).not.toBeInTheDocument();
    const email = screen.getByLabelText(/Email address/i);
    const password = screen.getByLabelText(/^Password/i);

    expect(password).toHaveAttribute('type', 'password');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Access your account' }),
    ).toBeInTheDocument();
    fireEvent.change(email, { target: { value: '  Taylor@Example.COM  ' } });
    fireEvent.change(password, { target: { value: 'anything-at-all' } });
    submitClosestForm('Sign in');

    await waitFor(() => expect(mockIdentity).toHaveBeenCalledTimes(1));
    expect(mockIdentity).toHaveBeenCalledWith({
      channel: 'WEB',
      currency: 'USD',
      email: 'taylor@example.com',
      identifiers: [{ id: 'taylor@example.com', provider: 'email' }],
      language: 'EN-US',
      page: '/account-billing/login',
      extensionData: {
        source: 'account_login',
        intent: 'sign_in',
      },
    });
    expect(mockIdentity.mock.calls[0][0]).not.toHaveProperty('password');
    expect(await screen.findByText('You’re signed in')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Continue to your homepage' }),
    ).toHaveAttribute('href', '/');
  });

  it('requires a usable email and a nonempty login password', async () => {
    render(<Login {...loginProps} />);
    submitClosestForm('Sign in');

    expect(
      await screen.findByText('Email address is required.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(mockIdentity).not.toHaveBeenCalled();
  });

  it('masks registration passwords but validates only name and email fields', async () => {
    window.history.replaceState({}, '', '/account-billing/register');
    render(<Register {...registrationProps} />);

    const password = screen.getByLabelText(/^Password/i);
    const confirmPassword = screen.getByLabelText(/Confirm password/i);
    const phone = screen.getByLabelText(/Phone number/i);
    const address = screen.getAllByLabelText(/^Address/i)[0];

    expect(password).toHaveAttribute('type', 'password');
    expect(confirmPassword).toHaveAttribute('type', 'password');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Register your account' }),
    ).toBeInTheDocument();
    expect(password).not.toBeRequired();
    expect(confirmPassword).not.toBeRequired();
    expect(phone).not.toBeRequired();
    expect(address).not.toBeRequired();

    fireEvent.change(screen.getByLabelText(/First name/i), {
      target: { value: '  Taylor  ' },
    });
    fireEvent.change(screen.getByLabelText(/Last name/i), {
      target: { value: '  Morgan  ' },
    });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: '  Taylor@Example.COM  ' },
    });
    submitClosestForm('Register');

    await waitFor(() => expect(mockIdentity).toHaveBeenCalledTimes(1));
    expect(mockIdentity).toHaveBeenCalledWith({
      channel: 'WEB',
      currency: 'USD',
      email: 'taylor@example.com',
      firstName: 'Taylor',
      lastName: 'Morgan',
      identifiers: [{ id: 'taylor@example.com', provider: 'email' }],
      language: 'EN-US',
      page: '/account-billing/register',
      extensionData: {
        source: 'account_registration',
        intent: 'register_account',
      },
    });

    const payload = mockIdentity.mock.calls[0][0];
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('confirmPassword');
    expect(payload).not.toHaveProperty('phone');
    expect(payload).not.toHaveProperty('address');
    expect(
      await screen.findByText('Your registration is complete'),
    ).toBeInTheDocument();
  });

  it('blocks registration only when first name, last name, or email is missing', async () => {
    render(<Register {...registrationProps} />);
    submitClosestForm('Register');

    expect(
      await screen.findByText('First name is required.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Last name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
    expect(
      screen.queryByText(/phone number is required/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/^Address is required\.$/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/passwords? (?:is|are) required/i),
    ).not.toBeInTheDocument();
    expect(mockIdentity).not.toHaveBeenCalled();
  });

  it('does not identify visitors while previewing the account experience', async () => {
    const previewProps: CustomerAccountProps = {
      ...loginProps,
      page: {
        ...page,
        mode: {
          ...page.mode,
          isNormal: false,
          isPreview: true,
          name: 'preview' as Page['mode']['name'],
        },
      },
    };
    render(<Login {...previewProps} />);

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: 'visitor@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'anything' },
    });
    submitClosestForm('Sign in');

    expect(await screen.findByText('You’re signed in')).toBeInTheDocument();
    expect(mockIdentity).not.toHaveBeenCalled();
  });
});
