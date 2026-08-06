'use client';

import { Text } from '@sitecore-content-sdk/nextjs';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { TextBannerProps } from './text-banner.props';

const isLegacyStarterContent = (value: string | undefined): boolean =>
  Boolean(
    value &&
      /alaris|aero|nexa|terra|vehicle|automotive|driving|electric future|emergency response/i.test(
        value,
      ),
  );

export const TextBannerNwnStory: React.FC<TextBannerProps> = (props) => {
  const { fields, isPageEditing } = props;

  if (!fields) {
    return <NoDataFallback componentName="Text Banner" />;
  }

  const useFallback =
    !isPageEditing &&
    (isLegacyStarterContent(fields.heading?.value) ||
      isLegacyStarterContent(fields.description?.value) ||
      !fields.heading?.value);

  return (
    <section
      data-component="TextBanner"
      data-variant="NwnStory"
      className={cn(
        'border-y border-slate-300 bg-[#e4f4f7] py-14 text-slate-900 sm:py-20',
        props.params?.styles,
      )}
    >
      <div className="nwn-content-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-16">
        <div>
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Customer essentials
          </p>
          {useFallback ? (
            <h2 className="mt-3 max-w-[13ch] text-balance font-heading text-[clamp(2.75rem,5vw,4.25rem)] font-medium leading-[1.02] tracking-[-0.02em]">
              Your account, right at hand.
            </h2>
          ) : (
            <Text
              tag="h2"
              field={fields.heading}
              className="mt-3 max-w-[13ch] text-balance font-heading text-[clamp(2.75rem,5vw,4.25rem)] font-medium leading-[1.02] tracking-[-0.02em]"
            />
          )}
        </div>

        {useFallback ? (
          <p className="max-w-2xl text-pretty text-xl leading-9 text-slate-700">
            Pay a bill, move your natural gas service, explore support, and find
            the safety information you need from one clear starting point.
          </p>
        ) : (
          <Text
            tag="p"
            field={fields.description}
            className="max-w-2xl text-pretty text-xl leading-9 text-slate-700"
          />
        )}
      </div>
    </section>
  );
};
