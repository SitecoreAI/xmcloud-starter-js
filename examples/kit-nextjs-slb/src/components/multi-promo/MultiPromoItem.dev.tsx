import { Link, RichText, Text } from '@sitecore-content-sdk/nextjs';
import { Button } from '@/components/ui/button';
import { MultiPromoItemProps } from '@/components/multi-promo/multi-promo.props';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { getFieldValue } from '@/lib/component-props';
import { cn } from '@/lib/utils';
import { getDescriptiveLinkText } from '@/utils/link-text';
const mapToItemProps = (fields: MultiPromoItemProps) => {
  return {
    title: getFieldValue(fields?.heading),
    description: getFieldValue(fields?.description),
    image: getFieldValue(fields?.image),
    link: getFieldValue(fields?.link),
    isPageEditing: fields?.isPageEditing,
    itemNumber: fields?.itemNumber,
    presentation: fields?.presentation,
  };
};

export const Default: React.FC<MultiPromoItemProps> = (props) => {
  const itemProps = mapToItemProps(props || {});
  const {
    title,
    description,
    image,
    link,
    isPageEditing,
    itemNumber,
    presentation,
  } = itemProps || {};
  const isCardGrid = presentation === 'card-grid';
  const isDarkRail = presentation === 'content-rail';
  const isRelated = presentation === 'related';
  const isSlbEditorial = isCardGrid || isDarkRail || isRelated;

  return (
    <article
      data-slb-presentation={presentation || undefined}
      className={cn('group flex h-full flex-col', {
        'border-b border-r border-border bg-background': !isSlbEditorial,
        'border-b border-r border-[#cbd3ef] bg-white': isCardGrid,
        'bg-transparent text-white': isDarkRail,
        'border-b border-white/20 bg-transparent text-white': isRelated,
      })}
    >
      {((isPageEditing && !isRelated) || image?.value?.src) && (
        <ImageWrapper
          image={image}
          className="absolute inset-0 h-full w-full rounded-none object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          wrapperClass={cn(
            'relative w-full overflow-hidden bg-secondary',
            isDarkRail ? 'min-h-52' : 'aspect-[4/3]',
          )}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 400px"
        />
      )}
      <div
        className={cn('flex flex-1 flex-col', {
          'px-6 py-7 @lg:px-8 @lg:py-9': !isSlbEditorial,
          'gap-5 px-7 py-8 @lg:px-8 @lg:py-9': isCardGrid,
          'gap-5 py-7': isDarkRail,
          'gap-4 py-8': isRelated,
        })}
      >
        {isCardGrid && typeof itemNumber === 'number' && (
          <span className="font-heading text-xs font-bold tracking-[0.12em] text-primary">
            {String(itemNumber).padStart(2, '0')}
          </span>
        )}
        {(isDarkRail || isRelated) && (
          <span aria-hidden="true" className="mb-1 h-1 w-16 bg-accent" />
        )}
        {(isPageEditing || title?.value) && (
          <Text
            tag="h3"
            field={title}
            className={cn(
              'font-heading text-box-trim-both text-box-edge-asc-desc text-pretty text-2xl font-normal leading-[1.15] tracking-[-0.025em] transition-colors @lg:text-[2rem]',
              isDarkRail || isRelated
                ? 'text-white group-hover:text-accent'
                : 'text-dark group-hover:text-primary',
            )}
          />
        )}
        {(isPageEditing || description?.value) && (
          <RichText
            field={description}
            className={cn(
              'prose max-w-none text-base leading-7',
              isSlbEditorial ? 'mt-0' : 'mt-5',
              isDarkRail || isRelated
                ? 'text-[#dfe5ff] [&_p]:text-[#dfe5ff]'
                : 'text-foreground/75',
            )}
          />
        )}
        {link?.value?.href && (
          <Button
            variant="link"
            asChild
            className={cn(
              'text-box-trim-both text-box-edge-asc-desc mt-auto h-auto justify-start self-start px-0 pb-0 text-sm font-semibold underline decoration-2 underline-offset-4',
              isSlbEditorial ? 'pt-4' : 'pt-8',
              isDarkRail || isRelated
                ? 'text-white decoration-accent hover:text-accent'
                : 'text-primary hover:text-dark',
            )}
          >
            <Link
              field={
                // Enhance link with descriptive text for SEO
                !isPageEditing && link?.value?.text
                  ? {
                      ...link,
                      value: {
                        ...link.value,
                        text: getDescriptiveLinkText(link, title?.value),
                      },
                    }
                  : link || {}
              }
            ></Link>
          </Button>
        )}
      </div>
    </article>
  );
};
