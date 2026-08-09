'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import type { LinkField } from '@sitecore-content-sdk/nextjs';
import { CompatibleLink } from '@/components/content-sdk/CompatibleLink';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { Button } from '@/components/ui/button';
import { NoDataFallback } from '@/utils/NoDataFallback';
import {
  getLocaleOption,
  getLocalizedPathname,
  type SupportedLocale,
} from '@/i18n/locales';
import { LocaleSelector } from './LocaleSelector';
import type {
  GlobalHeaderProps,
  PrimaryNavItemProps,
  UtilityNavigationItemProps,
} from './global-header.props';

const navItemKey = (item: PrimaryNavItemProps, index: number): string =>
  item.link?.jsonValue?.value?.text ||
  item.link?.jsonValue?.value?.href ||
  String(index);

const headerCopy = {
  en: {
    home: 'NW Natural home',
    skip: 'Skip to main content',
    utilityNavigation: 'Utility navigation',
    primaryNavigation: 'Primary navigation',
    servicesNavigation: 'Services navigation',
    mobileNavigation: 'Mobile navigation',
    customerServices: 'Customer services',
    customerService: 'Customer service',
    gasOdor: 'Natural gas odor?',
    openMenu: 'Open navigation menu',
    closeMenu: 'Close navigation menu',
  },
  'es-MX': {
    home: 'Inicio de NW Natural',
    skip: 'Saltar al contenido principal',
    utilityNavigation: 'Navegación de utilidades',
    primaryNavigation: 'Navegación principal',
    servicesNavigation: 'Navegación de servicios',
    mobileNavigation: 'Navegación móvil',
    customerServices: 'Servicios al cliente',
    customerService: 'Servicio al cliente',
    gasOdor: '¿Huele a gas natural?',
    openMenu: 'Abrir menú de navegación',
    closeMenu: 'Cerrar menú de navegación',
  },
} as const;

const secondaryNavigationLabels = {
  en: [
    'Account & Billing',
    'Ways to Save',
    'Services',
    'Get Natural Gas',
    'Safety',
  ],
  'es-MX': [
    'Cuenta y facturación',
    'Formas de ahorrar',
    'Servicios',
    'Obtenga gas natural',
    'Seguridad',
  ],
} as const;

const secondaryNavigationHrefs = [
  '/account-billing',
  '/ways-to-save/rebates-offers',
  '/services',
  '/get-natural-gas',
  '/safety',
] as const;

const isLegacyStarterLogo = (value: unknown): boolean =>
  Boolean(
    typeof value === 'string' &&
      /alaris|vehicle|automotive|ambulance|fire-truck/i.test(value),
  );

const isLegacyStarterValue = (value: string | undefined): boolean =>
  Boolean(
    value &&
      /alaris|aero|nexa|terra|vehicle|automotive|test drive|test-drive|models|dealership/i.test(
        value,
      ),
  );

const isExternalNwnAccountValue = (value: string | undefined): boolean =>
  Boolean(
    value &&
      /(?:www\.)?nwnatural\.com\/identity\/login|identity\.nwnatural\.com\/account\/register/i.test(
        value,
      ),
  );

const navItem = (
  text: string,
  href: string,
  children: PrimaryNavItemProps[] = [],
  external = false,
): PrimaryNavItemProps => ({
  link: {
    jsonValue: {
      value: {
        text,
        href,
        linktype: external ? 'external' : 'internal',
        target: external ? '_blank' : '',
      },
    },
  },
  children: { results: children },
});

const getFallbackPrimaryItems = (
  locale: SupportedLocale,
): PrimaryNavItemProps[] => {
  const localize = (href: string) => getLocalizedPathname(href, locale);

  if (locale === 'es-MX') {
    return [
      navItem('Residencial', localize('/'), [
        navItem('Cuenta y facturación', localize('/account-billing')),
        navItem('Formas de ahorrar', localize('/ways-to-save/rebates-offers')),
        navItem('Servicios', localize('/services')),
        navItem('Obtenga gas natural', localize('/get-natural-gas')),
        navItem('Seguridad', localize('/safety')),
      ]),
      navItem('Empresas', 'https://www.nwnatural.com/business', [], true),
      navItem('Acerca de nosotros', localize('/about-us'), [
        navItem(
          'Descripción de la empresa',
          localize('/about-us/company-overview'),
        ),
        navItem(
          'Gas natural renovable',
          localize('/about-us/renewable-natural-gas'),
        ),
        navItem('Less We Can', localize('/about-us/less-we-can')),
      ]),
    ];
  }

  return [
    navItem('Residential', '/', [
      navItem('Account & Billing', '/account-billing'),
      navItem('Ways to Save', '/ways-to-save/rebates-offers'),
      navItem('Services', '/services'),
      navItem('Get Natural Gas', '/get-natural-gas'),
      navItem('Safety', '/safety'),
    ]),
    navItem('Business', 'https://www.nwnatural.com/business', [], true),
    navItem('About Us', '/about-us', [
      navItem('Company Overview', '/about-us/company-overview'),
      navItem('Renewable Natural Gas', '/about-us/renewable-natural-gas'),
      navItem('Less We Can', '/about-us/less-we-can'),
    ]),
  ];
};

