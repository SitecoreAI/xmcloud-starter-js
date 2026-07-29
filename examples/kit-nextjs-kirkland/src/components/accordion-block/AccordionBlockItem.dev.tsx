import { Text, RichText } from '@sitecore-content-sdk/nextjs';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import type { AccordionBlockItemProps } from './accordion-block-item.props';

export const AccordionBlockItem = ({
  index,
  child,
  valuePrefix = 'accordion-block-item',
}: AccordionBlockItemProps) => (
  <>
    <AccordionItem
      key={index}
      value={`${valuePrefix}-${index + 1}`}
      className="border-foreground border-b p-0"
    >
      <AccordionTrigger className="font-heading flex min-w-0 w-full justify-between gap-4 py-4 text-left text-base font-medium">
        {child?.heading?.jsonValue && (
          <Text
            field={child.heading.jsonValue}
            className="font-heading min-w-0 text-left text-base font-medium [overflow-wrap:break-word]"
          />
        )}
      </AccordionTrigger>
      <AccordionContent>
        <div className="font-body py-4 pt-2 text-base font-medium">
          {child?.description?.jsonValue && (
            <RichText tag="div" field={child.description.jsonValue} />
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  </>
);
