'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import {
  Image as SitecoreImage,
  RichText,
  Text,
  type Field,
} from '@sitecore-content-sdk/nextjs';
import { cn } from '@/lib/utils';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { linkIsValid } from '@/components/button-component/button-component.props';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { PageHeaderProps } from './page-header.props';

export const PageHeaderLawyerProfile: React.FC<
  PageHeaderProps & { isPageEditing: boolean }
> = (props) => {
  const { fields, isPageEditing } = props;
  const { imageRequired, link1, link2 } = fields?.data?.datasource || {};
  const { pageHeaderTitle, pageTitle, pageSubtitle, pageSummary } =
    fields?.data?.externalFields || {};
  const routeFields = props.page.layout.sitecore.route?.fields as
    | Record<string, Field<string>>
    | undefined;

  const title = pageHeaderTitle?.jsonValue?.value
    ? pageHeaderTitle.jsonValue
    : pageTitle?.jsonValue;
  const subtitle = pageSubtitle?.jsonValue;
  const overview = pageSummary?.jsonValue ?? routeFields?.pageSummary;
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
  const shouldShowOverview = Boolean(overview?.value || isPageEditing);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (!fields) {
    return <NoDataFallback componentName="PageHeader" />;
  }

  const EmptyLawyerPortrait = ({ className }: { className?: string }) => (
    <div
      className={cn(
        className,
        'flex items-center justify-center bg-muted text-muted-foreground',
      )}
    >
      <SitecoreImage
        field={imageRequired?.jsonValue}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <span className="bg-background/90 pointer-events-none relative z-20 px-5 py-3 text-sm font-medium">
        Choose a lawyer portrait
      </span>
    </div>
  );

  const renderOverview = (
    className: string,
    componentPart: string,
  ): React.ReactNode => {
    if (!shouldShowOverview && !shouldShowButtons) {
      return null;
    }

    return (
      <div className={className} data-component-part={componentPart}>
        {shouldShowOverview && (
          <AnimatedSection
            reducedMotion={prefersReducedMotion}
            isPageEditing={isPageEditing}
          >
            <Text
              tag="p"
              className="font-body max-w-[50ch] text-pretty text-base leading-relaxed"
              field={overview}
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
    );
  };

  return (
    <section
      data-component="PageHeader"
      data-page-header-variant="lawyer-profile"
      className="bg-background text-foreground group w-full overflow-hidden"
    >
      <div className="@container/headerwrapper">
        <div className="legal-content-shell @3xl/headerwrapper:pb-16 @3xl/headerwrapper:pt-20 relative py-12">
          <div
            className={cn('grid grid-cols-1 gap-y-8', {
              '@3xl/headerwrapper:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] @3xl/headerwrapper:items-start @3xl/headerwrapper:gap-x-[clamp(2.5rem,7vw,7rem)] @3xl/headerwrapper:gap-y-0':
                shouldShowImage,
            })}
            data-component-part="page-header-layout"
          >
            <div
              className="@container/headercontent order-1 @3xl/headerwrapper:col-start-1 @3xl/headerwrapper:row-start-1"
              data-component-part="lawyer-profile-identity"
            >
              <AnimatedSection
                reducedMotion={prefersReducedMotion}
                isPageEditing={isPageEditing}
                className="w-full"
              >
                <Text
                  tag="h1"
                  className="legal-display-heading font-heading @xs/headercontent:text-5xl @[575px]/headercontent:text-6xl relative -ml-[0.04em] max-w-[18ch] text-balance text-left text-4xl font-light tracking-tighter antialiased"
                  field={title}
                />
              </AnimatedSection>

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

              {renderOverview(
                'mt-10 hidden @3xl/headerwrapper:block',
                'lawyer-profile-overview-desktop',
              )}
            </div>

            {shouldShowImage && (
              <div
                className="order-2 @3xl/headerwrapper:col-start-2 @3xl/headerwrapper:row-start-1 @3xl/headerwrapper:self-start relative w-full"
                data-component-part="page-header-image"
              >
                <AnimatedSection
                  reducedMotion={prefersReducedMotion}
                  isPageEditing={isPageEditing}
                  className="relative"
                >
                  <ImageWrapper
                    image={imageRequired?.jsonValue}
                    wrapperClass="aspect-[4/5] w-full before:block before:aspect-[4/5] before:w-full"
                    className="absolute inset-0 h-full w-full aspect-[4/5] object-cover object-top"
                    emptyFieldEditingComponent={EmptyLawyerPortrait}
                    priority={true}
                    sizes="(min-width: 768px) 55vw, 100vw"
                    page={props.page}
                  />
                </AnimatedSection>
              </div>
            )}

            {renderOverview(
              'order-3 @3xl/headerwrapper:hidden',
              'lawyer-profile-overview-mobile',
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
