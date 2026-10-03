'use client';

import { Link, Text, useComponentProps, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { automaticProductPages, directoryHeading, prospectusPageLink, type ProspectusDirectoryComponentData, type ProspectusProductDirectoryProps } from './prospectus-product-directory.props';

/** Current and past products come from classified direct child pages, in native order. */
export const Default = ({ fields, params, rendering }: ProspectusProductDirectoryProps) => {
  const { page } = useSitecore();
  const automatic = useComponentProps<ProspectusDirectoryComponentData>(rendering?.uid);
  const editable = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Prospectus product directory" />;
  const products = automaticProductPages(automatic?.automaticProducts);
  const groups = [
    { heading: directoryHeading(data, 'currentHeading'), value: 'current' },
    { heading: directoryHeading(data, 'pastHeading'), value: 'past' },
  ];
  return <div className="row" id={params?.RenderingIdentifier}>
    <div className="col-md-12 content-body content">
      {groups.map((group) => <table className="table table-striped" key={group.value}>
        <thead><tr><th>{shouldRenderTextField(group.heading?.jsonValue, editable) &&
          <Text field={group.heading?.jsonValue} editable={editable} />}</th></tr></thead>
        <tbody>{products?.filter((product) => product.prospectusDirectoryGroup?.jsonValue?.value === group.value).map((product) => <tr key={product.id}><td>
          {shouldRenderTextField(product.prospectusDirectoryTitle?.jsonValue, editable) &&
            <Link field={allianzLinkField(prospectusPageLink(product), editable)} editable={false}>
              <Text field={product.prospectusDirectoryTitle?.jsonValue} editable={false} />
            </Link>}
        </td></tr>)}</tbody>
      </table>)}
      {!products && <p role="status">{editable
        ? 'Automatic prospectus pages could not load completely. Check child-page directory groups, captions, and native sort order.'
        : 'The prospectus directory is temporarily unavailable.'}</p>}
      {editable && products?.length === 0 && <p role="status">Set a child prospectus page’s directory group to current or past to list it here.</p>}
    </div>
  </div>;
};
