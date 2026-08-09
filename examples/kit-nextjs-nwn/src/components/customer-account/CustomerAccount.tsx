'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { identity } from '@sitecore-content-sdk/events';
import { Text } from '@sitecore-content-sdk/nextjs';
import { CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import config from 'sitecore.config';

import { CompatibleLink } from '@/components/content-sdk/CompatibleLink';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  getLocaleOption,
  getLocalizedPathname,
  type SupportedLocale,
} from '@/i18n/locales';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';

import type {
  CustomerAccountFields,
  CustomerAccountProps,
} from './customer-account.props';

const accountCopy = {
  en: {
    required: 'Required',
    requestError: 'We could not complete your request. Please try again.',
    emailRequired: 'Email address is required.',
    emailInvalid: 'Please enter a valid email address.',
    passwordRequired: 'Password is required.',
    firstNameRequired: 'First name is required.',
    firstNameTooLong: 'First name must be 100 characters or fewer.',
    lastNameRequired: 'Last name is required.',
    lastNameTooLong: 'Last name must be 100 characters or fewer.',
    accountEyebrow: 'NW Natural online account',
    loginTitle: 'Access your account',
    loginDescription:
      'Sign in to manage your bill, payment options, and natural gas service.',
    billingBenefit: 'Review billing and payment information.',
    secureBenefit: 'Manage your account in one secure place.',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    email: 'Email address',
    password: 'Password',
    loginPrompt: 'Need an online account?',
    register: 'Register',
    loginSuccessTitle: 'You’re signed in',
    loginSuccessMessage:
      'Your NW Natural account is ready. You can now manage billing, payments, and service information.',
    continueHome: 'Continue to your homepage',
    registerTitle: 'Register your account',
    registerDescription:
      'Create an online account to manage billing, payments, and natural gas service information.',
    yourInformation: 'Your information',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    confirmPassword: 'Confirm password',
    serviceAddress: 'Service address',
    address: 'Address',
    addressLine2: 'Address line 2',
    city: 'City',
    state: 'State',
    zipCode: 'ZIP code',
    registering: 'Registering…',
    privacyPrefix: 'By registering, you agree to our',
    privacyNotice: 'Privacy Notice',
    registrationPrompt: 'Already registered?',
    accessAccount: 'Access your account',
    registrationSuccessTitle: 'Your registration is complete',
    registrationSuccessMessage:
      'Your NW Natural online account is ready. Sign in with your email address to continue.',
  },
  'es-MX': {
    required: 'Obligatorio',
    requestError: 'No pudimos completar su solicitud. Inténtelo de nuevo.',
    emailRequired: 'El correo electrónico es obligatorio.',
    emailInvalid: 'Ingrese un correo electrónico válido.',
    passwordRequired: 'La contraseña es obligatoria.',
    firstNameRequired: 'El nombre es obligatorio.',
    firstNameTooLong: 'El nombre debe tener 100 caracteres o menos.',
    lastNameRequired: 'El apellido es obligatorio.',
    lastNameTooLong: 'El apellido debe tener 100 caracteres o menos.',
    accountEyebrow: 'Cuenta en línea de NW Natural',
    loginTitle: 'Acceda a su cuenta',
    loginDescription:
      'Inicie sesión para administrar su factura, opciones de pago y servicio de gas natural.',
    billingBenefit: 'Consulte la información de facturación y pagos.',
    secureBenefit: 'Administre su cuenta de manera segura desde un solo lugar.',
    signIn: 'Iniciar sesión',
    signingIn: 'Iniciando sesión…',
    email: 'Correo electrónico',
    password: 'Contraseña',
    loginPrompt: '¿Necesita una cuenta en línea?',
    register: 'Registrarse',
    loginSuccessTitle: 'Sesión iniciada',
    loginSuccessMessage:
      'Su cuenta de NW Natural está lista. Ahora puede administrar la facturación, los pagos y la información de servicio.',
    continueHome: 'Continuar a la página principal',
    registerTitle: 'Registre su cuenta',
    registerDescription:
      'Cree una cuenta en línea para administrar la facturación, los pagos y la información de su servicio de gas natural.',
    yourInformation: 'Su información',
    firstName: 'Nombre',
    lastName: 'Apellido',
    phone: 'Número de teléfono',
    confirmPassword: 'Confirmar contraseña',
    serviceAddress: 'Dirección de servicio',
    address: 'Dirección',
    addressLine2: 'Línea 2 de dirección',
    city: 'Ciudad',
    state: 'Estado',
    zipCode: 'Código postal',
    registering: 'Registrando…',
    privacyPrefix: 'Al registrarse, acepta nuestro',
    privacyNotice: 'Aviso de privacidad',
    registrationPrompt: '¿Ya se registró?',
    accessAccount: 'Acceda a su cuenta',
    registrationSuccessTitle: 'Su registro está completo',
    registrationSuccessMessage:
      'Su cuenta en línea de NW Natural está lista. Inicie sesión con su correo electrónico para continuar.',
  },
} as const;

