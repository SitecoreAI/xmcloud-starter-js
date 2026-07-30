'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Text } from '@sitecore-content-sdk/nextjs';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { ButtonBase } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { Default as ZipcodeSearchForm } from '@/components/forms/zipcode/ZipcodeSearchForm.dev';
import type { HeroProps } from './hero.props';
import { storeZipcodeInSession } from '@/utils/zipcode-storage';

export const HeroImageBottomInset: React.FC<HeroProps> = (props) => {
  const { fields, isPageEditing } = props;
  const {
    title,
    description,
    bannerText,
    bannerCTA,
    image,
    dictionary,
    searchLink,
  } = fields || {};
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (fields) {
    const needsBanner: boolean = isPageEditing
      ? true
      : bannerText?.value !== '' || bannerCTA?.value?.href !== ''
        ? true
        : false;

    const hasPagesPositionStyles: boolean = props?.params?.styles
      ? props?.params?.styles.includes('position-')
      : false;
    const hasConfiguredSearch =
      isPageEditing || Boolean(searchLink?.value?.href);

    return (
      <section
        data-component="Hero"
        className="@container/herowrapper bg-background text-foreground w-full overflow-hidden"
      >
        <div
          className={cn('@md/herowrapper:py-16 group relative py-8', {
            'position-center': !hasPagesPositionStyles,
            [props?.params?.styles]: props?.params?.styles,
          })}
        >
          <div
            className={cn(
              'legal-content-shell @md/herowrapper:pb-16 relative z-10 flex flex-col pb-8',
            )}
          >
            <div className="bg-background flex flex-col items-center py-6 group-[.position-left]:items-start group-[.position-right]:items-end">
              {/* Title */}
              <AnimatedSection
                direction="up"
                className="relative z-20"
                isPageEditing={isPageEditing}
                reducedMotion={prefersReducedMotion}
              >
                <Text
                  tag="h1"
                  field={title}
                  className="legal-display-heading font-heading @md/herowrapper:text-[clamp(3rem,6cqi,6rem)] text-box-trim-top relative max-w-[15ch] text-balance text-5xl font-light leading-tight"
                />
              </AnimatedSection>

              {/* Description */}
              <AnimatedSection
                direction="up"
                isPageEditing={isPageEditing}
                reducedMotion={prefersReducedMotion}
                delay={200}
                className="mt-4 max-w-xl"
              >
                {description && (
                  <Text
                    tag="p"
                    className="@md/herowrapper:text-xl max-w-[38ch] text-pretty leading-relaxed"
                    field={description}
                  />
                )}
              </AnimatedSection>

              {/* Form */}
              {hasConfiguredSearch && (
                <AnimatedSection
                  direction="up"
                  isPageEditing={isPageEditing}
                  reducedMotion={prefersReducedMotion}
                  delay={400}
                  className="mt-6 w-full"
                >
                  <ZipcodeSearchForm
                    placeholder={dictionary.ZipPlaceholder || ''}
                    buttonText={dictionary?.SubmitCTALabel || ''}
                    onSubmit={(values) => {
                      storeZipcodeInSession(values.zipcode);
                      if (searchLink?.value?.href) {
                        window.location.href = `${searchLink.value.href}`;
                      }
                    }}
                  />
                </AnimatedSection>
              )}
            </div>
          </div>

          {/* Full width image */}
          <div className="@[1376px]/herowrapper:max-w-[1312px] @sm/herowrapper:max-w-[calc(100%-(theme(spacing.32)))] relative z-10 mx-auto w-full overflow-hidden">
            <ImageWrapper
              image={image}
              wrapperClass="max-h-[560px] relative w-full aspect-[144/56]"
              className="absolute aspect-[144/56] w-full object-cover"
              priority={true}
              loading="eager"
              fetchPriority="high"
              page={props.page}
            />
            {/* Banner */}
            {needsBanner && (
              <div className="@container/herobanner bg-card-foreground @xl/herowrapper:bg-overlay text-primary-foreground @xl/herowrapper:w-1/2 @xl/herowrapper:absolute @xl/herowrapper:bottom-0 @xl/herowrapper:left-0 @xl/herowrapper:max-w-[45rem] @xl/herowrapper:group-[.position-right]:left-auto @xl/herowrapper:group-[.position-right]:right-0 relative z-10 w-full">
                <div className="@[35rem]/herobanner:flex-row @[35rem]/herobanner:items-center @[35rem]/herobanner:justify-between @[35rem]/herobanner:flex @[35rem]/herobanner:gap-10 @[35rem]/herobanner:text-left p-5">
                  {bannerText && (
                    <AnimatedSection
                      direction="up"
                      isPageEditing={isPageEditing}
                      reducedMotion={prefersReducedMotion}
                    >
                      <Text
                        tag="p"
                        className="font-heading @md/herowrapper:text-lg text-pretty font-light leading-tight"
                        field={bannerText}
                      />
                    </AnimatedSection>
                  )}
                  {bannerCTA && (
                    <AnimatedSection
                      direction="up"
                      className="@[35rem]/herobanner:mt-0 mt-4"
                      isPageEditing={isPageEditing}
                      reducedMotion={prefersReducedMotion}
                      delay={200}
                    >
                      <ButtonBase
                        buttonLink={bannerCTA}
                        variant="default"
                        isPageEditing={isPageEditing}
                      />
                    </AnimatedSection>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return <NoDataFallback componentName="Hero" />;
};
