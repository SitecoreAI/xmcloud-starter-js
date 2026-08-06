'use client';

import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { PageHeaderProps } from './page-header.props';

export const PageHeaderNwnEditorial: React.FC<
  PageHeaderProps & { isPageEditing: boolean }
> = (props) => {
  const { fields, isPageEditing } = props;

  if (!fields) {
    return <NoDataFallback componentName="Page Header" />;
  }

  const { imageRequired, link1, link2 } = fields.data?.datasource ?? {};
  const { pageHeaderTitle, pageTitle, pageSubtitle } =
    fields.data?.externalFields ?? {};
  const title = pageHeaderTitle?.jsonValue?.value
    ? pageHeaderTitle.jsonValue
    : pageTitle?.jsonValue;
  const subtitle = pageSubtitle?.jsonValue;
  const hasImage =
    isPageEditing || Boolean(imageRequired?.jsonValue?.value?.src);
  const hasActions =
    isPageEditing ||
    Boolean(link1?.jsonValue?.value?.href) ||
    Boolean(link2?.jsonValue?.value?.href);

  return (
    <section
      data-component="PageHeader"
      data-variant="NwnEditorial"
      className={cn(
        'nwn-editorial-header overflow-hidden bg-[#f4f5f7] text-slate-900',
        props.params?.styles,
      )}
    >
      <div className="nwn-content-shell grid min-h-[28rem] items-stretch lg:grid-cols-[1fr_0.92fr]">
        <div className="flex items-center py-14 pr-0 sm:py-20 lg:pr-16">
          <div className="max-w-2xl">
            <p className="mb-5 border-l-4 border-cyan-500 pl-4 font-heading text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              NW Natural
            </p>
            <Text
              tag="h1"
              field={title}
              className="max-w-[14ch] text-balance font-heading text-[clamp(3rem,6vw,4.5rem)] font-medium leading-[1.02] tracking-[-0.025em] text-slate-900"
            />
            {subtitle && (
              <RichText
                field={subtitle}
                className="mt-6 max-w-[42rem] text-pretty text-lg leading-8 text-slate-700 sm:text-xl"
              />
            )}
            {hasActions && (
              <div className="mt-8 flex flex-wrap gap-4">
                {link1?.jsonValue && (
                  <EditableButton
                    buttonLink={link1.jsonValue}
                    isPageEditing={isPageEditing}
                    variant="default"
                    className="min-h-12 px-6 text-base"
                    page={props.page}
                  />
                )}
                {link2?.jsonValue && (
                  <EditableButton
                    buttonLink={link2.jsonValue}
                    isPageEditing={isPageEditing}
                    variant="tertiary"
                    className="min-h-12 border border-primary bg-white px-6 text-base text-primary hover:bg-cyan-50"
                    page={props.page}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative min-h-72 border-t-4 border-cyan-500 lg:min-h-full lg:border-l lg:border-t-0 lg:border-slate-300">
          {hasImage ? (
            <ImageWrapper
              image={imageRequired?.jsonValue}
              wrapperClass="absolute inset-0 h-full w-full"
              className="h-full w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 48vw"
              page={props.page}
            />
          ) : (
            <div
              className="absolute inset-0 bg-[linear-gradient(135deg,#e4f4f7_0%,#a7dce7_100%)]"
              aria-hidden="true"
            />
          )}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 hidden w-20 bg-gradient-to-r from-[#f4f5f7] to-transparent lg:block"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
};
