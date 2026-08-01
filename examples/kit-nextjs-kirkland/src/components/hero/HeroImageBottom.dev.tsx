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
import { hasDistinctHeroCopy, hasRenderableHeroCta } from '@/lib/hero-copy';

export const HeroImageBottom: React.FC<HeroProps> = (props) => {
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
    const hasBannerText = hasDistinctHeroCopy(bannerText, title, description);
    const hasBannerCta = hasRenderableHeroCta(bannerCTA);
    const needsBanner = hasBannerText || hasBannerCta;

    const hasPagesPositionStyles: boolean = props?.params?.styles
      ? props?.params?.styles.includes('position-')
      : false;
    const hasConfiguredSearch = Boolean(searchLink?.value?.href);

    return (
      <section
        data-component="Hero"
        className="@container/herowrapper bg-background text-foreground w-full overflow-hidden"
      >
        <div
          className={cn('@md/herowrapper:pt-16 group relative pt-8', {
            'position-center': !hasPagesPositionStyles,
            [props?.params?.styles]: props?.params?.styles,
          })}
        >
          <div
            className={cn(
              'legal-content-shell @md/herowrapper:pb-20 flex flex-col pb-8',
            )}
          >
            <div className="flex flex-col items-center group-[.position-left]:items-start group-[.position-right]:items-end">
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
                  className="legal-display-heading font-heading @md/herowrapper:text-[clamp(3rem,6cqi,6rem)] relative -ml-[2px] max-w-[15ch] text-balance text-5xl font-light leading-tight"
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
          <div className="w-full">
            <ImageWrapper
              image={image}
              wrapperClass="relative w-full aspect-[144/56] overflow-hidden"
              className="absolute aspect-[144/56] w-full object-cover"
              priority={true}
              loading="eager"
              fetchPriority="high"
              page={props.page}
            />
          </div>

          {/* Banner */}
          {needsBanner && (
            <div
              data-hero-banner
              className="@container/herobanner bg-primary text-primary-foreground @xl/herowrapper:w-1/2 @xl/herowrapper:absolute @xl/herowrapper:bottom-0 @xl/herowrapper:left-0 @xl/herowrapper:max-w-[45rem] @xl/herowrapper:group-[.position-right]:left-auto @xl/herowrapper:group-[.position-right]:right-0 w-full"
            >
              <div className="@[35rem]/herobanner:flex-row @[35rem]/herobanner:items-center @[35rem]/herobanner:justify-between @[35rem]/herobanner:flex @[35rem]/herobanner:gap-10 @[35rem]/herobanner:text-left @md/herowrapper:max-w-screen-md @xl/herowrapper:max-w-none mx-auto p-5">
                {hasBannerText && bannerText && (
                  <AnimatedSection
                    direction="up"
                    isPageEditing={isPageEditing}
                    reducedMotion={prefersReducedMotion}
                  >
                    <Text
                      tag="p"
                      className="font-body @md/herowrapper:text-lg text-pretty font-light leading-relaxed"
                      field={bannerText}
                    />
                  </AnimatedSection>
                )}
                {hasBannerCta && bannerCTA && (
                  <AnimatedSection
                    direction="up"
                    className="@[35rem]/herobanner:mt-0 mt-4"
                    isPageEditing={isPageEditing}
                    reducedMotion={prefersReducedMotion}
                    delay={200}
                  >
                    <ButtonBase
                      buttonLink={bannerCTA}
                      variant="secondary"
                      isPageEditing={isPageEditing}
                    />
                  </AnimatedSection>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return <NoDataFallback componentName="Hero" />;
};
