'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Text, RichText } from '@sitecore-content-sdk/nextjs';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { linkIsValid } from '@/components/button-component/button-component.props';
import { PageHeaderProps } from './page-header.props';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';

export const PageHeaderDefault: React.FC<
  PageHeaderProps & { isPageEditing: boolean }
> = (props) => {
  const { fields, isPageEditing } = props;
  const { imageRequired, link1, link2 } = fields?.data?.datasource || {};
  const { pageHeaderTitle, pageTitle, pageSubtitle } =
    fields?.data?.externalFields || {};

  const title = pageHeaderTitle?.jsonValue?.value
    ? pageHeaderTitle?.jsonValue
    : pageTitle?.jsonValue;
  const subtitle = pageSubtitle?.jsonValue;

  const link1Value = link1?.jsonValue;
  const link2Value = link2?.jsonValue;
  const shouldRenderLink = (link: typeof link1Value) =>
    Boolean(
      link &&
        (isPageEditing
          ? link.value?.text || link.value?.href || link.value?.url
          : Boolean(link.value?.href) && linkIsValid(link)),
    );
  const shouldShowLink1 = shouldRenderLink(link1Value);
  const shouldShowLink2 = shouldRenderLink(link2Value);
  const shouldShowButtons = shouldShowLink1 || shouldShowLink2;
  const hasImage = Boolean(imageRequired?.jsonValue?.value?.src?.trim());
  const shouldShowImage = hasImage || isPageEditing;
  const imageWidth = Number(imageRequired?.jsonValue?.value?.width);
  const imageHeight = Number(imageRequired?.jsonValue?.value?.height);
  const isPortraitImage =
    imageWidth > 0 && imageHeight > 0 && imageHeight > imageWidth;

  const hasPagesPositionStyles: boolean = props?.params?.styles
    ? props?.params?.styles.includes('position-')
    : false;

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (fields) {
    return (
      <section
        data-component="PageHeader"
        data-class-change
        className={cn(
          'bg-background text-foreground group w-full overflow-hidden',
          {
            'position-left': !hasPagesPositionStyles,
            [props?.params?.styles]: props?.params?.styles,
          },
        )}
      >
        <div className="@container/headerwrapper">
          <div className="legal-content-shell @lg/headerwrapper:pb-16 @lg/headerwrapper:pt-20 relative py-12">
            <div
              className={cn('grid grid-cols-1 gap-y-0', {
                '@md/headerwrapper:grid-cols-2 @md/headerwrapper:grid-rows-[17fr_4fr_29fr] gap-x-[10px]':
                  shouldShowImage,
              })}
              data-component-part="page-header-layout"
            >
              {/* Left */}
              <div
                className={cn('@container/headercontent', {
                  '@md/headerwrapper:row-start-1 @md/headerwrapper:row-end-4 @md/headerwrapper:col-start-1 @md/headerwrapper:col-end-2 @md/headerwrapper:mb-0 mb-10':
                    shouldShowImage,
                  'mb-0': !shouldShowImage,
                })}
                data-component-part="page-header-content"
              >
                <AnimatedSection
                  reducedMotion={prefersReducedMotion}
                  isPageEditing={isPageEditing}
                  className="w-full"
                >
                  <Text
                    tag="h1"
                    className="legal-display-heading font-heading @[575px]/headercontent:text-6xl @xs/headercontent:text-5xl relative -ml-[0.04em] max-w-[18ch] text-balance text-left text-4xl font-light tracking-tighter antialiased"
                    field={title}
                  />
                </AnimatedSection>
                {/* Subtitle */}
                {subtitle && (
                  <AnimatedSection
                    reducedMotion={prefersReducedMotion}
                    isPageEditing={isPageEditing}
                  >
                    <RichText
                      className="font-body mt-4 max-w-[50ch] text-pretty leading-tight"
                      field={subtitle}
                    />
                  </AnimatedSection>
                )}
                {shouldShowButtons && (
                  <AnimatedSection
                    reducedMotion={prefersReducedMotion}
                    isPageEditing={isPageEditing}
                  >
                    <div
                      className="mt-9 flex flex-wrap gap-4"
                      data-component-part="page-header-actions"
                    >
                      {shouldShowLink1 && link1Value && (
                        <EditableButton
                          buttonLink={link1Value}
                          variant="default"
                          isPageEditing={isPageEditing}
                        />
                      )}
                      {shouldShowLink2 && link2Value && (
                        <EditableButton
                          buttonLink={link2Value}
                          variant="secondary"
                          isPageEditing={isPageEditing}
                        />
                      )}
                    </div>
                  </AnimatedSection>
                )}
              </div>
              {/* Right */}
              {shouldShowImage && (
                <div
                  className="@md/headerwrapper:row-start-2 @md/headerwrapper:row-end-4 @md/headerwrapper:col-start-2 @md/headerwrapper:col-end-3 @md/headerwrapper:self-end @md/headerwrapper:justify-self-end @md/headerwrapper:mt-auto relative w-full"
                  data-component-part="page-header-image"
                >
                  {/* Image */}
                  <AnimatedSection
                    reducedMotion={prefersReducedMotion}
                    isPageEditing={isPageEditing}
                    className="relative"
                  >
                    <ImageWrapper
                      image={imageRequired?.jsonValue}
                      wrapperClass={cn(
                        'w-full before:block before:w-full',
                        isPortraitImage
                          ? 'aspect-[4/5] before:aspect-[4/5]'
                          : 'aspect-[30/19] before:aspect-[30/19]',
                      )}
                      className={cn(
                        'absolute inset-0 h-full w-full object-cover',
                        isPortraitImage
                          ? 'aspect-[4/5] object-top'
                          : 'aspect-[30/19]',
                      )}
                      page={props.page}
                    />
                  </AnimatedSection>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <NoDataFallback componentName="PageHeader" />;
};
