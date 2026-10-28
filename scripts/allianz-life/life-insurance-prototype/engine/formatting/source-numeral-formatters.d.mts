/** Private source-isolated numeral 2.0.6; formatter catch returns the original value. */
export interface NumeralInstance {
  format(pattern: string): string;
  value(): number | null;
}
export interface NumeralFactory {
  (value?: unknown): NumeralInstance;
  version: string;
  locale(): string;
}
export const numeral: NumeralFactory;
export function hs<T>(value: T): string | T;
export function ho<T>(value: T): string | T;
export { hs as formatCurrency, ho as formatPercent };
