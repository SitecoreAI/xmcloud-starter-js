'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { safeEditorialRichText } from 'lib/allianz-editorial';
import { isSourceDestinationRichTextHref, restoreSourceDestinationRichText } from 'lib/allianz-source-destinations';
import type { AllianzRichTextProps } from 'components/allianz-rich-text/allianz-rich-text.props';

/** Field's first source introduction retains its header shells even when native
 * Heading/Subheading are empty. Body supplies the logo and title; its outer
 * wrapper inherits the source16/24 text metrics while its inner prose keeps xl.
 * Empty native fields are never replaced with invented values. */
export const FieldUnitedIntroductionSection = ({ fields, params }: AllianzRichTextProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const ownerId = 'id' in data ? data.id : undefined;
  const restoredBody = restoreSourceDestinationRichText(data.body?.jsonValue,
    page?.mode?.isEditing !== false, ownerId);
  const body = safeEditorialRichText(restoredBody, isEditing, true,
    (href) => isSourceDestinationRichTextHref(href, ownerId));
  const iconSrc = data.icon?.jsonValue?.value?.src;
  const renderIcon = shouldRenderImageField(data.icon?.jsonValue, isEditing)
    && typeof iconSrc === 'string' && iconSrc.trim().length > 0;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className={`tileContent ${params.alignment === 'left' ? 'u-text-left' : 'u-text-center'}`}>
        {renderIcon && <div className="tileIcon t-bg-transparent t-icon-primary-black" data-allianz-rich-text-icon="gray">
          <Image editable={isEditing} field={data.icon?.jsonValue} className="allianz-rich-text-icon-glyph" />
        </div>}
        <header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={headingTag(params.headingLevel)} field={data.heading?.jsonValue} />}</div>
          {shouldRenderTextField(data.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={data.subheading?.jsonValue} className="tileSubHeading" /> : <div className="tileSubHeading" />}
        </header>
        {shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} className="tileBody" />}
        {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
      </div></article>
    </div></div></div>
  </div>;
};
