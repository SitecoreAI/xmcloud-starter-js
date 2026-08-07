'use client';

import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import { ArrowRight } from 'lucide-react';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { getDatasource, getFieldValue } from '@/lib/component-props';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { MultiPromoItemProps, MultiPromoProps } from './multi-promo.props';

export const MultiPromoNwnCards: React.FC<MultiPromoProps> = (props) => {
  const { fields } = props;
  const datasource = getDatasource(fields);

  if (!fields || !datasource) {
    return <NoDataFallback componentName="Multi Promo" />;
  }

  const title = getFieldValue(datasource.title);
  const description = getFieldValue(datasource.description);
  const items = datasource.children?.results ?? [];
  const isPageEditing = props.page.mode.isEditing;
  const isFourColumns = props.params?.numColumns === '4';

  return (
    <section
      data-component="MultiPromo"
      data-variant="NwnCards"
      className={cn(
        'nwn-editorial-cards bg-[#eff0f2] py-12 sm:py-16',
        props.params?.styles,
      )}
    >
      <div className="nwn-content-shell">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          {title && (
            <Text
              tag="h2"
              field={title}
              className="max-w-[15ch] text-balance font-heading text-[clamp(2.125rem,3.5vw,2.75rem)] font-semibold leading-[1.04] text-[#414042]"
            />
          )}
          {description && (
            <RichText
              field={description}
              className="max-w-2xl text-pretty text-base leading-7 text-[#737076] sm:text-lg sm:leading-8"
            />
          )}
        </div>

        {items.length > 0 ? (
          <div
            className={cn('mt-10 grid gap-6 md:grid-cols-2', {
              'xl:grid-cols-4': isFourColumns,
              'lg:grid-cols-3': !isFourColumns,
            })}
          >
            {items.map((item: MultiPromoItemProps, index: number) => {
              const heading = getFieldValue(item.heading);
              const image = getFieldValue(item.image);
              const itemDescription = getFieldValue(item.description);
              const hasImage = isPageEditing || Boolean(image?.value?.src);

              return (
                <article
                  key={'nwn-editorial-card-' + index}
                  className="group flex h-full flex-col overflow-hidden border border-[#c4c4c4] bg-white shadow-[0_4px_14px_rgba(65,64,66,0.07)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(65,64,66,0.14)]"
                >
                  {hasImage && (
                    <ImageWrapper
                      image={image}
                      wrapperClass="aspect-[7/4] w-full overflow-hidden"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes={
                        isFourColumns
                          ? '(max-width: 768px) 100vw, 25vw'
                          : '(max-width: 768px) 100vw, 33vw'
                      }
                      page={props.page}
                    />
                  )}
                  <div className="flex flex-1 flex-col border-t-4 border-primary p-6">
                    {heading && (
                      <Text
                        tag="h3"
                        field={heading}
                        className="font-heading text-2xl font-semibold leading-tight text-[#414042]"
                      />
                    )}
                    {itemDescription && (
                      <RichText
                        field={itemDescription}
                        className="mt-3 text-base leading-7 text-[#737076]"
                      />
                    )}
                    {item.link?.jsonValue && (
                      <div className="mt-auto flex items-center gap-2 pt-6">
                        <EditableButton
                          buttonLink={item.link.jsonValue}
                          isPageEditing={isPageEditing}
                          variant="ghost"
                          className="h-auto justify-start p-0 text-base font-semibold text-primary hover:bg-transparent"
                          page={props.page}
                        />
                        <ArrowRight
                          className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          isPageEditing && (
            <p className="mt-8 border border-dashed border-primary bg-white p-6 text-sm text-[#737076]">
              Add promo items to create SiEnergy editorial cards.
            </p>
          )
        )}
      </div>
    </section>
  );
};
