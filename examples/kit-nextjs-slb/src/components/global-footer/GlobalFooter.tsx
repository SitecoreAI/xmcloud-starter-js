import type React from 'react';
import { Text, AppPlaceholder } from '@sitecore-content-sdk/nextjs';
import { GlobalFooterProps } from '@/components/global-footer/global-footer.props';
import { Default as FooterCallout } from '@/components/footer-navigation-callout/FooterNavigationCallout.dev';
import { Default as Logo } from '@/components/logo/Logo.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { EditableImageButton } from '@/components/button-component/ButtonComponent';
import { cn } from '@/lib/utils';
import componentMap from '.sitecore/component-map';
import { getDatasource, getFieldValue } from '@/lib/component-props';

export const Default: React.FC<GlobalFooterProps> = (props) => {
  const { fields, rendering, page } = props;
  const isPageEditing = page.mode.isEditing;
  const datasource = getDatasource(fields);

  const {
    footerCopyright,
    footerLogo,
    footerPromoDescription,
    footerPromoLink,
    footerPromoTitle,
    footerSocialLinks,
  } = datasource ?? {};
  const footerCopyrightField = getFieldValue(footerCopyright);
  const footerLogoField = getFieldValue(footerLogo);
  const footerPromoTitleField = getFieldValue(footerPromoTitle);
  const footerPromoDescriptionField = getFieldValue(footerPromoDescription);
  const footerPromoLinkField = getFieldValue(footerPromoLink);

  if (fields) {
    return (
      <footer className="@container bg-dark text-white">
        <div className="slb-page-shell @md:grid-cols-2 @lg:grid-cols-12 @lg:gap-10 grid grid-cols-1 gap-12 py-16 @lg:py-20">
          {/* Logo section */}
          <div className="@lg:col-span-2">
            <div className="flex w-[152px] min-h-[72px] items-center bg-white p-4">
              {footerLogoField?.value?.src ? (
                <Logo logo={footerLogoField} />
              ) : (
                // Approved positive master shown on white when no Sitecore logo is authored.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/images/slb/slb-logo-positive-blue.svg"
                  alt="SLB"
                  className="h-auto w-full"
                  data-testid="slb-footer-logo-fallback"
                />
              )}
            </div>
          </div>
          {/* Main footer columns */}
          <div className="@md:grid-cols-3 @md:col-span-2 @lg:col-span-6 grid grid-cols-1 gap-8">
            <AppPlaceholder
              name="container-footer-column"
              rendering={rendering}
              page={page}
              componentMap={componentMap}
            />
          </div>
          {/* Callout section */}
          <div className="@md:col-span-2 @lg:col-span-4">
            <FooterCallout
              fields={{
                title: footerPromoTitleField,
                description: footerPromoDescriptionField,
                linkOptional: footerPromoLinkField,
              }}
            />
          </div>
        </div>
        <div className="border-t border-white/20">
          <div className="global-footer__bottom slb-page-shell @md:flex-row @md:items-center flex flex-col items-start justify-between gap-6 py-6">
            {/* Social links */}
            <div className="flex space-x-4">
              {footerSocialLinks?.results?.map((socialLink, index) => {
                const socialLinkField = getFieldValue(socialLink?.link);

                return socialLinkField ? (
                  <EditableImageButton
                    key={socialLinkField.value?.href || index}
                    buttonLink={socialLinkField}
                    className={cn(
                      'relative rounded-full border border-white/25 text-white hover:border-accent hover:bg-transparent hover:text-accent',
                    )}
                    variant="ghost"
                    size={isPageEditing ? 'default' : 'icon'}
                    isPageEditing={isPageEditing}
                    icon={getFieldValue(socialLink?.socialIcon)}
                    asIconLink={true}
                  />
                ) : null;
              })}
            </div>
            {/* Copyright text */}
            <Text
              className="text-sm text-white/80"
              field={footerCopyrightField}
              encode={false}
            />
          </div>
        </div>
      </footer>
    );
  }
  return <NoDataFallback componentName="Global Footer" />;
};
