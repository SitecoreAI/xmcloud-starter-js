'use client';

import { LifeInsuranceCalculator } from './ui/LifeInsuranceCalculator';
import { lifeInsuranceCopy, lifeInsuranceSource, formatLifeInsuranceSummaryValue } from './runtime-adapter';
import type { LifeInsuranceRuntimeProps } from './life-insurance-runtime.props';
import './life-insurance.css';

export type { LifeInsuranceRuntimeProps } from './life-insurance-runtime.props';

/** App-local runtime. The native wrapper supplies the scoped root and authored surrounding content. */
export function LifeInsuranceRuntime({ initialState, instancePrefix }: LifeInsuranceRuntimeProps) {
  return <LifeInsuranceCalculator copy={lifeInsuranceCopy} source={lifeInsuranceSource}
    formatSummaryValue={formatLifeInsuranceSummaryValue} initialState={initialState} instancePrefix={instancePrefix} />;
}
