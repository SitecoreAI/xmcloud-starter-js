'use client';
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type Ref } from 'react';
import { createLifePieGeometry, createLifePieSeries, formatLifePieValue, initialLifePieInteraction, lifePiePointOpacity, nextLifePieLegendIndex, reduceLifePieInteraction,
  positionLifePieTooltip, LIFE_PIE_SOURCE, type LifePieArc, type LifePieInteractionState, type LifePieKey, type LifePieModifiers } from './life-pie-model';

export interface LifeInsurancePieChartProps {
  summary: Readonly<Record<string, number>>;
  hasPartner: unknown;
  initialInteraction?: LifePieInteractionState;
}

/** Source tooltip presentation defaults, isolated so no OS-native title is needed for pointer/focus. */
export function LifePieTooltip({ id, text, position, size, textRef }: {
  id: string; text: string; position: { x: number; y: number }; size: { width: number; height: number }; textRef?: Ref<SVGTextElement>;
}) {
  return <g id={id} role="tooltip" transform={`translate(${position.x} ${position.y})`}>
    <rect width={size.width} height={size.height} rx={LIFE_PIE_SOURCE.tooltip.radius} fill={LIFE_PIE_SOURCE.tooltip.background} filter={`url(#${id}-shadow)`} />
    <text ref={textRef} x={LIFE_PIE_SOURCE.tooltip.padding} y={LIFE_PIE_SOURCE.tooltip.padding} dy="0.8em" fill={LIFE_PIE_SOURCE.tooltip.color}
      style={{ fontSize: LIFE_PIE_SOURCE.tooltip.fontSize }}>{text}</text>
  </g>;
}

