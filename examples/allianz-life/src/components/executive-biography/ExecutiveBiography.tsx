'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { biographyLinkField } from '../expert-biography/expert-biography.props';
import { executiveBiographyLayouts, type ExecutiveBiographyLayout, type ExecutiveBiographyProps } from './executive-biography.props';
import './ExecutiveBiography.css';

const ExecutiveBiography = ({ fields, params, layout }: ExecutiveBiographyProps & { layout: ExecutiveBiographyLayout }) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Executive Biography" />;
  const name = data.name?.jsonValue;
  const role = data.role?.jsonValue;
  const portrait = data.portrait?.jsonValue;
  const biography = data.biography?.jsonValue;
  const portraitLink = biographyLinkField(data.portraitLink?.jsonValue, editable, 'portrait');
  const image = shouldRenderImageField(portrait, editable) && <Image field={portrait} editable={editable}
    style={layout.portraitWidth ? { width: '768px', maxWidth: '100%' } : { maxWidth: '100%' }} />;

  return <>
    <div className={`component executive-biography l-container--full-width ${layout.headingSpacing ? 'u-row-spacing ' : ''}t-bg-transparent axlTileCollection`} id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
          <div className="l-grid__column-medium-12">
            <article className="m-axlIntroductionBlock -is--stacked -no--image">
              <div className="tileContent u-text-center">
                <header>
                  <div className="tileHeading">{shouldRenderTextField(name, editable) && <Text tag="h1" field={name} editable={editable} />}</div>
                  <div className="tileSubHeading">{shouldRenderTextField(role, editable) && <RichText tag="div" className={`${layout.roleTag} executive-biography-role`} role="heading" aria-level={layout.roleTag === 'h2' ? 2 : 4} field={role} editable={editable} />}</div>
                </header>
              </div>
            </article>
          </div>
        </div>
        <div className="l-grid__row">
          <div className="l-grid__column-medium-4" />
          <div className="l-grid__column-medium-4">
            <div className="o-richTextEditor__wrapper">
              {layout.linkedPortrait ? <p>
                {shouldRenderImageField(portrait, editable) && portraitLink && shouldRenderLinkField(portraitLink, editable)
                  ? editable && !portraitLink?.value?.href
                    ? <><Link field={portraitLink} editable={editable} />{image}</>
                    : <Link field={portraitLink} editable={editable}>{image}</Link>
                  : image}
              </p> : image}
            </div>
          </div>
          <div className="l-grid__column-medium-4" />
        </div>
      </div>
    </div>
    <div className={`${layout.bodyContainer} u-row-spacing t-bg-transparent axlTileCollection`}>
      <div className={`l-grid l-grid--max-width${layout.bodyContainer === 'l-container' ? ' l-grid--no-gutters-outer' : ''}`}>
        <div className={`l-grid__row${layout.bodyMargin ? ' u-margin-bottom-xl' : ''}`}>
          <div className="l-grid__column-medium-12">
            <article className="m-axlIntroductionBlock -is--stacked -no--image">
              <div className="tileContent u-text-left">
                <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
                {shouldRenderTextField(biography, editable)
                  ? <RichText className="tileBody" field={biography} editable={editable} />
                  : <div className="tileBody" />}
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </>;
};

export const Default = (props: ExecutiveBiographyProps) => <ExecutiveBiography {...props} layout={executiveBiographyLayouts.standard} />;
export const Extended = (props: ExecutiveBiographyProps) => <ExecutiveBiography {...props} layout={executiveBiographyLayouts.extended} />;
export const Contained = (props: ExecutiveBiographyProps) => <ExecutiveBiography {...props} layout={executiveBiographyLayouts.contained} />;
export const ChiefExecutive = (props: ExecutiveBiographyProps) => <ExecutiveBiography {...props} layout={executiveBiographyLayouts.chiefExecutive} />;
export const LinkedPortrait = (props: ExecutiveBiographyProps) => <ExecutiveBiography {...props} layout={executiveBiographyLayouts.linkedPortrait} />;
