import type { AnchorHTMLAttributes } from 'react';
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
  // Structural children reuse the existing native container choices. A content
  // section has no host element, so its identifier is a source named anchor.
  if (params.container === 'content') {
    // React omits the legacy name attribute from its anchor type; retain the source.
    const anchorProps: AnchorHTMLAttributes<HTMLAnchorElement> & { name?: string } = { name: params.RenderingIdentifier };
    return <>
      {params.RenderingIdentifier && <a {...anchorProps} />}
      {children}
    </>;
  }
  if (params.container === 'row') return <div className={`l-grid__row ${rowSpacing(params)}`} id={params.RenderingIdentifier}>
    {params.layout === 'column' ? <div className="l-grid__column-medium-12">{children}</div> : children}
  </div>;
  return <div className={`${params.sectionWidth === 'contained' ? 'l-container' : 'l-container--full-width'} ${params.sectionSpacing === '1' ? 'u-row-spacing ' : ''}${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className={`l-grid l-grid--max-width${params.sectionWidth === 'contained' ? ' l-grid--no-gutters-outer' : ''}`}>
      {params.layout === 'column' ? <div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">{children}</div></div> : params.layout === 'row' ? <div className={`l-grid__row ${rowSpacing(params)}`}>{children}</div> : children}
    </div>
  </div>;
};

/** Purpose-specific slots keep legacy document controls independently editable.
 * Native placeholder settings restrict each slot to its matching rendering. */
function legacyDocumentPlaceholder(props: ComponentProps, slot: 'notice' | 'heading' | 'table' | 'disclosure') {
  const id = props.params?.DynamicPlaceholderId;
  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    throw new Error('AllianzEditorialSection requires a numeric native SXA DynamicPlaceholderId parameter.');
  }
  return <AppPlaceholder name={`allianz-legacy-document-${slot}-${id}`}
    rendering={props.rendering} page={props.page} componentMap={componentMap} />;
}

/** Archived notices precede an Embedded table nested inside the pre-content column. */
export const LegacyDocumentPreContent = (props: ComponentProps) => (
  <div className="row" id={props.params?.RenderingIdentifier}>
    <div className="col-md-12 content-body pre-content">
      {legacyDocumentPlaceholder(props, 'notice')}
      <div className="col-md-12 content-body content">
        {legacyDocumentPlaceholder(props, 'table')}
      </div>
    </div>
  </div>
);

/** The source heading, Embedded table and Legacy disclosure share one content column. */
export const LegacyDocumentContent = (props: ComponentProps) => (
  <div className="row" id={props.params?.RenderingIdentifier}>
    <div className="col-md-12 content-body content">
      {legacyDocumentPlaceholder(props, 'heading')}
      {legacyDocumentPlaceholder(props, 'table')}
      {legacyDocumentPlaceholder(props, 'disclosure')}
    </div>
  </div>
);

/** Product documents have six independent native controls within the source shell. */
function productDocumentPlaceholder(props: ComponentProps, slot: 'heading' | 'navigation' | 'table' | 'next-steps' | 'form' | 'disclosure') {
  const id = props.params?.DynamicPlaceholderId;
  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    throw new Error('AllianzEditorialSection requires a numeric native SXA DynamicPlaceholderId parameter.');
  }
  return <AppPlaceholder name={`allianz-product-document-${slot}-${id}`}
    rendering={props.rendering} page={props.page} componentMap={componentMap} />;
}

/** Opt-in product shell. Source CSS keeps next steps and the local form hidden,
 * including in Pages; their native fields remain accessible through Content mode. */
export const LegacyProductDocument = (props: ComponentProps) => <>
  {productDocumentPlaceholder(props, 'heading')}
  <div className="row hidden"><div className="col-md-12 content-body pre-content" /></div>
  <div className="row" id={props.params?.RenderingIdentifier}>
    <div className="col-md-12 content-body content">
      {productDocumentPlaceholder(props, 'navigation')}
      {productDocumentPlaceholder(props, 'table')}
      <div className="next-steps">
        {productDocumentPlaceholder(props, 'next-steps')}
        {productDocumentPlaceholder(props, 'form')}
      </div>
    </div>
  </div>
  <div className="row hidden"><div className="col-md-12 content-body post-content" /></div>
  <div className="row"><div className="col-md-12 content-body disclosure" /></div>
  {productDocumentPlaceholder(props, 'disclosure')}
  <div className="row"><div className="col-xs-12 content-footer">
    <ul className="tools" /><ul className="social-share" />
  </div></div>
</>;
