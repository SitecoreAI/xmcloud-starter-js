import { Text } from '@sitecore-content-sdk/nextjs';
import { ButtonBase } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { HeroProps } from './hero.props';

export const HeroNwnHome: React.FC<HeroProps> = (props) => {
  const { fields, isPageEditing } = props;

  if (!fields) {
    return isPageEditing ? <NoDataFallback componentName="Hero" /> : null;
  }

  const hasImage = Boolean(fields.image?.value?.src);
  const showImagePanel = hasImage || isPageEditing;
  const hasPrimaryLink = Boolean(
    fields.bannerCTA && (isPageEditing || fields.bannerCTA.value?.href),
  );
  const hasSecondaryLink = Boolean(
    fields.searchLink && (isPageEditing || fields.searchLink.value?.href),
  );

  return (
    <section
      data-component="Hero"
      data-variant="NwnHome"
      className={cn(
        'nwn-home-hero overflow-hidden bg-primary text-white',
        props.params?.styles,
      )}
    >
      <div
        className={cn(
          'grid w-full bg-primary',
          showImagePanel && 'lg:grid-cols-2',
        )}
      >
        <div className="flex min-h-[24rem] items-center bg-primary px-6 py-12 sm:min-h-[28rem] sm:px-10 sm:py-16 lg:min-h-[32rem] lg:px-14 lg:py-20 xl:px-20 2xl:pl-24">
          <div className="w-full max-w-[42rem]">
            {(isPageEditing || fields.bannerText?.value) && (
              <Text
                tag="p"
                field={fields.bannerText}
                className="mb-4 inline-flex border-l-4 border-[#2b2623]/70 pl-4 font-heading text-sm font-semibold uppercase tracking-[0.12em] text-[#2b2623] sm:text-base"
              />
            )}
            {(isPageEditing || fields.title?.value) && (
              <Text
                tag="h1"
                field={fields.title}
                className="max-w-[15ch] text-balance font-heading text-[clamp(2.75rem,4.5vw,4.25rem)] font-semibold leading-[1.06] tracking-[-0.025em] text-white"
              />
            )}
            {(isPageEditing || fields.description?.value) && (
              <Text
                tag="p"
                field={fields.description}
                className="mt-5 max-w-[34rem] text-pretty text-xl font-semibold leading-8 text-[#2b2623]"
              />
            )}

            {(hasPrimaryLink || hasSecondaryLink) && (
              <div className="mt-8 flex flex-wrap gap-4">
                {hasPrimaryLink && fields.bannerCTA && (
                  <ButtonBase
                    buttonLink={fields.bannerCTA}
                    isPageEditing={isPageEditing}
                    variant="tertiary"
                    className="min-h-12 border border-[#414042] bg-[#414042] px-6 text-base font-semibold text-white hover:bg-[#2f2e30] hover:text-white"
                    page={props.page}
                  />
                )}
                {hasSecondaryLink && fields.searchLink && (
                  <ButtonBase
                    buttonLink={fields.searchLink}
                    isPageEditing={isPageEditing}
                    variant="ghost"
                    className="min-h-12 border border-[#2b2623] px-6 text-base font-semibold text-[#2b2623] hover:bg-[#414042] hover:text-white"
                    page={props.page}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {showImagePanel && (
          <ImageWrapper
            image={fields.image}
            wrapperClass={cn(
              'relative min-h-[18rem] overflow-hidden bg-[#eff0f2] sm:min-h-[24rem] lg:min-h-[32rem]',
              isPageEditing && !hasImage && 'z-10',
            )}
            className="absolute inset-0 h-full w-full object-cover object-center"
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            page={props.page}
          />
        )}
      </div>
    </section>
  );
};
