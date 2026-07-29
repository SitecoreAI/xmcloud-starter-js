'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Text } from '@sitecore-content-sdk/nextjs';

import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { ButtonBase } from '@/components/button-component/ButtonComponent';
import { linkIsValid } from '@/components/button-component/button-component.props';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { useMatchMedia } from '@/hooks/use-match-media';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';

import type { ImageCarouselProps } from './image-carousel.props';

export const ImageCarouselDefault = (props: ImageCarouselProps) => {
  const { fields, isPageEditing } = props;
  const { title, imageItems } = fields?.data?.datasource || {};
  const { results: slides = [] } = imageItems || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const slideshowId = useId();
  const isReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!api || !slides.length) {
      setCurrentIndex(0);
      return;
    }

    const syncCurrentIndex = () => {
      const selectedIndex = api.selectedScrollSnap();
      setCurrentIndex(
        Math.max(0, Math.min(selectedIndex, Math.max(slides.length - 1, 0))),
      );
    };

    api.on('select', syncCurrentIndex);
    api.on('reInit', syncCurrentIndex);
    syncCurrentIndex();

    return () => {
      api.off('select', syncCurrentIndex);
      api.off('reInit', syncCurrentIndex);
    };
  }, [api, slides.length]);

  useEffect(() => {
    if (!liveRegionRef.current || !slides.length) return;

    const currentSlide = slides[currentIndex];
    liveRegionRef.current.textContent = `Showing slide ${currentIndex + 1} of ${
      slides.length
    }: ${currentSlide?.backgroundText?.jsonValue?.value || ''}.`;
  }, [currentIndex, slides]);

  if (!fields) {
    return <NoDataFallback componentName="ImageCarousel" />;
  }

  const hasPagesPositionStyles = Boolean(
    props.params.styles?.includes('position-'),
  );
  const currentSlide = slides[currentIndex];
  const canNavigate = slides.length > 1;

  return (
    <section
      className={cn(
        'component image-carousel @container group relative w-full overflow-hidden bg-primary py-[clamp(3.5rem,8vw,6.5rem)] text-primary-foreground',
        {
          'position-center': !hasPagesPositionStyles,
          [props.params.styles || '']: Boolean(props.params.styles),
        },
      )}
      data-class-change
      data-component="ImageCarouselDefault"
    >
      <div className="legal-content-shell">
        <AnimatedSection
          direction="up"
          isPageEditing={isPageEditing}
          reducedMotion={isReducedMotion}
        >
          <Text
            id={`${slideshowId}-heading`}
            tag="h2"
            field={title?.jsonValue}
            className="legal-display-heading max-w-[18ch] text-pretty text-[clamp(2rem,5.25cqw,4.75rem)] font-light leading-[0.98] tracking-[-0.025em] group-[.position-center]:mx-auto group-[.position-center]:text-center group-[.position-right]:ml-auto group-[.position-right]:text-right"
          />
        </AnimatedSection>
      </div>

      <div
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {slides.length > 0 && (
        <>
          <div
            className="mt-[clamp(2rem,5vw,4.25rem)] w-full overflow-hidden"
            data-component-part="carousel-wrapper"
          >
            <Carousel
              setApi={setApi}
              opts={{
                align: 'center',
                containScroll: 'trimSnaps',
                loop: canNavigate,
                skipSnaps: false,
                watchDrag: !isPageEditing,
              }}
              className="w-full"
              aria-labelledby={`${slideshowId}-heading`}
              data-component-part="carousel"
            >
              <CarouselContent
                className="-ml-4 items-stretch"
                data-component-part="carousel-content"
              >
                {slides.map((slide, index) => {
                  const isActive = index === currentIndex;

                  return (
                    <CarouselItem
                      key={slide.id || index}
                      className="@md:basis-[78%] @lg:basis-[68%] @xl:basis-[62%] basis-[88%] pl-4"
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`Slide ${index + 1} of ${slides.length}${
                        isActive ? ', current slide' : ''
                      }`}
                      aria-hidden={!isActive && !isPageEditing}
                      tabIndex={isActive ? 0 : -1}
                      data-component-part="carousel-item"
                    >
                      <div
                        className={cn(
                          'relative aspect-[16/9] min-h-[300px] overflow-hidden bg-black transition-[opacity,transform] duration-500',
                          isActive
                            ? 'scale-100 opacity-100'
                            : 'scale-[0.965] opacity-45',
                        )}
                      >
                        <ImageWrapper
                          image={slide.image?.jsonValue}
                          wrapperClass="absolute inset-0 h-full w-full"
                          className="h-full w-full object-cover"
                          page={props.page}
                        />
                        <div
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/5"
                          aria-hidden="true"
                        />
                        <div className="absolute inset-x-0 bottom-0 z-10 p-[clamp(1.5rem,4cqw,3.5rem)]">
                          <Text
                            tag="p"
                            field={slide.backgroundText?.jsonValue}
                            className="font-heading max-w-full break-words text-[clamp(2.35rem,7cqw,6.75rem)] font-light leading-[0.86] tracking-[-0.035em] text-white"
                          />
                        </div>
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          </div>

          <div className="legal-content-shell">
            <AnimatedSection
              direction="up"
              isPageEditing={isPageEditing}
              reducedMotion={isReducedMotion}
            >
              <div className="mt-7 flex flex-wrap items-center justify-between gap-5">
                <div
                  className="flex items-center gap-3"
                  role="group"
                  aria-label="Carousel controls"
                >
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => api?.scrollPrev()}
                    disabled={!canNavigate}
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <p
                    className="min-w-[5.5rem] text-center text-sm font-medium tracking-[0.16em]"
                    aria-hidden="true"
                  >
                    {String(currentIndex + 1).padStart(2, '0')} /{' '}
                    {String(slides.length).padStart(2, '0')}
                  </p>

                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => api?.scrollNext()}
                    disabled={!canNavigate}
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {linkIsValid(currentSlide?.link?.jsonValue) && (
                  <ButtonBase
                    variant="secondary"
                    buttonLink={currentSlide.link.jsonValue}
                    isPageEditing={isPageEditing}
                  />
                )}
              </div>
            </AnimatedSection>
          </div>
        </>
      )}
    </section>
  );
};
