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
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';

import type {
  CustomerAccountFields,
  CustomerAccountProps,
} from './customer-account.props';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required.')
    .email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const registrationSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required.')
    .max(100, 'First name must be 100 characters or fewer.'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required.')
    .max(100, 'Last name must be 100 characters or fewer.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required.')
    .email('Please enter a valid email address.'),
  password: z.string(),
  confirmPassword: z.string(),
  phone: z.string(),
  address: z.string(),
  addressLine2: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegistrationValues = z.infer<typeof registrationSchema>;

type IdentityValues = {
  email: string;
  firstName?: string;
  lastName?: string;
};

const inputClasses =
  'min-h-12 border-slate-400 bg-white px-4 text-base text-slate-900 placeholder:text-slate-500 focus-visible:ring-primary';
const cdpErrorMessage = 'We could not complete your request. Please try again.';

const RequiredMark = () => (
  <span
    aria-hidden="true"
    className="ml-2 text-xs font-semibold uppercase tracking-wide text-primary"
  >
    Required
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
}: {
  fields: CustomerAccountFields;
  fallbackPrompt: string;
  fallbackHref: string;
  fallbackLabel: string;
  isPageEditing: boolean;
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
        href={fallbackHref}
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
}: {
  fields: CustomerAccountFields;
  titleFallback: string;
  messageFallback: string;
  linkHref: string;
  linkLabel: string;
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
      <Link href={linkHref} prefetch={false}>
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
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
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
        setSubmissionError(cdpErrorMessage);
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
            titleFallback="You’re signed in"
            messageFallback="Your NW Natural account is ready. You can now manage billing, payments, and service information."
            linkHref="/"
            linkLabel="Continue to your homepage"
          />
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="border-t-8 border-cyan-500 bg-[#eaf5f6] p-7 sm:p-10 lg:p-12">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                NW Natural online account
              </p>
              <EditableHeading
                fields={fields}
                fallback="Access your account"
                isPageEditing={isPageEditing}
              />
              <p className="mt-5 max-w-prose text-lg leading-8 text-slate-700">
                {fieldText(
                  fields.description,
                  'Sign in to manage your bill, payment options, and natural gas service.',
                )}
              </p>
              <div className="mt-8 space-y-4 text-base text-slate-700">
                <p className="flex items-start gap-3">
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700"
                    aria-hidden="true"
                  />
                  Review billing and payment information.
                </p>
                <p className="flex items-start gap-3">
                  <LockKeyhole
                    className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700"
                    aria-hidden="true"
                  />
                  Manage your account in one secure place.
                </p>
              </div>
            </div>

            <div className="p-7 sm:p-10 lg:p-12">
              <h2 className="font-heading text-2xl font-semibold text-slate-950">
                Sign in
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
                          Email address
                          <RequiredMark />
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
                          Password
                          <RequiredMark />
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
                      ? 'Signing in…'
                      : fieldText(fields.submitLabel, 'Sign in')}
                  </Button>
                </form>
              </Form>

              <SecondaryAction
                fields={fields}
                fallbackPrompt="Need an online account?"
                fallbackHref="/account-billing/register"
                fallbackLabel="Register"
                isPageEditing={isPageEditing}
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
  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
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
        setSubmissionError(cdpErrorMessage);
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
            titleFallback="Your registration is complete"
            messageFallback="Your NW Natural online account is ready. Sign in with your email address to continue."
            linkHref="/account-billing/login"
            linkLabel="Access your account"
          />
        ) : (
          <>
            <div className="border-t-8 border-cyan-500 bg-[#eaf5f6] px-7 py-8 sm:px-10 lg:px-12 lg:py-10">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                NW Natural online account
              </p>
              <EditableHeading
                fields={fields}
                fallback="Register your account"
                isPageEditing={isPageEditing}
              />
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
                {fieldText(
                  fields.description,
                  'Create an online account to manage billing, payments, and natural gas service information.',
                )}
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
                      Your information
                    </legend>
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-800">
                              First name
                              <RequiredMark />
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
                              Last name
                              <RequiredMark />
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
                              Email address
                              <RequiredMark />
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
                              Phone number
                              <RequiredMark />
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
                              Password
                              <RequiredMark />
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
                              Confirm password
                              <RequiredMark />
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
                      Service address
                    </legend>
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-base font-semibold text-slate-800">
                              Address
                              <RequiredMark />
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
                              Address line 2<RequiredMark />
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
                              City
                              <RequiredMark />
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
                              State
                              <RequiredMark />
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
                              ZIP code
                              <RequiredMark />
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
                        ? 'Registering…'
                        : fieldText(fields.submitLabel, 'Register')}
                    </Button>
                    <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600">
                      By registering, you agree to our{' '}
                      <a
                        href="https://www.nwnatural.com/privacy-notice"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary underline underline-offset-2"
                      >
                        Privacy Notice
                      </a>
                      .
                    </p>
                    <SecondaryAction
                      fields={fields}
                      fallbackPrompt="Already registered?"
                      fallbackHref="/account-billing/login"
                      fallbackLabel="Access your account"
                      isPageEditing={isPageEditing}
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