const getFallbackUtilityItems = (locale: SupportedLocale) => {
  const localize = (href: string) => getLocalizedPathname(href, locale);
  const labels =
    locale === 'es-MX'
      ? ['Buscar', 'Contáctenos', 'Iniciar sesión', 'Registrarse']
      : ['Search', 'Contact Us', 'Sign In', 'Register'];

  return [
    navItem(labels[0], localize('/search')),
    navItem(labels[1], localize('/contact-us')),
    navItem(labels[2], localize('/account-billing/login')),
    navItem(labels[3], localize('/account-billing/register')),
  ];
};

const getFallbackHeaderContact = (locale: SupportedLocale): LinkField => ({
  value: {
    href: getLocalizedPathname('/account-billing/login', locale),
    text: locale === 'es-MX' ? 'Acceda a su cuenta' : 'Access your account',
    linktype: 'internal',
  },
});

type NavItemWithOptionalChildren = UtilityNavigationItemProps & {
  children?: { results?: PrimaryNavItemProps[] };
};

const hasLegacyNavItem = (item: NavItemWithOptionalChildren): boolean => {
  const value = item.link?.jsonValue?.value;
  return (
    isLegacyStarterValue(value?.text) ||
    isLegacyStarterValue(value?.href) ||
    isExternalNwnAccountValue(value?.href) ||
    Boolean(item.children?.results?.some(hasLegacyNavItem))
  );
};

const hasRequiredUtilityItems = (
  items: UtilityNavigationItemProps[],
): boolean => {
  const requiredDestinations = [
    '/search',
    '/contact-us',
    '/account-billing/login',
    '/account-billing/register',
  ];

  return requiredDestinations.every((href) =>
    items.some((item) => {
      const authoredHref = item.link?.jsonValue?.value?.href;
      return (
        Boolean(authoredHref) &&
        getLocalizedPathname(authoredHref ?? '/', 'en') === href
      );
    }),
  );
};

