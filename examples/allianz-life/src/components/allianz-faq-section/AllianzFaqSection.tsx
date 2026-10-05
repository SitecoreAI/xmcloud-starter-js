import { AppPlaceholder } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import componentMap from '.sitecore/component-map';

/**
 * Source-faithful shared FAQ width/spacing. Native Layout Service must expose
 * allianz-faq-section-{*}; each instance needs a genuine DynamicPlaceholderId.
 * The child intro and accordion remain independent native rendering instances.
 */
export const Default = (props: ComponentProps) => {
  const dynamicPlaceholderId = props.params?.DynamicPlaceholderId;
  if (typeof dynamicPlaceholderId !== 'string' || !/^\d+$/.test(dynamicPlaceholderId)) {
    throw new Error('AllianzFaqSection requires a numeric native SXA DynamicPlaceholderId parameter.');
  }
  return (
    <div className="l-container u-row-spacing t-bg-transparent axlTileCollection" id={props.params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width l-grid--no-gutters-outer">
        <AppPlaceholder name={`allianz-faq-section-${dynamicPlaceholderId}`}
          rendering={props.rendering} page={props.page} componentMap={componentMap} />
      </div>
    </div>
  );
};
