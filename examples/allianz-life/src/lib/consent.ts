export const CONSENT_COOKIE = 'allianz_demo_consent';
export const CONSENT_EVENT = 'allianz-demo-consent';
export const SDK_READY_EVENT = 'allianz-demo-sdk-ready';
// Dismissing the source notice does not grant optional analytics consent.
export const COOKIE_NOTICE_COOKIE = 'allianz_cookie_notice';
export const COOKIE_NOTICE_EVENT = 'allianz-cookie-notice-dismissed';
export function isCookieNoticeDismissed() {
  return typeof document !== 'undefined' && document.cookie.split(';').some((part) => part.trim() === `${COOKIE_NOTICE_COOKIE}=dismissed`);
}
export function hasAnalyticsConsent() {
  return typeof document !== 'undefined' && document.cookie.split(';').some((part) => part.trim() === `${CONSENT_COOKIE}=granted`);
}
