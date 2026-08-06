import { Text } from '@sitecore-content-sdk/nextjs';
import { Accordion } from '@/components/ui/accordion';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { AccordionProps, AccordionItemProps } from './accordion-block.props';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { AccordionBlockItem } from './AccordionBlockItem.dev';
import { cn } from '@/lib/utils';

export const AccordionBlockDefault: React.FC<AccordionProps> = (props) => {
  const { fields, isPageEditing } = props;

  const { heading, description, link, children } =
    fields?.data?.datasource ?? {};
  const accordionItems = children?.results ?? [];
  const acordionItemValues = [
    ...accordionItems.map((_, index) => `accordion-block-item-${index + 1}`),
  ];
  if (fields?.data?.datasource) {
    return (
      <section
        data-component="AccordionBlock"
        data-variant="Default"
        className={cn(
          '@container @md:py-14 @lg:py-16 border-b-2 border-t-2 py-10 [.border-b-2+&]:border-t-0',
          props?.params?.styles && {
            [props.params.styles]: true,
          },
        )}
        data-class-change
        aria-labelledby={
          heading?.jsonValue?.value ? 'accordion-heading' : undefined
        }
      >
        <div
          className="@xl:px-0 mx-auto flex w-full max-w-screen-lg flex-col gap-8 px-0 [&:not(.px-6_&):not(.px-8_&):not(.px-10_&)]:px-6"
          data-component="AccordionBlockContentWrapper"
        >
          <div>
            {heading?.jsonValue && (
              <Text
                tag="h2"
                id="accordion-heading"
                className="font-heading max-w-screen-sm text-pretty text-[clamp(2.125rem,3.5vw,2.75rem)] font-medium leading-[1.06] tracking-[-0.02em] antialiased"
                field={heading.jsonValue}
              />
            )}
          </div>
          <div className="w-full">
            <Accordion
              type="multiple"
              className="@md:gap-6 grid w-full gap-4 p-0"
              value={isPageEditing ? acordionItemValues : undefined} //force open all accordion items
              onValueChange={isPageEditing ? () => {} : undefined} //prevent accordion item from closing
            >
              {accordionItems.map(
                (child: AccordionItemProps, index: number) => (
                  <AccordionBlockItem key={index} index={index} child={child} />
                ),
              )}
            </Accordion>
            {(isPageEditing ||
              description?.jsonValue?.value ||
              link?.jsonValue?.value?.href) && (
              <div className="bg-primary @sm:flex-row @sm:items-center @sm:justify-between mt-8 flex flex-col items-start gap-4 p-7 text-left">
                <Text
                  tag="p"
                  className="text-primary-foreground font-heading text-lg font-light"
                  field={description?.jsonValue}
                />
                {link?.jsonValue && (
                  <EditableButton
                    variant="secondary"
                    buttonLink={link.jsonValue}
                    isPageEditing={isPageEditing}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return isPageEditing ? (
    <NoDataFallback componentName="Accordion Block" />
  ) : null;
};