type AccountCopy = (typeof accountCopy)[SupportedLocale];

const createLoginSchema = (copy: AccountCopy) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, copy.emailRequired)
      .email(copy.emailInvalid),
    password: z.string().min(1, copy.passwordRequired),
  });

const createRegistrationSchema = (copy: AccountCopy) =>
  z.object({
    firstName: z
      .string()
      .trim()
      .min(1, copy.firstNameRequired)
      .max(100, copy.firstNameTooLong),
    lastName: z
      .string()
      .trim()
      .min(1, copy.lastNameRequired)
      .max(100, copy.lastNameTooLong),
    email: z
      .string()
      .trim()
      .min(1, copy.emailRequired)
      .email(copy.emailInvalid),
    password: z.string(),
    confirmPassword: z.string(),
    phone: z.string(),
    address: z.string(),
    addressLine2: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  });

type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>;
type RegistrationValues = z.infer<ReturnType<typeof createRegistrationSchema>>;

type IdentityValues = {
  email: string;
  firstName?: string;
  lastName?: string;
};

const inputClasses =
  'min-h-12 border-slate-400 bg-white px-4 text-base text-slate-900 placeholder:text-slate-500 focus-visible:ring-primary';
const RequiredMark = ({ label }: { label: string }) => (
  <span
    aria-hidden="true"
    className="ml-2 text-xs font-semibold uppercase tracking-wide text-primary"
  >
    {label}
  </span>
);

const fieldText = (
  field: CustomerAccountFields[keyof CustomerAccountFields],
  fallback: string,
) => {
  if (!field || !('value' in field) || typeof field.value !== 'string') {
    return fallback;
  }

  return field.value.trim() || fallback;
};

const shouldIdentifyVisitor = (props: CustomerAccountProps) =>
  process.env.NODE_ENV === 'production' &&
  !props.page.mode.isEditing &&
  props.page.mode.isNormal &&
  !props.page.mode.isPreview;

const identifyVisitor = async (
  values: IdentityValues,
  source: 'account_login' | 'account_registration',
) => {
  if (!config.api?.edge?.clientContextId) {
    throw new Error('SitecoreAI client context is unavailable.');
  }

  const normalizedEmail = values.email.trim().toLowerCase();
  const response = await identity({
    channel: 'WEB',
    currency: 'USD',
    email: normalizedEmail,
    ...(values.firstName ? { firstName: values.firstName.trim() } : {}),
    ...(values.lastName ? { lastName: values.lastName.trim() } : {}),
    identifiers: [
      {
        id: normalizedEmail,
        provider:
          process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER || 'email',
      },
    ],
    language: (document.documentElement.lang || 'en').toUpperCase(),
    page: window.location.pathname || '/',
    extensionData: {
      source,
      intent: source === 'account_login' ? 'sign_in' : 'register_account',
    },
  });

  if (!response) {
    throw new Error('SitecoreAI did not accept the identity event.');
  }
};

const EditableHeading = ({
  fields,
  fallback,
  isPageEditing,
}: {
  fields: CustomerAccountFields;
  fallback: string;
  isPageEditing: boolean;
}) =>
  fields.title?.value || isPageEditing ? (
    <Text
      tag="h1"
      className="text-balance font-heading text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.08] text-slate-950"
      field={fields.title}
    />
  ) : (
    <h1 className="text-balance font-heading text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.08] text-slate-950">
      {fallback}
    </h1>
  );

const SecondaryAction = ({
  fields,
  fallbackPrompt,
  fallbackHref,
  fallbackLabel,
  isPageEditing,
  locale,
}: {
  fields: CustomerAccountFields;
  fallbackPrompt: string;
  fallbackHref: string;
  fallbackLabel: string;
  isPageEditing: boolean;
  locale: SupportedLocale;
}) => (
  <p className="mt-7 border-t border-slate-200 pt-6 text-base text-slate-700">
    <span>{fieldText(fields.secondaryPrompt, fallbackPrompt)} </span>
    {fields.secondaryLink &&
    (fields.secondaryLink.value?.href || isPageEditing) ? (
      <CompatibleLink
        field={fields.secondaryLink}
        editable={isPageEditing}
        prefetch={false}
        className="font-semibold text-primary underline decoration-cyan-500 decoration-2 underline-offset-4 hover:text-cyan-700"
      />
    ) : (
      <Link
        href={getLocalizedPathname(fallbackHref, locale)}
        prefetch={false}
        className="font-semibold text-primary underline decoration-cyan-500 decoration-2 underline-offset-4 hover:text-cyan-700"
      >
        {fallbackLabel}
      </Link>
    )}
  </p>
);

