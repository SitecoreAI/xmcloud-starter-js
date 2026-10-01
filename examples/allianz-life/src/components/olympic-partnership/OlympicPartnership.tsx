'use client';

import { Image, Link, RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import {
  allianzLinkField,
  shouldRenderImageField,
  shouldRenderLinkField,
  shouldRenderTextField,
} from 'lib/allianz-field-state';
import type { OlympicPartnershipProps } from './olympic-partnership.props';
import './OlympicPartnership.css';

/** The Home Olympic and Paralympic partnership has three fields and a fixed design. */
export const Default = ({ fields, params }: OlympicPartnershipProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Olympic Partnership" />;

  const logo = datasource.partnershipLogo?.jsonValue;
  const text = datasource.partnershipText?.jsonValue;
  const link = datasource.partnershipLink?.jsonValue;

  return (
    <div
      className="l-container--full-width t-bg-transparent axlTileCollection allianz-olympic-partnership"
      id={params?.RenderingIdentifier}
    >
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row u-padding-bottom-xl u-padding-top-xl">
          <div className="l-grid__column-medium-12">
            <div className="o-richTextEditor__wrapper">
              <div className="tileBody">
                <div className="bordered">
                  {shouldRenderImageField(logo, isEditing) && (
                    <Image field={logo} editable={isEditing} />
                  )}
                  {shouldRenderTextField(text, isEditing) && (
                    <RichText field={text} editable={isEditing} className="tileBody u-font-size-xl" />
                  )}
                  {shouldRenderLinkField(link, isEditing) && (
                    <Link
                      field={allianzLinkField(link, isEditing)}
                      editable={isEditing}
                      renderChildrenWhenEmpty={isEditing}
                      className="a-link"
                      aria-label={link?.value?.text || undefined}
                    >
                      <span aria-hidden="true" className="a-link__icon">
                        <svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet">
                          <path
                            fillRule="evenodd"
                            d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536"
                          />
                        </svg>
                      </span>
                      <span className="a-link__text">{link?.value?.text}</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
