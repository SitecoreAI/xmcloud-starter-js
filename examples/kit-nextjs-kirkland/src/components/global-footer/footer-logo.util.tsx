import type React from 'react';
import type { ImageField, Page } from '@sitecore-content-sdk/nextjs';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { cn } from '@/lib/utils';

type FooterLogoProps = {
  align?: 'left' | 'center' | 'right';
  className?: string;
  isPageEditing: boolean;
  logo?: ImageField;
  page: Page;
};

const alignmentClasses = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

export const FooterLogo: React.FC<FooterLogoProps> = ({
  align = 'left',
  className,
  isPageEditing,
  logo,
  page,
}) => {
  const hasLogoImage = Boolean(logo?.value?.src);

  if (!hasLogoImage && !isPageEditing) {
    return null;
  }

  return (
    <div
      className={cn('mt-10 flex w-full', alignmentClasses[align], className)}
      data-component="footer-logo"
    >
      <div className="w-full max-w-[300px]">
        <ImageWrapper
          image={logo}
          page={page}
          wrapperClass={cn(
            'flex min-h-14 w-full items-center',
            alignmentClasses[align],
            isPageEditing &&
              !hasLogoImage &&
              'rounded-sm border border-dashed border-current/30 p-3',
          )}
          className="h-auto max-h-[72px] w-full object-contain"
          sizes="(max-width: 768px) 240px, 300px"
          alt="Kirkland & Ellis"
        />
      </div>
    </div>
  );
};
