'use client';
import { Image, RichText, Text } from '@sitecore-content-sdk/nextjs';
import { useState } from 'react';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { localVideoSource, type AllianzVideoProps } from './allianz-video.props';

export const Default = ({ fields, params }: AllianzVideoProps) => {
  const [unavailable, setUnavailable] = useState(false);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzVideo" />;
  const media = localVideoSource(data.localVideo?.jsonValue?.value?.src || data.mediaLink?.jsonValue?.value?.href);
  const poster = data.poster?.jsonValue?.value?.src || '';
  return <section className="allianz-local-video" id={params.RenderingIdentifier}>
    {data.heading?.jsonValue?.value && <Text tag="h3" field={data.heading.jsonValue} />}
    {data.body?.jsonValue?.value && <RichText field={data.body.jsonValue} />}
    <article className="video-block"><div className="video-block-content"><div className="bc-video-player"><div className="bc-video-player-inner">
      {media ? <video className="video-js" controls preload="none" poster={poster || undefined} src={media} onError={() => setUnavailable(true)} /> : <div className="allianz-local-video-poster">
        {poster && <Image field={data.poster?.jsonValue} />}
        <button type="button" className="allianz-local-video-play" aria-label={data.heading?.jsonValue?.value ? `Play ${data.heading.jsonValue.value}` : 'Play video'} onClick={() => setUnavailable(true)}><svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><path d="m10 5 17 11-17 11z" fill="currentColor" /></svg></button>
      </div>}
    </div></div></div></article>
    {unavailable && <p role="status">Video is unavailable. {data.transcript?.jsonValue?.value ? 'You can read the transcript below.' : ''}</p>}
    {data.caption?.jsonValue?.value && <RichText field={data.caption.jsonValue} />}
    {data.transcript?.jsonValue?.value && <details className="allianz-local-video-transcript"><summary>Read video transcript</summary><RichText field={data.transcript.jsonValue} /></details>}
  </section>;
};
