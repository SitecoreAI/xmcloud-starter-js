'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { COOKIE_NOTICE_COOKIE, COOKIE_NOTICE_EVENT, isCookieNoticeDismissed } from 'lib/consent';

const subscribeNotice = (callback: () => void) => {
  window.addEventListener(COOKIE_NOTICE_EVENT, callback);
  return () => window.removeEventListener(COOKIE_NOTICE_EVENT, callback);
};
const subscribeClientReady = () => () => {};

export default function ConsentControls() {
  const { page } = useSitecore();
  // Read the visitor's cookie before showing the notice, avoiding a flash on
  // already-dismissed visits. Editing and Design Library stay unobstructed.
  const clientReady = useSyncExternalStore(subscribeClientReady, () => true, () => false);
  const storedDismissal = useSyncExternalStore(subscribeNotice, isCookieNoticeDismissed, () => false);
  const [dismissed, setDismissed] = useState(false);
  function dismiss() {
    // The public source proves persistence through reload and same-site
    // navigation; its expiry was not inspected. Use a site-wide session cookie.
    document.cookie = `${COOKIE_NOTICE_COOKIE}=dismissed; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setDismissed(true);
    window.dispatchEvent(new Event(COOKIE_NOTICE_EVENT));
  }
  if (!clientReady || page?.mode?.isEditing || page?.mode?.isDesignLibrary || storedDismissal || dismissed) return null;
  return <div className="m-axl-cookie-banner" role="region" aria-label="Cookie notice">
    <div className="m-axl-cookie-banner__content u-text-negative">
      <p>We use cookies, pixels, web beacons and similar technologies (“Cookies”) to enhance your experience, analyze site traffic, and track usage. By continuing to use this site, you agree to our use of Cookies and to the collection, use and disclosure of your data as described in our <Link href="/Privacy#OnlinePrivacyPolicy">Privacy Policy.</Link></p>
      <button type="button" className="m-axlButton m-axlButton-icon m-axlButton--secondary m-axlButton--negative js-close-button" onClick={dismiss}>
        <span className="m-axlButton__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fillRule="evenodd" d="M14.2330677,12 L23.5933902,21.3603225 C24.1791767,21.9461089 24.1791767,22.8958564 23.5933902,23.4816428 L23.4816428,23.5933902 C22.8958564,24.1791767 21.9461089,24.1791767 21.3603225,23.5933902 L12,14.2330677 L2.6396775,23.5933902 C2.05389106,24.1791767 1.10414359,24.1791767 0.518357153,23.5933902 L0.406609781,23.4816428 C-0.179176657,22.8958564 -0.179176657,21.9461089 0.406609781,21.3603225 L9.76693228,12 L0.406609781,2.6396775 C-0.179176657,2.05389106 -0.179176657,1.10414359 0.406609781,0.518357153 L0.518357153,0.406609781 C1.10414359,-0.179176657 2.05389106,-0.179176657 2.6396775,0.406609781 L12,9.76693228 L21.3603225,0.406609781 C21.9461089,-0.179176657 22.8958564,-0.179176657 23.4816428,0.406609781 L23.5933902,0.518357153 C24.1791767,1.10414359 24.1791767,2.05389106 23.5933902,2.6396775 L14.2330677,12 Z" /></svg></span>Dismiss
      </button>
    </div>
  </div>;
}
