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

const fallbackResources = [
  {
    key: 'call-811',
    matchers: ['call 811', 'call-before-you-dig'],
    eyebrow: 'Dig safely',
    title: 'Call 811 before you dig',
    description:
      'A quick call helps underground utilities get marked before every digging project.',
    image: '/assets/nwn-images/homepage-hero-call-811-before-you-dig-wide.png',
    href: '/safety/call-before-you-dig',
    linkText: 'Plan a safe project',
  },
  {
    key: 'payment-assistance',
    matchers: ['payment assistance', 'payment-assistance', 'energy bills'],
    eyebrow: 'Here to help',
    title: 'Payment assistance',
    description:
      'Start with an overview of support paths when paying an energy bill becomes difficult.',
    image: '/assets/nwn-images/homepage-hero-bill-assistance-wide.png',
    href: '/account-billing/payment-assistance',
    linkText: 'Explore assistance',
  },
  {
    key: 'manage-account',
    matchers: ['manage your account', 'manage service', '/account-billing'],
    eyebrow: 'Your account',
    title: 'Manage service on your schedule',
    description:
      'Find simple paths to pay a bill, update service, or prepare for a move.',
    image: '/assets/nwn-images/homepage-hero-manage-account-24-7-wide.png',
    href: '/account-billing',
    linkText: 'Open account and billing',
  },
  {
    key: 'rebates',
    matchers: ['rebates', 'ways-to-save'],
    eyebrow: 'Ways to save',
    title: 'Rebates and offers',
    description:
      'Explore incentives for efficient furnaces, water heaters, fireplaces and more.',
    image: '/assets/nwn-images/rebates-high-efficiency-furnace-landscape.png',
    href: '/ways-to-save/rebates-offers',
    linkText: 'Find available rebates',
  },
] as const;

const genericFallbackResource = {
  key: 'customer-resource',
  eyebrow: 'Customer resource',
  title: 'Customer resource',
  description:
    'Explore NW Natural customer services, support and safety information.',
  image: '/assets/nwn-images/homepage-hero-manage-account-24-7-wide.png',
  href: '',
  linkText: 'Learn more',
} as const;

type FallbackResource =
  | (typeof fallbackResources)[number]
  | typeof genericFallbackResource;

type Resource = {
  id: string;
  eyebrow: string;
  title: string;
  titleField?: Field<string>;
  authoredTitleField?: Field<string>;
  description: string;
  image: ImageField;
  authoredImage?: ImageField;
  link?: LinkField;
  authoredLink?: LinkField;
};

const isLegacyStarterContent = (value: string | undefined): boolean =>
  Boolean(
    value &&
      /alaris|aero|terra|nexa|vehicle|automotive|driving range|base price/i.test(
        value,
      ),
  );

