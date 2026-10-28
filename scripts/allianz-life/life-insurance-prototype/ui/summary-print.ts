export interface SummaryPrintJob {
  done: Promise<void>;
  cancel: () => void;
}

const jobs = new WeakMap<Document, SummaryPrintJob>();

/** Source pM report scope, with local-only resources and explicit cleanup/focus restoration. */
export function printSummary(report: HTMLElement, trigger: HTMLElement): SummaryPrintJob {
  const owner = report.ownerDocument;
  const existing = jobs.get(owner);
  if (existing) return existing;
  const parentWindow = owner.defaultView;
  if (!parentWindow) throw new Error('The report is not attached to a browser document.');
  if (report.querySelector('script, iframe, object, embed'))
    throw new Error('The private report cannot print embedded external content.');

  const frame = owner.createElement('iframe');
  frame.title = 'Life insurance report';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.dataset.lifeSummaryPrint = '';
  Object.assign(frame.style, { position: 'absolute', top: '-10000px', left: '-10000px',
    width: `${parentWindow.innerWidth}px`, height: `${parentWindow.innerHeight}px`, border: '0' });

  let resolveDone!: () => void;
  let rejectDone!: (reason: Error) => void;
  let complete = false;
  let frameWindow: Window | null = null;
  const done = new Promise<void>((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  const finish = (error?: Error) => {
    if (complete) return;
    complete = true;
    parentWindow.clearTimeout(timer);
    parentWindow.removeEventListener('pagehide', cancel);
    frameWindow?.removeEventListener('afterprint', afterPrint);
    frame.remove();
    jobs.delete(owner);
    if (trigger.isConnected) trigger.focus({ preventScroll: true });
    if (error) rejectDone(error); else resolveDone();
  };
  const cancel = () => finish();
  const afterPrint = () => finish();
  const timer = parentWindow.setTimeout(() => finish(new Error('The report could not finish loading for print.')), 10000);
  const job = { done, cancel };
  jobs.set(owner, job);
  parentWindow.addEventListener('pagehide', cancel, { once: true });

  const loaded = new Promise<void>((resolve) => frame.addEventListener('load', () => resolve(), { once: true }));
  frame.srcdoc = '<!doctype html><html><head></head><body></body></html>';
  owner.body.appendChild(frame);

  void (async () => {
    await loaded;
    if (complete) return;
    const document = frame.contentDocument;
    frameWindow = frame.contentWindow;
    if (!document || !frameWindow) throw new Error('The report print document is unavailable.');
    document.title = 'Life insurance report';
    document.documentElement.lang = owner.documentElement.lang || 'en';
    const defaults = document.createElement('style');
    defaults.textContent = '@page{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}';
    document.head.appendChild(defaults);

    const styles: Promise<void>[] = [];
    for (const node of Array.from(owner.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel~="stylesheet"]'))) {
      if (node.tagName === 'STYLE') {
        document.head.appendChild(document.importNode(node, true));
        continue;
      }
      const original = node as HTMLLinkElement;
      if (!original.href || original.disabled || new URL(original.href).origin !== parentWindow.location.origin) continue;
      const link = document.importNode(original, true) as HTMLLinkElement;
      link.href = original.href;
      styles.push(new Promise<void>((resolve, reject) => {
        link.addEventListener('load', () => resolve(), { once: true });
        link.addEventListener('error', () => reject(new Error('A report stylesheet could not load.')), { once: true });
      }));
      document.head.appendChild(link);
    }
    const context = document.createElement('div');
    context.className = 'life-insurance-private life-print-document';
    context.appendChild(document.importNode(report, true));
    document.body.appendChild(context);
    await Promise.all(styles);
    if (document.fonts) await document.fonts.ready;
    if (complete) return;
    parentWindow.clearTimeout(timer);
    frameWindow.addEventListener('afterprint', afterPrint, { once: true });
    frameWindow.focus();
    frameWindow.print();
  })().catch((error: unknown) => finish(error instanceof Error ? error : new Error('The report could not be printed.')));
  return job;
}
