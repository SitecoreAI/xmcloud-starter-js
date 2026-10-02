'use client';

import { Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { AllianzFieldIcon } from 'lib/allianz-field-icon';
import { collectionsComplete } from 'lib/collection-completeness';
import { companyStrengthFields, companyStrengthsFields, type CompanyStrengthsProps } from './company-strengths.props';
import './CompanyStrengths.css';

const Strengths = ({ fields, params, continuation }: CompanyStrengthsProps & { continuation: boolean }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  if (!fields?.data?.datasource) return <NoDataFallback componentName="Company Strengths" />;
  const source = companyStrengthsFields(fields.data.datasource);
  if (!Array.isArray(source.children?.results) || !collectionsComplete(source, true)) return <p role="alert">Company strengths content is temporarily unavailable.</p>;
  const entries = source.children.results.map(companyStrengthFields);
  return <div className={`l-container--full-width ${continuation ? 'u-row-spacing ' : ''}t-bg-transparent axlTileCollection allianz-company-strengths`} id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {!continuation && shouldRenderTextField(source.introduction?.jsonValue, isEditing) &&
        <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
            <header><div className="tileHeading"><Text field={source.introduction?.jsonValue} tag="h5" editable={isEditing} /></div></header>
          </div></article>
        </div></div>}
      {isEditing && entries.length === 0 && <p role="status">Add a company strength to this section.</p>}
      <div className={`l-grid__row match-height-row${continuation ? ' u-margin-bottom-xl' : ''}`}>
        {entries.map((entry) => <div className="l-grid__column-medium-4" key={entry.id}>
          <article className="m-axlTile match-height -is--stacked t-bg-transparent">
            <div className="tileContent u-text-center">
              {shouldRenderImageField(entry.icon?.jsonValue, isEditing) &&
                <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black">
                  <AllianzFieldIcon field={entry.icon?.jsonValue} />
                </div></div>}
              <div className="tileSubGrid__content">
                <header><div className="tileHeading"><Text field={entry.heading?.jsonValue} tag="h4" editable={isEditing} /></div></header>
                <RichText field={entry.body?.jsonValue} editable={isEditing} className="tileBody u-font-size-md" />
                {shouldRenderLinkField(entry.link?.jsonValue, isEditing) && <footer><div className="tileLink">
                  <Link field={allianzLinkField(entry.link?.jsonValue, isEditing)} editable={isEditing}
                        renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={entry.link?.jsonValue?.value?.text || undefined}>
                        <span aria-hidden="true" className="a-link__icon"><svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet">
                          <path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536" />
                        </svg></span>
                        <span className="a-link__text">{entry.link?.jsonValue?.value?.text}</span>
                      </Link>
                </div></footer>}
              </div>
            </div>
          </article>
        </div>)}
      </div>
    </div>
  </div>;
};

export const Introduction = (props: CompanyStrengthsProps) => <Strengths {...props} continuation={false} />;
export const Continuation = (props: CompanyStrengthsProps) => <Strengths {...props} continuation={true} />;
export const Default = Introduction;
