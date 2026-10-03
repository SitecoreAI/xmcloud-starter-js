'use client';

import { Link, Text, useComponentProps, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { automaticDocumentRows, prospectusLinkField, type ProspectusDocumentComponentData, type ProspectusDocumentTableProps } from './prospectus-document-table.props';

const DocumentTable = ({ fields, params, rendering, product = false, embedded = false }: ProspectusDocumentTableProps & { product?: boolean; embedded?: boolean }) => {
  const { page } = useSitecore();
  const automatic = useComponentProps<ProspectusDocumentComponentData>(rendering?.uid);
  const rows = automaticDocumentRows(automatic?.automaticDocuments);
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Prospectus document table" />;
  if (!rows) return <div role="status" className="allianz-missing-data">{isEditing
    ? 'Automatic prospectus documents could not load completely. Check the datasource children and native sort order.'
    : 'Prospectus documents are temporarily unavailable.'}</div>;
  const table = (
        <table className="table table-striped" id={product ? 'prospectusTable' : embedded ? params?.RenderingIdentifier : undefined}>
          <thead><tr>
            <th>{product ? 'Description' : 'Description / Name'}</th>
            <th>Revision Date</th>
            <th>Size</th>
          </tr></thead>
          <tbody>{rows.map((document, index) => (
            <tr key={document.id ?? index}>
              <td>
                {shouldRenderLinkField(document.documentLink?.jsonValue, isEditing) && (
                  <Link field={prospectusLinkField(document.documentLink?.jsonValue, isEditing)} editable={isEditing} />
                )}
                {shouldRenderTextField(document.contractNote?.jsonValue, isEditing)
                  ? <Text tag="p" field={document.contractNote?.jsonValue} editable={isEditing} /> : <p />}
              </td>
              <td><Text field={document.revisionDate?.jsonValue} editable={isEditing} /></td>
              <td><Text field={document.fileSize?.jsonValue} editable={isEditing} /></td>
            </tr>
          ))}</tbody>
        </table>
  );
  if (product || embedded) return table;
  return <div className="row" id={params?.RenderingIdentifier}><div className="col-md-12 content-body content">{table}</div></div>;
};

export const Default = (props: ProspectusDocumentTableProps) => <DocumentTable {...props} />;
/** Product pages use the source table's stable anchor; no author style controls. */
export const Product = (props: ProspectusDocumentTableProps) => <DocumentTable {...props} product />;
/** Two directory routes already supply the source content host around the table. */
export const Embedded = (props: ProspectusDocumentTableProps) => <DocumentTable {...props} embedded />;
