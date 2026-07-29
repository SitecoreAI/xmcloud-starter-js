'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Text } from '@sitecore-content-sdk/nextjs';
import { TextBannerProps } from './text-banner.props';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';

export const TextBannerBlueTitleRight: React.FC<TextBannerProps> = (props) => {
  const { fields, isPageEditing } = props;
  const { heading, description } = fields ?? {};

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
        data-component="TextBanner"
        data-class-change
        className={cn(
          'bg-primary text-foreground group relative w-full overflow-hidden border-b-2 border-t-2 [.border-b-2+&]:border-t-0',
          {
            'position-left': !hasPagesPositionStyles,
            [props?.params?.styles as string]: props?.params?.styles,
          },
        )}
      >
        <div className="@container/textbanner">
          <div className="legal-content-shell py-16 @md/textbanner:py-20">
            {/* Title */}
            <AnimatedSection
              direction="left"
              distanceInRem={12}
              isPageEditing={isPageEditing}
              reducedMotion={prefersReducedMotion}
            >
              <Text
                tag="h2"
                field={heading}
                className="legal-display-heading text-box-trim-both-baseline font-heading relative ml-auto max-w-[18ch] text-balance text-right"
              />
            </AnimatedSection>
            {/* Description */}
            <AnimatedSection
              direction="right"
              delay={600}
              distanceInRem={4}
              isPageEditing={isPageEditing}
              reducedMotion={prefersReducedMotion}
            >
              <Text
                tag="p"
                field={description}
                className="text-box-trim-both-baseline mr-auto mt-10 max-w-[53ch] text-pretty text-left leading-relaxed @md/textbanner:mt-12"
              />
            </AnimatedSection>
          </div>
        </div>
      </section>
    );
  }
  return <NoDataFallback componentName="Text Banner Variant 01" />;
};
