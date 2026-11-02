'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import {
  calculateRetirementIncome,
  calculateTaxDeferral,
  retirementDefaults,
  taxDeferralDefaults,
  validateRetirementInputs,
  validateTaxDeferralInputs,
  RETIREMENT_FIELDS,
  TAX_DEFERRAL_FIELDS,
  TAX_RATES,
  UnsupportedToolExecutionError,
} from './financial-tools.mjs';

export type GetAnswersToolKind = 'retirement-income' | 'tax-deferral';

/** Only the source-owned inputs/results live here; surrounding copy stays in Sitecore. */
export function GetAnswersFinancialTool({ kind }: { kind: GetAnswersToolKind }) {
  const retirement = kind === 'retirement-income';
  const uid = useId().replace(/:/g, '');
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...(retirement ? retirementDefaults : taxDeferralDefaults),
  }));
  const [focused, setFocused] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState(false);
  const [retirementResult, setRetirementResult] = useState('-');
  const [unavailable, setUnavailable] = useState(false);
  const fields = retirement ? RETIREMENT_FIELDS : TAX_DEFERRAL_FIELDS;
  const retirementValues = {
    principal: values.principal ?? '', interest: values.interest ?? '', payments: values.payments ?? '',
  };
  const taxValues = {
    principle: values.principle ?? '', interestRate: values.interestRate ?? '',
    investmentYears: values.investmentYears ?? '', marginalTaxRate: values.marginalTaxRate ?? '10',
  };

  const displayValue = (name: string) => {
    const raw = values[name] ?? '';
    if (!retirement || focused === name || name === 'payments') return raw;
    if (name === 'principal') return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
    }).format(Number(raw));
    return new Intl.NumberFormat('en-US', {
      style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(Number(raw) / 100);
  };

  const compute = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = retirement ? validateRetirementInputs(retirementValues) : validateTaxDeferralInputs(taxValues);
    setErrors(next);
    setUnavailable(false);
    if (Object.keys(next).length) {
      if (retirement) setVisible(false);
      requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    try {
      if (retirement) setRetirementResult(calculateRetirementIncome(retirementValues));
      setVisible(true);
    } catch (error) {
      if (!(error instanceof UnsupportedToolExecutionError)) throw error;
      setVisible(false);
      setUnavailable(true);
    }
  };

  const blur = (name: string, raw: string) => {
    const nextValues = { ...values, [name]: raw };
    const nextErrors = retirement
      ? validateRetirementInputs({ principal: nextValues.principal ?? '', interest: nextValues.interest ?? '', payments: nextValues.payments ?? '' })
      : validateTaxDeferralInputs({ principle: nextValues.principle ?? '', interestRate: nextValues.interestRate ?? '', investmentYears: nextValues.investmentYears ?? '', marginalTaxRate: nextValues.marginalTaxRate ?? '10' });
    const error = (nextErrors as Record<string, string | undefined>)[name];
    setValues(nextValues);
    setErrors(previous => {
      const next = { ...previous };
      if (error) next[name] = error;
      else delete next[name];
      return next;
    });
    setFocused(undefined);
    if (retirement) setVisible(false);
  };

  // The source tax store recalculates from current values after the first successful Compute.
  let taxResult: ReturnType<typeof calculateTaxDeferral> | undefined;
  let taxUnavailable = false;
  if (!retirement && visible) {
    try {
      taxResult = calculateTaxDeferral(taxValues);
    } catch (error) {
      if (!(error instanceof UnsupportedToolExecutionError)) throw error;
      taxUnavailable = true;
    }
  }
  return <div className="get-answers-financial-tool" data-tool={kind}>
    <div className="l-container--full-width"><div className="l-grid__row">
        <div className="l-grid__column-medium-6">
          <form ref={form} id={`${uid}-form`} className="m-form" noValidate autoComplete="off" onSubmit={compute}>
            {fields.map((field) => {
              const control = `${uid}-${field.name}`;
              const error = errors[field.name];
              return <div className={`m-form-group${error ? ' has-error' : ''}`} key={field.name}>
                <label className="a-input__label" htmlFor={control}>{field.label}{field.footnote && <sup>{field.footnote}</sup>}</label>
                <input id={control} name={field.name} className="a-input" type="text" inputMode="decimal"
                  placeholder={field.placeholder || undefined} value={displayValue(field.name)}
                  aria-invalid={Boolean(error)} aria-describedby={error ? `${control}-error` : undefined}
                  onFocus={() => setFocused(field.name)}
                  onBlur={event => blur(field.name, event.currentTarget.value)}
                  onChange={(event) => {
                    setValues(previous => ({ ...previous, [field.name]: event.target.value }));
                    if (retirement) setVisible(false);
                  }} />
                {error && <span className="a-input__helper" id={`${control}-error`} role="alert">{error}</span>}
              </div>;
            })}
            {!retirement && <fieldset className="m-radioGroup">
              <legend>Marginal tax rate <sup>*</sup></legend>
                {TAX_RATES.map(rate => <div className="c-radio" key={rate}>
                  <input className="c-radio__input" id={`${uid}-tax-${rate}`} name="marginalTaxRate" type="radio" value={rate}
                    checked={values.marginalTaxRate === String(rate)}
                    onChange={event => setValues(previous => ({ ...previous, marginalTaxRate: event.target.value }))} />
                  <label className="c-radio__label" htmlFor={`${uid}-tax-${rate}`}>{rate}%</label>
                </div>)}
            </fieldset>}
          </form>
          <button className="m-axlButton m-axlButton--primary" type="submit" form={`${uid}-form`}>Compute</button>
          {(unavailable || taxUnavailable) && <p role="alert">This result is unavailable for these inputs.</p>}
        </div>
        <div className="l-grid__column-medium-6"><div className="o-table--container">
          <table className="o-table"><tbody>
            {retirement ? <tr><td role="rowheader">How much you need to save</td><td aria-live="polite">{visible ? retirementResult : '-'}</td></tr> : <>
              <tr><td role="rowheader">Taxable portfolio future value<sup>1</sup></td><td aria-live="polite">{taxResult?.taxablePortfolioFutureValue ?? '-'}</td></tr>
              <tr><td role="rowheader">Tax-deferred portfolio future value<sup>2</sup> (pre-tax)</td><td aria-live="polite">{taxResult?.taxDeferredPortfolioFutureValue ?? '-'}</td></tr>
            </>}
          </tbody></table>
        </div></div>
    </div></div>
  </div>;
}
