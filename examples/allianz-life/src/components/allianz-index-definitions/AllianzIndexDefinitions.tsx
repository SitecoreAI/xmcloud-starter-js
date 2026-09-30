import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { rowSpacing, sectionTheme } from 'lib/allianz-fields';
import type { AllianzIndexDefinitionsProps } from './allianz-index-definitions.props';
const colors = ['blue-bright','red-bright','teal-bright','purple-bright','direct-green'];

export const Default = ({ fields, params }: AllianzIndexDefinitionsProps) => {
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzIndexDefinitions" />;
  return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      {data.heading?.jsonValue?.value && <Text tag="h2" field={data.heading.jsonValue} />}
      <div className="allianz-index-definitions">{(data.children?.results ?? []).map((item) => <div className="index-table-2-col" key={item.id}><div aria-hidden="true" className={`index-table-swatch ${colors.includes(item.color?.jsonValue?.value || '') ? `t-bg-${item.color?.jsonValue?.value}` : ''}`} /><RichText field={item.body?.jsonValue} className="index-table-fund" /></div>)}</div>
    </div></div></div>
  </section>;
};
