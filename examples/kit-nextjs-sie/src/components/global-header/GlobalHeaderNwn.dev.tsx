'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import type { ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import { CompatibleLink } from '@/components/content-sdk/CompatibleLink';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { Button } from '@/components/ui/button';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type {
  GlobalHeaderProps,
  PrimaryNavItemProps,
} from './global-header.props';

const navItemKey = (item: PrimaryNavItemProps, index: number): string =>
  item.link?.jsonValue?.value?.text ||
  item.link?.jsonValue?.value?.href ||
  String(index);

const secondaryNavigation = [
  { label: 'Customer Service', href: '/customer-service-portal' },
  { label: 'Service Options', href: '/service-options' },
  { label: 'Payment Options', href: '/payment-options-locations' },
  { label: 'Information', href: '/regulatory-and-important-links' },
  { label: 'Safety', href: '/safety' },
] as const;

const isLegacyStarterLogo = (value: unknown): boolean =>
  Boolean(
    typeof value === 'string' &&
      /alaris|vehicle|automotive|ambulance|fire-truck|nw\s*natural|nwnatural|nw-natural|nwn-images/i.test(
        value,
      ),
  );

const isLegacyStarterValue = (value: string | undefined): boolean =>
  Boolean(
    value &&
      /alaris|aero|nexa|terra|vehicle|automotive|test drive|test-drive|models|dealership|nw\s*natural|nwnatural|nw-natural|nwnpartnerlink|account-billing|ways-to-save|get-natural-gas/i.test(
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

const fallbackPrimaryItems: PrimaryNavItemProps[] = [
  navItem('What We Do', '/what-we-do'),
  navItem('Customer Service', '/customer-service-portal', [
    navItem('Contact Us', '/contact-us'),
    navItem('Service Options', '/service-options'),
    navItem('Payment Options', '/payment-options-locations'),
    navItem('Understanding My Bill', '/understanding-my-bill'),
  ]),
  navItem('Information', '/regulatory-and-important-links', [
    navItem('Regulatory & Important Links', '/regulatory-and-important-links'),
    navItem('Safety', '/safety'),
    navItem('How to Read My Meter', '/how-to-read-my-meter'),
    navItem('Tips to Lower Gas Usage', '/tips-to-lower-gas-usage'),
  ]),
  navItem('Company', '/company', [
    navItem('History', '/company'),
    navItem('Vision, Purpose & Values', '/vision-mission-goals'),
  ]),
  navItem('Report Emergency', '/report-emergency'),
];

const fallbackUtilityItems = [
  navItem('Contact', '/contact-us'),
  navItem('Developers', '/business-development'),
  navItem(
    'Login',
    'https://sienergy.epayub.com/Account/Login?ReturnUrl=%2F',
    [],
    true,
  ),
];

const fallbackHeaderContact: LinkField = {
  value: {
    href: 'https://sienergy.epayub.com/Account/Login?ReturnUrl=%2F',
    text: 'Pay My Bill',
    linktype: 'external',
    target: '_blank',
  },
};

const fallbackLogo: ImageField = {
  value: {
    src: '/assets/sie-images/global-header-sienergy-logo-reversed.png',
    alt: 'SiEnergy',
    width: '600',
    height: '186',
  },
};

const hasLegacyNavItem = (item: PrimaryNavItemProps): boolean => {
  const value = item.link?.jsonValue?.value;
  return (
    isLegacyStarterValue(value?.text) ||
    isLegacyStarterValue(value?.href) ||
    Boolean(item.children?.results?.some(hasLegacyNavItem))
  );
};

export const GlobalHeaderNwn: React.FC<GlobalHeaderProps> = (props) => {
  const { fields, isPageEditing } = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const header = fields?.data?.item;

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
      ? fallbackPrimaryItems
      : authoredPrimaryItems;
  const utilityItems =
    !isPageEditing &&
    (authoredUtilityItems.length === 0 ||
      authoredUtilityItems.some(hasLegacyNavItem))
      ? fallbackUtilityItems
      : authoredUtilityItems;
  const logoField = logo?.jsonValue;
  const hasAuthoredLogo = Boolean(
    logoField?.value?.src &&
      !isLegacyStarterLogo(logoField.value.src) &&
      !isLegacyStarterLogo(logoField.value.alt),
  );
  const displayLogo =
    !isPageEditing && !hasAuthoredLogo ? fallbackLogo : logoField;
  const authoredHeaderContact = headerContact?.jsonValue;
  const useFallbackHeaderContact =
    !isPageEditing &&
    (isLegacyStarterValue(authoredHeaderContact?.value?.text) ||
      isLegacyStarterValue(authoredHeaderContact?.value?.href) ||
      !authoredHeaderContact?.value?.href);
  const displayHeaderContact = useFallbackHeaderContact
    ? fallbackHeaderContact
    : authoredHeaderContact;

  const brand =
    isPageEditing || displayLogo?.value?.src ? (
      <ImageWrapper
        image={displayLogo}
        wrapperClass="w-[9.5rem] sm:w-[12rem]"
        className="h-auto w-full object-contain"
        sizes="(max-width: 640px) 152px, 192px"
        alt="SiEnergy"
        page={props.page}
      />
    ) : (
      <span className="font-heading text-2xl font-semibold tracking-tight text-[#f6b786]">
        SiEnergy
      </span>
    );

  const renderPrimaryLink = (
    item: PrimaryNavItemProps,
    index: number,
    isMobile = false,
  ) => {
    const linkField = item.link?.jsonValue;
    const children = item.children?.results ?? [];
    const canRenderLink = isPageEditing || Boolean(linkField?.value?.href);

    if (!canRenderLink) return null;

    if (isMobile) {
      return (
        <li
          key={'nwn-mobile-' + navItemKey(item, index)}
          className="border-b border-white/20 py-4"
        >
          <CompatibleLink
            field={linkField}
            editable={isPageEditing}
            prefetch={false}
            className="font-heading text-xl font-semibold text-white hover:text-[#f6b786]"
            onClick={() => setIsMenuOpen(false)}
          />
          {children.length > 0 && (
            <ul className="mt-3 space-y-2 border-l-2 border-primary pl-4">
              {children.map((child, childIndex) => (
                <li key={'nwn-mobile-child-' + navItemKey(child, childIndex)}>
                  <CompatibleLink
                    field={child.link?.jsonValue}
                    editable={isPageEditing}
                    prefetch={false}
                    className="inline-flex py-1 text-base font-medium text-white/75 hover:text-[#f6b786]"
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
            className="relative inline-flex py-4 font-heading text-[1.05rem] font-semibold text-white transition-colors after:absolute after:inset-x-0 after:bottom-3 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform hover:text-[#f6b786] hover:after:scale-x-100 focus-visible:text-[#f6b786] focus-visible:after:scale-x-100"
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
          <ul className="invisible absolute left-0 top-full z-50 min-w-64 translate-y-2 border-t-4 border-primary bg-white p-3 opacity-0 shadow-[0_12px_24px_rgba(65,64,66,0.16)] transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
            {children.map((child, childIndex) => (
              <li key={'nwn-desktop-child-' + navItemKey(child, childIndex)}>
                <CompatibleLink
                  field={child.link?.jsonValue}
                  editable={isPageEditing}
                  prefetch={false}
                  className="block px-4 py-3 text-sm font-medium text-[#737076] transition-colors hover:bg-[#fff4eb] hover:text-primary focus-visible:bg-[#fff4eb] focus-visible:text-primary"
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
      className="nwn-header sticky top-0 z-50 w-full border-t-[0.625rem] border-primary bg-[#414042] text-white shadow-sm"
    >
      <a
        href="#content"
        className="sr-only z-[100] bg-white px-4 py-3 text-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <div className="hidden border-b border-white/20 lg:block">
        <div className="nwn-content-shell flex min-h-9 items-center justify-between gap-6 text-sm">
          <nav aria-label="Utility navigation">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {utilityItems.map((item, index) => (
                <li key={'nwn-utility-' + index}>
                  <CompatibleLink
                    field={item.link?.jsonValue}
                    editable={isPageEditing}
                    prefetch={false}
                    className="font-medium text-white/80 hover:text-[#f6b786]"
                  />
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-6">
            <a
              href="tel:+18884687007"
              className="font-semibold text-white hover:text-[#f6b786]"
            >
              Customer service{' '}
              <span className="text-[#f6b786]">888-468-7007, Option 3</span>
            </a>
            <a
              href="tel:+18884687007"
              className="font-semibold text-white hover:text-[#f6b786]"
            >
              Gas emergency?{' '}
              <span className="text-[#f6b786]">888-468-7007, Option 1</span>
            </a>
          </div>
        </div>
      </div>

      <div className="nwn-content-shell flex min-h-[4.5rem] items-center justify-between gap-6">
        <div className="shrink-0">
          {isPageEditing ? (
            brand
          ) : (
            <Link href="/" aria-label="SiEnergy home" prefetch={false}>
              {brand}
            </Link>
          )}
        </div>

        <nav
          className="hidden self-stretch lg:block"
          aria-label="Primary navigation"
        >
          <ul className="flex h-full items-center gap-7">
            {primaryItems.map((item, index) => renderPrimaryLink(item, index))}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {displayHeaderContact && (
            <EditableButton
              buttonLink={displayHeaderContact}
              isPageEditing={isPageEditing && !useFallbackHeaderContact}
              variant="default"
              className="min-h-11 border border-primary bg-primary px-5 text-base text-white hover:bg-primary-hover hover:text-white focus-visible:bg-primary-hover focus-visible:text-white"
              page={props.page}
            />
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto h-12 w-12 text-[#f6b786] hover:bg-white/10 hover:text-white lg:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="nwn-mobile-navigation"
          aria-label={
            isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
          }
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>

      <nav
        className="hidden border-y border-white/20 bg-[#414042] lg:block"
        aria-label="Services navigation"
      >
        <ul className="nwn-content-shell flex min-h-10 items-stretch">
          {secondaryNavigation.map((item) => (
            <li
              key={item.href}
              className="flex flex-1 border-r border-white/20 first:border-l"
            >
              <Link
                href={item.href}
                prefetch={false}
                className="flex w-full items-center justify-center px-4 py-2 text-center font-heading text-[0.98rem] font-semibold text-white transition-colors hover:bg-white/10 hover:text-[#f6b786] focus-visible:bg-white/10 focus-visible:text-[#f6b786]"
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
          className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-t border-white/20 bg-[#414042] px-4 pb-8 text-white shadow-lg lg:hidden"
        >
          <nav className="mx-auto max-w-xl" aria-label="Mobile navigation">
            <ul>
              {primaryItems.map((item, index) =>
                renderPrimaryLink(item, index, true),
              )}
            </ul>
            <div className="mt-5 border-y border-white/20 bg-white/5 px-4 py-2">
              <p className="py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                Customer services
              </p>
              <ul>
                {secondaryNavigation.map((item) => (
                  <li key={'nwn-mobile-secondary-' + item.href}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      className="block border-t border-white/15 py-3 font-heading text-lg font-semibold text-white hover:text-[#f6b786]"
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
                      field={item.link?.jsonValue}
                      editable={isPageEditing}
                      prefetch={false}
                      className="text-sm font-semibold text-white/75 hover:text-[#f6b786]"
                      onClick={() => setIsMenuOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 space-y-2">
              <a
                href="tel:+18884687007"
                className="block border-l-4 border-white/40 bg-white/5 px-4 py-3 font-semibold text-white"
              >
                Customer service{' '}
                <span className="text-[#f6b786]">888-468-7007, Option 3</span>
              </a>
              <a
                href="tel:+18884687007"
                className="block border-l-4 border-primary bg-primary/10 px-4 py-3 font-semibold text-white"
              >
                Gas emergency?{' '}
                <span className="text-[#f6b786]">888-468-7007, Option 1</span>
              </a>
            </div>
            {displayHeaderContact && (
              <div className="mt-5">
                <EditableButton
                  buttonLink={displayHeaderContact}
                  isPageEditing={isPageEditing && !useFallbackHeaderContact}
                  variant="default"
                  className="min-h-12 w-full bg-primary text-base text-white hover:bg-primary-hover hover:text-white focus-visible:bg-primary-hover focus-visible:text-white"
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
