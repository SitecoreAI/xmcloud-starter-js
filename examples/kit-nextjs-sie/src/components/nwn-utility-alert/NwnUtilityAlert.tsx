'use client';

import { AlertTriangle, Info, Wrench } from 'lucide-react';
import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type {
  NwnUtilityAlertProps,
  NwnUtilityAlertTone,
} from './nwn-utility-alert.props';

const getTone = (value: string | undefined): NwnUtilityAlertTone => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'emergency') return 'emergency';
  if (normalized === 'service') return 'service';
  return 'information';
};

const toneStyles = {
  information: {
    container: 'border-primary bg-[#e4f4f7] text-slate-900',
    icon: 'bg-primary text-white',
    eyebrow: 'text-primary',
    Icon: Info,
  },
  service: {
    container: 'border-cyan-500 bg-white text-slate-900',
    icon: 'bg-cyan-500 text-white',
    eyebrow: 'text-[#006f91]',
    Icon: Wrench,
  },
  emergency: {
    container: 'border-red-700 bg-red-50 text-red-950',
    icon: 'bg-red-700 text-white',
    eyebrow: 'text-red-800',
    Icon: AlertTriangle,
  },
} as const;

export const Default: React.FC<NwnUtilityAlertProps> = (props) => {
  const { fields } = props;
  const isPageEditing = props.page.mode.isEditing;

  if (!fields) {
    return isPageEditing ? (
      <NoDataFallback componentName="NWN Utility Alert" />
    ) : null;
  }

  const {
    eyebrow,
    title,
    message,
    primaryLink,
    secondaryLink,
    tone: toneField,
  } = fields;
  const tone = getTone(toneField?.value);
  const styles = toneStyles[tone];
  const Icon = styles.Icon;
  const hasContent = Boolean(
    eyebrow?.value ||
      title?.value ||
      message?.value ||
      primaryLink?.value?.href ||
      secondaryLink?.value?.href,
  );

  if (!hasContent && !isPageEditing) return null;

  return (
    <aside
      data-component="NwnUtilityAlert"
      data-tone={tone}
      role={tone === 'emergency' ? 'alert' : 'status'}
      aria-live={tone === 'emergency' ? 'assertive' : 'polite'}
      className={cn(
        'nwn-utility-alert border-l-[0.5rem] py-5',
        styles.container,
        props.params?.styles,
      )}
    >
      <div className="nwn-content-shell grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 sm:gap-x-5 lg:flex lg:items-start">
        <span
          className={cn(
            'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            styles.icon,
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          {(isPageEditing || eyebrow?.value) && (
            <Text
              tag="p"
              field={eyebrow}
              className={cn(
                'font-heading text-sm font-semibold uppercase tracking-[0.14em]',
                styles.eyebrow,
              )}
            />
          )}
          <Text
            tag="h2"
            field={title}
            className="mt-1 font-heading text-2xl font-semibold leading-tight"
          />
          <RichText
            field={message}
            className="mt-2 max-w-3xl text-base leading-7 opacity-90"
          />
          {!hasContent && isPageEditing && (
            <p className="mt-2 text-sm opacity-70">
              Add alert copy and select information, service or emergency tone.
            </p>
          )}
        </div>

        <div className="col-span-2 flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:shrink-0 lg:justify-end">
          {primaryLink && (
            <EditableButton
              buttonLink={primaryLink}
              isPageEditing={isPageEditing}
              variant={tone === 'emergency' ? 'destructive' : 'default'}
              className="min-h-11 w-full px-5 text-base sm:w-auto"
              page={props.page}
            />
          )}
          {secondaryLink && (
            <EditableButton
              buttonLink={secondaryLink}
              isPageEditing={isPageEditing}
              variant="tertiary"
              className="min-h-11 w-full border border-current bg-white px-5 text-base sm:w-auto"
              page={props.page}
            />
          )}
        </div>
      </div>
    </aside>
  );
};
