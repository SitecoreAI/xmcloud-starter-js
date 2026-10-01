'use client';

import { Image, Link, RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { AllianzProps } from 'lib/allianz-fields';

/** Source hero layout; content stays in native text, image, and link fields. */
export const Default = ({ fields, params }: AllianzProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyHero" />;
  const position = params.position === 'left' ? 'left' : 'right';
  const productLine = params.productLine === 'annuities' ? 'index-variable' : params.productLine === 'life-insurance' ? 'life' : 'no-product-line';
  const desktop = data.desktopImage?.jsonValue;
  const mobile = data.mobileImage?.jsonValue;
  return <div className="hero-img" id={params.RenderingIdentifier}>
    <picture>
      {mobile?.value?.src && <source media="(max-width: 767px)" srcSet={mobile.value.src} />}
      <Image editable={isEditing} field={desktop} />
    </picture>
    {isEditing && mobile && <div>Mobile image<Image editable field={mobile} /></div>}
    {(shouldRenderTextField(data.heading?.jsonValue, isEditing) || shouldRenderTextField(data.body?.jsonValue, isEditing) || (isEditing && shouldRenderLinkField(data.primaryLink?.jsonValue, true))) && <div className={`notepad ${productLine} ${position} col-sm-4`}>
      <div className="notepad-content">
        <RichText editable={isEditing} tag="h1" field={data.heading?.jsonValue} />
        <RichText editable={isEditing} field={data.body?.jsonValue} />
        {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} />}
      </div><div className="notepad-corner" aria-hidden="true" />
    </div>}
  </div>;
};
