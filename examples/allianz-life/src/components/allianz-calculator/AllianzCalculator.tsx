'use client';
import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { RETIREMENT_INPUTS, validateCalculator, type AllianzCalculatorProps } from './allianz-calculator.props';

export const Default = ({ fields, params }: AllianzCalculatorProps) => {
  const data = fields?.data?.datasource;
  const id = useId().replace(/:/g, '');
  const form = useRef<HTMLFormElement>(null);
  const isRetirement = data?.schemaKey?.jsonValue?.value === 'retirement-income';
  const inputs = useMemo(() => data?.children?.results?.length ? data.children.results : isRetirement ? RETIREMENT_INPUTS : [], [data, isRetirement]);
  const initialValues = useMemo(() => Object.fromEntries(inputs.map((input) => [input.name?.jsonValue?.value || input.id, input.initialValue?.jsonValue?.value || ''])), [inputs]);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [computed, setComputed] = useState(false);
  if (!data) return <NoDataFallback componentName="AllianzCalculator" />;
  const compute = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateCalculator(inputs, values);
    setErrors(next);
    if (Object.keys(next).length) requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
    else setComputed(true);
  };
  return <section className="allianz-local-calculator" id={params.RenderingIdentifier}>
    {data.heading?.jsonValue?.value && <Text tag="h2" field={data.heading.jsonValue} />}
    {data.body?.jsonValue?.value && <RichText field={data.body.jsonValue} />}
    {inputs.length > 0 && <div className="grid-highlight"><div className="l-container--full-width t-bg-transparent"><div className="l-grid__row"><div className="l-grid__column-12"><div className="l-grid__row"><div className="l-grid__column-6">
      <form ref={form} className="m-form" noValidate onSubmit={compute} autoComplete="off">
        {inputs.map((input) => {
          const name = input.name?.jsonValue?.value || input.id;
          const control = `${id}-${input.id}`;
          const error = errors[name];
          return <div className="m-form-group" key={input.id}><label htmlFor={control}><span><Text field={input.label?.jsonValue} />{input.footnote?.jsonValue?.value && <sup><Text field={input.footnote.jsonValue} /></sup>}</span></label>
            <input className="a-input" id={control} name={name} type="text" inputMode="decimal" maxLength={30} value={values[name] ?? input.initialValue?.jsonValue?.value ?? ''} aria-invalid={!!error} aria-describedby={error ? `${control}-error` : undefined} onChange={(event) => {setValues((previous) => ({ ...previous, [name]: event.target.value })); setComputed(false);setErrors((previous) => {const next = { ...previous };delete next[name];return next;});}} />
            {error && <p className="allianz-calculator-error" id={`${control}-error`} role="alert">{error}</p>}
          </div>;
        })}
        <button className="m-axlButton m-axlButton--primary" type="submit">{data.submitLabel?.jsonValue ? <Text field={data.submitLabel.jsonValue} /> : 'Compute'}</button>
      </form>
    </div><div className="l-grid__column-6"><div className="o-table--container"><table className="o-table"><tbody><tr><td>{data.resultLabel?.jsonValue ? <Text field={data.resultLabel.jsonValue} /> : 'How much you need to save'}</td><td aria-live="polite">{computed && data.sampleResult?.jsonValue?.value ? <><small>Sample scenario</small><RichText field={data.sampleResult.jsonValue} /></> : <Text field={data.initialResult?.jsonValue || { value: '-' }} />}</td></tr></tbody></table></div>
      {computed && !data.sampleResult?.jsonValue?.value && <p role="status">Your inputs are ready. A result is not available.</p>}
      {computed && <button className="allianz-legacy-print" type="button" onClick={() => {setValues(initialValues);setErrors({});setComputed(false);form.current?.querySelector<HTMLInputElement>('input')?.focus();}}>Reset</button>}
    </div></div></div></div></div></div>}
    {data.disclaimer?.jsonValue?.value && <RichText field={data.disclaimer.jsonValue} className="allianz-calculator-disclaimer" />}
  </section>;
};
