'use client';

import { Text } from '@sitecore-content-sdk/nextjs';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { Default as EmailSignupForm } from '@/components/forms/email/EmailSignupForm.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import {
  getLocaleOption,
  getLocalizedPathname,
  type SupportedLocale,
} from '@/i18n/locales';
import { usePublicPathname } from '@/hooks/use-public-pathname';
import type { GlobalFooterProps } from './global-footer.props';

const isLegacyStarterValue = (value: string | undefined): boolean =>
  Boolean(
    value &&
      /alaris|aero|nexa|terra|vehicle|automotive|models|dealership|test drive|test-drive/i.test(
        value,
      ),
  );

const isUnexpectedFooterValue = (value: string | undefined): boolean =>
  isLegacyStarterValue(value) || Boolean(value && /less we can/i.test(value));

const stripQaSuffix = (value: string | undefined): string =>
  value?.replace(/\s+QA\.?$/i, '') ?? '';

const fallbackFooterLinks = [
  ['Builders / HVAC', 'https://nwnpartnerlink.com/Account/Login?ReturnUrl=%2f'],
  ['Investors', 'https://ir.nwnaturalholdings.com/home/default.aspx'],
  ['Suppliers', 'https://www.nwnatural.com/suppliers'],
  ['Careers', 'https://www.nwnatural.com/about-us/the-company/careers'],
  ['Safety', 'https://www.nwnatural.com/safety/home-safety'],
  ['Contact Us', 'https://www.nwnatural.com/contact-us'],
].map(([text, href]) => ({
  link: { jsonValue: { value: { text, href, linktype: 'external' } } },
}));

const footerCopy = {
  en: {
    emailTitle: 'Get energy tips and service updates.',
    copyright: `© ${new Date().getFullYear()} NW Natural. All Rights Reserved.`,
    subscriptionPrefix:
      'By subscribing, you agree to receive NW Natural email updates. See our',
    privacyNotice: 'Privacy Notice',
    socialHeading: 'Follow NW Natural',
    footerNavigation: 'Footer navigation',
    legalNavigation: 'Legal',
    emailPlaceholder: 'Enter your email address',
    emailLabel: 'Email address',
    emailSubmit: 'Subscribe',
    emailSubmitting: 'Subscribing…',
    emailError: 'Enter a valid email address.',
    emailSuccess: 'Thanks for subscribing.',
    submissionError: 'We could not complete your signup. Please try again.',
  },
  'es-MX': {
    emailTitle: 'Reciba consejos de energía y novedades del servicio.',
    copyright: `© ${new Date().getFullYear()} NW Natural. Todos los derechos reservados.`,
    subscriptionPrefix:
      'Al suscribirse, acepta recibir novedades de NW Natural por correo electrónico. Consulte nuestro',
    privacyNotice: 'Aviso de privacidad',
    socialHeading: 'Siga a NW Natural',
    footerNavigation: 'Navegación del pie de página',
    legalNavigation: 'Información legal',
    emailPlaceholder: 'Ingrese su correo electrónico',
    emailLabel: 'Correo electrónico',
    emailSubmit: 'Suscribirse',
    emailSubmitting: 'Suscribiendo…',
    emailError: 'Ingrese un correo electrónico válido.',
    emailSuccess: 'Gracias por suscribirse.',
    submissionError: 'No pudimos completar su suscripción. Inténtelo de nuevo.',
  },
} as const;

const fallbackEmailTitle = { value: footerCopy.en.emailTitle };
const fallbackCopyright = { value: footerCopy.en.copyright };

const getUtilityLinks = (locale: SupportedLocale, pathname: string) => {
  const isSpanish = locale === 'es-MX';

  return [
    {
      text: isSpanish ? 'Términos y condiciones' : 'Terms and Conditions',
      href: 'https://www.nwnatural.com/terms-and-conditions',
    },
    {
      text: isSpanish ? 'Aviso de privacidad' : 'Privacy Notice',
      href: 'https://www.nwnatural.com/privacy-notice',
    },
    {
      text: isSpanish ? 'Insertos de facturas' : 'Bill Inserts',
      href: 'https://www.nwnatural.com/account/bill-inserts',
    },
    {
      text: isSpanish ? 'English' : 'En Español',
      href: getLocalizedPathname(pathname, isSpanish ? 'en' : 'es-MX'),
    },
    {
      text: isSpanish ? 'Sus opciones de privacidad' : 'Your Privacy Choices',
      href: 'https://www.nwnatural.com/do-not-share-my-data',
    },
  ];
};

