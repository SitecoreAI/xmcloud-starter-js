import { cva } from 'class-variance-authority';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { Text, Link } from '@sitecore-content-sdk/nextjs';
import { getDescriptiveLinkText } from '@/utils/link-text';
import { CtaBannerProps } from './cta-banner.props';

const ctaBannerVariants = cva(
  'relative isolate w-full overflow-hidden border-y border-border',
  {
    variants: {
      colorScheme: {
        default: 'bg-white text-dark',
        primary: 'border-primary bg-primary text-primary-foreground',
        secondary: 'border-secondary bg-secondary text-secondary-foreground',
      },
    },
    defaultVariants: {
      colorScheme: 'default',
    },
  },
);

const ctaEyebrowVariants = cva(
  'mb-4 flex items-center gap-3 font-heading text-xs font-medium uppercase tracking-[0.22em]',
  {
    variants: {
      colorScheme: {
        default: 'text-primary',
        primary: 'text-primary-foreground/80',
        secondary: 'text-primary',
      },
    },
    defaultVariants: {
      colorScheme: 'default',
    },
  },
);

const ctaTitleVariants = cva(
  'font-heading text-pretty text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.03em] antialiased',
  {
    variants: {
      colorScheme: {
        default: 'text-dark',
        primary: 'text-primary-foreground',
        secondary: 'text-secondary-foreground',
      },
    },
    defaultVariants: {
      colorScheme: 'default',
    },
  },
);

const ctaDescriptionVariants = cva(
  'font-body max-w-[42rem] text-base leading-7 antialiased sm:text-lg',
  {
    variants: {
      colorScheme: {
        default: 'text-foreground/75',
        primary: 'text-primary-foreground/85',
        secondary: 'text-secondary-foreground/80',
      },
    },
    defaultVariants: {
      colorScheme: 'default',
    },
  },
);

const ctaButtonVariants = cva(
  'min-h-11 w-fit rounded-none border-2 px-5 py-3 font-heading text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2',
  {
    variants: {
      colorScheme: {
        default:
          'border-primary bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-primary',
        primary:
          'border-white bg-white text-primary hover:border-secondary hover:bg-secondary focus-visible:ring-white focus-visible:ring-offset-primary',
        secondary:
          'border-primary bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-primary focus-visible:ring-offset-secondary',
      },
    },
    defaultVariants: {
      colorScheme: 'default',
    },
  },
);

export const Default: React.FC<CtaBannerProps> = (props) => {
  const isPageEditing = props.page.mode.isEditing;
  const { fields, params } = props;

  if (fields) {
    const { titleRequired, descriptionOptional, linkOptional } = fields || {};
    const colorScheme = params.colorScheme ?? undefined;

    return (
      <section
        id={params?.RenderingIdentifier || undefined}
        className={ctaBannerVariants({ colorScheme })}
        data-component="CtaBanner"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-accent"
        />
        <div
          aria-hidden="true"
          className="absolute -right-16 top-0 h-full w-40 bg-current opacity-[0.035] sm:w-64"
        />
        <div className="slb-page-shell relative py-10 sm:py-12 lg:py-14">
          <AnimatedSection
            direction="up"
            isPageEditing={isPageEditing}
            className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-end lg:gap-16"
          >
            <div className="max-w-3xl">
              <div
                aria-hidden="true"
                className={ctaEyebrowVariants({ colorScheme })}
              >
                <span>SLB</span>
                <span className="h-px w-10 bg-current opacity-60" />
              </div>
              <Text
                tag="h2"
                className={ctaTitleVariants({ colorScheme })}
                field={titleRequired}
              />
            </div>

            <div className="flex max-w-2xl flex-col items-start gap-6 lg:pb-1">
              <Text
                tag="p"
                className={ctaDescriptionVariants({ colorScheme })}
                field={descriptionOptional}
              />

              {linkOptional && (
                <Button className={ctaButtonVariants({ colorScheme })} asChild>
                  <Link
                    field={
                      !isPageEditing && linkOptional?.value?.text
                        ? {
                            ...linkOptional,
                            value: {
                              ...linkOptional.value,
                              text: getDescriptiveLinkText(
                                linkOptional,
                                titleRequired?.value,
                              ),
                            },
                          }
                        : linkOptional
                    }
                    editable={isPageEditing}
                  />
                </Button>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>
    );
  }

  return <NoDataFallback componentName="CTA Banner" />;
};