const SuccessState = ({
  fields,
  titleFallback,
  messageFallback,
  linkHref,
  linkLabel,
  locale,
}: {
  fields: CustomerAccountFields;
  titleFallback: string;
  messageFallback: string;
  linkHref: string;
  linkLabel: string;
  locale: SupportedLocale;
}) => (
  <div
    className="mx-auto flex min-h-80 max-w-2xl flex-col items-center justify-center px-6 py-14 text-center sm:px-10"
    role="status"
    aria-live="polite"
  >
    <CheckCircle2 className="h-14 w-14 text-cyan-600" aria-hidden="true" />
    <h1 className="mt-5 font-heading text-3xl font-semibold text-slate-950">
      {fieldText(fields.successTitle, titleFallback)}
    </h1>
    <p className="mt-4 max-w-xl text-lg leading-8 text-slate-700">
      {fieldText(fields.successMessage, messageFallback)}
    </p>
    <Button asChild size="lg" className="mt-8 min-h-12 px-7 text-base">
      <Link href={getLocalizedPathname(linkHref, locale)} prefetch={false}>
        {linkLabel}
      </Link>
    </Button>
  </div>
);

export const Login: React.FC<CustomerAccountProps> = (props) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string>();
  const fields = props.fields;
  const isPageEditing = props.page.mode.isEditing;
  const locale = getLocaleOption(props.page.locale).code;
  const copy = accountCopy[locale];
  const form = useForm<LoginValues>({
    resolver: zodResolver(createLoginSchema(copy)),
    defaultValues: { email: '', password: '' },
  });

  if (!fields) {
    return <NoDataFallback componentName="Customer Account" />;
  }

  const onSubmit = async (values: LoginValues) => {
    setSubmissionError(undefined);

    if (shouldIdentifyVisitor(props)) {
      try {
        await identifyVisitor({ email: values.email }, 'account_login');
      } catch {
        setSubmissionError(copy.requestError);
        return;
      }
    }

    form.reset();
    setIsSubmitted(true);
  };

  return (
    <section
      data-component="CustomerAccount"
      data-variant="Login"
      className={cn(
        'nwn-customer-account my-12 w-full px-4 md:my-16',
        props.params?.styles,
      )}
    >
      <div className="mx-auto max-w-5xl overflow-hidden border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.10)]">
        {isSubmitted ? (
          <SuccessState
            fields={fields}
            titleFallback={copy.loginSuccessTitle}
            messageFallback={copy.loginSuccessMessage}
            linkHref="/"
            linkLabel={copy.continueHome}
            locale={locale}
          />
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="border-t-8 border-cyan-500 bg-[#eaf5f6] p-7 sm:p-10 lg:p-12">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                {copy.accountEyebrow}
              </p>
              <EditableHeading
                fields={fields}
                fallback={copy.loginTitle}
                isPageEditing={isPageEditing}
              />
              <p className="mt-5 max-w-prose text-lg leading-8 text-slate-700">
                {fieldText(fields.description, copy.loginDescription)}
              </p>
              <div className="mt-8 space-y-4 text-base text-slate-700">
                <p className="flex items-start gap-3">
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700"
                    aria-hidden="true"
                  />
                  {copy.billingBenefit}
                </p>
                <p className="flex items-start gap-3">
                  <LockKeyhole
                    className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700"
                    aria-hidden="true"
                  />
                  {copy.secureBenefit}
                </p>
              </div>
            </div>

            <div className="p-7 sm:p-10 lg:p-12">
              <h2 className="font-heading text-2xl font-semibold text-slate-950">
                {copy.signIn}
              </h2>
              <Form {...form}>
                <form
                  className="mt-7 space-y-6"
                  onSubmit={form.handleSubmit(onSubmit)}
                  aria-busy={form.formState.isSubmitting}
                  noValidate
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-800">
                          {copy.email}
                          <RequiredMark label={copy.required} />
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            required
                            disabled={form.formState.isSubmitting}
                            className={inputClasses}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-800">
                          {copy.password}
                          <RequiredMark label={copy.required} />
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="off"
                            data-1p-ignore="true"
                            data-lpignore="true"
                            data-form-type="other"
                            required
                            disabled={form.formState.isSubmitting}
                            className={inputClasses}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {submissionError && (
                    <p
                      className="text-sm font-medium text-destructive"
                      role="alert"
                      aria-live="polite"
                    >
                      {submissionError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="min-h-12 w-full px-7 text-base font-semibold"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting
                      ? copy.signingIn
                      : fieldText(fields.submitLabel, copy.signIn)}
                  </Button>
                </form>
              </Form>

              <SecondaryAction
                fields={fields}
                fallbackPrompt={copy.loginPrompt}
                fallbackHref="/account-billing/register"
                fallbackLabel={copy.register}
                isPageEditing={isPageEditing}
                locale={locale}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export const Register: React.FC<CustomerAccountProps> = (props) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string>();
  const fields = props.fields;
  const isPageEditing = props.page.mode.isEditing;
  const locale = getLocaleOption(props.page.locale).code;
  const copy = accountCopy[locale];
  const form = useForm<RegistrationValues>({
    resolver: zodResolver(createRegistrationSchema(copy)),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      address: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  if (!fields) {
    return <NoDataFallback componentName="Customer Account" />;
  }

  const onSubmit = async (values: RegistrationValues) => {
    setSubmissionError(undefined);

    if (shouldIdentifyVisitor(props)) {
      try {
        await identifyVisitor(
          {
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
          },
          'account_registration',
        );
      } catch {
        setSubmissionError(copy.requestError);
        return;
      }
    }

    form.reset();
    setIsSubmitted(true);
  };

  return (
    <section
      data-component="CustomerAccount"
      data-variant="Register"
      className={cn(
        'nwn-customer-account my-12 w-full px-4 md:my-16',
        props.params?.styles,
      )}
    >
      <div className="mx-auto max-w-6xl overflow-hidden border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.10)]">
        {isSubmitted ? (
          <SuccessState
            fields={fields}
            titleFallback={copy.registrationSuccessTitle}
            messageFallback={copy.registrationSuccessMessage}
            linkHref="/account-billing/login"
            linkLabel={copy.accessAccount}
            locale={locale}
          />
        ) : (
          <>
            <div className="border-t-8 border-cyan-500 bg-[#eaf5f6] px-7 py-8 sm:px-10 lg:px-12 lg:py-10">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                {copy.accountEyebrow}
              </p>
              <EditableHeading
                fields={fields}
                fallback={copy.registerTitle}
                isPageEditing={isPageEditing}
              />
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
                {fieldText(fields.description, copy.registerDescription)}
              </p>
            </div>

            <div className="p-7 sm:p-10 lg:p-12">
              <Form {...form}>
                <form
                  className="space-y-10"
                  onSubmit={form.handleSubmit(onSubmit)}
                  aria-busy={form.formState.isSubmitting}
                  noValidate
                >
                  <fieldset>
                    <legend className="font-heading text-2xl font-semibold text-slate-950">
                      {copy.yourInformation}
                    </legend>
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.firstName}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                autoComplete="given-name"
                                required
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.lastName}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                autoComplete="family-name"
                                required
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.email}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                required
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.phone}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                autoComplete="tel"
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.password}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                autoComplete="off"
                                data-1p-ignore="true"
                                data-lpignore="true"
                                data-form-type="other"
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.confirmPassword}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                autoComplete="off"
                                data-1p-ignore="true"
                                data-lpignore="true"
                                data-form-type="other"
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </fieldset>

                  <fieldset className="border-t border-slate-200 pt-9">
                    <legend className="font-heading text-2xl font-semibold text-slate-950">
                      {copy.serviceAddress}
                    </legend>
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.address}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                autoComplete="address-line1"
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="addressLine2"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.addressLine2}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                autoComplete="address-line2"
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.city}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                autoComplete="address-level2"
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.state}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                autoComplete="address-level1"
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-800">
                              {copy.zipCode}
                              <RequiredMark label={copy.required} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="numeric"
                                autoComplete="postal-code"
                                disabled={form.formState.isSubmitting}
                                className={inputClasses}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </fieldset>

                  {submissionError && (
                    <p
                      className="text-sm font-medium text-destructive"
                      role="alert"
                      aria-live="polite"
                    >
                      {submissionError}
                    </p>
                  )}

                  <div>
                    <Button
                      type="submit"
                      size="lg"
                      className="min-h-12 w-full px-7 text-base font-semibold sm:w-auto"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting
                        ? copy.registering
                        : fieldText(fields.submitLabel, copy.register)}
                    </Button>
                    <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600">
                      {copy.privacyPrefix}{' '}
                      <a
                        href="https://www.nwnatural.com/privacy-notice"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary underline underline-offset-2"
                      >
                        {copy.privacyNotice}
                      </a>
                      .
                    </p>
                    <SecondaryAction
                      fields={fields}
                      fallbackPrompt={copy.registrationPrompt}
                      fallbackHref="/account-billing/login"
                      fallbackLabel={copy.accessAccount}
                      isPageEditing={isPageEditing}
                      locale={locale}
                    />
                  </div>
                </form>
              </Form>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export const Default = Login;
