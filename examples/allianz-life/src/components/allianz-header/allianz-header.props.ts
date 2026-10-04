import type { AllianzProps } from 'lib/allianz-fields';
import type { NavigationItem } from 'lib/allianz-fields';
export type AllianzHeaderProps = AllianzProps;

export interface MobileMenuState { open: boolean; path: string[] }
export type MobileMenuAction = { type: 'toggle' } | { type: 'close' } | { type: 'back' } | { type: 'enter'; id: string };
export const initialMobileMenuState: MobileMenuState = { open: false, path: [] };

export interface DesktopMenuState { root: string | null; selectedChildren: Record<string, string>; hoverOpened: boolean }
export type DesktopMenuAction = { type: 'close' } | { type: 'hover' | 'toggle' | 'leave'; path: string[] };
export const initialDesktopMenuState: DesktopMenuState = { root: null, selectedChildren: {}, hoverOpened: false };

/** A collapsed ancestor hides its branch without erasing deeper selections. */
export function desktopMenuPath(state: DesktopMenuState): string[] {
  const path: string[] = [];
  let id = state.root;
  while (id && !path.includes(id)) {
    path.push(id);
    id = state.selectedChildren[id] ?? null;
  }
  return path;
}

/** Only top-level branches preview on hover; nested branches require activation. */
export function desktopMenuReducer(state: DesktopMenuState, action: DesktopMenuAction): DesktopMenuState {
  if (action.type === 'close') return { ...state, root: null, hoverOpened: false };
  const id = action.path.at(-1);
  if (!id) return state;
  const activePath = desktopMenuPath(state);
  const isOpen = action.path.every((value, index) => activePath[index] === value);
  if (action.type === 'hover') {
    if (action.path.length !== 1 || isOpen) return state;
    return { ...state, root: id, hoverOpened: true };
  }
  if (action.type === 'toggle' && isOpen && action.path.length === 1 && state.hoverOpened) {
    return { ...state, hoverOpened: false };
  }
  if (action.type === 'leave' && !isOpen) return state;
  if (action.path.length === 1) return { ...state, root: isOpen ? null : id, hoverOpened: false };
  // Hidden controls cannot activate a branch. Each parent has at most one open
  // child; removing that selection retains the child's remembered descendants.
  if (!action.path.slice(0, -1).every((value, index) => activePath[index] === value)) return state;
  const selectedChildren = { ...state.selectedChildren };
  const parent = action.path.at(-2)!;
  if (isOpen) delete selectedChildren[parent];
  else selectedChildren[parent] = id;
  return { ...state, selectedChildren };
}

/** A mobile menu drills into one list at a time, as in the original source. */
export function mobileMenuReducer(state: MobileMenuState, action: MobileMenuAction): MobileMenuState {
  if (action.type === 'close' || (action.type === 'toggle' && state.open)) return initialMobileMenuState;
  if (action.type === 'toggle') return { open: true, path: [] };
  if (action.type === 'back') return state.path.length ? { open: true, path: state.path.slice(0, -1) } : initialMobileMenuState;
  return { open: true, path: [...state.path, action.id] };
}

export function navigationAtPath(items: NavigationItem[], path: string[]) {
  let current = items;
  let parent: NavigationItem | undefined;
  for (const id of path) {
    const next = current.find((item) => item.id === id);
    if (!next?.children?.results.length) break;
    parent = next;
    current = next.children.results;
  }
  return { items: current, parent };
}
