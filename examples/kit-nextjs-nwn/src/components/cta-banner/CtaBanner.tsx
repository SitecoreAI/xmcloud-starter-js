import { cva } from 'class-variance-authority';
import { Text, Link } from '@sitecore-content-sdk/nextjs';
import { Button } from '@/components/ui/button';
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
  'mx-auto mb-5 max-w-[18ch] text-balance font-heading text-3xl font-medium leading-[1.08] tracking-[-0.02em] antialiased sm:text-4xl md:text-5xl',
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
  'min-h-12 px-6 text-base font-heading font-semibold',
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
        <div className="nwn-content-shell nwn-cta-content relative z-10 py-16 sm:py-20 lg:py-24">
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
                className="mx-auto mb-8 max-w-2xl text-lg leading-8 antialiased sm:text-xl"
                field={descriptionOptional}
              />

              {/* Render button with link */}
              {linkOptional && (
                <Button className={ctaButtonVariants({ colorScheme })} asChild>
                  <Link field={linkOptional} editable={isEditing} />
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
