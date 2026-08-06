'use client';

import { useId, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import { ButtonBase } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { ImageCarouselEditMode } from './ImageCarouselEditMode.dev';
import type {
  ImageCarouselProps,
  imageCarouselItem,
} from './image-carousel.props';

const fallbackResources = [
  {
    eyebrow: 'Dig safely',
    title: 'Call 811 before you dig',
    description:
      'A quick call helps underground utilities get marked before every digging project.',
    image: '/assets/nwn-images/homepage-hero-call-811-before-you-dig-wide.png',
    href: '/safety/call-before-you-dig',
    linkText: 'Plan a safe project',
  },
  {
    eyebrow: 'Here to help',
    title: 'Payment assistance',
    description:
      'Start with an overview of support paths when paying an energy bill becomes difficult.',
    image: '/assets/nwn-images/homepage-hero-bill-assistance-wide.png',
    href: '/account-billing/payment-assistance',
    linkText: 'Explore assistance',
  },
  {
    eyebrow: 'Your account',
    title: 'Manage service on your schedule',
    description:
      'Find simple paths to pay a bill, update service, or prepare for a move.',
    image: '/assets/nwn-images/homepage-hero-manage-account-24-7-wide.png',
    href: '/account-billing',
    linkText: 'Open account and billing',
  },
  {
    eyebrow: 'Ways to save',
    title: 'Rebates and offers',
    description:
      'Explore incentives for efficient furnaces, water heaters, fireplaces and more.',
    image: '/assets/nwn-images/rebates-high-efficiency-furnace-landscape.png',
    href: '/ways-to-save/rebates-offers',
    linkText: 'Find available rebates',
  },
] as const;

const isLegacyStarterContent = (value: string | undefined): boolean =>
  Boolean(
    value &&
      /alaris|aero|terra|nexa|vehicle|automotive|driving range|base price/i.test(
        value,
      ),
  );

const parseBackgroundText = (
  value: string | undefined,
  index: number,
): { title: string; description: string } => {
  const fallback = fallbackResources[index % fallbackResources.length];
  if (isLegacyStarterContent(value)) {
    return { title: fallback.title, description: fallback.description };
  }

  const [title, ...descriptionParts] = (value || '')
    .split('||')
    .map((part) => part.trim());

  return {
    title: title || fallback.title,
    description: descriptionParts.join(' || ') || fallback.description,
  };
};

const fallbackImage = (index: number): ImageField => {
  const fallback = fallbackResources[index % fallbackResources.length];
  return {
    value: {
      src: fallback.image,
      alt: fallback.title,
      width: '960',
      height: '640',
    },
  };
};

const fallbackLink = (index: number): LinkField => {
  const fallback = fallbackResources[index % fallbackResources.length];
  return {
    value: {
      href: fallback.href,
      text: fallback.linkText,
      linktype: 'internal',
    },
  };
};

type Resource = {
  eyebrow: string;
  title: string;
  description: string;
  image: ImageField;
  link: LinkField;
};

const mapResource = (
  item: imageCarouselItem | undefined,
  index: number,
): Resource => {
  const fallback = fallbackResources[index % fallbackResources.length];
  const parsed = parseBackgroundText(
    item?.backgroundText?.jsonValue?.value,
    index,
  );
  const authoredImage = item?.image?.jsonValue;
  const imageSrc = authoredImage?.value?.src;
  const authoredLink = item?.link?.jsonValue;
  const authoredHref = authoredLink?.value?.href;

  return {
    eyebrow: fallback.eyebrow,
    ...parsed,
    image:
      imageSrc && !isLegacyStarterContent(imageSrc)
        ? authoredImage
        : fallbackImage(index),
    link:
      authoredHref && !isLegacyStarterContent(authoredHref)
        ? authoredLink
        : fallbackLink(index),
  };
};

export const ImageCarouselNwnResources: React.FC<ImageCarouselProps> = (
  props,
) => {
  const { fields, isPageEditing } = props;
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselId = useId();
  const datasource = fields?.data?.datasource;
  const authoredItems = datasource?.imageItems?.results ?? [];
  const resources = useMemo<Resource[]>(
    () =>
      fallbackResources.map((_, index) =>
        mapResource(authoredItems[index], index),
      ),
    [authoredItems],
  );

  if (!fields || !datasource) {
    return <NoDataFallback componentName="Image Carousel" />;
  }

  if (isPageEditing) {
    return (
      <ImageCarouselEditMode
        {...props}
        componentName="ImageCarouselNwnResources"
      />
    );
  }

  const activeResource = resources[currentIndex];
  const authoredTitle = datasource.title?.jsonValue?.value;
  const heading =
    authoredTitle && !isLegacyStarterContent(authoredTitle)
      ? authoredTitle
      : 'Practical resources for every customer.';
  const goToPrevious = () =>
    setCurrentIndex(
      (index) => (index - 1 + resources.length) % resources.length,
    );
  const goToNext = () =>
    setCurrentIndex((index) => (index + 1) % resources.length);

  return (
    <section
      data-component="ImageCarousel"
      data-variant="NwnResources"
      className={cn(
        'overflow-hidden bg-white py-14 sm:py-16 lg:py-20',
        props.params?.styles,
      )}
      aria-labelledby={carouselId + '-heading'}
      aria-roledescription="carousel"
    >
      <div className="nwn-content-shell">
        <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              Customer resources
            </p>
            <h2
              id={carouselId + '-heading'}
              className="mt-3 text-balance font-heading text-[clamp(2.125rem,3.5vw,2.75rem)] font-medium leading-[1.02] tracking-[-0.02em] text-slate-900"
            >
              {heading}
            </h2>
          </div>
          <div className="flex shrink-0 gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11"
              onClick={goToPrevious}
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
              onClick={goToNext}
              aria-label="Next customer resource"
              aria-controls={carouselId}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div
          id={carouselId}
          role="group"
          aria-roledescription="slide"
          aria-label={currentIndex + 1 + ' of ' + resources.length}
          className="mt-10 grid overflow-hidden rounded-sm bg-[#eef5f6] shadow-[0_10px_30px_rgba(26,55,67,0.10)] lg:grid-cols-[1.2fr_0.8fr]"
        >
          <ImageWrapper
            key={'nwn-resource-' + currentIndex}
            image={activeResource.image}
            wrapperClass="min-h-[18rem] overflow-hidden sm:min-h-[24rem]"
            className="h-full w-full object-cover transition-transform duration-700 motion-safe:hover:scale-[1.02]"
            sizes="(min-width: 1024px) 60vw, 100vw"
            page={props.page}
          />
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              {activeResource.eyebrow}
            </p>
            <h3 className="mt-3 text-balance font-heading text-3xl font-medium leading-[1.08] text-slate-900 sm:text-4xl">
              {activeResource.title}
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {activeResource.description}
            </p>
            <div className="mt-7">
              <ButtonBase
                buttonLink={activeResource.link}
                variant="default"
                className="min-h-12 bg-primary px-6 text-base font-semibold text-white hover:bg-[#005f7f]"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {resources.map((resource, index) => (
            <button
              type="button"
              key={resource.title}
              onClick={() => setCurrentIndex(index)}
              aria-label={'Show customer resource: ' + resource.title}
              aria-current={index === currentIndex ? 'true' : undefined}
              className={cn(
                'border-t-4 px-4 py-4 text-left font-heading text-base font-semibold transition-colors',
                index === currentIndex
                  ? 'border-cyan-500 bg-[#eef5f6] text-primary'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50',
              )}
            >
              {resource.title}
            </button>
          ))}
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Showing customer resource {currentIndex + 1} of {resources.length}:{' '}
          {activeResource.title}
        </p>
      </div>
    </section>
  );
};

// Kept as a named alias for Sitecore items created during the demo build.
export const ImageCarouselNwnHome = ImageCarouselNwnResources;
