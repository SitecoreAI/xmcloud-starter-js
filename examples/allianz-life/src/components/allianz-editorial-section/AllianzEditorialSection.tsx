import { AppPlaceholder } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import componentMap from '.sitecore/component-map';
import { rowSpacing, sectionTheme } from 'lib/allianz-fields';

/** Structural only: ordered native renderings remain independently editable.
 * Resolve a real SXA dynamic placeholder; never derive native identities here. */
export const Default = (props: ComponentProps) => {
  const params = props.params;
  const id = params?.DynamicPlaceholderId;
  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    throw new Error('AllianzEditorialSection requires a numeric native SXA DynamicPlaceholderId parameter.');
  }
  const children = <AppPlaceholder name={`allianz-editorial-section-${id}`}
    rendering={props.rendering} page={props.page} componentMap={componentMap} />;
  return <div className={`${params.sectionWidth === 'contained' ? 'l-container' : 'l-container--full-width'} ${params.sectionSpacing === '1' ? 'u-row-spacing ' : ''}${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className={`l-grid l-grid--max-width${params.sectionWidth === 'contained' ? ' l-grid--no-gutters-outer' : ''}`}>
      {params.layout === 'column' ? <div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">{children}</div></div> : children}
    </div>
  </div>;
};
