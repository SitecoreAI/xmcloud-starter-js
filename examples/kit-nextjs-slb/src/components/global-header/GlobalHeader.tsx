'use client';

import { Fragment, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Image } from '@sitecore-content-sdk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CompatibleLink } from '@/components/content-sdk/CompatibleLink';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Default as Logo } from '@/components/logo/Logo.dev';
import { GlobalHeaderProps } from './global-header.props';
import { Button } from '@/components/ui/button';
import { getFieldValue } from '@/lib/component-props';
import { hasLegacySolterraSignature } from '@/lib/slb-content-safety';
import { getSlbDamAssetUrl } from '@/lib/slb-dam-assets';

const aboutPaths = ['/about-us', '/es-mx/quienes-somos'];

const localHeaderNavigation = {
  en: [
    { href: '/solutions', label: 'Solutions' },
    { href: '/products-and-services', label: 'Products and services' },
    { href: '/sustainability', label: 'Sustainability' },
    { href: '/news-and-insights', label: 'News and insights' },
    { href: '/about-us', label: 'Who we are' },
  ],
  es: [
    { href: '/es-mx/soluciones', label: 'Soluciones' },
    {
      href: '/es-mx/productos-y-servicios',
      label: 'Productos y servicios',
    },
    { href: '/es-mx/sostenibilidad', label: 'Sostenibilidad' },
    {
      href: '/es-mx/noticias-y-analisis',
      label: 'Noticias y análisis',
    },
    { href: '/es-mx/quienes-somos', label: 'Quiénes somos' },
  ],
};

