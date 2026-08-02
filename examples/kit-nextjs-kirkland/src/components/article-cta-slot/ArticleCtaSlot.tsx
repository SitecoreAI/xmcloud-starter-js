import { Flex, FlexItem } from '@/components/flex/Flex.dev';
import { cn } from '@/lib/utils';
import { AppPlaceholder } from '@sitecore-content-sdk/nextjs';
import { cva } from 'class-variance-authority';
import { Children } from 'react';
import { ArticleCtaSlotProps } from './article-cta-slot.props';

const PLACEHOLDER_FRAGMENT = 'kirkland-article-cta';

const hasRenderingContent = (value: unknown): boolean =>
  Array.isArray(value) ? value.length > 0 : Boolean(value);

const articleCtaSlotVariants = cva(['group @container article-cta-slot'], {
  variants: {
    backgroundColor: {
      primary: ['has-bg bg-primary text-primary-foreground'],
      secondary: ['has-bg bg-secondary text-secondary-foreground'],
      tertiary: ['has-bg bg-tertiary text-tertiary-foreground'],
      transparent: 'bg-transparent',
    },
    inset: {
      false: null,
      true: [
        'is-inset mx-4 max-w-[1408px] overflow-hidden rounded-3xl px-4 sm:px-8 md:px-16 2xl:px-24 min-[1440px]:mx-auto',
      ],
    },
    margin: {
      defaultMargin: 'my-8 sm:my-16',
      excludeMargin: 'my-0',
    },
    padding: {
      backgroundPadding: 'py-4 sm:py-16',
      noPadding: 'py-0',
    },
  },
  defaultVariants: {
    backgroundColor: 'transparent',
    inset: false,
    margin: 'defaultMargin',
    padding: 'noPadding',
  },
});

export const Default: React.FC<ArticleCtaSlotProps> = (props) => {
  const { children, componentMap, page, rendering } = props;
  const { isEditing } = page.mode;

  const placeholderName = `${PLACEHOLDER_FRAGMENT}-${props.params.DynamicPlaceholderId}`;
  const hasPlaceholderContent =
    hasRenderingContent(rendering?.placeholders?.[placeholderName]) ||
    hasRenderingContent(
      rendering?.placeholders?.[`${PLACEHOLDER_FRAGMENT}-{*}`],
    ) ||
    Children.count(children) > 0;

  if (!hasPlaceholderContent && !isEditing) {
    return null;
  }

  const backgroundImage = props.params.backgroundImagePath ?? '';
  // Article CTAs use the firm's secondary blue treatment by default. Authors can
  // still select another configured background in Page Builder.
  const backgroundColor = props.params.backgroundColor ?? 'secondary';
  const inset =
    backgroundColor === 'transparent'
      ? false
      : props.params.inset === '1'
        ? true
        : false;
  const padding =
    inset || backgroundColor === 'transparent'
      ? 'noPadding'
      : 'backgroundPadding';
  const margin =
    props.params.excludeTopMargin === '1' ? 'excludeMargin' : 'defaultMargin';

  return (
    <section
      data-component="ArticleCtaSlot"
      className={cn(
        articleCtaSlotVariants({ backgroundColor, inset, margin, padding }),
        props.params.styles,
        isEditing && !hasPlaceholderContent && 'min-h-20',
      )}
      style={{
        ...(backgroundImage && {
          backgroundImage: `url('${backgroundImage}')`,
          backgroundSize: 'cover',
        }),
      }}
    >
      <Flex fullBleed className="group-[.is-inset]:p-0">
        <FlexItem basis="full">
          <AppPlaceholder
            page={page}
            componentMap={componentMap}
            name={placeholderName}
            rendering={rendering}
          />
        </FlexItem>
      </Flex>
    </section>
  );
};
