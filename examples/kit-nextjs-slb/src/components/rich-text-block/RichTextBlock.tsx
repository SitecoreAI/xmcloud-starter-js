import type React from 'react';
import { RichText as ContentSdkRichText } from '@sitecore-content-sdk/nextjs';
import { RichTextBlockProps } from './rich-text-block.props';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';

export const Default: React.FC<RichTextBlockProps> = (props) => {
  const { fields, params } = props;
  const text = fields ? (
    <ContentSdkRichText field={fields.text} />
  ) : (
    <span className="is-empty-hint">Rich text</span>
  );
  const id = params?.RenderingIdentifier;

  if (fields) {
    return (
      <div
        className={cn(
          'slb-page-shell slb-section-space prose max-w-none text-base leading-7 text-foreground/80',
          '[&_h2]:mb-8 [&_h2]:max-w-[18ch] [&_h2]:text-pretty [&_h2]:font-light [&_h2]:tracking-[-0.03em]',
          '[&_h3]:mt-10 [&_h3]:font-normal [&_h3]:tracking-[-0.02em] [&_p]:max-w-[68ch]',
          '[&_ol]:mt-10 [&_ol]:border-t [&_ol]:border-border [&_ol]:pl-0 [&_ul]:mt-10 [&_ul]:border-t [&_ul]:border-border [&_ul]:pl-0',
          '[&_li]:border-b [&_li]:border-border [&_li]:py-4 [&_li]:pl-0 [&_li]:marker:text-primary',
          { [props?.params?.styles]: props?.params?.styles },
        )}
        id={id ? id : undefined}
        data-component-name="rich-text-block"
      >
        {text}
      </div>
    );
  }
  return <NoDataFallback componentName="Rich Text Block" />;
};
