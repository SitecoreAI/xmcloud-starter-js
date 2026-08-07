'use client';

import { useState } from 'react';
import { Text } from '@sitecore-content-sdk/nextjs';
import { ButtonBase } from '@/components/button-component/ButtonComponent';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { AlertBannerProps } from './alert-banner.props';

export const Default: React.FC<AlertBannerProps> = (props) => {
  const { fields } = props;
  const { title, description, link } = fields;
  const [isHidden, setIsHidden] = useState(false);

  if (fields) {
    return (
      <aside role="complementary" aria-label="Alert notification">
        <Alert
          className={cn(
            'relative rounded-none border-none bg-primary px-4 py-5 text-white sm:py-6',
            { hidden: isHidden },
          )}
        >
          <div className="nwn-content-shell flex items-center justify-center text-center">
            <div className="max-w-5xl space-y-2">
              <AlertTitle className="text-white">
                <Text
                  className="font-heading text-xl font-bold leading-tight text-white"
                  field={title}
                />
              </AlertTitle>
              <AlertDescription className="text-white">
                <Text
                  tag="p"
                  className="font-body text-lg font-semibold leading-7 text-white sm:text-xl"
                  field={description}
                />
              </AlertDescription>
              {link?.value?.href && (
                <ButtonBase
                  buttonLink={link}
                  variant="secondary"
                  className="mt-2 bg-[#414042] text-white hover:bg-[#2f2e30]"
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 text-white hover:bg-white/15 hover:text-white sm:right-4 sm:top-4"
              onClick={() => setIsHidden(true)}
              aria-label="Dismiss alert"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </Alert>
      </aside>
    );
  }
  return <NoDataFallback componentName="Alert Banner" />;
};
