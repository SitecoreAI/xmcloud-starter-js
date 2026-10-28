'use client';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { initialLifeUiState, reduceLifeUi, stageErrors, visibleStageFields, type LifeField } from './life-ui-model';
import type { LifeInsuranceCalculatorProps } from './life-ui.props';
import { LifeInsuranceStageIcon, type LifeStageIndex } from './LifeInsuranceStageIcon';
import { LifeInsurancePieChart } from './LifeInsurancePieChart';
import { printSummary, type SummaryPrintJob } from './summary-print';

/** Private source-faithful input/report prototype; no third-party request or storage. */
export function LifeInsuranceCalculator({ copy, source, formatSummaryValue, onCalculated, initialState }: LifeInsuranceCalculatorProps) {
  const [state, setState] = useState(() => initialState ?? initialLifeUiState());
  const [editing, setEditing] = useState<LifeField | null>(null);
  const [help, setHelp] = useState<LifeField | null>(null);
  const panel = useRef<HTMLElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [desktopHeight, setDesktopHeight] = useState<number | undefined>();
  const heading = useRef<HTMLHeadingElement>(null);
  const report = useRef<HTMLDivElement>(null);
  const printJob = useRef<SummaryPrintJob | null>(null);
  const mounted = useRef(true);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState(false);
  const prefix = useId().replace(/:/g, '');
  const errors = useMemo(() => stageErrors(state, source), [state, source]);
  const stage = copy.stages[state.step];
  const fields = visibleStageFields(state);
  const dispatch = (action: Parameters<typeof reduceLifeUi>[1]) => setState((previous) => reduceLifeUi(previous, action, source));

  useEffect(() => {
    const media = window.matchMedia('(min-width: 704px)');
    const update = () => setDesktopHeight(media.matches && panel.current
      ? Math.max(panel.current.getBoundingClientRect().height, container.current?.querySelector('nav')?.getBoundingClientRect().height ?? 0) : undefined);
    const observer = new ResizeObserver(update);
    if (panel.current) observer.observe(panel.current);
    media.addEventListener('change', update);
    update();
    return () => { observer.disconnect(); media.removeEventListener('change', update); };
  }, [state.step]);

  useEffect(() => {
    if (!state.focusVersion || !state.focus) return;
    if (state.focus.kind === 'field') {
      panel.current?.querySelector<HTMLInputElement>(`[name="${state.focus.field}"]`)?.focus();
    } else {
      heading.current?.focus({ preventScroll: true });
      panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.focusVersion, state.focus]);

  useEffect(() => {
    if (state.result) onCalculated?.(state.result);
  }, [state.result, onCalculated]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; printJob.current?.cancel(); };
  }, []);

  function printReport(trigger: HTMLButtonElement) {
    if (!report.current || printJob.current) return;
    setPrintError(false);
    setPrinting(true);
    const finish = (failed = false) => {
      printJob.current = null;
      if (mounted.current) { setPrinting(false); setPrintError(failed); }
    };
    try {
      printJob.current = printSummary(report.current, trigger);
      void printJob.current.done.then(() => finish(), () => finish(true));
    } catch { finish(true); }
  }

  function displayedValue(name: LifeField) {
    const value = state.values[name];
    if (value === undefined || editing === name) return value ?? '';
    const field = copy.fields[name];
    if (field.type === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Number(value));
    if (field.type === 'percent') return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(Number(value) / 100);
    return value;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    dispatch({ type: 'next' });
  }

  const activePanel = (
    <section ref={panel} className="axl-tab-panel axl-tab-panel-desktop" id={`${prefix}-${stage.id}`} aria-labelledby={`${prefix}-heading`}>
      <h2 className="panel-header" ref={heading} id={`${prefix}-heading`} tabIndex={-1}>{stage.name}</h2>
      {state.step < 4 && stage.introduction && <p className="life-stage-introduction">{stage.introduction}</p>}
      {state.step < 4 ? <form className="m-form" noValidate autoComplete="off" onSubmit={submit}
        onKeyDown={(event) => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault(); }}>
        {fields.map((name) => {
          const field = copy.fields[name];
          const control = `${prefix}-${name}`;
          const error = state.touched[name] ? errors[name] : undefined;
          const helpId = `${control}-help`;
          if (field.type === 'yes/no') return <fieldset className="m-form-group life-partner-field" key={name}>
            <legend className="a-input__label">{field.label}</legend>
            {(['yes', 'no'] as const).map((value) => <label className="life-radio" key={value} htmlFor={`${control}-${value}`}>
              <input id={`${control}-${value}`} type="radio" name={name} value={value} checked={state.values[name] === value}
                onChange={() => dispatch({ type: 'change', name, value })} />{copy.partnerOptions[value]}
            </label>)}
          </fieldset>;
          return <div className={`m-form-group${error ? ' --is-error' : ''}`} key={name}>
            <div className="life-label-row"><label className="a-input__label" htmlFor={control}>{field.label}</label>
              {!!field.help?.length && <button type="button" className="life-help-toggle" aria-label={field.label} aria-expanded={help === name}
                aria-controls={helpId} onClick={() => setHelp((previous) => previous === name ? null : name)}>?</button>}
            </div>
            {!!field.help?.length && help === name && <div className="life-help" id={helpId} role="note">{field.help.map((text) => <p key={text}>{text}</p>)}</div>}
            <input id={control} name={name} className={`a-input ${field.type === 'currency' ? '--is-large' : '--is-small'}`}
              type={field.htmlType ?? (field.type === 'number' ? 'number' : 'text')} inputMode="decimal" placeholder={field.placeholder}
              value={displayedValue(name)} aria-invalid={!!error}
              aria-describedby={[error && `${control}-error`, help === name && field.help && helpId].filter(Boolean).join(' ') || undefined}
              onFocus={() => setEditing(name)} onChange={(event) => dispatch({ type: 'change', name, value: event.target.value })}
              onBlur={() => { setEditing(null); dispatch({ type: 'blur', name }); }} />
            {error && <p className="a-input__helper" role="alert" id={`${control}-error`}>{error}</p>}
          </div>;
        })}
        <button type="submit" className="m-axlButton m-axlButton--primary" disabled={Object.keys(errors).length > 0}>{copy.buttons.next}</button>
      </form> : state.result?.sourceSummaryValid && state.result.summary ? <>
        <button type="button" className="m-axlButton m-axlButton--primary life-print" aria-busy={printing} aria-disabled={printing}
          onClick={(event) => printReport(event.currentTarget)}>{copy.buttons.print}</button>
        {printError && <p role="alert">The report could not be prepared for printing. Please try again.</p>}
        <div className="life-summary" data-life-summary-report ref={report}>
        {stage.introduction && <p className="life-stage-introduction">{stage.introduction}</p>}
        <dl className="life-summary-top">
          {copy.summary.rows.map((row) => <div key={row.key}>
            <dt>{row.label}</dt><dd data-summary-field={row.key}>{formatSummaryValue(state.result!.summary![row.key], row.key)}</dd>
          </div>)}
        </dl>
        <LifeInsurancePieChart summary={state.result.summary} hasPartner={state.values.hasPartner} />
        {copy.summary.tables.map((table) => <section className="life-report-section" key={table.heading}>
          <h3>{table.heading}</h3>
          <table className="a-table a-table__summary table-RILA"><caption>{table.caption}</caption><tbody>
            {table.rows.map((row) => <tr key={row.key}><th scope="row">{row.label}</th>
              <td data-summary-field={row.key}>{formatSummaryValue(state.result!.summary![row.key], row.key)}</td></tr>)}
          </tbody></table>
        </section>)}
      </div></> : <p className="life-summary-warning" role="alert">{copy.summary.warning}</p>}
      {copy.legalText && <p className="life-widget-legal">{copy.legalText}</p>}
    </section>
  );

  return <div className="life-insurance-private axl-tab-layout --is-default" data-private-life-calculator ref={container} style={{ minHeight: desktopHeight }}>
    <nav aria-label="Life insurance calculator">
      <ul className="axl-tab-list">
        {copy.stages.map((item, index) => <li className={`axl-tab-list-item${state.step === index ? ' --is-active' : ''}`} key={item.id}>
          <button type="button" className="axl-tab-list-button" aria-current={state.step === index ? 'step' : undefined}
            aria-controls={state.step === index ? `${prefix}-${item.id}` : undefined} onClick={() => { setHelp(null); dispatch({ type: 'jump', step: index }); }}>
            <span className="axl-tab-list-icon"><LifeInsuranceStageIcon stageIndex={index as LifeStageIndex} icoName={`${prefix}-stage-${index}`} /></span>
            <span className="axl-tab-list-title">{item.name}</span>
          </button>
          {state.step === index && activePanel}
        </li>)}
      </ul>
    </nav>
  </div>;
}
