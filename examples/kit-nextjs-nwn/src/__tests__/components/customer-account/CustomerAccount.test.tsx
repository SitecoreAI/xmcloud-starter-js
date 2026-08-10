import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { identity } from '@sitecore-content-sdk/events';
import type { Page } from '@sitecore-content-sdk/nextjs';
import config from 'sitecore.config';

import { Login, Register } from '@/components/customer-account/CustomerAccount';
import type { CustomerAccountProps } from '@/components/customer-account/customer-account.props';
import {
  establishDemoAccountSession,
  establishDemoRegistrationSession,
} from '@/lib/sitecoreai-udl-client';

jest.unmock('react-hook-form');
jest.unmock('@/components/ui/form');

jest.mock('@sitecore-content-sdk/events', () => ({
  identity: jest.fn(),
}));

jest.mock('@/lib/sitecoreai-udl-client', () => ({
  establishDemoAccountSession: jest.fn(),
  establishDemoRegistrationSession: jest.fn(),
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
const mockEstablishDemoAccountSession =
  establishDemoAccountSession as jest.MockedFunction<
    typeof establishDemoAccountSession
  >;
const mockEstablishDemoRegistrationSession =
  establishDemoRegistrationSession as jest.MockedFunction<
    typeof establishDemoRegistrationSession
  >;
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
    mockEstablishDemoAccountSession.mockResolvedValue({
      session: { established: true },
    });
    mockEstablishDemoRegistrationSession.mockResolvedValue({
      session: { established: true },
    });
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
    expect(mockEstablishDemoAccountSession).toHaveBeenCalledWith(
      'taylor@example.com',
    );
    expect(
      mockEstablishDemoAccountSession.mock.invocationCallOrder[0],
    ).toBeLessThan(mockIdentity.mock.invocationCallOrder[0]);
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
    expect(mockEstablishDemoAccountSession).not.toHaveBeenCalled();
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
      target: { value: '  NWN-LIVE-20260809-143025@Example.COM  ' },
    });
    submitClosestForm('Register');

    await waitFor(() => expect(mockIdentity).toHaveBeenCalledTimes(1));
    expect(mockIdentity).toHaveBeenCalledWith({
      channel: 'WEB',
      currency: 'USD',
      email: 'nwn-live-20260809-143025@example.com',
      firstName: 'Taylor',
      lastName: 'Morgan',
      identifiers: [
        {
          id: 'nwn-live-20260809-143025@example.com',
          provider: 'email',
        },
      ],
      language: 'EN-US',
      page: '/account-billing/register',
      extensionData: {
        source: 'account_registration',
        intent: 'register_account',
        paperless: false,
      },
    });

    const payload = mockIdentity.mock.calls[0][0];
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('confirmPassword');
    expect(payload).not.toHaveProperty('phone');
    expect(payload).not.toHaveProperty('address');
    expect(mockEstablishDemoRegistrationSession).toHaveBeenCalledWith(
      'nwn-live-20260809-143025@example.com',
    );
    expect(mockIdentity.mock.invocationCallOrder[0]).toBeLessThan(
      mockEstablishDemoRegistrationSession.mock.invocationCallOrder[0],
    );
    expect(
      await screen.findByText('Your registration is complete'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your NW Natural online account is ready, and you’re signed in. Continue to your homepage.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Sign in with your email address.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Continue to your homepage' }),
    ).toHaveAttribute('href', '/');
  });

  it('places the service address heading below its section divider', () => {
    render(<Register {...registrationProps} />);

    const serviceAddressLegend = screen.getByText('Service address');
    const serviceAddressFieldset = serviceAddressLegend.closest('fieldset');
    const serviceAddressSection = serviceAddressFieldset?.parentElement;

    expect(serviceAddressFieldset).toHaveClass('min-w-0');
    expect(serviceAddressFieldset).not.toHaveClass('border-t');
    expect(serviceAddressSection).toHaveClass(
      'border-t',
      'border-slate-200',
      'pt-9',
    );
  });

  it.each(['rejects', 'returns null', 'returns non-OK'] as const)(
    'keeps registration incomplete when IDENTITY %s',
    async (outcome) => {
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

      render(<Register {...registrationProps} />);
      fireEvent.change(screen.getByLabelText(/First name/i), {
        target: { value: 'Taylor' },
      });
      fireEvent.change(screen.getByLabelText(/Last name/i), {
        target: { value: 'Morgan' },
      });
      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: 'nwn-live-20260809-143025@example.com' },
      });
      submitClosestForm('Register');

      expect(
        await screen.findByText(
          'We could not complete your request. Please try again.',
        ),
      ).toBeInTheDocument();
      expect(mockEstablishDemoRegistrationSession).not.toHaveBeenCalled();
      expect(
        screen.queryByText('Your registration is complete'),
      ).not.toBeInTheDocument();
    },
  );

  it('uses localized Spanish registration success copy instead of authored fields', async () => {
    const spanishProps: CustomerAccountProps = {
      ...registrationProps,
      fields: {
        successTitle: { value: 'Stale authored registration title' },
        successMessage: { value: 'Stale authored registration message' },
      },
      page: { ...page, locale: 'es-MX' },
    };
    document.documentElement.lang = 'es-MX';
    render(<Register {...spanishProps} />);

    fireEvent.change(screen.getByLabelText(/^Nombre/i), {
      target: { value: 'María' },
    });
    fireEvent.change(screen.getByLabelText(/^Apellido/i), {
      target: { value: 'Santos' },
    });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'nwn-live-20260809-143026@example.com' },
    });
    submitClosestForm('Registrarse');

    expect(
      await screen.findByText('Su registro está completo'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Su cuenta en línea de NW Natural está lista y la sesión está iniciada. Continúe a la página principal.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Continuar a la página principal' }),
    ).toHaveAttribute('href', '/es-MX');
    expect(
      screen.queryByText('Stale authored registration message'),
    ).not.toBeInTheDocument();
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
    expect(mockEstablishDemoRegistrationSession).not.toHaveBeenCalled();
  });

  it('keeps the login form open when session establishment fails', async () => {
    mockEstablishDemoAccountSession.mockRejectedValueOnce(
      new Error('Session creation failed.'),
    );
    render(<Login {...loginProps} />);

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: '  Taylor@Example.COM  ' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'anything' },
    });
    submitClosestForm('Sign in');

    expect(
      await screen.findByText(
        'We could not complete your request. Please try again.',
      ),
    ).toBeInTheDocument();
    expect(mockEstablishDemoAccountSession).toHaveBeenCalledWith(
      'taylor@example.com',
    );
    expect(mockIdentity).not.toHaveBeenCalled();
    expect(screen.queryByText('You’re signed in')).not.toBeInTheDocument();
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
    expect(mockEstablishDemoAccountSession).not.toHaveBeenCalled();
    expect(mockEstablishDemoRegistrationSession).not.toHaveBeenCalled();
  });

  it('keeps the Spanish login journey localized through validation and success', async () => {
    const spanishProps: CustomerAccountProps = {
      ...loginProps,
      fields: {},
      page: { ...page, locale: 'es-MX' },
    };
    document.documentElement.lang = 'es-MX';
    window.history.replaceState({}, '', '/es-MX/account-billing/login');
    render(<Login {...spanishProps} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Acceda a su cuenta' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrarse' })).toHaveAttribute(
      'href',
      '/es-MX/account-billing/register',
    );

    submitClosestForm('Iniciar sesión');
    expect(
      await screen.findByText('El correo electrónico es obligatorio.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('La contraseña es obligatoria.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'visitante@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i), {
      target: { value: 'demo' },
    });
    submitClosestForm('Iniciar sesión');

    expect(await screen.findByText('Sesión iniciada')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Continuar a la página principal' }),
    ).toHaveAttribute('href', '/es-MX');
    expect(mockIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'visitante@example.com',
        language: 'ES-MX',
        page: '/es-MX/account-billing/login',
      }),
    );
    expect(mockEstablishDemoAccountSession).toHaveBeenCalledWith(
      'visitante@example.com',
    );
  });

  it('shows Spanish required cues without making demo-only fields blocking', () => {
    const spanishProps: CustomerAccountProps = {
      ...registrationProps,
      fields: {},
      page: { ...page, locale: 'es-MX' },
    };
    render(<Register {...spanishProps} />);

    expect(screen.getAllByText('Obligatorio')).toHaveLength(11);
    expect(screen.getByLabelText(/Número de teléfono/i)).not.toBeRequired();
    expect(screen.getByLabelText(/^Contraseña/i)).not.toBeRequired();
    expect(screen.getByLabelText(/^Dirección/i)).not.toBeRequired();
  });
});
