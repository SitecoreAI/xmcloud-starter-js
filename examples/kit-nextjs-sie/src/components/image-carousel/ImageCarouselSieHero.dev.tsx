'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Text,
  type Field,
  type ImageField,
  type LinkField,
} from '@sitecore-content-sdk/nextjs';

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
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';

import type {
  ImageCarouselProps,
  imageCarouselItem,
} from './image-carousel.props';

type HeroSlide = {
  id: string;
  title: string;
  titleField?: Field<string>;
  copyField?: Field<string>;
  image?: ImageField;
  link?: LinkField;
};

const mapSlide = (item: imageCarouselItem): HeroSlide => ({
  id: item.id,
  title: item.backgroundText?.jsonValue?.value ?? '',
  titleField: item.backgroundText?.jsonValue,
  copyField: item.copy?.jsonValue,
  image: item.image?.jsonValue,
  link: item.link?.jsonValue,
});

export const ImageCarouselSieHero: React.FC<ImageCarouselProps> = (props) => {
  const { fields, isPageEditing } = props;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const carouselId = useId();
  const datasource = fields?.data?.datasource;
  const authoredItems = datasource?.imageItems?.results ?? [];
  const slides = useMemo<HeroSlide[]>(
    () => authoredItems.map(mapSlide),
    [authoredItems],
  );

  useEffect(() => {
    if (!api || slides.length === 0) {
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

  if (!fields || !datasource) {
    return isPageEditing ? (
      <NoDataFallback componentName="SiEnergy Hero Carousel" />
    ) : null;
  }

  if (slides.length === 0 && !isPageEditing) {
    return null;
  }

  if (slides.length === 0) {
    return (
      <div className="border border-dashed border-[#b8b6b7] bg-[#f4f3f2] px-6 py-12 text-center text-[#414042]">
        <p className="font-heading text-xl font-semibold">
          No hero slides yet
        </p>
        <p className="mt-2 text-base">
          Use Manage items in Page Builder to add the first hero slide.
        </p>
      </div>
    );
  }

  const activeIndex = Math.min(currentIndex, slides.length - 1);
  const activeSlide = slides[activeIndex];
  const canNavigate = slides.length > 1;
  const carouselLabel =
    datasource.title?.jsonValue?.value || 'SiEnergy featured information';

  return (
    <section
      data-component="ImageCarousel"
      data-variant="SieHero"
      className={cn(
        'relative overflow-hidden bg-primary text-white',
        props.params?.styles,
      )}
    >
      <Carousel
        id={carouselId}
        aria-label={carouselLabel}
        setApi={setApi}
        opts={{
          align: 'start',
          containScroll: 'trimSnaps',
          loop: canNavigate,
          skipSnaps: false,
          watchDrag: !isPageEditing,
        }}
        className="w-full"
      >
        <CarouselContent className="ml-0 items-stretch">
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            const headingTag = isActive ? 'h1' : 'h2';
            const hasImage = Boolean(slide.image?.value?.src);
            const showImage = isPageEditing || hasImage;

            return (
              <CarouselItem
                key={slide.id}
                className="basis-full pl-0"
                aria-label={`${index + 1} of ${slides.length}${
                  isActive ? ', current slide' : ''
                }`}
                aria-hidden={!isActive && !isPageEditing}
                inert={!isActive && !isPageEditing ? true : undefined}
                data-carousel-item-id={slide.id}
              >
                <article
                  className={cn(
                    'grid min-h-[28rem] w-full bg-primary',
                    showImage && 'lg:grid-cols-2',
                  )}
                >
                  <div className="flex min-h-[28rem] items-center bg-primary px-6 pb-28 pt-12 sm:px-10 sm:pb-32 sm:pt-16 lg:min-h-[32rem] lg:px-14 lg:py-20 xl:px-20 2xl:pl-24">
                    <div className="w-full max-w-[42rem]">
                      {slide.titleField &&
                        (isPageEditing || Boolean(slide.titleField.value)) && (
                          <Text
                            tag={headingTag}
                            field={slide.titleField}
                            className="max-w-[15ch] text-balance font-heading text-[clamp(2.75rem,4.5vw,4.25rem)] font-semibold leading-[1.06] tracking-[-0.025em] text-white"
                          />
                        )}

                      {slide.copyField &&
                        (isPageEditing || Boolean(slide.copyField.value)) && (
                          <Text
                            tag="p"
                            field={slide.copyField}
                            className="mt-5 max-w-[36rem] text-pretty text-lg font-semibold leading-8 text-[#2b2623] sm:text-xl"
                          />
                        )}

                      {slide.link &&
                        (isPageEditing || linkIsValid(slide.link)) && (
                          <div className="mt-8">
                            <ButtonBase
                              buttonLink={slide.link}
                              isPageEditing={isPageEditing}
                              variant="tertiary"
                              className="min-h-12 border border-[#414042] bg-[#414042] px-6 text-base font-semibold text-white hover:bg-[#2f2e30] hover:text-white"
                              page={props.page}
                            />
                          </div>
                        )}
                    </div>
                  </div>

                  {showImage && (
                    <ImageWrapper
                      image={slide.image}
                      wrapperClass={cn(
                        'relative min-h-[20rem] overflow-hidden bg-[#eff0f2] sm:min-h-[24rem] lg:min-h-[32rem]',
                        isPageEditing && !hasImage && 'z-10',
                      )}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      priority={index === 0}
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      page={props.page}
                    />
                  )}
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {canNavigate && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex items-center justify-between gap-5 px-6 sm:bottom-7 sm:px-10 lg:px-14 xl:px-20 2xl:px-24">
          <div
            className="pointer-events-auto flex items-center gap-2 rounded-sm bg-[#2b2623]/90 px-3 py-2 shadow-sm backdrop-blur-sm"
            role="group"
            aria-label="Choose a hero slide"
          >
            {slides.map((slide, index) => (
              <button
                type="button"
                key={`${slide.id}-indicator`}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Show slide ${index + 1}: ${slide.title}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  index === activeIndex
                    ? 'w-8 bg-primary'
                    : 'w-2.5 bg-white/70 hover:bg-white',
                )}
              />
            ))}
          </div>

          <div
            className="pointer-events-auto flex gap-2"
            role="group"
            aria-label="Hero carousel controls"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 border-white/75 bg-[#2b2623]/90 text-white shadow-sm backdrop-blur-sm hover:bg-white hover:text-[#414042]"
              onClick={() => api?.scrollPrev()}
              aria-label="Previous hero slide"
              aria-controls={carouselId}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 border-white/75 bg-[#2b2623]/90 text-white shadow-sm backdrop-blur-sm hover:bg-white hover:text-[#414042]"
              onClick={() => api?.scrollNext()}
              aria-label="Next hero slide"
              aria-controls={carouselId}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Showing hero slide {activeIndex + 1} of {slides.length}:{' '}
        {activeSlide.title}
      </p>
    </section>
  );
};
