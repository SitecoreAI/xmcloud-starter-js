'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { IncomeLocalToolsDemoProps } from './income-local-tools.props';
import {
  STRATEGIES, calculateIllustration, filterSampleRates, validateCalculation,
  type Assumptions, type CalculationInput, type CalculationResult, type StrategyId,
} from './income-tools-model';
import styles from './IncomeLocalToolsDemo.module.css';

type DraftInputs = Record<keyof Assumptions | 'amount' | 'indexReturnPct' | 'allocationPct', string>;
type InputName = keyof DraftInputs;
const INITIAL_STRATEGY = STRATEGIES[0];
const LABELS: Record<InputName, string> = {
  amount: 'Hypothetical starting amount ($)', indexReturnPct: 'Hypothetical index return over the term (%)',
  allocationPct: 'Amount allocated to the sample strategy (%)', capPct: 'Sample cap (%)',
  bufferPct: 'Sample buffer (%)', floorPct: 'Sample floor (%)', triggerPct: 'Sample trigger (%)',
  participationPct: 'Sample participation (%)',
};
const ASSUMPTION_NAMES: (keyof Assumptions)[] = ['capPct', 'bufferPct', 'floorPct', 'triggerPct', 'participationPct'];
const INPUT_NAMES: InputName[] = ['amount', 'indexReturnPct', 'allocationPct', ...ASSUMPTION_NAMES];
const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const PERCENT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const percent = (value: number) => `${PERCENT.format(value)}%`;

function initialDraft(assumptions: Assumptions): DraftInputs {
  return { amount: '10000', indexReturnPct: '8', allocationPct: '100',
    capPct: String(assumptions.capPct), bufferPct: String(assumptions.bufferPct),
    floorPct: String(assumptions.floorPct), triggerPct: String(assumptions.triggerPct),
    participationPct: String(assumptions.participationPct) };
}
function calculationInput(strategyId: StrategyId, draft: DraftInputs): CalculationInput {
  const number = (name: InputName) => draft[name].trim() === '' ? Number.NaN : Number(draft[name]);
  return { strategyId, amount: number('amount'), indexReturnPct: number('indexReturnPct'),
    allocationPct: number('allocationPct'), assumptions: {
      capPct: number('capPct'), bufferPct: number('bufferPct'), floorPct: number('floorPct'),
      triggerPct: number('triggerPct'), participationPct: number('participationPct'),
    } };
}
function activeAssumptions(rule: string): Set<keyof Assumptions> {
  const names: (keyof Assumptions)[] = [];
  if (rule.endsWith('cap')) names.push('capPct', 'participationPct');
  if (rule.endsWith('trigger')) names.push('triggerPct');
  if (rule.startsWith('buffer')) names.push('bufferPct');
  if (rule.startsWith('floor')) names.push('floorPct');
  return new Set(names);
}

function DemoQualification() {
  return <div className={styles.notice}>
    <strong>Local learning demo</strong>
    <p>Sample rates and simplified rules are for exploring assumptions. They are not current rates,
      a product quote, an Allianz product calculation, or financial advice. Nothing is sent or saved.</p>
    <p>Seven source-listed strategies are included. Dual Precision strategies are not modeled.</p>
  </div>;
}

