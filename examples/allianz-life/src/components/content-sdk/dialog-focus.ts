export type DialogFocusAction = 'dismiss' | 'first' | 'last' | 'none';

/** Pure keyboard policy; DOM focus handling stays in the dialog component. */
export function dialogFocusAction(
  key: string,
  shiftKey: boolean,
  atFirst: boolean,
  atLast: boolean,
  withinDialog: boolean,
): DialogFocusAction {
  if (key === 'Escape') return 'dismiss';
  if (key !== 'Tab') return 'none';
  if (!withinDialog) return shiftKey ? 'last' : 'first';
  if (shiftKey && atFirst) return 'last';
  if (!shiftKey && atLast) return 'first';
  return 'none';
}
