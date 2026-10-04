import { AppPlaceholder } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';
import componentMap from '.sitecore/component-map';

/**
 * Page-design-owned extension point for Biography pages.
 *
 * Native SXA setup must expose biography-body-{*} through Layout Service
 * Placeholders and supply DynamicPlaceholderId. The partial design owns this
 * container; each page continues to own its existing child rendering instances.
 */
export const Default = (props: ComponentProps) => {
  const dynamicPlaceholderId = props.params?.DynamicPlaceholderId;
  if (typeof dynamicPlaceholderId !== 'string' || !/^\d+$/.test(dynamicPlaceholderId)) {
    throw new Error('BiographyBody requires a numeric native SXA DynamicPlaceholderId parameter.');
  }

  return (
    <AppPlaceholder
      name={`biography-body-${dynamicPlaceholderId}`}
      rendering={props.rendering}
      page={props.page}
      componentMap={componentMap}
    />
  );
};
