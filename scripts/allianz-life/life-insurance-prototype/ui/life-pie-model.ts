import { formatCurrency } from '../engine/formatting/source-numeral-formatters.mjs';

/** Source pb render(), v0.7.2/v14, UTF-16 offsets 1623566..1626253.
 * Bundle SHA256 75aa6f4d5c0dd662839844b490f99ab1534a24c8330f81b1c5cfd31a9d7371d7.
 * These are presentation operations on the existing engine result, not financial calculations.
 */
export const LIFE_PIE_SOURCE = Object.freeze({
  bundleSha256: '75aa6f4d5c0dd662839844b490f99ab1534a24c8330f81b1c5cfd31a9d7371d7',
  applicationOffsets: [1623566, 1626253] as const,
  libraryVersion: 'Highcharts 11.4.8',
  libraryOffsets: { isNumber: 7515, isValid: 262877, updateTotals: 267836, translate: 267024, drawEmpty: 265242, legendItems: 194685,
    modifierClick: 135076, pointSelect: 139138, legendEvents: 200730, pieSetVisible: 262915, selectedStateGuard: 140715,
    legendKeyboard: 324051, keyboardWrapAround: 406002 },
  legendBreakpoint: 500,
  legendStyle: { color: '#333333', hoverColor: '#000000', hiddenColor: '#666666', hiddenTextDecoration: 'line-through', inactiveOpacity: 0.2 },
  accessibilityDescription: "This is a pie chart showing the relationship between investment assets and Social Security, existing life insurance, additional life insurance needed, and spour or domestic partner's earnings",
});

export const LIFE_PIE_SERIES = [
  { key: 'investmentAssetsAndSocialSecurity', name: 'Investment assets and Social Security', color: '#99ABD5' },
  { key: 'existingLifeInsurance', name: 'Existing life insurance', color: '#2C3E50' },
  { key: 'additionalLifeInsuranceNeeded', name: 'Additional life insurance needed', color: '#16A085' },
  { key: 'partnerAnnualIncomeSum', name: "Spouse or partner's earnings", color: '#FFA801' },
] as const;

export type LifePieKey = typeof LIFE_PIE_SERIES[number]['key'];
export interface LifePiePoint {
  key: LifePieKey;
  name: string;
  color: string;
  /** The unrounded source engine value. Never abs(), clamp, or format this value in the data model. */
  value: number;
}
export interface LifePieArc extends LifePiePoint {
  visible: boolean;
  startAngle: number;
  endAngle: number;
  path: string | null;
  selectionOffset: { x: number; y: number };
}
export type LifePieState = 'positive' | 'zero' | 'negative' | 'nonfinite';
export interface LifePieGeometry {
  state: LifePieState;
  points: LifePieArc[];
  total: number;
}

export interface LifePieInteractionState {
  hiddenKeys: readonly LifePieKey[];
  selectedKeys: readonly LifePieKey[];
}
export interface LifePieModifiers { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }
export type LifePieAction = { type: 'toggleVisibility'; key: LifePieKey }
  | { type: 'select'; key: LifePieKey; modifiers?: LifePieModifiers };

export function initialLifePieInteraction(): LifePieInteractionState {
  return { hiddenKeys: [], selectedKeys: [] };
}

/** Default Highcharts legend setVisible and Point.select accumulation. Visibility never edits data.
 * A normal click toggles the point and clears all other selections; Ctrl/Command/Shift accumulates.
 * Alt is deliberately not an accumulating modifier. Native button keyboard activation is an
 * accessible candidate adaptation, rather than a claim about source accessibility-module behavior.
 */
export function reduceLifePieInteraction(state: LifePieInteractionState, action: LifePieAction): LifePieInteractionState {
  if (action.type === 'toggleVisibility') return { ...state, hiddenKeys: state.hiddenKeys.includes(action.key)
    ? state.hiddenKeys.filter((key) => key !== action.key) : [...state.hiddenKeys, action.key] };
  const wasSelected = state.selectedKeys.includes(action.key);
  const accumulate = action.modifiers?.ctrlKey || action.modifiers?.metaKey || action.modifiers?.shiftKey;
  const otherSelections = accumulate ? state.selectedKeys.filter((key) => key !== action.key) : [];
  return { ...state, selectedKeys: wasSelected ? otherSelections : [...otherSelections, action.key] };
}

/** Point.setState preserves selected points when other points become inactive (140715). */
export function lifePiePointOpacity(key: LifePieKey, hoveredKey: LifePieKey | null, selectedKeys: readonly LifePieKey[]): number {
  return hoveredKey && hoveredKey !== key && !selectedKeys.includes(key) ? LIFE_PIE_SOURCE.legendStyle.inactiveOpacity : 1;
}

