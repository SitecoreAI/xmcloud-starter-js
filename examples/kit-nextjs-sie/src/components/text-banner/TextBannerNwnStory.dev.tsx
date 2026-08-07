'use client';

import { Text } from '@sitecore-content-sdk/nextjs';
import { ButtonBase } from '@/components/button-component/ButtonComponent';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { TextBannerProps } from './text-banner.props';

export const TextBannerNwnStory: React.FC<TextBannerProps> = (props) => {
  const { fields, isPageEditing } = props;

  if (!fields) {
    return isPageEditing ? (
      <NoDataFallback componentName="Text Banner" />
    ) : null;
  }

  const hasLink = Boolean(fields.link?.value?.href && fields.link?.value?.text);

  if (
    !isPageEditing &&
    !fields.heading?.value &&
    !fields.description?.value &&
    !hasLink
  ) {
    return null;
  }

  return (
    <section
      data-component="TextBanner"
      data-variant="NwnStory"
      className={cn(
        'border-y border-[#c4c4c4] bg-[#fff4eb] py-12 text-[#414042] sm:py-16',
        props.params?.styles,
      )}
    >
      <div className="nwn-content-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-16">
        <div>
          {(isPageEditing || fields.heading?.value) && (
            <Text
              tag="h2"
              field={fields.heading}
              className="max-w-[15ch] text-balance font-heading text-[clamp(2.125rem,3.5vw,2.75rem)] font-medium leading-[1.06] tracking-[-0.02em]"
            />
          )}
        </div>

        <div>
          {(isPageEditing || fields.description?.value) && (
            <Text
              tag="p"
              field={fields.description}
              className="max-w-2xl text-pretty text-lg leading-8 text-[#737076] sm:text-xl sm:leading-9"
            />
          )}
          {fields.link && (isPageEditing || hasLink) && (
            <div className="mt-6">
              <ButtonBase
                buttonLink={fields.link}
                isPageEditing={isPageEditing}
                variant="default"
                className="min-h-11 bg-primary px-5 text-base font-semibold text-white hover:bg-primary-hover"
                page={props.page}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
