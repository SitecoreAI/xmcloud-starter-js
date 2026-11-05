import { safeLinkRenderProps } from 'lib/allianz-fields';
import type { LinkField } from '@sitecore-content-sdk/nextjs';

export interface FrameLink {
  href: string;
  target: string;
  rel: string;
}

/** Source anchors use the source page as their base, never the static iframe URL.
 * Only navigation is normalized. Calculations, input state and asset requests are untouched. */
export function sourceFrameLink(href: string, target: string, sourcePagePath: string): FrameLink {
  const unavailable = { href: '#service-unavailable', target: '', rel: '' };
  if (!href) return { href: '', target: '', rel: '' };
  if (href !== href.trim() || /[\\\u0000-\u001f\u007f]/.test(href)) return unavailable;
  // The source uses fragment links for in-widget tabs/sections. Keep those in the frame.
  if (href.startsWith('#')) return { href, target: '', rel: '' };
  let sourceHref: string;
  try {
    const base = new URL(sourcePagePath, 'https://www.allianzlife.com');
    if (base.origin !== 'https://www.allianzlife.com' || !sourcePagePath.startsWith('/')) return unavailable;
    // Preserve raw absolute authorities for the existing malformed/port checks.
    // URL.href would otherwise erase an explicitly supplied default port.
    sourceHref = href.startsWith('//') ? `https:${href}`
      : href.startsWith('/') ? `https://www.allianzlife.com${href}`
        : /^(?:[a-z][a-z0-9+.-]*:|(?:www\.)?allianzlife\.com(?:[/?#]|$))/i.test(href)
          ? href : new URL(href, base).href;
  } catch { return unavailable; }
  const normalized = safeLinkRenderProps({ value: { href: sourceHref, target } });
  // SDK LinkProps permits other field shapes; this helper always returns the
  // LinkField supplied to safeLinkRenderProps.
  const value = (normalized.field as LinkField).value;
  const query = value.querystring?.replace(/^\?/, '');
  const hash = value.anchor?.replace(/^#/, '');
  const destination = `${value.href ?? ''}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
  const fragment = destination.startsWith('#') || !destination;
  return {
    href: destination,
    // A local page must replace the full demo page, not nest that page in the widget.
    // Normal modifier-click behavior is left to the browser.
    target: fragment ? '' : value.target?.toLowerCase() === '_blank' ? '_blank' : '_top',
    rel: normalized.rel ?? '',
  };
}

/** Keep an unchanged, same-origin source widget inert until navigation containment
 * and resize observers are installed. Source assets and formulas remain unchanged. */
export function observeSourceToolFrame(
  frame: HTMLIFrameElement,
  sourcePagePath: string,
  expectedPreset: string,
  onHeight: (height: number) => void,
  onAvailable: (available: boolean) => void
): () => void {
  let detachDocument: (() => void) | undefined;
  const loaded = () => {
    detachDocument?.();
    detachDocument = undefined;
    let document: Document | null;
    try { document = frame.contentDocument; }
    catch { onAvailable(false); return; }
    const root = document?.getElementById('allianz-calculator-frame');
    if (!document || !root || root.getAttribute('data-source-preset') !== expectedPreset) {
      onAvailable(false);
      return;
    }
    root.inert = true;
    let ready = false;
    let loadingTimeout: ReturnType<typeof setTimeout> | undefined;
    const normalize = (anchor: HTMLAnchorElement) => {
      const next = sourceFrameLink(anchor.getAttribute('href') ?? '', anchor.getAttribute('target') ?? '', sourcePagePath);
      for (const name of ['href', 'target', 'rel'] as const) {
        if ((anchor.getAttribute(name) ?? '') !== next[name]) {
          if (next[name]) anchor.setAttribute(name, next[name]);
          else anchor.removeAttribute(name);
        }
      }
    };
    const normalizeAll = () => {
      root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(normalize);
      // A static root alone also exists when the script failed. Wait for the
      // actual tool controls before presenting an interactive/available widget.
      if (!ready && root.querySelector('input:not([type="hidden"]),select,button')) {
        ready = true;
        clearTimeout(loadingTimeout);
        root.inert = false;
        onAvailable(true);
      }
    };
    const activation = (event: Event) => {
      const target = event.composedPath()[0] as Element | undefined;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (anchor && root.contains(anchor)) normalize(anchor);
    };
    const events = ['click', 'auxclick', 'keydown'] as const;
    const capture = { capture: true };
    events.forEach((event) => document.addEventListener(event, activation, capture));
    const links = new MutationObserver(normalizeAll);
    links.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'target', 'rel'] });
    normalizeAll();
    if (!ready) loadingTimeout = setTimeout(() => onAvailable(false), 5000);
    const measure = () => {
      const height = Math.ceil(root.getBoundingClientRect().height) + 2;
      if (height > 0 && height < 20000) onHeight(height);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    measure();
    detachDocument = () => {
      root.inert = true;
      clearTimeout(loadingTimeout);
      links.disconnect();
      resize.disconnect();
      events.forEach((event) => document.removeEventListener(event, activation, capture));
    };
  };
  frame.addEventListener('load', loaded);
  // Cached frames may finish before the React effect is attached.
  try { if (frame.contentDocument?.getElementById('allianz-calculator-frame')) loaded(); }
  catch { onAvailable(false); }
  return () => {
    frame.removeEventListener('load', loaded);
    detachDocument?.();
  };
}
