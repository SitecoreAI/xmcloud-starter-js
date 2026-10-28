'use client';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { initialLifeUiState, reduceLifeUi, stageErrors, visibleStageFields, type LifeField } from './life-ui-model';
import type { LifeInsuranceCalculatorProps } from './life-ui.props';
import { LifeInsuranceStageIcon, type LifeStageIndex } from './LifeInsuranceStageIcon';
import { LifeInsuranceReport } from './LifeInsuranceReport';
import { LifeInsuranceActions } from './LifeInsuranceActions';
import { printSummary, type SummaryPrintJob } from './summary-print';

const desktopQuery = '(min-width: 704px)';
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverLayoutSnapshot = () => false;

/** Private source-faithful input/report prototype; no third-party request or storage. */
export function LifeInsuranceCalculator({ copy, source, formatSummaryValue, onCalculated, initialState, instancePrefix }: LifeInsuranceCalculatorProps) {
  const [state, setState] = useState(() => initialState ?? initialLifeUiState());
  const [editing, setEditing] = useState<LifeField | null>(null);
  const [help, setHelp] = useState<LifeField | null>(null);
  const panel = useRef<HTMLElement>(null);
  const resizedField = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const report = useRef<HTMLDivElement>(null);
  const printJob = useRef<SummaryPrintJob | null>(null);
  const mounted = useRef(true);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState(false);
  const generatedPrefix = useId().replace(/:/g, '');
  const prefix = instancePrefix ?? generatedPrefix;
  const subscribeLayout = useCallback((listener: () => void) => {
    const media = window.matchMedia(desktopQuery);
    const update = () => {
      const active = document.activeElement;
      resizedField.current = active instanceof HTMLInputElement && panel.current?.contains(active) ? active.name : null;
      listener();
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const desktop = useSyncExternalStore(subscribeLayout, desktopSnapshot, serverLayoutSnapshot);
  const currentResult = useMemo(() => source.calculateLifeInsurance(state.values), [source, state.values]);
  const errors = useMemo(() => stageErrors(state, source), [state, source]);
  const stage = copy.stages[state.step];
  const fields = visibleStageFields(state);
  const dispatch = (action: Parameters<typeof reduceLifeUi>[1]) => setState((previous) => reduceLifeUi(previous, action, source));

  useLayoutEffect(() => {
    if (resizedField.current) panel.current?.querySelector<HTMLInputElement>(`[name="${resizedField.current}"]`)?.focus({ preventScroll: true });
    resizedField.current = null;
  }, [desktop]);

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
    <section ref={panel} className={`axl-tab-panel axl-tab-panel-content-${desktop ? 'desktop' : 'mobile'}`} id={`${prefix}-${stage.id}`} aria-labelledby={`${prefix}-heading`}>
      <div><h3 className="panel-header" ref={heading} id={`${prefix}-heading`} tabIndex={-1}>{stage.name}</h3></div>
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
          return <div className={`m-form-group${error ? ' has-error' : ''}`} key={name}>
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
      </form> : <div className="life-summary" data-life-summary-report ref={report}>
        {currentResult.sourceSummaryValid && currentResult.summary
          ? <LifeInsuranceReport summary={currentResult.summary} copy={copy} formatSummaryValue={formatSummaryValue} hasPartner={state.values.hasPartner} instancePrefix={prefix} />
          : <section><p className="life-summary-warning" role="alert">{copy.summary.warning}</p></section>}
      </div>}
      {copy.legalText && <p className="life-widget-legal">{copy.legalText}</p>}
    </section>
  );

  return <div className="life-insurance-private axl-tab-layout --is-default" data-private-life-calculator>
    <nav aria-label="Life insurance calculator">
      <ul className="axl-tab-list">
        {currentResult.summary && (!desktop || currentResult.sourceSummaryValid) && <li className="axl-tab-list-item life-actions">
          <div className="axl-tab-list-item__panel --has-background --has-border">
            <LifeInsuranceActions isSummary={state.step === 4} summary={currentResult.summary}
              copy={copy} formatSummaryValue={formatSummaryValue} onPrint={printReport} printing={printing} printError={printError} idPrefix={prefix} />
          </div>
        </li>}
        {copy.stages.map((item, index) => <li className={`axl-tab-list-item${state.step === index ? ' --is-active' : ''}`} key={item.id}>
          <button type="button" className="axl-tab-list-button" aria-current={state.step === index ? 'step' : undefined}
            aria-controls={state.step === index ? `${prefix}-${item.id}` : undefined} onClick={() => { setHelp(null); dispatch({ type: 'jump', step: index }); }}>
            <span className="axl-tab-list-title">{item.name}</span>
            <span className="axl-tab-list-icon"><LifeInsuranceStageIcon stageIndex={index as LifeStageIndex} icoName={`${prefix}-stage-${index}`} /></span>
          </button>
          {!desktop && state.step === index && activePanel}
        </li>)}
      </ul>
    </nav>
    {desktop && <div className="axl-tab-panel-desktop">{activePanel}</div>}
  </div>;
}
