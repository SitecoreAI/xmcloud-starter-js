'use client';
import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { AllianzFormProps } from './allianz-form.props';
import { formDefinitions, validateForm, type FormDefinition, type FormErrors, type FormOption, type FormValue, type FormValues } from './form-rules.props';
import './ProductContactForm.css';

const PRODUCT_LINES = 'ProductInterest.ProductLines';
const PRIVACY = 'Use sample information. Information entered here stays in this browser and is not sent.';

function optionLabel(option: FormOption) {
  if (!option.superscript || !option.label.includes(option.superscript)) return option.label;
  const index = option.label.indexOf(option.superscript);
  return <>{option.label.slice(0, index)}<sup>{option.superscript}</sup>{option.label.slice(index + option.superscript.length)}</>;
}

/** ProductInterest source form. All stages are local demonstrations, with no service or storage. */
export default function ProductContactForm({ fields, params }: Pick<AllianzFormProps, 'fields' | 'params'>) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  const key = data?.schemaKey?.jsonValue?.value === 'new-york-product-contact' ? 'new-york-product-contact' : 'product-contact';
  const definitions = useMemo(() => formDefinitions(key, data?.children?.results), [key, data?.children?.results]);
  const instance = useId().replace(/:/g, '');
  const form = useRef<HTMLFormElement>(null);
  const outcomeHeading = useRef<HTMLHeadingElement>(null);
  const firstButton = useRef<HTMLButtonElement>(null);
  const secondButton = useRef<HTMLButtonElement>(null);
  const [openPanel, setOpenPanel] = useState<1 | 2 | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [stage, setStage] = useState<'entry' | 'review' | 'complete' | 'failure'>('entry');
  if (!data) return <NoDataFallback componentName="AllianzForm" />;
  const controlId = (name: string) => `${instance}-${name.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const change = (name: string, value: FormValue) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => { const next = { ...previous }; delete next[name]; return next; });
  };
  const changeStage = (next: typeof stage) => {
    setStage(next);
    requestAnimationFrame(() => next === 'entry' ? form.current?.querySelector<HTMLElement>('input, textarea')?.focus() : outcomeHeading.current?.focus());
  };
  const reset = () => { setValues({}); setErrors({}); changeStage('entry'); };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateForm(definitions, values, key);
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    changeStage('review');
  };
  const finish = () => {
    const outcome = params.mockOutcome || new URLSearchParams(window.location.search).get('formOutcome');
    setValues({}); setErrors({});
    changeStage(outcome === 'error' || outcome === 'failure' ? 'failure' : 'complete');
  };
  const accordionKey = (event: KeyboardEvent<HTMLButtonElement>, current: 1 | 2) => {
    const target = event.key === 'Home' ? 1 : event.key === 'End' ? 2 : ['ArrowDown', 'ArrowUp'].includes(event.key) ? (current === 1 ? 2 : 1) : null;
    if (target) { event.preventDefault(); (target === 1 ? firstButton : secondButton).current?.focus(); }
  };
  const textControl = (field: FormDefinition) => {
    const id = controlId(field.name);
    const shared = { id, name: field.name, className: 'form-control', required: field.required, maxLength: field.maxLength, placeholder: field.placeholder, value: typeof values[field.name] === 'string' ? values[field.name] as string : '', 'aria-invalid': !!errors[field.name], 'aria-describedby': errors[field.name] ? `${id}-error` : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(field.name, event.target.value) };
    return <><label htmlFor={id} className={field.name.endsWith('.Other') ? 'sr-only' : 'col-sm-3 control-label'}><Text field={field.labelField?.jsonValue} /></label><div className={field.name.endsWith('.Other') ? undefined : 'col-sm-9'}>{field.inputType === 'textarea' ? <textarea {...shared} rows={5} /> : <input {...shared} type={field.inputType} autoComplete="off" inputMode={field.inputType === 'tel' ? 'tel' : undefined} />}{errors[field.name] && <span id={`${id}-error`} className="field-validation-error" role="alert">{errors[field.name]}</span>}</div></>;
  };
  const products = definitions.find((field) => field.name === PRODUCT_LINES)!;
  const other = definitions.find((field) => field.name === 'ProductInterest.Other')!;
  const selected = Array.isArray(values[PRODUCT_LINES]) ? values[PRODUCT_LINES] as string[] : [];
  const productError = errors[PRODUCT_LINES];
  const heading = data.heading?.jsonValue || { value: 'Contact us' };
  const secondaryHeading = data.secondaryHeading?.jsonValue || { value: 'Already working with a financial professional?' };
  const panel = (number: 1 | 2) => `${instance}-product-contact-${number}`;
  const authoring = <div className="allianz-local-form-authoring">
    {definitions.map((definition) => <Text key={definition.name} editable tag="p" field={definition.labelField?.jsonValue} />)}
    {shouldRenderTextField(data.submitLabel?.jsonValue, true) && <Text editable tag="p" field={data.submitLabel?.jsonValue} />}
    {shouldRenderTextField(data.reviewHeading?.jsonValue, true) && <Text editable tag="h2" field={data.reviewHeading?.jsonValue} />}
    {shouldRenderTextField(data.successMessage?.jsonValue, true) && <RichText editable field={data.successMessage?.jsonValue} />}
    {shouldRenderTextField(data.failureMessage?.jsonValue, true) && <RichText editable field={data.failureMessage?.jsonValue} />}
  </div>;
  const entry = <form ref={form} noValidate autoComplete="off" onSubmit={submit} className="cui-portletform clearfix">
    <p className="allianz-local-privacy">{PRIVACY}</p>
    {Object.keys(errors).length > 0 && <div className="validation-summary-errors" role="alert">Please check the highlighted fields.</div>}
    <fieldset className="form-group allianz-product-interest"><legend className="col-sm-3 control-label"><Text field={products.labelField?.jsonValue} /></legend><div className="col-sm-9">
      <div className="checkbox"><div className="list-box">{products.options.map((option) => <label className="checkbox" key={option.value}><input type="checkbox" name={option.value} value="true" checked={selected.includes(option.value)} aria-invalid={!!productError} aria-describedby={productError ? `${controlId(PRODUCT_LINES)}-error` : undefined} onChange={(event) => change(PRODUCT_LINES, event.target.checked ? Array.from(new Set([...selected, option.value])) : selected.filter((value) => value !== option.value))} />{optionLabel(option)}</label>)}</div></div>
      {productError && <span id={`${controlId(PRODUCT_LINES)}-error`} className="field-validation-error" role="alert">{productError}</span>}
      {textControl(other)}
    </div></fieldset>
    {definitions.filter((field) => field.name !== PRODUCT_LINES && field.name !== other.name).map((field) => <div className="form-group" key={field.name}>{textControl(field)}</div>)}
    <div className="btn-row form-group"><div className="col-sm-offset-3 col-sm-6"><button className="btn btn-form btn-primary col-sm-6" type="submit"><Text field={data.submitLabel?.jsonValue || { value: 'Submit' }} /></button></div></div>
  </form>;
  const review = <div className="allianz-local-review">
    <h2 ref={outcomeHeading} tabIndex={-1}><Text field={data.reviewHeading?.jsonValue || { value: 'Review sample information' }} /></h2>
    <p className="allianz-local-privacy">{PRIVACY}</p>
    <dl>{definitions.filter((field) => field.multiple ? selected.length : values[field.name]).map((field) => <div key={field.name}><dt>{field.label.replace(/\*$/, '')}</dt><dd>{field.multiple ? field.options.filter((option) => selected.includes(option.value)).map((option) => option.label).join(', ') : values[field.name]}</dd></div>)}</dl>
    <div className="allianz-local-actions"><button className="btn btn-default" type="button" onClick={() => changeStage('entry')}>Edit information</button><button className="btn btn-primary" type="button" onClick={finish}>Continue</button><button className="allianz-legacy-print" type="button" onClick={reset}>Start again</button></div>
  </div>;
  const outcome = <div className="allianz-local-confirmation" role="status"><h2 ref={outcomeHeading} tabIndex={-1}>{stage === 'failure' ? 'Unable to continue' : 'Review complete'}</h2><RichText field={stage === 'failure' ? data.failureMessage?.jsonValue || { value: '<p>Demo failure. Please try again.</p>' } : data.successMessage?.jsonValue || { value: '<p>Demo review complete.</p>' }} /><p>No information was sent.</p><button className="btn btn-primary" type="button" onClick={reset}>Start again</button></div>;
  return <section id={params.RenderingIdentifier} className="allianz-local-form allianz-product-contact">
    <div className="panel-group accordion">
      <div className="panel panel-default"><div className="panel-heading"><h4 className="panel-title">{isEditing ? <Text editable field={heading} /> : <button ref={firstButton} id={`${panel(1)}-trigger`} className={openPanel === 1 ? '' : 'collapsed'} type="button" aria-expanded={openPanel === 1} aria-controls={panel(1)} onKeyDown={(event) => accordionKey(event, 1)} onClick={() => setOpenPanel((current) => current === 1 ? null : 1)}><Text field={heading} /><span className="fa pull-right" aria-hidden="true" /></button>}</h4></div>
        <div id={panel(1)} className={`panel-collapse collapse${isEditing || openPanel === 1 ? ' in' : ''}`} hidden={!isEditing && openPanel !== 1} role="region" aria-labelledby={isEditing ? undefined : `${panel(1)}-trigger`}><div className="panel-body">
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
          {isEditing ? authoring : stage === 'entry' ? entry : stage === 'review' ? review : outcome}
        </div></div>
      </div>
      <div className="panel panel-default"><div className="panel-heading"><h4 className="panel-title">{isEditing ? <Text editable field={secondaryHeading} /> : <button ref={secondButton} id={`${panel(2)}-trigger`} className={openPanel === 2 ? '' : 'collapsed'} type="button" aria-expanded={openPanel === 2} aria-controls={panel(2)} onKeyDown={(event) => accordionKey(event, 2)} onClick={() => setOpenPanel((current) => current === 2 ? null : 2)}><Text field={secondaryHeading} /><span className="fa pull-right" aria-hidden="true" /></button>}</h4></div>
        <div id={panel(2)} className={`panel-collapse collapse${isEditing || openPanel === 2 ? ' in' : ''}`} hidden={!isEditing && openPanel !== 2} role="region" aria-labelledby={isEditing ? undefined : `${panel(2)}-trigger`}><div className="panel-body">{shouldRenderTextField(data.secondaryBody?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.secondaryBody?.jsonValue} />}</div></div>
      </div>
    </div>
  </section>;
}
