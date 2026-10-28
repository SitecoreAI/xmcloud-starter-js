'use client';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { createLifePieGeometry, createLifePieSeries, formatLifePieValue, initialLifePieInteraction, lifePiePointOpacity, nextLifePieLegendIndex, reduceLifePieInteraction,
  LIFE_PIE_SOURCE, type LifePieInteractionState, type LifePieKey, type LifePieModifiers } from './life-pie-model';

export interface LifeInsurancePieChartProps {
  summary: Readonly<Record<string, number>>;
  hasPartner: unknown;
  initialInteraction?: LifePieInteractionState;
}

/** Private candidate chart. No network, persistence, external library, or financial computation. */
export function LifeInsurancePieChart({ summary, hasPartner, initialInteraction }: LifeInsurancePieChartProps) {
  const [interaction, setInteraction] = useState(initialInteraction ?? initialLifePieInteraction);
  const [hovered, setHovered] = useState<LifePieKey | null>(null);
  const geometry = useMemo(() => createLifePieGeometry(createLifePieSeries(summary, hasPartner), interaction.hiddenKeys), [summary, hasPartner, interaction.hiddenKeys]);
  const descriptionId = `${useId().replace(/:/g, '')}-life-pie-description`;
  const select = (key: LifePieKey, modifiers: LifePieModifiers) => setInteraction((state) => reduceLifePieInteraction(state, { type: 'select', key, modifiers }));
  const keySelect = (event: KeyboardEvent<SVGPathElement>, key: LifePieKey) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(key, event); }
  };
  const keyLegend = (event: KeyboardEvent<HTMLButtonElement>) => {
    const buttons = Array.from(event.currentTarget.closest('ul')?.querySelectorAll<HTMLButtonElement>('.life-pie-legend-toggle') ?? []);
    const next = nextLifePieLegendIndex(buttons.indexOf(event.currentTarget), buttons.length, event.key);
    if (next !== null) { event.preventDefault(); buttons[next].focus(); }
  };

  return <figure className="life-insurance-pie" data-life-pie-state={geometry.state} data-life-pie-renderer="native-svg-candidate"
    aria-describedby={descriptionId} style={{ margin: '0', width: '100%', containerType: 'inline-size' }}>
    <style>{`
.life-insurance-pie .life-pie-layout{display:flex;flex-direction:column;align-items:center;width:100%;gap:20px}
.life-insurance-pie .life-pie-plot{display:block;width:100%;max-width:400px;height:auto;overflow:visible;flex:1 1 auto;min-width:0}
.life-insurance-pie .life-pie-sector{cursor:pointer;stroke:#fff;stroke-width:1;outline-offset:4px;transition:transform .1s ease}
.life-insurance-pie .life-pie-sector:focus-visible{outline:2px solid #006192}
.life-insurance-pie .life-pie-legend{display:flex;flex-direction:row;flex-wrap:wrap;justify-content:center;list-style:none;margin:0;padding:0;column-gap:20px;flex:0 1 auto}
.life-insurance-pie .life-pie-legend li{display:flex;align-items:flex-start;margin:0 0 20px;padding:0;min-width:0;font-size:12px;color:${LIFE_PIE_SOURCE.legendStyle.color}}
.life-insurance-pie .life-pie-legend-toggle{display:flex;align-items:flex-start;cursor:pointer;border:0;border-radius:0;background:none;margin:0;padding:0;font:inherit;text-align:left;color:inherit;text-decoration:inherit}
.life-insurance-pie .life-pie-legend-toggle:hover{color:${LIFE_PIE_SOURCE.legendStyle.hoverColor}}
.life-insurance-pie .life-pie-legend-toggle:focus-visible{outline:2px solid #006192;outline-offset:4px}
.life-insurance-pie .life-pie-legend .life-pie-legend-hidden{color:${LIFE_PIE_SOURCE.legendStyle.hiddenColor};text-decoration:${LIFE_PIE_SOURCE.legendStyle.hiddenTextDecoration}}
.life-insurance-pie .life-pie-symbol{display:inline-block;flex:0 0 20px;width:20px;height:20px;margin-right:20px}
.life-insurance-pie .life-pie-legend-label{display:block;overflow-wrap:anywhere}
.life-insurance-pie .life-pie-legend-value{display:block;font-variant-numeric:tabular-nums}
.life-insurance-pie .life-pie-description{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@container (min-width:${LIFE_PIE_SOURCE.legendBreakpoint}px){.life-insurance-pie .life-pie-layout{flex-direction:row;align-items:center}.life-insurance-pie .life-pie-legend{flex-direction:column;flex-wrap:nowrap;align-self:center;max-width:46%;justify-content:center}}
@media (prefers-reduced-motion:reduce){.life-insurance-pie .life-pie-sector{transition:none}}
`}</style>
    <p className="life-pie-description" id={descriptionId}>{LIFE_PIE_SOURCE.accessibilityDescription}</p>
    <div className="life-pie-layout">
      <svg className="life-pie-plot" viewBox="0 0 400 400" aria-label="Life insurance resources" role="group">
        {geometry.total === 0 && <circle className="life-pie-empty" cx={200} cy={200} r={190} fill="none" stroke="#cccccc" strokeWidth={1} />}
        {geometry.points.map((point) => point.path && <path key={point.key} d={point.path} fill={point.color} className="life-pie-sector"
          data-life-pie-key={point.key} data-life-pie-raw-value={String(point.value)}
          role="button" tabIndex={0} aria-pressed={interaction.selectedKeys.includes(point.key)} aria-label={`${point.name}: ${formatLifePieValue(point.value)}`}
          opacity={lifePiePointOpacity(point.key, hovered, interaction.selectedKeys)}
          transform={interaction.selectedKeys.includes(point.key) ? `translate(${point.selectionOffset.x} ${point.selectionOffset.y})` : undefined}
          onClick={(event) => select(point.key, event)} onKeyDown={(event) => keySelect(event, point.key)}
          onPointerEnter={() => setHovered(point.key)} onPointerLeave={() => setHovered(null)}
          onFocus={() => setHovered(point.key)} onBlur={() => setHovered(null)}>
          <title>{formatLifePieValue(point.value)}</title>
        </path>)}
      </svg>
      <ul className="life-pie-legend" aria-label="Chart amounts">
        {geometry.points.map((point) => <li key={point.key} className={point.visible ? undefined : 'life-pie-legend-hidden'}
          data-life-pie-key={point.key} data-life-pie-visible={point.visible} data-life-pie-raw-value={String(point.value)}>
          <button type="button" className="life-pie-legend-toggle" aria-pressed={point.visible}
            aria-label={`${point.visible ? 'Hide' : 'Show'} ${point.name}: ${Number.isFinite(point.value) ? formatLifePieValue(point.value) : String(point.value)}`}
            onClick={() => {
              setInteraction((state) => reduceLifePieInteraction(state, { type: 'toggleVisibility', key: point.key }));
              setHovered(point.visible ? null : point.key);
            }} onKeyDown={keyLegend}
            onPointerEnter={() => setHovered(point.visible ? point.key : null)} onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(point.visible ? point.key : null)} onBlur={() => setHovered(null)}>
            <span className="life-pie-symbol" aria-hidden="true" style={{ backgroundColor: point.visible ? point.color : LIFE_PIE_SOURCE.legendStyle.hiddenColor }} />
            <span className="life-pie-legend-label">{point.name}<span className="life-pie-legend-value">{Number.isFinite(point.value) ? formatLifePieValue(point.value) : String(point.value)}</span></span>
          </button>
        </li>)}
      </ul>
    </div>
  </figure>;
}