/** Source legend arrow directions and default wrapAround:true, adapted to native buttons. */
export function nextLifePieLegendIndex(current: number, count: number, key: string): number | null {
  if (count < 1 || current < 0 || current >= count) return null;
  const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : key === 'ArrowRight' || key === 'ArrowDown' ? 1 : 0;
  return direction ? (current + direction + count) % count : null;
}

/** Exact application-level order, labels, partner condition, colors and raw values. */
export function createLifePieSeries(summary: Readonly<Record<string, number>>, hasPartner: unknown): LifePiePoint[] {
  return LIFE_PIE_SERIES.slice(0, hasPartner === 'yes' ? 4 : 3).map((item) => ({ ...item, value: summary[item.key] }));
}

/** Exact source tooltip formatter hs(this.y), independently isolated in the engine package. */
export function formatLifePieValue(value: number): string {
  // An absent property is not a source numeric zero. Keep it apparent if a caller violates the result contract.
  if (typeof value !== 'number') return String(value);
  return String(formatCurrency(value));
}

export function lifePieLegendLayout(chartWidth: number): 'horizontal' | 'vertical' {
  return chartWidth >= LIFE_PIE_SOURCE.legendBreakpoint ? 'vertical' : 'horizontal';
}

const TAU = Math.PI * 2;
const START = -Math.PI / 2;
const clean = (value: number) => Math.abs(value) < 1e-10 ? 0 : Number(value.toFixed(9));
const coordinate = (angle: number, radius: number) => ({ x: clean(200 + Math.cos(angle) * radius), y: clean(200 + Math.sin(angle) * radius) });

function sectorPath(start: number, end: number): string | null {
  const span = end - start;
  if (!(span > 0)) return null;
  // Default Highcharts center/size for this isolated400x400 plot:190radius,10px slicing allowance.
  // This native renderer does not claim Highcharts rounded-corner/pixel/path identity.
  const first = coordinate(start, 190);
  if (span >= TAU - 1e-9) {
    const opposite = coordinate(start + Math.PI, 190);
    return `M ${first.x} ${first.y} A 190 190 0 1 1 ${opposite.x} ${opposite.y} A 190 190 0 1 1 ${first.x} ${first.y} Z`;
  }
  const last = coordinate(end, 190);
  return `M 200 200 L ${first.x} ${first.y} A 190 190 0 ${span > Math.PI ? 1 : 0} 1 ${last.x} ${last.y} Z`;
}

/** Native SVG sectors for finite nonnegative source series. Geometry is presentation-only.
 * All raw points are returned, including zeros and invalid values. Exact source library isNumber
 * (7515) and PiePoint.isValid (262877) exclude negative/nonfinite values from totals/angles, while
 * point legends retain them. No raw value is altered. Exact Highcharts rounded-corner/path/legend
 * styling and runtime edge rendering require separate source/reference acceptance.
 */
export function createLifePieGeometry(series: readonly LifePiePoint[], hiddenKeys: readonly LifePieKey[] = []): LifePieGeometry {
  const hidden = new Set(hiddenKeys);
  const isValid = (point: LifePiePoint) => Number.isFinite(point.value) && point.value >= 0;
  const total = series.reduce((sum, point) => sum + (isValid(point) && !hidden.has(point.key) ? point.value : 0), 0);
  const state: LifePieState = series.some((point) => !Number.isFinite(point.value)) || !Number.isFinite(total)
    ? 'nonfinite' : series.some((point) => point.value < 0) ? 'negative' : total === 0 ? 'zero' : 'positive';
  const canPlot = total > 0 && Number.isFinite(total);
  let angle = START;
  let lastPositive = -1;
  series.forEach((point, index) => { if (isValid(point) && !hidden.has(point.key) && point.value > 0) lastPositive = index; });
  const points = series.map((point, index): LifePieArc => {
    const startAngle = angle;
    const visible = !hidden.has(point.key);
    if (canPlot && isValid(point) && visible) angle = index === lastPositive ? START + TAU : angle + point.value / total * TAU;
    const endAngle = angle;
    const middle = (startAngle + endAngle) / 2;
    return { ...point, visible, startAngle, endAngle, path: canPlot ? sectorPath(startAngle, endAngle) : null,
      selectionOffset: { x: Math.round(Math.cos(middle) * 10), y: Math.round(Math.sin(middle) * 10) } };
  });
  return { state, points, total };
}
