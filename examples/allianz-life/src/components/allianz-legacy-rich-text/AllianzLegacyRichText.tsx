'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { usePathname } from 'next/navigation';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, type AllianzProps } from 'lib/allianz-fields';
import { safeEditorialRichText } from 'lib/allianz-editorial';
import { cashEquivalentDemoBody, CASH_DEMO_LINK_NOTICE, isCashEquivalentPage } from 'lib/cash-equivalent-demo';
import { claimDemoIntroBody } from 'lib/claim-demo-intro';

const REGIONS = ['pre-content', 'content', 'post-content', 'disclosure'];

/** One editorial island. Safe semantic tables are authored in the Rich Text field. */
export const Default = ({ fields, params }: AllianzProps) => {
  const { page } = useSitecore();
  const pathname = usePathname();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyRichText" />;
  const region = REGIONS.includes(params.region) ? params.region : 'content';
  const tableTheme = params.tableTheme === 'striped' ? 'allianz-legacy-table-striped' : '';
  const routeFields = page?.layout?.sitecore?.route?.fields;
  const routePath = page?.layout?.sitecore?.context?.itemPath || pathname;
  const datasourceId = 'id' in data ? data.id : undefined;
  const visitorBody = claimDemoIntroBody(data.body?.jsonValue, routeFields, routePath, isEditing, datasourceId);
  const body = cashEquivalentDemoBody(safeEditorialRichText(visitorBody, isEditing),
    !isEditing && isCashEquivalentPage(routeFields, routePath));
  return <div className="row" id={params.RenderingIdentifier}><div className={`col-md-12 content-body ${region} ${tableTheme}`}>
    {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={headingTag(params.headingLevel)} field={data.heading?.jsonValue} />}
    {shouldRenderTextField(data.subheading?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.subheading?.jsonValue, isEditing)} />}
    {body.showNotice && <p className="allianz-cash-demo-notice" role="note">{CASH_DEMO_LINK_NOTICE}</p>}
    <RichText editable={isEditing} field={body.field} className="allianz-legacy-editorial" />
  </div></div>;
};