export const GlobalHeaderNwn: React.FC<GlobalHeaderProps> = (props) => {
  const { fields, isPageEditing } = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const header = fields?.data?.item;
  const currentLocale = getLocaleOption(props.page.locale).code;
  const copy = headerCopy[currentLocale];
  const secondaryNavigation = secondaryNavigationHrefs.map((href, index) => ({
    href: getLocalizedPathname(href, currentLocale),
    label: secondaryNavigationLabels[currentLocale][index],
  }));

  if (!fields || !header) {
    return <NoDataFallback componentName="Global Header" />;
  }

  const {
    logo,
    primaryNavigationLinks,
    utilityNavigationLinks,
    headerContact,
  } = header;
  const authoredPrimaryItems = primaryNavigationLinks?.targetItems ?? [];
  const authoredUtilityItems = utilityNavigationLinks?.targetItems ?? [];
  const primaryItems =
    !isPageEditing &&
    (authoredPrimaryItems.length === 0 ||
      authoredPrimaryItems.some(hasLegacyNavItem))
      ? getFallbackPrimaryItems(currentLocale)
      : authoredPrimaryItems;
  const utilityItems =
    !isPageEditing &&
    (authoredUtilityItems.length === 0 ||
      authoredUtilityItems.some(hasLegacyNavItem) ||
      !hasRequiredUtilityItems(authoredUtilityItems))
      ? getFallbackUtilityItems(currentLocale)
      : authoredUtilityItems;
  const logoField = logo?.jsonValue;
  const hasLogo =
    isPageEditing ||
    Boolean(
      logoField?.value?.src &&
        !isLegacyStarterLogo(logoField.value.src) &&
        !isLegacyStarterLogo(logoField.value.alt),
    );
  const authoredHeaderContact = headerContact?.jsonValue;
  const useFallbackHeaderContact =
    !isPageEditing &&
    (isLegacyStarterValue(authoredHeaderContact?.value?.text) ||
      isLegacyStarterValue(authoredHeaderContact?.value?.href) ||
      isExternalNwnAccountValue(authoredHeaderContact?.value?.href) ||
      (authoredHeaderContact?.value?.text?.trim().toLowerCase() ===
        'access your account' &&
        authoredHeaderContact?.value?.href !== '/account-billing/login') ||
      !authoredHeaderContact?.value?.href);
  const displayHeaderContact = useFallbackHeaderContact
    ? getFallbackHeaderContact(currentLocale)
    : authoredHeaderContact;

  const localizeLinkField = <T extends LinkField | undefined>(
    linkField: T,
  ): T => {
    if (!linkField) return linkField;

    const href = linkField?.value?.href;
    if (isPageEditing || !href?.startsWith('/')) return linkField;

    return {
      ...linkField,
      value: {
        ...linkField.value,
        href: getLocalizedPathname(href, currentLocale),
      },
    } as T;
  };

  const brand = hasLogo ? (
    <ImageWrapper
      image={logoField}
      wrapperClass="w-[11.4rem] sm:w-[14.4rem]"
      className="h-auto w-full object-contain"
      sizes="(max-width: 640px) 182px, 230px"
      alt={copy.home}
      page={props.page}
    />
  ) : (
    <span className="font-heading text-2xl font-semibold tracking-tight text-primary">
      NW Natural
    </span>
  );

  const renderPrimaryLink = (
    item: PrimaryNavItemProps,
    index: number,
    isMobile = false,
  ) => {
    const linkField = localizeLinkField(item.link?.jsonValue);
    const children = item.children?.results ?? [];
    const canRenderLink = isPageEditing || Boolean(linkField?.value?.href);

    if (!canRenderLink) return null;

    if (isMobile) {
      return (
        <li
          key={'nwn-mobile-' + navItemKey(item, index)}
          className="border-b border-slate-200 py-4"
        >
          <CompatibleLink
            field={linkField}
            editable={isPageEditing}
            prefetch={false}
            className="font-heading text-xl font-semibold text-slate-900"
            onClick={() => setIsMenuOpen(false)}
          />
          {children.length > 0 && (
            <ul className="mt-3 space-y-2 border-l-2 border-cyan-500 pl-4">
              {children.map((child, childIndex) => (
                <li key={'nwn-mobile-child-' + navItemKey(child, childIndex)}>
                  <CompatibleLink
                    field={localizeLinkField(child.link?.jsonValue)}
                    editable={isPageEditing}
                    prefetch={false}
                    className="inline-flex py-1 text-base font-medium text-slate-700 hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  />
                </li>
              ))}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li
        key={'nwn-desktop-' + navItemKey(item, index)}
        className="group relative flex min-h-14 items-center"
      >
        <div className="flex items-center gap-1">
          <CompatibleLink
            field={linkField}
            editable={isPageEditing}
            prefetch={false}
            className="relative inline-flex py-4 font-heading text-[1.05rem] font-semibold text-slate-800 transition-colors after:absolute after:inset-x-0 after:bottom-3 after:h-0.5 after:origin-left after:scale-x-0 after:bg-cyan-500 after:transition-transform hover:text-primary hover:after:scale-x-100 focus-visible:text-primary focus-visible:after:scale-x-100"
            aria-haspopup={children.length > 0 ? 'true' : undefined}
          />
          {children.length > 0 && (
            <ChevronDown
              className="h-4 w-4 text-primary transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
              aria-hidden="true"
            />
          )}
        </div>
        {children.length > 0 && (
          <ul className="invisible absolute left-0 top-full z-50 min-w-64 translate-y-2 border-t-4 border-cyan-500 bg-white p-3 opacity-0 shadow-[0_12px_24px_rgba(0,0,0,0.12)] transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
            {children.map((child, childIndex) => (
              <li key={'nwn-desktop-child-' + navItemKey(child, childIndex)}>
                <CompatibleLink
                  field={localizeLinkField(child.link?.jsonValue)}
                  editable={isPageEditing}
                  prefetch={false}
                  className="block px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-cyan-50 hover:text-primary focus-visible:bg-cyan-50 focus-visible:text-primary"
                />
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <header
      data-component="GlobalHeader"
      data-variant="Nwn"
      className="nwn-header sticky top-0 z-50 w-full border-t-[0.5rem] border-cyan-500 bg-white text-slate-900 shadow-sm"
    >
      <a
        href="#content"
        className="sr-only z-[100] bg-white px-4 py-3 text-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        {copy.skip}
      </a>

      <div className="hidden border-b border-slate-200 lg:block">
        <div className="nwn-content-shell flex min-h-9 items-center justify-between gap-6 text-sm">
          <nav aria-label={copy.utilityNavigation}>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {utilityItems.map((item, index) => (
                <li key={'nwn-utility-' + index}>
                  <CompatibleLink
                    field={localizeLinkField(item.link?.jsonValue)}
                    editable={isPageEditing}
                    prefetch={false}
                    className="font-medium text-slate-600 hover:text-primary"
                  />
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-6">
            <a
              href="tel:+18004224012"
              className="font-semibold text-slate-700 hover:text-primary"
            >
              {copy.customerService}{' '}
              <span className="text-primary">800-422-4012</span>
            </a>
            <a
              href="tel:+18008823377"
              className="font-semibold text-slate-700 hover:text-primary"
            >
              {copy.gasOdor} <span className="text-primary">800-882-3377</span>
            </a>
          </div>
        </div>
      </div>

      <div className="nwn-content-shell flex min-h-[4.5rem] items-center justify-between gap-6">
        <div className="shrink-0">
          {isPageEditing ? (
            brand
          ) : (
            <Link
              href={getLocalizedPathname('/', currentLocale)}
              aria-label={copy.home}
              prefetch={false}
            >
              {brand}
            </Link>
          )}
        </div>

        <nav
          className="hidden self-stretch lg:block"
          aria-label={copy.primaryNavigation}
        >
          <ul className="flex h-full items-center gap-7">
            {primaryItems.map((item, index) => renderPrimaryLink(item, index))}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <LocaleSelector locale={currentLocale} />
          {displayHeaderContact && (
            <EditableButton
              buttonLink={localizeLinkField(displayHeaderContact)}
              isPageEditing={isPageEditing && !useFallbackHeaderContact}
              variant="default"
              className="min-h-11 border border-primary px-5 text-base"
              page={props.page}
            />
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <LocaleSelector locale={currentLocale} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-12 w-12 text-primary"
            aria-expanded={isMenuOpen}
            aria-controls="nwn-mobile-navigation"
            aria-label={isMenuOpen ? copy.closeMenu : copy.openMenu}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      <nav
        className="hidden border-y border-slate-200 bg-[#f4f5f7] lg:block"
        aria-label={copy.servicesNavigation}
      >
        <ul className="nwn-content-shell flex min-h-10 items-stretch">
          {secondaryNavigation.map((item) => (
            <li
              key={item.href}
              className="flex flex-1 border-r border-slate-200 first:border-l"
            >
              <Link
                href={item.href}
                prefetch={false}
                className="flex w-full items-center justify-center px-4 py-2 text-center font-heading text-[0.98rem] font-semibold text-slate-700 transition-colors hover:bg-white hover:text-primary focus-visible:bg-white focus-visible:text-primary"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {isMenuOpen && (
        <div
          id="nwn-mobile-navigation"
          className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-t border-slate-200 bg-white px-4 pb-8 shadow-lg lg:hidden"
        >
          <nav className="mx-auto max-w-xl" aria-label={copy.mobileNavigation}>
            <ul>
              {primaryItems.map((item, index) =>
                renderPrimaryLink(item, index, true),
              )}
            </ul>
            <div className="mt-5 border-y border-slate-200 bg-[#f4f5f7] px-4 py-2">
              <p className="py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {copy.customerServices}
              </p>
              <ul>
                {secondaryNavigation.map((item) => (
                  <li key={'nwn-mobile-secondary-' + item.href}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      className="block border-t border-slate-200 py-3 font-heading text-lg font-semibold text-slate-800 hover:text-primary"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {utilityItems.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
                {utilityItems.map((item, index) => (
                  <li key={'nwn-mobile-utility-' + index}>
                    <CompatibleLink
                      field={localizeLinkField(item.link?.jsonValue)}
                      editable={isPageEditing}
                      prefetch={false}
                      className="text-sm font-semibold text-slate-600 hover:text-primary"
                      onClick={() => setIsMenuOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 space-y-2">
              <a
                href="tel:+18004224012"
                className="block border-l-4 border-slate-300 bg-slate-50 px-4 py-3 font-semibold text-slate-800"
              >
                {copy.customerService}{' '}
                <span className="text-primary">800-422-4012</span>
              </a>
              <a
                href="tel:+18008823377"
                className="block border-l-4 border-cyan-500 bg-cyan-50 px-4 py-3 font-semibold text-slate-800"
              >
                {copy.gasOdor}{' '}
                <span className="text-primary">800-882-3377</span>
              </a>
            </div>
            {displayHeaderContact && (
              <div className="mt-5">
                <EditableButton
                  buttonLink={localizeLinkField(displayHeaderContact)}
                  isPageEditing={isPageEditing && !useFallbackHeaderContact}
                  variant="default"
                  className="min-h-12 w-full text-base"
                  page={props.page}
                />
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
