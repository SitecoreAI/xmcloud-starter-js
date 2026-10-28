import type { LifeUiState } from './ui/life-ui-model';

export interface LifeInsuranceRuntimeProps {
  /** Optional stable native rendering prefix. React generates a unique default when absent. */
  instancePrefix?: string;
  /** Serializable local state used by bounded QA; normal native renderings omit it. */
  initialState?: LifeUiState;
}
