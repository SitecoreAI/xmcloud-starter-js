import type { ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import { Text, RichText } from '@sitecore-content-sdk/nextjs';
import { ButtonBase as Button } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { PromoImageProps } from './promo-image.props';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { useMatchMedia } from '@/hooks/use-match-media';
import { nwnImageSources } from '@/lib/nwn-static-assets';

const nwnCompanyStoryImage: ImageField = {
  value: {
    src: nwnImageSources.communityTreePlanting,
    alt: 'NW Natural volunteers planting trees with community members',
    width: '1400',
    height: '900',
  },
};

const nwnHomeComfortImage: ImageField = {
  value: {
    src: nwnImageSources.rebatesFurnace,
    alt: 'High-efficiency natural gas furnace installed in a home',
    width: '1400',
    height: '900',
  },
};

const nwnCompanyStoryLink: LinkField = {
  value: {
    href: '/about-us/company-overview',
    text: 'Get to know NW Natural',
    linktype: 'internal',
  },
};

const isLegacyStarterContent = (value: unknown): boolean =>
  Boolean(
    typeof value === 'string' &&
      value &&
      /alaris|aero|nexa|terra|ambulance|fire truck|emergency vehicle|rescue vehicle|vehicle|automotive|fire suppression|test drive|test-drive|journey|precision/i.test(
        value,
      ),
  );

export const PromoImageDefault: React.FC<PromoImageProps> = (props) => {
  const { fields, isPageEditing } = props;
  const prefersReducedMotion = useMatchMedia(
    '(prefers-reduced-motion: reduce)',
  );
  const hasAuthoredContent = Boolean(
    fields?.image?.value?.src ||
      fields?.heading?.value ||
      fields?.description?.value ||
      fields?.link?.value?.href ||
      fields?.link?.value?.text,
  );

  if (fields && (isPageEditing || hasAuthoredContent)) {
    const { image, heading, description, link } = fields;
    const usePresentationFallbacks = !isPageEditing;
    const useFallbackImage =
      usePresentationFallbacks &&
      (isLegacyStarterContent(image?.value?.src) ||
        isLegacyStarterContent(image?.value?.alt));
    const useFallbackHeading =
      usePresentationFallbacks && isLegacyStarterContent(heading?.value);
    const useFallbackDescription =
      usePresentationFallbacks && isLegacyStarterContent(description?.value);
    const useFallbackLink =
      usePresentationFallbacks &&
      (isLegacyStarterContent(link?.value?.href) ||
        isLegacyStarterContent(link?.value?.text) ||
        (!link?.value?.href &&
          (useFallbackImage || useFallbackHeading || useFallbackDescription)));
    const hasLegacyStarterContent =
      useFallbackImage ||
      useFallbackHeading ||
      useFallbackDescription ||
      useFallbackLink;
    const displayImage = hasLegacyStarterContent
      ? nwnCompanyStoryImage
      : usePresentationFallbacks && !image?.value?.src
        ? nwnHomeComfortImage
        : image;
    const displayLink = useFallbackLink ? nwnCompanyStoryLink : link;
    const hasLink = isPageEditing || displayLink?.value?.href;

    return (
      <section
        data-component="Promo Image"
        data-variant={hasLegacyStarterContent ? 'NwnCompanyStory' : 'Default'}
        className="@container border-b-2 border-t-2 [.border-b-2+&]:border-t-0"
      >
        <div className="@md:min-h-[620px] relative min-h-[420px] w-full overflow-hidden ">
          {displayImage && (
            <div className="absolute inset-0 h-full w-full">
              <ImageWrapper
                image={displayImage}
                className="h-full w-full object-cover"
                wrapperClass="w-full h-full"
                page={props.page}
              />
              {/* Vignette effect overlay */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)',
                  background:
                    'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)',
                }}
              ></div>
            </div>
          )}

          <div className="@xs:pl-8 @sm:pl-12 @md:pl-16 @lg:pl-[118px] @xs:pr-6 @sm:pr-12 @md:py-16 relative z-10 mx-auto flex h-full w-full max-w-screen-xl flex-col justify-center px-4 py-24">
            <div className="@xs:max-w-[90%] @sm:max-w-[80%] @md:max-w-[60%] @lg:max-w-[50%]">
              {(isPageEditing || heading || hasLegacyStarterContent) && (
                <AnimatedSection
                  direction="right"
                  isPageEditing={isPageEditing}
                  reducedMotion={prefersReducedMotion}
                  duration={500}
                >
                  {hasLegacyStarterContent ? (
                    <div>
                      <p className="mb-4 font-heading text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
                        Here for the Northwest
                      </p>
                      <h2 className="font-heading @xs:text-3xl @sm:text-4xl @lg:text-5xl text-primary-foreground text-pretty text-2xl">
                        Rooted in the communities we serve.
                      </h2>
                    </div>
                  ) : (
                    <Text
                      tag="h2"
                      className="font-heading @xs:text-3xl @sm:text-4xl @lg:text-5xl text-primary-foreground text-pretty text-2xl"
                      field={heading}
                    />
                  )}
                </AnimatedSection>
              )}

              {(isPageEditing || description || hasLegacyStarterContent) && (
                <AnimatedSection
                  direction="right"
                  isPageEditing={isPageEditing}
                  reducedMotion={prefersReducedMotion}
                  delay={125}
                  duration={500}
                >
                  {hasLegacyStarterContent ? (
                    <p className="text-body text-primary-foreground @xs:text-lg @md:text-xl mt-6 max-w-[51.5ch] font-normal leading-8 tracking-tight antialiased">
                      For more than 160 years, NW Natural has helped homes and
                      businesses across Oregon and southwest Washington stay
                      comfortable while investing in resilient communities and a
                      lower-carbon energy future.
                    </p>
                  ) : (
                    <RichText
                      className="text-body text-primary-foreground @xs:text-lg @md:text-xl mt-6 max-w-[51.5ch] font-normal tracking-tight antialiased"
                      field={description}
                    />
                  )}
                </AnimatedSection>
              )}

              {hasLink && (
                <AnimatedSection
                  direction="right"
                  isPageEditing={isPageEditing}
                  reducedMotion={prefersReducedMotion}
                  delay={250}
                  duration={500}
                >
                  <div className="mt-8">
                    <Button
                      buttonLink={displayLink}
                      isPageEditing={isPageEditing && !hasLegacyStarterContent}
                      variant={hasLegacyStarterContent ? 'tertiary' : undefined}
                      className={
                        hasLegacyStarterContent
                          ? 'min-h-12 border border-white bg-white px-6 text-base font-semibold text-primary hover:bg-cyan-50'
                          : undefined
                      }
                    ></Button>
                  </div>
                </AnimatedSection>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return isPageEditing ? <NoDataFallback componentName="Promo Image" /> : null;
};
