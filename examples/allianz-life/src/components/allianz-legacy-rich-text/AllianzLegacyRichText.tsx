import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, type AllianzProps } from 'lib/allianz-fields';

const REGIONS = ['pre-content', 'content', 'post-content', 'disclosure'];

/** One editorial island. Safe semantic tables are authored in the Rich Text field. */
export const Default = ({ fields, params }: AllianzProps) => {
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyRichText" />;
  const region = REGIONS.includes(params.region) ? params.region : 'content';
  const tableTheme = params.tableTheme === 'striped' ? 'allianz-legacy-table-striped' : '';
  return <div className="row" id={params.RenderingIdentifier}><div className={`col-md-12 content-body ${region} ${tableTheme}`}>
    {data.heading?.jsonValue?.value && <Text tag={headingTag(params.headingLevel)} field={data.heading.jsonValue} />}
    {data.subheading?.jsonValue?.value && <RichText field={data.subheading.jsonValue} />}
    <RichText field={data.body?.jsonValue} className="allianz-legacy-editorial" />
  </div></div>;
};
