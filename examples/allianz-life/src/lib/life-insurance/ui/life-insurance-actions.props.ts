export interface LifeInsuranceActionsProps {
  isSummary: boolean;
  /** Current source-engine result, passed through without validation or calculation here. */
  summary: Readonly<Record<string, number>>;
  copy: { buttons: { print: string } };
  formatSummaryValue: (value: number, key: string) => string;
  onPrint: (trigger: HTMLButtonElement) => void;
  printing: boolean;
  printError: boolean;
  /** Stable unique prefix supplied by the parent calculator instance/layout. */
  idPrefix: string;
}
