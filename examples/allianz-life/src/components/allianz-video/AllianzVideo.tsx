'use client';
import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useState } from 'react';
import { allianzLinkField, shouldRenderImageField, shouldRenderTextField, shouldRenderLinkField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { localVideoSource, type AllianzVideoProps } from './allianz-video.props';

export const Default = ({ fields, params }: AllianzVideoProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const [unavailable, setUnavailable] = useState(false);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzVideo" />;
  const media = localVideoSource(data.localVideo?.jsonValue?.value?.src || data.mediaLink?.jsonValue?.value?.href);
  const poster = data.poster?.jsonValue?.value?.src || '';
  return <section className="allianz-local-video" id={params.RenderingIdentifier}>
    {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={data.heading?.jsonValue} />}
    {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
    <article className="video-block"><div className="video-block-content"><div className="bc-video-player"><div className="bc-video-player-inner">
      {isEditing ? <div className="allianz-local-video-poster">
        {shouldRenderImageField(data.poster?.jsonValue, true) && <Image editable field={data.poster?.jsonValue} />}
        {shouldRenderLinkField(data.mediaLink?.jsonValue, true) && <Link editable field={allianzLinkField(data.mediaLink?.jsonValue, true)} />}
      </div> : media ? <video className="video-js" controls preload="none" poster={poster || undefined} src={media} onError={() => setUnavailable(true)} /> : <div className="allianz-local-video-poster">
        {poster && <Image editable={isEditing} field={data.poster?.jsonValue} />}
        <button type="button" className="allianz-local-video-play" aria-label={data.heading?.jsonValue?.value ? `Play ${data.heading.jsonValue.value}` : 'Play video'} onClick={() => setUnavailable(true)}><svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><path d="m10 5 17 11-17 11z" fill="currentColor" /></svg></button>
      </div>}
    </div></div></div></article>
    {unavailable && <p role="status">Video is unavailable. {data.transcript?.jsonValue?.value ? 'You can read the transcript below.' : ''}</p>}
    {shouldRenderTextField(data.caption?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.caption?.jsonValue} />}
    {shouldRenderTextField(data.transcript?.jsonValue, isEditing) && <details open={isEditing || undefined} className="allianz-local-video-transcript"><summary>Read video transcript</summary><RichText editable={isEditing} field={data.transcript?.jsonValue} /></details>}
  </section>;
};
