import { RichText as ContentSdkRichText } from '@sitecore-content-sdk/nextjs';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { RichTextBlockProps } from './rich-text-block.props';

export const Default: React.FC<RichTextBlockProps> = (props) => {
  const { fields } = props;
  const text = props.fields ? (
    <ContentSdkRichText field={props.fields.text} />
  ) : (
    <span className="is-empty-hint">Rich text</span>
  );
  const id = props.params.RenderingIdentifier;
  if (fields) {
    return (
      <article
        className={cn(
          'component rich-text nwn-rich-text-section',
          props.params.styles?.trimEnd(),
        )}
        id={id ? id : undefined}
      >
        <div className="nwn-content-shell py-12 sm:py-16 lg:py-20">
          <div className="component-content nwn-rich-text-content">{text}</div>
        </div>
      </article>
    );
  }
  return <NoDataFallback componentName="Rich Text Block" />;
};
