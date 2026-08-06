'use client';

import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import {
  CreditCard,
  House,
  ShieldCheck,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { getDatasource, getFieldValue } from '@/lib/component-props';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { MultiPromoItemProps, MultiPromoProps } from './multi-promo.props';

const quickActionIcons = [CreditCard, House, ShieldCheck, Wrench];

export const MultiPromoNwnQuickActions: React.FC<MultiPromoProps> = (props) => {
  const { fields } = props;
  const datasource = getDatasource(fields);

  if (!fields || !datasource) {
    return <NoDataFallback componentName="Multi Promo" />;
  }

  const title = getFieldValue(datasource.title);
  const description = getFieldValue(datasource.description);
  const items = datasource.children?.results ?? [];
  const isPageEditing = props.page.mode.isEditing;

  return (
    <section
      data-component="MultiPromo"
      data-variant="NwnQuickActions"
      className="nwn-quick-actions relative z-20 -mt-14 pb-10 sm:-mt-20 sm:pb-14"
      aria-label="Customer quick actions"
    >
      <div className="nwn-content-shell">
        {(title || description) && (
          <div className="mb-6 rounded-t bg-white px-6 pt-6 shadow-[0_12px_24px_rgba(0,0,0,0.08)] sm:px-8">
            {title && (
              <Text
                tag="h2"
                field={title}
                className="font-heading text-3xl font-semibold text-slate-900"
              />
            )}
            {description && (
              <RichText
                field={description}
                className="mt-2 max-w-3xl text-base leading-7 text-slate-600"
              />
            )}
          </div>
        )}

        {items.length > 0 ? (
          <div className="grid overflow-hidden rounded bg-white shadow-[0_12px_24px_rgba(0,0,0,0.10)] md:grid-cols-2 lg:grid-cols-4">
            {items.map((item: MultiPromoItemProps, index: number) => {
              const heading = getFieldValue(item.heading);
              const itemDescription = getFieldValue(item.description);
              const Icon = quickActionIcons[index % quickActionIcons.length];

              return (
                <article
                  key={'nwn-quick-action-' + index}
                  className="group relative border-b border-slate-200 p-6 transition-colors hover:bg-cyan-50 md:border-r lg:border-b-0 lg:p-7 lg:last:border-r-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e4f4f7] text-primary">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <ArrowRight
                      className="mt-2 h-5 w-5 text-primary transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                  {heading && (
                    <Text
                      tag="h3"
                      field={heading}
                      className="mt-5 font-heading text-2xl font-semibold leading-tight text-primary"
                    />
                  )}
                  {itemDescription && (
                    <RichText
                      field={itemDescription}
                      className="mt-3 text-sm leading-6 text-slate-600"
                    />
                  )}
                  {item.link?.jsonValue && (
                    <EditableButton
                      buttonLink={item.link.jsonValue}
                      isPageEditing={isPageEditing}
                      variant="ghost"
                      className="mt-4 h-auto justify-start p-0 text-sm font-semibold text-primary hover:bg-transparent"
                      page={props.page}
                    />
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          isPageEditing && (
            <p className="rounded border border-dashed border-primary bg-white p-6 text-sm text-slate-600">
              Add promo items to create NW Natural quick-action cards.
            </p>
          )
        )}
      </div>
    </section>
  );
};
