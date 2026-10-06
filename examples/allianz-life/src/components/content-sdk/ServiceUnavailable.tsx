'use client';
import { useEffect, useRef, useState } from 'react';

/** Inert public-reference links resolve locally and never enter account services. */
export default function ServiceUnavailable() {
  const [label, setLabel] = useState('');
  const close = useRef<HTMLButtonElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href$="#service-unavailable"],a[href$="#demo-unavailable"]');
      // React and this listener can share document; stopPropagation alone does not isolate local dialogs.
      if (!link || link.getAttribute('data-allianz-local-service-dialog') === 'true') return;
      event.preventDefault();
      previous.current = link;
      setLabel(link.textContent?.trim() || link.getAttribute('aria-label') || 'Online service');
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  useEffect(() => { if (label) close.current?.focus(); }, [label]);
  const dismiss = () => { setLabel(''); previous.current?.focus(); };
  return label ? <div className="allianz-demo-modal" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="allianz-service-title" onKeyDown={(event) => { if (event.key === 'Escape') dismiss(); if (event.key === 'Tab') { event.preventDefault(); close.current?.focus(); } }}>
      <h2 id="allianz-service-title">{label}</h2><p>This service is unavailable on this website. Please contact customer service for assistance.</p>
      <button ref={close} type="button" className="c-button c-button--primary" onClick={dismiss}>Close</button>
    </div>
  </div> : null;
}
