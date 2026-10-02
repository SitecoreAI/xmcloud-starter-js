'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { biographyLinkField, type ExpertBiographyProps } from './expert-biography.props';
import './ExpertBiography.css';

/** Fixed source identity, 66/33 focus tile, biography and PDF download design. */
export const Default = ({ fields, params }: ExpertBiographyProps) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Expert Biography" />;
  const name = data.name?.jsonValue;
  const role = data.role?.jsonValue;
  const focus = data.focus?.jsonValue;
  const portrait = data.portrait?.jsonValue;
  const biography = data.biography?.jsonValue;
  const downloadLink = biographyLinkField(data.downloadLink?.jsonValue, editable);

  return <div className="component expert-biography l-container--full-width u-row-spacing t-bg-transparent axlTileCollection" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
        <div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image">
            <div className="tileContent u-text-center">
              <header>
                <div className="tileHeading">{shouldRenderTextField(name, editable) && <Text tag="h1" field={name} editable={editable} />}</div>
                <div className="tileSubHeading">{shouldRenderTextField(role, editable) && <RichText tag="div" className="h5 expert-biography-role" role="heading" aria-level={5} field={role} editable={editable} />}</div>
              </header>
            </div>
          </article>
        </div>
      </div>
      <div className="l-grid__row u-margin-bottom-xl">
        <div className="l-grid__column-medium-12">
          <article className="m-axlTile match-height tile--6633 -is--flipped -is--split t-bg-blue-soft">
            <div className="tileContent u-text-left">
              <div className="tileSubGrid__content">
                <header><div className="tileHeading"><h3>Focused on:</h3></div><div className="tileSubHeading" /></header>
                {shouldRenderTextField(focus, editable)
                  ? <RichText className="tileBody u-font-size-lg" field={focus} editable={editable} />
                  : <div className="tileBody u-font-size-lg" />}
              </div>
            </div>
            {shouldRenderImageField(portrait, editable) && <div className="tileImage">
              <picture className="c-image c-teaser__image">
                <Image field={portrait} editable={editable} alt={portrait?.value?.alt ?? ''} sizes="100vw" className="c-image__img c-teaser__image-img" />
              </picture>
            </div>}
          </article>
          <article className="m-axlIntroductionBlock -is--stacked -no--image">
            <div className="tileContent u-text-left">
              <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
              {shouldRenderTextField(biography, editable)
                ? <RichText className="tileBody" field={biography} editable={editable} />
                : <div className="tileBody" />}
              <footer>
                <div className="tileLink">
                  {downloadLink && shouldRenderLinkField(downloadLink, editable) && <Link className="a-link" field={downloadLink} editable={editable} aria-label={downloadLink?.value?.text}>
                    <span aria-hidden="true" className="a-link__icon">
                      <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleIconDownload" aria-describedby="descIconDownload" focusable="true" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><title id="titleIconDownload">Download</title><desc id="descIconDownload">Download</desc>
                        <path fillRule="evenodd" d="M11.0088496,18.601 L5.41052947,13.1737857 C4.86315684,12.6431429 4.86315684,11.7854286 5.41052947,11.2547857 C5.9579021,10.7241429 6.84265787,10.7241429 7.3900305,11.2547857 L10.60007,14.3667143 L10.60007,1.35714286 C10.60007,0.606642857 11.2258387,0 12,0 C12.7741613,0 13.39993,0.606642857 13.39993,1.35714286 L13.39993,14.3667143 L16.6099695,11.2547857 C17.1573421,10.7241429 18.0420979,10.7241429 18.5894705,11.2547857 C19.1368432,11.7854286 19.1368432,12.6431429 18.5894705,13.1737857 L12.9911504,18.601 C12.8623569,18.7272143 12.7069647,18.8262857 12.5347733,18.8955 C12.3639818,18.9647143 12.1819909,19 12,19 C11.8180091,19 11.6360182,18.9647143 11.4652267,18.8955 C11.2930353,18.8262857 11.1376431,18.7272143 11.0088496,18.601 Z M22.9090909,18 C23.5104545,18 24,18.4669565 24,19.0434783 L24,22.9565217 C24,23.5317391 23.5104545,24 22.9090909,24 L1.09090909,24 C0.489545455,24 0,23.5317391 0,22.9565217 L0,19.0434783 C0,18.4669565 0.489545455,18 1.09090909,18 C1.69227273,18 2.18181818,18.4669565 2.18181818,19.0434783 L2.18181818,21.9130435 L21.8181818,21.9130435 L21.8181818,19.0434783 C21.8181818,18.4669565 22.3077273,18 22.9090909,18 Z" />
                      </svg>
                    </span>
                    <span className="a-link__text">{downloadLink?.value?.text}</span>
                  </Link>}
                </div>
              </footer>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>;
};
