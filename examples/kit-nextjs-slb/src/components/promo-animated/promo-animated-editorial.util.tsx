'use client';

import { useEffect, useState } from 'react';
import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { ButtonBase as Button } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { PromoAnimatedEmptyImageEditing } from './PromoAnimatedEmptyImageEditing';
import { PromoAnimatedProps } from './promo-animated.props';

type PromoAnimatedEditorialProps = PromoAnimatedProps & {
  imageRight?: boolean;
  fallbackName: string;
};

export const PromoAnimatedEditorial: React.FC<PromoAnimatedEditorialProps> = ({
  fields,
  params,
  isPageEditing,
  imageRight = false,
  fallbackName,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (!fields) {
    return <NoDataFallback componentName={fallbackName} />;
  }

  const { image, title, description, primaryLink, secondaryLink } = fields;
  const isDarkSurface = params.colorScheme === 'primary';
  const hasPrimaryLink = Boolean(primaryLink?.value?.href);
  const hasSecondaryLink = Boolean(secondaryLink?.value?.href);
  const hasLinks = hasPrimaryLink || hasSecondaryLink;

  return (
    <section
      id={params?.RenderingIdentifier || undefined}
      data-component="PromoAnimated"
      className={cn(
        '@container overflow-hidden',
        isDarkSurface
          ? 'bg-dark text-dark-foreground'
          : 'bg-secondary text-secondary-foreground',
      )}
    >
      <div className="slb-page-shell slb-section-space">
        <div
          data-class-change
          className={cn(
            'promo-animated__content-wrapper group relative grid grid-cols-1 overflow-hidden border',
            '@md:grid-cols-2 @md:items-stretch',
            isDarkSurface ? 'border-white/20' : 'border-border',
            { [params?.styles]: params?.styles },
          )}
        >
          <div
            className={cn(
              'promo-animated__image relative min-h-[22rem] overflow-hidden @md:min-h-[34rem]',
              imageRight && '@md:order-2',
            )}
          >
            {image && (
              <ImageWrapper
                image={image}
                className="absolute inset-0 h-full w-full rounded-none object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                wrapperClass="absolute inset-0 h-full w-full overflow-hidden bg-muted"
                emptyFieldEditingComponent={PromoAnimatedEmptyImageEditing}
                sizes="(max-width: 767px) 100vw, 50vw"
              />
            )}
            <div
              className={cn(
                'absolute bottom-0 z-20 h-2 w-1/3 bg-accent',
                imageRight ? 'right-0' : 'left-0',
              )}
              aria-hidden="true"
            />
          </div>

          <div
            className={cn(
              'promo-animated__content flex min-w-0 flex-col justify-center px-7 py-12 @md:px-10 @lg:px-14 @lg:py-16 @xl:px-20',
              imageRight && '@md:order-1',
              'group-[.position-center]:items-center group-[.position-right]:items-end',
            )}
          >
            {(title || isPageEditing) && (
              <AnimatedSection
                reducedMotion={prefersReducedMotion}
                isPageEditing={isPageEditing}
              >
                <Text
                  tag="h2"
                  className="font-heading max-w-[14ch] text-pretty text-[2.5rem] font-light leading-[1.04] tracking-[-0.035em] @sm:text-5xl @lg:text-[4rem]"
                  field={title}
                />
              </AnimatedSection>
            )}

            {(description || isPageEditing) && (
              <AnimatedSection
                delay={180}
                reducedMotion={prefersReducedMotion}
                isPageEditing={isPageEditing}
              >
                <RichText
                  className={cn(
                    'prose mt-7 max-w-[42rem] text-base leading-7 @md:text-lg',
                    isDarkSurface ? 'text-white/85' : 'text-foreground/75',
                  )}
                  field={description}
                />
              </AnimatedSection>
            )}

            {hasLinks && (
              <AnimatedSection
                delay={360}
                className="mt-9 flex w-full flex-wrap gap-3 group-[.position-center]:justify-center group-[.position-right]:justify-end"
                reducedMotion={prefersReducedMotion}
                isPageEditing={isPageEditing}
              >
                {hasPrimaryLink && primaryLink && (
                  <Button
                    buttonLink={primaryLink}
                    isPageEditing={isPageEditing}
                    contextTitle={title?.value}
                  />
                )}
                {hasSecondaryLink && secondaryLink && (
                  <Button
                    variant="secondary"
                    buttonLink={secondaryLink}
                    isPageEditing={isPageEditing}
                    contextTitle={title?.value}
                  />
                )}
              </AnimatedSection>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
