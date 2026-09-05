'use client';

import type { FormEvent } from 'react';
import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Field } from '@sitecore-content-sdk/nextjs';
import { Text } from '@sitecore-content-sdk/nextjs';
import { identity } from '@sitecore-content-sdk/events';

type SubmissionState = 'idle' | 'invalid' | 'submitting' | 'success' | 'error';

type FooterNewsletterSignupProps = {
  title?: Field<string>;
  description?: Field<string>;
  locale?: string;
  trackingEnabled?: boolean;
};

const copy = {
  en: {
    formLabel: 'Newsletter signup',
    emailLabel: 'Email address',
    placeholder: 'you@company.com',
    submit: 'Subscribe',
    submitting: 'Subscribing…',
    success:
      'Thank you. Your email and newsletter preference have been recorded.',
    invalid: 'Enter a valid email address.',
    error: 'We couldn’t record your newsletter preference. Please try again.',
    unavailable: 'Newsletter signup is available on the published site.',
  },
  'es-MX': {
    formLabel: 'Suscripción al boletín',
    emailLabel: 'Correo electrónico',
    placeholder: 'nombre@empresa.com',
    submit: 'Suscribirse',
    submitting: 'Suscribiendo…',
    success: 'Gracias. Guardamos su correo y preferencia para el boletín.',
    invalid: 'Ingrese un correo electrónico válido.',
    error:
      'No pudimos guardar su preferencia para el boletín. Inténtelo de nuevo.',
    unavailable: 'La suscripción está disponible en el sitio publicado.',
  },
} as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FooterNewsletterSignup({
  title,
  description,
  locale,
  trackingEnabled = true,
}: FooterNewsletterSignupProps) {
  const router = useRouter();
  const language = locale?.toLowerCase() === 'es-mx' ? 'es-MX' : 'en';
  const labels = copy[language];
  const inputId = useId();
  const statusId = `${inputId}-status`;
  const [email, setEmail] = useState('');
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>('idle');
  const canSubmit = trackingEnabled && process.env.NODE_ENV !== 'development';
  const isLocked =
    !canSubmit ||
    submissionState === 'submitting' ||
    submissionState === 'success';

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !canSubmit ||
      submissionState === 'submitting' ||
      submissionState === 'success'
    ) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setSubmissionState('invalid');
      return;
    }

    setSubmissionState('submitting');

    try {
      const response = await identity({
        identifiers: [{ id: normalizedEmail, provider: 'email' }],
        email: normalizedEmail,
        channel: 'WEB',
        language: language === 'es-MX' ? 'ES' : 'EN',
        page: window.location.pathname,
        extensionData: {
          newsletterOptIn: true,
          signupSource: 'global_footer',
        },
      });

      if (!response) {
        throw new Error('Sitecore identity event was not accepted');
      }

      setEmail('');
      setSubmissionState('success');

      // Re-evaluate server-side personalization with the identified visitor,
      // and discard prefetched content from their anonymous journey.
      try {
        router.refresh();
      } catch {
        // The identity event succeeded even if the optional refresh failed.
      }
    } catch {
      setSubmissionState('error');
    }
  };

  const statusMessage =
    submissionState === 'invalid'
      ? labels.invalid
      : submissionState === 'error'
        ? labels.error
        : submissionState === 'success'
          ? labels.success
          : !canSubmit
            ? labels.unavailable
            : '';

  return (
    <aside
      className="bg-accent text-accent-foreground p-6"
      data-testid="footer-newsletter"
    >
      {title && (
        <Text
          tag="h2"
          field={title}
          className="font-heading text-2xl font-light leading-8"
        />
      )}
      {description && (
        <Text
          field={description}
          className="font-body mt-4 text-base leading-6"
        />
      )}
      <form
        aria-label={labels.formLabel}
        className="mt-7"
        noValidate
        onSubmit={onSubmit}
      >
        <label
          className="font-body mb-2 block text-sm font-medium"
          htmlFor={inputId}
        >
          {labels.emailLabel}
        </label>
        <div className="flex flex-col gap-3 @sm:flex-row">
          <input
            id={inputId}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-describedby={statusId}
            aria-invalid={submissionState === 'invalid'}
            className="h-[50px] min-w-0 flex-1 border border-dark/25 bg-white px-4 text-dark placeholder:text-dark/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLocked}
            placeholder={labels.placeholder}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (
                submissionState === 'invalid' ||
                submissionState === 'error'
              ) {
                setSubmissionState('idle');
              }
            }}
          />
          <button
            type="submit"
            className="h-[50px] shrink-0 bg-dark px-6 font-medium text-white transition-colors hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLocked}
          >
            {submissionState === 'submitting'
              ? labels.submitting
              : labels.submit}
          </button>
        </div>
        <p
          id={statusId}
          className="mt-3 min-h-5 text-sm"
          role={
            submissionState === 'invalid' || submissionState === 'error'
              ? 'alert'
              : 'status'
          }
          aria-live="polite"
        >
          {statusMessage}
        </p>
      </form>
    </aside>
  );
}
