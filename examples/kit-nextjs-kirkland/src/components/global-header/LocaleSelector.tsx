'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

type LocaleSelectorProps = {
  className?: string;
  locale?: string;
};

export const LocaleSelector = ({ className, locale }: LocaleSelectorProps) => {
  const pathname = usePathname() || '/';
  const currentLocale = getLocaleOption(locale);

  useEffect(() => {
    document.documentElement.lang = currentLocale.hrefLang;
  }, [currentLocale.hrefLang]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'font-body h-11 min-w-11 gap-1.5 bg-transparent px-2 text-sm font-medium hover:bg-white/10 @[480px]:px-3',
            className,
          )}
          aria-label={`Region and language: ${currentLocale.country}, ${currentLocale.language}`}
        >
          <Globe2 aria-hidden="true" className="size-4" />
          <span className="hidden whitespace-nowrap @[480px]:inline">
            {currentLocale.shortLabel}
          </span>
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="font-body w-64 border-white/10 bg-[#111820] p-2 text-white shadow-2xl"
      >
        <DropdownMenuLabel className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-[0.16em] text-white/60">
          Region and language
        </DropdownMenuLabel>
        {LOCALE_OPTIONS.map((option) => {
          const isCurrent = option.code === currentLocale.code;

          return (
            <DropdownMenuItem
              key={option.code}
              asChild
              className="cursor-pointer rounded-sm p-0 focus:bg-white/10 focus:text-white"
            >
              <Link
                href={getLocalizedPathname(pathname, option.code)}
                hrefLang={option.hrefLang}
                prefetch={false}
                aria-current={isCurrent ? 'page' : undefined}
                className="flex w-full items-center gap-3 px-3 py-2.5 outline-none"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{option.country}</span>
                  <span className="text-xs text-white/60">
                    {option.language}
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
