/** Observe the original widget without reading or changing its calculation state. */
export function observeLifetimeFrame(
  frame: HTMLIFrameElement,
  onHeight: (height: number) => void,
  onAvailable: (available: boolean) => void
): () => void {
  let observer: ResizeObserver | undefined;
  const loaded = () => {
    observer?.disconnect();
    const root = frame.contentDocument?.getElementById('allianz-calculator-frame');
    if (!root) { onAvailable(false); return; }
    onAvailable(true);
    const measure = () => {
      const height = Math.ceil(root.getBoundingClientRect().height) + 2;
      if (height > 0 && height < 20000) onHeight(height);
    };
    observer = new ResizeObserver(measure);
    observer.observe(root);
    measure();
  };
  frame.addEventListener('load', loaded);
  // Cached static frames can complete before React's effect attaches the listener.
  if (frame.contentDocument?.getElementById('allianz-calculator-frame')) loaded();
  return () => { frame.removeEventListener('load', loaded); observer?.disconnect(); };
}
