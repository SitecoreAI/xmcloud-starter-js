import type { AllianzProps } from 'lib/allianz-fields';
import type { NavigationItem } from 'lib/allianz-fields';
export type AllianzHeaderProps = AllianzProps;

export interface MobileMenuState { open: boolean; path: string[] }
export type MobileMenuAction = { type: 'toggle' } | { type: 'close' } | { type: 'back' } | { type: 'enter'; id: string };
export const initialMobileMenuState: MobileMenuState = { open: false, path: [] };

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
