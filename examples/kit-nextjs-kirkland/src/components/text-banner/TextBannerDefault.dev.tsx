'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
// import { cva } from 'class-variance-authority';
import { Text } from '@sitecore-content-sdk/nextjs';
import { TextBannerProps } from './text-banner.props';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';

/* Default appearance:
 * Black background, 50/50 columns, text v-aligned to baseline
 * Title left
 * Description right
 */

export const TextBannerDefault: React.FC<TextBannerProps> = (props) => {
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

  // Themes may be added back in later
  // const { theme } = params ?? {};
  // const componentTheme = cva('p-5 mt-4', {
  //   variants: {
  //     theme: {
  //       primary: 'bg-primary text-primary-foreground',
  //       secondary: 'bg-secondary text-secondary-foreground',
  //     },
  //   },
  //   defaultVariants: {
  //     theme: 'secondary',
  //   },
  // });

  if (fields) {
    return (
      <section
        data-component="TextBanner"
        data-class-change
        className={cn(
          'bg-background text-foreground border-foreground group relative w-full border-b-2 border-t-2 [.border-b-2+&]:border-t-0',
          {
            'position-left': !hasPagesPositionStyles,
            [props?.params?.styles as string]: props?.params?.styles,
          },
        )}
      >
        <div className="@container/textbanner">
          <div className="legal-content-shell @lg/textbanner:grid @lg/textbanner:grid-cols-2 @lg/textbanner:grid-rows-1 @lg/textbanner:items-end @lg/textbanner:gap-12 py-16 @md/textbanner:py-20">
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
                className="legal-display-heading font-heading text-box-trim-both-baseline relative -ml-[0.04em] max-w-[14ch] text-balance text-left"
              />
            </AnimatedSection>
            {/* Description */}
            <AnimatedSection
              direction="down"
              delay={600}
              distanceInRem={4}
              isPageEditing={isPageEditing}
              reducedMotion={prefersReducedMotion}
            >
              <Text
                tag="p"
                field={description}
                className="text-box-trim-both-baseline mt-8 max-w-[53ch] text-pretty text-left leading-relaxed @lg/textbanner:mt-0"
              />
            </AnimatedSection>
          </div>
        </div>
      </section>
    );
  }
  return <NoDataFallback componentName="Text Banner" />;
};
