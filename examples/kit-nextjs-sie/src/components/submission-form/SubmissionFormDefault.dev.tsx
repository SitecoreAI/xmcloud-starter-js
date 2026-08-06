'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { identity } from '@sitecore-content-sdk/events';
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
import { NoDataFallback } from '@/utils/NoDataFallback';

import type { SubmissionFormProps } from './submission-form.props';

const contactFormSchema = z.object({
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
  message: z
    .string()
    .trim()
    .min(1, 'A message is required.')
    .max(5000, 'Message must be 5,000 characters or fewer.'),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const submissionErrorMessage =
  'We could not send your message. Please try again.';

export const SubmissionFormDefault: React.FC<SubmissionFormProps> = (props) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string>();
  const { fields } = props || {};

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
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
        setSubmissionError(submissionErrorMessage);
        return;
      }

      const normalizedEmail = values.email.trim().toLowerCase();

      try {
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
        setSubmissionError(submissionErrorMessage);
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
          {(fields.title?.value || props.isPageEditing) && (
            <Text
              tag="h2"
              className="max-w-[16ch] text-balance font-heading text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-[1.08] text-slate-900"
              field={fields.title}
            />
          )}
          <p className="mt-5 max-w-prose text-base leading-7 text-slate-700 sm:text-lg">
            Have a question about your NW Natural service? Send us a message and
            our team will follow up.
          </p>
          <p className="mt-5 border-l-4 border-cyan-500 pl-4 text-sm leading-6 text-slate-700">
            If you smell natural gas or have an emergency, call{' '}
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
                Thank you for contacting us.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                Your message has been received. A member of our team will follow
                up soon.
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
                          First name
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
                          Last name
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
                        Email address
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
                        Message
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
                  {isSubmitting ? 'Sending…' : 'Send message'}
                </Button>
                <p className="text-sm leading-6 text-slate-600">
                  By submitting, you agree to our{' '}
                  <a
                    href="https://www.nwnatural.com/privacy-notice"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary underline underline-offset-2"
                    aria-label="Privacy Notice (opens in a new tab)"
                  >
                    Privacy Notice
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
