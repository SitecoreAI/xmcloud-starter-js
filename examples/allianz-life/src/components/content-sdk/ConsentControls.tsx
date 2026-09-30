'use client';
import { useState, useSyncExternalStore } from 'react';
import { CONSENT_COOKIE, CONSENT_EVENT } from 'lib/consent';

export default function ConsentControls() {
  const choice = useSyncExternalStore((callback) => { window.addEventListener(CONSENT_EVENT,callback); return () => window.removeEventListener(CONSENT_EVENT,callback); }, () => document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${CONSENT_COOKIE}=`))?.split('=')[1] || '', () => '');
  const [isOpen, setIsOpen] = useState(false);
  function choose(value: 'granted' | 'rejected') {
    document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setIsOpen(false);
    window.dispatchEvent(new Event(CONSENT_EVENT));
    // Re-resolve native assignment only after the explicit choice reaches the proxy.
    window.location.reload();
  }
  return <>
    <div className="allianz-cookie-settings"><button type="button" className="allianz-text-button" onClick={() => setIsOpen(true)}>Cookie settings</button></div>
    {isOpen && <aside className="allianz-consent-panel" aria-label="Privacy choices"><p>Optional analytics help us understand how visitors use our website and personalize content. Choose your preference below. Your current preference: {choice === 'granted' ? 'accepted' : 'optional analytics off'}.</p><div><button type="button" className="m-axlButton m-axlButton--direct" onClick={() => choose('granted')}>Accept optional cookies</button><button type="button" className="m-axlButton m-axlButton--tertiary" onClick={() => choose('rejected')}>Reject optional cookies</button></div></aside>}
  </>;
}
