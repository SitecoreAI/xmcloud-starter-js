'use client';

import { useState } from 'react';
import { event } from '@sitecore-content-sdk/events';
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
  submitPaperlessOptIn,
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

const PAPERLESS_OPT_IN_EVENT = 'NWN_PAPERLESS_OPT_IN';

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
      const response = await submitPaperlessOptIn();

      if (response.paperless.value !== true) {
        throw new Error('The paperless preference was not confirmed.');
      }

      setSubmissionState('success');

      void event({
        type: PAPERLESS_OPT_IN_EVENT,
        channel: 'WEB',
        currency: 'USD',
        language: localeOption.shortLabel,
        page: window.location.pathname || '/',
        extensionData: { paperless: true },
      })
        .then((eventResponse) => {
          if (eventResponse?.status !== 'OK') {
            // The profile preference is authoritative; telemetry must not undo it.
            // eslint-disable-next-line no-console -- operational signal for a failed UDL event
            console.warn(
              '[NWN paperless] SitecoreAI did not accept the opt-in event.',
            );
          }
        })
        .catch(() => {
          // The preference is already committed through Profile Import.
          // eslint-disable-next-line no-console -- operational signal for a failed UDL event
          console.warn(
            '[NWN paperless] Could not send the SitecoreAI opt-in event.',
          );
        });
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
