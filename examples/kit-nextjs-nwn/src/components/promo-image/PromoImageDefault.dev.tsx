import { Text, RichText } from '@sitecore-content-sdk/nextjs';
import { ButtonBase as Button } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { PromoImageProps } from './promo-image.props';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { useMatchMedia } from '@/hooks/use-match-media';

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
    const hasImage = Boolean(image?.value?.src);
    const showImage = isPageEditing || hasImage;
    const hasLink = isPageEditing || Boolean(link?.value?.href);

    return (
      <section
        data-component="Promo Image"
        data-variant="Default"
        className="@container border-b-2 border-t-2 bg-[#173c47] [.border-b-2+&]:border-t-0"
      >
        <div className="@md:min-h-[620px] relative min-h-[420px] w-full overflow-hidden ">
          {showImage && (
            <div
              className={
                isPageEditing && !hasImage
                  ? 'absolute inset-0 z-10 h-full w-full'
                  : 'absolute inset-0 h-full w-full'
              }
            >
              <ImageWrapper
                image={image}
                className="h-full w-full object-cover"
                wrapperClass="w-full h-full"
                page={props.page}
              />
              {hasImage && (
                <div
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.74)_0%,rgba(0,0,0,0.46)_52%,rgba(0,0,0,0.18)_100%)] shadow-[inset_0_0_100px_rgba(0,0,0,0.65)]"
                  aria-hidden="true"
                />
              )}
            </div>
          )}
          {!hasImage && (
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#173c47_0%,#0f6276_100%)]"
              aria-hidden="true"
            />
          )}

          <div className="@xs:pl-8 @sm:pl-12 @md:pl-16 @lg:pl-[118px] @xs:pr-6 @sm:pr-12 @md:py-16 relative z-20 mx-auto flex h-full w-full max-w-screen-xl flex-col justify-center px-4 py-24">
            <div className="@xs:max-w-[90%] @sm:max-w-[80%] @md:max-w-[60%] @lg:max-w-[50%]">
              {(isPageEditing || heading?.value) && (
                <AnimatedSection
                  direction="right"
                  isPageEditing={isPageEditing}
                  reducedMotion={prefersReducedMotion}
                  duration={500}
                >
                  <Text
                    tag="h2"
                    className="font-heading @xs:text-3xl @sm:text-4xl @lg:text-5xl text-primary-foreground text-pretty text-2xl"
                    field={heading}
                  />
                </AnimatedSection>
              )}

              {(isPageEditing || description?.value) && (
                <AnimatedSection
                  direction="right"
                  isPageEditing={isPageEditing}
                  reducedMotion={prefersReducedMotion}
                  delay={125}
                  duration={500}
                >
                  <RichText
                    className="text-body text-primary-foreground @xs:text-lg @md:text-xl mt-6 max-w-[51.5ch] font-normal tracking-tight antialiased"
                    field={description}
                  />
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
                      buttonLink={link}
                      isPageEditing={isPageEditing}
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
