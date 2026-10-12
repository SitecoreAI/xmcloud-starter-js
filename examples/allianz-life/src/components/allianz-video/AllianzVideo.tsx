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
