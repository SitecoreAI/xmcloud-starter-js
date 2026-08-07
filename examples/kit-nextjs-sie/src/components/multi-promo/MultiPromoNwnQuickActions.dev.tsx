'use client';

import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import { ReceiptText, Settings, Phone, House } from 'lucide-react';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { getDatasource, getFieldValue } from '@/lib/component-props';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { MultiPromoItemProps, MultiPromoProps } from './multi-promo.props';

const quickActionIcons = [ReceiptText, Settings, Phone, House];

export const MultiPromoNwnQuickActions: React.FC<MultiPromoProps> = (props) => {
  const { fields } = props;
  const datasource = getDatasource(fields);

  if (!fields || !datasource) {
    return <NoDataFallback componentName="Multi Promo" />;
  }

  const title = getFieldValue(datasource.title);
  const description = getFieldValue(datasource.description);
  const items = datasource.children?.results ?? [];
  const desktopGridClass =
    items.length === 1
      ? 'lg:grid-cols-1'
      : items.length === 2
        ? 'lg:grid-cols-2'
        : items.length === 3
          ? 'lg:grid-cols-[0.9fr_1fr_1.6fr]'
          : 'lg:grid-cols-4';
  const isPageEditing = props.page.mode.isEditing;

  return (
    <section
      data-component="MultiPromo"
      data-variant="NwnQuickActions"
      className="nwn-quick-actions relative z-30 -mt-14 pb-12 pt-0 sm:-mt-20 sm:pb-16"
      aria-label="Customer quick actions"
    >
      <div className="nwn-content-shell">
        {(title || description) && (
          <div className="mb-6 rounded-t bg-white px-6 pt-6 shadow-[0_12px_24px_rgba(0,0,0,0.08)] sm:px-8">
            {title && (
              <Text
                tag="h2"
                field={title}
                className="font-heading text-[1.75rem] font-semibold text-[#414042]"
              />
            )}
            {description && (
              <RichText
                field={description}
                className="mt-2 max-w-3xl text-base leading-7 text-[#737076]"
              />
            )}
          </div>
        )}

        {items.length > 0 ? (
          <div
            className={cn(
              'grid overflow-hidden rounded-sm bg-white shadow-[0_14px_32px_rgba(65,64,66,0.18)] md:grid-cols-2',
              desktopGridClass,
            )}
          >
            {items.map((item: MultiPromoItemProps, index: number) => {
              const heading = getFieldValue(item.heading);
              const itemDescription = getFieldValue(item.description);
              const Icon = quickActionIcons[index % quickActionIcons.length];

              return (
                <article
                  key={'nwn-quick-action-' + index}
                  className="group relative flex gap-4 border-b border-[#d7d6d7] p-6 transition-colors hover:bg-[#fff4eb] md:odd:border-r lg:border-b-0 lg:border-r lg:p-7 lg:last:border-r-0"
                >
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center text-primary">
                    <Icon className="h-10 w-10" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    {heading && (
                      <Text
                        tag="h3"
                        field={heading}
                        className="font-heading text-2xl font-semibold leading-tight text-primary"
                      />
                    )}
                    {itemDescription && (
                      <RichText
                        field={itemDescription}
                        className="mt-1 text-base leading-7 text-[#737076]"
                      />
                    )}
                    {item.link?.jsonValue && (
                      <EditableButton
                        buttonLink={item.link.jsonValue}
                        isPageEditing={isPageEditing}
                        variant="ghost"
                        className="mt-2 min-h-10 justify-start p-0 text-base font-semibold text-primary hover:bg-transparent hover:text-primary-hover"
                        page={props.page}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          isPageEditing && (
            <p className="rounded border border-dashed border-primary bg-white p-6 text-sm text-[#737076]">
              Add promo items to create SiEnergy quick-action cards.
            </p>
          )
        )}
      </div>
    </section>
  );
};
