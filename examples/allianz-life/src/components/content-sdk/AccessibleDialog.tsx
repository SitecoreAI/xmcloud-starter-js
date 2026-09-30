'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { dialogFocusAction } from './dialog-focus';

interface AccessibleDialogProps {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}

/** Local service dialogs never navigate or transmit input. */
export default function AccessibleDialog({ titleId, onClose, children }: AccessibleDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return <div className="allianz-demo-modal" role="presentation" onClick={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={(event) => {
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]') || []);
      const active = document.activeElement;
      const action = dialogFocusAction(event.key, event.shiftKey, active === controls[0], active === controls.at(-1), controls.includes(active as HTMLElement));
      if (action === 'none') return;
      event.preventDefault();
      if (action === 'dismiss') onClose();
      else (action === 'first' ? controls[0] : controls.at(-1))?.focus();
    }}>{children}</div>
  </div>;
}
