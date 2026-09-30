'use client';
import { useEffect, JSX } from 'react';
import { initContentSdk } from '@sitecore-content-sdk/nextjs';
import { eventsPlugin } from '@sitecore-content-sdk/events';
import { analyticsBrowserAdapter, analyticsPlugin } from '@sitecore-content-sdk/analytics-core';
import config from 'sitecore.config';
import { CONSENT_EVENT, SDK_READY_EVENT, hasAnalyticsConsent } from 'lib/consent';

const Bootstrap = ({
  siteName,
  isPreviewMode,
}: {
  siteName: string;
  isPreviewMode: boolean;
}): JSX.Element | null => {
  useEffect(() => {
    let isInitialized = false;
    const initialize = () => {
      if (isInitialized || isPreviewMode || !hasAnalyticsConsent() || process.env.NEXT_PUBLIC_ALLIANZ_ANALYTICS_ENABLED !== 'true' || !config.api.edge?.clientContextId) return;
      isInitialized = true;
      initContentSdk({
        config: {
          contextId: config.api.edge.clientContextId,
          edgeUrl: config.api.edge.edgeUrl,
          siteName: siteName || config.defaultSite,
        },
        plugins: [
          analyticsPlugin({
            options: {
              enableCookie: true,
              cookieDomain: window.location.hostname.replace(/^www\./, ''),
            },
            adapter: analyticsBrowserAdapter(),
          }),
          eventsPlugin(),
        ],
      }).then(() => window.dispatchEvent(new Event(SDK_READY_EVENT))).catch(() => { isInitialized = false; });
    };
    initialize();
    window.addEventListener(CONSENT_EVENT, initialize);
    return () => window.removeEventListener(CONSENT_EVENT, initialize);
  }, [siteName, isPreviewMode]);

  return null;
};

export default Bootstrap;
