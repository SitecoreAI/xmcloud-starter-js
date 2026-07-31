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
  const cssStyles = [props.params.Styles, props.params.CSSStyles]
    .find((value): value is string => typeof value === 'string')
    ?.trim();
  const isArticlePage =
    props.page.layout.sitecore.route?.templateName === 'Article Page';
  const articleBodyFallback =
    !cssStyles && isArticlePage ? 'legal-article-body' : undefined;
  if (fields) {
    return (
      <article
        className={cn(
          'component rich-text',
          props.params.styles?.trimEnd(),
          cssStyles,
          articleBodyFallback,
        )}
        id={id ? id : undefined}
      >
        <div className="component-content">{text}</div>
      </article>
    );
  }
  return <NoDataFallback componentName="Rich Text Block" />;
};
