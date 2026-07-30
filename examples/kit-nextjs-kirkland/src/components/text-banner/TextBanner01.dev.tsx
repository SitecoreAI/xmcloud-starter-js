'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
// import { cva } from 'class-variance-authority';
import { Text } from '@sitecore-content-sdk/nextjs';
import { TextBannerProps } from './text-banner.props';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';

/* Text Banner 01 appearance:
 * Blue background, content stacked vertically
 * Title left-aligned
 * Description right-aligned
 */

export const TextBanner01: React.FC<TextBannerProps> = (props) => {
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
          'bg-primary text-foreground group relative w-full overflow-hidden',
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
                className="legal-display-heading text-box-trim-both-baseline font-heading relative -ml-[0.04em] max-w-[18ch] text-balance text-left"
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
                className="text-box-trim-both-baseline ml-auto mt-10 max-w-[53ch] text-pretty text-right leading-relaxed @md/textbanner:mt-12"
              />
            </AnimatedSection>
          </div>
        </div>
      </section>
    );
  }
  return <NoDataFallback componentName="Text Banner Variant 01" />;
};
