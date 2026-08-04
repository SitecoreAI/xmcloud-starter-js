'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CompatibleLink } from '@/components/content-sdk/CompatibleLink';
import { Menu, Search } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import type { GlobalHeaderProps } from './global-header.props';
import { Button } from '@/components/ui/button';
import { useMatchMedia } from '@/hooks/use-match-media';
import { AnimatedHoverNav } from '@/components/ui/animated-hover-nav';
import { getLocaleOption, getLocalizedPathname } from '@/i18n/locales';
import { LocaleSelector } from './LocaleSelector';

export const GlobalHeaderCentered: React.FC<GlobalHeaderProps> = (props) => {
  const { fields, isPageEditing } = props ?? {};
  const { logo, primaryNavigationLinks, headerContact } =
    fields?.data?.item ?? {};
  const hasLogoImage = Boolean(logo?.jsonValue?.value?.src);
  const currentLocale = getLocaleOption(props.page.locale);
  const localizedHomeHref = getLocalizedPathname('/', currentLocale.code);
  const localizedSearchHref = getLocalizedPathname(
    '/site-search',
    currentLocale.code,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [sheetAnimationComplete, setSheetAnimationComplete] = useState(false);
  const [visible, setVisible] = useState(true);
  const [prevScrollY, setPrevScrollY] = useState(0);
  const isReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
  const navRef = useRef<HTMLDivElement>(null);
  // Reset sheet animation state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setSheetAnimationComplete(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setVisible(true);
      } else if (currentScrollY < prevScrollY) {
        setVisible(true);
      } else if (currentScrollY > 10 && currentScrollY > prevScrollY) {
        setVisible(false);
      }
      setPrevScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollY]);

  // Sheet animation duration in seconds
  const sheetAnimationDuration = isReducedMotion ? 0 : 0.3;

  return (
    <AnimatePresence mode="wait" data-component="GlobalHeader">
      <m.header
        initial={{ opacity: 1 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: isReducedMotion ? 0 : 0.2 }}
        className={cn(
          'bg-background/80 @container sticky top-0 z-50 flex h-[88px] w-full items-center justify-center backdrop-blur-md',
        )}
      >
        <div className="legal-content-shell relative flex h-16 items-center justify-between">
          {/* Desktop Navigation */}
          <nav
            className="@[1200px]:flex @[1200px]:flex-[2] z-10 hidden"
            ref={navRef}
            aria-label="Primary navigation"
          >
            <NavigationMenu className="w-full">
              <div className="relative w-full">
                <AnimatedHoverNav
                  mobileBreakpoint="xs"
                  parentRef={navRef}
                  indicatorClassName="bg-primary rounded-sm absolute inset-0 z-[-1] block"
                >
                  <NavigationMenuList className="flex w-full justify-between">
                    {primaryNavigationLinks?.targetItems &&
                      primaryNavigationLinks.targetItems.length > 0 &&
                      primaryNavigationLinks?.targetItems.map((item, index) => (
                        <NavigationMenuItem
                          key={`${item.link?.jsonValue?.value?.text}-${index}`}
                        >
                          {item.link?.jsonValue &&
                            (isPageEditing ||
                              item.link.jsonValue?.value?.href) && (
                              <Button
                                variant="ghost"
                                asChild
                                className="font-body bg-transparent text-sm font-medium hover:bg-transparent"
                              >
                                <CompatibleLink
                                  field={item.link?.jsonValue}
                                  editable={isPageEditing}
                                  prefetch={false}
                                />
                              </Button>
                            )}
                        </NavigationMenuItem>
                      ))}
                  </NavigationMenuList>
                </AnimatedHoverNav>
              </div>
            </NavigationMenu>
          </nav>
          <div
            data-component-part="header-logo"
            className="@[480px]:w-[320px] @[720px]:left-1/2 @[720px]:-translate-x-1/2 absolute left-5 top-1/2 z-20 flex w-[224px] -translate-y-1/2 items-center justify-center [&_.image-container]:mx-auto [&_.image-container]:w-full"
          >
            {!isPageEditing ? (
              <Link
                href={localizedHomeHref}
                aria-label="Kirkland & Ellis home"
                className="flex w-full items-center justify-center"
                prefetch={false}
              >
                {hasLogoImage ? (
                  <ImageWrapper
                    image={logo?.jsonValue}
                    wrapperClass="pointer-events-none w-full"
                    className="w-full object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    alt="Home"
                    page={props.page}
                  />
                ) : (
                  <span className="font-heading whitespace-nowrap text-xl font-medium leading-none tracking-tight">
                    Kirkland &amp; Ellis
                  </span>
                )}
              </Link>
            ) : (
              <div className="relative flex min-h-8 w-full items-center justify-center">
                {!hasLogoImage && (
                  <span className="font-heading pointer-events-none whitespace-nowrap text-xl font-medium leading-none tracking-tight">
                    Kirkland &amp; Ellis
                  </span>
                )}
                <ImageWrapper
                  image={logo?.jsonValue}
                  wrapperClass={cn(!hasLogoImage && 'absolute inset-0 min-h-8')}
                  className="w-full object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  alt="Home"
                  page={props.page}
                />
              </div>
            )}
          </div>
          {/* Desktop region selector and CTA */}
          <div className="@[1200px]:flex @[1200px]:items-center @[1200px]:justify-end @[1200px]:flex-1 z-10 hidden gap-1">
            {headerContact?.jsonValue?.value && (
              <Button asChild className="font-body text-base font-medium">
                <CompatibleLink
                  field={headerContact.jsonValue}
                  editable={isPageEditing}
                  prefetch={false}
                />
              </Button>
            )}
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-11 flex-none bg-transparent hover:bg-white/10"
            >
              <Link
                href={localizedSearchHref}
                aria-label="Search Kirkland & Ellis"
                prefetch={false}
              >
                <Search aria-hidden="true" className="size-5" />
              </Link>
            </Button>
            <LocaleSelector locale={currentLocale.code} />
          </div>
          {/* Mobile Navigation */}
          <div className="@[1200px]:hidden z-10 flex flex-1 items-center justify-end gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-11 flex-none bg-transparent hover:bg-white/10"
            >
              <Link
                href={localizedSearchHref}
                aria-label="Search Kirkland & Ellis"
                prefetch={false}
              >
                <Search aria-hidden="true" className="size-5" />
              </Link>
            </Button>
            <LocaleSelector locale={currentLocale.code} />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <AnimatePresence>
                {isOpen && (
                  <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-background/30 fixed inset-0 z-40 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                  />
                )}
              </AnimatePresence>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-transparent [&_svg]:size-8"
                >
                  <Menu />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="bg-background/60 h-[100dvh] border-t-0 p-0 backdrop-blur-md [&>button_svg]:size-8"
              >
                <m.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{
                    duration: sheetAnimationDuration,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onAnimationComplete={() => setSheetAnimationComplete(true)}
                  className="my-12 flex h-full w-full flex-col p-6"
                >
                  <AnimatePresence>
                    {sheetAnimationComplete && (
                      <m.nav
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col space-y-4"
                      >
                        {primaryNavigationLinks?.targetItems &&
                          primaryNavigationLinks.targetItems.length > 0 &&
                          primaryNavigationLinks?.targetItems.map(
                            (item, index) => (
                              <m.div
                                key={`${item.link?.jsonValue?.value?.text}-mobile`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  delay: 0.05 * index,
                                  duration: isReducedMotion ? 0 : 0.3,
                                }}
                                className="flex justify-center"
                              >
                                <Button
                                  variant="ghost"
                                  asChild
                                  onClick={() => setIsOpen(false)}
                                >
                                  <CompatibleLink
                                    field={item.link?.jsonValue}
                                    editable={isPageEditing}
                                    prefetch={false}
                                  />
                                </Button>
                              </m.div>
                            ),
                          )}
                        {headerContact?.jsonValue?.value && (
                          <m.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: primaryNavigationLinks?.targetItems?.length
                                ? 0.05 *
                                  primaryNavigationLinks.targetItems.length
                                : 0,
                              duration: isReducedMotion ? 0 : 0.3,
                            }}
                            className="flex justify-center"
                          >
                            <Button asChild onClick={() => setIsOpen(false)}>
                              <CompatibleLink
                                field={headerContact.jsonValue}
                                editable={isPageEditing}
                                prefetch={false}
                              />
                            </Button>
                          </m.div>
                        )}
                      </m.nav>
                    )}
                  </AnimatePresence>
                </m.div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </m.header>
    </AnimatePresence>
  );
};