function isAboutLink(href?: string, text?: string): boolean {
  let normalizedHref: string | undefined;
  if (href) {
    try {
      normalizedHref = new URL(href, 'https://slb.local').pathname
        .replace(/\/$/, '')
        .toLowerCase();
    } catch {
      normalizedHref = href
        .split(/[?#]/, 1)[0]
        .replace(/\/$/, '')
        .toLowerCase();
    }
  }
  const normalizedText = text?.trim().toLocaleLowerCase();

  return Boolean(
    (normalizedHref && aboutPaths.includes(normalizedHref)) ||
      normalizedText === 'who we are' ||
      normalizedText === 'quiénes somos',
  );
}

type GlobalHeaderViewProps = Pick<GlobalHeaderProps, 'fields' | 'page'> & {
  forceLocalSlbChrome?: boolean;
};

const GlobalHeaderView: React.FC<GlobalHeaderViewProps> = ({
  fields,
  page,
  forceLocalSlbChrome = false,
}) => {
  const item = fields?.data?.item;
  const { logo, headerContact } = item ?? {};
  const links = item?.children?.results ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const pageEditing = page.mode.isEditing;
  const isSpanish = page.locale?.toLowerCase() === 'es-mx';
  const hasInheritedDatasource = hasLegacySolterraSignature(item);
  const useLocalSlbChrome = forceLocalSlbChrome || hasInheritedDatasource;
  const safeLinks = useLocalSlbChrome
    ? []
    : links.filter((item) => !hasLegacySolterraSignature(item));
  const logoField = useLocalSlbChrome ? undefined : getFieldValue(logo);
  const headerContactField = useLocalSlbChrome
    ? undefined
    : getFieldValue(headerContact);
  const localNavigation = isSpanish
    ? localHeaderNavigation.es
    : localHeaderNavigation.en;
  const localContact = isSpanish
    ? { href: '/es-mx/contactenos', label: 'Contáctenos' }
    : { href: '/contact-us', label: 'Contact us' };
  const homeHref = isSpanish ? '/es-mx' : '/';
  const homeLabel = isSpanish ? 'Inicio de SLB' : 'SLB home';
  const menuLabel = isSpanish ? 'Abrir menú' : 'Open menu';
  const navigationLabel = isSpanish ? 'Navegación' : 'Navigation';
  const aboutFallback = {
    href: isSpanish ? '/es-mx/quienes-somos' : '/about-us',
    label: isSpanish ? 'Quiénes somos' : 'Who we are',
  };
  const hasAboutLink = safeLinks.some((item) => {
    const field = getFieldValue(item.link);
    return isAboutLink(field?.value?.href, field?.value?.text);
  });
  const showAboutFallback = !pageEditing && !useLocalSlbChrome && !hasAboutLink;

  const [visible, setVisible] = useState(true);
  const previousScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setVisible(
        currentScrollY < 10 || currentScrollY < previousScrollY.current,
      );
      previousScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.header
        data-testid={
          useLocalSlbChrome ? 'slb-header-local-fallback' : undefined
        }
        initial={{ opacity: 1 }}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -80 }}
        transition={{ duration: 0.24, ease: [0.48, 0.14, 0.2, 0.69] }}
        className={cn(
          'bg-white text-foreground border-border @container sticky top-0 z-50 flex h-[72px] w-full items-center justify-center border-b motion-reduce:transition-none',
          'lg:h-[80px]',
          !visible && 'pointer-events-none',
        )}
      >
        <div className="slb-page-shell flex h-full items-center">
          <div className="mr-8 shrink-0 @lg:mr-12">
            {pageEditing && !useLocalSlbChrome ? (
              <Image field={logoField} className="max-h-14 w-auto" />
            ) : (
              <Link
                href={homeHref}
                aria-label={homeLabel}
                className="flex w-[96px] items-center @lg:w-[112px] [&_.image-container]:w-full"
              >
                {logoField?.value?.src ? (
                  <Logo logo={logoField} className="w-full" />
                ) : (
                  // The approved positive master is a fallback only; authored Sitecore media wins.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getSlbDamAssetUrl('slb-logo-positive-blue.svg')}
                    alt="SLB"
                    className="h-auto w-full"
                    data-testid="slb-logo-fallback"
                  />
                )}
              </Link>
            )}
          </div>
          {/* Desktop Navigation */}
          <div className="@lg:flex @lg:flex-1 hidden">
            <NavigationMenu aria-label={navigationLabel}>
              <NavigationMenuList>
                {useLocalSlbChrome
                  ? localNavigation.map((item) => (
                      <NavigationMenuItem key={item.href}>
                        <Button
                          variant="ghost"
                          asChild
                          className="font-body h-[50px] px-3 text-base font-medium hover:bg-transparent hover:text-primary"
                        >
                          <Link href={item.href}>{item.label}</Link>
                        </Button>
                      </NavigationMenuItem>
                    ))
                  : safeLinks.map((item, i) => {
                      const linkField = getFieldValue(item.link);

                      return (
                        <Fragment key={`desktop-nav-menu-list-item-${i}`}>
                          {linkField &&
                            (pageEditing || linkField.value?.href) && (
                              <NavigationMenuItem>
                                <Button
                                  variant="ghost"
                                  asChild
                                  className="font-body h-[50px] px-3 text-base font-medium hover:bg-transparent hover:text-primary"
                                >
                                  <CompatibleLink
                                    field={linkField}
                                    editable={pageEditing}
                                  />
                                </Button>
                              </NavigationMenuItem>
                            )}
                        </Fragment>
                      );
                    })}
                {showAboutFallback && (
                  <NavigationMenuItem>
                    <Button
                      variant="ghost"
                      asChild
                      className="font-body h-[50px] px-3 text-base font-medium hover:bg-transparent hover:text-primary"
                    >
                      <Link href={aboutFallback.href}>
                        {aboutFallback.label}
                      </Link>
                    </Button>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          {/* Desktop CTA */}
          {(useLocalSlbChrome ||
            (headerContactField &&
              (pageEditing || headerContactField.value?.href))) && (
            <div className="@lg:flex @lg:items-center @lg:justify-end hidden">
              <Button
                variant="outline"
                asChild
                className="font-heading rounded-none text-base"
              >
                {useLocalSlbChrome ? (
                  <Link href={localContact.href}>{localContact.label}</Link>
                ) : (
                  <CompatibleLink
                    field={headerContactField!}
                    editable={pageEditing}
                  />
                )}
              </Button>
            </div>
          )}
          {/* Mobile Navigation */}
          <div className="@lg:hidden flex flex-1 justify-end">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-none hover:bg-secondary [&_svg]:size-7"
                  aria-label={menuLabel}
                >
                  <Menu />
                  <span className="sr-only">{menuLabel}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                closeLabel={isSpanish ? 'Cerrar' : 'Close'}
                className="border-border w-[min(100%,28rem)] bg-white p-6 pt-20 [&>button_svg]:size-7"
              >
                <SheetTitle className="sr-only">{navigationLabel}</SheetTitle>
                <nav
                  aria-label={navigationLabel}
                  className="flex flex-col gap-px border-t border-border"
                >
                  {useLocalSlbChrome
                    ? localNavigation.map((item) => (
                        <Button
                          key={`${item.href}-mobile`}
                          variant="ghost"
                          asChild
                          className="h-[50px] w-full justify-start border-b border-border px-0 hover:bg-transparent hover:text-primary"
                          onClick={() => setIsOpen(false)}
                        >
                          <Link href={item.href}>{item.label}</Link>
                        </Button>
                      ))
                    : safeLinks.map((item) => {
                        const linkField = getFieldValue(item.link);

                        return (
                          linkField &&
                          (pageEditing || linkField.value?.href) && (
                            <Button
                              key={`${linkField.value.text}-mobile`}
                              variant="ghost"
                              asChild
                              className="h-[50px] w-full justify-start border-b border-border px-0 hover:bg-transparent hover:text-primary"
                              onClick={() => setIsOpen(false)}
                            >
                              <CompatibleLink
                                field={linkField}
                                editable={pageEditing}
                              />
                            </Button>
                          )
                        );
                      })}
                  {showAboutFallback && (
                    <Button
                      variant="ghost"
                      asChild
                      className="h-[50px] w-full justify-start border-b border-border px-0 hover:bg-transparent hover:text-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      <Link href={aboutFallback.href}>
                        {aboutFallback.label}
                      </Link>
                    </Button>
                  )}
                  {(useLocalSlbChrome ||
                    (headerContactField &&
                      (pageEditing || headerContactField.value?.href))) && (
                    <Button
                      variant="outline"
                      asChild
                      className="mt-6 w-full rounded-none"
                      onClick={() => setIsOpen(false)}
                    >
                      {useLocalSlbChrome ? (
                        <Link href={localContact.href}>
                          {localContact.label}
                        </Link>
                      ) : (
                        <CompatibleLink
                          field={headerContactField!}
                          editable={pageEditing}
                        />
                      )}
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.header>
    </AnimatePresence>
  );
};

export const LocalSlbHeader: React.FC<Pick<GlobalHeaderProps, 'page'>> = ({
  page,
}) => <GlobalHeaderView page={page} forceLocalSlbChrome />;

export const Default: React.FC<GlobalHeaderProps> = ({ fields, page }) => (
  <GlobalHeaderView fields={fields} page={page} />
);
