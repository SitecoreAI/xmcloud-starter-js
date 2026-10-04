'use client';
import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderImageField, shouldRenderTextField, shouldRenderLinkField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { AllianzVideoProps } from './allianz-video.props';
import './AllianzVideo.css';

export const Default = ({ fields, params }: AllianzVideoProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzVideo" />;
  return <section className="allianz-local-video" id={params.RenderingIdentifier}>
    {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={data.heading?.jsonValue} />}
    {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
    <article className="video-block"><div className="video-block-content"><div className="bc-video-player"><div className="bc-video-player-inner">
      {/* This is a static UI graphic; authored media fields remain available below in editing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="allianz-video-placeholder" src="/allianz-ui/video-placeholder.svg"
        alt="Video player would go here" width={640} height={360} />
    </div></div></div></article>
    {isEditing && <div className="allianz-local-video-source-fields">
      {shouldRenderImageField(data.poster?.jsonValue, true) && <Image editable field={data.poster?.jsonValue} />}
      {shouldRenderLinkField(data.mediaLink?.jsonValue, true) && <Link editable field={allianzLinkField(data.mediaLink?.jsonValue, true)} />}
    </div>}
    {shouldRenderTextField(data.caption?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.caption?.jsonValue} />}
    {shouldRenderTextField(data.transcript?.jsonValue, isEditing) && <details open={isEditing || undefined} className="allianz-local-video-transcript"><summary>Read video transcript</summary><RichText editable={isEditing} field={data.transcript?.jsonValue} /></details>}
  </section>;
};
