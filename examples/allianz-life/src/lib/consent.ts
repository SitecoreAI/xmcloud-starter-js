export const CONSENT_COOKIE = 'allianz_demo_consent';
export const CONSENT_EVENT = 'allianz-demo-consent';
export const SDK_READY_EVENT = 'allianz-demo-sdk-ready';
export function hasAnalyticsConsent() {
  return typeof document !== 'undefined' && document.cookie.split(';').some((part) => part.trim() === `${CONSENT_COOKIE}=granted`);
}
