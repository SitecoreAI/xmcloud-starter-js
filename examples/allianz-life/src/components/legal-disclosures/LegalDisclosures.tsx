'use client';

import { RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { legalDisclosuresFields, type LegalDisclosuresProps } from './legal-disclosures.props';
import { safeNewsroomRichText } from './newsroom-grey.links.props';
import './NewsroomGrey.css';

/** Body-only disclosure purpose, independently sourced on all 81 newsroom pages. */
export const Default = ({ fields, params }: LegalDisclosuresProps) => {
  const { page } = useSitecore();
  const data = fields?.data?.datasource;
  const editable = page?.mode?.isEditing ?? false;
  if (!data) return <NoDataFallback componentName="Legal Disclosures" />;
  const body = data.body?.jsonValue;
  return (
    <div className="component legal-disclosures l-container--full-width a-axlDisclosures" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row">
          <div className="l-grid__column">
            <div className="row">
              {shouldRenderTextField(body, editable)
                ? <RichText className="col-md-12 content-body disclosure" field={body} editable={editable} />
                : <div className="col-md-12 content-body disclosure" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Newsroom source grey body, followed by its empty structural disclosure wrapper. */
export const NewsroomGrey = ({ fields, params }: LegalDisclosuresProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  if (!fields?.data?.datasource) return <NoDataFallback componentName="Legal Disclosures" />;
  const body = legalDisclosuresFields(fields.data.datasource).body?.jsonValue;
  return <>
    <div className="l-container--full-width t-bg-grey-muted axlTileCollection allianz-newsroom-grey" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-left">
          <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
          {shouldRenderTextField(body, isEditing)
            ? <RichText field={safeNewsroomRichText(body, isEditing)} editable={isEditing} className="tileBody" />
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
