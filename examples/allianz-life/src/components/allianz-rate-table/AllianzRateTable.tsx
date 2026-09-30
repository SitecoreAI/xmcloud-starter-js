import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { AllianzRateTableProps } from './allianz-rate-table.props';

/** A localized native editorial table; absence of captured public rates never creates numbers. */
export const Default = ({ fields, params }: AllianzRateTableProps) => {
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRateTable" />;
  return <section className="allianz-local-rates" id={params.RenderingIdentifier}>
    {data.heading?.jsonValue?.value && <Text tag="h2" field={data.heading.jsonValue} />}
    {data.body?.jsonValue?.value && <RichText field={data.body.jsonValue} />}
    {data.captionText?.jsonValue?.value && <Text tag="p" field={data.captionText.jsonValue} />}
    {data.tableBody?.jsonValue?.value ? <RichText className="table-responsive" field={data.tableBody.jsonValue} /> : data.emptyState?.jsonValue?.value ? <RichText field={data.emptyState.jsonValue} /> : null}
  </section>;
};
