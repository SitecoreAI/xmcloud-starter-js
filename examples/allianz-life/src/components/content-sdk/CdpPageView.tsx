'use client';
import { useEffect, JSX } from 'react';
import { CdpHelper, useSitecore } from '@sitecore-content-sdk/nextjs';
import { pageView } from '@sitecore-content-sdk/events';
import config from 'sitecore.config';
import { hasAnalyticsConsent, SDK_READY_EVENT } from 'lib/consent';

/**
 * This is the CDP page view component.
 * It uses the Sitecore Cloud SDK to enable page view events on the client-side.
 * See Sitecore Cloud SDK documentation for details.
 * https://www.npmjs.com/package/@sitecore-cloudsdk/events
 */
const CdpPageView = (): JSX.Element => {
  const {
    page: { layout, siteName, mode },
  } = useSitecore();
  const { route, context } = layout.sitecore;

  /**
   * Determines if the page view events should be turned off.
   * IMPORTANT: You should implement based on your cookie consent management solution of choice.
   * By default it is disabled in development mode
   */
  const disabled = () => {
    return process.env.NEXT_PUBLIC_ALLIANZ_ANALYTICS_ENABLED !== 'true' || !hasAnalyticsConsent();
  };

  useEffect(() => {
    // Do not create events in editing or preview mode or if missing route data
    if (!mode.isNormal || !route?.itemId) {
      return;
    }
    // Do not create events if disabled (e.g. we don't have consent)
    if (disabled()) {
      return;
    }

    const language = route.itemLanguage || config.defaultLanguage;
    const scope = config.personalize?.scope;

    const pageVariantId = CdpHelper.getPageVariantId(
      route.itemId,
      language,
      context.variantId as string,
      scope
    );
    // there can be cases where Events are not initialized which are expected to reject
    let sent = false;
    let sending = false;
    const send = () => { if (disabled() || sent || sending) return; sending = true; return pageView({
      channel: 'WEB',
      currency: 'USD',
      page: route.name,
      pageVariantId,
      language,
    }).then(() => { sent = true; }).catch((e) => console.debug(e)).finally(() => { sending = false; }); };
    send();
    window.addEventListener(SDK_READY_EVENT, send);
    return () => window.removeEventListener(SDK_READY_EVENT, send);
  }, [mode, route, context.variantId, siteName]);

  return <></>;
};

export default CdpPageView;
