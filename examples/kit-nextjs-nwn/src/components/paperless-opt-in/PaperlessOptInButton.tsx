'use client';

import { useEffect, useState } from 'react';
import { identity } from '@sitecore-content-sdk/events';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  getLocaleOption,
  getLocalizedPathname,
  type SupportedLocale,
} from '@/i18n/locales';
import {
  optInDemoAccountToPaperless,
  SitecoreAiUdlClientError,
  verifyPaperlessOptInSession,
} from '@/lib/sitecoreai-udl-client';

const paperlessCopy = {
  en: {
    eyebrow: 'Account preferences',
    heading: 'Choose paperless billing',
    description:
      'Receive your bill online, reduce paper mail, and keep statements easy to find.',
    idle: 'Choose paperless billing',
    pending: 'Saving preference…',
    pendingMessage:
      'We’re securely updating your billing preference. This can take up to a minute.',
    success: 'Paperless preference saved',
    successMessage:
      'Make monthly payments one less thing to remember with Auto Pay.',
    autoPay: 'Explore Auto Pay',
    returnHome: 'Return to homepage',
    error: 'We couldn’t update your preference. Please try again.',
  },
  'es-MX': {
    eyebrow: 'Preferencias de la cuenta',
    heading: 'Elija la facturación electrónica',
    description:
      'Reciba su factura en línea, reduzca el correo impreso y encuentre sus estados de cuenta fácilmente.',
    idle: 'Elegir facturación electrónica',
    pending: 'Guardando preferencia…',
    pendingMessage:
      'Estamos actualizando de forma segura su preferencia de facturación. Esto puede tardar hasta un minuto.',
    success: 'Preferencia de facturación electrónica guardada',
    successMessage:
      'Con Auto Pay, sus pagos mensuales pueden ser una preocupación menos.',
    autoPay: 'Explorar Auto Pay',
    returnHome: 'Volver a la página principal',
    error: 'No pudimos actualizar su preferencia. Inténtelo de nuevo.',
  },
} as const satisfies Record<
  SupportedLocale,
  {
    eyebrow: string;
    heading: string;
    description: string;
    idle: string;
    pending: string;
    pendingMessage: string;
    success: string;
    successMessage: string;
    autoPay: string;
    returnHome: string;
    error: string;
  }
>;

type SubmissionState = 'idle' | 'pending' | 'success' | 'error';
type SessionVisibility =
  | 'checking'
  | 'verified'
  | 'paperless'
  | 'anonymous';

export type PaperlessOptInButtonProps = {
  locale?: string;
  label?: string;
  successHref?: string;
  successLabel?: string;
};

export const PaperlessOptInButton = ({
  locale,
  label,
  successHref,
  successLabel,
}: PaperlessOptInButtonProps) => {
  const router = useRouter();
  const [sessionVisibility, setSessionVisibility] =
    useState<SessionVisibility>('checking');
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>('idle');
  const localeOption = getLocaleOption(locale);
  const copy = paperlessCopy[localeOption.code];
  const idleLabel = label?.trim() || copy.idle;
  const isPending = submissionState === 'pending';
  const isSuccessful = submissionState === 'success';

  useEffect(() => {
    let isActive = true;

    void verifyPaperlessOptInSession()
      .then(({ session }) => {
        if (isActive) {
          setSessionVisibility(session.paperless ? 'paperless' : 'verified');
        }
      })
      .catch(() => {
        if (isActive) setSessionVisibility('anonymous');
      });

    return () => {
      isActive = false;
    };
  }, []);

  const submitPreference = async () => {
    if (isPending || isSuccessful) return;

    setSubmissionState('pending');

    try {
      const { session } = await optInDemoAccountToPaperless();
      const isValidEmail = z.string().email().safeParse(session.email).success;

      const identityResponse = await identity({
        channel: 'WEB',
        currency: 'USD',
        ...(isValidEmail ? { email: session.email } : {}),
        identifiers: [
          {
            id: session.email,
            provider:
              process.env.NEXT_PUBLIC_SITECOREAI_IDENTITY_PROVIDER || 'email',
          },
        ],
        language: localeOption.shortLabel,
        page: '/paperless-billing/opt-in',
        extensionData: {
          source: 'paperless_opt_in',
          intent: 'update_billing_preference',
          paperless: true,
        },
      });

      if (!identityResponse || identityResponse.status !== 'OK') {
        throw new Error('SitecoreAI did not accept the identity event.');
      }

      setSubmissionState('success');
    } catch (error) {
      if (error instanceof SitecoreAiUdlClientError && error.status === 401) {
        setSubmissionState('idle');
        router.push(
          getLocalizedPathname('/account-billing/login', localeOption.code),
        );
        return;
      }

      setSubmissionState('error');
    }
  };

  const buttonLabel = isPending
    ? copy.pending
    : isSuccessful
      ? copy.success
      : idleLabel;

  if (sessionVisibility !== 'verified') return null;

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={submitPreference}
        disabled={isPending || isSuccessful}
        aria-busy={isPending}
      >
        {isPending && (
          <span
            aria-hidden="true"
            className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
        )}
        {buttonLabel}
      </Button>
      {isPending && (
        <p
          className="text-primary-foreground text-sm"
          role="status"
          aria-live="polite"
        >
          {copy.pendingMessage}
        </p>
      )}
      {isSuccessful && (
        <>
          <p
            className="text-primary-foreground text-sm"
            role="status"
            aria-live="polite"
          >
            {copy.successMessage}
          </p>
          <Button asChild variant="secondary">
            <Link
              href={
                successHref ||
                getLocalizedPathname(
                  '/account-billing/pay-my-bill#payment-options',
                  localeOption.code,
                )
              }
              prefetch={false}
            >
              {successLabel?.trim() || copy.autoPay}
            </Link>
          </Button>
        </>
      )}
      {submissionState === 'error' && (
        <p
          className="text-primary-foreground text-sm font-medium"
          role="alert"
          aria-live="assertive"
        >
          {copy.error}
        </p>
      )}
    </div>
  );
};

export const PaperlessOptInExperience = ({ locale }: { locale?: string }) => {
  const localeOption = getLocaleOption(locale);
  const copy = paperlessCopy[localeOption.code];

  return (
    <section
      data-component="PaperlessOptInExperience"
      className="bg-background px-6 py-8"
      aria-labelledby="paperless-opt-in-heading"
    >
      <div className="bg-primary mx-auto flex w-full max-w-screen-xl flex-col items-start gap-4 p-7 text-left text-white md:p-10">
        <p className="font-heading text-sm font-semibold uppercase tracking-[0.08em]">
          {copy.eyebrow}
        </p>
        <div className="max-w-3xl space-y-3">
          <h2
            id="paperless-opt-in-heading"
            className="font-heading text-3xl font-medium leading-tight md:text-4xl"
          >
            {copy.heading}
          </h2>
          <p className="text-lg leading-relaxed">{copy.description}</p>
        </div>
        <PaperlessOptInButton
          locale={localeOption.code}
          successHref={getLocalizedPathname('/', localeOption.code)}
          successLabel={copy.returnHome}
        />
      </div>
    </section>
  );
};
