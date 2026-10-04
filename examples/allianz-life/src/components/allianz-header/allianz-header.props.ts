import type { AllianzProps } from 'lib/allianz-fields';
import type { NavigationItem } from 'lib/allianz-fields';
export type AllianzHeaderProps = AllianzProps;

export interface MobileMenuState { open: boolean; path: string[] }
export type MobileMenuAction = { type: 'toggle' } | { type: 'close' } | { type: 'back' } | { type: 'enter'; id: string };
export const initialMobileMenuState: MobileMenuState = { open: false, path: [] };

export interface DesktopMenuState { path: string[]; hoverOpened: string[] }
export type DesktopMenuAction = { type: 'close' } | { type: 'hover' | 'toggle' | 'leave'; path: string[] };
export const initialDesktopMenuState: DesktopMenuState = { path: [], hoverOpened: [] };

/** Only top-level branches preview on hover; nested branches require activation. */
export function desktopMenuReducer(state: DesktopMenuState, action: DesktopMenuAction): DesktopMenuState {
  if (action.type === 'close') return initialDesktopMenuState;
  const id = action.path.at(-1);
  if (!id) return state;
  const isOpen = action.path.every((value, index) => state.path[index] === value);
  if (action.type === 'hover') {
    if (action.path.length !== 1 || isOpen) return state;
    return { path: action.path, hoverOpened: [...state.hoverOpened.filter((value) => action.path.includes(value)), id] };
  }
  if (action.type === 'toggle' && isOpen && state.hoverOpened.includes(id)) {
    return { ...state, hoverOpened: state.hoverOpened.filter((value) => value !== id) };
  }
  if (action.type === 'leave' && !isOpen) return state;
  const path = isOpen ? action.path.slice(0, -1) : action.path;
  return { path, hoverOpened: state.hoverOpened.filter((value) => path.includes(value)) };
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
