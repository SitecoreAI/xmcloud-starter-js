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
import { getDatasource, getFieldValue } from '@/lib/component-props';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { MultiPromoItemProps, MultiPromoProps } from './multi-promo.props';
import { Default as MultiPromoItem } from './MultiPromoItem.dev';

export const Default: React.FC<MultiPromoProps> = (props) => {
  const { fields, params, page } = props;
  const { numColumns } = params ?? {};
  const datasource = getDatasource(fields);
  const { children, title, description } = datasource || {};
  const titleField = getFieldValue(title);
  const descriptionField = getFieldValue(description);
  const [api, setApi] = useState<CarouselApi>();
  const [announcement, setAnnouncement] = useState('');
  const carouselRef = useRef<HTMLDivElement>(null);
  const isPageEditing = page.mode.isEditing;
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
    const hasPagesPositionStyles: boolean = props?.params?.styles
      ? props?.params?.styles.includes('position-')
      : false;
    const presentation = params?.slbPresentation;
    const isCardGrid = presentation === 'card-grid';
    const isDarkRail = presentation === 'content-rail';
    const isRelated = presentation === 'related';
    const isSlbEditorial = isCardGrid || isDarkRail || isRelated;
    const sectionHeader = (
      <div className="flex flex-col gap-4 group-[.is-inset]:px-4 sm:group-[.is-inset]:px-0 xl:flex-row xl:items-end xl:justify-between xl:gap-20">
        {titleField && (
          <div className="basis-full xl:basis-1/2">
            {isSlbEditorial && (
              <p
                className={cn(
                  'mb-5 font-heading text-xs font-bold uppercase tracking-[0.16em]',
                  isDarkRail || isRelated ? 'text-accent' : 'text-primary',
                )}
              >
                SLB
              </p>
            )}
            <Text
              tag="h2"
              field={titleField}
              className={cn(
                'font-heading text-box-trim-both text-box-edge-asc-baseline -ml-1 max-w-[20ch] text-pretty text-4xl font-normal leading-[1.1333] tracking-tighter sm:text-5xl md:max-w-[17.5ch] lg:text-6xl',
                (isDarkRail || isRelated) && 'text-white',
              )}
            />
          </div>
        )}
        {descriptionField?.value && (
          <div className="basis-full xl:basis-1/2">
            <RichText
              className={cn(
                'text-body prose text-box-trim-both text-box-edge-asc-baseline mt-6 max-w-[51.5ch] text-pretty text-lg leading-[1.444] tracking-tight',
                isDarkRail || isRelated
                  ? 'text-[#dfe5ff] [&_p]:text-[#dfe5ff]'
                  : 'text-foreground/75',
              )}
              field={descriptionField}
            />
          </div>
        )}
      </div>
    );

    if (isSlbEditorial) {
      return (
        <section
          id={params?.RenderingIdentifier || undefined}
          data-component="MultiPromoCarousel"
          data-layout={presentation}
          data-class-change
          className={cn(
            isDarkRail || isRelated
              ? 'bg-dark text-dark-foreground'
              : 'bg-white text-dark',
            props?.params?.styles,
          )}
        >
          <div className="slb-page-shell slb-section-space">
            {sectionHeader}
            {children && (
              <div
                className={cn('mt-12 sm:mt-16', {
                  'grid grid-cols-1 border-l border-t border-[#cbd3ef] sm:grid-cols-2 xl:grid-cols-4':
                    isCardGrid,
                  'grid grid-cols-1 gap-8 md:grid-cols-3': isDarkRail,
                  'grid grid-cols-1 border-t border-white/20 md:grid-cols-2 md:gap-x-8 xl:grid-cols-4 xl:gap-x-12':
                    isRelated,
                })}
              >
                {children.results.map(
                  (item: MultiPromoItemProps, index: number) => (
                    <MultiPromoItem
                      key={index}
                      isPageEditing={isPageEditing}
                      itemNumber={index + 1}
                      presentation={presentation}
                      {...item}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      );
    }

    return (
      <div
        id={params?.RenderingIdentifier || undefined}
        data-component="MultiPromoCarousel"
        data-class-change
        className={cn(
          'slb-page-shell slb-section-space group-[.has-bg:not(.is-inset)]:py-4 group-[.has-bg.is-inset]:px-0 md:group-[.has-bg:not(.is-inset)]:py-0',
          {
            'position-left': !hasPagesPositionStyles,
            [props?.params?.styles]: props?.params?.styles,
          },
        )}
      >
        {sectionHeader}
        {children && (
          <>
            <Carousel
              setApi={setApi}
              opts={{
                align: 'center',
                breakpoints: {
                  '(min-width: 640px)': { align: 'start' },
                },
                loop: true,
                skipSnaps: true,
              }}
              className="relative -ml-4 -mr-4 overflow-hidden sm:ml-0 sm:group-[.is-inset]:-mr-8 md:group-[.is-inset]:-mr-16 xl:-mr-0 xl:group-[.is-inset]:-mr-16
              2xl:group-[.is-inset]:-mr-24"
              ref={carouselRef}
              aria-label={titleField?.value || 'Featured content'}
            >
              <CarouselContent className="my-12 ml-0 border-l border-t border-border last:mb-0 sm:my-16 sm:ml-0">
                {children?.results?.map(
                  (item: MultiPromoItemProps, index: number) => (
                    <CarouselItem
                      key={index}
                      className={cn(
                        'min-w-[238px] max-w-[416px] basis-3/4 pl-0 transition-opacity duration-300 sm:basis-[45%] sm:pl-0 md:basis-[31%]',
                        {
                          [`lg:basis-[31%]`]: numColumns === '3',
                          [`xl:basis-[23%]`]: numColumns === '4',
                        },
                      )}
                    >
                      <MultiPromoItem
                        key={index}
                        isPageEditing={isPageEditing}
                        {...item}
                      />
                    </CarouselItem>
                  ),
                )}
              </CarouselContent>
            </Carousel>
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {announcement}
            </div>
          </>
        )}
      </div>
    );
  }

  return <NoDataFallback componentName="Multi Promo" />;
};
