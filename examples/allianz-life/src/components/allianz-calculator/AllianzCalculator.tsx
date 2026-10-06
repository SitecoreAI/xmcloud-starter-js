'use client';
import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { RETIREMENT_INPUTS, validateCalculator, type AllianzCalculatorProps } from './allianz-calculator.props';

export const Default = ({ fields, params }: AllianzCalculatorProps) => {
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
  return <section className="allianz-local-calculator" id={params.RenderingIdentifier}>
    {shouldRenderTextField(data?.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data?.heading?.jsonValue} />}
    {shouldRenderTextField(data?.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data?.body?.jsonValue} />}
    {isEditing ? <div className="allianz-local-calculator-authoring">
      {inputs.map((input) => <div key={input.id}>
        <Text editable={false} tag="p" field={input.label?.jsonValue} />
        {input.footnote && <Text editable={false} tag="sup" field={input.footnote.jsonValue} />}
        <Text editable={false} tag="p" field={input.initialValue?.jsonValue} />
      </div>)}
      <p>Compute</p><p>How much you need to save</p><p>-</p>
    </div> : inputs.length > 0 && <div className="grid-highlight"><div className="l-container--full-width t-bg-transparent"><div className="l-grid__row"><div className="l-grid__column-12"><div className="l-grid__row"><div className="l-grid__column-6">
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
