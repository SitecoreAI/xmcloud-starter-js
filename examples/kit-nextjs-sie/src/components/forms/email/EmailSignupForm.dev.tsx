'use client';

import type React from 'react';
import { EnumValues } from '@/enumerations/generic.enum';
import { ButtonVariants } from '@/enumerations/ButtonStyle.enum';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Text } from '@sitecore-content-sdk/nextjs';
import { identity } from '@sitecore-content-sdk/events';
import { useState } from 'react';
import { SuccessCompact } from '../success/success-compact.dev';
import { cn } from '@/lib/utils';
import config from 'sitecore.config';

import type { EmailSignupFormProps } from './email-signup-form.props';

const formSchema = z.object({
  email: z.string().trim().email({
    message: 'Please enter a valid email address',
  }),
});
const updateSchemaWithDictionary = (fields: EmailSignupFormProps['fields']) => {
  return formSchema.extend({
    // Update the schema with the dictionary values here
    email: z
      .string()
      .trim()
      .email({
        message:
          fields?.emailErrorMessage?.value ||
          'Please enter a valid email address',
      }),
  });
};
export const Default: React.FC<EmailSignupFormProps> = (props) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string>();
  const schemaWithDictionary = updateSchemaWithDictionary(props.fields);

  const form = useForm<z.infer<typeof schemaWithDictionary>>({
    resolver: zodResolver(schemaWithDictionary),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof schemaWithDictionary>) {
    setSubmissionError(undefined);

    const normalizedEmail = values.email.trim().toLowerCase();
    const cdpIdentity = props.cdpIdentity;

    // Browser Events is intentionally not initialized in local development.
    if (cdpIdentity && process.env.NODE_ENV !== 'development') {
      if (!config.api?.edge?.clientContextId) {
        setSubmissionError(
          props.fields?.submissionErrorMessage?.value ||
            'We could not complete your signup. Please try again.',
        );
        return;
      }

      try {
        const response = await identity({
          channel: 'WEB',
          currency: 'USD',
          email: normalizedEmail,
          identifiers: [
            {
              id: normalizedEmail,
              provider: cdpIdentity.provider || 'email',
            },
          ],
          language: (document.documentElement.lang || 'en').toUpperCase(),
          page: window.location.pathname || '/',
          extensionData: {
            source: cdpIdentity.source || 'email_signup',
            intent: 'newsletter_signup',
          },
        });

        // The SDK resolves null when the event endpoint rejects the request.
        if (!response) {
          throw new Error('Sitecore CDP did not accept the identity event.');
        }
      } catch {
        setSubmissionError(
          props.fields?.submissionErrorMessage?.value ||
            'We could not complete your signup. Please try again.',
        );
        return;
      }
    }

    setIsSubmitted(true);
  }

  const emailPlaceholder =
    props.fields?.emailPlaceholder?.value || 'Enter your email address';
  const buttonText = props.fields?.emailSubmitLabel?.value || 'Subscribe';
  const successMessage =
    props.fields?.emailSuccessMessage?.value || 'Thank you for subscribing!';
  const btnVariant = props.fields?.buttonVariant || 'default';
  const isSubmitting = form.formState.isSubmitting;

  if (isSubmitted) {
    return <SuccessCompact successMessage={successMessage} />;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          'relative flex h-auto w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-nowrap',
        )}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="mt-0 min-w-0 flex-1 space-y-0">
              <FormLabel className="sr-only">Email address</FormLabel>
              <FormControl>
                <Input
                  className="min-h-11"
                  type="email"
                  placeholder={emailPlaceholder}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage className="absolute top-[100%] pt-1 text-inherit" />
            </FormItem>
          )}
        />
        <Button
          className="min-h-11 w-full shrink-0 sm:w-auto"
          type="submit"
          variant={btnVariant}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          <Text field={{ value: isSubmitting ? 'Subscribing…' : buttonText }} />
        </Button>
      </form>
      {submissionError && (
        <p
          className="mt-2 text-sm text-inherit"
          role="alert"
          aria-live="polite"
        >
          {submissionError}
        </p>
      )}
    </Form>
  );
};
