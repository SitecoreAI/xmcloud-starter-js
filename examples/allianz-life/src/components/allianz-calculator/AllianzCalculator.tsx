'use client';
import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { RETIREMENT_INPUTS, validateCalculator, incomeToolsDemoMode, type AllianzCalculatorProps } from './allianz-calculator.props';
import { IncomeLocalToolsDemo } from 'components/allianz-income-tools/IncomeLocalToolsDemo';

/** Isolate the original calculator's bundled React, CSS and Highcharts globals. */
const LifetimeIncomeFrame = () => {
  const frame = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(1000);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => observer.current?.disconnect(), []);
  const loaded = () => {
    observer.current?.disconnect();
    const root = frame.current?.contentDocument?.getElementById('allianz-calculator-frame');
    if (!root) { setFailed(true); return; }
    setFailed(false);
    const measure = () => {
      const next = Math.ceil(root.getBoundingClientRect().height) + 2;
      if (next > 0 && next < 20000) setHeight((previous) => Math.abs(previous - next) > 1 ? next : previous);
    };
    observer.current = new ResizeObserver(measure);
    observer.current.observe(root);
    measure();
  };
  return <>
    <iframe ref={frame} src="/allianz-assets/lifetime-income/index.html"
      title="Allianz Lifetime Income+ annuity income calculator" onLoad={loaded}
      style={{ display: 'block', width: '100%', height, border: 0 }} />
    {failed && <p role="alert">The income calculator could not be loaded. Please try again later.</p>}
  </>;
};

/** Native variant: only the verified original widget is code-owned. */
export const LifetimeIncome = ({ fields, params }: AllianzCalculatorProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  return <section className="allianz-lifetime-income-calculator" id={params.RenderingIdentifier}>
    {shouldRenderTextField(data?.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data?.heading?.jsonValue} />}
    {shouldRenderTextField(data?.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data?.body?.jsonValue} />}
    <LifetimeIncomeFrame />
    {shouldRenderTextField(data?.disclaimer?.jsonValue, isEditing) && <RichText editable={isEditing} field={data?.disclaimer?.jsonValue} />}
  </section>;
};

export const Default = (props: AllianzCalculatorProps) => {
  const { fields, params, rendering } = props;
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  const id = useId().replace(/:/g, '');
  const form = useRef<HTMLFormElement>(null);
  // The captured three-input form is code-owned; only surrounding content is authored.
  const inputs = RETIREMENT_INPUTS;
  const initialValues = useMemo(() => Object.fromEntries(inputs.map((input) => [input.name?.jsonValue?.value || input.id, input.initialValue?.jsonValue?.value || ''])), [inputs]);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [computed, setComputed] = useState(false);
  const compute = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateCalculator(inputs, values);
    setErrors(next);
    if (Object.keys(next).length) requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
    else setComputed(true);
  };
  const demoMode = incomeToolsDemoMode(data?.schemaKey, rendering?.dataSource);
  // The existing native Calculator template selects this verified tool explicitly.
  if (data?.schemaKey?.jsonValue?.value === 'lifetime-income-official') return <LifetimeIncome {...props} />;
  if (demoMode) return <section className="allianz-local-calculator" id={params.RenderingIdentifier}>
    {shouldRenderTextField(data?.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data?.heading?.jsonValue} />}
    {shouldRenderTextField(data?.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data?.body?.jsonValue} />}
    <IncomeLocalToolsDemo mode={demoMode} />
    {shouldRenderTextField(data?.disclaimer?.jsonValue, isEditing) && <RichText editable={isEditing} field={data?.disclaimer?.jsonValue} className="allianz-calculator-disclaimer" />}
  </section>;
  return <section className="allianz-local-calculator" id={params.RenderingIdentifier}>
    {shouldRenderTextField(data?.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data?.heading?.jsonValue} />}
    {shouldRenderTextField(data?.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data?.body?.jsonValue} />}
    {inputs.length > 0 && <div className="grid-highlight"><div className="l-container--full-width t-bg-transparent"><div className="l-grid__row"><div className="l-grid__column-12"><div className="l-grid__row"><div className="l-grid__column-6">
      <form ref={form} className="m-form" noValidate onSubmit={compute} autoComplete="off">
        {inputs.map((input) => {
          const name = input.name?.jsonValue?.value || input.id;
          const control = `${id}-${input.id}`;
          const error = errors[name];
          return <div className="m-form-group" key={input.id}><label htmlFor={control}><span><Text editable={false} field={input.label?.jsonValue} />{shouldRenderTextField(input.footnote?.jsonValue, isEditing) && <sup><Text editable={false} field={input.footnote?.jsonValue} /></sup>}</span></label>
            <input className="a-input" id={control} name={name} type="text" inputMode="decimal" maxLength={30} value={values[name] ?? input.initialValue?.jsonValue?.value ?? ''} aria-invalid={!!error} aria-describedby={error ? `${control}-error` : undefined} onChange={(event) => {setValues((previous) => ({ ...previous, [name]: event.target.value })); setComputed(false);setErrors((previous) => {const next = { ...previous };delete next[name];return next;});}} />
            {error && <p className="allianz-calculator-error" id={`${control}-error`} role="alert">{error}</p>}
          </div>;
        })}
        <button className="m-axlButton m-axlButton--primary" type="submit">Compute</button>
      </form>
    </div><div className="l-grid__column-6"><div className="o-table--container"><table className="o-table"><tbody><tr><td>How much you need to save</td><td aria-live="polite">-</td></tr></tbody></table></div>
      {computed && <p role="status">Your inputs are ready. A result is not available.</p>}
      {computed && <button className="allianz-legacy-print" type="button" onClick={() => {setValues(initialValues);setErrors({});setComputed(false);form.current?.querySelector<HTMLInputElement>('input')?.focus();}}>Reset</button>}
    </div></div></div></div></div></div>}
    {shouldRenderTextField(data?.disclaimer?.jsonValue, isEditing) && <RichText editable={isEditing} field={data?.disclaimer?.jsonValue} className="allianz-calculator-disclaimer" />}
  </section>;
};
