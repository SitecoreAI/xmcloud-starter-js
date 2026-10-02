'use client';

import { Link, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField, shouldRenderLinkField } from 'lib/allianz-field-state';
import type { ProspectusProductDirectoryProps } from './prospectus-product-directory.props';

/** Current and past products remain separate ordered tables in the source design. */
export const Default = ({ fields, params }: ProspectusProductDirectoryProps) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Prospectus product directory" />;
  const groups = [
    { label: 'Current Products', products: data.currentProducts?.targetItems ?? [] },
    { label: 'Past Products', products: data.pastProducts?.targetItems ?? [] },
  ];
  return <div className="row" id={params?.RenderingIdentifier}>
    <div className="col-md-12 content-body content">
      {groups.map((group, groupIndex) => <table className="table table-striped" key={groupIndex}>
        <thead><tr><th>{group.label}</th></tr></thead>
        <tbody>{group.products.map((product, index) => <tr key={product.id ?? index}><td>
          {shouldRenderLinkField(product.productLink?.jsonValue, editable) &&
            <Link field={allianzLinkField(product.productLink?.jsonValue, editable)} editable={editable} />}
        </td></tr>)}</tbody>
      </table>)}
    </div>
  </div>;
};
