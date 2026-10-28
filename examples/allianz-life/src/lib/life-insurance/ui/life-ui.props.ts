import type { CalculationResult, LifeField, LifeSourceAdapter, LifeUiState } from './life-ui-model';

export interface SourceFieldCopy {
  label: string;
  help?: string[];
  placeholder?: string;
  type: 'number' | 'currency' | 'percent' | 'yes/no';
  htmlType?: 'number' | 'text';
}

export interface LifeUiCopy {
  stages: Array<{ id: string; name: string; introduction?: string }>;
  fields: Record<LifeField, SourceFieldCopy>;
  buttons: { next: string; print: string };
  partnerOptions: { yes: string; no: string };
  summary: {
    heading?: string;
    introduction?: string;
    rows: Array<{ key: string; label: string }>;
    warning?: string;
    tables: Array<{ heading: string; caption: string; rows: Array<{ key: string; label: string }> }>;
    externalDescriptionLinkText?: string;
  };
  legalText?: string;
}

export interface LifeInsuranceCalculatorProps {
  copy: LifeUiCopy;
  source: LifeSourceAdapter;
  formatSummaryValue: (value: number, key: string) => string;
  onCalculated?: (result: CalculationResult) => void;
  initialState?: LifeUiState;
  /** Optional native rendering prefix; omitted callers retain the existing generated instance ID. */
  instancePrefix?: string;
}
