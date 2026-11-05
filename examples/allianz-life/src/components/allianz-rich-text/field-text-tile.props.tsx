'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { safeEditorialRichText } from 'lib/allianz-editorial';
import { isSourceDestinationRichTextHref, restoreSourceDestinationRichText } from 'lib/allianz-source-destinations';
import type { AllianzRichTextProps } from 'components/allianz-rich-text/allianz-rich-text.props';

/** The verified Field plain tiles have native headings inside the source card wrapper.
 * Named exports choose only source body size. Authoring fields and supported parameters stay native. */
export const FieldTextTileSection = ({ fields, params, bodySize }:
  AllianzRichTextProps & { bodySize: 'xl' | 'lg' }) => {
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
      <article className="m-axlTile match-height -is--stacked t-bg-transparent"><div className={`tileContent ${params.alignment === 'left' ? 'u-text-left' : 'u-text-center'}`}>
        {renderIcon && <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black" data-allianz-rich-text-icon="gray">
          <Image editable={isEditing} field={data.icon?.jsonValue} className="allianz-rich-text-icon-glyph" />
        </div></div>}
        <div className="tileSubGrid__content"><header>
          <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={headingTag(params.headingLevel)} field={data.heading?.jsonValue} />}</div>
          {shouldRenderTextField(data.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={data.subheading?.jsonValue} className="tileSubHeading" /> : <div className="tileSubHeading" />}
        </header>
          {shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} className={`tileBody u-font-size-${bodySize}`} />}
          {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <footer><div className="tileLink"><Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" /></div></footer>}
        </div>
      </div></article>
    </div></div></div>
  </div>;
};
