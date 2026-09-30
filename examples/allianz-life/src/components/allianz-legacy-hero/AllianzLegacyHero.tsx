import { Image, Link, RichText } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { safeLink, type AllianzProps } from 'lib/allianz-fields';

/** Source hero layout; content stays in native text, image, and link fields. */
export const Default = ({ fields, params }: AllianzProps) => {
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyHero" />;
  const position = params.position === 'left' ? 'left' : 'right';
  const productLine = params.productLine === 'annuities' ? 'index-variable' : params.productLine === 'life-insurance' ? 'life' : 'no-product-line';
  const desktop = data.desktopImage?.jsonValue;
  const mobile = data.mobileImage?.jsonValue;
  return <div className="hero-img" id={params.RenderingIdentifier}>
    <picture>
      {mobile?.value?.src && <source media="(max-width: 767px)" srcSet={mobile.value.src} />}
      <Image field={desktop} />
    </picture>
    {(data.heading?.jsonValue?.value || data.body?.jsonValue?.value) && <div className={`notepad ${productLine} ${position} col-sm-4`}>
      <div className="notepad-content">
        <RichText tag="h1" field={data.heading?.jsonValue} />
        <RichText field={data.body?.jsonValue} />
        {data.primaryLink?.jsonValue?.value?.href && <Link field={safeLink(data.primaryLink.jsonValue)} />}
      </div><div className="notepad-corner" aria-hidden="true" />
    </div>}
  </div>;
};
