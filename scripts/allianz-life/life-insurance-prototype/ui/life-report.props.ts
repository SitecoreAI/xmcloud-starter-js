import type { ReactNode } from 'react';
import type { LifeUiCopy } from './life-ui.props';

export interface LifeInsuranceReportProps {
  /** Caller supplies the existing engine result after sourceSummaryValid has passed. */
  summary: Readonly<Record<string, number>>;
  copy: Pick<LifeUiCopy, 'summary' | 'stages'>;
  formatSummaryValue: (value: number, key: string) => string;
  hasPartner: unknown;
  /** Exact source placement before the tables; absent until an external element is authorized. */
  children?: ReactNode;
}

export const LIFE_INSURANCE_REPORT_SOURCE = Object.freeze({
  bundleSha256: '75aa6f4d5c0dd662839844b490f99ab1534a24c8330f81b1c5cfd31a9d7371d7',
  binding: 'pM',
  offsets: [1626628, 1633330] as const,
  sourcePMSha256: 'a346eb3c4d07c73d60a463f843f0b6e93a95c1b822b096e58c0eaeeb6b477f36',
  testOracleRenderOffsets: [1627345, 1633131] as const,
  testOracleRenderSha256: 'ce36be7b2371f2b8702f0c7e0f989c6028662f640ed98fedfb1c2b3efb44ca69',
  validity: 'Caller preserves source hU/engine sourceSummaryValid; this component only renders the valid report.',
});
