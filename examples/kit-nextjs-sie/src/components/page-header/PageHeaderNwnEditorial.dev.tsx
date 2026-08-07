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

  if (!fields?.data?.datasource) {
    return isPageEditing ? (
      <NoDataFallback componentName="Page Header" />
    ) : null;
  }

  const { imageRequired, link1, link2 } = fields.data?.datasource ?? {};
  const { pageHeaderTitle, pageTitle, pageSubtitle } =
    fields.data?.externalFields ?? {};
  const title = pageHeaderTitle?.jsonValue?.value
    ? pageHeaderTitle.jsonValue
    : pageTitle?.jsonValue;
  const subtitle = pageSubtitle?.jsonValue;
  const hasImage = Boolean(imageRequired?.jsonValue?.value?.src);
  const showImageRegion = isPageEditing || hasImage;
  const hasActions =
    isPageEditing ||
    Boolean(link1?.jsonValue?.value?.href) ||
    Boolean(link2?.jsonValue?.value?.href);

  return (
    <section
      data-component="PageHeader"
      data-variant="NwnEditorial"
      className={cn(
        'nwn-editorial-header overflow-hidden bg-[#eff0f2] text-[#414042]',
        props.params?.styles,
      )}
    >
      <div
        className={cn(
          'nwn-content-shell grid items-stretch',
          showImageRegion && 'lg:min-h-[24rem] lg:grid-cols-[1fr_0.92fr]',
        )}
      >
        <div className="flex items-center py-10 pr-0 sm:py-14 lg:pr-16">
          <div className="max-w-2xl">
            <Text
              tag="h1"
              field={title}
              className="max-w-[15ch] text-balance font-heading text-[clamp(2.25rem,4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#414042]"
            />
            {(isPageEditing || subtitle?.value) && (
              <RichText
                field={subtitle}
                className="mt-5 max-w-[42rem] text-pretty text-base leading-7 text-[#737076] sm:text-lg sm:leading-8"
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
                    className="min-h-12 border border-primary bg-white px-6 text-base text-primary hover:bg-[#fff4eb]"
                    page={props.page}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {showImageRegion && (
          <div className="relative min-h-56 border-t-4 border-primary sm:min-h-64 lg:min-h-full lg:border-l lg:border-t-0 lg:border-[#c4c4c4]">
            <ImageWrapper
              image={imageRequired?.jsonValue}
              wrapperClass="absolute inset-0 h-full w-full"
              className="h-full w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 48vw"
              page={props.page}
            />
            {hasImage && (
              <div
                className="pointer-events-none absolute inset-y-0 left-0 hidden w-20 bg-gradient-to-r from-[#eff0f2] to-transparent lg:block"
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
};
