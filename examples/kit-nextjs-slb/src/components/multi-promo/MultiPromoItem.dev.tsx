import { Link, RichText, Text } from '@sitecore-content-sdk/nextjs';
import { Button } from '@/components/ui/button';
import { MultiPromoItemProps } from '@/components/multi-promo/multi-promo.props';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { getFieldValue } from '@/lib/component-props';
import { getDescriptiveLinkText } from '@/utils/link-text';
const mapToItemProps = (fields: MultiPromoItemProps) => {
  return {
    title: getFieldValue(fields?.heading),
    description: getFieldValue(fields?.description),
    image: getFieldValue(fields?.image),
    link: getFieldValue(fields?.link),
    isPageEditing: fields?.isPageEditing,
  };
};

export const Default: React.FC<MultiPromoItemProps> = (props) => {
  const itemProps = mapToItemProps(props || {});
  const { title, description, image, link, isPageEditing } = itemProps || {};

  return (
    <article className="group flex h-full flex-col border-b border-r border-border bg-background">
      {(isPageEditing || image?.value?.src) && (
        <ImageWrapper
          image={image}
          className="absolute inset-0 h-full w-full rounded-none object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          wrapperClass="relative aspect-[4/3] w-full overflow-hidden bg-secondary"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 400px"
        />
      )}
      <div className="flex flex-1 flex-col px-6 py-7 @lg:px-8 @lg:py-9">
        {(isPageEditing || title?.value) && (
          <Text
            tag="h3"
            field={title}
            className="font-heading text-box-trim-both text-box-edge-asc-desc text-pretty text-2xl font-normal leading-[1.15] tracking-[-0.025em] text-dark transition-colors group-hover:text-primary @lg:text-[2rem]"
          />
        )}
        {(isPageEditing || description?.value) && (
          <RichText
            field={description}
            className="prose mt-5 max-w-none text-base leading-7 text-foreground/75"
          />
        )}
        {link?.value?.href && (
          <Button
            variant="link"
            asChild
            className="text-box-trim-both text-box-edge-asc-desc mt-auto h-auto justify-start self-start px-0 pb-0 pt-8 text-sm font-semibold text-primary underline decoration-2 underline-offset-4 hover:text-dark"
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
