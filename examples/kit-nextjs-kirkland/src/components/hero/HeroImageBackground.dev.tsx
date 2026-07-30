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

export const HeroImageBackground: React.FC<HeroProps> = (props) => {
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
        className="@container/herowrapper bg-background text-foreground relative w-full overflow-hidden"
      >
        <div
          className={cn('group relative', {
            'position-left': !hasPagesPositionStyles,
            [props?.params?.styles]: props?.params?.styles,
          })}
        >
          {/* Image */}
          <ImageWrapper
            image={image}
            wrapperClass="absolute w-full inset-0 scrim-background/50 scrim-l-full group-[.position-right]:scrim-r-full group-[.position-right]:scrim-l-0 group-[.position-center]:scrim-l-0 group-[.position-center]:scrim-b-full"
            className="h-full w-full object-cover opacity-80"
            priority={true}
            loading="eager"
            fetchPriority="high"
            page={props.page}
          />

          {/* Blur effect for mobile */}
          <div className="fade-to-transparent fade-to-transparent-bottom @md/herowrapper:hidden absolute inset-0 w-full backdrop-blur-sm"></div>

          {/* Content */}
          <div className="legal-content-shell @container/herocontent @sm/herowrapper:pb-5 @md/herowrapper:pb-10 @md/herowrapper:pt-20 @lg/herowrapper:pb-20 @lg/herowrapper:pt-28 relative z-10 flex flex-col pt-10 group-[.position-right]:items-end group-[.position-center]:items-center">
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
                className="legal-display-heading font-heading text-box-trim-both-baseline @lg/herowrapper:p-0 text-shadow text-shadow-blur-xl @sm/herowrapper:text-shadow-blur-3xl @sm/herowrapper:px-0 relative -ml-[2px] max-w-[13ch] text-balance px-5 text-[clamp(3rem,9cqi,6rem)] font-light leading-tight drop-shadow-[0_35px_35px_rgba(0,0,0,0.4)]"
              />
            </AnimatedSection>

            {/* Description */}
            <AnimatedSection
              direction="up"
              isPageEditing={isPageEditing}
              reducedMotion={prefersReducedMotion}
              delay={200}
              className="@xl/herowrapper:mt-20 mt-16"
            >
              {description && (
                <Text
                  tag="p"
                  className="@xs/herocontent:text-xl text-shadow text-shadow-blur-xl max-w-[38ch] text-pretty leading-relaxed"
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
                className="@md/herowrapper:mt-7 mt-4 w-full"
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

            {/* Banner overlay */}
            {needsBanner && (
              <div
                data-hero-banner
                className="@container/herobanner bg-overlay text-primary-foreground @md/herowrapper:mt-10 @xl/herowrapper:mt-16 z-10 mt-8 w-full max-w-[50rem]"
              >
                <div className="@[35rem]/herobanner:flex-row @[35rem]/herobanner:items-center @[35rem]/herobanner:justify-between @[35rem]/herobanner:flex @[35rem]/herobanner:gap-10 @[35rem]/herobanner:text-left p-5">
                  {hasBannerText && bannerText && (
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
                  {hasBannerCta && bannerCTA && (
                    <AnimatedSection
                      direction="up"
                      className="@[35rem]/herobanner:mt-0 mt-6"
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
