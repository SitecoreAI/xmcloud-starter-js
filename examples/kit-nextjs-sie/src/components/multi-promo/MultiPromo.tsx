'use client';

import { useState, useEffect, useRef } from 'react';
import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import { debounce } from 'radash';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { getDatasource, getFieldValue } from '@/lib/component-props';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { MultiPromoItemProps, MultiPromoProps } from './multi-promo.props';
import { Default as MultiPromoItem } from './MultiPromoItem.dev';
import { MultiPromoNwnQuickActions } from './MultiPromoNwnQuickActions.dev';
import { MultiPromoNwnCards } from './MultiPromoNwnCards.dev';

export const Default: React.FC<MultiPromoProps> = (props) => {
  const { fields, params } = props;
  const { numColumns } = params || {};
  const datasource = getDatasource(fields);
  const { children, title, description } = datasource || {};
  const items = children?.results ?? [];
  const itemCount = items.length;
  const titleField = getFieldValue(title);
  const descriptionField = getFieldValue(description);
  const [api, setApi] = useState<CarouselApi>();
  const [announcement, setAnnouncement] = useState('');
  const carouselRef = useRef<HTMLDivElement>(null);

  // General slide handling
  useEffect(() => {
    if (!api) return;

    api.on('select', () => {
      const newIndex = api.selectedScrollSnap();

      // Announce slide change
      setAnnouncement(`Slide ${newIndex + 1} of ${children?.results.length}`);
    });

    // Add mousewheel event listener and keyboard event listener
    const debouncedHandleWheel = debounce(
      { delay: 100 },
      (event: WheelEvent) => {
        if (event.deltaX > 0) {
          api.scrollNext();
        } else if (event.deltaX < 0) {
          api.scrollPrev();
        }
      },
    );

    const debouncedHandleKeyDown = debounce(
      { delay: 100 },
      (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') {
          api?.scrollPrev();
        } else if (event.key === 'ArrowRight') {
          api?.scrollNext();
        }
      },
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); // Prevent default scrolling behavior
        debouncedHandleKeyDown(event);
      }
    };

    const rootNode = api.rootNode();
    rootNode.addEventListener('keydown', handleKeyDown);
    rootNode.addEventListener('wheel', debouncedHandleWheel);

    return () => {
      rootNode.removeEventListener('keydown', handleKeyDown);
      debouncedHandleKeyDown.cancel();
      rootNode.removeEventListener('wheel', debouncedHandleWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  if (fields) {
    return (
      <section
        className={cn(
          'component multi-promo nwn-content-shell my-8 text-left md:my-16',
          {
            [props?.params?.styles]: props?.params?.styles,
          },
        )}
        aria-labelledby={titleField?.value ? 'multi-promo-heading' : undefined}
      >
        <div className="flex flex-col gap-4 group-[.is-inset]:px-4 sm:group-[.is-inset]:px-0 xl:flex-row xl:items-end xl:justify-between xl:gap-20">
          {titleField && (
            <div className="flex-grow md:basis-[60] lg:basis-[50]">
              <Text
                tag="h2"
                id="multi-promo-heading"
                field={titleField}
                className="font-heading text-box-trim-both-baseline -ml-1 max-w-[20ch] text-pretty text-4xl font-normal leading-[1.1333] tracking-tighter antialiased sm:text-5xl md:max-w-[17.5ch] lg:text-6xl"
              />
            </div>
          )}
          {descriptionField && (
            <div className="md:basis-[40] lg:basis-[50]">
              <RichText
                className="text-body prose text-box-trim-both-baseline mt-6 max-w-[51.5ch] text-pretty text-lg leading-[1.444] tracking-tight antialiased"
                field={descriptionField}
              />
            </div>
          )}
        </div>
        {children && (
          <>
            <Carousel
              setApi={setApi}
              opts={{
                align: 'center',
                loop: true,
                skipSnaps: true,
              }}
              className="relative mx-auto w-full overflow-hidden"
              ref={carouselRef}
            >
              <CarouselContent
                className={cn('!ml-0 my-12 gap-4 last:mb-0 sm:my-16 sm:gap-8', {
                  'justify-center': itemCount === 1,
                  'sm:justify-center': itemCount <= 2,
                  'md:justify-center': itemCount <= 3,
                  'xl:justify-center': numColumns === '4' && itemCount <= 4,
                })}
              >
                {items.map((item: MultiPromoItemProps, index: number) => (
                  <CarouselItem
                    key={index}
                    className={cn(
                      'flex min-w-[238px] max-w-[416px] basis-3/4 justify-center !pl-0 text-left transition-opacity duration-300 sm:basis-[45%] md:basis-[31%]',
                      {
                        [`lg:basis-[31%]`]: numColumns === '3',
                        [`xl:basis-[23%]`]: numColumns === '4',
                      },
                    )}
                  >
                    <MultiPromoItem key={index} {...item} page={props.page} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {announcement}
            </div>
          </>
        )}
      </section>
    );
  }

  return <NoDataFallback componentName="Multi Promo" />;
};

export const NwnQuickActions: React.FC<MultiPromoProps> = (props) => (
  <MultiPromoNwnQuickActions {...props} />
);

export const NwnCards: React.FC<MultiPromoProps> = (props) => (
  <MultiPromoNwnCards {...props} />
);

// Alias retained for the site-scoped Sitecore variant created for resource cards.
export const NwnResources: React.FC<MultiPromoProps> = (props) => (
  <MultiPromoNwnCards {...props} />
);
