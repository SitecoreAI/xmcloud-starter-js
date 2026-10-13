'use client';
import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderImageField, shouldRenderTextField, shouldRenderLinkField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { EditorialFrame } from 'lib/allianz-editorial-frame';
import { brightcoveEmbedSource, type AllianzVideoProps } from './allianz-video.props';
import './AllianzVideo.css';

export const Default = ({ fields, params }: AllianzVideoProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzVideo" />;
  const embedSource = isEditing ? '' : brightcoveEmbedSource(data.mediaLink?.jsonValue);
  const playerTitle = data.mediaLink?.jsonValue?.value?.text?.trim()
    || data.heading?.jsonValue?.value?.trim() || 'Video player';
  return <section className="allianz-local-video" id={params.RenderingIdentifier}>
    {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={data.heading?.jsonValue} />}
    {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
    <article className="video-block"><div className="video-block-content"><div className="bc-video-player"><div className="bc-video-player-inner">
      {embedSource ? <iframe className="allianz-video-player" src={embedSource}
        title={playerTitle} width={640} height={360} loading="lazy" allowFullScreen
        allow="autoplay 'none'; encrypted-media; fullscreen"
        sandbox="allow-scripts allow-same-origin" referrerPolicy="strict-origin-when-cross-origin" />
        // Keep the established empty-state and editor preview without a remote player.
        // eslint-disable-next-line @next/next/no-img-element
        : <img className="allianz-video-placeholder" src="/allianz-ui/video-placeholder.svg"
          alt="Video player would go here" width={640} height={360} />}
    </div></div></div></article>
    {isEditing && <div className="allianz-local-video-source-fields">
      {shouldRenderImageField(data.poster?.jsonValue, true) && <Image editable field={data.poster?.jsonValue} />}
      {shouldRenderLinkField(data.mediaLink?.jsonValue, true) && <Link editable field={allianzLinkField(data.mediaLink?.jsonValue, true)} />}
    </div>}
    {shouldRenderTextField(data.caption?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.caption?.jsonValue} />}
    {shouldRenderTextField(data.transcript?.jsonValue, isEditing) && <details open={isEditing || undefined} className="allianz-local-video-transcript"><summary>Read video transcript</summary><RichText editable={isEditing} field={data.transcript?.jsonValue} /></details>}
  </section>;
};

/** Source strategy row. The separate native Accordion owns the transcript. */
export const SourceStatic = ({ fields, params }: AllianzVideoProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzVideo" />;
  return <EditorialFrame params={params} column>
    {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={data.heading?.jsonValue} />}
    {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
    <div className="m-bcVideo u-margin-top-xl u-center-block allianz-source-static-video">
      {/* The approved local UI graphic does not initialize a remote player. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="allianz-video-placeholder" src="/allianz-ui/video-placeholder.svg"
        alt="Video player would go here" width={640} height={360} />
    </div>
    {shouldRenderTextField(data.caption?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.caption?.jsonValue} />}
  </EditorialFrame>;
};

/** FIA video presentation owns its source spacing without author theme parameters. */
export const FixedSourceStatic = (props: AllianzVideoProps) => {
  const fixedParams: AllianzVideoProps['params'] = { theme: 'transparent', sectionSpacing: '1', marginBottom: 'xl' };
  if (props.params?.RenderingIdentifier !== undefined) {
    fixedParams.RenderingIdentifier = props.params.RenderingIdentifier;
  }
  return <SourceStatic {...props} params={fixedParams} />;
};

/** RILA spacing is intrinsic because its native parameter template has no spacing fields. */
export const RilaStaticVideo = (props: AllianzVideoProps) => {
  const fixedParams: AllianzVideoProps['params'] = { theme: 'transparent', spacing: 'none',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'xl' };
  if (props.params?.RenderingIdentifier !== undefined) {
    fixedParams.RenderingIdentifier = props.params.RenderingIdentifier;
  }
  return <SourceStatic {...props} params={fixedParams} />;
};


import { useId } from 'react';

/** Classic keeps its source introduction and approved static video in one native owner. */
export const ClassicProductVideo = ({ fields, params }: AllianzVideoProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const glyphId = useId();
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzVideo" />;
  return <div className="l-container--full-width u-row-spacing t-bg-transparent axlTileCollection allianz-classic-product-video" id={params?.RenderingIdentifier || 'video'}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <div className="tileIcon t-bg-transparent t-icon-primary-black">
            <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby={`${glyphId}-title`} aria-describedby={`${glyphId}-description`} focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
              <title id={`${glyphId}-title`}>Light Bulb</title><desc id={`${glyphId}-description`}>Light Bulb</desc>
              <path fillRule="evenodd" d="M15.548,17 C15.634,16.472 15.873,15.618 16.538,14.894 C16.572,14.825 16.624,14.765 16.692,14.72 C18.763,13.32 20,10.995 20,8.5 C20,4.364 16.635,1 12.5,1 C8.364,1 5,4.364 5,8.5 C5,10.995 6.236,13.32 8.307,14.72 C8.379,14.768 8.434,14.832 8.472,14.905 C9.129,15.627 9.366,16.475 9.451,17 L15.548,17 Z M17.353,15.487 C16.509,16.331 16.5,17.488 16.5,17.5 C16.5,17.776 16.276,18 16,18 L9,18 C8.723,18 8.5,17.776 8.5,17.5 C8.5,17.49 8.48,16.321 7.646,15.487 C7.638,15.479 7.63,15.471 7.622,15.462 C5.351,13.868 4,11.277 4,8.5 C4,3.813 7.813,0 12.5,0 C17.187,0 21,3.813 21,8.5 C21,11.277 19.648,13.869 17.377,15.462 C17.369,15.471 17.361,15.479 17.353,15.487 Z M16,19 C16.276,19 16.5,19.224 16.5,19.5 C16.5,19.776 16.276,20 16,20 L9,20 C8.724,20 8.5,19.776 8.5,19.5 C8.5,19.224 8.724,19 9,19 L16,19 Z M16.5,21.5 C16.5,21.776 16.276,22 16,22 L9,22 C8.724,22 8.5,21.776 8.5,21.5 C8.5,21.224 8.724,21 9,21 L16,21 C16.276,21 16.5,21.224 16.5,21.5 Z M11,23 L14,23 C14.276,23 14.5,23.224 14.5,23.5 C14.5,23.776 14.276,24 14,24 L11,24 C10.724,24 10.5,23.776 10.5,23.5 C10.5,23.224 10.724,23 11,23 Z" />
            </svg>
          </div>
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
        </div></article>
      </div></div>
      <div className="l-grid__row"><div className="l-grid__column-medium-12">
        <div className="m-bcVideo u-margin-top-xl u-center-block allianz-source-static-video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="allianz-video-placeholder" src="/allianz-ui/video-placeholder.svg"
            alt="Video player would go here" width={640} height={360} />
        </div>
      </div></div>
    </div>
  </div>;
};

/** AA Plus keeps its source video-row spacing and separate native transcript owner. */
export const AAPlusProductVideo = ({ fields, params }: AllianzVideoProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const glyphId = useId();
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzVideo" />;
  return <div className="l-container--full-width t-bg-transparent axlTileCollection allianz-aa-plus-product-video" id={params?.RenderingIdentifier || 'video'}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <div className="tileIcon t-bg-transparent t-icon-primary-black">
            <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby={`${glyphId}-title`} aria-describedby={`${glyphId}-description`} focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
              <title id={`${glyphId}-title`}>Light Bulb</title><desc id={`${glyphId}-description`}>Light Bulb</desc>
              <path fillRule="evenodd" d="M15.548,17 C15.634,16.472 15.873,15.618 16.538,14.894 C16.572,14.825 16.624,14.765 16.692,14.72 C18.763,13.32 20,10.995 20,8.5 C20,4.364 16.635,1 12.5,1 C8.364,1 5,4.364 5,8.5 C5,10.995 6.236,13.32 8.307,14.72 C8.379,14.768 8.434,14.832 8.472,14.905 C9.129,15.627 9.366,16.475 9.451,17 L15.548,17 Z M17.353,15.487 C16.509,16.331 16.5,17.488 16.5,17.5 C16.5,17.776 16.276,18 16,18 L9,18 C8.723,18 8.5,17.776 8.5,17.5 C8.5,17.49 8.48,16.321 7.646,15.487 C7.638,15.479 7.63,15.471 7.622,15.462 C5.351,13.868 4,11.277 4,8.5 C4,3.813 7.813,0 12.5,0 C17.187,0 21,3.813 21,8.5 C21,11.277 19.648,13.869 17.377,15.462 C17.369,15.471 17.361,15.479 17.353,15.487 Z M16,19 C16.276,19 16.5,19.224 16.5,19.5 C16.5,19.776 16.276,20 16,20 L9,20 C8.724,20 8.5,19.776 8.5,19.5 C8.5,19.224 8.724,19 9,19 L16,19 Z M16.5,21.5 C16.5,21.776 16.276,22 16,22 L9,22 C8.724,22 8.5,21.776 8.5,21.5 C8.5,21.224 8.724,21 9,21 L16,21 C16.276,21 16.5,21.224 16.5,21.5 Z M11,23 L14,23 C14.276,23 14.5,23.224 14.5,23.5 C14.5,23.776 14.276,24 14,24 L11,24 C10.724,24 10.5,23.776 10.5,23.5 C10.5,23.224 10.724,23 11,23 Z" />
            </svg>
          </div>
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
        </div></article>
      </div></div>
      <div className="l-grid__row u-margin-bottom-xl"><div className="l-grid__column-medium-12">
        <div className="m-bcVideo u-margin-top-xl u-center-block allianz-source-static-video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="allianz-video-placeholder" src="/allianz-ui/video-placeholder.svg"
            alt="Video player would go here" width={640} height={360} />
        </div>
      </div></div>
    </div>
  </div>;
};

/** Benefit Control+ has a source-only player row; its introduction and transcript
 * remain separate native owners under the approved static-player treatment. */
export const BenefitControlPlusProductVideo = ({ fields, params }: AllianzVideoProps) => {
  if (!fields?.data?.datasource) return <NoDataFallback componentName="AllianzVideo" />;
  const sourceAnchor: import('react').AnchorHTMLAttributes<HTMLAnchorElement> & { name: string } = { name: 'video' };
  return <div className="l-container--full-width u-row-spacing t-bg-transparent axlTileCollection allianz-benefit-control-plus-product-video" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <a {...sourceAnchor} />
      <div className="l-grid__row"><div className="l-grid__column-medium-12">
        <div className="m-bcVideo u-margin-top-xl u-center-block allianz-source-static-video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="allianz-video-placeholder" src="/allianz-ui/video-placeholder.svg"
            alt="Video player would go here" width={640} height={360} />
        </div>
      </div></div>
    </div>
  </div>;
};


/** Essential Income 7 has a source-only static player with both bottom spacing classes.
 * The separate introduction owns the video anchor; the transcript owns its own fields. */
export const EssentialIncome7ProductVideo = ({ fields, params }: AllianzVideoProps) => {
  if (!fields?.data?.datasource) return <NoDataFallback componentName="AllianzVideo" />;
  return <div className="l-container--full-width u-row-spacing t-bg-transparent axlTileCollection allianz-essential-income-7-product-video" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-xl u-padding-bottom-xl"><div className="l-grid__column-medium-12">
        <div className="m-bcVideo u-margin-top-xl u-center-block allianz-source-static-video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="allianz-video-placeholder" src="/allianz-ui/video-placeholder.svg"
            alt="Video player would go here" width={640} height={360} />
        </div>
      </div></div>
    </div>
  </div>;
};


/** Approved static treatment retains the real native media-link owner in editing.
 * The benefits introduction and transcript keep their separate native fields.
 * Clearing/removing the media link removes the public player surface. */
export const CoreIncome7ProductVideo = ({ fields, params }: AllianzVideoProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzVideo" />;
  return <div className="l-container--full-width u-row-spacing t-bg-primary-white axlTileCollection" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row"><div className="l-grid__column-medium-12">
        {shouldRenderLinkField(data.mediaLink?.jsonValue, isEditing) && <div className="m-bcVideo u-margin-top-xl u-center-block allianz-source-static-video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="allianz-video-placeholder" src="/allianz-ui/video-placeholder.svg"
            alt="Video player would go here" width={640} height={360} />
        </div>}
        {isEditing && data.mediaLink?.jsonValue && <div className="allianz-source-static-video-fields">
          <Link editable field={data.mediaLink.jsonValue} />
        </div>}
      </div></div>
    </div>
  </div>;
};