const spanishFooterLinkLabels: Record<string, string> = {
  'builders / hvac': 'Constructores / HVAC',
  investors: 'Inversionistas',
  suppliers: 'Proveedores',
  careers: 'Empleos',
  safety: 'Seguridad',
  'contact us': 'Contáctenos',
};

const socialLinkOrder: Record<string, number> = {
  x: 0,
  facebook: 1,
  youtube: 2,
  linkedin: 3,
  instagram: 4,
};

const footerLinkOrder: Record<string, number> = {
  'builders / hvac': 0,
  investors: 1,
  suppliers: 2,
  careers: 3,
  safety: 4,
  'contact us': 5,
};

export const GlobalFooterNwn: React.FC<GlobalFooterProps> = (props) => {
  const { fields, isPageEditing } = props;
  const datasource = fields?.data?.datasource;
  const pathname = usePublicPathname();
  const currentLocale = getLocaleOption(props.page.locale).code;
  const copy = footerCopy[currentLocale];

  if (!fields || !datasource) {
    return <NoDataFallback componentName="Global Footer" />;
  }

  const {
    footerNavLinks,
    footerCopyright,
    socialLinks,
    emailSubscriptionTitle,
  } = datasource;
  const authoredLinks = footerNavLinks?.results ?? [];
  const hasUnexpectedContent =
    isUnexpectedFooterValue(emailSubscriptionTitle?.jsonValue?.value) ||
    isUnexpectedFooterValue(footerCopyright?.jsonValue?.value) ||
    authoredLinks.some(
      (item) =>
        isUnexpectedFooterValue(item.link?.jsonValue?.value?.text) ||
        isUnexpectedFooterValue(item.link?.jsonValue?.value?.href),
    );
  const useFallbackContent =
    !isPageEditing && (authoredLinks.length === 0 || hasUnexpectedContent);
  const links = [
    ...(useFallbackContent ? fallbackFooterLinks : authoredLinks),
  ].sort((first, second) => {
    const firstLabel =
      first.link?.jsonValue?.value?.text?.trim().toLowerCase() ?? '';
    const secondLabel =
      second.link?.jsonValue?.value?.text?.trim().toLowerCase() ?? '';

    return (
      (footerLinkOrder[firstLabel] ?? Number.MAX_SAFE_INTEGER) -
      (footerLinkOrder[secondLabel] ?? Number.MAX_SAFE_INTEGER)
    );
  });
  const authoredEmailTitle = useFallbackContent
    ? fallbackEmailTitle
    : emailSubscriptionTitle?.jsonValue;
  const authoredCopyright = useFallbackContent
    ? fallbackCopyright
    : footerCopyright?.jsonValue;
  const displayEmailTitle =
    currentLocale === 'es-MX' && !isPageEditing
      ? { value: copy.emailTitle }
      : authoredEmailTitle;
  const displayCopyright =
    currentLocale === 'es-MX' && !isPageEditing
      ? { value: copy.copyright }
      : authoredCopyright;
  const displayLinks =
    currentLocale === 'es-MX' && !isPageEditing
      ? links.map((item) => {
          const link = item.link?.jsonValue;
          const label = link?.value?.text?.trim().toLowerCase() ?? '';
          const translatedLabel = spanishFooterLinkLabels[label];

          return translatedLabel && link
            ? {
                ...item,
                link: {
                  ...item.link,
                  jsonValue: {
                    ...link,
                    value: { ...link.value, text: translatedLabel },
                  },
                },
              }
            : item;
        })
      : links;
  const displaySocialLinks = (socialLinks?.results ?? [])
    .filter(
      (item) =>
        isPageEditing ||
        Boolean(
          item.link?.jsonValue?.value?.href &&
            (item.socialIcon?.jsonValue?.value?.src ||
              item.socialIconEnum?.jsonValue?.value),
        ),
    )
    .sort((first, second) => {
      const firstLabel =
        first.link?.jsonValue?.value?.text?.trim().toLowerCase() ?? '';
      const secondLabel =
        second.link?.jsonValue?.value?.text?.trim().toLowerCase() ?? '';

      return (
        (socialLinkOrder[firstLabel] ?? Number.MAX_SAFE_INTEGER) -
        (socialLinkOrder[secondLabel] ?? Number.MAX_SAFE_INTEGER)
      );
    });
  const shouldShowSignup = isPageEditing || Boolean(displayEmailTitle?.value);
  const shouldIdentifyWithCdp = !isPageEditing && props.page.mode.isNormal;

  return (
    <footer
      data-component="GlobalFooter"
      data-variant="Nwn"
      className="nwn-footer bg-[#66717f] text-white"
      role="contentinfo"
    >
      <div className="mx-auto w-full max-w-[60rem] py-9 text-center">
        {shouldShowSignup && (
          <div className="mx-6 border-b border-white/20 pb-5">
            <div className="flex flex-col items-center justify-center gap-3 md:flex-row md:gap-5">
              <Text
                tag="h2"
                field={displayEmailTitle}
                className="font-heading text-lg font-semibold leading-7 md:max-w-72 md:text-left md:text-xl"
              />
              <div className="w-full max-w-xl flex-1 text-left">
                <EmailSignupForm
                  cdpIdentity={
                    shouldIdentifyWithCdp
                      ? {
                          provider:
                            process.env
                              .NEXT_PUBLIC_SITECOREAI_IDENTITY_PROVIDER ||
                            'email',
                          source: 'global_footer',
                        }
                      : undefined
                  }
                  fields={{
                    buttonVariant: 'default',
                    emailLabel: { value: copy.emailLabel },
                    emailPlaceholder: {
                      value: stripQaSuffix(
                        currentLocale === 'es-MX'
                          ? copy.emailPlaceholder
                          : fields.dictionary?.FOOTER_EmailPlaceholder,
                      ),
                    },
                    emailSubmitLabel: {
                      value:
                        currentLocale === 'es-MX'
                          ? copy.emailSubmit
                          : fields.dictionary?.FOOTER_EmailSubmitLabel,
                    },
                    emailSubmittingLabel: { value: copy.emailSubmitting },
                    emailErrorMessage: {
                      value: stripQaSuffix(
                        currentLocale === 'es-MX'
                          ? copy.emailError
                          : fields.dictionary?.FOOTER_EmailErrorMessage,
                      ),
                    },
                    emailSuccessMessage: {
                      value: stripQaSuffix(
                        currentLocale === 'es-MX'
                          ? copy.emailSuccess
                          : fields.dictionary?.FOOTER_EmailSuccessMessage,
                      ),
                    },
                    submissionErrorMessage: {
                      value: copy.submissionError,
                    },
                  }}
                />
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/90">
              {copy.subscriptionPrefix}{' '}
              <a
                href="https://www.nwnatural.com/privacy-notice"
                className="font-semibold text-white underline underline-offset-2"
              >
                {copy.privacyNotice}
              </a>
              .
            </p>
          </div>
        )}

        <nav
          className={shouldShowSignup ? 'mt-5' : undefined}
          aria-label={copy.footerNavigation}
        >
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-6">
            {displayLinks.map((item, index) => (
              <li key={'nwn-footer-link-' + index}>
                <EditableButton
                  buttonLink={item.link?.jsonValue}
                  isPageEditing={isPageEditing}
                  variant="ghost"
                  className="h-auto min-h-11 whitespace-normal px-1 py-2 text-center text-[1.125rem] font-medium text-white hover:bg-transparent hover:text-cyan-100"
                  page={props.page}
                />
              </li>
            ))}
          </ul>
        </nav>

        {(displaySocialLinks.length > 0 || isPageEditing) && (
          <div className="mt-7">
            <h2 className="sr-only">{copy.socialHeading}</h2>
            <ul className="flex flex-wrap justify-center gap-1">
              {displaySocialLinks.map((socialLink, index) => (
                <li key={'nwn-social-' + index}>
                  <EditableButton
                    buttonLink={socialLink.link?.jsonValue}
                    icon={socialLink.socialIcon?.jsonValue}
                    iconName={socialLink.socialIconEnum?.jsonValue}
                    iconClassName="h-7 w-7 object-contain brightness-0 invert"
                    isPageEditing={isPageEditing}
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11 rounded-full text-white hover:bg-white/15"
                    asIconLink
                    page={props.page}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        <nav className="mx-[1.875rem] mt-6" aria-label={copy.legalNavigation}>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
            {getUtilityLinks(currentLocale, pathname).map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-white underline-offset-4 hover:underline"
                >
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-sm text-white">
          <Text field={displayCopyright} encode={false} />
        </div>
      </div>
    </footer>
  );
};
