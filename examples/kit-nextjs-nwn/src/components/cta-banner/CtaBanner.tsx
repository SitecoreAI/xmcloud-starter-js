import { cva } from 'class-variance-authority';
import { Text } from '@sitecore-content-sdk/nextjs';
import { Button } from '@/components/ui/button';
import { CompatibleLink } from '@/components/content-sdk/CompatibleLink';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { CtaBannerProps } from './cta-banner.props';

const ctaBannerVariants = cva(
  'nwn-cta-banner relative isolate w-full overflow-hidden border-y border-cyan-700/20 text-center',
  {
    variants: {
      colorScheme: {
        default: 'bg-white text-foreground',
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-muted text-foreground',
      },
    },
    defaultVariants: {
      colorScheme: 'primary',
    },
  },
);

const ctaTitleVariants = cva(
  'mx-auto mb-5 max-w-[18ch] text-balance font-heading text-[clamp(2rem,3.5vw,2.75rem)] font-medium leading-[1.08] tracking-[-0.02em] antialiased',
  {
    variants: {
      colorScheme: {
        default: 'text-primary',
        primary: 'text-primary-foreground',
        secondary: 'text-primary',
      },
    },
  },
);

const ctaButtonVariants = cva(
  'h-auto min-h-12 whitespace-normal px-6 text-center text-base font-heading font-semibold leading-6',
  {
    variants: {
      colorScheme: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        primary: 'bg-white text-primary hover:bg-cyan-50',
        secondary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      },
    },
  },
);

export const Default: React.FC<CtaBannerProps> = (props) => {
  const { isEditing } = props.page.mode;
  const { fields, params } = props;

  if (fields) {
    const { titleRequired, descriptionOptional, linkOptional } = fields || {};
    const colorScheme = params.colorScheme ?? 'primary';

    return (
      <section className={ctaBannerVariants({ colorScheme })}>
        <div className="nwn-content-shell nwn-cta-content relative z-10 py-12 sm:py-16 lg:py-18">
          <div className="mx-auto w-full max-w-4xl">
            {/* Use Text component with fallback for heading */}
            <AnimatedSection direction="up" isPageEditing={isEditing}>
              <Text
                tag="h2"
                className={ctaTitleVariants({ colorScheme })}
                field={titleRequired}
              />
              <Text
                tag="p"
                className={
                  isEditing || descriptionOptional?.value
                    ? 'mx-auto mb-8 max-w-2xl text-lg leading-8 antialiased'
                    : 'hidden'
                }
                field={descriptionOptional}
              />

              {/* Render button with link */}
              {linkOptional && (
                <Button className={ctaButtonVariants({ colorScheme })} asChild>
                  <CompatibleLink
                    field={linkOptional}
                    editable={isEditing}
                    prefetch={false}
                  />
                </Button>
              )}
            </AnimatedSection>
            {/* Use Text component with fallback for subheading */}
          </div>
        </div>
      </section>
    );
  }

  return <NoDataFallback componentName="CTA Banner" />;
};
