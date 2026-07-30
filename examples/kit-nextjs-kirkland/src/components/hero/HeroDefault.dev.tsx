'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Text } from '@sitecore-content-sdk/nextjs';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { ButtonBase } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { Default as ZipcodeSearchForm } from '@/components/forms/zipcode/ZipcodeSearchForm.dev';
import { HeroProps } from './hero.props';
import { storeZipcodeInSession } from '@/utils/zipcode-storage';
import { hasDistinctHeroCopy, hasRenderableHeroCta } from '@/lib/hero-copy';

export const HeroDefault: React.FC<HeroProps> = (props) => {
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
          data-class-change
          className={cn(
            'legal-content-shell @lg/herowrapper:grid @lg/herowrapper:gap-0 @lg/herowrapper:my-24 @lg/herowrapper:grid-cols-[33%_11%_23%_33%] @lg/herowrapper:grid-rows-[52px_auto_auto_auto] group',
            {
              'position-left': !hasPagesPositionStyles,
              [props?.params?.styles]: props?.params?.styles,
            },
          )}
        >
          {/* Title */}
          <AnimatedSection
            direction="up"
            className="@lg/herowrapper:row-start-1 @lg/herowrapper:row-end-3 @lg/herowrapper:col-start-1 @lg/herowrapper:col-end-4 relative z-20"
            isPageEditing={isPageEditing}
            reducedMotion={prefersReducedMotion}
          >
            <Text
              tag="h1"
              field={title}
              className="legal-display-heading font-heading @md/herowrapper:text-[clamp(4.5rem,9cqi,8rem)] text-box-trim-top @lg/herowrapper:p-0 text-shadow @lg/herowrapper:text-shadow-blur-3xl @lg/herowrapper:drop-shadow-[0_35px_35px_rgba(0,0,0,0.4)] relative -ml-[2px] text-balance px-4 pt-8 text-5xl font-light leading-tight"
            />
          </AnimatedSection>

          {/* Description & Form */}
          <div className="form @lg/herowrapper:p-0 @lg/herowrapper:col-start-1 @lg/herowrapper:col-end-2 @lg/herowrapper:row-start-3 @lg/herowrapper:row-end-4 @lg/herowrapper:self-end @lg/herowrapper:mt-6 mt-6 px-4 pb-8 [&>*+*]:mt-6">
            <AnimatedSection
              direction="up"
              isPageEditing={isPageEditing}
              reducedMotion={prefersReducedMotion}
              delay={200}
            >
              {description && (
                <Text
                  tag="div"
                  className="@sm/herowrapper:text-xl @lg/herowrapper:p-0 mt-0 max-w-[38ch] text-pretty leading-relaxed"
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

          {/* Hero image */}
          <ImageWrapper
            image={image}
            wrapperClass="@lg/herowrapper:col-start-3 @lg/herowrapper:col-end-5 @lg/herowrapper:row-start-2 @lg/herowrapper:row-end-4 before:hidden @lg/herowrapper:before:block @lg/herowrapper:before:w-full @lg/herowrapper:before:aspect-[674/600] @lg/herowrapper:relative w-full"
            className="@lg/herowrapper:h-full @lg/herowrapper:aspect-auto @lg/herowrapper:absolute @lg/herowrapper:inset-0 relative z-10 aspect-video w-full object-cover"
            priority={true}
            loading="eager"
            fetchPriority="high"
            page={props.page}
          />

          {/* Banner */}
          {needsBanner && (
            <div
              data-hero-banner
              className="bg-primary text-primary-foreground @lg/herowrapper:col-start-3 @lg/herowrapper:col-end-5 @lg/herowrapper:row-start-4 @lg/herowrapper:row-end-5 @md/herowrapper:flex @md/herowrapper:gap-10 @md/herowrapper:items-center @md/herowrapper:justify-between @md/herowrapper:p-5 p-4"
            >
              {hasBannerText && bannerText && (
                <AnimatedSection
                  direction="up"
                  isPageEditing={isPageEditing}
                  reducedMotion={prefersReducedMotion}
                >
                  <Text
                    tag="p"
                    className="@md/herowrapper:text-lg font-heading text-pretty font-light leading-tight"
                    field={bannerText}
                  />
                </AnimatedSection>
              )}
              {hasBannerCta && bannerCTA && (
                <AnimatedSection
                  direction="up"
                  className="@md/herowrapper:mt-0 mt-4 first:mt-0"
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
          )}
        </div>
      </section>
    );
  }

  return <NoDataFallback componentName="Hero" />;
};
