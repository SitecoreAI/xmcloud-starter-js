'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import type { ProspectusIntroductionProps } from './prospectus-introduction.props';

/** Purpose-limited prospectus guidance; tables, headings, and disclosures are separate. */
export const Default = ({ fields, params }: ProspectusIntroductionProps) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Prospectus introduction" />;
  const copy = data.introductoryCopy?.jsonValue;
  if (!shouldRenderTextField(copy, editable)) return null;
  return <div className="row" id={params?.RenderingIdentifier}>
    <RichText className="col-md-12 content-body pre-content" field={copy} editable={editable} />
  </div>;
};

const EligibilityNotice = ({ fields, params, bold = false }: ProspectusIntroductionProps & { bold?: boolean }) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Prospectus contract notice" />;
  const notice = data.contractNotice?.jsonValue;
  if (!shouldRenderTextField(notice, editable)) return null;
  return <p id={params?.RenderingIdentifier}>{bold
    ? <strong><Text field={notice} editable={editable} /></strong>
    : <Text field={notice} editable={editable} />}</p>;
};

/** Bold is fixed by the closed-product source, not entered in a text editor. */
export const ContractNotice = (props: ProspectusIntroductionProps) => <EligibilityNotice {...props} bold />;
/** The archived-contract source has a plain eligibility paragraph. */
export const ArchivedContractNotice = (props: ProspectusIntroductionProps) => <EligibilityNotice {...props} />;
