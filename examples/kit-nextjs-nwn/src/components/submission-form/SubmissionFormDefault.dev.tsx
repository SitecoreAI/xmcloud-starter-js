'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text } from '@sitecore-content-sdk/nextjs';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import config from 'sitecore.config';

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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getLocaleOption, type SupportedLocale } from '@/i18n/locales';
import { NoDataFallback } from '@/utils/NoDataFallback';

import type { SubmissionFormProps } from './submission-form.props';

type ContactFormCopy = {
  intro: string;
  emergency: string;
  thankYou: string;
  received: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  sending: string;
  send: string;
  privacyPrefix: string;
  privacyNotice: string;
  privacyAria: string;
  submissionError: string;
  validation: {
    firstNameRequired: string;
    firstNameMax: string;
    lastNameRequired: string;
    lastNameMax: string;
    emailRequired: string;
    emailInvalid: string;
    messageRequired: string;
    messageMax: string;
  };
};

const contactFormCopy: Record<SupportedLocale, ContactFormCopy> = {
  en: {
    intro:
      'Have a question about your NW Natural service? Send us a message and our team will follow up.',
    emergency: 'If you smell natural gas or have an emergency, call',
    thankYou: 'Thank you for contacting us.',
    received:
      'Your message has been received. A member of our team will follow up soon.',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email address',
    message: 'Message',
    sending: 'Sending…',
    send: 'Send message',
    privacyPrefix: 'By submitting, you agree to our',
    privacyNotice: 'Privacy Notice',
    privacyAria: 'Privacy Notice (opens in a new tab)',
    submissionError: 'We could not send your message. Please try again.',
    validation: {
      firstNameRequired: 'First name is required.',
      firstNameMax: 'First name must be 100 characters or fewer.',
      lastNameRequired: 'Last name is required.',
      lastNameMax: 'Last name must be 100 characters or fewer.',
      emailRequired: 'Email address is required.',
      emailInvalid: 'Please enter a valid email address.',
      messageRequired: 'A message is required.',
      messageMax: 'Message must be 5,000 characters or fewer.',
    },
  },
  'es-MX': {
    intro:
      '¿Tiene alguna pregunta sobre su servicio de NW Natural? Envíenos un mensaje y nuestro equipo se comunicará con usted.',
    emergency: 'Si huele a gas natural o tiene una emergencia, llame al',
    thankYou: 'Gracias por comunicarse con nosotros.',
    received:
      'Recibimos su mensaje. Un integrante de nuestro equipo se comunicará con usted pronto.',
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Correo electrónico',
    message: 'Mensaje',
    sending: 'Enviando…',
    send: 'Enviar mensaje',
    privacyPrefix: 'Al enviar este formulario, acepta nuestro',
    privacyNotice: 'Aviso de privacidad',
    privacyAria: 'Aviso de privacidad (se abre en una pestaña nueva)',
    submissionError: 'No pudimos enviar su mensaje. Inténtelo de nuevo.',
    validation: {
      firstNameRequired: 'El nombre es obligatorio.',
      firstNameMax: 'El nombre debe tener 100 caracteres o menos.',
      lastNameRequired: 'El apellido es obligatorio.',
      lastNameMax: 'El apellido debe tener 100 caracteres o menos.',
      emailRequired: 'El correo electrónico es obligatorio.',
      emailInvalid: 'Ingrese un correo electrónico válido.',
      messageRequired: 'El mensaje es obligatorio.',
      messageMax: 'El mensaje debe tener 5,000 caracteres o menos.',
    },
  },
};

const createContactFormSchema = (copy: ContactFormCopy) =>
  z.object({
    firstName: z
      .string()
      .trim()
      .min(1, copy.validation.firstNameRequired)
      .max(100, copy.validation.firstNameMax),
    lastName: z
      .string()
      .trim()
      .min(1, copy.validation.lastNameRequired)
      .max(100, copy.validation.lastNameMax),
    email: z
      .string()
      .trim()
      .min(1, copy.validation.emailRequired)
      .email(copy.validation.emailInvalid),
    message: z
      .string()
      .trim()
      .min(1, copy.validation.messageRequired)
      .max(5000, copy.validation.messageMax),
  });

type ContactFormValues = z.infer<ReturnType<typeof createContactFormSchema>>;

