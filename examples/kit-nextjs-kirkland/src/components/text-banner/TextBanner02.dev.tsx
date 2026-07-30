'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
// import { cva } from 'class-variance-authority';
import { Text } from '@sitecore-content-sdk/nextjs';
import { TextBannerProps } from './text-banner.props';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';

/* Text Banner 02 appearance:
 * Black background, content stacked vertically
 * Title centered
 * Description centered
 */

export const TextBanner02: React.FC<TextBannerProps> = (props) => {
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
  //     theme: 'primary',
  //   },
  // });

  if (fields) {
    return (
      <section
        data-component="TextBanner"
        data-class-change
        className={cn(
          'bg-background text-foreground group relative w-full',
          {
            'position-center': !hasPagesPositionStyles,
            [props?.params?.styles as string]: props?.params?.styles,
          },
        )}
      >
        <div className="@container/textbanner">
          <div className="legal-content-shell py-16 @md/textbanner:py-20">
            {/* Title */}
            <AnimatedSection
              direction="down"
              duration={700}
              threshold={0.4}
              isPageEditing={isPageEditing}
              reducedMotion={prefersReducedMotion}
            >
              <Text
                tag="h2"
                field={heading}
                className="legal-display-heading font-heading text-box-trim-both-baseline mx-auto max-w-[16ch] text-balance text-center"
              />
            </AnimatedSection>
            {/* Description */}
            <AnimatedSection
              direction="up"
              delay={300}
              isPageEditing={isPageEditing}
              reducedMotion={prefersReducedMotion}
            >
              <Text
                tag="p"
                field={description}
                className="text-box-trim-both-baseline mx-auto mt-8 max-w-[53ch] text-pretty text-center leading-relaxed"
              />
            </AnimatedSection>
          </div>
        </div>
      </section>
    );
  }
  return <NoDataFallback componentName="Text Banner: 02" />;
};
