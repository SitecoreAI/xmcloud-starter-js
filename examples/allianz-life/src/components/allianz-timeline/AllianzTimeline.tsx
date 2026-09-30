import { Image, Link, RichText, Text } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { rowSpacing, safeLink, sectionTheme } from 'lib/allianz-fields';
import type { AllianzTimelineProps } from './allianz-timeline.props';

export const Default = ({ fields, params }: AllianzTimelineProps) => {
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzTimeline" />;
  return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12">
      {data.heading?.jsonValue?.value && <Text tag="h2" field={data.heading.jsonValue} />}
      <RichText field={data.body?.jsonValue} />
      <table className="allianz-timeline"><tbody>{(data.children?.results ?? []).map((item) => <tr key={item.id}><th scope="row"><Text field={item.date?.jsonValue} /></th><td>
        {item.heading?.jsonValue?.value && <Text field={item.heading.jsonValue} tag="h3" />}
        <RichText field={item.body?.jsonValue} />
        {item.image?.jsonValue?.value?.src && <Image field={item.image.jsonValue} />}
        {item.link?.jsonValue?.value?.href && <Link field={safeLink(item.link.jsonValue)} className="a-link" />}
      </td></tr>)}</tbody></table>
    </div></div></div>
  </section>;
};
