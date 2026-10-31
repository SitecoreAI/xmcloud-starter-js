'use client';

import { RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { legalDisclosuresFields, type LegalDisclosuresProps } from './legal-disclosures.props';
import { safeNewsroomRichText } from './newsroom-grey.links.props';
import { EditorialFrame } from 'lib/allianz-editorial-frame';
import { safeEditorialRichText } from 'lib/allianz-editorial';
import './NewsroomGrey.css';

/** Body-only disclosure purpose, independently sourced on all 81 newsroom pages. */
type LegalDisclosuresPresentationProps = LegalDisclosuresProps & { isFaq?: boolean };

export const Default = ({ fields, params, isFaq = false }: LegalDisclosuresPresentationProps) => {
  const { page } = useSitecore();
  const data = fields?.data?.datasource;
  const editable = page?.mode?.isEditing ?? false;
  if (!data) return <NoDataFallback componentName="Legal Disclosures" />;
  const body = data.body?.jsonValue;
  return (
    <div className={`component legal-disclosures l-container--full-width a-axlDisclosures${isFaq ? ' allianz-faq-disclosures' : ''}`} id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row">
          <div className="l-grid__column">
            <div className="row">
              {shouldRenderTextField(body, editable)
                ? <RichText className="col-md-12 content-body disclosure" field={safeEditorialRichText(body, editable, true)} editable={editable} />
                : <div className="col-md-12 content-body disclosure" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Preserve only the two source disclosure anchors at their verified native owner.
// This leaves all other URLs and consumers on the existing visitor link policy.
const NEWSROOM_GREY_OWNER = '39b0fcf0f366471e85bdf501de33df5c';
const NEWSROOM_GREY_SOURCE_HREFS = new Set(['https://www.ssa.gov/', 'http://www.finra.org']);
function isNewsroomGreySourceHref(ownerId: unknown, decodedHref: string, rawHref: string): boolean {
  if (typeof ownerId !== 'string') return false;
  const id = ownerId.startsWith('{') && ownerId.endsWith('}') ? ownerId.slice(1, -1) : ownerId;
  return /^(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.test(id)
    && id.replaceAll('-', '').toLowerCase() === NEWSROOM_GREY_OWNER
    && decodedHref === rawHref && NEWSROOM_GREY_SOURCE_HREFS.has(rawHref);
}

/** Newsroom source grey body, followed by its empty structural disclosure wrapper. */
export const NewsroomGrey = ({ fields, params }: LegalDisclosuresProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  if (!fields?.data?.datasource) return <NoDataFallback componentName="Legal Disclosures" />;
  const data = legalDisclosuresFields(fields.data.datasource);
  const body = data.body?.jsonValue;
  const visitorBody = safeNewsroomRichText(body, isEditing, (decodedHref, rawHref) =>
    !isNewsroomGreySourceHref(data.id, decodedHref, rawHref));
  return <>
    <div className="l-container--full-width t-bg-grey-muted axlTileCollection allianz-newsroom-grey" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-left">
          <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
          {shouldRenderTextField(body, isEditing)
            ? <RichText field={visitorBody} editable={isEditing} className="tileBody" />
            : <div className="tileBody" />}
        </div></article>
      </div></div></div>
    </div>
    <div className="l-container--full-width a-axlDisclosures allianz-newsroom-grey-trailing">
      <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column">
        <div className="row"><div className="col-md-12 content-body disclosure" /></div>
      </div></div></div>
    </div>
  </>;
};


/** FAQ retains original native links; visitor output follows the existing demo policy. */
export const Faq = (props: LegalDisclosuresProps) => {
  const { page } = useSitecore();
  const data = props.fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Legal Disclosures" />;
  const isEditing = page?.mode?.isEditing ?? false;
  return <Default {...props} isFaq fields={{ ...props.fields, data: {
    ...props.fields?.data, datasource: { ...data, body: {
      jsonValue: safeNewsroomRichText(data.body?.jsonValue, isEditing),
    } },
  } }} />;
};

/** Legacy disclosure purpose: the source row and column with an editable body only. */
export const Legacy = ({ fields, params }: LegalDisclosuresProps) => {
  const { page } = useSitecore();
  const data = fields?.data?.datasource;
  const isEditing = page?.mode?.isEditing ?? false;
  if (!data) return <NoDataFallback componentName="Legal Disclosures" />;
  const body = legalDisclosuresFields(data).body?.jsonValue;
  return <div className="row">{shouldRenderTextField(body, isEditing)
    ? <RichText className="col-md-12 content-body disclosure" id={params?.RenderingIdentifier}
        field={safeNewsroomRichText(body, isEditing)} editable={isEditing} />
    : <div className="col-md-12 content-body disclosure" id={params?.RenderingIdentifier} />}</div>;
};

/** College strategy footnotes have a tile body and no trailing disclosure shell. */
export const StrategyFootnotes = ({ fields, params }: LegalDisclosuresProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Legal Disclosures" />;
  const body = legalDisclosuresFields(data).body?.jsonValue;
  return <EditorialFrame params={params ?? {}} column>
    <article className="m-axlIntroductionBlock -is--stacked -no--image">
      <div className="tileContent u-text-left">
        <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
        {shouldRenderTextField(body, isEditing)
          ? <RichText field={safeEditorialRichText(body, isEditing)} editable={isEditing} className="tileBody" />
          : <div className="tileBody" />}
      </div>
    </article>
  </EditorialFrame>;
};

/** Retirement strategy footnotes use the source rich text wrapper. */
export const StrategyRichText = ({ fields, params }: LegalDisclosuresProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Legal Disclosures" />;
  const body = legalDisclosuresFields(data).body?.jsonValue;
  return <EditorialFrame params={params ?? {}} column>
    {shouldRenderTextField(body, isEditing)
      ? <RichText field={safeEditorialRichText(body, isEditing)} editable={isEditing} className="o-richTextEditor__wrapper" />
      : <div className="o-richTextEditor__wrapper" />}
  </EditorialFrame>;
};
