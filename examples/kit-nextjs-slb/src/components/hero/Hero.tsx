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
  'hero @container relative w-full overflow-hidden',
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

  const media = [
    { video: heroVideoField1, image: heroImageField1 },
    { video: heroVideoField2, image: heroImageField2 },
    { video: heroVideoField3, image: heroImageField3 },
    { video: heroVideoField4, image: heroImageField4 },
  ];
  const populatedMedia = media.filter(({ video, image }) =>
    Boolean(video?.value?.href || image?.value?.src),
  );
  const hasAnyMedia = populatedMedia.length > 0;
  const hasAnyVideo = media.some(({ video }) => Boolean(video?.value?.href));
  // Keep all four authoring slots visible in Page Builder. The concise editorial
  // treatment is used on the public page when the datasource contains one asset.
  const useSingleMediaLayout = populatedMedia.length === 1 && !isPageEditing;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    setIsPlaying(!mediaQuery.matches);
  }, []);

  if (datasource) {
    const heroCopy = (
      <AnimatedSection
        direction="up"
        className={cn(
          'flex flex-col items-stretch gap-8',
          useSingleMediaLayout
            ? '@lg:justify-center @lg:py-20 @xl:py-28'
            : '@lg:flex-row @lg:items-start @lg:gap-16',
        )}
        reducedMotion={prefersReducedMotion}
        isPageEditing={isPageEditing}
      >
        {(titleField?.value || isPageEditing) && (
          <Text
            tag="h1"
            field={titleField}
            className={cn(
              'font-heading text-pretty font-light tracking-[-0.04em]',
              useSingleMediaLayout
                ? '@md:text-[64px] @md:leading-[64px] @xl:text-[88px] @xl:leading-[86px] max-w-[12ch] text-[44px] leading-[46px]'
                : '@lg:basis-7/12 @lg:text-[72px] @lg:leading-[80px] text-[40px] leading-[48px]',
            )}
          />
        )}
        <div
          className={cn(
            'flex flex-col gap-8',
            useSingleMediaLayout
              ? '@lg:max-w-[35rem]'
              : '@lg:basis-5/12 @lg:gap-10 @lg:pt-3',
          )}
        >
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
    );

    return (
      <section
        className={cn(heroVariants({ colorScheme }), [
          params?.styles && params.styles,
        ])}
        data-media-layout={useSingleMediaLayout ? 'single' : 'gallery'}
      >
        {useSingleMediaLayout ? (
          <div className="slb-page-shell grid min-h-[42rem] gap-10 py-10 @lg:grid-cols-12 @lg:gap-0 @lg:py-0">
            <div className="@lg:col-span-6 @lg:pr-16 @xl:pr-24">{heroCopy}</div>
            <div className="relative min-h-[22rem] @lg:col-span-6 @lg:min-h-[42rem]">
              <MediaSection
                video={populatedMedia[0]?.video?.value?.href}
                image={populatedMedia[0]?.image}
                className="relative h-full min-h-[22rem] @lg:min-h-[42rem]"
                pause={!isPlaying}
                reducedMotion={prefersReducedMotion}
              />
              <div
                className="absolute bottom-0 left-0 z-20 h-2 w-1/3 bg-accent"
                aria-hidden="true"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-16 py-20 @lg:gap-20 @lg:py-24">
            <div className="slb-page-shell">{heroCopy}</div>
            {(hasAnyMedia || isPageEditing) && (
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
            )}
          </div>
        )}
        {/* Play/Pause button - A11y */}
        {hasAnyVideo && !prefersReducedMotion && (
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
