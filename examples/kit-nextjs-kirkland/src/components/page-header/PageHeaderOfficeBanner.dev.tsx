'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import {
  Image as SitecoreImage,
  RichText,
  Text,
} from '@sitecore-content-sdk/nextjs';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { linkIsValid } from '@/components/button-component/button-component.props';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { PageHeaderProps } from './page-header.props';

export const PageHeaderOfficeBanner: React.FC<
  PageHeaderProps & { isPageEditing: boolean }
> = (props) => {
  const { fields, isPageEditing } = props;
  const { imageRequired, link1, link2 } = fields?.data?.datasource || {};
  const { pageHeaderTitle, pageTitle, pageSubtitle } =
    fields?.data?.externalFields || {};

  const title = pageHeaderTitle?.jsonValue?.value
    ? pageHeaderTitle.jsonValue
    : pageTitle?.jsonValue;
  const subtitle = pageSubtitle?.jsonValue;
  const link1Value = link1?.jsonValue;
  const link2Value = link2?.jsonValue;
  const shouldRenderLink = (link: typeof link1Value) =>
    Boolean(
      link &&
        (isPageEditing
          ? link.value?.text || link.value?.href || link.value?.url
          : Boolean(link.value?.href) && linkIsValid(link)),
    );
  const shouldShowLink1 = shouldRenderLink(link1Value);
  const shouldShowLink2 = shouldRenderLink(link2Value);
  const shouldShowButtons = shouldShowLink1 || shouldShowLink2;
  const hasImage = Boolean(imageRequired?.jsonValue?.value?.src?.trim());
  const shouldShowImage = hasImage || isPageEditing;
  const EmptyOfficeBannerImage = ({ className }: { className?: string }) => (
    <div
      className={`${className ?? ''} flex items-center justify-center bg-muted text-muted-foreground`}
    >
      <SitecoreImage
        field={imageRequired?.jsonValue}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <span className="bg-background/90 pointer-events-none relative z-20 px-5 py-3 text-sm font-medium">
        Choose an office banner image
      </span>
    </div>
  );

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (!fields) {
    return <NoDataFallback componentName="PageHeader" />;
  }

  return (
    <section
      data-component="PageHeader"
      data-page-header-variant="office-banner"
      className="bg-background text-primary-foreground group relative w-full overflow-hidden"
    >
      <div className="@container/officeheader">
        <div className="@md/officeheader:min-h-[560px] @lg/officeheader:min-h-[620px] relative min-h-[460px]">
          {shouldShowImage && (
            <ImageWrapper
              image={imageRequired?.jsonValue}
              wrapperClass="absolute inset-0 h-full w-full"
              className="absolute inset-0 h-full w-full object-cover object-center"
              emptyFieldEditingComponent={EmptyOfficeBannerImage}
              priority={true}
              sizes="100vw"
              page={props.page}
            />
          )}

          <div className="from-background via-background/55 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent" />
          <div className="from-background/65 pointer-events-none absolute inset-0 bg-gradient-to-r via-transparent to-transparent" />

          <div className="legal-content-shell @md/officeheader:min-h-[560px] @lg/officeheader:min-h-[620px] relative z-10 flex min-h-[460px] items-end py-12 @md/officeheader:py-16">
            <div className="max-w-3xl">
              <AnimatedSection
                reducedMotion={prefersReducedMotion}
                isPageEditing={isPageEditing}
              >
                <p className="font-body mb-4 text-sm font-medium uppercase tracking-[0.18em] text-white/80">
                  Office
                </p>
                <Text
                  tag="h1"
                  className="legal-display-heading font-heading relative -ml-[0.04em] max-w-[16ch] text-balance text-left text-5xl font-light tracking-tighter text-white antialiased"
                  field={title}
                />
              </AnimatedSection>

              {subtitle && (
                <AnimatedSection
                  reducedMotion={prefersReducedMotion}
                  isPageEditing={isPageEditing}
                >
                  <RichText
                    className="font-body mt-5 max-w-[55ch] text-pretty text-lg leading-relaxed text-white/90"
                    field={subtitle}
                  />
                </AnimatedSection>
              )}

              {shouldShowButtons && (
                <AnimatedSection
                  reducedMotion={prefersReducedMotion}
                  isPageEditing={isPageEditing}
                >
                  <div
                    className="mt-8 flex flex-wrap gap-4"
                    data-component-part="page-header-actions"
                  >
                    {shouldShowLink1 && link1Value && (
                      <EditableButton
                        buttonLink={link1Value}
                        variant="default"
                        isPageEditing={isPageEditing}
                      />
                    )}
                    {shouldShowLink2 && link2Value && (
                      <EditableButton
                        buttonLink={link2Value}
                        variant="secondary"
                        isPageEditing={isPageEditing}
                      />
                    )}
                  </div>
                </AnimatedSection>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
