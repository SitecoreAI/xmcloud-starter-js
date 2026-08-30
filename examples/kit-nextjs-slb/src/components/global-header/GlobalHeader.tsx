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

const aboutPaths = ['/about-us', '/es-mx/quienes-somos'];

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

export const Default: React.FC<GlobalHeaderProps> = (props) => {
  const { fields, page } = props ?? {};
  const { logo, headerContact } = fields?.data?.item ?? {};
  const links = fields?.data?.item?.children?.results ?? [];
  const logoField = getFieldValue(logo);
  const headerContactField = getFieldValue(headerContact);
  const [isOpen, setIsOpen] = useState(false);
  const pageEditing = page.mode.isEditing;
  const isSpanish = page.locale?.toLowerCase() === 'es-mx';
  const aboutFallback = {
    href: isSpanish ? '/es-mx/quienes-somos' : '/about-us',
    label: isSpanish ? 'Quiénes somos' : 'Who we are',
  };
  const hasAboutLink = links.some((item) => {
    const field = getFieldValue(item.link);
    return isAboutLink(field?.value?.href, field?.value?.text);
  });
  const showAboutFallback = !pageEditing && !hasAboutLink;

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
            {pageEditing ? (
              <Image field={logoField} className="max-h-14 w-auto" />
            ) : (
              <Link
                href="/"
                aria-label="SLB home"
                className="flex w-[96px] items-center @lg:w-[112px] [&_.image-container]:w-full"
              >
                {logoField?.value?.src ? (
                  <Logo logo={logoField} className="w-full" />
                ) : (
                  // The approved positive master is a fallback only; authored Sitecore media wins.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/images/slb/slb-logo-positive-blue.svg"
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
            <NavigationMenu>
              <NavigationMenuList>
                {links &&
                  links.length > 0 &&
                  links.map((item, i) => {
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
          {headerContactField &&
            (pageEditing || headerContactField.value?.href) && (
              <div className="@lg:flex @lg:items-center @lg:justify-end hidden">
                <Button
                  variant="outline"
                  asChild
                  className="font-heading rounded-none text-base"
                >
                  <CompatibleLink
                    field={headerContactField}
                    editable={pageEditing}
                  />
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
                >
                  <Menu />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="border-border w-[min(100%,28rem)] bg-white p-6 pt-20 [&>button_svg]:size-7"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <nav className="flex flex-col gap-px border-t border-border">
                  {links &&
                    links.length > 0 &&
                    links.map((item) => {
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
                  {headerContactField &&
                    (pageEditing || headerContactField.value?.href) && (
                      <Button
                        variant="outline"
                        asChild
                        className="mt-6 w-full rounded-none"
                        onClick={() => setIsOpen(false)}
                      >
                        <CompatibleLink
                          field={headerContactField}
                          editable={pageEditing}
                        />
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
