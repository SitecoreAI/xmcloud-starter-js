'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Text, RichText } from '@sitecore-content-sdk/nextjs';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { PageHeaderProps } from './page-header.props';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';

export const PageHeaderBlueText: React.FC<
  PageHeaderProps & { isPageEditing: boolean }
> = (props) => {
  const { fields, isPageEditing } = props;
  const { imageRequired, link1, link2 } = fields?.data?.datasource || {};
  const { pageHeaderTitle, pageTitle, pageSubtitle } =
    fields?.data?.externalFields || {};

  const title = pageHeaderTitle?.jsonValue?.value
    ? pageHeaderTitle?.jsonValue
    : pageTitle?.jsonValue;
  const subtitle = pageSubtitle?.jsonValue;

  const shouldShowButtons: boolean = isPageEditing
    ? true
    : link1?.jsonValue?.value?.href !== '' ||
        link2?.jsonValue?.value?.href !== ''
      ? true
      : false;

  const hasPagesPositionStyles: boolean = props?.params?.styles
    ? props?.params?.styles.includes('position-')
    : false;

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (fields) {
    return (
      <section
        data-component="PageHeader"
        data-class-change
        className={cn(
          'bg-background text-primary-foreground group relative w-full overflow-hidden',
          {
            'position-left': !hasPagesPositionStyles,
            [props?.params?.styles]: props?.params?.styles,
          },
        )}
      >
        <div className="@container/headerwrapper">
          <div className="legal-content-shell @sm/headerwrapper:min-h-[575px] @sm/headerwrapper:py-12 @lg/headerwrapper:py-20 relative">
            {/* Blue Box */}
            <div className="@container/headercontent bg-primary text-primary-foreground relative z-10 max-w-[700px] p-10">
              <AnimatedSection
                reducedMotion={prefersReducedMotion}
                isPageEditing={isPageEditing}
              >
                {/* Title */}
                <Text
                  tag="h1"
                  className="legal-display-heading font-heading @[575px]/headercontent:text-6xl @xs/headercontent:text-5xl relative -ml-[0.04em] max-w-[18ch] text-balance text-left text-4xl font-light tracking-tighter antialiased"
                  field={title}
                />
              </AnimatedSection>
              {/* Subtitle */}
              {subtitle && (
                <AnimatedSection
                  reducedMotion={prefersReducedMotion}
                  isPageEditing={isPageEditing}
                >
                  <RichText
                    className="font-body mt-4 max-w-[50ch] text-pretty leading-tight"
                    field={subtitle}
                  />
                </AnimatedSection>
              )}
              {shouldShowButtons && (
                <AnimatedSection
                  reducedMotion={prefersReducedMotion}
                  isPageEditing={isPageEditing}
                >
                  <div className="mt-9 flex flex-wrap gap-4">
                    {link1?.jsonValue && (
                      <EditableButton
                        buttonLink={link1?.jsonValue}
                        variant="outline"
                        isPageEditing={isPageEditing}
                      />
                    )}
                    {link2?.jsonValue && (
                      <EditableButton
                        buttonLink={link2?.jsonValue}
                        variant="secondary"
                        isPageEditing={isPageEditing}
                      />
                    )}
                  </div>
                </AnimatedSection>
              )}
            </div>
          </div>
          {/* Image */}
          <ImageWrapper
            image={imageRequired?.jsonValue}
            wrapperClass="@sm/headerwrapper:absolute w-full @sm/headerwrapper:inset-0"
            className="h-full w-full object-cover"
            priority={true}
            page={props.page}
          />
        </div>
      </section>
    );
  }

  return <NoDataFallback componentName="PageHeader" />;
};
