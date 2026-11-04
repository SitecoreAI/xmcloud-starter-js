export type RmdFrameState = 'loading' | 'ready' | 'failed';

/**
 * Read only owned DOM readiness and geometry. A root, inputs or HTTP success alone
 * are insufficient: the source can display its form after a failed workbook read.
 * This is load readiness, not independent validation of financial results.
 */
export function observeRmdFrame(
  frame: HTMLIFrameElement,
  onHeight: (height: number) => void,
  onState: (state: RmdFrameState) => void
): () => void {
  let active = true;
  let state: RmdFrameState | undefined;
  let resize: ResizeObserver | undefined;
  let mutation: MutationObserver | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const emit = (next: RmdFrameState) => {
    if (active && state !== next) { state = next; onState(next); }
  };
  const clearDeadline = () => {
    if (deadline !== undefined) clearTimeout(deadline);
    deadline = undefined;
  };
  const disconnect = () => { resize?.disconnect(); mutation?.disconnect(); clearDeadline(); };
  const loaded = () => {
    if (!active) return;
    disconnect();
    emit('loading');
    let root: HTMLElement | null;
    try { root = frame.contentDocument?.getElementById('allianz-rmd-frame') ?? null; }
    catch { emit('failed'); return; }
    if (!root) { emit('failed'); return; }
    let documentFailed = false;
    const failDocument = () => {
      documentFailed = true;
      disconnect();
      emit('failed');
    };
    const measure = () => {
      if (!active || documentFailed) return;
      const height = Math.ceil(root.getBoundingClientRect().height);
      if (height > 0 && height < 19998) onHeight(height + 2);
    };
    const inspect = () => {
      if (!active || documentFailed) return;
      const workbook = root.getAttribute('data-rmd-static-load');
      // A failed source HTTP read can still produce inputs. Failure must win.
      if (workbook === 'failed') { failDocument(); return; }
      const sourceForm = ['clientBirthDate', 'accountBalance', 'estimatedReturnRate']
        .every((name) => root.querySelector(`input[name="${name}"]`)) &&
        root.querySelectorAll('input[name="primaryBeneficiary"][type="radio"]').length === 2;
      if (workbook === 'verified' && sourceForm) { clearDeadline(); emit('ready'); }
    };
    resize = new ResizeObserver(measure);
    resize.observe(root);
    mutation = new MutationObserver(() => { inspect(); measure(); });
    mutation.observe(root, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['data-rmd-static-load'],
    });
    deadline = setTimeout(failDocument, 15000);
    inspect();
    measure();
  };
  const failed = () => { disconnect(); emit('failed'); };
  emit('loading');
  frame.addEventListener('load', loaded);
  frame.addEventListener('error', failed);
  // Covers a complete cached source document without treating about:blank as ready.
  try { if (frame.contentDocument?.getElementById('allianz-rmd-frame')) loaded(); }
  catch { emit('failed'); }
  // A frame navigation that never completes must not leave the user waiting forever.
  if (deadline === undefined && state === 'loading') {
    deadline = setTimeout(() => { deadline = undefined; emit('failed'); }, 15000);
  }
  return () => {
    active = false;
    frame.removeEventListener('load', loaded);
    frame.removeEventListener('error', failed);
    disconnect();
  };
}