function RatesDemo() {
  const id = useId();
  const [strategy, setStrategy] = useState<'all' | StrategyId>('all');
  const [term, setTerm] = useState<'all' | number>('all');
  const rows = filterSampleRates(strategy, term);
  return <section className={styles.tool} aria-labelledby={`${id}-heading`}>
    <div className={styles.heading}><span className={styles.eyebrow}>Explore sample assumptions</span>
      <h2 id={`${id}-heading`}>Demo sample rates</h2>
      <p>Filter this fixed, fictional sample set by strategy and term. No live rate data is connected.</p>
    </div>
    <DemoQualification />
    <div className={styles.filters}>
      <div className={styles.field}><label htmlFor={`${id}-strategy`}>Strategy</label>
        <select id={`${id}-strategy`} value={strategy} onChange={(event) => setStrategy(event.target.value as 'all' | StrategyId)}>
          <option value="all">All supported strategies</option>
          {STRATEGIES.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
      </div>
      <div className={styles.field}><label htmlFor={`${id}-term`}>Term</label>
        <select id={`${id}-term`} value={term} onChange={(event) => setTerm(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
          <option value="all">All terms</option>{[1, 3, 6].map((years) => <option key={years} value={years}>{years} {years === 1 ? 'year' : 'years'}</option>)}
        </select>
      </div>
      <button type="button" className={styles.secondary} onClick={() => { setStrategy('all'); setTerm('all'); }}>Reset filters</button>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{rows.length} sample {rows.length === 1 ? 'row' : 'rows'} shown.</p>
    <div className={styles.tableRegion} role="region" aria-label="Demo sample rate assumptions" tabIndex={0}>
      <table className={styles.table}>
        <caption>Fictional sample assumptions. Values apply to the whole selected term.</caption>
        <thead><tr><th scope="col">Strategy</th><th scope="col">Term</th><th scope="col">Sample cap</th>
          <th scope="col">Sample buffer</th><th scope="col">Sample floor</th><th scope="col">Sample trigger</th><th scope="col">Sample participation</th></tr></thead>
        <tbody>{rows.map((entry) => {
          const active = activeAssumptions(entry.rule);
          return <tr key={entry.id}><th scope="row">{entry.name}</th><td>{entry.termYears} {entry.termYears === 1 ? 'year' : 'years'}</td>
            {ASSUMPTION_NAMES.map((name) => <td key={name}>{active.has(name) ? percent(entry.assumptions[name]) : '—'}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
    {!rows.length && <p className={styles.empty}>No sample rows match these filters. Choose another strategy or term.</p>}
    <p className={styles.help}>A dash means an assumption is not used by that sample rule. On a narrow screen, scroll the table sideways.</p>
  </section>;
}

function StrategyDemo() {
  const id = useId();
  const [strategyId, setStrategyId] = useState<StrategyId>(INITIAL_STRATEGY.id);
  const [draft, setDraft] = useState<DraftInputs>(() => initialDraft(INITIAL_STRATEGY.assumptions));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CalculationResult | null>(() => calculateIllustration(
    calculationInput(INITIAL_STRATEGY.id, initialDraft(INITIAL_STRATEGY.assumptions))));
  const inputs = useRef<Partial<Record<InputName, HTMLInputElement>>>({});
  const strategy = STRATEGIES.find((entry) => entry.id === strategyId) ?? INITIAL_STRATEGY;
  const active = activeAssumptions(strategy.rule);

  function calculate() {
    const input = calculationInput(strategyId, draft);
    const nextErrors = validateCalculation(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setResult(null);
      const first = INPUT_NAMES.find((name) => nextErrors[name]);
      if (first) inputs.current[first]?.focus();
      return;
    }
    setResult(calculateIllustration(input));
  }
  function update(name: InputName, value: string) {
    setDraft((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setResult(null);
  }
  function reset() {
    const restored = initialDraft(INITIAL_STRATEGY.assumptions);
    setStrategyId(INITIAL_STRATEGY.id); setDraft(restored); setErrors({});
    setResult(calculateIllustration(calculationInput(INITIAL_STRATEGY.id, restored)));
  }
  function onEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') { event.preventDefault(); calculate(); }
  }
  function numberField(name: InputName, min: number, max: number, disabled = false) {
    const error = errors[name];
    return <div className={styles.field} key={name}>
      <label htmlFor={`${id}-${name}`}>{LABELS[name]}</label>
      <input id={`${id}-${name}`} type="number" inputMode="decimal" min={min} max={max} step="any"
        value={draft[name]} disabled={disabled} ref={(element) => { inputs.current[name] = element ?? undefined; }}
        onChange={(event) => update(name, event.target.value)} onKeyDown={onEnter}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-${name}-error` : undefined} />
      {error && <p className={styles.error} id={`${id}-${name}-error`}>{error}</p>}
    </div>;
  }

  return <section className={styles.tool} aria-labelledby={`${id}-heading`}>
    <div className={styles.heading}><span className={styles.eyebrow}>Try a total-term scenario</span>
      <h2 id={`${id}-heading`}>Hypothetical strategy comparison</h2>
      <p>Change the index return, allocation, and sample assumptions to see how a simple rule changes the illustration.</p>
    </div>
    <DemoQualification />
    <div className={styles.workspace}>
      <div className={styles.controls}>
        <div className={styles.field}><label htmlFor={`${id}-strategy`}>Source-listed strategy</label>
          <select id={`${id}-strategy`} value={strategyId} onChange={(event) => {
            const next = STRATEGIES.find((entry) => entry.id === event.target.value);
            if (!next) return;
            setStrategyId(next.id); setDraft((previous) => ({ ...initialDraft(next.assumptions),
              amount: previous.amount, indexReturnPct: previous.indexReturnPct, allocationPct: previous.allocationPct }));
            setErrors({}); setResult(null);
          }}>{STRATEGIES.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
          <p className={styles.help}>Selected term: {strategy.termYears} {strategy.termYears === 1 ? 'year' : 'years'}. Enter a return for the entire term, not an annual rate.</p>
        </div>
        <div className={styles.inputGrid}>{numberField('amount', 0, 10000000)}{numberField('indexReturnPct', -100, 1000)}{numberField('allocationPct', 0, 100)}</div>
        <fieldset className={styles.assumptions}><legend>Edit sample assumptions</legend>
          <p className={styles.help}>Only active assumptions are used by the chosen sample rule. All values are editable samples, not product terms.</p>
          <div className={styles.inputGrid}>{ASSUMPTION_NAMES.map((name) => numberField(name,
            name === 'floorPct' ? -100 : 0, name === 'floorPct' ? 0 : name === 'participationPct' ? 300 : 100, !active.has(name)))}</div>
        </fieldset>
        {Object.values(errors).some(Boolean) && <p role="alert" className={styles.error}>Check the highlighted inputs, then calculate again.</p>}
        <div className={styles.actions}><button type="button" className={styles.primary} onClick={calculate}>Calculate illustration</button>
          <button type="button" className={styles.secondary} onClick={reset}>Reset demo</button></div>
      </div>
      <div className={styles.results} role="status" aria-live="polite" aria-atomic="true">
        <h3>Illustrative result</h3>
        {result ? <>
          <p className={styles.resultLabel}>Sample ending amount</p><p className={styles.resultValue}>{USD.format(result.illustratedValue)}</p>
          <dl className={styles.metrics}><div><dt>Sample credited return on allocated amount</dt><dd>{percent(result.creditedReturnPct)}</dd></div>
            <div><dt>Illustrated gain / loss</dt><dd>{USD.format(result.gainLoss)}</dd></div>
            <div><dt>Allocated amount</dt><dd>{USD.format(result.allocatedAmount)}</dd></div>
            <div><dt>Unallocated amount, held unchanged</dt><dd>{USD.format(result.cashAmount)}</dd></div></dl>
          <table className={styles.comparison}><caption>Same allocation, two illustrative rules</caption><thead><tr><th scope="col">Rule</th><th scope="col">Ending amount</th></tr></thead>
            <tbody><tr><th scope="row">Unadjusted index comparison</th><td>{USD.format(result.indexComparisonValue)}</td></tr>
              <tr><th scope="row">Selected sample rule</th><td>{USD.format(result.illustratedValue)}</td></tr></tbody></table>
          <p className={styles.rule}>{result.ruleDescription}</p>
        </> : <p>Inputs changed. Select Calculate illustration to refresh the result. No result is shown for invalid inputs.</p>}
      </div>
    </div>
    <p className={styles.limitations}>The unallocated amount stays unchanged in both comparisons. This single-term model excludes fees,
      taxes, withdrawals, dividends, income benefits, and changes during the term. It does not annualize returns or model an actual contract.</p>
  </section>;
}

export function IncomeLocalToolsDemo({ mode }: IncomeLocalToolsDemoProps) {
  return mode === 'rates' ? <RatesDemo /> : <StrategyDemo />;
}

export default IncomeLocalToolsDemo;
