'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { safeEditorialRichText } from 'lib/allianz-editorial';
import { isSourceDestinationRichTextHref, restoreSourceDestinationRichText } from 'lib/allianz-source-destinations';
import type { AllianzRichTextProps } from 'components/allianz-rich-text/allianz-rich-text.props';

const GLYPHS = {
  puzzle: { src: '/allianz-ui/life-overview/puzzle.svg', alt: 'Puzzle', brand: false },
  collaborate: { src: '/allianz-assets/bf9e7cf1c5628982.svg', alt: 'Collaborate', brand: false },
  information: { src: '/allianz-ui/about-overview/information.svg', alt: 'Information', brand: true },
} as const;
export type InclusionSourceGlyph = keyof typeof GLYPHS;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Malformed populated records are neither a native image nor an authored clear. */
const nativeIconState = (entry: unknown): 'empty' | 'authored' | 'invalid' => {
  if (entry == null) return 'empty';
  if (!record(entry)) return 'invalid';
  const field = entry.jsonValue;
  if (field == null) return 'empty';
  if (!record(field)) return 'invalid';
  const value = field.value;
  if (value == null) return 'empty';
  if (!record(value)) return 'invalid';
  if (value.src == null || value.src === '') return 'empty';
  return typeof value.src === 'string' && value.src.trim().length > 0 ? 'authored' : 'invalid';
};

/** Only explicit Inclusion variants supply fixed existing artwork; native Icon overrides win. */
export const InclusionSourceIntroduction = ({ fields, params, glyph }:
  AllianzRichTextProps & { glyph: InclusionSourceGlyph }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRichText" />;
  const source = Object.hasOwn(GLYPHS, glyph) ? GLYPHS[glyph] : undefined;
  const icon = data.icon?.jsonValue;
  const iconState = nativeIconState(data.icon);
  const ownerId = 'id' in data ? data.id : undefined;
  const restoredBody = restoreSourceDestinationRichText(data.body?.jsonValue,
    page?.mode?.isEditing !== false, ownerId);
  const body = safeEditorialRichText(restoredBody, isEditing, true,
    (href) => isSourceDestinationRichTextHref(href, ownerId));
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className={`tileContent ${params.alignment === 'left' ? 'u-text-left' : 'u-text-center'}`}>
        {(iconState === 'authored' || (iconState === 'empty' && source)) && <div className={`tileIcon ${source?.brand ? 't-bg-primary-brand t-icon-primary-white' : 't-bg-transparent t-icon-primary-black'}`} data-allianz-rich-text-icon={source?.brand ? 'brand' : 'gray'}>
          {iconState === 'authored' ? <Image editable={isEditing} field={icon} className="allianz-rich-text-icon-glyph" />
            // Fixed source UI art is not a synthetic CMS Image field.
            // eslint-disable-next-line @next/next/no-img-element
            : source && <img src={source.src} alt={source.alt} className="allianz-rich-text-icon-glyph" />}
        </div>}
        <header><div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={headingTag(params.headingLevel)} field={data.heading?.jsonValue} />}</div>
          {shouldRenderTextField(data.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={data.subheading?.jsonValue} className="tileSubHeading" /> : <div className="tileSubHeading" />}
        </header>
        {shouldRenderTextField(body, isEditing) && <RichText editable={isEditing} field={body} className="tileBody" />}
        {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
      </div></article>
    </div></div></div>
  </div>;
};
