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

type Resource = {
  id: string;
  title: string;
  titleField?: Field<string>;
  description: string;
  usesStructuredText: boolean;
  image?: ImageField;
  link?: LinkField;
};

const parseBackgroundText = (
  value: string | undefined,
): { title: string; description: string; usesStructuredText: boolean } => {
  const parts = (value || '').split('||').map((part) => part.trim());
  const [title, ...descriptionParts] = parts;

  return {
    title: title || '',
    description: descriptionParts.join(' || '),
    usesStructuredText: parts.length > 1,
  };
};

const mapResource = (item: imageCarouselItem): Resource => {
  const backgroundTextField = item?.backgroundText?.jsonValue;
  const parsed = parseBackgroundText(backgroundTextField?.value);
  const authoredImage = item?.image?.jsonValue;
  const authoredLink = item?.link?.jsonValue;

  return {
    id: item.id,
    title: parsed.title,
    titleField: backgroundTextField,
    description: parsed.description,
    usesStructuredText: parsed.usesStructuredText,
    image: authoredImage,
    link: authoredLink,
  };
};

export const ImageCarouselNwnResources: React.FC<ImageCarouselProps> = (
  props,
) => {
  const { fields, isPageEditing } = props;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const carouselId = useId();
  const datasource = fields?.data?.datasource;
  const authoredItems = datasource?.imageItems?.results ?? [];
  const resources = useMemo<Resource[]>(
    () => authoredItems.map(mapResource),
    [authoredItems],
  );

  useEffect(() => {
    if (!api || resources.length === 0) {
      setCurrentIndex(0);
      return;
    }

    const syncCurrentIndex = () => {
      const selectedIndex = api.selectedScrollSnap();
      setCurrentIndex(
        Math.max(0, Math.min(selectedIndex, Math.max(resources.length - 1, 0))),
      );
    };

    api.on('select', syncCurrentIndex);
    api.on('reInit', syncCurrentIndex);
    syncCurrentIndex();

    return () => {
      api.off('select', syncCurrentIndex);
      api.off('reInit', syncCurrentIndex);
    };
  }, [api, resources.length]);

  if (!fields || !datasource) {
    return isPageEditing ? (
      <NoDataFallback componentName="Image Carousel" />
    ) : null;
  }

  if (resources.length === 0 && !isPageEditing) {
    return null;
  }

  const headingField = datasource.title?.jsonValue;
  const showHeading = isPageEditing || Boolean(headingField?.value);
  const activeIndex = Math.min(currentIndex, Math.max(resources.length - 1, 0));
  const activeResource = resources[activeIndex];
  const canNavigate = resources.length > 1;

  return (
    <section
      data-component="ImageCarousel"
      data-variant="NwnResources"
      className={cn(
        'overflow-hidden bg-white py-14 sm:py-16 lg:py-20',
        props.params?.styles,
      )}
    >
      <div className="nwn-content-shell">
        <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            {showHeading && (
              <Text
                id={carouselId + '-heading'}
                tag="h2"
                field={headingField}
                className="text-balance font-heading text-[clamp(2.125rem,3.5vw,2.75rem)] font-medium leading-[1.02] tracking-[-0.02em] text-slate-900"
              />
            )}
          </div>

          {resources.length > 0 && (
            <div
              className="flex shrink-0 gap-3"
              role="group"
              aria-label="Carousel controls"
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={() => api?.scrollPrev()}
                disabled={!canNavigate}
                aria-label="Previous customer resource"
                aria-controls={carouselId}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={() => api?.scrollNext()}
                disabled={!canNavigate}
                aria-label="Next customer resource"
                aria-controls={carouselId}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>

        {resources.length > 0 && activeResource ? (
          <>
            <Carousel
              id={carouselId}
              setApi={setApi}
              opts={{
                align: 'start',
                containScroll: 'trimSnaps',
                loop: canNavigate,
                skipSnaps: false,
                watchDrag: !isPageEditing,
              }}
              className="mt-10 w-full"
              aria-labelledby={
                showHeading ? carouselId + '-heading' : undefined
              }
              aria-label={showHeading ? undefined : 'Customer resources'}
            >
              <CarouselContent className="ml-0 items-stretch">
                {resources.map((resource, index) => {
                  const isActive = index === activeIndex;
                  const showImage =
                    isPageEditing || Boolean(resource.image?.value?.src);

                  return (
                    <CarouselItem
                      key={resource.id}
                      className="basis-full pl-0"
                      aria-label={
                        index +
                        1 +
                        ' of ' +
                        resources.length +
                        (isActive ? ', current slide' : '')
                      }
                      aria-hidden={!isActive && !isPageEditing}
                      inert={!isActive && !isPageEditing ? true : undefined}
                      data-carousel-item-id={resource.id}
                    >
                      <div
                        className={cn(
                          'grid h-full overflow-hidden rounded-sm bg-[#eef5f6] shadow-[0_10px_30px_rgba(26,55,67,0.10)]',
                          showImage && 'lg:grid-cols-[1.2fr_0.8fr]',
                        )}
                      >
                        {showImage && (
                          <ImageWrapper
                            image={resource.image}
                            wrapperClass="min-h-[18rem] overflow-hidden sm:min-h-[24rem]"
                            className="h-full w-full object-cover transition-transform duration-700 motion-safe:hover:scale-[1.02]"
                            sizes="(min-width: 1024px) 60vw, 100vw"
                            page={props.page}
                          />
                        )}
                        <div
                          className={cn(
                            'flex flex-col justify-center p-6 sm:p-8 lg:p-10',
                            !showImage && 'min-h-64 max-w-4xl',
                          )}
                        >
                          {isPageEditing && resource.titleField ? (
                            <Text
                              tag="p"
                              field={resource.titleField}
                              className="text-lg font-semibold leading-8 text-slate-900"
                            />
                          ) : (
                            <>
                              {resource.usesStructuredText ? (
                                resource.title ? (
                                  <h3 className="text-balance font-heading text-3xl font-medium leading-[1.08] text-slate-900 sm:text-4xl">
                                    {resource.title}
                                  </h3>
                                ) : null
                              ) : resource.titleField ? (
                                <Text
                                  tag="h3"
                                  field={resource.titleField}
                                  className="text-balance font-heading text-3xl font-medium leading-[1.08] text-slate-900 sm:text-4xl"
                                />
                              ) : resource.title ? (
                                <h3 className="text-balance font-heading text-3xl font-medium leading-[1.08] text-slate-900 sm:text-4xl">
                                  {resource.title}
                                </h3>
                              ) : null}
                              {resource.description && (
                                <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                                  {resource.description}
                                </p>
                              )}
                            </>
                          )}
                          {resource.link &&
                            (isPageEditing || linkIsValid(resource.link)) && (
                              <div className="mt-7">
                                <ButtonBase
                                  buttonLink={resource.link}
                                  variant="default"
                                  className="min-h-12 bg-primary px-6 text-base font-semibold text-white hover:bg-[#005f7f]"
                                  isPageEditing={isPageEditing}
                                  page={props.page}
                                />
                              </div>
                            )}
                        </div>
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>

            <div
              className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
              role="group"
              aria-label="Choose a customer resource"
            >
              {resources.map((resource, index) => (
                <button
                  type="button"
                  key={resource.id + '-tab'}
                  onClick={() => api?.scrollTo(index)}
                  aria-label={'Show customer resource: ' + resource.title}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  className={cn(
                    'border-t-4 px-4 py-4 text-left font-heading text-base font-semibold transition-colors',
                    index === activeIndex
                      ? 'border-cyan-500 bg-[#eef5f6] text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50',
                  )}
                >
                  {resource.title}
                </button>
              ))}
            </div>

            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Showing customer resource {activeIndex + 1} of {resources.length}:{' '}
              {activeResource.title}
            </p>
          </>
        ) : (
          <div className="mt-10 border border-dashed border-slate-300 bg-[#eef5f6] px-6 py-12 text-center text-slate-700">
            <p className="font-heading text-xl font-semibold text-slate-900">
              No carousel items yet
            </p>
            <p className="mt-2 text-base">
              Use Manage items in Page Builder to add the first customer
              resource.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

// Kept as a named alias for Sitecore items created during the demo build.
export const ImageCarouselNwnHome = ImageCarouselNwnResources;
