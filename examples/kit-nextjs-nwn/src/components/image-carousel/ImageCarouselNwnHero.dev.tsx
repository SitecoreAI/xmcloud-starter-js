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
import {
  NWN_ACCOUNT_SESSION_CHANGED_EVENT,
  verifyDemoAccountSession,
} from '@/lib/sitecoreai-udl-client';
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

const accountAccessLabels = new Set([
  'access your account',
  'acceda a su cuenta',
]);

const isAccountAccessLink = (link?: LinkField) => {
  const label = link?.value?.text?.trim().toLowerCase();
  if (label && accountAccessLabels.has(label)) return true;

  const href = link?.value?.href;
  if (!href) return false;

  const pathname = href
    .split(/[?#]/, 1)[0]
    .replace(/\/$/, '')
    .toLowerCase();
  return (
    pathname === '/account-billing/login' ||
    pathname === '/es-mx/account-billing/login'
  );
};

export const ImageCarouselNwnHero: React.FC<ImageCarouselProps> = (props) => {
  const { fields, isPageEditing } = props;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const [accountSessionState, setAccountSessionState] = useState<
    'checking' | 'anonymous' | 'identified'
  >(isPageEditing ? 'anonymous' : 'checking');
  const carouselId = useId();
  const datasource = fields?.data?.datasource;
  const authoredItems = datasource?.imageItems?.results ?? [];
  const slides = useMemo<HeroSlide[]>(
    () => authoredItems.map(mapSlide),
    [authoredItems],
  );

  useEffect(() => {
    if (isPageEditing) {
      setAccountSessionState('anonymous');
      return;
    }

    let isActive = true;
    const handleSessionChanged = (event: Event) => {
      const state = (event as CustomEvent<'anonymous' | 'identified'>).detail;
      if (state === 'anonymous' || state === 'identified') {
        setAccountSessionState(state);
      }
    };

    window.addEventListener(
      NWN_ACCOUNT_SESSION_CHANGED_EVENT,
      handleSessionChanged,
    );

    void verifyDemoAccountSession()
      .then(() => {
        if (isActive) setAccountSessionState('identified');
      })
      .catch(() => {
        if (isActive) setAccountSessionState('anonymous');
      });

    return () => {
      isActive = false;
      window.removeEventListener(
        NWN_ACCOUNT_SESSION_CHANGED_EVENT,
        handleSessionChanged,
      );
    };
  }, [isPageEditing]);

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
      <NoDataFallback componentName="NW Natural Hero Carousel" />
    ) : null;
  }

  if (slides.length === 0 && !isPageEditing) {
    return null;
  }

  if (slides.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 bg-[#eef5f6] px-6 py-12 text-center text-slate-700">
        <p className="font-heading text-xl font-semibold text-slate-900">
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
    datasource.title?.jsonValue?.value || 'NW Natural featured information';

  return (
    <section
      data-component="ImageCarousel"
      data-variant="NwnHero"
      className={cn(
        'relative overflow-hidden bg-[#173c47] text-white',
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
                <article className="relative min-h-[28rem] overflow-hidden sm:min-h-[32rem]">
                  {showImage && (
                    <ImageWrapper
                      image={slide.image}
                      wrapperClass={cn(
                        'absolute inset-0 h-full w-full',
                        isPageEditing && !hasImage && 'z-10',
                      )}
                      className="h-full w-full object-cover object-center"
                      priority={index === 0}
                      sizes="100vw"
                      page={props.page}
                    />
                  )}

                  <div
                    className={cn(
                      'pointer-events-none absolute inset-0',
                      hasImage
                        ? 'bg-[linear-gradient(90deg,rgba(9,35,45,0.95)_0%,rgba(9,35,45,0.76)_44%,rgba(9,35,45,0.18)_100%)]'
                        : 'bg-[linear-gradient(135deg,#173c47_0%,#0f6276_100%)]',
                    )}
                    aria-hidden="true"
                  />

                  <div className="nwn-content-shell relative z-20 flex min-h-[28rem] items-center pb-28 pt-14 sm:min-h-[32rem] sm:pb-32 sm:pt-16 lg:py-20">
                    <div className="max-w-3xl">
                      {slide.titleField &&
                        (isPageEditing || Boolean(slide.titleField.value)) && (
                          <Text
                            tag={headingTag}
                            field={slide.titleField}
                            className="max-w-[16ch] text-balance font-heading text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.04] tracking-[-0.02em] text-white"
                          />
                        )}

                      {slide.copyField &&
                        (isPageEditing || Boolean(slide.copyField.value)) && (
                          <Text
                            tag="p"
                            field={slide.copyField}
                            className="mt-5 max-w-2xl text-pretty text-lg leading-7 text-white/95 sm:text-xl sm:leading-8"
                          />
                        )}

                      {slide.link &&
                        (isPageEditing || linkIsValid(slide.link)) &&
                        (isPageEditing ||
                          !isAccountAccessLink(slide.link) ||
                          accountSessionState === 'anonymous') && (
                          <div className="mt-8">
                            <ButtonBase
                              buttonLink={slide.link}
                              isPageEditing={isPageEditing}
                              variant="tertiary"
                              className="min-h-12 border border-white bg-white px-6 text-base font-semibold text-primary hover:bg-cyan-50"
                              page={props.page}
                            />
                          </div>
                        )}
                    </div>
                  </div>
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {canNavigate && (
        <div className="nwn-content-shell pointer-events-none absolute inset-x-0 bottom-6 z-30 flex items-center justify-between gap-5 sm:bottom-8">
          <div
            className="pointer-events-auto flex items-center gap-2 rounded-sm bg-[#08232d]/85 px-3 py-2 backdrop-blur-sm"
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
                    ? 'w-8 bg-cyan-400'
                    : 'w-2.5 bg-white/65 hover:bg-white',
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
              className="h-11 w-11 border-white/70 bg-[#08232d]/85 text-white backdrop-blur-sm hover:bg-white hover:text-primary"
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
              className="h-11 w-11 border-white/70 bg-[#08232d]/85 text-white backdrop-blur-sm hover:bg-white hover:text-primary"
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
