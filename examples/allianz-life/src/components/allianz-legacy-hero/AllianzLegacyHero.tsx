'use client';

import { Image, Link, RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { AllianzProps } from 'lib/allianz-fields';
import { isNewYorkAnnuitiesPage, isNewYorkHomePage } from 'lib/allianz-new-york-page';
import NewYorkHomeHero from './NewYorkHomeHero.props';
import './AllianzNewYorkHero.css';

/** Source hero layout; content stays in native text, image, and link fields. */
export const Default = ({ fields, params }: AllianzProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyHero" />;
  const routeFields = page?.layout?.sitecore?.route?.fields;
  if (params.layout === 'home' && isNewYorkHomePage(routeFields)) {
    return <NewYorkHomeHero data={data} params={params} isEditing={isEditing} />;
  }
  const nyAnnuities = params.layout === 'stage' && isNewYorkAnnuitiesPage(routeFields);
  const position = params.position === 'left' ? 'left' : 'right';
  const productLine = params.productLine === 'annuities' ? 'index-variable' : params.productLine === 'life-insurance' ? 'life' : 'no-product-line';
  const desktop = data.desktopImage?.jsonValue;
  const mobile = data.mobileImage?.jsonValue;
  return <div className={`hero-img${nyAnnuities ? ' allianz-ny-annuities-hero' : ''}`} id={params.RenderingIdentifier}>
    <picture>
      {mobile?.value?.src && <source media="(max-width: 767px)" srcSet={mobile.value.src} />}
      {shouldRenderImageField(desktop, isEditing) && <Image editable={isEditing} field={desktop} />}
    </picture>
    {(shouldRenderTextField(data.heading?.jsonValue, isEditing) || shouldRenderTextField(data.body?.jsonValue, isEditing)) && <div className={`notepad ${productLine} ${position} col-sm-${nyAnnuities ? 5 : 4}`}>
      <div className="notepad-content">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag="h1" field={data.heading?.jsonValue} />}
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
        {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} />}
      </div><div className="notepad-corner" aria-hidden="true" />
    </div>}
  </div>;
};
