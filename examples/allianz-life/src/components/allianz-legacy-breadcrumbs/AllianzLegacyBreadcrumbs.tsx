import { Link, Text } from '@sitecore-content-sdk/nextjs';
import { safeLink, type AllianzProps } from 'lib/allianz-fields';

export const Default = ({ fields, params }: AllianzProps) => <nav aria-label="Breadcrumb" id={params.RenderingIdentifier}><ol className="breadcrumb">
  {(fields?.data?.datasource?.primaryNav?.targetItems ?? []).map((item) => <li key={item.id}><Link field={safeLink(item.link?.jsonValue)}><Text field={item.title?.jsonValue} /></Link></li>)}
</ol></nav>;
