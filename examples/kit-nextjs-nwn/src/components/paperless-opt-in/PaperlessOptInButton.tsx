'use client';

import { useState } from 'react';
import { identity } from '@sitecore-content-sdk/events';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  getLocaleOption,
  getLocalizedPathname,
  type SupportedLocale,
} from '@/i18n/locales';
import {
  SitecoreAiUdlClientError,
  verifyPaperlessOptInSession,
} from '@/lib/sitecoreai-udl-client';

const paperlessCopy = {
  en: {
    idle: 'Choose paperless billing',
    pending: 'Saving preference…',
    success: 'Paperless billing is on',
    successMessage: 'Your paperless billing preference has been saved.',
    autoPay: 'Explore AutoPay',
    error: 'We couldn’t update your preference. Please try again.',
  },
  'es-MX': {
    idle: 'Elegir facturación electrónica',
    pending: 'Guardando preferencia…',
    success: 'La facturación electrónica está activada',
    successMessage: 'Se guardó su preferencia de facturación electrónica.',
    autoPay: 'Explorar AutoPay',
    error: 'No pudimos actualizar su preferencia. Inténtelo de nuevo.',
  },
} as const satisfies Record<
  SupportedLocale,
  {
    idle: string;
    pending: string;
    success: string;
    successMessage: string;
    autoPay: string;
    error: string;
  }
>;

type SubmissionState = 'idle' | 'pending' | 'success' | 'error';

export type PaperlessOptInButtonProps = {
  locale?: string;
  label?: string;
};

export const PaperlessOptInButton = ({
  locale,
  label,
}: PaperlessOptInButtonProps) => {
  const router = useRouter();
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>('idle');
  const localeOption = getLocaleOption(locale);
  const copy = paperlessCopy[localeOption.code];
  const idleLabel = label?.trim() || copy.idle;
  const isPending = submissionState === 'pending';
  const isSuccessful = submissionState === 'success';

  const submitPreference = async () => {
    if (isPending || isSuccessful) return;

    setSubmissionState('pending');

    try {
      const { session } = await verifyPaperlessOptInSession();

      const identityResponse = await identity({
        channel: 'WEB',
        currency: 'USD',
        email: session.email,
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

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={submitPreference}
        disabled={isPending || isSuccessful}
        aria-busy={isPending}
      >
        {buttonLabel}
      </Button>
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
              href={getLocalizedPathname(
                '/account-billing/pay-my-bill#payment-options',
                localeOption.code,
              )}
              prefetch={false}
            >
              {copy.autoPay}
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
