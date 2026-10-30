import contract from './source-ui-contract.json';
import { initialLifeUiState, type LifeUiState } from './life-ui-model';

const stageIds: readonly string[] = contract.stages.map(({ id }) => id);

/** Source v14 pV/pG/pZ defaults. Query values are read once; income-change handlers do not run. */
export function lifeInsuranceQueryDefaults(search: string): LifeUiState {
  const state = initialLifeUiState();
  const parameters = new URLSearchParams(search);
  const values = state.values as Record<string, string | number | undefined>;

  try {
    for (const [name, value] of parameters.entries()) {
      if (name === 'activeId') continue;
      // Retain the source's ordinary-object dispatch and partial-default catch,
      // including inherited-name collisions; do not silently invent filtering.
      const setters = {
        default: () => { values[name] = parseFloat(value); },
        hasPartner: () => { values[name] = value; },
      };
      const setter = (setters as Record<string, (() => void) | undefined>)[name];
      if (setter) setter.call(setters);
      else setters.default();
    }
  } catch {
    // pG returns the defaults and all assignments made before a parsing error.
  }

  let activeId = stageIds[0];
  try { activeId = parameters.get('activeId') || activeId; } catch { /* pZ retains about-you. */ }
  // The source keeps an unknown nonempty ID unmatched, rather than selecting About You.
  return { ...state, step: stageIds.indexOf(activeId) };
}