/** Private candidate chart. No network, persistence, external library, or financial computation. */
export function LifeInsurancePieChart({ summary, hasPartner, initialInteraction }: LifeInsurancePieChartProps) {
  const [interaction, setInteraction] = useState(initialInteraction ?? initialLifePieInteraction);
  const [hovered, setHovered] = useState<LifePieKey | null>(null);
  const [viewport, setViewport] = useState({ chartWidth: 400, plotWidth: 400, plotHeight: 400 });
  const [tooltip, setTooltip] = useState<{ key: LifePieKey; anchor: { x: number; y: number } } | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 120, height: 32 });
  const chartElement = useRef<HTMLElement>(null);
  const plotElement = useRef<SVGSVGElement>(null);
  const legendElement = useRef<HTMLUListElement>(null);
  const tooltipTextElement = useRef<SVGTextElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geometry = useMemo(() => createLifePieGeometry(createLifePieSeries(summary, hasPartner), interaction.hiddenKeys,
    { width: viewport.plotWidth, height: viewport.plotHeight }), [summary, hasPartner, interaction.hiddenKeys, viewport.plotWidth, viewport.plotHeight]);
  const descriptionId = `${useId().replace(/:/g, '')}-life-pie-description`;
  const tooltipId = `${descriptionId}-tooltip`;
  const tooltipText = tooltip ? formatLifePieValue(summary[tooltip.key]) : '';
  const tooltipPosition = tooltip ? positionLifePieTooltip(tooltip.anchor, tooltipSize, { width: viewport.chartWidth, height: LIFE_PIE_SOURCE.chartHeight }) : null;
  const clearHideTimer = () => { if (hideTimer.current !== null) { clearTimeout(hideTimer.current); hideTimer.current = null; } };
  const showTooltip = (point: LifePieArc, anchor: { x: number; y: number }) => {
    clearHideTimer(); setHovered(point.key); setTooltip({ key: point.key, anchor });
  };
  const pointerTooltip = (point: LifePieArc, event: PointerEvent<SVGPathElement>) => {
    const box = chartElement.current?.getBoundingClientRect();
    if (box) showTooltip(point, { x: event.clientX - box.left, y: event.clientY - box.top });
  };
  const focusTooltip = (point: LifePieArc) => {
    const chart = chartElement.current?.getBoundingClientRect();
    const plot = plotElement.current?.getBoundingClientRect();
    if (!chart || !plot) return;
    const angle = (point.startAngle + point.endAngle) / 2;
    showTooltip(point, { x: plot.left - chart.left + geometry.center.x + Math.cos(angle) * geometry.center.radius * 0.7,
      y: plot.top - chart.top + geometry.center.y + Math.sin(angle) * geometry.center.radius * 0.7 });
  };
  const leaveTooltip = () => {
    setHovered(null); clearHideTimer();
    hideTimer.current = setTimeout(() => { setTooltip(null); hideTimer.current = null; }, LIFE_PIE_SOURCE.tooltip.hideDelay);
  };
  useLayoutEffect(() => {
    const update = () => {
      const chart = chartElement.current?.getBoundingClientRect();
      const plot = plotElement.current?.getBoundingClientRect();
      if (!chart?.width || !plot?.width || !plot?.height) return;
      setViewport((current) => current.chartWidth === chart.width && current.plotWidth === plot.width && current.plotHeight === plot.height
        ? current : { chartWidth: chart.width, plotWidth: plot.width, plotHeight: plot.height });
    };
    const observer = new ResizeObserver(update);
    for (const element of [chartElement.current, plotElement.current, legendElement.current]) if (element) observer.observe(element);
    update();
    return () => { observer.disconnect(); clearHideTimer(); };
  }, [hasPartner]);
  useLayoutEffect(() => {
    const box = tooltipTextElement.current?.getBBox();
    if (box) setTooltipSize((current) => current.width === box.width + 16 && current.height === box.height + 16
      ? current : { width: box.width + 16, height: box.height + 16 });
  }, [tooltipText]);
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
    ref={chartElement} aria-describedby={descriptionId} style={{ margin: '0', width: '100%', height: LIFE_PIE_SOURCE.chartHeight,
      boxSizing: 'border-box', position: 'relative', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '1rem', containerType: 'inline-size' }}>
    <style>{`
.life-insurance-pie .life-pie-layout{display:flex;flex-direction:column;align-items:center;width:100%;height:100%;padding:10px 10px 15px;box-sizing:border-box;gap:${LIFE_PIE_SOURCE.legendMargin}px}
.life-insurance-pie .life-pie-plot{display:block;width:100%;height:0;overflow:visible;flex:1 1 0;min-width:0;min-height:0}
.life-insurance-pie .life-pie-sector{cursor:pointer;stroke:#fff;stroke-width:1;outline-offset:4px;transition:transform .1s ease}
.life-insurance-pie .life-pie-sector:focus-visible{outline:2px solid #006192}
.life-insurance-pie .life-pie-legend{display:flex;flex-direction:row;flex-wrap:wrap;justify-content:center;list-style:none;margin:0;padding:${LIFE_PIE_SOURCE.legendPadding}px;column-gap:20px;flex:0 0 auto;max-width:100%;box-sizing:border-box;font:inherit}
.life-insurance-pie .life-pie-legend li{display:flex;align-items:flex-start;margin:0 0 20px;padding:0;min-width:0;max-width:100%;font-size:0.8em;color:${LIFE_PIE_SOURCE.legendStyle.color}}
.life-insurance-pie .life-pie-legend-toggle{display:flex;align-items:flex-start;cursor:pointer;border:0;border-radius:0;background:none;margin:0;padding:0;min-width:0;min-height:0;font:inherit;line-height:normal;text-align:left;text-transform:none;letter-spacing:normal;color:inherit;text-decoration:inherit}
.life-insurance-pie .life-pie-legend-toggle:hover{color:${LIFE_PIE_SOURCE.legendStyle.hoverColor}}
.life-insurance-pie .life-pie-legend-toggle:focus-visible{outline:2px solid #006192;outline-offset:4px}
.life-insurance-pie .life-pie-legend .life-pie-legend-hidden{color:${LIFE_PIE_SOURCE.legendStyle.hiddenColor};text-decoration:${LIFE_PIE_SOURCE.legendStyle.hiddenTextDecoration}}
.life-insurance-pie .life-pie-symbol{display:inline-block;flex:0 0 20px;width:20px;height:20px;margin-right:20px}
.life-insurance-pie .life-pie-legend-label{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.life-insurance-pie .life-pie-description{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.life-insurance-pie .life-pie-tooltip-layer{position:absolute;left:0;top:0;width:100%;height:400px;overflow:visible;pointer-events:none;z-index:1}
@container (min-width:${LIFE_PIE_SOURCE.legendBreakpoint}px){.life-insurance-pie .life-pie-layout{flex-direction:row;align-items:center}.life-insurance-pie .life-pie-plot{width:0;height:100%}.life-insurance-pie .life-pie-legend{flex-direction:column;flex-wrap:nowrap;align-self:center;justify-content:center}}
@media (prefers-reduced-motion:reduce){.life-insurance-pie .life-pie-sector{transition:none}}
`}</style>
    <p className="life-pie-description" id={descriptionId}>{LIFE_PIE_SOURCE.accessibilityDescription}</p>
    <div className="life-pie-layout">
      <svg ref={plotElement} className="life-pie-plot" width={viewport.plotWidth} height={viewport.plotHeight}
        viewBox={`0 0 ${viewport.plotWidth} ${viewport.plotHeight}`} aria-label="Life insurance resources" role="group">
        {geometry.total === 0 && <circle className="life-pie-empty" cx={geometry.center.x} cy={geometry.center.y} r={geometry.center.radius} fill="none" stroke="#cccccc" strokeWidth={1} />}
        {geometry.points.map((point) => point.path && <path key={point.key} d={point.path} fill={point.color} className="life-pie-sector"
          data-life-pie-key={point.key} data-life-pie-raw-value={String(point.value)}
          role="button" tabIndex={0} aria-pressed={interaction.selectedKeys.includes(point.key)} aria-label={`${point.name}: ${formatLifePieValue(point.value)}`}
          aria-describedby={tooltip?.key === point.key ? tooltipId : undefined}
          opacity={lifePiePointOpacity(point.key, hovered, interaction.selectedKeys)}
          transform={interaction.selectedKeys.includes(point.key) ? `translate(${point.selectionOffset.x} ${point.selectionOffset.y})` : undefined}
          onClick={(event) => select(point.key, event)} onKeyDown={(event) => keySelect(event, point.key)}
          onPointerEnter={(event) => pointerTooltip(point, event)} onPointerMove={(event) => pointerTooltip(point, event)} onPointerLeave={leaveTooltip}
          onFocus={() => focusTooltip(point)} onBlur={leaveTooltip} />)}
      </svg>
      <ul ref={legendElement} className="life-pie-legend" aria-label="Chart amounts">
        {geometry.points.map((point) => <li key={point.key} className={point.visible ? undefined : 'life-pie-legend-hidden'}
          data-life-pie-key={point.key} data-life-pie-visible={point.visible} data-life-pie-raw-value={String(point.value)}>
          <button type="button" className="life-pie-legend-toggle" aria-pressed={point.visible}
            aria-label={`${point.visible ? 'Hide' : 'Show'} ${point.name}: ${Number.isFinite(point.value) ? formatLifePieValue(point.value) : String(point.value)}`}
            onClick={() => {
              setInteraction((state) => reduceLifePieInteraction(state, { type: 'toggleVisibility', key: point.key }));
              setHovered(point.visible ? null : point.key); clearHideTimer(); setTooltip(null);
            }} onKeyDown={keyLegend}
            onPointerEnter={() => setHovered(point.visible ? point.key : null)} onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(point.visible ? point.key : null)} onBlur={() => setHovered(null)}>
            <span className="life-pie-symbol" aria-hidden="true" style={{ backgroundColor: point.visible ? point.color : LIFE_PIE_SOURCE.legendStyle.hiddenColor }} />
            <span className="life-pie-legend-label">{point.name}</span>
          </button>
        </li>)}
      </ul>
    </div>
    <svg className="life-pie-tooltip-layer" width={viewport.chartWidth} height={LIFE_PIE_SOURCE.chartHeight}
      viewBox={`0 0 ${viewport.chartWidth} ${LIFE_PIE_SOURCE.chartHeight}`} aria-hidden={!tooltip || undefined}>
      <defs><filter id={`${tooltipId}-shadow`} x="-30%" y="-40%" width="170%" height="190%"><feDropShadow dx="1" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" /></filter></defs>
      {tooltip && tooltipPosition && <LifePieTooltip id={tooltipId} text={tooltipText} position={tooltipPosition} size={tooltipSize} textRef={tooltipTextElement} />}
    </svg>
  </figure>;
}
