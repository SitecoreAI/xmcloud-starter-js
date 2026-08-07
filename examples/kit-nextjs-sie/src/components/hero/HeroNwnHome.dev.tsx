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
        'nwn-home-hero relative overflow-hidden bg-[#414042] text-white',
        props.params?.styles,
      )}
    >
      {(hasImage || isPageEditing) && (
        <ImageWrapper
          image={fields.image}
          wrapperClass={cn(
            'absolute inset-0 h-full w-full',
            isPageEditing && !hasImage && 'z-10',
          )}
          className="h-full w-full object-cover object-center"
          priority
          sizes="100vw"
          page={props.page}
        />
      )}
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          hasImage
            ? 'bg-[linear-gradient(90deg,rgba(43,38,35,0.94)_0%,rgba(65,64,66,0.72)_48%,rgba(65,64,66,0.16)_100%)]'
            : 'bg-[linear-gradient(135deg,#414042_0%,#6b4a36_100%)]',
        )}
        aria-hidden="true"
      />

      <div className="nwn-content-shell relative z-20 flex min-h-[28rem] items-center py-14 sm:min-h-[32rem] sm:py-16 lg:py-20">
        <div className="max-w-3xl">
          {(isPageEditing || fields.bannerText?.value) && (
            <Text
              tag="p"
              field={fields.bannerText}
              className="mb-4 inline-flex border-l-4 border-primary pl-4 font-heading text-sm font-semibold uppercase tracking-[0.12em] text-[#ffe0c7] sm:text-base"
            />
          )}
          {(isPageEditing || fields.title?.value) && (
            <Text
              tag="h1"
              field={fields.title}
              className="max-w-[15ch] text-balance font-heading text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.04] tracking-[-0.02em] text-white"
            />
          )}
          {(isPageEditing || fields.description?.value) && (
            <Text
              tag="p"
              field={fields.description}
              className="mt-5 max-w-2xl text-pretty text-lg leading-7 text-white/95 sm:text-xl sm:leading-8"
            />
          )}

          {(hasPrimaryLink || hasSecondaryLink) && (
            <div className="mt-8 flex flex-wrap gap-4">
              {hasPrimaryLink && fields.bannerCTA && (
                <ButtonBase
                  buttonLink={fields.bannerCTA}
                  isPageEditing={isPageEditing}
                  variant="tertiary"
                  className="min-h-12 border border-white bg-white px-6 text-base font-semibold text-primary hover:bg-[#fff4eb]"
                  page={props.page}
                />
              )}
              {hasSecondaryLink && fields.searchLink && (
                <ButtonBase
                  buttonLink={fields.searchLink}
                  isPageEditing={isPageEditing}
                  variant="ghost"
                  className="min-h-12 border border-white/80 px-6 text-base font-semibold text-white hover:bg-white/15 hover:text-white"
                  page={props.page}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