const findMatchingFallback = (
  item: imageCarouselItem | undefined,
): (typeof fallbackResources)[number] | undefined => {
  if (!item) return undefined;

  const hint = [
    item.backgroundText?.jsonValue?.value,
    item.link?.jsonValue?.value?.href,
    item.link?.jsonValue?.value?.text,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return fallbackResources.find((resource) =>
    resource.matchers.some((matcher) => hint.includes(matcher)),
  );
};

const parseBackgroundText = (
  value: string | undefined,
  fallback: FallbackResource,
): { title: string; description: string; usesStructuredText: boolean } => {
  if (isLegacyStarterContent(value)) {
    return {
      title: fallback.title,
      description: fallback.description,
      usesStructuredText: false,
    };
  }

  const parts = (value || '').split('||').map((part) => part.trim());
  const [title, ...descriptionParts] = parts;

  return {
    title: title || fallback.title,
    description: descriptionParts.join(' || ') || fallback.description,
    usesStructuredText: parts.length > 1,
  };
};

const fallbackImage = (resource: FallbackResource): ImageField => ({
  value: {
    src: resource.image,
    alt: resource.title,
    width: '960',
    height: '640',
  },
});

const fallbackLink = (resource: FallbackResource): LinkField | undefined =>
  resource.href
    ? {
        value: {
          href: resource.href,
          text: resource.linkText,
          linktype: 'internal',
        },
      }
    : undefined;

const mapResource = (
  item: imageCarouselItem | undefined,
  index: number,
): Resource => {
  const matchedFallback = findMatchingFallback(item);
  const fallback =
    matchedFallback ||
    (!item
      ? fallbackResources[index % fallbackResources.length]
      : genericFallbackResource);
  const backgroundTextField = item?.backgroundText?.jsonValue;
  const parsed = parseBackgroundText(backgroundTextField?.value, fallback);
  const authoredImage = item?.image?.jsonValue;
  const imageSrc = authoredImage?.value?.src;
  const authoredLink = item?.link?.jsonValue;
  const authoredHref = authoredLink?.value?.href;

  return {
    id: item?.id || 'fallback-' + fallback.key + '-' + index,
    eyebrow: fallback.eyebrow,
    title: parsed.title,
    titleField:
      backgroundTextField?.value &&
      !parsed.usesStructuredText &&
      !isLegacyStarterContent(backgroundTextField.value)
        ? backgroundTextField
        : undefined,
    authoredTitleField: backgroundTextField,
    description: parsed.description,
    image:
      imageSrc && !isLegacyStarterContent(imageSrc)
        ? authoredImage
        : fallbackImage(fallback),
    authoredImage,
    link:
      authoredHref && !isLegacyStarterContent(authoredHref)
        ? authoredLink
        : matchedFallback
          ? fallbackLink(fallback)
          : undefined,
    authoredLink,
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
    return <NoDataFallback componentName="Image Carousel" />;
  }

  if (resources.length === 0 && !isPageEditing) {
    return null;
  }

  const authoredTitleField = datasource.title?.jsonValue;
  const authoredTitle = authoredTitleField?.value;
  const useAuthoredTitle = Boolean(
    authoredTitle && !isLegacyStarterContent(authoredTitle),
  );
  const headingField =
    isPageEditing || useAuthoredTitle ? authoredTitleField : undefined;
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
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              Customer resources
            </p>
            {headingField ? (
              <Text
                id={carouselId + '-heading'}
                tag="h2"
                field={headingField}
                className="mt-3 text-balance font-heading text-[clamp(2.125rem,3.5vw,2.75rem)] font-medium leading-[1.02] tracking-[-0.02em] text-slate-900"
              />
            ) : (
              <h2
                id={carouselId + '-heading'}
                className="mt-3 text-balance font-heading text-[clamp(2.125rem,3.5vw,2.75rem)] font-medium leading-[1.02] tracking-[-0.02em] text-slate-900"
              >
                Practical resources for every customer.
              </h2>
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
              aria-labelledby={carouselId + '-heading'}
            >
              <CarouselContent className="ml-0 items-stretch">
                {resources.map((resource, index) => {
                  const isActive = index === activeIndex;
                  const displayedTitleField = isPageEditing
                    ? resource.authoredTitleField
                    : resource.titleField;
                  const displayedImage =
                    isPageEditing && resource.authoredImage
                      ? resource.authoredImage
                      : resource.image;
                  const displayedLink = isPageEditing
                    ? resource.authoredLink
                    : resource.link;

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
                      <div className="grid h-full overflow-hidden rounded-sm bg-[#eef5f6] shadow-[0_10px_30px_rgba(26,55,67,0.10)] lg:grid-cols-[1.2fr_0.8fr]">
                        <ImageWrapper
                          image={displayedImage}
                          wrapperClass="min-h-[18rem] overflow-hidden sm:min-h-[24rem]"
                          className="h-full w-full object-cover transition-transform duration-700 motion-safe:hover:scale-[1.02]"
                          sizes="(min-width: 1024px) 60vw, 100vw"
                          page={props.page}
                        />
                        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                          <p className="font-heading text-sm font-semibold uppercase tracking-[0.15em] text-primary">
                            {resource.eyebrow}
                          </p>
                          {displayedTitleField ? (
                            <Text
                              tag="h3"
                              field={displayedTitleField}
                              className="mt-3 text-balance font-heading text-3xl font-medium leading-[1.08] text-slate-900 sm:text-4xl"
                            />
                          ) : (
                            <h3 className="mt-3 text-balance font-heading text-3xl font-medium leading-[1.08] text-slate-900 sm:text-4xl">
                              {resource.title}
                            </h3>
                          )}
                          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                            {resource.description}
                          </p>
                          {displayedLink &&
                            (isPageEditing || linkIsValid(displayedLink)) && (
                              <div className="mt-7">
                                <ButtonBase
                                  buttonLink={displayedLink}
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
