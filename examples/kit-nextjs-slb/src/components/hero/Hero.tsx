'use client';

import { useState, useEffect } from 'react';
import { Text } from '@sitecore-content-sdk/nextjs';
import { cva } from 'class-variance-authority';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { Button } from '@/components/ui/button';
import { Default as MediaSection } from '@/components/media-section/MediaSection.dev';
import { getDatasource, getFieldValue } from '@/lib/component-props';
import { HeroProps } from './hero.props';

// Define heroVariants using class-variance-authority for styling
export const heroVariants = cva(
  'hero @container py-24 relative w-full overflow-hidden',
  {
    variants: {
      colorScheme: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        tertiary: 'bg-tertiary text-tertiary-foreground',
        dark: 'bg-dark text-dark-foreground',
        light: 'bg-light text-light-foreground',
      },
    },
    defaultVariants: {
      colorScheme: 'light',
    },
  },
);

export const Default: React.FC<HeroProps> = ({ fields, params, page }) => {
  // Destructure fields and params
  const datasource = getDatasource(fields);

  const {
    titleRequired,
    descriptionOptional,
    linkOptional,
    heroVideoOptional1,
    heroImageOptional1,
    heroVideoOptional2,
    heroImageOptional2,
    heroVideoOptional3,
    heroImageOptional3,
    heroVideoOptional4,
    heroImageOptional4,
  } = datasource || {};
  const titleField = getFieldValue(titleRequired);
  const descriptionField = getFieldValue(descriptionOptional);
  const linkField = getFieldValue(linkOptional);
  const heroVideoField1 = getFieldValue(heroVideoOptional1);
  const heroImageField1 = getFieldValue(heroImageOptional1);
  const heroVideoField2 = getFieldValue(heroVideoOptional2);
  const heroImageField2 = getFieldValue(heroImageOptional2);
  const heroVideoField3 = getFieldValue(heroVideoOptional3);
  const heroImageField3 = getFieldValue(heroImageOptional3);
  const heroVideoField4 = getFieldValue(heroVideoOptional4);
  const heroImageField4 = getFieldValue(heroImageOptional4);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const isPageEditing = page.mode.isEditing;

  const { colorScheme } = params;
  const isDarkSurface = colorScheme === 'primary' || colorScheme === 'dark';
  // Use custom hook to match media queries
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    setIsPlaying(!mediaQuery.matches);
  }, []);

  if (datasource) {
    return (
      <section
        className={cn(heroVariants({ colorScheme }), [
          params?.styles && params.styles,
        ])}
      >
        <div className="grid gap-16 @lg:gap-20">
          {/* Hero content */}
          <div className="slb-page-shell">
            <AnimatedSection
              direction="up"
              className="@lg:flex-row @lg:items-start @lg:gap-16 flex flex-col items-stretch gap-8"
              reducedMotion={prefersReducedMotion}
              isPageEditing={isPageEditing}
            >
              {(titleField?.value || isPageEditing) && (
                <Text
                  tag="h1"
                  field={titleField}
                  className="font-heading @lg:basis-7/12 @lg:text-[72px] @lg:leading-[80px] text-pretty text-[40px] font-light leading-[48px] tracking-[-0.03em]"
                />
              )}
              <div className="@lg:basis-5/12 @lg:gap-10 flex flex-col gap-8 @lg:pt-3">
                {(descriptionField?.value || isPageEditing) && (
                  <Text
                    tag="p"
                    className={cn(
                      'font-body max-w-[46rem] text-base font-normal leading-6 @md:text-lg @md:leading-7',
                      {
                        'text-white/90': isDarkSurface,
                        'text-foreground/75': !isDarkSurface,
                      },
                    )}
                    field={descriptionField}
                  />
                )}
                {linkField && (
                  <div>
                    <EditableButton
                      buttonLink={linkField}
                      className={
                        isDarkSurface
                          ? 'border-2 border-white bg-white text-primary hover:border-secondary hover:bg-secondary'
                          : ''
                      }
                      isPageEditing={isPageEditing}
                      contextTitle={titleField?.value}
                    />
                  </div>
                )}
              </div>
            </AnimatedSection>
          </div>
          {/* Hero image/video sections */}
          <div className="slb-page-shell relative">
            <div className="border-border grid grid-cols-2 gap-px overflow-hidden border bg-border @lg:grid-cols-12">
              <div className="col-span-2 min-h-[20rem] @lg:col-span-6 @lg:min-h-[32rem]">
                <MediaSection
                  video={heroVideoField1?.value?.href}
                  image={heroImageField1}
                  className="aspect-280/356 relative h-full min-h-[20rem] @lg:aspect-[6/5] @lg:min-h-[32rem]"
                  pause={!isPlaying}
                  reducedMotion={isPageEditing || prefersReducedMotion}
                />
              </div>
              <div className="min-h-[14rem] @lg:col-span-2 @lg:min-h-[32rem]">
                <MediaSection
                  video={heroVideoField2?.value?.href}
                  image={heroImageField2}
                  className="aspect-280/196 relative h-full min-h-[14rem] @lg:aspect-auto @lg:min-h-[32rem]"
                  pause={!isPlaying}
                  reducedMotion={isPageEditing || prefersReducedMotion}
                />
              </div>
              <div className="min-h-[14rem] @lg:col-span-2 @lg:min-h-[32rem]">
                <MediaSection
                  video={heroVideoField3?.value?.href}
                  image={heroImageField3}
                  className="aspect-280/356 relative h-full min-h-[14rem] @lg:aspect-auto @lg:min-h-[32rem]"
                  pause={!isPlaying}
                  reducedMotion={isPageEditing || prefersReducedMotion}
                />
              </div>
              <div className="col-span-2 min-h-[14rem] @lg:col-span-2 @lg:min-h-[32rem]">
                <MediaSection
                  video={heroVideoField4?.value?.href}
                  image={heroImageField4}
                  className="aspect-280/356 relative h-full min-h-[14rem] @lg:aspect-auto @lg:min-h-[32rem]"
                  pause={!isPlaying}
                  reducedMotion={isPageEditing || prefersReducedMotion}
                />
              </div>
            </div>
          </div>
        </div>
        {/* Play/Pause button - A11y */}
        {!prefersReducedMotion && (
          <Button
            variant="link"
            size="icon"
            onClick={() => setIsPlaying((previousState) => !previousState)}
            className="absolute bottom-6 right-6 rounded-full border border-dark/20 bg-white/90 text-dark hover:bg-white @md:bottom-8 @md:right-8"
            aria-label={isPlaying ? 'Pause Ambient Video' : 'Play Ambient'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </Button>
        )}
      </section>
    );
  }

  return <NoDataFallback componentName="Hero" />;
};
