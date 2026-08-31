import type React from 'react';
import Link from 'next/link';
import { Text, AppPlaceholder } from '@sitecore-content-sdk/nextjs';
import { GlobalFooterProps } from '@/components/global-footer/global-footer.props';
import { FooterNewsletterSignup } from '@/components/global-footer/FooterNewsletterSignup.client';
import { Default as Logo } from '@/components/logo/Logo.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { EditableImageButton } from '@/components/button-component/ButtonComponent';
import { cn } from '@/lib/utils';
import componentMap from '.sitecore/component-map';
import { getDatasource, getFieldValue } from '@/lib/component-props';
import { hasLegacySolterraSignature } from '@/lib/slb-content-safety';
import { getSlbDamAssetUrl } from '@/lib/slb-dam-assets';

const localFooterContent = {
  en: {
    columns: [
      {
        title: 'Solutions',
        links: [
          ['Digital operations', '/solutions/digital-operations'],
          [
            'Industrial decarbonization',
            '/solutions/industrial-decarbonization',
          ],
          ['New energy systems', '/solutions/new-energy-systems'],
        ],
      },
      {
        title: 'Products and services',
        links: [
          [
            'Subsurface and well delivery',
            '/products-and-services/subsurface-and-well-delivery',
          ],
          ['Data and AI', '/products-and-services/data-and-ai'],
          ['CCUS', '/products-and-services/ccus'],
        ],
      },
      {
        title: 'Company',
        links: [
          ['Who we are', '/about-us'],
          ['Sustainability', '/sustainability'],
          ['News and insights', '/news-and-insights'],
        ],
      },
    ],
    newsletterTitle: 'Energy insights, delivered',
    newsletterDescription:
      'Get the latest SLB technology, energy innovation, and industry insights delivered to your inbox.',
    copyright: 'SLB. All rights reserved.',
  },
  'es-MX': {
    columns: [
      {
        title: 'Soluciones',
        links: [
          ['Operaciones digitales', '/es-mx/soluciones/operaciones-digitales'],
          [
            'Descarbonización industrial',
            '/es-mx/soluciones/descarbonizacion-industrial',
          ],
          [
            'Nuevos sistemas de energía',
            '/es-mx/soluciones/sistemas-de-nueva-energia',
          ],
        ],
      },
      {
        title: 'Productos y servicios',
        links: [
          [
            'Subsuelo y construcción de pozos',
            '/es-mx/productos-y-servicios/subsuelo-y-construccion-de-pozos',
          ],
          ['Datos e IA', '/es-mx/productos-y-servicios/datos-e-ia'],
          ['CCUS', '/es-mx/productos-y-servicios/ccus'],
        ],
      },
      {
        title: 'Compañía',
        links: [
          ['Quiénes somos', '/es-mx/quienes-somos'],
          ['Sostenibilidad', '/es-mx/sostenibilidad'],
          ['Noticias y análisis', '/es-mx/noticias-y-analisis'],
        ],
      },
    ],
    newsletterTitle: 'Perspectivas de energía, en su correo',
    newsletterDescription:
      'Reciba las últimas novedades de SLB sobre tecnología, innovación energética y tendencias de la industria.',
    copyright: 'SLB. Todos los derechos reservados.',
  },
} as const;

export function LocalSlbFooter({
  locale,
  trackingEnabled = true,
}: {
  locale?: string;
  trackingEnabled?: boolean;
}) {
  const language = locale?.toLocaleLowerCase() === 'es-mx' ? 'es-MX' : 'en';
  const content = localFooterContent[language];

  return (
    <footer
      className="@container bg-dark text-white"
      data-testid="slb-footer-local-fallback"
    >
      <div className="slb-page-shell @md:grid-cols-2 @lg:grid-cols-12 @lg:gap-10 grid grid-cols-1 gap-12 py-16 @lg:py-20">
        <div className="@lg:col-span-2">
          <Link
            href={language === 'es-MX' ? '/es-mx' : '/'}
            aria-label={language === 'es-MX' ? 'Inicio de SLB' : 'SLB home'}
            className="flex min-h-[72px] w-[152px] items-center bg-white p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getSlbDamAssetUrl('slb-logo-positive-blue.svg')}
              alt="SLB"
              className="h-auto w-full"
              data-testid="slb-footer-logo-fallback"
            />
          </Link>
        </div>
        <nav
          aria-label={language === 'es-MX' ? 'Pie de página' : 'Footer'}
          className="@md:grid-cols-3 @md:col-span-2 @lg:col-span-6 grid grid-cols-1 gap-8"
        >
          {content.columns.map((column) => (
            <div key={column.title}>
              <h2 className="font-heading mb-4 text-lg font-medium">
                {column.title}
              </h2>
              <ul className="space-y-3 text-sm text-white/80">
                {column.links.map(([label, href]) => (
                  <li key={href}>
                    <Link className="hover:text-accent" href={href}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="@md:col-span-2 @lg:col-span-4">
          <FooterNewsletterSignup
            title={{ value: content.newsletterTitle }}
            description={{ value: content.newsletterDescription }}
            locale={language}
            trackingEnabled={trackingEnabled}
          />
        </div>
      </div>
      <div className="border-t border-white/20">
        <div className="global-footer__bottom slb-page-shell py-6">
          <p className="text-sm text-white/80">
            © {new Date().getFullYear()} {content.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}

export const Default: React.FC<GlobalFooterProps> = (props) => {
  const { fields, rendering, page } = props;
  const isPageEditing = page.mode.isEditing;
  const datasource = getDatasource(fields);

  const {
    emailSubscriptionTitle,
    footerCopyright,
    footerLogo,
    footerPromoDescription,
    footerPromoTitle,
    footerSocialLinks,
  } = datasource ?? {};
  const emailSubscriptionTitleField = getFieldValue(emailSubscriptionTitle);
  const footerCopyrightField = getFieldValue(footerCopyright);
  const footerLogoField = getFieldValue(footerLogo);
  const footerPromoTitleField = getFieldValue(footerPromoTitle);
  const footerPromoDescriptionField = getFieldValue(footerPromoDescription);
  const hasVisibleDatasourceContent = Boolean(
    footerCopyrightField?.value ||
      emailSubscriptionTitleField?.value ||
      footerPromoTitleField?.value ||
      footerPromoDescriptionField?.value,
  );
  const hasInheritedDatasource = hasLegacySolterraSignature(datasource);
  const needsLocalFallback =
    hasInheritedDatasource ||
    (!isPageEditing && (!datasource || !hasVisibleDatasourceContent));

  if (needsLocalFallback) {
    return (
      <LocalSlbFooter
        locale={page.locale}
        trackingEnabled={page.mode.isNormal}
      />
    );
  }

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
                  src={getSlbDamAssetUrl('slb-logo-positive-blue.svg')}
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
          {/* Newsletter section */}
          <div className="@md:col-span-2 @lg:col-span-4">
            <FooterNewsletterSignup
              title={
                isPageEditing && emailSubscriptionTitleField
                  ? emailSubscriptionTitleField
                  : emailSubscriptionTitleField?.value
                    ? emailSubscriptionTitleField
                    : footerPromoTitleField
              }
              description={footerPromoDescriptionField}
              locale={page.locale}
              trackingEnabled={page.mode.isNormal}
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