export const SubmissionFormDefault: React.FC<SubmissionFormProps> = (props) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string>();
  const { fields } = props || {};
  const locale = getLocaleOption(props.page.locale).code;
  const copy = contactFormCopy[locale];
  const authoredTitle = fields?.title?.value;
  const hasInternalTitle =
    typeof authoredTitle === 'string' &&
    /^NWN[_-].*(?:handoff|transferencia)$/i.test(authoredTitle);
  const displayTitle =
    hasInternalTitle && !props.isPageEditing
      ? {
          ...fields.title,
          value:
            locale === 'es-MX' ? '¿Cómo podemos ayudarle?' : 'How can we help?',
        }
      : fields?.title;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(createContactFormSchema(copy)),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      message: '',
    },
  });

  if (!fields) {
    return <NoDataFallback componentName="SubmissionForm" />;
  }

  const shouldIdentifyWithCdp =
    process.env.NODE_ENV === 'production' &&
    !props.isPageEditing &&
    props.page?.mode?.isNormal &&
    !props.page?.mode?.isPreview;
  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: ContactFormValues) => {
    setSubmissionError(undefined);

    if (shouldIdentifyWithCdp) {
      if (!config.api?.edge?.clientContextId) {
        setSubmissionError(copy.submissionError);
        return;
      }

      const normalizedEmail = values.email.trim().toLowerCase();

      try {
        const { identity } = await import('@sitecore-content-sdk/events');
        const response = await identity({
          channel: 'WEB',
          currency: 'USD',
          email: normalizedEmail,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          identifiers: [
            {
              id: normalizedEmail,
              provider:
                process.env.NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER ||
                'email',
            },
          ],
          language: (document.documentElement.lang || 'en').toUpperCase(),
          page: window.location.pathname || '/',
          extensionData: {
            source: 'contact_us',
            intent: 'contact_request',
          },
        });

        if (!response) {
          throw new Error('Sitecore CDP did not accept the identity event.');
        }
      } catch {
        setSubmissionError(copy.submissionError);
        return;
      }
    }

    setIsSubmitted(true);
  };

  const inputClasses =
    'min-h-12 border-slate-400 bg-white px-4 text-base text-slate-900 placeholder:text-slate-500 focus-visible:ring-primary';

  return (
    <section
      data-component="SubmissionForm"
      data-class-change
      className={cn('my-12 w-full px-4 md:my-16', props.params?.styles)}
    >
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="bg-[#eef6f7] p-7 sm:p-10 lg:p-12">
          {(displayTitle?.value || props.isPageEditing) && (
            <Text
              tag="h2"
              className="max-w-[16ch] text-balance font-heading text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-[1.08] text-slate-900"
              field={displayTitle}
            />
          )}
          <p className="mt-5 max-w-prose text-base leading-7 text-slate-700 sm:text-lg">
            {copy.intro}
          </p>
          <p className="mt-5 border-l-4 border-cyan-500 pl-4 text-sm leading-6 text-slate-700">
            {copy.emergency}{' '}
            <a
              className="font-semibold text-primary underline underline-offset-2"
              href="tel:8008823377"
            >
              800-882-3377
            </a>
            .
          </p>
        </div>

        <div className="p-7 sm:p-10 lg:p-12">
          {isSubmitted ? (
            <div
              className="flex min-h-72 flex-col justify-center"
              role="status"
              aria-live="polite"
            >
              <h2 className="font-heading text-2xl font-semibold text-slate-900">
                {copy.thankYou}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                {copy.received}
              </p>
            </div>
          ) : (
            <Form {...form}>
              <form
                className="space-y-6"
                onSubmit={form.handleSubmit(onSubmit)}
                aria-busy={isSubmitting}
                noValidate
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-800">
                          {copy.firstName}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            autoComplete="given-name"
                            disabled={isSubmitting}
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
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            autoComplete="family-name"
                            disabled={isSubmitting}
                            className={inputClasses}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-slate-800">
                        {copy.email}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          disabled={isSubmitting}
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
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-slate-800">
                        {copy.message}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={7}
                          maxLength={5000}
                          disabled={isSubmitting}
                          className="min-h-40 resize-y border-slate-400 bg-white px-4 py-3 text-base leading-6 text-slate-900 placeholder:text-slate-500 focus-visible:ring-primary"
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
                  className="min-h-12 w-full px-7 text-base font-semibold sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? copy.sending : copy.send}
                </Button>
                <p className="text-sm leading-6 text-slate-600">
                  {copy.privacyPrefix}{' '}
                  <a
                    href="https://www.nwnatural.com/privacy-notice"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary underline underline-offset-2"
                    aria-label={copy.privacyAria}
                  >
                    {copy.privacyNotice}
                  </a>
                  .
                </p>
              </form>
            </Form>
          )}
        </div>
      </div>
    </section>
  );
};
