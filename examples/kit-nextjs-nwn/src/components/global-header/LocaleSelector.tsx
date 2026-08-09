'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getLocaleOption,
  getLocalizedPathname,
  LOCALE_OPTIONS,
} from '@/i18n/locales';
import { usePublicPathname } from '@/hooks/use-public-pathname';
import { cn } from '@/lib/utils';

type LocaleSelectorProps = {
  className?: string;
  locale?: string;
};

export const LocaleSelector = ({ className, locale }: LocaleSelectorProps) => {
  const pathname = usePublicPathname();
  const currentLocale = getLocaleOption(locale);
  const isSpanish = currentLocale.code === 'es-MX';

  useEffect(() => {
    document.documentElement.lang = currentLocale.hrefLang;
  }, [currentLocale.hrefLang]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-11 min-w-11 gap-1.5 border border-slate-300 bg-white px-2 text-sm font-semibold text-primary hover:bg-cyan-50 hover:text-primary sm:px-3',
            className,
          )}
          aria-label={`${isSpanish ? 'Idioma' : 'Language'}: ${currentLocale.language}`}
        >
          <Globe aria-hidden="true" className="size-4" />
          <span className="hidden whitespace-nowrap sm:inline">
            {currentLocale.shortLabel}
          </span>
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 border-slate-200 bg-white p-2 text-slate-900 shadow-xl"
      >
        <DropdownMenuLabel className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {isSpanish ? 'Seleccionar idioma' : 'Select language'}
        </DropdownMenuLabel>
        {LOCALE_OPTIONS.map((option) => {
          const isCurrent = option.code === currentLocale.code;

          return (
            <DropdownMenuItem
              key={option.code}
              asChild
              className="cursor-pointer rounded-sm p-0 focus:bg-cyan-50 focus:text-primary"
            >
              <Link
                href={getLocalizedPathname(pathname, option.code)}
                hrefLang={option.hrefLang}
                prefetch={false}
                aria-current={isCurrent ? 'page' : undefined}
                className="flex w-full items-center gap-3 px-3 py-2.5 outline-none"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold">
                    {option.language}
                  </span>
                  <span className="text-xs text-slate-500">
                    {option.country}
                  </span>
                </span>
                {isCurrent && (
                  <Check aria-hidden="true" className="size-4 text-primary" />
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
