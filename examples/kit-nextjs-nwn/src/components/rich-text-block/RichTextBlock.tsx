import { RichText as ContentSdkRichText } from '@sitecore-content-sdk/nextjs';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { getLocaleOption, getLocalizedPathname } from '@/i18n/locales';
import type { RichTextBlockProps } from './rich-text-block.props';

const FILE_OR_SYSTEM_PATH = /^\/(?:-|sitecore)\/|\.[a-z0-9]+(?:[?#]|$)/i;

const localizeRichTextLinks = (html: string, locale?: string): string => {
  const targetLocale = getLocaleOption(locale).code;
  if (targetLocale === 'en') return html;

  return html.replace(
    /href=(['"])(\/(?!\/)[^'"]*)\1/gi,
    (match, quote: string, href: string) =>
      FILE_OR_SYSTEM_PATH.test(href)
        ? match
        : `href=${quote}${getLocalizedPathname(href, targetLocale)}${quote}`,
  );
};

export const Default: React.FC<RichTextBlockProps> = (props) => {
  const { fields } = props;
  const authoredText = props.fields?.text;
  const displayText =
    authoredText &&
    !props.page.mode.isEditing &&
    typeof authoredText.value === 'string'
      ? {
          ...authoredText,
          value: localizeRichTextLinks(authoredText.value, props.page.locale),
        }
      : authoredText;
  const text = props.fields ? (
    <ContentSdkRichText field={displayText} />
  ) : (
    <span className="is-empty-hint">Rich text</span>
  );
  const isWinterAdvisoryContent =
    props.rendering.dataSource
      ?.toLowerCase()
      .includes('winter_service_advisory_content') ?? false;
  const id =
    props.params.RenderingIdentifier ||
    (isWinterAdvisoryContent ? 'winter-safety' : undefined);
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
