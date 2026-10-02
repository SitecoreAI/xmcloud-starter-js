'use client';

import { Link, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField, shouldRenderLinkField } from 'lib/allianz-field-state';
import type { NewsroomReturnProps } from './newsroom-return.props';

/** One General Link owns content and metadata; visitor navigation uses the shared safe-link policy. */
export const Default = ({ fields, params }: NewsroomReturnProps) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Newsroom Return" />;
  const link = data.link?.jsonValue;

  return (
    <div className="component newsroom-return l-container" id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width l-grid--no-gutters-outer">
        <div className="l-grid__row u-margin-bottom-xl">
          <div className="l-grid__column-medium-12">
            <article className="m-axlIntroductionBlock -is--stacked -no--image">
              <div className="tileContent u-text-center">
                <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
                <div className="tileBody">{'\u00a0'}</div>
                <footer>
                  <div className="tileLink">
                    {shouldRenderLinkField(link, editable) && <Link className="a-link" field={allianzLinkField(link, editable)} editable={editable}>
                      <span aria-hidden="true" className="a-link__icon">
                        <svg aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536" />
                        </svg>
                      </span>
                      <span className="a-link__text">{link?.value?.text}</span>
                    </Link>}
                  </div>
                </footer>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
};
