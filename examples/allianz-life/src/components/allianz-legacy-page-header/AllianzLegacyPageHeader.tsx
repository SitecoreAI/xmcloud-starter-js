import { RichText } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { AllianzProps } from 'lib/allianz-fields';

/** The legacy title is separate from its editorial content and hero. */
export const Default = ({ fields, params }: AllianzProps) => {
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyPageHeader" />;
  return <header className="page-header" id={params.RenderingIdentifier}>
    <RichText tag="h1" field={data.heading?.jsonValue} />
    {data.body?.jsonValue?.value && <RichText field={data.body.jsonValue} />}
  </header>;
};
