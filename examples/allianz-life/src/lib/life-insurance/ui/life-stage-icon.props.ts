/** Source stage order: About you, One-time costs, Long-term income needs, Available assets, Summary. */
export type LifeStageIndex = 0 | 1 | 2 | 3 | 4;

export interface LifeInsuranceStageIconProps {
  stageIndex: LifeStageIndex;
  /** Exact source-supported override; controls both titleIcon and descIcon ID suffixes. */
  icoName?: string;
  title?: string;
  description?: string;
}
