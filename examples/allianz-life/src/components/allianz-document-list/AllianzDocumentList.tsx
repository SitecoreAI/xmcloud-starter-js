import { DateField, File, Link, RichText, Text } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { localDocumentHref, type AllianzDocumentListProps } from './allianz-document-list.props';

export const Default = ({ fields, params = {} }: AllianzDocumentListProps) => {
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzDocumentList" />;
  return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <Text tag={headingTag(params.headingLevel)} field={data.heading?.jsonValue} />
      <RichText field={data.body?.jsonValue} className="o-richTextEditor__wrapper" />
      <ul className="allianz-document-list link-list">
        {(data.children?.results ?? []).map((document) => {
          const file = document.file?.jsonValue;
          const fileHref = localDocumentHref(file?.value?.src);
          const sourceHref = localDocumentHref(document.sourceUrl?.jsonValue?.value);
          const title = document.title?.jsonValue;
          const label = <>{title && <Text field={title} />}{!title?.value && (file?.value?.title || file?.value?.displayName || 'View document')}</>;
          return <li key={document.id}>
            {file && fileHref ? <File field={{ ...file, value: { ...file.value, src: fileHref } }}>{label}</File>
              // sourceUrl is Single-Line Text, so it has no General Link editing metadata.
              : sourceHref ? <Link field={{ value: { href: sourceHref, text: title?.value || 'View document', target: '' } }}>{label}</Link>
              : <>{label}<span className="help-block">Document unavailable in this demo.</span></>}
            <RichText field={document.description?.jsonValue} />
            {document.publishedDate?.jsonValue && <DateField field={document.publishedDate.jsonValue} tag="p" render={(date) => date && Number.isFinite(date.getTime()) ? <time dateTime={date.toISOString().slice(0, 10)}>{date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</time> : null} />}
          </li>;
        })}
      </ul>
    </div></div></div>
  </section>;
};
