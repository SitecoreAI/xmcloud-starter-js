'use client';
import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { AllianzFormProps } from './allianz-form.props';
import { formDefinitions, MAX_POLICIES, POLICY_PREFIX, REASON, validateForm, visibleDefinitions, type FormDefinition, type FormErrors, type FormValues, type FormValue, type SchemaKey } from './form-rules.props';

const ABOUT_YOU = '<p>Allianz may need to contact you as the claims process proceeds. Please provide your contact information below.</p><p><strong>Please note:</strong> All beneficiaries listed on the policy/contract will then be contacted directly, receive a claim form packet in the mail, and speak with Allianz about the claim process and paperwork.</p>';
const FIRMS = ['Example Financial Group', 'Sample Advisory Partners', 'Other'];

export const Default = ({ fields, params }: AllianzFormProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  const instance = useId().replace(/:/g, '');
  const form = useRef<HTMLFormElement>(null);
  const outcomeHeading = useRef<HTMLHeadingElement>(null);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [policies, setPolicies] = useState(1);
  const [stage, setStage] = useState<'entry' | 'review' | 'complete' | 'failure'>('entry');
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const productButton = useRef<HTMLButtonElement>(null);
  const schemaValue = data?.schemaKey?.jsonValue?.value || '';
  const key: SchemaKey = schemaValue === 'death-claim' || schemaValue === 'new-york-contact' ? schemaValue : data?.children?.results?.some((child) => child.name?.jsonValue?.value?.startsWith('StartClaim')) ? 'death-claim' : 'generic';
  const definitions = useMemo(() => formDefinitions(key, data?.children?.results), [key, data?.children?.results]);
  const visible = visibleDefinitions(key, definitions, values, policies);
  if (!data) return <NoDataFallback componentName="AllianzForm" />;
  const controlId = (name: string) => `${instance}-${name.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const change = (name: string, value: FormValue) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => { const next = { ...previous }; delete next[name]; return next; });
    if (key === 'new-york-contact' && name === REASON) setProductOpen(false);
  };
  const reset = () => {if (key === 'new-york-contact') {setProductOpen(false); setAccountInfoOpen(false);} setValues({}); setErrors({}); setPolicies(1); setStage('entry'); requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('input, select, textarea')?.focus());};
  const closeAccountInfo = () => {setAccountInfoOpen(false); requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus());};
  const changeStage = (next: typeof stage) => { if (key === 'new-york-contact') setProductOpen(false); setStage(next); requestAnimationFrame(() => {if (key === 'new-york-contact' && next === 'entry') form.current?.querySelector<HTMLElement>('input, select, textarea')?.focus(); else outcomeHeading.current?.focus();}); };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateForm(visible, values, key);
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus());
      return;
    }
    changeStage('review');
  };
  const finish = () => {
    const outcome = params.mockOutcome || new URLSearchParams(window.location.search).get('formOutcome');
    changeStage(outcome === 'error' || outcome === 'failure' ? 'failure' : 'complete');
    // Complete/error states never invoke a backend or retain entered values.
    setValues({});
  };
  const fieldControl = (field: FormDefinition, label?: string) => {
    const id = controlId(field.name);
    const error = errors[field.name];
    const shared = { id, name: field.name, value: typeof values[field.name] === 'string' ? values[field.name] as string : '', required: field.required, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => change(field.name, event.target.value) };
    if (key === 'new-york-contact' && field.multiple && field.selectionDisplay === 'dropdown') {
      const selected = Array.isArray(values[field.name]) ? values[field.name] as string[] : [];
      const groups = Array.from(new Set(field.options.map((option) => option.group || '')));
      return <div className="dropdown" onBlur={(event) => {if (!event.currentTarget.contains(event.relatedTarget)) setProductOpen(false);}} onKeyDown={(event) => {if (event.key === 'Escape') {setProductOpen(false); productButton.current?.focus();}}}>
        <button ref={productButton} id={id} type="button" className="btn btn-default dropdown-toggle" aria-expanded={productOpen} aria-controls={`${id}-options`} data-invalid={!!error} aria-describedby={[field.required ? `${id}-required` : undefined, error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined} onClick={() => setProductOpen((open) => !open)}>{selected.length ? field.options.filter((option) => selected.includes(option.value)).map((option) => option.label).join(', ') : field.placeholder || 'Select ...'} <span className="caret" aria-hidden="true" /></button>
        <div id={`${id}-options`} className="dropdown-menu" hidden={!productOpen} style={{ display: productOpen ? 'block' : 'none' }} role="group" aria-label={field.label}>
          {groups.map((group) => <div key={group} role={group ? 'group' : undefined} aria-label={group || undefined}>{group && <div className="dropdown-header">{group}</div>}{field.options.filter((option) => (option.group || '') === group).map((option) => <div className="checkbox" key={option.value}><label><input type="checkbox" name={field.name} value={option.value} checked={selected.includes(option.value)} onChange={(event) => change(field.name, event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value))} />{option.label}</label></div>)}</div>)}
        </div>
        {field.required && <span id={`${id}-required`} className="sr-only">Select at least one product.</span>}
        {error && <span id={`${id}-error`} className="field-validation-error" role="alert">{error}</span>}
      </div>;
    }
    return <>
      {label && <label htmlFor={id} className="sr-only">{label}</label>}
      {field.inputType === 'select' ? <select {...shared} className="form-control">{!field.options.some((option) => !option.value) && <option value="">Select ...</option>}{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.inputType === 'textarea' ? <textarea {...shared} className="form-control" rows={5} maxLength={field.maxLength} /> : field.name === 'SelectFirm.SelectedFirm' ? <><input {...shared} className="form-control" list={`${instance}-firms`} autoComplete="off" maxLength={field.maxLength} /><datalist id={`${instance}-firms`}>{FIRMS.map((firm) => <option key={firm} value={firm} />)}</datalist></> : <input {...shared} type={['email', 'tel', 'number'].includes(field.inputType) ? field.inputType : 'text'} className="form-control" maxLength={field.maxLength} placeholder={field.placeholder} inputMode={field.name.endsWith('Last4SSN') ? 'numeric' : field.inputType === 'tel' ? 'tel' : undefined} autoComplete="off" />}
      {error && <span id={`${id}-error`} className="field-validation-error" role="alert">{error}</span>}
    </>;
  };
  const fieldRow = (field: FormDefinition) => {
    const id = controlId(field.name);
    if (key === 'new-york-contact' && field.multiple && field.selectionDisplay === 'checkboxes') {
      const selected = Array.isArray(values[field.name]) ? values[field.name] as string[] : [];
      const error = errors[field.name];
      return <fieldset className="form-group allianz-local-checkboxes" key={field.name} aria-describedby={field.required ? `${id}-required` : undefined}><legend className="col-sm-3 control-label"><Text editable={isEditing} field={field.labelField?.jsonValue} /></legend><div className="col-sm-9" role="group" aria-describedby={[field.required ? `${id}-required` : undefined, error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined}>{field.options.map((option) => <div className="checkbox" key={option.value}><label><input type="checkbox" name={field.name} value={option.value} checked={selected.includes(option.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => change(field.name, event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value))} />{option.label}</label></div>)}{field.required && <span id={`${id}-required`} className="sr-only">Select at least one product category.</span>}{error && <span id={`${id}-error`} className="field-validation-error" role="alert">{error}</span>}</div></fieldset>;
    }
    if (field.inputType === 'radio') return <fieldset className="form-group allianz-local-radio" key={field.name}><legend className="col-sm-3 control-label"><Text editable={isEditing} field={field.labelField?.jsonValue} /></legend><div className="col-sm-9">{field.options.map((option) => <div className="radio" key={option.value}><label><input type="radio" name={field.name} value={option.value} checked={values[field.name] === option.value} data-invalid={!!errors[field.name]} aria-describedby={errors[field.name] ? `${id}-error` : undefined} onChange={() => {change(field.name, option.value);if (option.value === 'QuestionContractPolicy') setAccountInfoOpen(true);}} />{option.label}</label></div>)}{errors[field.name] && <span id={`${id}-error`} className="field-validation-error" role="alert">{errors[field.name]}</span>}</div></fieldset>;
    const prefix = field.name.match(/^(StartClaimAbout\.DateOf(?:Death|Birth))(?:Month|Day|Year)$/)?.[1];
    if (prefix && !field.name.endsWith('Month')) return null;
    if (prefix) return <fieldset className="form-group allianz-local-date" key={prefix}><legend className="col-sm-3 control-label"><Text editable={isEditing} field={field.labelField?.jsonValue} /></legend><div className="col-sm-9"><div className="row">{['Month', 'Day', 'Year'].map((part) => {const control = visible.find((item) => item.name === prefix + part);return control ? <div key={part} className={part === 'Month' ? 'col-xs-5' : part === 'Day' ? 'col-xs-3' : 'col-xs-4'}>{fieldControl(control, `${field.label.replace('*', '')}: ${part}`)}</div> : null;})}</div></div></fieldset>;
    return <div key={field.name} className="form-group"><label className="col-sm-3 control-label" htmlFor={id}>{field.name.startsWith(POLICY_PREFIX) ? 'Policy/Contract Number' : <Text editable={isEditing} field={field.labelField?.jsonValue} />}</label><div className="col-sm-9">{fieldControl(field)}</div></div>;
  };
  const policyEnd = visible.filter((field) => field.name.startsWith(POLICY_PREFIX)).at(-1)?.name;
  const reporterStart = visible.find((field) => field.name.startsWith('StartClaimAboutYou.'))?.name;
  const submitLabel = data.submitLabel?.jsonValue?.value || (key === 'death-claim' ? 'Continue' : 'Submit');
  const reviewValue = (field: FormDefinition) => {
    if (key === 'new-york-contact' && field.multiple) {
      const selected = Array.isArray(values[field.name]) ? values[field.name] as string[] : [];
      return field.options.filter((option) => selected.includes(option.value)).map((option) => option.label).join(', ');
    }
    const prefix = field.name.match(/^(StartClaimAbout\.DateOf(?:Death|Birth))Month$/)?.[1];
    if (prefix) return `${field.options.find((option) => option.value === values[field.name])?.label || values[field.name]} ${values[prefix + 'Day']}, ${values[prefix + 'Year']}`;
    return field.name.endsWith('Last4SSN') ? '••••' : field.options.find((option) => option.value === values[field.name])?.label || values[field.name];
  };
  return <section className="allianz-local-form" id={params.RenderingIdentifier}>
    {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}
    {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
    {isEditing ? <div className="allianz-local-form-authoring">
      {(data.children?.results ?? []).map((field) => shouldRenderTextField(field.label?.jsonValue, true) && <Text key={field.id} editable tag="p" field={field.label?.jsonValue} />)}
      {shouldRenderTextField(data.submitLabel?.jsonValue, true) && <Text editable tag="p" field={data.submitLabel?.jsonValue} />}
      {shouldRenderTextField(data.secondaryHeading?.jsonValue, true) && <Text editable tag="h3" field={data.secondaryHeading?.jsonValue} />}
      {shouldRenderTextField(data.secondaryBody?.jsonValue, true) && <RichText editable field={data.secondaryBody?.jsonValue} />}
      {shouldRenderTextField(data.reviewHeading?.jsonValue, true) && <Text editable tag="h2" field={data.reviewHeading?.jsonValue} />}
      {shouldRenderTextField(data.successMessage?.jsonValue, true) && <RichText editable field={data.successMessage?.jsonValue} />}
      {shouldRenderTextField(data.failureMessage?.jsonValue, true) && <RichText editable field={data.failureMessage?.jsonValue} />}
    </div> : stage === 'entry' ? <form ref={form} noValidate autoComplete="off" onSubmit={submit} className="cui-portletform clearfix">
      <p className="allianz-local-privacy">Use sample information. Information entered here stays in this browser and is not sent.</p>
      {Object.keys(errors).length > 0 && <div className="validation-summary-errors" role="alert">Please check the highlighted fields.</div>}
      {visible.map((field) => <div key={field.name}>
        {key === 'death-claim' && field.name === reporterStart && <div className="allianz-local-secondary"><Text editable={isEditing} tag="h3" field={data.secondaryHeading?.jsonValue || { value: 'About You' }} /><RichText editable={isEditing} field={data.secondaryBody?.jsonValue || { value: ABOUT_YOU }} /></div>}
        {fieldRow(field)}
        {field.name === policyEnd && <div className="form-group"><div className="col-sm-offset-3 col-sm-9"><button type="button" className="allianz-legacy-print" disabled={policies >= MAX_POLICIES} onClick={() => {setPolicies((count) => Math.min(MAX_POLICIES, count + 1));requestAnimationFrame(() => document.getElementById(controlId(`${POLICY_PREFIX}[${policies}].PolicyNumber`))?.focus());}}>+ Add one more policy</button>{policies >= MAX_POLICIES && <span className="help-block">You can add up to 20 policies.</span>}</div></div>}
      </div>)}
      <div className="form-group"><div className="col-sm-offset-3 col-sm-9"><button type="submit" className="btn btn-form btn-primary">{data.submitLabel?.jsonValue ? <Text editable={isEditing} field={data.submitLabel?.jsonValue} /> : submitLabel}</button></div></div>
    </form> : stage === 'review' ? <div className="allianz-local-review">
      <h2 ref={outcomeHeading} tabIndex={-1}>{data.reviewHeading?.jsonValue ? <Text editable={isEditing} field={data.reviewHeading?.jsonValue} /> : 'Review your information'}</h2><p>Please check the details below before continuing.</p>
      {key === 'new-york-contact' && <p className="allianz-local-privacy">Use sample information. Information entered here stays in this browser and is not sent.</p>}
      <dl>{visible.filter((field) => values[field.name] && !/StartClaimAbout\.DateOf(?:Death|Birth)(?:Day|Year)$/.test(field.name)).map((field) => <div key={field.name}><dt>{field.label.replace(/\*$/, '')}</dt><dd>{reviewValue(field)}</dd></div>)}</dl>
      <div className="allianz-local-actions"><button className="btn btn-default" type="button" onClick={() => changeStage('entry')}>Edit information</button><button className="btn btn-primary" type="button" onClick={finish}>Continue</button><button className="allianz-legacy-print" type="button" onClick={reset}>Start again</button></div>
    </div> : <div className="allianz-local-confirmation" role="status"><h2 ref={outcomeHeading} tabIndex={-1}>{stage === 'failure' ? 'Unable to continue' : 'Review complete'}</h2>
      <RichText editable={isEditing} field={stage === 'failure' ? data.failureMessage?.jsonValue || { value: '<p>We were unable to complete this request. Please try again.</p>' } : data.successMessage?.jsonValue || { value: '<p>Your information has been reviewed.</p>' }} /><p>No information was sent.</p><button className="btn btn-primary" type="button" onClick={reset}>Start again</button>
    </div>}
    {!isEditing && accountInfoOpen && <div className="allianz-local-account-overlay" role="presentation" onKeyDown={(event) => {if (event.key === 'Escape') closeAccountInfo();if (event.key === 'Tab') {event.preventDefault();event.currentTarget.querySelector<HTMLButtonElement>('button')?.focus();}}}><div role="dialog" aria-modal="true" aria-labelledby={`${instance}-account-title`} className="modal-content"><h2 id={`${instance}-account-title`}>Policy or contract questions</h2><p>For personal account information, please contact your Allianz service team.</p><button type="button" className="btn btn-primary" autoFocus onClick={closeAccountInfo}>Continue</button></div></div>}
  </section>;
};
