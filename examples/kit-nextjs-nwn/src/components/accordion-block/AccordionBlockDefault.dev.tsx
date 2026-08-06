import { Text } from '@sitecore-content-sdk/nextjs';
import { Accordion } from '@/components/ui/accordion';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { AccordionProps, AccordionItemProps } from './accordion-block.props';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { AccordionBlockItem } from './AccordionBlockItem.dev';
import { cn } from '@/lib/utils';

const nwnFaqItems: AccordionItemProps[] = [
  {
    heading: {
      jsonValue: { value: 'What should I do if I smell natural gas?' },
    },
    description: {
      jsonValue: {
        value:
          '<p>Leave the area immediately, then call NW Natural from a safe location at <strong>800-882-3377</strong>. Avoid flames, switches, phones or anything that could create a spark while you are near the odor.</p>',
      },
    },
  },
  {
    heading: { jsonValue: { value: 'How can I pay my natural gas bill?' } },
    description: {
      jsonValue: {
        value:
          '<p>Sign in to view your bill and pay online, or explore automatic payment, phone, mail and in-person options on the Pay My Bill page.</p>',
      },
    },
  },
  {
    heading: {
      jsonValue: { value: 'How do I start, stop or transfer service?' },
    },
    description: {
      jsonValue: {
        value:
          '<p>Use the online start, stop or transfer experience to tell us where and when your service should change. Have your address and requested service date ready.</p>',
      },
    },
  },
  {
    heading: { jsonValue: { value: 'Why should I call 811 before digging?' } },
    description: {
      jsonValue: {
        value:
          '<p>Calling 811 before a digging project starts a free utility-locate request. Marked underground lines help you work safely and prevent service damage.</p>',
      },
    },
  },
];

const nwnFaqHeading = {
  jsonValue: { value: 'Questions? We are here to help.' },
};
const nwnFaqDescription = {
  jsonValue: { value: 'Need help with your account or natural gas service?' },
};
const nwnFaqLink = {
  jsonValue: {
    value: {
      href: '/account-billing',
      text: 'Visit account and billing',
      linktype: 'internal',
    },
  },
};

const isLegacyStarterContent = (value: string | undefined): boolean =>
  Boolean(
    value &&
      /alaris|ambulance|fire truck|emergency vehicle|vehicle fleet|driving range|base price|vehicle model/i.test(
        value,
      ),
  );

export const AccordionBlockDefault: React.FC<AccordionProps> = (props) => {
  const { fields, isPageEditing } = props;

  const { heading, description, link, children } =
    fields?.data?.datasource ?? {};
  const accordionItems = children?.results ?? [];
  const hasLegacyStarterContent =
    isLegacyStarterContent(heading?.jsonValue?.value) ||
    isLegacyStarterContent(description?.jsonValue?.value) ||
    isLegacyStarterContent(link?.jsonValue?.value?.href) ||
    isLegacyStarterContent(link?.jsonValue?.value?.text) ||
    accordionItems.some(
      (item) =>
        isLegacyStarterContent(item.heading?.jsonValue?.value) ||
        isLegacyStarterContent(item.description?.jsonValue?.value),
    );
  const displayHeading = hasLegacyStarterContent ? nwnFaqHeading : heading;
  const displayDescription = hasLegacyStarterContent
    ? nwnFaqDescription
    : description;
  const displayLink = hasLegacyStarterContent ? nwnFaqLink : link;
  const displayItems = hasLegacyStarterContent ? nwnFaqItems : accordionItems;
  const acordionItemValues = [
    ...displayItems.map((_, index) => `accordion-block-item-${index + 1}`),
  ];
  if (fields) {
    return (
      <section
        data-component="AccordionBlock"
        data-variant={hasLegacyStarterContent ? 'NwnHelp' : 'Default'}
        className={cn(
          '@container @md:py-16 @lg:py-20 border-b-2 border-t-2 py-10 [.border-b-2+&]:border-t-0',
          props?.params?.styles && {
            [props.params.styles]: true,
          },
        )}
        data-class-change
        aria-labelledby={
          displayHeading?.jsonValue?.value ? 'accordion-heading' : undefined
        }
      >
        <div
          className="@xl:px-0 mx-auto grid max-w-screen-xl gap-6 px-0 [&:not(.px-6_&):not(.px-8_&):not(.px-10_&)]:px-6"
          data-component="AccordionBlockContentWrapper"
        >
          <div className="@lg:mb-0 mb-8">
            {displayHeading?.jsonValue && (
              <Text
                tag="h2"
                id="accordion-heading"
                className="font-heading @md:text-6xl @lg:text-7xl max-w-screen-sm text-pretty text-5xl font-light leading-[1.1] tracking-tighter antialiased"
                field={displayHeading.jsonValue}
              />
            )}
          </div>
          <div className="@md:grid @md:grid-cols-[4fr,6fr] @md:gap-8 @lg:gap-12 @xl:gap-16">
            <div className="@md:col-start-[2] @md:col-end-[2]">
              <Accordion
                type="multiple"
                className="@md:gap-11 grid w-full gap-8 p-0"
                value={isPageEditing ? acordionItemValues : undefined} //force open all accordion items
                onValueChange={isPageEditing ? () => {} : undefined} //prevent accordion item from closing
              >
                {displayItems.map(
                  (child: AccordionItemProps, index: number) => (
                    <AccordionBlockItem
                      key={index}
                      index={index}
                      child={child}
                    />
                  ),
                )}
              </Accordion>
            </div>
            {(isPageEditing ||
              displayDescription?.jsonValue?.value ||
              displayLink?.jsonValue?.value?.href) && (
              <div className="bg-primary @sm:flex-row @sm:text-start @md:flex-col @md:text-center @lg:flex-row @lg:text-start mt-6 flex flex-col flex-nowrap items-center gap-4 p-7 text-center">
                <Text
                  tag="p"
                  className="text-primary-foreground font-heading text-lg font-light"
                  field={displayDescription?.jsonValue}
                />
                {displayLink?.jsonValue && (
                  <EditableButton
                    variant="secondary"
                    buttonLink={displayLink.jsonValue}
                    isPageEditing={isPageEditing && !hasLegacyStarterContent}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return <NoDataFallback componentName="Accordion Block" />;
};
