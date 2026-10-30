'use client';

import { useState, useSyncExternalStore } from 'react';
import { LifeInsuranceCalculator } from './ui/LifeInsuranceCalculator';
import { lifeInsuranceQueryDefaults } from './ui/life-query-defaults';
import { lifeInsuranceCopy, lifeInsuranceSource, formatLifeInsuranceSummaryValue } from './runtime-adapter';
import type { LifeInsuranceRuntimeProps } from './life-insurance-runtime.props';
import './life-insurance.css';

export type { LifeInsuranceRuntimeProps } from './life-insurance-runtime.props';

const subscribeClientReady = () => () => {};
const clientReadySnapshot = () => true;
const serverReadySnapshot = () => false;

function QueryInitializedCalculator({ instancePrefix }: LifeInsuranceRuntimeProps) {
  const [initialState] = useState(() => lifeInsuranceQueryDefaults(window.location.search));
  return <LifeInsuranceCalculator copy={lifeInsuranceCopy} source={lifeInsuranceSource}
    formatSummaryValue={formatLifeInsuranceSummaryValue} initialState={initialState} instancePrefix={instancePrefix} />;
}

/** App-local runtime. The native wrapper supplies the scoped root and authored surrounding content. */
export function LifeInsuranceRuntime({ initialState, instancePrefix }: LifeInsuranceRuntimeProps) {
  const clientReady = useSyncExternalStore(subscribeClientReady, clientReadySnapshot, serverReadySnapshot);
  // Source controls initialize in the browser. Do not expose an intermediate
  // default form whose early edits could be lost when query defaults mount.
  if (!initialState) return clientReady ? <QueryInitializedCalculator instancePrefix={instancePrefix} /> : null;
  return <LifeInsuranceCalculator copy={lifeInsuranceCopy} source={lifeInsuranceSource}
    formatSummaryValue={formatLifeInsuranceSummaryValue} initialState={initialState} instancePrefix={instancePrefix} />;
}
