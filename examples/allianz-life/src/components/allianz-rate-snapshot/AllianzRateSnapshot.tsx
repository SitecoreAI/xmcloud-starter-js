import { Link, RichText, Text } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { rowSpacing, safeLink, sectionTheme } from 'lib/allianz-fields';
import type { AllianzRateSnapshotProps } from './allianz-rate-snapshot.props';

export const Default = ({ fields, params }: AllianzRateSnapshotProps) => {
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRateSnapshot" />;
  return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <div className="well seven-yr-slot"><h2><Text tag="small" className="blue" field={data.heading?.jsonValue} />: <Text field={data.rate?.jsonValue} /> <small>as of <Text field={data.asOf?.jsonValue} /></small></h2><RichText field={data.body?.jsonValue} />
        {data.link?.jsonValue?.value?.href && <p><Link field={safeLink(data.link.jsonValue)} /></p>}
      </div>
    </div></div></div>
  </section>;
};
